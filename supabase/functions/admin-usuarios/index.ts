import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const callerClient = createClient(SB_URL, SB_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SB_URL, SB_SERVICE_KEY);

    const { data: perfilRow, error: perfilErr } = await admin
      .from("usuarios")
      .select("perfil, ativo")
      .eq("auth_id", userData.user.id)
      .single();

    if (perfilErr || !perfilRow || perfilRow.perfil !== "mestre" || !perfilRow.ativo) {
      return new Response(JSON.stringify({ error: "Apenas mestre pode gerenciar contas" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, password, auth_id } = await req.json();

    if (action === "create") {
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email e senha sao obrigatorios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: error?.message ?? "Falha ao criar conta" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ auth_id: data.user.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_password") {
      if (!auth_id || !password) {
        return new Response(JSON.stringify({ error: "auth_id e senha sao obrigatorios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin.auth.admin.updateUserById(auth_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!auth_id) {
        return new Response(JSON.stringify({ error: "auth_id e obrigatorio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin.auth.admin.deleteUser(auth_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "acao invalida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "BTDesk <noreply@barcellostucunduva.adv.br>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destinatarios, assunto, corpo_html, tipo, referencia_id, criado_por } = await req.json();

    if (!destinatarios?.length || !assunto || !corpo_html) {
      return new Response(JSON.stringify({ error: "Campos obrigatorios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SB_URL, SB_KEY);

    // Verifica se este tipo de notificacao esta ativo
    const { data: config } = await supabase
      .from("notif_config")
      .select("ativo, emails_extras")
      .eq("tipo", tipo ?? "geral")
      .single();

    if (config && !config.ativo) {
      return new Response(JSON.stringify({ skipped: true, motivo: "tipo desativado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Adiciona emails extras configurados
    const todosDestinatarios = [...new Set([
      ...destinatarios,
      ...(config?.emails_extras ?? []),
    ])].filter(Boolean);

    // Cria log pendente
    const { data: log } = await supabase.from("email_logs").insert({
      tipo: tipo ?? "geral",
      destinatarios: todosDestinatarios,
      assunto,
      corpo_html,
      status: "pendente",
      referencia_id: referencia_id ?? null,
      criado_por: criado_por ?? null,
    }).select("id").single();

    const logId = log?.id;

    // Envia via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: todosDestinatarios,
        subject: assunto,
        html: corpo_html,
      }),
    });

    const resendBody = await resendRes.json();
    const ok = resendRes.ok;

    // Atualiza log
    if (logId) {
      await supabase.from("email_logs").update({
        status: ok ? "enviado" : "erro",
        erro: ok ? null : JSON.stringify(resendBody),
        enviado_em: ok ? new Date().toISOString() : null,
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ ok, log_id: logId, resend: resendBody }), {
      status: ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

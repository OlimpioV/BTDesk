// Script utilitario para rodar SQL no Supabase via Management API
// Uso: node run_sql.mjs "SELECT 1"
// Ou importar runSQL para usar em outros scripts

const PROJECT_ID = 'ubgazsabtzdutgibrxbs';
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;

export async function runSQL(sql, label = '') {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY nao definida');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    console.error(`[ERRO] ${label || sql.slice(0, 60)}`);
    console.error(JSON.stringify(data, null, 2));
    return { ok: false, data };
  }

  console.log(`[OK] ${label || sql.slice(0, 60)}`);
  return { ok: true, data };
}

// Executar diretamente se chamado como script principal
if (process.argv[1] && process.argv[2]) {
  const sql = process.argv[2];
  runSQL(sql, 'query manual').then(r => {
    if (r.ok) console.log(JSON.stringify(r.data, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}

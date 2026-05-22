// DDL Feature 1 - Sistema de Equipes
// Cria tabelas e altera tarefas, verificando existencia antes de cada operacao

import { runSQL } from './run_sql.mjs';

async function tableExists(name) {
  const r = await runSQL(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${name}') AS exists`,
    `verificar ${name}`
  );
  return r.ok && r.data?.[0]?.exists === true;
}

async function columnExists(table, column) {
  const r = await runSQL(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}') AS exists`,
    `verificar ${table}.${column}`
  );
  return r.ok && r.data?.[0]?.exists === true;
}

async function main() {
  console.log('=== DDL Feature 1: Sistema de Equipes ===\n');

  // 1. equipes
  if (await tableExists('equipes')) {
    console.log('[SKIP] equipes ja existe');
  } else {
    const r = await runSQL(`
      CREATE TABLE equipes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        cor text DEFAULT '#185FA5',
        criado_em timestamptz DEFAULT now()
      )
    `, 'criar equipes');
    if (!r.ok) { process.exit(1); }
  }

  // 2. equipe_membros
  if (await tableExists('equipe_membros')) {
    console.log('[SKIP] equipe_membros ja existe');
  } else {
    const r = await runSQL(`
      CREATE TABLE equipe_membros (
        equipe_id uuid REFERENCES equipes(id) ON DELETE CASCADE,
        usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (equipe_id, usuario_id)
      )
    `, 'criar equipe_membros');
    if (!r.ok) { process.exit(1); }
  }

  // 3. demanda_equipes
  if (await tableExists('demanda_equipes')) {
    console.log('[SKIP] demanda_equipes ja existe');
  } else {
    const r = await runSQL(`
      CREATE TABLE demanda_equipes (
        demanda_id text,
        equipe_id uuid REFERENCES equipes(id) ON DELETE CASCADE,
        PRIMARY KEY (demanda_id, equipe_id)
      )
    `, 'criar demanda_equipes');
    if (!r.ok) { process.exit(1); }
  }

  // 4. tarefas.equipe_id
  if (await columnExists('tarefas', 'equipe_id')) {
    console.log('[SKIP] tarefas.equipe_id ja existe');
  } else {
    const r = await runSQL(
      `ALTER TABLE tarefas ADD COLUMN equipe_id uuid REFERENCES equipes(id)`,
      'tarefas ADD COLUMN equipe_id'
    );
    if (!r.ok) { process.exit(1); }
  }

  console.log('\n=== Feature 1: DDL concluido com sucesso ===');
}

main().catch(e => { console.error(e); process.exit(1); });

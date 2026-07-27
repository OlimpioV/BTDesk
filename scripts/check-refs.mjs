// Verificador caseiro de referencias de handlers inline (onclick, onchange...).
// Sem dependencias externas. Roda no Node (GitHub Actions).
//
// Objetivo: pegar o bug mais comum deste projeto, onde todo handler e uma
// string do tipo onclick="minhaFuncao(...)". Se a funcao for renomeada e um
// onclick ficar para tras, o erro so aparece quando o usuario clica. Este
// script varre os .js, coleta as funcoes definidas e as funcoes chamadas
// logo apos on*=" e reporta as que nao existem em nenhum arquivo.
//
// Modo padrao: apenas AVISA (nao falha o build). Passe --strict para falhar
// com exit 1 depois que a allowlist estiver calibrada.

import { readFileSync, readdirSync } from 'node:fs';

const STRICT = process.argv.includes('--strict');

// Nomes aceitos em handlers que nao sao funcoes do app (globais do browser).
const ALLOW = new Set([
  'event', 'window', 'document', 'this', 'alert', 'confirm', 'print',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'Boolean', 'Number', 'String',
  // palavras-chave de JS que podem iniciar um handler (ex.: onkeydown="if(...)")
  'if', 'for', 'while', 'switch', 'return', 'new', 'typeof', 'void', 'delete', 'do', 'else', 'try', 'throw'
]);

const files = readdirSync('.').filter(function (f) { return f.endsWith('.js'); });

// 1) Coletar nomes definidos em qualquer arquivo.
const defined = new Set();
const sources = {};
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  sources[f] = src;
  let m;
  const reFn = /function\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reFn.exec(src))) defined.add(m[1]);
  const reVar = /(?:^|[\s;{(,])(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = reVar.exec(src))) defined.add(m[1]);
  const reAssignFn = /([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/g;
  while ((m = reAssignFn.exec(src))) defined.add(m[1]);
  const reWin = /window\.([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = reWin.exec(src))) defined.add(m[1]);
}

// 2) Coletar funcoes chamadas logo apos on*=" (ou on*=\") e reportar as ausentes.
const reHandler = /on[a-z]+\s*=\s*\\?["']\s*([A-Za-z_$][\w$]*)\s*\(/g;
const missing = new Map(); // nome -> Set(arquivos)
for (const f of files) {
  let m;
  while ((m = reHandler.exec(sources[f]))) {
    const name = m[1];
    if (defined.has(name) || ALLOW.has(name)) continue;
    if (!missing.has(name)) missing.set(name, new Set());
    missing.get(name).add(f);
  }
}

if (missing.size === 0) {
  console.log('check-refs: OK, nenhum handler aponta para funcao inexistente.');
  process.exit(0);
}

console.log('check-refs: handlers apontando para funcao NAO definida:\n');
for (const [name, fs] of missing) {
  console.log('  ' + name + '(...)  ->  ' + Array.from(fs).join(', '));
}
console.log('\nTotal: ' + missing.size + ' nome(s).');
if (STRICT) {
  process.exit(1);
} else {
  console.log('(modo aviso: nao falha o build. Rode com --strict para exigir correcao.)');
  process.exit(0);
}

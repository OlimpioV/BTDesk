# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.
Language: always respond in Portuguese (Brazil).

## Projeto

**BTDesk** — sistema de controle de demandas jurídicas para o escritório Barcellos Tucunduva Advogados.
- Site: https://olimpiov.github.io/BTDesk/
- Repositório: https://github.com/OlimpioV/BTDesk
- Stack: HTML/CSS/JS puro, sem frameworks, sem build, sem npm. Tudo client-side.
- Backend: Supabase (PostgreSQL via REST direto do browser)
- Hospedagem: GitHub Pages

## Rodar localmente

Abrir `index.html` no browser. Para evitar CORS, servir via servidor estático:

```
npx serve .
# ou
python -m http.server 8080
```

Sem build, sem testes, sem linting.

## Supabase

- URL: https://ubgazsabtzdutgibrxbs.supabase.co
- Chave anon (usada no código client-side): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZ2F6c2FidHpkdXRnaWJyeGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjMxMDUsImV4cCI6MjA5MDczOTEwNX0.0O7vDwiL7uxr5uVSa9yGkx9bULtmkdV6p3CXbPFt7eI
- Chave service_role (apenas para uso local pelo Claude Code, nunca colocar no código): disponível na variável de ambiente `SUPABASE_SERVICE_KEY`

### Como o Claude Code deve rodar SQLs no Supabase

Usar a API REST do Supabase com a service_role para executar DDL diretamente, sem precisar abrir o painel. Exemplo de chamada para rodar SQL:

```javascript
// Padrão para rodar SQL via API do Supabase (usar em scripts Node.js locais)
const response = await fetch('https://ubgazsabtzdutgibrxbs.supabase.co/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    'apikey': process.env.SUPABASE_SERVICE_KEY
  },
  body: JSON.stringify({ query: 'CREATE TABLE ...' })
});
```

Se a função `exec_sql` não existir no projeto, usar a Management API do Supabase:

```bash
curl -X POST \
  'https://api.supabase.com/v1/projects/ubgazsabtzdutgibrxbs/database/query' \
  -H 'Authorization: Bearer '"$SUPABASE_SERVICE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query": "CREATE TABLE ..."}'
```

Antes de rodar qualquer SQL de criação de tabela, verificar se a tabela já existe para evitar erro. Rodar os SQLs um por vez e confirmar sucesso antes de continuar.

## Tabelas Supabase (estado atual)

- `demandas(id, data jsonb)` — cards como JSON blob; row especial `id="__cols__"` guarda config das colunas
- `tarefas(id, card_id, texto, responsavel, data_inicio, data_fim, status, criado_em)`
- `usuarios(id, nome, email, senha, perfil, sigla, ativo)`
- `clientes(id, numero, nome)`
- `casos(id, numero, cliente_id, descricao, nome_consulta, objeto, situacao)`
- `logs(id, perfil, acao, detalhe, criado_em)`

## Arquivos JS (ordem de carregamento no index.html)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `config.js` | Constantes globais (SB, SK, H), variáveis de estado, paletas de cor, funções utilitárias (uid, trunc, toast, modalConfirm, modalInput) |
| `db.js` | Todas as funções de acesso ao Supabase, incluindo CRUD de tarefas (dbFetchTarefas, dbUpsertTarefa, dbDelTarefa) |
| `ui.js` | Biblioteca de ícones SVG (ic()), header, toolbar, helpers compartilhados (cliNome, casoDesc, getFiltered) |
| `kanban.js` | Renderização do kanban, drag-and-drop de cards e colunas, gerenciamento de colunas, etiquetas |
| `tasks.js` | CRUD de tarefas, cache local tarefasDB indexado por card_id, painel de tarefas HTML |
| `modal.js` | Modal de card (estilo Trello), edição inline, comentários, painel de tarefas, cover picker |
| `pages.js` | Páginas admin: importação XLSX, etiquetas, logs, usuários, formulário de criação/edição de card |
| `app.js` | init(), salvar/deletar card, renderização kanban e lista, edição inline de células |

## Estado global (definido em config.js)

- `cards` — array em memória de todos os cards
- `COLS` — colunas ativas do kanban (carregadas do Supabase, registro __cols__)
- `TC` / `TIPOS` — mapa de cores de etiquetas; entradas customizadas em localStorage (chave bari_etiquetas_v1)
- `perfil` / `nomeUser` / `emailUser` / `userDbId` — sessão atual em sessionStorage
- `responsaveis`, `clientesDB`, `casosDB` — dados de referência carregados no startup
- `viewMode` — "kanban" ou "lista"

## Perfis de usuário

- `mestre` — acesso total, gerencia usuários, colunas, tudo. Vê todas as equipes e todas as demandas.
- `advogado` — cria e edita demandas, comenta, cria tarefas. Vê apenas demandas da equipe ativa.
- `cliente` — somente leitura

## Padrões do código

- UI construída via concatenação de strings innerHTML, sem virtual DOM
- `modal-container` para modal principal; `modal-container2` para diálogos secundários sobrepostos
- Drag-and-drop usa HTML5 Drag API nativo; ordem persistida via dbUpsert no drop
- Edição inline (icell) usa padrão show/hide com _ef/_ecid rastreando o campo aberto
- checkAuth() lê sessionStorage; login chama Supabase REST diretamente (senhas em texto plano, pendência de segurança)

## Funcionalidades já implementadas

- Kanban com colunas customizáveis (drag-and-drop, cores, renomear)
- Visualização em lista com expansão inline de tarefas
- Cards com título, status, cliente/caso, responsável, datas, horas, observações, etiquetas e comentários
- Tarefas por card com responsável, datas, status e indicador de atraso
- Chip de tarefas nos cards do kanban (ex: 2/5 concluídas)
- Filtros por status, tipo, responsável, cliente e caso
- Importação de planilha Excel
- Log de ações
- Gestão de usuários e etiquetas

## Pendências conhecidas

- Segurança: RLS real no Supabase e Supabase Auth (autenticação atual via tabela usuarios com senha em texto plano)
- Visibilidade por área: substituída pelo sistema de equipes descrito abaixo
- Tarefas antigas salvas no JSON dos cards não foram migradas para a tabela tarefas

---

## Feature 1: Sistema de Equipes

### Conceito

Equipes são grupos de usuários com nome e cor. Um usuário pode pertencer a mais de uma equipe. A equipe ativa do usuário controla o que aparece em todas as seções do sistema: kanban, lista, tarefas e reuniões. Trocar de equipe reaplica o filtro instantaneamente. Mestres têm a opção "Todas" e veem tudo. Advogados só veem equipes às quais pertencem.

Toda demanda, tarefa e reunião criada é automaticamente atribuída à equipe ativa do usuário no momento da criação. O criador pode adicionar outras equipes manualmente se a demanda for relevante para mais de uma. Demandas vinculadas a várias equipes aparecem para membros de qualquer uma dessas equipes quando estiverem com a equipe correspondente ativa.

### Interface

No header, entre o sino de notificações e o avatar, entra um botão com o nome da equipe ativa e uma seta para baixo. Ao clicar, abre uma gaveta (dropdown) listando as equipes do usuário para trocar. A equipe ativa fica salva em sessionStorage.

Página de gestão de equipes acessível pelo menu admin do mestre: criar equipes, definir nome e cor, atribuir e remover membros.

### Novas tabelas Supabase

```sql
create table equipes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text default '#185FA5',
  criado_em timestamptz default now()
);

create table equipe_membros (
  equipe_id uuid references equipes(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete cascade,
  primary key (equipe_id, usuario_id)
);

create table demanda_equipes (
  demanda_id text,
  equipe_id uuid references equipes(id) on delete cascade,
  primary key (demanda_id, equipe_id)
);
```

### Alterações em tabelas existentes

```sql
alter table tarefas add column equipe_id uuid references equipes(id);
```

### Novo estado global (adicionar em config.js)

- `equipeAtiva` — objeto { id, nome, cor } da equipe ativa, salvo em sessionStorage
- `equipesDB` — array de equipes do usuário carregado no startup

### Arquivos a modificar

- `config.js` — adicionar equipeAtiva, equipesDB ao estado global
- `db.js` — adicionar dbFetchEquipes, dbUpsertEquipe, dbDelEquipe, dbFetchEquipeMembros, dbUpsertEquipeMembro, dbDelEquipeMembro, dbFetchDemandaEquipes, dbUpsertDemandaEquipe
- `ui.js` — adicionar botão de equipe ativa no header com gaveta dropdown; filtrar getFiltered() pela equipe ativa
- `app.js` — ao criar card, atribuir equipe ativa automaticamente via dbUpsertDemandaEquipe
- `tasks.js` — ao criar tarefa, atribuir equipe_id da equipe ativa automaticamente
- `pages.js` — adicionar página de gestão de equipes para perfil mestre

---

## Feature 2: Módulo de Reuniões

### Conceito

Módulo de gestão de reuniões semanais. Reuniões são criadas e ajustadas manualmente, sem geração automática semanal. Pautas são entidades independentes reutilizáveis entre reuniões, com snapshot do estado preservado por reunião (quando você abre uma reunião antiga, vê o estado como estava naquele momento). Projetos de equipe são entidades de gestão interna (não são demandas do kanban) com responsável, subtarefas por membro, comentários e sinalizações. O módulo é filtrado pela equipe ativa, igual às demandas.

### Interface

Nova aba "Reuniões" no header. Layout com sidebar esquerda (calendário mini + lista de próximas reuniões + pautas da reunião atual) e área principal com a reunião selecionada. Cada pauta é navegável pela sidebar. Badge de notificações no header (sino) com contagem de alertas não lidos. Botão "Gerar ata" exporta o estado da reunião em texto.

### Novas tabelas Supabase

```sql
create table reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  data date not null,
  hora time not null default '09:30',
  status text default 'agendada',
  observacoes text,
  equipe_id uuid references equipes(id),
  criado_por uuid references usuarios(id),
  criado_em timestamptz default now()
);

create table reuniao_participantes (
  reuniao_id uuid references reunioes(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete cascade,
  primary key (reuniao_id, usuario_id)
);

create table pautas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text default 'livre',
  descricao text,
  recorrente boolean default false,
  equipe_id uuid references equipes(id),
  criado_por uuid references usuarios(id),
  criado_em timestamptz default now()
);

create table reuniao_pautas (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid references reunioes(id) on delete cascade,
  pauta_id uuid references pautas(id),
  ordem int default 0,
  snapshot_json jsonb
);

create table projetos_internos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  responsavel_id uuid references usuarios(id),
  status text default 'em_andamento',
  descricao text,
  equipe_id uuid references equipes(id),
  criado_em timestamptz default now()
);

create table projeto_comentarios (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos_internos(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  texto text,
  tipo text default 'comentario',
  criado_em timestamptz default now()
);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  tipo text,
  referencia_id uuid,
  mensagem text,
  lida boolean default false,
  criado_em timestamptz default now()
);
```

Observação: a tabela mantém o nome técnico `projetos_internos` por compatibilidade, mas a interface deve usar o rótulo "Projetos de equipe".

### Alterações em tabelas existentes

```sql
alter table tarefas add column reuniao_id uuid references reunioes(id);
alter table tarefas add column projeto_interno_id uuid references projetos_internos(id);
```

### Novo arquivo a criar

`reunioes.js` — toda a lógica do módulo de reuniões, seguindo os mesmos padrões dos outros módulos (innerHTML string concatenation, sem frameworks).

### Arquivos a modificar

- `index.html` — adicionar `<script src="reunioes.js">` na ordem correta
- `config.js` — adicionar estado de reuniões (reunioesDB, pautasDB, projetosDB, notificacoesDB)
- `db.js` — adicionar todas as funções de acesso às novas tabelas
- `ui.js` — adicionar aba Reuniões no header; adicionar badge de notificações no sino
- `app.js` — ao chamar init(), carregar dados de reuniões e notificações

### Regras do módulo de reuniões

- Reuniões criadas manualmente pelo usuário, sem cron semanal automático
- Pautas reutilizáveis: a pauta "vive" com histórico acumulado; cada reunião guarda snapshot_json do estado no momento
- Ao abrir uma reunião passada, exibir o snapshot, não o estado atual
- Projetos de equipe com subtarefas por membro, comentários e botão "Sinalizar" para notificar participantes
- Notificações internas mostradas ao logar e no badge do sino

---

## Ordem de implementação recomendada

1. Verificar se a variável de ambiente `SUPABASE_SERVICE_KEY` está disponível. Se não estiver, pedir ao usuário que rode no PowerShell: `$env:SUPABASE_SERVICE_KEY = "sua-chave-service-role"` antes de continuar.
2. Criar todas as tabelas novas no Supabase via Management API (rodar os SQLs das features abaixo, um por vez, verificando sucesso)
3. Implementar Feature 1 (Equipes) primeiro, pois as reuniões dependem de equipe_id
4. Implementar Feature 2 (Reuniões) depois, com equipe_id já disponível
5. Configurar Supabase Edge Function para disparo de e-mail nas sinalizações
6. Fazer commit e push de todas as alterações ao final de cada feature

---

## Regras de trabalho

- Sempre rodar `node --check` nos arquivos JS alterados antes de entregar
- Confirmar com o usuário antes de cada alteração
- Indicar qual arquivo foi alterado em cada entrega
- Usar edições cirúrgicas, nunca reescrever arquivos inteiros sem necessidade
- Nunca usar travessão (substituir por vírgula, ponto ou frase reformulada)
- Nunca usar frameworks, npm ou dependências externas
- Nunca reescrever um arquivo inteiro quando uma edição pontual resolve
- Ao encontrar ambiguidade, perguntar antes de implementar

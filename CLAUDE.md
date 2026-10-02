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

Ao chamar a Management API via `urllib`/Python (não via `curl`), definir um header `User-Agent` (ex: `"curl/8.4.0"`), senão o Cloudflare bloqueia a requisição com `403 error code: 1010` (proteção de bot, o `User-Agent` padrão do Python é rejeitado).

## Tabelas Supabase (estado atual)

- `demandas(id, data jsonb)` — cards como JSON blob; row especial `id="__cols__"` guarda config das colunas. Card arquivado tem `data.arquivado=true` e `data.arquivadoEm` (ISO); `getFiltered()` (ui.js) e o pool de pendências de reuniões ignoram arquivados, e eles só aparecem na tela "Arquivados" do kanban (restaurar/excluir)
- `tarefas(id, card_id, texto, responsavel, responsaveis text[], data_inicio, data_fim, status, criado_em)` — `responsaveis` (01/10/2026) guarda a lista; `responsavel` continua com o primeiro (reuniões ainda leem só ele). Use `respsDe()`/`setResps()` (ui.js) para ler/gravar
- Demandas também têm `data.responsaveis` (array) com `data.responsavel` = primeiro, pelo mesmo motivo
- Status de subtarefa "Cancelada" (antigo "Bloqueada", id `bloqueada`): é finalizador, mas não conta como feita. Progresso via `statusTarefaProgresso()`; checagens de "feita" via `statusTarefaFeita()`
- `usuarios(id, nome, email, senha, perfil, sigla, ativo, auth_id)` — `senha` está sempre nula desde a migração para Supabase Auth (28/08/2026); autenticação real é via `auth.users`, ligada por `auth_id`. Nunca reintroduzir comparação de senha em texto plano nesta tabela
- `clientes(id, numero, nome)`
- `casos(id, numero, cliente_id, descricao, nome_consulta, objeto, situacao)`
- `logs(id, perfil, acao, detalhe, criado_em)`
- `tarefa_comentarios(id, tarefa_id, usuario_id, texto, criado_em, editado_em, reuniao_id, versoes jsonb, excluido_em, excluido_por)` — "Atualizações" de projetos e subtarefas em Reuniões/Projetos (01/10/2026). `reuniao_id` = reunião em que foi registrada. Editar só pelo autor; excluir pelo autor ou mestre, sempre lógica (`excluido_em`/`excluido_por`, nunca DELETE). Garantido também no banco: políticas `tarefa_comentarios_update`/`_delete` só deixam o advogado mexer onde `usuario_id = meu_usuario_id()` (mestre mexe em tudo); `_insert` segue o escopo por equipe, sem exigir autoria, porque a duplicação de tarefas copia comentários de outros autores. A trigger `trg_tarefa_comentarios_versionar` guarda a versão anterior em `versoes` a cada mudança de texto e impede reescrever o histórico; o app só envia o texto novo. Leituras filtram `excluido_em=is.null`. Como `usuario_id` e `excluido_por` apontam ambos para `usuarios`, o embed precisa nomear a FK (`usuarios!tarefa_comentarios_usuario_id_fkey(id,nome,sigla)`); sem isso o PostgREST responde PGRST201 e o histórico vem vazio
- `estrutura_config(id, data jsonb, atualizado_em)`: configurações globais por linha (`demanda_modelo`, `subtarefa_modelo`, `projeto_modelo`, `etiquetas`)

## Arquivos JS (ordem de carregamento no index.html)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `config.js` | Constantes globais (SB, SK, H), variáveis de estado, paletas de cor, funções utilitárias (uid, trunc, escHTML, escQ, toast, modalConfirm, modalInput) |
| `db.js` | Todas as funções de acesso ao Supabase, incluindo CRUD de tarefas (dbFetchTarefas, dbUpsertTarefa, dbDelTarefa) |
| `ui.js` | Biblioteca de ícones SVG (ic()), header, toolbar, helpers compartilhados (cliNome, casoDesc, getFiltered) |
| `kanban.js` | Renderização do kanban, drag-and-drop de cards e colunas, gerenciamento de colunas, etiquetas |
| `tasks.js` | CRUD de tarefas, cache local tarefasDB indexado por card_id, painel de tarefas HTML |
| `modal.js` | Modal de card (estilo Trello), edição inline, comentários, painel de tarefas, cover picker |
| `pages.js` | Páginas administrativas (menu lateral): estrutura/modelos, permissões, usuários, equipes, categorias de pauta, e-mails, importação XLSX, etiquetas, logs; formulário de criação/edição de demanda |
| `reunioes.js` | Módulo de Reuniões e motor modular (maior arquivo do projeto): detalhe da reunião, board de pautas estilo Monday, tarefas/subtarefas, projetos de equipe, pool de pendências, snapshots, ata, notificações, construtor de modelos e duplicação universal |
| `app.js` | Somente autenticação/login, snapshot inicial e init() (orquestra o carregamento e chama renderKanban); as demais funções foram movidas para os módulos acima |
| `polish.js` | Retoques de UX pós-render (IIFE), aplicados por cima do HTML gerado por string |

## Estado global (definido em config.js)

- `cards` — array em memória de todos os cards
- `COLS` — colunas ativas do kanban (carregadas do Supabase, registro __cols__)
- `TC` / `TIPOS` — mapa de etiquetas (nome → cor), mapa completo salvo no Supabase em `estrutura_config` (`id="etiquetas"`, `data.tc`), compartilhado por todos os usuários. `loadEtq()`/`saveEtq()` (config.js) são assíncronas; `TC_DEF` e a chave antiga de localStorage `bari_etiquetas_v1` só servem para a migração automática no primeiro login de um mestre (01/10/2026). Renomear etiqueta grava via `dbUpsert` as demandas afetadas
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
- Autenticação via Supabase Auth real (`/auth/v1/token`), não mais senha em texto plano. `H` (config.js) é mutado em memória após login/refresh (`H.Authorization = "Bearer "+access_token`); nenhuma das funções de `db.js` precisa saber disso, todas reusam `H` por referência
- `checkAuth()` (app.js) é assíncrona, restaura sessão de `sessionStorage` e dispara refresh se expirada; `refreshSession()`/`setSession()`/`clearSession()` centralizam o ciclo de vida do token; há wrapper em `window.fetch` para retry automático em 401
- RLS real habilitado em todas as tabelas (28/08/2026): `mestre` acesso total, `advogado` escopado por equipe (via `equipe_membros`/`demanda_equipes`/`equipe_id`, com `equipe_id IS NULL` = visível a todas as equipes), `cliente` leitura sem recorte por cliente específico. Helpers SQL `is_mestre()`, `minhas_equipes()`, `usuario_ativo()`, `pode_editar()` no schema `public`
- Exceção (31/08/2026): a tabela `demandas` NÃO segue mais o escopo por equipe. `advogado` só vê demandas onde `data->>'responsavel'` bate com a própria sigla (`minha_sigla()`) ou onde a sigla está em `data->'responsaveis'` (01/10/2026, políticas `demandas_select` e `demandas_write`); `cliente` continua sem recorte; `mestre` continua vendo tudo. `demanda_equipes` deixou de ser o critério de visibilidade de `demandas`, mas a tabela e seu vínculo continuam sendo gravados normalmente pelo `saveCard()`. Helpers `meu_perfil()`, `minha_sigla()`, `meu_usuario_id()` no schema `public`
- Gestão de usuários (`pages.js`: `saveUser`/`delUser`) cria/atualiza/remove a conta correspondente no Supabase Auth via a Edge Function `admin-usuarios` (só aceita chamadas de um `mestre` autenticado)
- "Esqueci minha senha" (app.js, 01/10/2026): `renderEsqueciSenha()` chama `/auth/v1/recover` com `redirect_to` = endereço atual (resposta sempre genérica); o link volta com `#type=recovery&access_token=...`, tratado por `_tratarRetornoRecuperacao()` antes do `checkAuth()`, que abre `renderNovaSenha()` (PUT `/auth/v1/user`). Config de Auth: Site URL `https://olimpiov.github.io/BTDesk/`, redirect URLs do site e `http://localhost:8080/`, template de recuperação em português. Pendente: SMTP próprio (sem ele o Supabase só envia para membros do projeto, limite de 2 e-mails/hora)

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
- Visual do kanban e do modal em tema escuro inspirado no Trello (estilos consolidados em `styles.css`; capas pastel antigas exibidas na versão sólida via `coverSolida()` em ui.js, sem regravar o banco)
- Menu de ações do card (lápis ou clique direito, bloco "ACOES DO CARD" em kanban.js): abrir, etiquetas, responsável, capa, datas, mover, copiar (só estrutura ou com subtarefas; comentários não são copiados), copiar link e arquivar
- "+ Adicionar um cartão" no rodapé das colunas (modo Status); quando quem cria é `advogado`, o cartão nasce com a sigla dele como responsável, senão o RLS de `demandas` o esconderia
- Link direto `?card=ID`: `abrirCardDaUrl()` (kanban.js) é chamado no fim do `init()` e abre o modal do cartão
- Reuniões e Projetos em tema escuro: bloco "TEMA ESCURO — REUNIOES E PROJETOS" no fim de `styles.css`, com prefixo `#app .reun-wrap` (redefine as variáveis de cor do módulo; `--bt-navy` vira tom claro lá dentro). Modais continuam claros
- "Desde a última reunião" (reunioes.js, `_mudSecaoHTML`/`_loadMudancasArea`): compara os projetos da pauta e suas subtarefas com a reunião anterior da equipe (concluídas, que entraram em atraso, atualizações e novas)
- Histórico de projetos e subtarefas (reunioes.js, bloco "ATUALIZACOES"): botão "Histórico" no projeto aberto e relógio na linha do projeto abrem `_atuProjetoHTML` (comentários + subtarefas criadas/concluídas/canceladas, montados por `_atuEventos` a partir de `criado_em` e `campos_valores.concluida_em`; filtros Tudo/Comentários/Subtarefas). Cada subtarefa tem o botão "Histórico" (comentar e consultar). Projetos de equipe começam fechados (`_subCollapsed`)
- Tema claro/escuro: botão sol/lua no cabeçalho (`alternarTema()` em ui.js) grava `bt_tema` no localStorage e põe `data-tema="claro"` no `<html>`; um script no `<head>` do index.html aplica antes de desenhar. Padrão é escuro. As cores do tema escuro (kanban, modal, gerenciar pautas, reuniões, projetos, cabeçalho) usam variáveis `--tk-*` definidas no bloco "PALETA DOS TEMAS" de `styles.css`; o claro só redefine a paleta, e o bloco "TEMA CLARO" no fim cobre brancos translúcidos e estilos inline. Ao criar estilo escuro novo, use `var(--tk-...)` em vez de hex fixo. Administração, Lista e login ainda não têm versão escura
- Tela de abertura: `#bt-abertura` fica no index.html (aparece antes do `checkAuth()`), estilos no bloco "TELA DE ABERTURA" de `styles.css` e lógica em app.js (`_aberturaEtapa`, `_aberturaOi`, `_aberturaFechar`, `_aberturaGarantir`). As barras da logo entram da esquerda (1ª, 2ª, 3ª) e saem para a direita (3ª, 2ª, 1ª); a barra de progresso segue as etapas reais do `init()`; a saída espera no mínimo ~1,3s (entrada das barras) e respeita `prefers-reduced-motion`. Depois do login, `init()` recria a abertura
- Login (app.js, `_loginShell`/`renderLogin`/`renderEsqueciSenha`/`renderNovaSenha`; estilos no bloco "LOGIN" de `styles.css`): cartão de vidro sobre `--tk-fundo`, sem imagem de fundo. Sem sessão, `_aberturaParaLogin()` faz a logo da abertura voar até `#lg-alvo` no topo do cartão; no login certo, `_loginParaCarregamento()` recolhe o cartão e chama `init(origem)`, e a logo volta ao centro (`.ab-vindo`). Login, esqueci e nova senha trocam só o miolo `#lg-vista`. Tem olho na senha, aviso de Caps Lock, sacudida no erro (`_loginErro`) e "Lembrar meu e-mail" (só o e-mail, em `localStorage` `bt_email_login`; nunca a senha)

## Pendências conhecidas

- Visibilidade por área: substituída pelo sistema de equipes descrito abaixo
- `enviar-email` (Edge Function) existe no repositório mas nunca foi publicada no Supabase (retorna 404); recurso de e-mail provavelmente nunca funcionou em produção. Publicar via Management API antes de confiar nele (ver seção de Autenticação abaixo para o exemplo de deploy usado em `admin-usuarios`)

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

# Pendências técnicas — BTDesk

## Limpeza de código

### Etapa 1 — Consolidar em app.js (CONCLUÍDA)

Diagnóstico: `app.js` é um monólito que continha cópia de quase todos os módulos.
Como carrega por último no `index.html`, as versões dele sobrescreviam silenciosamente
as dos módulos. As cópias nos módulos estavam, portanto, mortas.

Feito: removidas dos módulos todas as funções que também existem em `app.js`
(comportamento idêntico, pois só rodava a versão de `app.js`). Mantidas apenas as
funções exclusivas de cada arquivo:

- `ui.js` → headerHTML, perfilBadge, toggleEquipeDropdown, switchEquipe, ic
- `kanban.js` → toggleListaRow
- `tasks.js` → loadTarefasDoCard, loadTodasTarefas (+ var tarefasDB)
- `modal.js` → (nenhuma; arquivo virou só nota)
- `pages.js` → EQUIPES, EMAILS e CATEGORIAS DE PAUTA

Validação: `node --check` em todos os JS OK; nenhuma função definida em 2+ arquivos.

### Etapa 2 — Reorganizar nos módulos (PENDENTE, mais arriscado)

Tornar os módulos a fonte da verdade (como o CLAUDE.md descreve), movendo as
funções de `app.js` de volta para o arquivo da responsabilidade correta e
esvaziando `app.js`. Exige rodar e testar o app a cada passo.

Divergências a reconciliar ANTES de mover (versões diferiram):

- Progresso em 07/07/2026: primeiro lote seguro movido de `app.js` para
  `ui.js`, cobrindo helpers visuais/filtros e toolbar (`cliNome`, `casoDesc`,
  `casosDoCliente`, `getFiltered`, `coverColor`, `tipoTagsHTML`, `ccHTML`,
  `buildAcList`, `toolbarHTML`, `bindFCI`). Não mexeu no modelo de tarefas.
- Progresso em 07/07/2026: segundo lote seguro movido de `app.js` para
  `kanban.js`, cobrindo drag and drop de cards e colunas (`onDragStart`,
  `onDragEnd`, `onColDrop`, `onColHeaderDrop` e auxiliares).
- Progresso em 07/07/2026: terceiro lote seguro movido de `app.js` para
  `kanban.js`, cobrindo gestão de colunas (`colTitleInner`, `startRenameCol`,
  `saveRenameCol`, `toggleCP`, `applyColColor`, `addColuna`, `delColuna`).
- Progresso em 07/07/2026: quarto lote seguro movido de `app.js` para
  `kanban.js`, cobrindo etiquetas visuais dos cards (`toggleLabels`,
  `buildLabels`).

- **Tarefas dos cards:** a versão ativa (app.js) usa o modelo ANTIGO (tarefas no
  JSON do card). As versões mortas em `tasks.js`/`modal.js` usavam a TABELA
  `tarefas`. Decidir qual modelo manter. Hoje o módulo de tarefas-por-tabela dos
  cards está inativo (bate com a pendência "tarefas antigas no JSON não migradas").
- **`confirmDelCard`:** a versão de `modal.js` apagava tarefas da tabela
  (`dbDelTarefasDoCard`); a ativa (app.js) não.
- **`getFiltered` / `checkAuth`:** a versão ativa (app.js) é a mais nova (com filtro
  de equipes); as antigas dos módulos não tinham.

## Épico — Plataforma modular (visão ampliada, grill-me de 12/06/2026)

Visão do usuário: BTDesk inteiro modular, estilo Monday: adicionar, editar,
excluir e copiar tarefas, reuniões, projetos; subcategorias e subitens; textos
e comentários; mestre ajusta o sistema quando necessário. Decisões fechadas:

1. **Arquitetura: motor compartilhado.** Nada de reescrita genérica em
   "quadros". O motor de modularidade das Fases 1-2 (modelos + campos
   customizados + snapshot) é levado entidade por entidade.
2. **Ordem:** tarefas de pauta (Fase 3) → demandas do kanban → projetos.
3. **Hierarquia: 3 níveis** (categoria → tarefa → subtarefa), como o Monday
   (grupo → item → subitem). Sem aninhamento mais profundo.
4. **Permissões:** estrutura (modelos, campos, colunas, categorias) só mestre;
   conteúdo (criar/editar/duplicar/excluir itens e preencher valores) mestre +
   advogados; cliente somente leitura.
5. **Duplicar: diálogo a cada duplicação** perguntando o que incluir
   (subtarefas? valores de campos? comentários?). Nome ganha sufixo (cópia).
6. **Vistas: manter as atuais** (demandas kanban+lista; reuniões
   calendário+detalhe). Vistas novas viram fase futura, depois do motor.
7. **Projetos: dentro de Reuniões** (reconectar a pauta tipo projeto, já
   modular). Aba própria fica como evolução futura.
8. **Migração:** padrão backfill (itens existentes recebem snapshot de um
   modelo padrão), como feito nas 37 reuniões.
9. **"Textos"** da visão são cobertos pelos campos texto/texto longo (Fase 2);
   comentários já existem em reuniões, tarefas, projetos e demandas.

Roadmap consolidado:

- [x] **Status e datas de conclusao unificados**: helper unico normaliza
  `campos_valores.concluida_em` ao concluir ou reabrir subtarefas no kanban,
  reunioes e projetos. A data tambem aparece nas listas de subtarefas.

- [x] **Fase 3 — colunas de tarefa pelo modelo** (concluída): o modelo define
  colunas adicionais de tarefa (`reuniao_modelos.colunas_tarefa jsonb`, mesmos
  9 tipos, construtor com seção própria "Colunas das tarefas"); copiadas para
  `modelo_snapshot.colunas_tarefa` na criação/troca; valores por tarefa em
  `tarefas.campos_valores jsonb` (PATCH parcial); células `.tcol` no card com
  edição inline por tipo. As colunas intrínsecas (título, status, responsável,
  datas) permanecem, pois movem progresso/atraso/avatars (mesmo desenho do
  Monday). Subtarefas passaram a receber campos customizados em fase posterior.
- [x] **Fase 4 — duplicação universal com diálogo** (concluída): diálogo
  genérico (`_abrirDialogoDuplicar`) no modal-container2. Tarefa: opções
  Subtarefas / Valores das colunas / Comentários. Subtarefa: opção Comentários.
  Reunião: campo data obrigatório + Participantes / Pautas e tarefas / Valores
  preenchidos / Comentários da reunião. Nome ganha sufixo " (cópia)";
  permissão mestre+advogado; subtarefas remapeiam parent_id. Falta estender a
  demandas quando elas chegarem ao motor (Fase 5).
- [x] **Fase 5 - modelos de demanda no kanban** (concluida): modelo de
  demanda configuravel na Administracao, snapshot em demandas novas,
  backfill automatico para demandas antigas sem snapshot, edicao inline no
  modal do card e resumo dos campos preenchidos na visualizacao em lista.
- [x] **Fase 6 — projetos reconectados** (concluída): seção "Projetos internos"
  no detalhe da reunião (entre Pautas e Comentários), listando projetos da
  equipe ativa em cartões com checklist, comentários, sinalizar, novo/editar/
  arquivar. Tudo já existia em `_buildProjetosSection` e nas funções db; faltava
  plugar no `_buildReuniaoDetalhe` e corrigir o id de `_loadProjetosArea`
  (reuniao-projetos-area → reun-projetos-area). `sinalizarProjeto` robustecido
  (registra comentário sinalizado + notificação; e-mail via Edge Function fica
  em try/catch, sem quebrar). Pendente/opcional: campos customizados por
  projeto (modularização plena) e aba "Projetos" própria.
- Futuro: vistas novas (calendário de demandas, tabela de reuniões);
  auditoria leve de edições estruturais.

## Épico — Construtor modular de Reuniões (origem; Fases 0-2 concluídas)

Visão (decidida em grill-me): o mestre monta a estrutura das reuniões. Decisões:
- **Modelos de reunião** (templates) reutilizáveis, com opção de **duplicar** outro.
- Campos modulares em **dois níveis**: cabeçalho da reunião + colunas das tarefas.
- Tipos de campo **amplos**: texto (curto/longo), data, status (seleção com cores),
  responsável, comentários, número, checkbox, anexo/link, seleção múltipla.
- Propagação por **SNAPSHOT** (decisão revisada pelo usuário em 09/06/2026): o
  modelo age só na criação. Cada reunião carrega uma cópia própria da estrutura
  (campos/colunas como estavam no modelo naquele momento) e vira independente,
  editável individualmente. Editar o modelo NÃO altera reuniões já criadas; só
  as próximas criadas a partir dele nascem com a estrutura nova.
- Distinção de **tipo** de reunião (evento × cobrança de metas × outros) com
  destaque visual; separação **Próximas/Anteriores** reforçada.

Faseamento acordado (Fase 0 primeiro, resto planejado):

- [x] **Fase 0 — visual** (concluída, commit 11b7677): coluna `tipo` em
  `reunioes`; tipos com cor + ícone no calendário, sidebar e detalhe;
  Próximas/Anteriores com contador e grupo recolhível.
- [x] **Fase 1 — modelos básicos** (concluída): tabela `reuniao_modelos` (nome,
  cor, ícone, slug) com seed dos 2 tipos; `reunioes.modelo_id` (FK set null) +
  `reunioes.modelo_snapshot jsonb` (backfill nas 37 reuniões); tela "Gerenciar
  modelos" (mestre) com criar/editar/duplicar/excluir; form de reunião com
  seletor de modelo; snapshot copiado na criação/troca de modelo; render
  prioriza snapshot (editar/excluir modelo não afeta reuniões existentes).
- [x] **Fase 2 — campos no cabeçalho** (concluída): construtor de campos no
  formulário do modelo (9 tipos: texto, texto longo, data, status com cores,
  responsável, número, checkbox, link, seleção múltipla; opções editáveis,
  reordenar, remover). Definições em `reuniao_modelos.campos jsonb`; copiadas
  para `reunioes.modelo_snapshot.campos` na criação/troca (snapshot); valores
  em `reunioes.campos_valores jsonb` com update parcial. Seção "Informações"
  no detalhe com edição inline por tipo. Obs.: o tipo "comentários" do
  levantamento original foi coberto pela seção de comentários que a reunião
  já possui (não virou tipo de campo).
- As fases seguintes deste épico foram absorvidas pelo roadmap consolidado da
  "Plataforma modular" acima (Fase 3 = colunas de tarefa; auditoria leve foi
  para "Futuro").

## Layout / UI

- [x] **Botões que saem do lugar ou se sobrepõem ao serem alterados** (concluída)
  Relato: ao trocar o estilo de um botão, ele desloca ou sobrepõe outro elemento.
  Feito: botões globais e botões do módulo de reuniões agora têm base flex
  estável, sem encolher de forma imprevisível; cabeçalhos de pautas e projetos
  passam a quebrar linha quando falta espaço.

- [x] **Redesign visual do módulo de Reuniões** (parcial, mock em `mock-reunioes.html`)
  Feito: fonte Oxanium nos títulos, eyebrows + títulos de seção em dois níveis,
  observações com rótulo, participantes em chips, sidebar branca com grupos
  Próximas/Anteriores, calendário (hoje discreto / selecionado navy), área
  principal cinza, pautas exibidas como cartões via CSS, sistema `.rbtn`, chips
  de status em pílula, acentos corrigidos. (commit 014a1ec)

- [x] **Reescrever `_buildTarefaCard` para os cards idênticos ao mock** (commit 61eedd2)
  Feito: marcação de tabela virou cartão .tcard (barra lateral por status, chip
  no topo, barra de progresso segmentada, checklist .cl, comentários .cmts),
  com toda a edição inline preservada e verificada (dev=sonnet, qa=haiku).
  Nota: o sistema de cards alternativo (`_loadReuniaoPautas`) continua
  desconectado dos dados reais (ver Etapa 2 da consolidação).

- [x] **Board de pautas estilo Monday** (commits d480170, d3c7eed)
  Feito: `_loadPautasSection` e `_buildTarefaCard` reescritos de cartões para um
  board de tabela (`.board`/`.bcols`/`.brow`) com colunas alinhadas (Tarefa,
  Responsável, Status, Prazo, Progresso), faixa de cor por status, **status
  sólido colorido** (paleta vibrante #e2445c/#2b76e5/#fdab3d/#00c875, texto
  branco), barra de progresso segmentada e cabeçalho de grupo com contador +
  linha "Nova tarefa". Edição inline 100% preservada. Bloco expandido
  (descrição, form, checklist, comentários) vira `.brow-exp` abaixo da linha.
  Validado via `node --check` + probe de grid no preview. Referência:
  `mock-reuniao-v2.html`. Reavaliado em 07/07/2026: `_campo*`, `_tcol*`,
  `_mf*`, `openGerenciarModelos`, `openFormModelo` e `.tcols` continuam ativos
  nos modelos, campos customizados e Administração. Não remover sem a Etapa 2 de
  reorganização dos módulos. Apenas `.tcard*` parece legado visual, mas precisa
  de revisão junto com a limpeza maior para evitar perda de fallback.

- [x] **Acentuar títulos de reuniões existentes** (dados do banco)
  Verificado em 07/07/2026: não há registros com "Reuniao semanal" sem acento
  na tabela `reunioes`; os títulos semanais atuais estão como "Reunião semanal".

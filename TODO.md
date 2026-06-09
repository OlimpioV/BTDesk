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

- **Tarefas dos cards:** a versão ativa (app.js) usa o modelo ANTIGO (tarefas no
  JSON do card). As versões mortas em `tasks.js`/`modal.js` usavam a TABELA
  `tarefas`. Decidir qual modelo manter. Hoje o módulo de tarefas-por-tabela dos
  cards está inativo (bate com a pendência "tarefas antigas no JSON não migradas").
- **`confirmDelCard`:** a versão de `modal.js` apagava tarefas da tabela
  (`dbDelTarefasDoCard`); a ativa (app.js) não.
- **`getFiltered` / `checkAuth`:** a versão ativa (app.js) é a mais nova (com filtro
  de equipes); as antigas dos módulos não tinham.

## Layout / UI

- [ ] **Botões que saem do lugar ou se sobrepõem ao serem alterados** (em investigação)
  Relato: ao trocar o estilo de um botão, ele desloca ou sobrepõe outro elemento.
  Provável causa: containers flex sem `flex-wrap`/`min-width:0` ou botões sem
  `flex-shrink:0`. Padronizar os grupos de botões com um padrão de layout robusto.

- [x] **Redesign visual do módulo de Reuniões** (parcial, mock em `mock-reunioes.html`)
  Feito: fonte Oxanium nos títulos, eyebrows + títulos de seção em dois níveis,
  observações com rótulo, participantes em chips, sidebar branca com grupos
  Próximas/Anteriores, calendário (hoje discreto / selecionado navy), área
  principal cinza, pautas exibidas como cartões via CSS, sistema `.rbtn`, chips
  de status em pílula, acentos corrigidos. (commit 014a1ec)

- [ ] **Reescrever `_buildTarefaCard` para os cards idênticos ao mock** (pendente)
  A seção de pautas usa a tabela editável (`_loadPautasSection` + `_buildTarefaCard`),
  hoje exibida como cartões via CSS. Para ficar idêntica aos cards do mock falta
  reescrever a marcação de cada tarefa: status no topo direito, rótulos
  "CHECKLIST" e "COMENTÁRIOS", barra de progresso segmentada, checklist limpo
  (dot + texto + responsável). Mexe na parte de edição inline (status/subtarefas/
  comentários), então fazer com validação visual (idealmente em branch/worktree).
  Existe também o sistema de cards alternativo (`_loadReuniaoPautas`) que está
  desconectado dos dados reais (ver Etapa 2 da consolidação).

- [ ] **Acentuar títulos de reuniões existentes** (dados do banco)
  Títulos como "Reuniao semanal" estão sem acento na tabela `reunioes` (campo
  `titulo`). Corrigir via UPDATE no Supabase ou deixar o usuário editar pela UI.

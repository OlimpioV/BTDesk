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

- [ ] **Redesign do módulo de Reuniões** (mock aprovado em `mock-reunioes.html`)
  Aplicar sistema de botões (.rbtn), chips de status unificados e alívio do
  aninhamento visual ao `reunioes.js` + `styles.css`, já com a fonte Oxanium.

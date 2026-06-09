// ── MODAL ──
// Etapa 1 da consolidacao: as funcoes deste modulo (openCardModal, renderModal,
// closeModal, submitCmt, startEditCmt, cancelEditCmt, saveEditCmt, confirmDelCmt,
// toggleModalTipo, updateStatus, confirmDelCard) estavam duplicadas em app.js,
// que carrega por ultimo e prevalecia. Foram removidas daqui por estarem mortas.
//
// ATENCAO (para a Etapa 2 / reorganizacao): a versao que vivia neste arquivo
// usava a TABELA de tarefas (loadTarefasDoCard, dbDelTarefasDoCard,
// buildTarefasHTML por id), enquanto a versao ativa em app.js usa o modelo
// antigo (tarefas embutidas no JSON do card). Ao reorganizar, decidir qual
// modelo manter antes de mover estas funcoes de volta para ca.

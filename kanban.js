// ── KANBAN ──
// Etapa 1 da consolidacao: as funcoes de drag & drop (cards e colunas), gestao
// de colunas, etiquetas, comentarios de card, edicao inline (icCell/openIcell/
// saveIcell e afins), titulo/obs inline, renderView, taskChipHTML, buildCardHTML,
// renderKanban e renderLista estavam duplicadas em app.js, que carrega por ultimo
// e prevalecia. Foram removidas daqui por estarem mortas.
//
// Mantida apenas toggleListaRow (exclusiva deste modulo): expande/recolhe a linha
// de tarefas na visualizacao em lista.
function toggleListaRow(cardId){
  var row=document.getElementById("lista-expand-"+cardId);
  if(!row)return;
  var isOpen=row.style.display!=="none";
  row.style.display=isOpen?"none":"table-row";
}

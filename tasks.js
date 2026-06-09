// ── TAREFAS ──
// tarefasDB: cache local indexado por card_id
var tarefasDB={};

// Exclusivas deste modulo (mantidas): leem a TABELA de tarefas para o cache.
async function loadTarefasDoCard(cardId){
  try{var rows=await dbFetchTarefas(cardId);tarefasDB[cardId]=rows;}catch(e){tarefasDB[cardId]=[];}
}

async function loadTodasTarefas(){
  try{
    var rows=await dbFetchTodasTarefas();
    tarefasDB={};
    rows.forEach(function(t){if(!tarefasDB[t.card_id])tarefasDB[t.card_id]=[];tarefasDB[t.card_id].push(t);});
  }catch(e){}
}

// Etapa 1 da consolidacao: getTarefas, refreshTarefasPanel, addTarefa, updateTarefa,
// delTarefa, _mc2, _mc2Close, _buildTarefaForm, openAddTarefa, openEditTarefa,
// buildTarefasHTML, openCoverPicker e applyCoverColor foram removidas daqui por
// estarem duplicadas em app.js, que carrega por ultimo e prevalecia.
//
// ATENCAO (Etapa 2): a versao deste modulo usava a TABELA de tarefas
// (dbUpsertTarefa/dbFetchTarefas/tarefasDB), enquanto a versao ativa em app.js
// usa o modelo antigo (tarefas embutidas no JSON do card). Reconciliar antes de
// mover estas funcoes de volta.

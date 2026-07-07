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
function getCmts(card){return card.comentarios||[];}
async function addCmt(cardId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;var cmts=getCmts(card);cmts.push({id:Date.now().toString(),texto,autor:emailUser,data:new Date().toISOString()});card.comentarios=cmts;await dbUpsert(card);await dbLog("Comentou",card.titulo);}
async function editCmt(cardId,cmtId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).map(function(c){return c.id===cmtId?Object.assign({},c,{texto,editado:true}):c;});await dbUpsert(card);}
async function delCmt(cardId,cmtId){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).filter(function(c){return c.id!==cmtId;});await dbUpsert(card);}
function canEditCmt(autor){return perfil==="mestre"||(emailUser===autor&&perfil==="advogado");}
function canComment(){return perfil==="mestre"||perfil==="advogado";}

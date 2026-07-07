// ── KANBAN ──
// Etapa 2: drag and drop e gestao de colunas voltaram para este modulo.
// Etiquetas, comentarios de card, edicao inline, renderView, taskChipHTML,
// buildCardHTML, renderKanban e renderLista ainda ficam em app.js ate os
// proximos lotes.
//
// Mantida apenas toggleListaRow (exclusiva deste modulo): expande/recolhe a linha
// de tarefas na visualizacao em lista.
function onDragStart(e,id){dragCardId=id;e.dataTransfer.effectAllowed="move";setTimeout(function(){var el=document.getElementById("card-"+id);if(el)el.classList.add("dragging");},0);}
function onDragEnd(e,id){var el=document.getElementById("card-"+id);if(el)el.classList.remove("dragging");clearInds();dragCardId=null;_dOvColId=null;_dOvIdx=null;}
function clearInds(){document.querySelectorAll(".card-drop-ind").forEach(function(el){el.classList.remove("active");});}
function onColDragOver(e,colId){
  if(dragColId){e.preventDefault();e.dataTransfer.dropEffect="move";return;}
  e.preventDefault();if(!dragCardId)return;
  var colEl=document.getElementById("col-cards-"+colId);if(!colEl)return;
  var els=Array.from(colEl.querySelectorAll(".card-item:not(.dragging)"));
  var idx=els.length;
  for(var i=0;i<els.length;i++){var rect=els[i].getBoundingClientRect();if(e.clientY<rect.top+rect.height/2){idx=i;break;}}
  if(_dOvColId===colId&&_dOvIdx===idx)return;
  _dOvColId=colId;_dOvIdx=idx;clearInds();
  var ind=document.getElementById("ind-"+colId+"-"+idx);if(ind)ind.classList.add("active");
}
function onColDragLeave(e,colId){var colEl=document.getElementById("col-cards-"+colId);if(!colEl)return;var rect=colEl.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){clearInds();_dOvColId=null;_dOvIdx=null;}}
function onColDrop(e,colId){
  e.preventDefault();e.stopPropagation();clearInds();
  if(dragColId){onColHeaderDrop(e,colId);return;}
  var cid=dragCardId;
  if(!cid)return;
  dragCardId=null;
  var card=cards.find(function(c){return c.id===cid;});if(!card){return;}
  var col=cards.filter(function(c){return c.status===colId&&c.id!==cid;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
  var ins=(_dOvColId===colId&&_dOvIdx!=null)?_dOvIdx:col.length;
  _dOvColId=null;_dOvIdx=null;
  var antes=card.status;card.status=colId;col.splice(ins,0,card);col.forEach(function(c,i){c.ordem=i;});
  renderKanban();
  Promise.all(col.map(function(c){return dbUpsert(c);})).then(function(){
    if(antes!==colId){var al=COLS.find(function(c){return c.id===antes;});var dl=COLS.find(function(c){return c.id===colId;});dbLog("Moveu demanda",card.titulo+": "+(al?al.label:antes)+" \u2192 "+(dl?dl.label:colId));}
  }).catch(function(){toast("Erro ao salvar",true);});
}
function onColDragStart(e,colId){
  if(dragCardId)return;
  dragColId=colId;e.dataTransfer.effectAllowed="move";
  setTimeout(function(){var el=document.getElementById("col-hdr-"+colId);if(el)el.style.opacity="0.5";},0);
}
function onColDragEnd(e,colId){dragColId=null;var el=document.getElementById("col-hdr-"+colId);if(el)el.style.opacity="";}
function onColHeaderDrop(e,targetColId){
  if(!dragColId||dragColId===targetColId){dragColId=null;return;}
  var fromIdx=COLS.findIndex(function(c){return c.id===dragColId;});
  var toIdx=COLS.findIndex(function(c){return c.id===targetColId;});
  if(fromIdx===-1||toIdx===-1){dragColId=null;return;}
  var moved=COLS.splice(fromIdx,1)[0];
  COLS.splice(toIdx,0,moved);
  COLS.forEach(function(c,i){c.ordem=i;});
  dragColId=null;
  renderKanban();
  dbSaveCols().catch(function(){toast("Erro ao salvar ordem",true);});
}
function colTitleInner(col){var isMestre=perfil==="mestre";return '<span class="col-title"'+(isMestre?' ondblclick="startRenameCol(\''+col.id+'\')" title="Duplo clique para renomear"':'')+'>'+col.label+'</span>';}
function startRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var el=document.getElementById("col-title-"+colId);if(!el)return;el.innerHTML='<input class="col-title-input" id="cti-'+colId+'" value="'+col.label+'" maxlength="40" onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\')cancelRenameCol(\''+colId+'\')" onblur="saveRenameCol(\''+colId+'\')"/>';var inp=document.getElementById("cti-"+colId);if(inp){inp.focus();inp.select();}}
function cancelRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});var el=document.getElementById("col-title-"+colId);if(el&&col)el.innerHTML=colTitleInner(col);}
async function saveRenameCol(colId){var inp=document.getElementById("cti-"+colId);if(!inp)return;var nome=(inp.value||"").trim();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(nome&&nome!==col.label){col.label=nome;try{await dbSaveCols();}catch(e){}}var el=document.getElementById("col-title-"+colId);if(el)el.innerHTML=colTitleInner(col);}
function toggleCP(colId,e){e.stopPropagation();if(cpOpen===colId){cpOpen=null;var el=document.getElementById("cp-"+colId);if(el)el.remove();return;}cpOpen=colId;document.querySelectorAll(".col-color-picker").forEach(function(el){el.remove();});var col=COLS.find(function(c){return c.id===colId;});var sw=COL_COLORS.map(function(cc,i){return '<div class="color-swatch'+(cc.dot===col.dot?" sel":"")+'" style="background:'+cc.dot+';" onclick="applyColColor(\''+colId+'\','+i+',event)"></div>';}).join("");var picker=document.createElement("div");picker.className="col-color-picker";picker.id="cp-"+colId;picker.innerHTML=sw;var hdr=document.getElementById("col-hdr-"+colId);if(hdr)hdr.appendChild(picker);setTimeout(function(){document.addEventListener("click",function h(){cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();document.removeEventListener("click",h);},true);},10);}
async function applyColColor(colId,idx,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var cc=COL_COLORS[idx];col.dot=cc.dot;col.cover=cc.cover;cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();try{await dbSaveCols();}catch(err){}renderKanban();}
function addColuna(){modalInput("Nova coluna","Nome da coluna...",function(nome){var id="col_"+uid();var cc=COL_COLORS[COLS.length%COL_COLORS.length];COLS.push({id,label:nome,dot:cc.dot,cover:cc.cover,badgeBg:"#f1f5f9",badgeText:"#475569",ordem:COLS.length});dbSaveCols().then(function(){toast("Coluna criada!");}).catch(function(){toast("Erro",true);});renderKanban();});}
function delColuna(colId,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(cards.filter(function(c){return c.status===colId;}).length>0){toast("A coluna precisa estar vazia",true);return;}modalConfirm('Excluir a coluna "'+col.label+'"?',function(){COLS=COLS.filter(function(c){return c.id!==colId;});dbSaveCols().then(function(){toast("Coluna excluída!");}).catch(function(){});renderKanban();});}

function toggleListaRow(cardId){
  var row=document.getElementById("lista-expand-"+cardId);
  if(!row)return;
  var isOpen=row.style.display!=="none";
  row.style.display=isOpen?"none":"table-row";
}

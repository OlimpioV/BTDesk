// ── DRAG & DROP (cards) ──
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
    if(antes!==colId){var al=COLS.find(function(c){return c.id===antes;});var dl=COLS.find(function(c){return c.id===colId;});dbLog("Moveu demanda",card.titulo+": "+(al?al.label:antes)+" > "+(dl?dl.label:colId));}
  }).catch(function(){toast("Erro ao salvar",true);});
}

// ── DRAG & DROP (colunas) ──
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

// ── COLUMNS ──
function colTitleInner(col){var isMestre=perfil==="mestre";return '<span class="col-title"'+(isMestre?' ondblclick="startRenameCol(\''+col.id+'\')" title="Duplo clique para renomear"':'')+'>'+col.label+'</span>';}
function startRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var el=document.getElementById("col-title-"+colId);if(!el)return;el.innerHTML='<input class="col-title-input" id="cti-'+colId+'" value="'+col.label+'" maxlength="40" onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\')cancelRenameCol(\''+colId+'\')" onblur="saveRenameCol(\''+colId+'\')"/>';var inp=document.getElementById("cti-"+colId);if(inp){inp.focus();inp.select();}}
function cancelRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});var el=document.getElementById("col-title-"+colId);if(el&&col)el.innerHTML=colTitleInner(col);}
async function saveRenameCol(colId){var inp=document.getElementById("cti-"+colId);if(!inp)return;var nome=(inp.value||"").trim();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(nome&&nome!==col.label){col.label=nome;try{await dbSaveCols();}catch(e){}}var el=document.getElementById("col-title-"+colId);if(el)el.innerHTML=colTitleInner(col);}
function toggleCP(colId,e){e.stopPropagation();if(cpOpen===colId){cpOpen=null;var el=document.getElementById("cp-"+colId);if(el)el.remove();return;}cpOpen=colId;document.querySelectorAll(".col-color-picker").forEach(function(el){el.remove();});var col=COLS.find(function(c){return c.id===colId;});var sw=COL_COLORS.map(function(cc,i){return '<div class="color-swatch'+(cc.dot===col.dot?" sel":"")+'" style="background:'+cc.dot+';" onclick="applyColColor(\''+colId+'\','+i+',event)"></div>';}).join("");var picker=document.createElement("div");picker.className="col-color-picker";picker.id="cp-"+colId;picker.innerHTML=sw;var hdr=document.getElementById("col-hdr-"+colId);if(hdr)hdr.appendChild(picker);setTimeout(function(){document.addEventListener("click",function h(){cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();document.removeEventListener("click",h);},true);},10);}
async function applyColColor(colId,idx,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var cc=COL_COLORS[idx];col.dot=cc.dot;col.cover=cc.cover;cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();try{await dbSaveCols();}catch(err){}renderKanban();}
function addColuna(){modalInput("Nova coluna","Nome da coluna...",function(nome){var id="col_"+uid();var cc=COL_COLORS[COLS.length%COL_COLORS.length];COLS.push({id,label:nome,dot:cc.dot,cover:cc.cover,badgeBg:"#f1f5f9",badgeText:"#475569",ordem:COLS.length});dbSaveCols().then(function(){toast("Coluna criada!");}).catch(function(){toast("Erro",true);});renderKanban();});}
function delColuna(colId,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(cards.filter(function(c){return c.status===colId;}).length>0){toast("A coluna precisa estar vazia",true);return;}modalConfirm('Excluir a coluna "'+col.label+'"?',function(){COLS=COLS.filter(function(c){return c.id!==colId;});dbSaveCols().then(function(){toast("Coluna excluída!");}).catch(function(){});renderKanban();});}

// ── LABELS ──
function toggleLabels(cardId,e){e.stopPropagation();labelsGlobalExp=!labelsGlobalExp;cards.forEach(function(card){labelsExp[card.id]=labelsGlobalExp;var el=document.getElementById("clb-"+card.id);if(el)el.innerHTML=buildLabels(card);});}
function buildLabels(card){if(!card.tipos||!card.tipos.length)return "";var exp=!!labelsExp[card.id];return card.tipos.map(function(t){var c=TC[t]||PALETA[0];if(exp)return '<span class="lbar exp" style="background:'+c.border+';" onclick="toggleLabels(\''+card.id+'\',event)">'+t+'</span>';return '<span class="lbar" style="background:'+c.border+';" title="'+t+'" onclick="toggleLabels(\''+card.id+'\',event)"></span>';}).join("");}

// ── COMENTÁRIOS ──
function getCmts(card){return card.comentarios||[];}
async function addCmt(cardId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;var cmts=getCmts(card);cmts.push({id:Date.now().toString(),texto,autor:emailUser,data:new Date().toISOString()});card.comentarios=cmts;await dbUpsert(card);await dbLog("Comentou",card.titulo);}
async function editCmt(cardId,cmtId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).map(function(c){return c.id===cmtId?Object.assign({},c,{texto,editado:true}):c;});await dbUpsert(card);}
async function delCmt(cardId,cmtId){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).filter(function(c){return c.id!==cmtId;});await dbUpsert(card);}
function canEditCmt(autor){return perfil==="mestre"||(emailUser===autor&&perfil==="advogado");}
function canComment(){return perfil==="mestre"||perfil==="advogado";}

// ── INLINE EDIT ──
function icCell(cardId,field,label,displayVal,canEdit,type,extraOpts){
  if(!canEdit)return '<div class="icell" style="cursor:default;"><div class="icell-label">'+label+'</div><div class="icell-val">'+displayVal+'</div></div>';
  var inputArea="";
  if(field==="clienteNum"){
    inputArea='<div class="ac-wrap"><input id="ic-cli-txt" autocomplete="off" placeholder="Nome ou número..." style="font-size:13px;margin-top:3px;" oninput="icAcInput(this.value,\''+cardId+'\')" onkeydown="icAcKd(event,\''+cardId+'\')"/><div id="ic-ac-list" class="ac-list" style="display:none;"></div></div>';
  } else if(field==="casoNum"){
    inputArea='<div id="ic-caso-area"></div>';
  } else if(type==="date"){
    inputArea='<input type="date" id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  } else if(type==="nstep"){
    inputArea='<input type="number" id="ic-'+field+'" min="0" step="0.5" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  } else if(type==="sel"){
    inputArea='<select id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')"><option value="">—</option>'+(extraOpts||"")+'</select>';
  } else {
    inputArea='<input type="text" id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  }
  return '<div class="icell" id="icw-'+field+'" onclick="openIcell(\''+cardId+'\',\''+field+'\')">'
    +'<div class="icell-label">'+label+'</div>'
    +'<div class="icell-val" id="icv-'+field+'">'+displayVal+'</div>'
    +'<div id="ici-'+field+'" style="display:none;">'+inputArea+'</div>'
    +'</div>';
}
function openIcell(cardId,field){
  if(_ef&&_ef!==field)closeIcell(_ef,true);
  _ef=field;_ecid=cardId;
  var card=cards.find(function(c){return c.id===cardId;});
  document.getElementById("icv-"+field).style.display="none";
  document.getElementById("ici-"+field).style.display="block";
  document.getElementById("icw-"+field).classList.add("open");
  if(field==="clienteNum"){
    var inp=document.getElementById("ic-cli-txt");
    if(inp){if(card&&card.clienteNum){var cn=cliNome(card.clienteNum);inp.value=card.clienteNum+(cn?" — "+cn:"");}inp.focus();inp.select();}
  } else if(field==="casoNum"){
    var area=document.getElementById("ic-caso-area");
    if(area&&card){
      var casos=card.clienteNum?casosDoCliente(parseInt(card.clienteNum)):[];
      if(casos.length>0){
        var opts='<option value="">Selecione...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(card.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,35):'')+'</option>';}).join("");
        area.innerHTML='<select id="ic-casoNum" style="margin-top:3px;font-size:13px;" onkeydown="icKd(event,\''+cardId+'\',\'casoNum\')">'+opts+'</select>';
      } else {
        area.innerHTML='<input type="number" id="ic-casoNum" min="1" max="9999" placeholder="Nº caso" style="margin-top:3px;font-size:13px;" onkeydown="icKd(event,\''+cardId+'\',\'casoNum\')"/>';
        if(card.casoNum)document.getElementById("ic-casoNum").value=card.casoNum;
      }
      setTimeout(function(){var el=document.getElementById("ic-casoNum");if(el)el.focus();},10);
    }
  } else {
    var inp=document.getElementById("ic-"+field);
    if(inp&&card){
      if(field==="horas")inp.value=card.horas||"";
      else if(field==="dataInicio")inp.value=card.dataInicio||"";
      else if(field==="dataFim")inp.value=card.dataFim||"";
      else if(field==="responsavel")inp.value=card.responsavel||"";
      else if(field==="email")inp.value=card.email||"";
      inp.focus();if(inp.select)inp.select();
    }
  }
}
function closeIcell(field,cancel){
  if(!field)return;
  var wrap=document.getElementById("icw-"+field);var valEl=document.getElementById("icv-"+field);var inpWrap=document.getElementById("ici-"+field);
  if(wrap)wrap.classList.remove("open");if(valEl)valEl.style.display="";if(inpWrap)inpWrap.style.display="none";
  if(_ef===field){_ef=null;_ecid=null;}
}
function icKd(e,cardId,field){if(e.key==="Enter"){e.preventDefault();saveIcell(cardId,field);}if(e.key==="Escape"){e.preventDefault();closeIcell(field,true);}}
function icAcInput(val,cardId){_acMatches=buildAcList(val);_acI=-1;var list=document.getElementById("ic-ac-list");if(!list)return;if(!_acMatches.length){list.style.display="none";return;}list.innerHTML=_acMatches.map(function(c,i){return '<div class="ac-item" id="icac-'+i+'" onmousedown="icAcSelect('+c.numero+',\''+cardId+'\')" onmouseover="_acI='+i+';icAcHL()"><strong>'+c.numero+'</strong>'+(c.nome?' — '+trunc(c.nome,36):'')+'</div>';}).join("");list.style.display="block";}
function icAcHL(){document.querySelectorAll("[id^='icac-']").forEach(function(el,i){el.classList.toggle("active",i===_acI);});}
function icAcKd(e,cardId){var items=document.querySelectorAll("[id^='icac-']");if(e.key==="ArrowDown"){e.preventDefault();_acI=Math.min(_acI+1,items.length-1);icAcHL();}else if(e.key==="ArrowUp"){e.preventDefault();_acI=Math.max(_acI-1,0);icAcHL();}else if(e.key==="Enter"){e.preventDefault();if(_acI>=0&&_acMatches[_acI])icAcSelect(_acMatches[_acI].numero,cardId);else saveIcell(cardId,"clienteNum");}else if(e.key==="Escape"){e.preventDefault();closeIcell("clienteNum",true);}}
function icAcSelect(num,cardId){var c=clientesDB.find(function(x){return x.numero===num;});var inp=document.getElementById("ic-cli-txt");if(inp)inp.value=num+(c&&c.nome?" — "+c.nome:"");var list=document.getElementById("ic-ac-list");if(list)list.style.display="none";_acI=-1;var card=cards.find(function(x){return x.id===cardId;});if(card){card.clienteNum=num;card.casoNum=null;}var cn=cliNome(num);var valEl=document.getElementById("icv-clienteNum");if(valEl)valEl.textContent=num+(cn?" — "+cn:"");closeIcell("clienteNum",false);var valCaso=document.getElementById("icv-casoNum");if(valCaso)valCaso.textContent="—";dbUpsert(card).catch(function(){});}
async function saveIcell(cardId,field){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var displayVal="—";
  if(field==="clienteNum"){var inp=document.getElementById("ic-cli-txt");var num=numFromStr((inp?inp.value:"").trim());card.clienteNum=num||null;card.casoNum=null;var cn=num?cliNome(num):"";displayVal=num?(num+(cn?" — "+cn:"")):"—";var vCaso=document.getElementById("icv-casoNum");if(vCaso)vCaso.textContent="—";}
  else if(field==="casoNum"){var sel=document.getElementById("ic-casoNum");var nv=sel&&sel.value?parseInt(sel.value):null;card.casoNum=nv;var cd=nv?casoDesc(nv,card.clienteNum):"";displayVal=nv?(nv+(cd?" — "+trunc(cd,40):"")):"—";}
  else if(field==="horas"){var inp=document.getElementById("ic-"+field);card.horas=inp&&inp.value?inp.value:null;displayVal=card.horas?(card.horas+"h"):"—";}
  else if(field==="responsavel"){var sel=document.getElementById("ic-"+field);card.responsavel=sel?sel.value||null:null;displayVal=card.responsavel||"—";}
  else{var inp=document.getElementById("ic-"+field);card[field]=inp&&inp.value?inp.value:null;displayVal=card[field]||"—";}
  var valEl=document.getElementById("icv-"+field);if(valEl)valEl.textContent=displayVal;
  closeIcell(field,false);
  try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro ao salvar",true);}
}

// ── TITLE / OBS inline ──
function startEditTitle(cardId){if(_ef&&_ef!=="titulo")closeIcell(_ef,true);_ef="titulo";_ecid=cardId;var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(!disp||!inp)return;disp.classList.add("editing");inp.classList.add("editing");inp.focus();inp.select();}
function titleKd(e,cardId){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveTitleModal(cardId);}if(e.key==="Escape"){e.preventDefault();stopEditTitle();}}
async function saveTitleModal(cardId){var inp=document.getElementById("mt-inp");var val=(inp?inp.value:"").trim();if(!val){toast("Título não pode ser vazio",true);return;}var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.titulo=val;var disp=document.getElementById("mt-disp");if(disp)disp.textContent=val;stopEditTitle();var faceEl=document.getElementById("ct-"+cardId);if(faceEl)faceEl.textContent=val;try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditTitle(){var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(disp)disp.classList.remove("editing");if(inp)inp.classList.remove("editing");if(_ef==="titulo"){_ef=null;_ecid=null;}}
function startEditObs(cardId){if(_ef&&_ef!=="obs")closeIcell(_ef,true);_ef="obs";_ecid=cardId;var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(!block||!inpEl)return;block.classList.add("open");if(textEl)textEl.style.display="none";inpEl.style.display="block";inpEl.focus();}
function obsKd(e,cardId){if(e.key==="Escape"){e.preventDefault();stopEditObs(cardId,null);}if(e.key==="Enter"&&e.ctrlKey){e.preventDefault();saveObsModal(cardId);}}
async function saveObsModal(cardId){var ta=document.getElementById("obs-inp-"+cardId);var val=ta?ta.value:"";var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.obs=val;stopEditObs(cardId,val);var faceObs=document.getElementById("co-"+cardId);if(faceObs){if(val){faceObs.style.display="";faceObs.textContent=trunc(val,90);}else{faceObs.style.display="none";}}try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditObs(cardId,val){var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(block)block.classList.remove("open");if(inpEl)inpEl.style.display="none";if(textEl){textEl.style.display="";if(val!==null){if(val){textEl.className="obs-text";textEl.textContent=val;}else{textEl.className="obs-ph";textEl.textContent="Clique para adicionar observações...";}}}if(_ef==="obs"){_ef=null;_ecid=null;}}

// ── KANBAN ──
function renderView(){if(viewMode==="lista")renderLista();else renderKanban();}

function taskChipHTML(cardId){
  var tarefas=getTarefas(cardId);if(!tarefas.length)return "";
  var today=new Date().toISOString().split("T")[0];
  var total=tarefas.length;
  var done=tarefas.filter(function(t){return t.status==="concluido";}).length;
  var atrasada=tarefas.some(function(t){return t.status!=="concluido"&&t.data_fim&&t.data_fim<today;});
  if(atrasada)return '<span class="chip" style="background:#fef2f2;color:#dc2626;font-weight:700;">'+ic("check")+" "+done+"/"+total+" · atraso</span>";
  if(done===total)return '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700;">'+ic("check")+" "+done+"/"+total+" · ok</span>";
  return '<span class="chip">'+ic("check")+" "+done+"/"+total+"</span>";
}

function buildCardHTML(card,ce){
  var nc=getCmts(card).length;var cv=coverColor(card);var labels=buildLabels(card);var cc2=ccHTML(card);
  var obsP=card.obs?'<div class="card-obs" id="co-'+card.id+'">'+trunc(card.obs,90)+'</div>':'<div class="card-obs" id="co-'+card.id+'" style="display:none;"></div>';
  var taskChip=taskChipHTML(card.id);
  return '<div class="card-item" id="card-'+card.id+'" draggable="'+(ce?"true":"false")+'"'+(ce?' ondragstart="onDragStart(event,\''+card.id+'\')" ondragend="onDragEnd(event,\''+card.id+'\')"':"")+' onclick="openCardModal(\''+card.id+'\')">'
    +'<div class="card-cover" style="background:'+cv+';"></div>'
    +'<div class="card-body">'
    +(labels?'<div class="card-labels" id="clb-'+card.id+'">'+labels+'</div>':"")
    +'<div class="card-title" id="ct-'+card.id+'">'+card.titulo+'</div>'
    +obsP
    +'<div class="card-meta" id="task-chip-'+card.id+'">'
    +(cc2||"")
    +(card.responsavel?'<span class="chip">'+ic("user")+" "+card.responsavel+"</span>":"")
    +(card.horas?'<span class="chip">'+ic("clock")+" "+card.horas+"h</span>":"")
    +(nc?'<span class="chip">'+ic("comment")+" "+nc+"</span>":"")
    +(card.dataFim?'<span class="chip">'+ic("cal")+" "+card.dataFim+"</span>":"")
    +(taskChip||"")
    +'</div></div></div>';
}

function renderKanban(){
  viewMode="kanban";var ce=perfil==="mestre"||perfil==="advogado";var isMestre=perfil==="mestre";var filtered=getFiltered();
  var sortedCols=[].concat(COLS).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
  var colsHtml=sortedCols.map(function(col){
    var colCards=filtered.filter(function(c){return c.status===col.id;});
    var isEmpty=cards.filter(function(c){return c.status===col.id;}).length===0;
    var inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div>';
    colCards.forEach(function(card,i){inner+=buildCardHTML(card,ce)+'<div class="card-drop-ind" id="ind-'+col.id+'-'+(i+1)+'"></div>';});
    if(colCards.length===0)inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div><div style="border:1.5px dashed rgba(255,255,255,.15);border-radius:10px;padding:16px;text-align:center;font-size:12px;color:rgba(255,255,255,.3);">'+(ce?'Solte aqui':'Nenhuma')+'</div>';
    return '<div class="col-wrap">'
      +'<div class="col-header" id="col-hdr-'+col.id+'" draggable="'+(isMestre?"true":"false")+'"'
      +(isMestre?' ondragstart="onColDragStart(event,\''+col.id+'\')" ondragend="onColDragEnd(event,\''+col.id+'\')"':"")
      +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')">'
      +'<span style="width:9px;height:9px;border-radius:50%;background:'+col.dot+';box-shadow:0 0 5px '+col.dot+'70;flex-shrink:0;cursor:'+(isMestre?"pointer":"default")+';" '+(isMestre?'onclick="toggleCP(\''+col.id+'\',event)" title="Trocar cor"':"")+' ></span>'
      +'<div id="col-title-'+col.id+'" style="flex:1;min-width:0;">'+colTitleInner(col)+'</div>'
      +'<span class="col-count">'+colCards.length+'</span>'
      +(isMestre&&isEmpty?'<button onclick="delColuna(\''+col.id+'\',event)" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;padding:2px 4px;border-radius:5px;" title="Excluir coluna" onmouseover="this.style.color=\'#fca5a5\'" onmouseout="this.style.color=\'rgba(255,255,255,.35)\'">'+ic('trash')+'</button>':"")
      +'</div>'
      +'<div class="col-cards drop-zone" id="col-cards-'+col.id+'"'
      +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')" ondragleave="onColDragLeave(event,\''+col.id+'\')">'
      +inner+'</div></div>';
  }).join("");
  var addBtn=isMestre?'<button class="add-col-btn" onclick="addColuna()">'+ic('plus')+' Adicionar coluna</button>':"";
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML=headerHTML("kanban")+toolbarHTML(ce)+'<div class="board-outer"><div class="board-inner">'+colsHtml+addBtn+'</div></div>';
  bindFCI();
}

// ── LISTA ──
function toggleListaRow(cardId){
  var row=document.getElementById("lista-expand-"+cardId);
  if(!row)return;
  var isOpen=row.style.display!=="none";
  row.style.display=isOpen?"none":"table-row";
}

function renderLista(){
  viewMode="lista";var ce=perfil==="mestre"||perfil==="advogado";var filtered=getFiltered();
  var app=document.getElementById("app");app.className="page-mode";
  var rows=filtered.length===0
    ?'<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma demanda</td></tr>'
    :filtered.map(function(card){
      var col=COLS.find(function(c){return c.id===card.status;})||{label:"—",badgeBg:"#f1f5f9",badgeText:"#475569",dot:"#94a3b8"};
      var sp='<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:'+col.badgeBg+';color:'+col.badgeText+';"><span style="width:6px;height:6px;border-radius:50%;background:'+col.dot+';"></span>'+col.label+'</span>';
      var nc=getCmts(card).length;
      var ccTd=(card.clienteNum&&card.casoNum)?card.clienteNum+"/"+card.casoNum:(card.clienteNum||"—");
      var ac=ce?'<button onclick="openCardModal(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;margin-right:3px;">Abrir</button><button onclick="confirmDelCard(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">Excluir</button>':"—";
      var tarefas=getTarefas(card.id);
      var total=tarefas.length;
      var done=total?tarefas.filter(function(t){return t.status==="concluido";}).length:0;
      var today=new Date().toISOString().split("T")[0];
      var atrasada=tarefas.some(function(t){return t.status!=="concluido"&&t.data_fim&&t.data_fim<today;});
      var chipStyle=atrasada?"background:#fef2f2;color:#dc2626;font-weight:700;":done&&done===total?"background:#dcfce7;color:#15803d;font-weight:700;":"";
      var tarefaChip=total?'<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:2px 7px;border-radius:4px;background:#f4f5f7;'+chipStyle+'">'+ic("check")+" "+done+"/"+total+"</span>":"—";
      var chevron=total?'<button onclick="toggleListaRow(\''+card.id+'\')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:2px 5px;border-radius:5px;font-size:11px;display:inline-flex;align-items:center;gap:3px;">'+ic("check")+" Ver tarefas</button>':"";

      // linha de tarefas expandível
      var tarefasExpand='<tr id="lista-expand-'+card.id+'" style="display:none;"><td colspan="10" style="padding:0;background:#f8fafc;border-bottom:1px solid var(--border);">'
        +'<div style="padding:12px 24px 16px;">'
        +'<div style="font-size:11px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Tarefas</div>'
        +(tarefas.length===0?'<div style="font-size:12px;color:#94a3b8;font-style:italic;">Nenhuma tarefa</div>'
          :tarefas.map(function(t){
            var tcol=COLS.find(function(co){return co.id===t.status;})||{label:"?",dot:"#94a3b8",badgeBg:"#f1f5f9",badgeText:"#475569"};
            var tat=t.status!=="concluido"&&t.data_fim&&t.data_fim<today;
            var tcon=t.status==="concluido";
            var bLeft=tat?"#dc2626":tcon?"#22c55e":"#e2e8f0";
            var tStyle="font-size:12px;font-weight:600;color:"+(tcon?"#94a3b8":"#172b4d")+";"+(tcon?"text-decoration:line-through;":"");
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:#fff;border-radius:8px;margin-bottom:5px;border-left:3px solid '+bLeft+';">'
              +'<div style="flex:1;'+tStyle+'">'+t.texto+'</div>'
              +(t.responsavel?'<span style="font-size:10px;font-weight:600;background:#f4f5f7;border-radius:4px;padding:2px 6px;color:#5e6c84;">'+t.responsavel+'</span>':"")
              +'<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:'+tcol.badgeBg+';color:'+tcol.badgeText+';">'
              +'<span style="width:5px;height:5px;border-radius:50%;background:'+tcol.dot+';"></span>'+tcol.label+'</span>'
              +(t.data_fim?'<span style="font-size:10px;color:'+(tat?"#dc2626":"#94a3b8")+';">'+(tat?"<b>":"")+t.data_fim.split("-").reverse().join("/")+(tat?"</b>":"")+'</span>':"")
              +'</div>';
          }).join(""))
        +'</div></td></tr>';

      return '<tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'" onclick="openCardModal(\''+card.id+'\')">'
        +'<td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+card.titulo+'</td>'
        +'<td style="padding:11px 14px;">'+sp+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+ccTd+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+(card.responsavel||"—")+'</td>'
        +'<td style="padding:11px 14px;">'+(card.tipos&&card.tipos.length?'<div style="display:flex;gap:3px;flex-wrap:wrap;">'+tipoTagsHTML(card.tipos)+'</div>':"—")+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataInicio||"—")+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataFim||"—")+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text3);">'+(nc?'<span style="display:flex;align-items:center;gap:3px;">'+ic('comment')+' '+nc+'</span>':"—")+'</td>'
        +'<td style="padding:11px 14px;" onclick="event.stopPropagation()">'+tarefaChip+' '+chevron+'</td>'
        +'<td style="padding:11px 14px;" onclick="event.stopPropagation()">'+ac+'</td>'
        +'</tr>'
        +tarefasExpand;
    }).join("");
  app.innerHTML=headerHTML("lista")+toolbarHTML(ce)+'<div style="padding:16px 16px 40px;max-width:1400px;margin:0 auto;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:900px;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Título','Status','C/C','Resp.','Tipos','Início','Encerramento','Com.','Tarefas','Ações'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  bindFCI();
}

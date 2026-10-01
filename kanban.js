// ── KANBAN ──
// Etapa 2: drag and drop, gestao de colunas, etiquetas e renderizacao principal
// do kanban/lista voltaram para este modulo.
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
  if(agruparPor==="prazo"){var pIdx=(_dOvColId===colId)?_dOvIdx:null;_dOvColId=null;_dOvIdx=null;_prazoDrop(colId,cid,pIdx);return;}
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
function toggleLabels(cardId,e){e.stopPropagation();labelsGlobalExp=!labelsGlobalExp;cards.forEach(function(card){labelsExp[card.id]=labelsGlobalExp;var el=document.getElementById("clb-"+card.id);if(el)el.innerHTML=buildLabels(card);});}
function buildLabels(card){if(!card.tipos||!card.tipos.length)return "";var exp=!!labelsExp[card.id];return card.tipos.map(function(t){var c=TC[t]||PALETA[0];if(exp)return '<span class="lbar exp" style="background:'+c.border+';" onclick="toggleLabels(\''+card.id+'\',event)">'+t+'</span>';return '<span class="lbar" style="background:'+c.border+';" title="'+t+'" onclick="toggleLabels(\''+card.id+'\',event)"></span>';}).join("");}

function renderView(){if(viewMode==="lista")renderLista();else renderKanban();}
function taskChipHTML(card){
  var tarefas=getTarefas(card);if(!tarefas.length)return "";
  var total=tarefas.length;
  var done=tarefas.filter(function(t){return statusTarefaFinalizador(t.status);}).length;
  return '<span class="bdg'+(done===total?' bdg-ok':'')+'" title="Subtarefas concluídas">'+ic("check")+done+"/"+total+"</span>";
}
var _MESES_CURTOS=["jan.","fev.","mar.","abr.","mai.","jun.","jul.","ago.","set.","out.","nov.","dez."];
function _fmtDataCurta(d){if(!d)return "";var p=String(d).split("-");if(p.length<3)return d;var s=parseInt(p[2],10)+" de "+_MESES_CURTOS[parseInt(p[1],10)-1];if(p[0]!==String(new Date().getFullYear()))s+=" de "+p[0];return s;}
function _prazoBadgeHTML(card){
  if(!card.dataFim&&!card.dataInicio)return "";
  var txt=card.dataInicio&&card.dataFim?_fmtDataCurta(card.dataInicio)+" - "+_fmtDataCurta(card.dataFim):(card.dataFim?_fmtDataCurta(card.dataFim):"Começou: "+_fmtDataCurta(card.dataInicio));
  var cls=_cardConcluido(card)?" bdg-data-ok":(_cardVencido(card)?" bdg-data-atraso":(card.dataFim===_hojeStr()?" bdg-data-hoje":""));
  return '<span class="bdg bdg-data'+cls+'" title="'+escHTML(txt)+'">'+ic("clock")+'<span class="bdg-tx">'+escHTML(txt)+'</span></span>';
}
function buildCardHTML(card,ce){
  var cv=coverColor(card);var labels=buildLabels(card);var ok=_cardConcluido(card);
  var cn=card.clienteNum?cliNome(card.clienteNum):"";
  var num=card.clienteNum?(card.clienteNum+(card.casoNum?"/"+card.casoNum:"")):"";
  var sub=num||cn?'<div class="card-sub">'+escHTML(num+(num&&cn?" · ":"")+cn)+'</div>':"";
  var tit='<div class="card-title'+(ok?' card-title-ok':'')+'" id="ct-'+card.id+'">'+escHTML(card.titulo)+'</div>';
  if(ok)tit='<div class="card-title-wrap">'+ic("check")+tit+'</div>';
  var resp=card.responsavel?'<span class="card-membro" title="'+escHTML(card.responsavel)+'" style="background:'+(typeof _avCor==="function"?_avCor(card.responsavel):"#2b76e5")+';">'+escHTML(card.responsavel)+'</span>':"";
  var badges=_prazoBadgeHTML(card)
    +(card.obs?'<span class="bdg" title="Tem observações">'+ic("desc")+'</span>':"")
    +taskChipHTML(card)
    +(card.horas?'<span class="bdg" title="Horas">'+ic("hourglass")+card.horas+'h</span>':"")
    +resp;
  return '<div class="card-item'+(ok?' card-ok':'')+'" id="card-'+card.id+'" draggable="'+(ce?"true":"false")+'"'+(ce?' ondragstart="onDragStart(event,\''+card.id+'\')" ondragend="onDragEnd(event,\''+card.id+'\')"':"")+' onclick="openCardModal(\''+card.id+'\')">'+'<div class="card-cover" style="background:'+cv+';"></div>'+'<div class="card-body">'+(labels?'<div class="card-labels" id="clb-'+card.id+'">'+labels+'</div>':"")+tit+sub+'<div class="card-badges">'+badges+'</div><div class="card-cmts" id="cc-'+card.id+'" draggable="false" onclick="event.stopPropagation()">'+buildCardComments(card)+'</div></div></div>';
}

// ── COMENTARIOS INLINE NO CARD ──
function buildCardComments(card){
  var cmts=getCmts(card);var n=cmts.length;var canC=canComment();
  if(!n&&!canC)return "";
  var exp=!!cmtsExp[card.id];
  var head='<button class="cc-toggle" onclick="toggleCardComments(\''+card.id+'\',event)">'+ic("comment")+' Comentários ('+n+')<span class="cc-caret'+(exp?' open':'')+'">'+ic("chevdown")+'</span></button>';
  if(!exp)return head;
  var list;
  if(n){
    list=cmts.map(function(c){
      var nome=(c.autor||"?").split("@")[0];
      var ini=nome.slice(0,2).toUpperCase();
      var cor=(typeof _avCor==="function"?_avCor(c.autor||nome):"#2b76e5");
      var dt=c.data?new Date(c.data).toLocaleDateString("pt-BR"):"";
      var del=canEditCmt(c.autor)?'<button class="cc-del" title="Excluir" onclick="delCardComment(\''+card.id+'\',\''+c.id+'\',event)">&times;</button>':'';
      return '<div class="cc-item"><div class="cc-item-hd"><span class="cc-av" style="background:'+cor+';">'+escHTML(ini)+'</span><span class="cc-nm">'+escHTML(nome)+'</span><span class="cc-dt">'+dt+'</span>'+del+'</div><div class="cc-tx">'+escHTML(c.texto)+'</div></div>';
    }).join("");
  } else { list='<div class="cc-empty">Sem comentários.</div>'; }
  var input=canC?'<div class="cc-input"><textarea id="cc-ta-'+card.id+'" class="cc-ta" rows="1" placeholder="Comentar... (Enter envia)" onkeydown="cardCmtKd(event,\''+card.id+'\')" oninput="_ccGrow(this)"></textarea><button class="cc-send" onclick="sendCardComment(\''+card.id+'\',event)">Enviar</button></div>':'';
  return head+'<div class="cc-list">'+list+'</div>'+input;
}
function toggleCardComments(cardId,e){if(e)e.stopPropagation();cmtsExp[cardId]=!cmtsExp[cardId];_refreshCardComments(cardId,true);}
function _refreshCardComments(cardId,focus){var card=cards.find(function(c){return c.id===cardId;});var el=document.getElementById("cc-"+cardId);if(!el||!card)return;el.innerHTML=buildCardComments(card);if(focus&&cmtsExp[cardId]){var ta=document.getElementById("cc-ta-"+cardId);if(ta)ta.focus();}}
function cardCmtKd(e,cardId){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.stopPropagation();sendCardComment(cardId);}}
function _ccGrow(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight,80)+"px";}
async function sendCardComment(cardId,e){if(e)e.stopPropagation();var ta=document.getElementById("cc-ta-"+cardId);var txt=(ta?ta.value:"").trim();if(!txt)return;try{await addCmt(cardId,txt);cmtsExp[cardId]=true;_refreshCardComments(cardId,true);toast("Comentário adicionado!");}catch(err){toast("Erro ao comentar",true);}}
function delCardComment(cardId,cmtId,e){if(e)e.stopPropagation();modalConfirm("Excluir este comentário?",async function(){try{await delCmt(cardId,cmtId);_refreshCardComments(cardId,false);}catch(err){toast("Erro",true);}});}

// ── AGRUPAR POR PRAZO ──
function _fmtYMD(d){var m=d.getMonth()+1,dia=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dia<10?"0":"")+dia;}
function _hojeStr(){return _fmtYMD(new Date());}
function _addDiasStr(str,n){var p=str.split("-");var d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));d.setDate(d.getDate()+n);return _fmtYMD(d);}
function _colConcluidaId(){var c=COLS.find(function(x){return x.id==="concluido"||/conclu/i.test(x.label||"");});return c?c.id:"concluido";}
function _colAndamentoId(){var c=COLS.find(function(x){return x.id==="andamento"||/andamento/i.test(x.label||"");});if(c)return c.id;var done=_colConcluidaId();var f=[].concat(COLS).filter(function(x){return x.id!==done;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);})[0];return f?f.id:(COLS[0]&&COLS[0].id);}
function _cardConcluido(card){return card.status===_colConcluidaId();}
function _cardVencido(card){return !!(card.dataFim&&card.dataFim<_hojeStr()&&!_cardConcluido(card));}
function _prazoBucket(card){
  if(_cardConcluido(card))return "concluida";
  var d=card.dataFim;if(!d)return "sem_prazo";
  var hoje=_hojeStr();
  if(d<=hoje)return "hoje";
  if(d===_addDiasStr(hoje,1))return "amanha";
  return "semana";
}
function _prazoCardSort(a,b){
  var oa=a.ordemPrazo,ob=b.ordemPrazo;
  if(oa!=null&&ob!=null)return oa-ob;
  if(oa!=null)return -1;
  if(ob!=null)return 1;
  var da=a.dataFim||"9999-99-99",db=b.dataFim||"9999-99-99";if(da!==db)return da<db?-1:1;return (a.titulo||"").localeCompare(b.titulo||"");
}
async function _prazoDrop(colId,cid,insIdx){
  var card=cards.find(function(c){return c.id===cid;});if(!card)return;
  var hoje=_hojeStr();
  if(colId==="hoje")card.dataFim=hoje;
  else if(colId==="amanha")card.dataFim=_addDiasStr(hoje,1);
  else if(colId==="semana")card.dataFim=_addDiasStr(hoje,2);
  else if(colId==="sem_prazo")card.dataFim=null;
  else if(colId==="concluida")card.status=_colConcluidaId();
  if(colId!=="concluida"&&_cardConcluido(card))card.status=_colAndamentoId();
  var bucket=cards.filter(function(c){return _prazoBucket(c)===colId&&c.id!==cid;}).sort(_prazoCardSort);
  var ins=(insIdx!=null)?Math.min(insIdx,bucket.length):bucket.length;
  bucket.splice(ins,0,card);
  bucket.forEach(function(c,i){c.ordemPrazo=i;});
  renderKanban();
  try{await Promise.all(bucket.map(function(c){return dbUpsert(c);}));}catch(e){toast("Erro ao salvar",true);}
}

function renderKanban(){
  viewMode="kanban";var ce=perfil==="mestre"||perfil==="advogado";var isMestre=perfil==="mestre";var filtered=getFiltered();
  var porPrazo=(agruparPor==="prazo");
  var colsList=porPrazo?PRAZO_COLS:[].concat(COLS).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
  var colsHtml=colsList.map(function(col){
    var colCards=porPrazo?filtered.filter(function(c){return _prazoBucket(c)===col.id;}).sort(_prazoCardSort):filtered.filter(function(c){return c.status===col.id;});
    var isEmpty=porPrazo?false:cards.filter(function(c){return c.status===col.id;}).length===0;
    var inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div>';
    colCards.forEach(function(card,i){inner+=buildCardHTML(card,ce)+'<div class="card-drop-ind" id="ind-'+col.id+'-'+(i+1)+'"></div>';});
    if(colCards.length===0)inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div><div class="col-vazio">'+(ce?(porPrazo?'Arraste aqui':'Solte aqui'):'Nenhuma')+'</div>';
    var header;
    if(porPrazo){
      header='<div class="col-header" style="cursor:default;"><span class="col-dot" style="background:'+col.dot+';"></span><span class="col-title">'+col.label+'</span><span class="col-count">'+colCards.length+'</span></div>';
    } else {
      header='<div class="col-header" id="col-hdr-'+col.id+'" draggable="'+(isMestre?"true":"false")+'"'
        +(isMestre?' ondragstart="onColDragStart(event,\''+col.id+'\')" ondragend="onColDragEnd(event,\''+col.id+'\')"':"")
        +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')">'
        +'<span class="col-dot" style="background:'+col.dot+';cursor:'+(isMestre?"pointer":"default")+';" '+(isMestre?'onclick="toggleCP(\''+col.id+'\',event)" title="Trocar cor"':"")+' ></span>'
        +'<div id="col-title-'+col.id+'" class="col-title-box">'+colTitleInner(col)+'</div>'
        +'<span class="col-count">'+colCards.length+'</span>'
        +(isMestre&&isEmpty?'<button onclick="delColuna(\''+col.id+'\',event)" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;padding:2px 4px;border-radius:5px;" title="Excluir coluna" onmouseover="this.style.color=\'#fca5a5\'" onmouseout="this.style.color=\'rgba(255,255,255,.35)\'">'+ic('trash')+'</button>':"")
        +'</div>';
    }
    return '<div class="col-wrap">'+header
      +'<div class="col-cards drop-zone" id="col-cards-'+col.id+'"'
      +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')" ondragleave="onColDragLeave(event,\''+col.id+'\')">'
      +inner+'</div></div>';
  }).join("");
  var addBtn=(!porPrazo&&isMestre)?'<button class="add-col-btn" onclick="addColuna()">'+ic('plus')+' Adicionar coluna</button>':"";
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML=headerHTML("kanban")+toolbarHTML(ce)+'<div class="board-outer"><div class="board-inner">'+colsHtml+addBtn+'</div></div>';
  bindFCI();
}

// LISTA
function renderLista(){
  viewMode="lista";var ce=perfil==="mestre"||perfil==="advogado";var filtered=getFiltered();
  var app=document.getElementById("app");app.className="page-mode";
  var rows=filtered.length===0?'<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma demanda</td></tr>':filtered.map(function(card){
    var col=COLS.find(function(c){return c.id===card.status;})||{label:"-",badgeBg:"#f1f5f9",badgeText:"#475569",dot:"#94a3b8"};
    var sp='<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:'+col.badgeBg+';color:'+col.badgeText+';"><span style="width:6px;height:6px;border-radius:50%;background:'+col.dot+';"></span>'+col.label+'</span>';
    var nc=getCmts(card).length;
    var ccTd=(card.clienteNum&&card.casoNum)?card.clienteNum+"/"+card.casoNum:(card.clienteNum||"-");
    var ac=ce?'<button onclick="openCardModal(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;margin-right:3px;">Abrir</button><button onclick="confirmDelCard(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">Excluir</button>':"-";
    return '<tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'" onclick="openCardModal(\''+card.id+'\')">'
      +'<td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+escHTML(card.titulo)+_demandaListaResumo(card)+'</td>'
      +'<td style="padding:11px 14px;">'+sp+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+ccTd+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+(card.responsavel||"-")+'</td>'
      +'<td style="padding:11px 14px;">'+(card.tipos&&card.tipos.length?'<div style="display:flex;gap:3px;flex-wrap:wrap;">'+tipoTagsHTML(card.tipos)+'</div>':"-")+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataInicio||"-")+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataFim||"-")+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text3);">'+(nc?'<span style="display:flex;align-items:center;gap:3px;">'+ic('comment')+' '+nc+'</span>':"-")+'</td>'
      +'<td style="padding:11px 14px;" onclick="event.stopPropagation()">'+ac+'</td></tr>';
  }).join("");
  app.innerHTML=headerHTML("lista")+toolbarHTML(ce)+'<div style="padding:16px 16px 40px;max-width:1400px;margin:0 auto;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:900px;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Titulo','Status','C/C','Resp.','Tipos','Inicio','Encerramento','Com.','Acoes'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  bindFCI();
}


function toggleListaRow(cardId){
  var row=document.getElementById("lista-expand-"+cardId);
  if(!row)return;
  var isOpen=row.style.display!=="none";
  row.style.display=isOpen?"none":"table-row";
}

// ── INCLINACAO 3D DO CARD SEGUINDO O MOUSE ──
(function(){
  var MAX=6,atual=null,reduz=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function solta(el){if(!el)return;el.classList.remove("tilting");el.style.transform="";}
  document.addEventListener("mousemove",function(e){
    if(reduz)return;
    var el=e.target.closest?e.target.closest("#app.kanban-mode .card-item"):null;
    if(el!==atual){solta(atual);atual=el;}
    if(!el||dragCardId||e.target.closest(".card-cmts"))return solta(el);
    var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    el.classList.add("tilting");
    el.style.transform="perspective(700px) rotateX("+(-y*MAX).toFixed(2)+"deg) rotateY("+(x*MAX).toFixed(2)+"deg) translateY(-2px)";
  });
  document.addEventListener("mouseleave",function(){solta(atual);atual=null;});
  document.addEventListener("dragstart",function(){solta(atual);atual=null;},true);
})();

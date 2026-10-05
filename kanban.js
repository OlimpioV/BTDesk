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
  var pg=statusTarefaProgresso(tarefas),total=pg.total,done=pg.feitas;
  if(!total)return "";
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
  var rs=respsDe(card);
  var resp=rs.length?'<span class="card-membros" title="'+escHTML(rs.join(", "))+'">'+rs.slice(0,3).map(function(r){return '<span class="card-membro" style="background:'+(typeof _avCor==="function"?_avCor(r):"#2b76e5")+';">'+escHTML(r)+'</span>';}).join("")+(rs.length>3?'<span class="card-membro card-membro-mais">+'+(rs.length-3)+'</span>':'')+'</span>':"";
  var badges=_prazoBadgeHTML(card)
    +(card.obs?'<span class="bdg" title="Tem observações">'+ic("desc")+'</span>':"")
    +taskChipHTML(card)
    +(card.horas?'<span class="bdg" title="Horas">'+ic("hourglass")+card.horas+'h</span>':"")
    +resp;
  return '<div class="card-item'+(ok?' card-ok':'')+'" id="card-'+card.id+'" draggable="'+(ce?"true":"false")+'"'+(ce?' ondragstart="onDragStart(event,\''+card.id+'\')" ondragend="onDragEnd(event,\''+card.id+'\')"':"")+' onclick="openCardModal(\''+card.id+'\')"'+(ce?' oncontextmenu="abrirMenuCard(event,\''+card.id+'\')"':'')+'>'+'<div class="card-cover" style="background:'+cv+';"></div>'+(ce?'<button class="card-lapis" title="Ações do cartão" draggable="false" onclick="abrirMenuCard(event,\''+card.id+'\')">'+ic("edit")+'</button>':'')+'<div class="card-body">'+(labels?'<div class="card-labels" id="clb-'+card.id+'">'+labels+'</div>':"")+tit+sub+'<div class="card-badges">'+badges+'</div><div class="card-cmts" id="cc-'+card.id+'" draggable="false" onclick="event.stopPropagation()">'+buildCardComments(card)+'</div></div></div>';
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
      +inner+'</div>'
      +(!porPrazo&&ce?'<div class="col-foot" id="col-foot-'+col.id+'">'+_qaAddFootHTML(col.id)+'</div>':'')
      +'</div>';
  }).join("");
  var addBtn=(!porPrazo&&isMestre)?'<button class="add-col-btn" onclick="addColuna()">'+ic('plus')+' Adicionar coluna</button>':"";
  var nArq=ce?cards.filter(function(c){return c.arquivado&&(!equipeAtiva||(demandaEquipesDB[c.id]||[]).includes(equipeAtiva.id));}).length:0;
  var arqBtn=nArq?'<button class="arq-btn" onclick="abrirArquivados()">'+ic('archive')+' Arquivados ('+nArq+')</button>':"";
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML=headerHTML("kanban")+toolbarHTML(ce)+'<div class="board-outer"><div class="board-inner">'+colsHtml+(addBtn||arqBtn?'<div class="board-extra">'+addBtn+arqBtn+'</div>':'')+'</div></div>';
  bindFCI();
  if(_qaAddCol){var ta=document.getElementById("qa-add-ta");if(ta)ta.focus();}
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
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+(respsDe(card).join(", ")||"-")+'</td>'
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

// ── ACOES DO CARD (menu do lapis / clique direito, adicionar cartao, arquivar, copiar) ──
var _qaAddCol=null,_qaCard=null;
function _qaGet(){return cards.find(function(c){return c.id===_qaCard;});}
function _qaRefreshKanban(){if(document.querySelector("#app.kanban-mode"))renderKanban();}
async function _qaVincularEquipes(cardId,equipeIds){
  for(var i=0;i<equipeIds.length;i++){
    try{await dbUpsertDemandaEquipe({demanda_id:cardId,equipe_id:equipeIds[i]});}catch(_){}
    if(!demandaEquipesDB[cardId])demandaEquipesDB[cardId]=[];
    if(!demandaEquipesDB[cardId].includes(equipeIds[i]))demandaEquipesDB[cardId].push(equipeIds[i]);
  }
}
function _qaFimDaColuna(colId,excetoId){return cards.filter(function(c){return c.status===colId&&c.id!==excetoId;}).length;}

// Adicionar um cartao (rodape da coluna)
function _qaAddFootHTML(colId){
  if(_qaAddCol===colId)return '<textarea id="qa-add-ta" class="qa-add-ta" rows="2" placeholder="Insira um título para este cartão..." onkeydown="_qaAddKd(event,\''+colId+'\')"></textarea><div class="qa-add-acts"><button class="qa-btn-azul" onclick="_qaAddSalvar(\''+colId+'\')">Adicionar cartão</button><button class="qa-x" title="Cancelar" onclick="_qaAddFechar()">'+ic("close")+'</button></div>';
  return '<button class="qa-add-btn" onclick="_qaAddAbrir(\''+colId+'\')">'+ic("plus")+' Adicionar um cartão</button>';
}
function _qaRefreshFoots(){COLS.forEach(function(c){var el=document.getElementById("col-foot-"+c.id);if(el)el.innerHTML=_qaAddFootHTML(c.id);});}
function _qaAddAbrir(colId){
  _qaAddCol=colId;_qaRefreshFoots();
  var ta=document.getElementById("qa-add-ta");if(ta)ta.focus();
  var cc=document.getElementById("col-cards-"+colId);if(cc)cc.scrollTop=cc.scrollHeight;
}
function _qaAddFechar(){_qaAddCol=null;_qaRefreshFoots();}
function _qaAddKd(e,colId){
  if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();_qaAddSalvar(colId);}
  else if(e.key==="Escape"){e.preventDefault();_qaAddFechar();}
}
async function _qaAddSalvar(colId){
  var ta=document.getElementById("qa-add-ta");var titulo=(ta?ta.value:"").trim();
  if(!titulo){toast("Digite um título para o cartão",true);if(ta)ta.focus();return;}
  var col=COLS.find(function(c){return c.id===colId;});
  // advogado so enxerga demandas em que e o responsavel (RLS), entao o cartao ja nasce com a sigla dele
  var resp=perfil==="advogado"?_mtUserSigla():"";
  var card={id:Date.now().toString(),titulo:titulo,clienteNum:null,casoNum:null,responsavel:resp,responsaveis:resp?[resp]:[],status:colId,email:"",dataInicio:"",dataFim:"",horas:"",obs:"",tipos:[],comentarios:[],
    modelo_snapshot:_snapshotDemandaModelo(),campos_valores:{},ordem:_qaFimDaColuna(colId),coverColor:(col&&col.cover)||"#e2e8f0"};
  cards.push(card);
  if(equipeAtiva){if(!demandaEquipesDB[card.id])demandaEquipesDB[card.id]=[];demandaEquipesDB[card.id].push(equipeAtiva.id);}
  renderKanban();
  var cc=document.getElementById("col-cards-"+colId);if(cc)cc.scrollTop=cc.scrollHeight;
  try{
    await dbUpsert(card);await dbLog("Criou demanda",titulo);
    if(equipeAtiva)await _qaVincularEquipes(card.id,[equipeAtiva.id]);
  }catch(e){toast("Erro ao salvar o cartão",true);}
}

// Menu de acoes
var _QA_ITENS=[
  ["open","Abrir cartão","_qaAbrir()"],["tag","Editar etiquetas","_qaSub(event,'etq')"],["user","Alterar responsáveis","_qaSub(event,'resp')"],
  ["palette","Alterar capa","_qaSub(event,'capa')"],["clock","Editar datas","_qaSub(event,'datas')"],["move","Mover","_qaSub(event,'mover')"],
  ["copy","Copiar cartão","_qaSub(event,'copiar')"],["link","Copiar link","_qaLink()"],["archive","Arquivar","_qaArquivar()"]
];
function abrirMenuCard(e,cid){
  e.preventDefault();e.stopPropagation();
  fecharMenuCard();
  var el=document.getElementById("card-"+cid);if(!el)return;
  _qaCard=cid;
  var r=el.getBoundingClientRect();
  var layer=document.createElement("div");layer.id="qa-layer";layer.className="qa-layer";
  layer.onclick=function(ev){if(ev.target===layer)fecharMenuCard();};
  layer.oncontextmenu=function(ev){ev.preventDefault();if(ev.target===layer)fecharMenuCard();};
  layer.innerHTML='<div class="qa-foco" style="left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;"></div>'
    +'<div class="qa-menu" id="qa-menu">'+_QA_ITENS.map(function(it){return '<button class="qa-item" onclick="'+it[2]+'">'+ic(it[0])+it[1]+'</button>';}).join("")+'</div>'
    +'<div class="qa-sub" id="qa-sub" onclick="event.stopPropagation()"></div>';
  document.body.appendChild(layer);
  var m=document.getElementById("qa-menu"),mw=m.offsetWidth,mh=m.offsetHeight;
  var left=r.right+8;if(left+mw>innerWidth-8)left=Math.max(8,r.left-mw-8);
  var top=Math.min(r.top,innerHeight-mh-8);if(top<8)top=8;
  m.style.left=left+"px";m.style.top=top+"px";
}
function fecharMenuCard(){var l=document.getElementById("qa-layer");if(l)l.remove();_qaCard=null;}
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&document.getElementById("qa-layer"))fecharMenuCard();});
function _qaAbrir(){var cid=_qaCard;fecharMenuCard();openCardModal(cid);}
function _qaSub(e,tipo){
  e.stopPropagation();
  var card=_qaGet();if(!card)return;
  var sub=document.getElementById("qa-sub"),btn=e.currentTarget;
  var h="";
  if(tipo==="etq"){
    h='<div class="qa-sub-h">Etiquetas</div>'+(TIPOS.length?TIPOS.map(function(t){var c=TC[t]||PALETA[0];return '<label class="qa-op"><input type="checkbox"'+((card.tipos||[]).includes(t)?' checked':'')+' onchange="_qaToggleEtq(\''+escQ(t)+'\')"/><span class="qa-chip" style="background:'+c.border+';">'+escHTML(t)+'</span></label>';}).join(""):'<div class="qa-vazio">Nenhuma etiqueta cadastrada</div>');
  }else if(tipo==="resp"){
    var rs=respsDe(card);
    h='<div class="qa-sub-h">Responsáveis</div>'+(responsaveis.map(function(r){var on=rs.indexOf(r)>=0;return '<label class="qa-li'+(on?' sel':'')+'"><input type="checkbox"'+(on?' checked':'')+' onchange="_qaToggleResp(\''+escQ(r)+'\',this)"/><span class="qa-av" style="background:'+(typeof _avCor==="function"?_avCor(r):"#2b76e5")+';">'+escHTML(r)+'</span>'+escHTML(r)+'</label>';}).join("")||'<div class="qa-vazio">Nenhum responsável cadastrado</div>');
  }else if(tipo==="capa"){
    h='<div class="qa-sub-h">Capa</div><div class="qa-cores">'+COL_COLORS.map(function(cc){return '<button class="qa-cor'+(card.coverColor===cc.cover?' sel':'')+'" style="background:'+coverSolida(cc.cover)+';" onclick="_qaSetCapa(\''+cc.cover+'\')"></button>';}).join("")+'</div><button class="qa-btn-sec" onclick="_qaSetCapa(null)">Remover cor</button>';
  }else if(tipo==="datas"){
    h='<div class="qa-sub-h">Datas</div><div class="qa-fl">Início</div><input type="date" class="qa-in" id="qa-ini" value="'+(card.dataInicio||"")+'"/><div class="qa-fl">Encerramento</div><input type="date" class="qa-in" id="qa-fim" value="'+(card.dataFim||"")+'"/><div class="qa-acts"><button class="qa-btn-azul" onclick="_qaSetDatas(false)">Salvar</button><button class="qa-btn-sec" onclick="_qaSetDatas(true)">Remover</button></div>';
  }else if(tipo==="mover"){
    h='<div class="qa-sub-h">Mover para</div>'+[].concat(COLS).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);}).map(function(c){return '<div class="qa-li'+(card.status===c.id?' sel':'')+'" onclick="_qaMover(\''+c.id+'\')"><span class="qa-dot" style="background:'+c.dot+';"></span>'+escHTML(c.label)+(card.status===c.id?' <small>(atual)</small>':'')+'</div>';}).join("");
  }else if(tipo==="copiar"){
    var nSub=getTarefas(card).length;
    h='<div class="qa-sub-h">Copiar cartão</div><div class="qa-fl">Título</div><textarea class="qa-in qa-ta" id="qa-cp-tit" rows="2">'+escHTML(card.titulo)+'</textarea>'
      +'<div class="qa-fl">Manter</div><label class="qa-op"><input type="checkbox" id="qa-cp-sub"'+(nSub?'':' disabled')+'/> Subtarefas ('+nSub+')</label>'
      +'<div class="qa-dica">Sem marcar, copia só a estrutura do cartão: título, cliente, caso, responsável, datas, horas, observações, etiquetas, capa e campos. Comentários não são copiados.</div>'
      +'<div class="qa-fl">Coluna</div><select class="qa-in" id="qa-cp-col">'+[].concat(COLS).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);}).map(function(c){return '<option value="'+c.id+'"'+(card.status===c.id?' selected':'')+'>'+escHTML(c.label)+'</option>';}).join("")+'</select>'
      +'<div class="qa-acts"><button class="qa-btn-azul" onclick="_qaCopiar()">Criar cartão</button></div>';
  }
  sub.innerHTML=h;sub.classList.add("on");
  var m=document.getElementById("qa-menu").getBoundingClientRect(),b=btn.getBoundingClientRect(),sw=sub.offsetWidth,sh=sub.offsetHeight;
  var left=m.right+8;if(left+sw>innerWidth-8)left=Math.max(8,m.left-sw-8);
  var top=Math.min(b.top,innerHeight-sh-8);if(top<8)top=8;
  sub.style.left=left+"px";sub.style.top=top+"px";
  var f=sub.querySelector("textarea,input[type=date]");if(f&&tipo==="copiar"){f.focus();f.select();}
}
async function _qaSalvar(card,fechar,msg){
  if(fechar)fecharMenuCard();
  _qaRefreshKanban();
  try{await dbUpsert(card);if(msg)toast(msg);}catch(e){toast("Erro ao salvar",true);}
}
function _qaToggleEtq(t){var card=_qaGet();if(!card)return;card.tipos=card.tipos||[];var i=card.tipos.indexOf(t);if(i>=0)card.tipos.splice(i,1);else card.tipos.push(t);_qaSalvar(card,false);}
function _qaToggleResp(r,el){var card=_qaGet();if(!card)return;var l=respsDe(card),i=l.indexOf(r);if(i>=0)l.splice(i,1);else l.push(r);setResps(card,l);var li=el&&el.closest(".qa-li");if(li)li.classList.toggle("sel",l.indexOf(r)>=0);_qaSalvar(card,false);}
function _qaSetCapa(cor){var card=_qaGet();if(!card)return;card.coverColor=cor||null;_qaSalvar(card,true);}
function _qaSetDatas(remover){var card=_qaGet();if(!card)return;var i=document.getElementById("qa-ini"),f=document.getElementById("qa-fim");card.dataInicio=remover?null:((i&&i.value)||null);card.dataFim=remover?null:((f&&f.value)||null);_qaSalvar(card,true,"Datas salvas");}
function _qaMover(colId){var card=_qaGet();if(!card)return;if(card.status===colId){fecharMenuCard();return;}card.ordem=_qaFimDaColuna(colId,card.id);card.status=colId;var col=COLS.find(function(c){return c.id===colId;});_qaSalvar(card,true,"Movido para "+(col?col.label:"outra coluna"));}
async function _qaCopiar(){
  var orig=_qaGet();if(!orig)return;
  var titulo=((document.getElementById("qa-cp-tit")||{}).value||"").trim();if(!titulo){toast("Informe o título",true);return;}
  var comSub=!!(document.getElementById("qa-cp-sub")||{}).checked;
  var colId=(document.getElementById("qa-cp-col")||{}).value||orig.status;
  fecharMenuCard();
  var novo=JSON.parse(JSON.stringify(orig));
  delete novo.arquivado;delete novo.arquivadoEm;delete novo.ordemPrazo;
  novo.id=Date.now().toString();novo.titulo=titulo;novo.status=colId;novo.comentarios=[];novo.ordem=_qaFimDaColuna(colId);
  var equipes=(demandaEquipesDB[orig.id]||[]).slice();if(!equipes.length&&equipeAtiva)equipes=[equipeAtiva.id];
  cards.push(novo);demandaEquipesDB[novo.id]=equipes.slice();
  try{
    await dbUpsert(novo);await dbLog("Copiou demanda",orig.titulo+" -> "+titulo);
    await _qaVincularEquipes(novo.id,equipes);
    if(comSub){
      // subtarefas copiadas voltam ao status inicial, sem data de conclusao
      var inicial=(statusTarefaList(false).find(function(s){return !s.finalizador;})||{}).id;
      var subs=getTarefas(orig);
      for(var i=0;i<subs.length;i++){
        var t=subs[i];var cv=Object.assign({},t.campos_valores||{});delete cv.concluida_em;
        await dbUpsertTarefa(_taskCardToDb(novo.id,{id:uid(),texto:t.texto,responsavel:t.responsavel,responsaveis:respsDe(t),dataInicio:t.dataInicio,dataFim:t.dataFim,status:inicial||t.status,criado:new Date().toISOString(),modelo_snapshot:t.modelo_snapshot,campos_valores:cv},null));
      }
      await loadTarefasDoCard(novo.id);
    }
    _qaRefreshKanban();toast("Cartão copiado!");
  }catch(e){_qaRefreshKanban();toast("Erro ao copiar o cartão",true);}
}
function _qaLinkCard(cid){return location.origin+location.pathname+"?card="+encodeURIComponent(cid);}
function _qaLink(){
  var url=_qaLinkCard(_qaCard);fecharMenuCard();
  var plano=function(){var ta=document.createElement("textarea");ta.value=url;ta.style.cssText="position:fixed;opacity:0;";document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy");}catch(_){}ta.remove();toast(ok?"Link copiado!":"Não foi possível copiar o link",!ok);};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(function(){toast("Link copiado!");},plano);
  else plano();
}
async function arquivarCard(cid){
  var card=cards.find(function(c){return c.id===cid;});if(!card)return;
  card.arquivado=true;card.arquivadoEm=new Date().toISOString();
  _qaRefreshKanban();
  try{await dbUpsert(card);await dbLog("Arquivou demanda",card.titulo);toast("Cartão arquivado. Ele fica em \"Arquivados\", no fim do quadro.");}
  catch(e){toast("Erro ao arquivar",true);}
}
function _qaArquivar(){var cid=_qaCard;fecharMenuCard();arquivarCard(cid);}

// Itens arquivados
function _arqLista(){return cards.filter(function(c){return c.arquivado&&(!equipeAtiva||(demandaEquipesDB[c.id]||[]).includes(equipeAtiva.id));}).sort(function(a,b){return (b.arquivadoEm||"").localeCompare(a.arquivadoEm||"");});}
function abrirArquivados(){
  var lista=_arqLista();
  var mc=document.getElementById("modal-container");
  if(!lista.length){mc.innerHTML="";_qaRefreshKanban();return;}
  var rows=lista.map(function(c){
    var cn=c.clienteNum?cliNome(c.clienteNum):"";
    var sub=[c.clienteNum?(c.clienteNum+(cn?" · "+cn:"")):"",c.arquivadoEm?"Arquivado em "+new Date(c.arquivadoEm).toLocaleDateString("pt-BR"):""].filter(Boolean).join(" · ");
    return '<div class="arq-row" id="arq-'+c.id+'"><span class="arq-capa" style="background:'+coverColor(c)+';"></span><div class="arq-c"><div class="arq-t">'+escHTML(c.titulo)+'</div>'+(sub?'<div class="arq-s">'+escHTML(sub)+'</div>':'')+'</div>'
      +'<div class="arq-acts"><button class="qa-btn-sec" onclick="restaurarCard(\''+c.id+'\')">'+ic("restore")+' Restaurar</button><button class="qa-btn-del" onclick="_arqConfirmar(\''+c.id+'\')">'+ic("trash")+'</button></div></div>';
  }).join("");
  mc.innerHTML='<div class="modal-overlay" onclick="if(event.target===this)this.parentNode.innerHTML=\'\'"><div class="arq-box" onclick="event.stopPropagation()"><div class="arq-h"><h3>'+ic("archive")+' Itens arquivados <span>'+lista.length+'</span></h3><button class="qa-x" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'">'+ic("close")+'</button></div><div class="arq-lista">'+rows+'</div></div></div>';
}
function _arqConfirmar(cid){
  var acts=document.querySelector("#arq-"+cid+" .arq-acts");if(!acts)return;
  acts.innerHTML='<span class="arq-conf">Excluir de vez?</span><button class="qa-btn-del" onclick="excluirArquivado(\''+cid+'\')">Sim</button><button class="qa-btn-sec" onclick="abrirArquivados()">Não</button>';
}
async function restaurarCard(cid){
  var card=cards.find(function(c){return c.id===cid;});if(!card)return;
  delete card.arquivado;delete card.arquivadoEm;card.ordem=_qaFimDaColuna(card.status,card.id);
  abrirArquivados();_qaRefreshKanban();
  try{await dbUpsert(card);await dbLog("Restaurou demanda",card.titulo);toast("Cartão restaurado!");}catch(e){toast("Erro ao restaurar",true);}
}
async function excluirArquivado(cid){
  var card=cards.find(function(c){return c.id===cid;});if(!card)return;
  try{
    await dbDelTarefasDoCard(cid);await dbDel(cid);await dbLog("Excluiu demanda",card.titulo);
    delete tarefasDB[cid];cards=cards.filter(function(c){return c.id!==cid;});
    abrirArquivados();_qaRefreshKanban();toast("Excluída!");
  }catch(e){toast("Erro ao excluir",true);}
}

// Link direto para um cartao (?card=ID), aberto depois do init
function abrirCardDaUrl(){
  var cid=new URLSearchParams(location.search).get("card");if(!cid)return;
  history.replaceState(null,"",location.pathname+location.hash);
  var card=cards.find(function(c){return c.id===cid;});
  if(!card){toast("Demanda não encontrada ou sem acesso",true);return;}
  if(card.arquivado)toast("Esta demanda está arquivada");
  openCardModal(cid);
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

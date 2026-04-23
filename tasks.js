// ── TAREFAS ──
function getTarefas(card){return card.tarefas||[];}
function refreshTarefasPanel(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var panel=document.getElementById("tarefas-panel-"+cardId);
  if(panel)panel.innerHTML=buildTarefasHTML(card,ce);
}
async function addTarefa(cardId,texto,resp,di,df,st){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var t={id:uid(),texto:texto,responsavel:resp||"",dataInicio:di||"",dataFim:df||"",status:st||(COLS[0]?COLS[0].id:"aberto"),criado:new Date().toISOString()};
  card.tarefas=getTarefas(card);card.tarefas.push(t);
  await dbUpsert(card);toast("Tarefa adicionada!");refreshTarefasPanel(cardId);
}
async function updateTarefa(cardId,tarefaId,fields){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).map(function(t){return t.id===tarefaId?Object.assign({},t,fields):t;});
  await dbUpsert(card);refreshTarefasPanel(cardId);
}
async function delTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).filter(function(t){return t.id!==tarefaId;});
  await dbUpsert(card);toast("Tarefa excluída!");refreshTarefasPanel(cardId);
}
function _mc2(){var el=document.getElementById("modal-container2");if(!el){el=document.createElement("div");el.id="modal-container2";document.body.appendChild(el);}return el;}
function _mc2Close(){var el=document.getElementById("modal-container2");if(el)el.innerHTML="";}
function _buildTarefaForm(cardId,t){
  var mc=_mc2();mc.innerHTML="";
  var isEdit=!!t;
  var ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="300";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,460px);";
  box.onclick=function(e){e.stopPropagation();};
  var hdr=document.createElement("div");hdr.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;";
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);";htitle.textContent=isEdit?"Editar tarefa":"Nova tarefa";
  var hclose=document.createElement("button");hclose.style.cssText="background:none;border:none;cursor:pointer;color:var(--text3);";hclose.innerHTML=ic("close");hclose.onclick=_mc2Close;
  hdr.appendChild(htitle);hdr.appendChild(hclose);box.appendChild(hdr);
  function mkField(lbl,inp){var f=document.createElement("div");f.className="field";var l=document.createElement("label");l.textContent=lbl;f.appendChild(l);f.appendChild(inp);return f;}
  var inpTexto=document.createElement("input");inpTexto.id="nt-texto";inpTexto.placeholder="Descreva a tarefa...";if(t)inpTexto.value=t.texto||"";
  box.appendChild(mkField("Descrição *",inpTexto));
  var selResp=document.createElement("select");selResp.id="nt-resp";
  var o0=document.createElement("option");o0.value="";o0.textContent="Selecione...";selResp.appendChild(o0);
  responsaveis.forEach(function(r){var o=document.createElement("option");o.value=r;o.textContent=r;if(t&&t.responsavel===r)o.selected=true;selResp.appendChild(o);});
  box.appendChild(mkField("Responsável",selResp));
  var grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:12px;";grid.className="field";
  var inpDi=document.createElement("input");inpDi.type="date";inpDi.id="nt-di";if(t)inpDi.value=t.dataInicio||"";
  var inpDf=document.createElement("input");inpDf.type="date";inpDf.id="nt-df";if(t)inpDf.value=t.dataFim||"";
  var wdi=document.createElement("div");var ldi=document.createElement("label");ldi.textContent="Data início";wdi.appendChild(ldi);wdi.appendChild(inpDi);
  var wdf=document.createElement("div");var ldf=document.createElement("label");ldf.textContent="Data vencimento";wdf.appendChild(ldf);wdf.appendChild(inpDf);
  grid.appendChild(wdi);grid.appendChild(wdf);box.appendChild(grid);
  var selSt=document.createElement("select");selSt.id="nt-status";
  COLS.forEach(function(col){var o=document.createElement("option");o.value=col.id;o.textContent=col.label;if(t&&t.status===col.id)o.selected=true;selSt.appendChild(o);});
  box.appendChild(mkField("Status",selSt));
  var row=document.createElement("div");row.style.cssText="display:flex;gap:8px;justify-content:flex-end;";
  if(isEdit){
    var btnDel=document.createElement("button");btnDel.className="btn btn-danger";btnDel.textContent="Excluir";
    btnDel.onclick=function(){_mc2Close();modalConfirm("Excluir esta tarefa?",function(){delTarefa(cardId,t.id);});};
    row.appendChild(btnDel);
  }
  var btnCancel=document.createElement("button");btnCancel.className="btn";btnCancel.textContent="Cancelar";btnCancel.onclick=_mc2Close;row.appendChild(btnCancel);
  var btnSave=document.createElement("button");btnSave.className="btn btn-primary";btnSave.textContent="Salvar";
  btnSave.onclick=async function(){
    var texto=(document.getElementById("nt-texto").value||"").trim();if(!texto){toast("Informe a descrição",true);return;}
    var fields={texto:texto,responsavel:document.getElementById("nt-resp").value,dataInicio:document.getElementById("nt-di").value,dataFim:document.getElementById("nt-df").value,status:document.getElementById("nt-status").value};
    _mc2Close();
    if(isEdit)await updateTarefa(cardId,t.id,fields);
    else await addTarefa(cardId,fields.texto,fields.responsavel,fields.dataInicio,fields.dataFim,fields.status);
  };
  row.appendChild(btnSave);box.appendChild(row);ov.appendChild(box);mc.appendChild(ov);
  setTimeout(function(){inpTexto.focus();},50);
}
function openAddTarefa(cardId){_buildTarefaForm(cardId,null);}
function openEditTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var t=(card.tarefas||[]).find(function(x){return x.id===tarefaId;});if(!t)return;
  _buildTarefaForm(cardId,t);
}
function toggleTarefaEdit(tid){
  var ep=document.getElementById("tep-"+tid);var cv=document.getElementById("tcv-"+tid);
  var ch=document.getElementById("tch-"+tid);
  if(!ep)return;
  var open=ep.style.display==="flex";
  ep.style.display=open?"none":"flex";
  if(cv)cv.style.cursor=open?"pointer":"default";
  if(ch)ch.style.transform=open?"rotate(0deg)":"rotate(180deg)";
}
async function saveTarefaInline(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var texto=(document.getElementById("ti-txt-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe a descrição",true);return;}
  var fields={
    texto:texto,
    responsavel:document.getElementById("ti-resp-"+tarefaId).value,
    status:document.getElementById("ti-st-"+tarefaId).value,
    dataInicio:document.getElementById("ti-di-"+tarefaId).value,
    dataFim:document.getElementById("ti-df-"+tarefaId).value
  };
  card.tarefas=(card.tarefas||[]).map(function(t){return t.id===tarefaId?Object.assign({},t,fields):t;});
  try{await dbUpsert(card);toast("Salvo!");refreshTarefasPanel(cardId);}catch(e){toast("Erro",true);}
}
function buildTarefasHTML(card,ce){
  var tarefas=getTarefas(card);
  var today=new Date().toISOString().split("T")[0];
  var cid=card.id;
  var btnAddHtml=ce?"<button class=\"msbtn\" style=\"width:auto;padding:4px 10px;font-size:11px;\" onclick=\"openAddTarefa('"+cid+"')\">"+ic("plus")+" Adicionar</button>":"";
  var badge=tarefas.length?" <span style=\"background:#fff;border-radius:20px;padding:1px 7px;font-size:11px;font-weight:500;\">"+tarefas.length+"</span>":"";
  var html="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;\"><div style=\"font-size:11px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:5px;\">"+ic("check")+" Tarefas"+badge+"</div>"+btnAddHtml+"</div>";
  if(!tarefas.length){html+="<div style=\"font-size:12px;color:#94a3b8;font-style:italic;padding:6px 0;\">Nenhuma tarefa</div>";return html;}
  tarefas.forEach(function(t){
    var col=COLS.find(function(co){return co.id===t.status;})||{label:"?",dot:"#94a3b8",badgeBg:"#f1f5f9",badgeText:"#475569"};
    var atrasada=t.status!=="concluido"&&t.dataFim&&t.dataFim<today;
    var concluida=t.status==="concluido";
    var bLeft=atrasada?"#dc2626":concluida?"#22c55e":"transparent";
    var titleStyle="font-size:12px;font-weight:600;color:"+(concluida?"#94a3b8":"#172b4d")+";flex:1;"+(concluida?"text-decoration:line-through;":"");
    var dc=atrasada?"#dc2626":"#94a3b8";var fw=atrasada?"font-weight:700;":"";
    var dateStr="";
    if(t.dataInicio||t.dataFim){
      dateStr="<span style=\"font-size:10px;color:"+dc+";"+fw+"\">";
      if(t.dataInicio)dateStr+=t.dataInicio.split("-").reverse().join("/");
      if(t.dataInicio&&t.dataFim)dateStr+=" \u2192 ";
      if(t.dataFim)dateStr+=t.dataFim.split("-").reverse().join("/");
      dateStr+="</span>";
    }
    var chevron="<svg id=\"tch-"+t.id+"\" width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2.5\" stroke-linecap=\"round\" style=\"flex-shrink:0;transition:transform .2s;\"><polyline points=\"6 9 12 15 18 9\"/></svg>";

    // VIEW row - clicável
    html+="<div style=\"background:#fff;border-radius:8px;margin-bottom:7px;border-left:3px solid "+bLeft+";overflow:hidden;\">";
    html+="<div id=\"tcv-"+t.id+"\" style=\"padding:8px 10px;cursor:"+(ce?"pointer":"default")+";\" "+(ce?"onclick=\"toggleTarefaEdit('"+t.id+"')\"":"")+">";
    html+="<div style=\"display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px;\">";
    html+="<div style=\""+titleStyle+"\">"+t.texto+"</div>"+(ce?chevron:"")+"</div>";
    html+="<div style=\"display:flex;align-items:center;gap:5px;flex-wrap:wrap;\">";
    html+="<span style=\"display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:"+col.badgeBg+";color:"+col.badgeText+";\"><span style=\"width:6px;height:6px;border-radius:50%;background:"+col.dot+";flex-shrink:0;\"></span>"+col.label+"</span>";
    if(t.responsavel)html+="<span style=\"font-size:10px;font-weight:600;background:#f4f5f7;border-radius:4px;padding:2px 6px;color:#5e6c84;\">"+t.responsavel+"</span>";
    if(dateStr)html+=dateStr;
    html+="</div></div>";

    if(ce){
      // EDIT panel - inline expandível
      var sOpts=COLS.map(function(co){return "<option value=\""+co.id+"\""+(t.status===co.id?" selected":"")+">"+co.label+"</option>";}).join("");
      var rOpts="<option value=\"\">Sem responsável</option>"+responsaveis.map(function(r){return "<option value=\""+r+"\""+(t.responsavel===r?" selected":"")+">"+r+"</option>";}).join("");
      html+="<div id=\"tep-"+t.id+"\" style=\"display:none;flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid #f0f0f0;background:#fafafa;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Descrição</div>";
      html+="<input id=\"ti-txt-"+t.id+"\" value=\""+t.texto.replace(/"/g,'&quot;')+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;outline:none;\"/></div>";
      html+="<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Responsável</div><select id=\"ti-resp-"+t.id+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;\">"+rOpts+"</select></div>";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Status</div><select id=\"ti-st-"+t.id+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;\">"+sOpts+"</select></div>";
      html+="</div>";
      html+="<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Início</div><input type=\"date\" id=\"ti-di-"+t.id+"\" value=\""+(t.dataInicio||"")+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;\"/></div>";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Vencimento</div><input type=\"date\" id=\"ti-df-"+t.id+"\" value=\""+(t.dataFim||"")+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;\"/></div>";
      html+="</div>";
      html+="<div style=\"display:flex;justify-content:space-between;align-items:center;\">";
      html+="<button onclick=\"modalConfirm('Excluir esta tarefa?',function(){delTarefa('"+cid+"','"+t.id+"');})\" style=\"font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;cursor:pointer;\">Excluir</button>";
      html+="<button onclick=\"saveTarefaInline('"+cid+"','"+t.id+"')\" style=\"font-size:11px;font-weight:600;background:#253f4f;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;\">Salvar</button>";
      html+="</div></div>";
    }
    html+="</div>";
  });
  return html;
}

// ── COVER COLOR ──
function openCoverPicker(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var mc=_mc2();mc.innerHTML="";
  var ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="300";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,320px);";
  box.onclick=function(e){e.stopPropagation();};
  var hdr=document.createElement("div");hdr.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;";
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);";htitle.textContent="Cor do card";
  var hclose=document.createElement("button");hclose.style.cssText="background:none;border:none;cursor:pointer;color:var(--text3);";hclose.innerHTML=ic("close");hclose.onclick=_mc2Close;
  hdr.appendChild(htitle);hdr.appendChild(hclose);box.appendChild(hdr);
  var swRow=document.createElement("div");swRow.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;";
  COL_COLORS.forEach(function(cc){
    var sw=document.createElement("div");var sel=card.coverColor===cc.cover;
    sw.style.cssText="width:28px;height:28px;border-radius:50%;background:"+cc.cover+";cursor:pointer;border:2px solid "+(sel?"#253f4f":"transparent")+";transition:transform .12s;";
    sw.onmouseover=function(){this.style.transform="scale(1.2)";};sw.onmouseout=function(){this.style.transform="scale(1)";};
    sw.onclick=function(){_mc2Close();applyCoverColor(cardId,cc.cover);};
    swRow.appendChild(sw);
  });
  box.appendChild(swRow);
  var btnRem=document.createElement("button");btnRem.className="btn";btnRem.style.cssText="width:100%;font-size:12px;";btnRem.textContent="Remover cor personalizada";
  btnRem.onclick=function(){_mc2Close();applyCoverColor(cardId,null);};
  box.appendChild(btnRem);ov.appendChild(box);mc.appendChild(ov);
}
async function applyCoverColor(cardId,color){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.coverColor=color||null;
  var mcover=document.getElementById("mcover");if(mcover)mcover.style.background=coverColor(card);
  var faceCard=document.getElementById("card-"+cardId);
  if(faceCard){var fc=faceCard.querySelector(".card-cover");if(fc)fc.style.background=coverColor(card);}
  try{await dbUpsert(card);}catch(e){toast("Erro",true);}
}


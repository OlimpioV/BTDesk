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

// Etapa 2: o fluxo ativo de subtarefas dos cards voltou para este modulo, ainda
// usando o modelo antigo de tarefas embutidas no JSON do card. Os loaders da
// TABELA de tarefas permanecem para reunioes, projetos e caches auxiliares.
// Pendencia: reconciliar definitivamente JSON versus tabela.

function _snapshotSubtarefaModelo(){
  var m=subtarefaModeloDB||{nome:"Subtarefa padrão",campos:[]};
  return {nome:m.nome||"Subtarefa padrão",campos:JSON.parse(JSON.stringify(m.campos||[]))};
}
function _subtarefaCampos(t){
  if(t&&t.modelo_snapshot&&t.modelo_snapshot.campos)return t.modelo_snapshot.campos||[];
  return (subtarefaModeloDB&&subtarefaModeloDB.campos)||[];
}
function _subtarefaCampoId(tarefaId,campoId){
  return "sti-"+String(tarefaId).replace(/[^a-zA-Z0-9]/g,"_")+"-"+String(campoId).replace(/[^a-zA-Z0-9]/g,"_");
}
function _buildSubtarefaCamposPreview(t){
  var campos=_subtarefaCampos(t);
  if(!campos.length)return "";
  var vals=t.campos_valores||{};
  var html='<div class="tcols" style="margin:7px 0 0 0;">';
  campos.forEach(function(campo){
    html+='<div class="tcol"><div class="tcol-lbl">'+campo.label+'</div><div class="tcol-val">'+_tcolRenderVal(campo,vals[campo.id])+'</div></div>';
  });
  html+='</div>';
  return html;
}
function _buildSubtarefaCamposEdit(t){
  var campos=_subtarefaCampos(t);
  if(!campos.length)return "";
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;">';
  campos.forEach(function(campo){
    html+='<div><div style="font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">'+campo.label+'</div>'
      +_subtarefaCampoInput(t,campo)
      +'</div>';
  });
  html+='</div>';
  return html;
}
function _subtarefaCampoInput(t,campo){
  var val=(t.campos_valores||{})[campo.id];
  var id=_subtarefaCampoId(t.id,campo.id);
  if(campo.tipo==="texto")return '<input id="'+id+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"/>';
  if(campo.tipo==="numero")return '<input id="'+id+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"/>';
  if(campo.tipo==="texto_longo")return '<textarea id="'+id+'" rows="2" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;resize:vertical;">'+(val||'')+'</textarea>';
  if(campo.tipo==="data")return '<input id="'+id+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"/>';
  if(campo.tipo==="status")return '<select id="'+id+'" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"><option value="">Sem valor</option>'+(campo.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")+'</select>';
  if(campo.tipo==="responsavel")return '<select id="'+id+'" style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"><option value="">Sem responsável</option>'+(responsaveis||[]).map(function(r){return '<option value="'+r+'"'+(val===r?' selected':'')+'>'+r+'</option>';}).join("")+'</select>';
  if(campo.tipo==="checkbox")return '<input id="'+id+'" type="checkbox"'+(val?' checked':'')+' style="width:18px;height:18px;accent-color:var(--bt-navy);"/>';
  if(campo.tipo==="link")return '<input id="'+id+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;"/>';
  if(campo.tipo==="multi"){
    var sel=Array.isArray(val)?val:[];
    return '<div id="'+id+'" style="display:flex;flex-direction:column;gap:2px;">'+(campo.opcoes||[]).map(function(o){return '<label style="display:flex;gap:5px;align-items:center;font-size:12px;color:#172b4d;"><input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/> '+o.label+'</label>';}).join("")+'</div>';
  }
  return "";
}
function _subtarefaCamposColetar(tarefaId,campos,atual){
  var novo=Object.assign({},atual||{});
  campos.forEach(function(campo){
    var el=document.getElementById(_subtarefaCampoId(tarefaId,campo.id));if(!el)return;
    var val=null;
    if(campo.tipo==="checkbox")val=el.checked?true:null;
    else if(campo.tipo==="multi"){var sel=[];el.querySelectorAll("input[type=checkbox]").forEach(function(cb){if(cb.checked)sel.push(cb.value);});val=sel.length?sel:null;}
    else if(campo.tipo==="numero")val=el.value!==""?parseFloat(el.value):null;
    else val=(el.value||"").trim()||null;
    if(val===null||val===undefined||(Array.isArray(val)&&!val.length))delete novo[campo.id];
    else novo[campo.id]=val;
  });
  return novo;
}

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
  var stList=statusTarefaList(false);
  var t={id:uid(),texto:texto,responsavel:resp||"",dataInicio:di||"",dataFim:df||"",status:st||(stList[0]?stList[0].id:"pendente"),criado:new Date().toISOString(),modelo_snapshot:_snapshotSubtarefaModelo(),campos_valores:{}};
  t=normalizarStatusTarefa(t,t.status);
  card.tarefas=getTarefas(card);card.tarefas.push(t);
  await dbUpsert(card);toast("Subtarefa adicionada!");refreshTarefasPanel(cardId);
}
async function updateTarefa(cardId,tarefaId,fields){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).map(function(t){
    if(t.id!==tarefaId)return t;
    var next=Object.assign({},t,fields);
    return normalizarStatusTarefa(next,next.status);
  });
  await dbUpsert(card);refreshTarefasPanel(cardId);
}
async function delTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).filter(function(t){return t.id!==tarefaId;});
  await dbUpsert(card);toast("Subtarefa excluída!");refreshTarefasPanel(cardId);
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
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);";htitle.textContent=isEdit?"Editar subtarefa":"Nova subtarefa";
  var hclose=document.createElement("button");hclose.style.cssText="background:none;border:none;cursor:pointer;color:var(--text3);";hclose.innerHTML=ic("close");hclose.onclick=_mc2Close;
  hdr.appendChild(htitle);hdr.appendChild(hclose);box.appendChild(hdr);
  function mkField(lbl,inp){var f=document.createElement("div");f.className="field";var l=document.createElement("label");l.textContent=lbl;f.appendChild(l);f.appendChild(inp);return f;}
  var inpTexto=document.createElement("input");inpTexto.id="nt-texto";inpTexto.placeholder="Descreva a subtarefa...";if(t)inpTexto.value=t.texto||"";
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
  var sts=statusTarefaList(false);if(!sts.length)sts=COLS.map(function(c){return {id:c.id,nome:c.label};});
  sts.forEach(function(col){var o=document.createElement("option");o.value=col.id;o.textContent=col.nome||col.label||col.id;if(t&&t.status===col.id)o.selected=true;selSt.appendChild(o);});
  box.appendChild(mkField("Status",selSt));
  var row=document.createElement("div");row.style.cssText="display:flex;gap:8px;justify-content:flex-end;";
  if(isEdit){
    var btnDel=document.createElement("button");btnDel.className="btn btn-danger";btnDel.textContent="Excluir";
    btnDel.onclick=function(){_mc2Close();modalConfirm("Excluir esta subtarefa?",function(){delTarefa(cardId,t.id);});};
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
  var atual=(card.tarefas||[]).find(function(t){return t.id===tarefaId;})||null;
  var texto=(document.getElementById("ti-txt-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe a descrição",true);return;}
  var camposModelo=_subtarefaCampos(atual);
  var fields={
    texto:texto,
    responsavel:document.getElementById("ti-resp-"+tarefaId).value,
    status:document.getElementById("ti-st-"+tarefaId).value,
    dataInicio:document.getElementById("ti-di-"+tarefaId).value,
    dataFim:document.getElementById("ti-df-"+tarefaId).value,
    modelo_snapshot:(atual&&atual.modelo_snapshot)||_snapshotSubtarefaModelo(),
    campos_valores:_subtarefaCamposColetar(tarefaId,camposModelo,atual?atual.campos_valores:{})
  };
  card.tarefas=(card.tarefas||[]).map(function(t){
    if(t.id!==tarefaId)return t;
    var next=Object.assign({},t,fields);
    return normalizarStatusTarefa(next,next.status);
  });
  try{await dbUpsert(card);toast("Salvo!");refreshTarefasPanel(cardId);}catch(e){toast("Erro",true);}
}
function buildTarefasHTML(card,ce){
  var tarefas=getTarefas(card);
  var today=new Date().toISOString().split("T")[0];
  var cid=card.id;
  var btnAddHtml=ce?"<button class=\"msbtn\" style=\"width:auto;padding:4px 10px;font-size:11px;\" onclick=\"openAddTarefa('"+cid+"')\">"+ic("plus")+" Adicionar</button>":"";
  var badge=tarefas.length?" <span style=\"background:#fff;border-radius:20px;padding:1px 7px;font-size:11px;font-weight:500;\">"+tarefas.length+"</span>":"";
  var html="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;\"><div style=\"font-size:11px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:5px;\">"+ic("check")+" Subtarefas"+badge+"</div>"+btnAddHtml+"</div>";
  if(!tarefas.length){html+="<div style=\"font-size:12px;color:#94a3b8;font-style:italic;padding:6px 0;\">Nenhuma subtarefa</div>";return html;}
  tarefas.forEach(function(t){
    var col={label:statusTarefaLabel(t.status),dot:statusTarefaCor(t.status,"#94a3b8"),badgeBg:"#f1f5f9",badgeText:"#475569"};
    var concluida=statusTarefaFinalizador(t.status);
    var atrasada=!concluida&&t.dataFim&&t.dataFim<today;
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
    var concEm=statusTarefaConclusaoEm(t);
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
    if(concEm)html+="<span style=\"font-size:10px;color:#16a34a;font-weight:700;\">Concluida em "+statusTarefaFmtData(concEm)+"</span>";
    html+="</div></div>";
    html+=_buildSubtarefaCamposPreview(t);

    if(ce){
      // EDIT panel - inline expandível
      var sOpts=statusTarefaOptions(t.status,false);
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
      html+=_buildSubtarefaCamposEdit(t);
      html+="<div style=\"display:flex;justify-content:space-between;align-items:center;\">";
      html+="<button onclick=\"modalConfirm('Excluir esta subtarefa?',function(){delTarefa('"+cid+"','"+t.id+"');})\" style=\"font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;cursor:pointer;\">Excluir</button>";
      html+="<button onclick=\"saveTarefaInline('"+cid+"','"+t.id+"')\" style=\"font-size:11px;font-weight:600;background:#253f4f;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;\">Salvar</button>";
      html+="</div></div>";
    }
    html+="</div>";
  });
  return html;
}

// ── MODAL ──
// ── KANBAN ──

// Minhas tarefas e alertas
async function verificarAlertasPrazos(){
  if(!(perfil==="mestre"||perfil==="advogado"))return;
  var sigla=_mtUserSigla();if(!sigla)return;
  var hoje=new Date().toISOString().slice(0,10);
  var amanha=new Date(Date.now()+86400000).toISOString().slice(0,10);
  var existentes={};
  (notificacoesDB||[]).forEach(function(n){if(n&&n.mensagem)existentes[n.mensagem]=true;});
  var novas=[];
  function addAviso(tipo,texto,ctx,prazo){
    var prazoTxt=_mtFmtDate(prazo);
    var msg=(tipo==="atrasada"?"Tarefa atrasada: ":"Tarefa vence em breve: ")+trunc(texto||"Tarefa",70)+" ("+ctx+", prazo "+prazoTxt+")";
    if(!existentes[msg]){existentes[msg]=true;novas.push({usuario_id:userDbId,tipo:tipo==="atrasada"?"tarefa_atrasada":"tarefa_vencendo",mensagem:msg});}
  }
  getFiltered().forEach(function(card){
    (card.tarefas||[]).forEach(function(t){
      if(t.responsavel!==sigla||_mtIsDone(t)||!t.dataFim)return;
      if(t.dataFim<hoje)addAviso("atrasada",t.texto,card.titulo||"Demanda",t.dataFim);
      else if(t.dataFim===hoje||t.dataFim===amanha)addAviso("vencendo",t.texto,card.titulo||"Demanda",t.dataFim);
    });
  });
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    var reunioes=await dbFetchReunioes(eqId);
    var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
    var tarefas=await dbFetchTodasTarefas();
    tarefas.forEach(function(t){
      if(t.parent_id||!t.reuniao_id||t.responsavel!==sigla||_mtIsDone(t)||!t.data_fim)return;
      if(eqId&&t.equipe_id&&t.equipe_id!==eqId)return;
      var r=rMap[t.reuniao_id]||null;
      if(!r)return;
      var ctx=r.titulo||("Reuniao de "+_mtFmtDate(r.data));
      if(t.data_fim<hoje)addAviso("atrasada",t.texto,ctx,t.data_fim);
      else if(t.data_fim===hoje||t.data_fim===amanha)addAviso("vencendo",t.texto,ctx,t.data_fim);
    });
  }catch(_){}
  if(!novas.length)return;
  try{
    for(var i=0;i<novas.length;i++)await dbUpsertNotificacao(novas[i]);
    notificacoesDB=await dbFetchNotificacoes();
  }catch(_){}
}

// ── IMPORTAR ──
function _mtUserSigla(){
  var u=(usuariosFullDB||[]).find(function(x){return x.id===userDbId||x.email===emailUser;});
  return u&&u.sigla?u.sigla:"";
}
function _mtStatusLabel(status){
  return statusTarefaLabel(status);
}
function _mtFmtDate(d){
  if(!d)return "—";
  var p=String(d).split("-");
  return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:d;
}
function _mtIsDone(t){
  return statusTarefaFinalizador(t.status);
}
function _mtRow(t){
  var hoje=new Date().toISOString().slice(0,10);
  var late=t.prazo&&t.prazo<hoje&&!_mtIsDone(t);
  var done=_mtIsDone(t);
  var cor=late?"#dc2626":done?"#16a34a":"#2b76e5";
  return '<tr style="border-bottom:1px solid var(--border);">'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text3);white-space:nowrap;"><span style="font-weight:700;color:'+cor+';">'+t.origem+'</span></td>'
    +'<td style="padding:11px 14px;font-size:13px;font-weight:650;color:var(--bt-navy);">'+t.texto+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+t.contexto+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+_mtStatusLabel(t.status)+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:'+(late?"#dc2626":"var(--text2)")+';font-weight:'+(late?"700":"400")+';white-space:nowrap;">'+_mtFmtDate(t.prazo)+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(t.acao||"")+'</td>'
    +'</tr>';
}
async function _mtAbrirReuniao(id){
  await renderReunioes();
  selecionarReuniao(id);
}
async function _mtAbrirProjetos(projetoId){
  _projExpanded[projetoId]=true;
  await renderReunioes();
  if(!reuniaoAtiva&&reunioesDB&&reunioesDB.length)selecionarReuniao(reunioesDB[0].id);
}
function _notifTextoBase(msg){
  msg=msg||"";
  var m=msg.match(/^(?:Nova tarefa de reuniao para voce: |Tarefa atrasada: |Tarefa vence em breve: )(.+?) \(/);
  return m?m[1]:"";
}
async function abrirNotificacao(id){
  var n=(notificacoesDB||[]).find(function(x){return x.id===id;});
  if(!n)return;
  try{await dbMarcarNotificacaoLida(id);}catch(_){}
  notificacoesDB=(notificacoesDB||[]).map(function(x){return x.id===id?Object.assign({},x,{lida:true}):x;});
  var drop=document.getElementById("notif-dropdown");if(drop)drop.remove();
  var txt=_notifTextoBase(n.mensagem);
  if(txt){
    var cardMatch=null;
    getFiltered().some(function(card){
      var ok=(card.tarefas||[]).some(function(t){return (t.texto||"").indexOf(txt)>=0||txt.indexOf(t.texto||"")>=0;});
      if(ok){cardMatch=card;return true;}
      return false;
    });
    if(cardMatch){openCardModal(cardMatch.id);return;}
    try{
      var eqId=equipeAtiva?equipeAtiva.id:null;
      var reunioes=await dbFetchReunioes(eqId);
      var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
      var tarefas=await dbFetchTodasTarefas();
      var tm=tarefas.find(function(t){return t.reuniao_id&&((t.texto||"").indexOf(txt)>=0||txt.indexOf(t.texto||"")>=0);});
      if(tm&&rMap[tm.reuniao_id]){await _mtAbrirReuniao(tm.reuniao_id);return;}
    }catch(_){}
  }
  renderMinhasTarefas();
}
async function renderMinhasTarefas(){
  if(!(perfil==="mestre"||perfil==="advogado")){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("minhas-tarefas")+'<div style="padding:24px;max-width:1200px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  var sigla=_mtUserSigla();
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var itens=[];
  getFiltered().forEach(function(card){
    (card.tarefas||[]).forEach(function(t){
      if(sigla&&t.responsavel!==sigla)return;
      itens.push({origem:"Demanda",texto:t.texto||"Subtarefa sem descricao",contexto:card.titulo||"Demanda",status:t.status,prazo:t.dataFim,acao:'<button onclick="openCardModal(\''+card.id+'\')" class="rbtn rbtn-sm">Abrir</button>'});
    });
  });
  try{
    var reunioes=await dbFetchReunioes(eqId);
    var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
    var tarefas=await dbFetchTodasTarefas();
    tarefas.filter(function(t){return !t.parent_id&&t.reuniao_id&&(!sigla||t.responsavel===sigla)&&(!eqId||t.equipe_id===eqId);}).forEach(function(t){
      var r=rMap[t.reuniao_id]||null;
      if(!r&&t.reuniao_id)return;
      itens.push({origem:"Reuniao",texto:t.texto||"Tarefa sem titulo",contexto:r?(r.titulo||("Reuniao de "+_mtFmtDate(r.data))):"Sem reuniao",status:t.status,prazo:t.data_fim,acao:r?'<button onclick="_mtAbrirReuniao(\''+r.id+'\')" class="rbtn rbtn-sm">Abrir</button>':""});
    });
  }catch(_){}
  try{
    var projetos=await dbFetchProjetos(eqId);
    for(var pi=0;pi<projetos.length;pi++){
      var p=projetos[pi];
      if(p.arquivado)continue;
      var checklist=await dbFetchChecklist(p.id);
      checklist.filter(function(it){return it.responsavel_id===userDbId;}).forEach(function(it){
        itens.push({origem:"Projeto",texto:it.titulo||"Subtarefa sem titulo",contexto:p.titulo||"Projeto interno",status:it.status,prazo:null,acao:'<button onclick="_mtAbrirProjetos(\''+p.id+'\')" class="rbtn rbtn-sm">Abrir</button>'});
      });
    }
  }catch(_){}
  itens.sort(function(a,b){
    var ad=a.prazo||"9999-12-31",bd=b.prazo||"9999-12-31";
    if(_mtIsDone(a)&&!_mtIsDone(b))return 1;
    if(!_mtIsDone(a)&&_mtIsDone(b))return -1;
    return ad.localeCompare(bd);
  });
  var abertas=itens.filter(function(t){return !_mtIsDone(t);}).length;
  var hoje=new Date().toISOString().slice(0,10);
  var atrasadas=itens.filter(function(t){return t.prazo&&t.prazo<hoje&&!_mtIsDone(t);}).length;
  var origemSel=window._mtOrigem||"";
  var situacaoSel=window._mtSituacao||"";
  var filtrados=itens.filter(function(t){
    if(origemSel&&t.origem!==origemSel)return false;
    if(situacaoSel==="abertas"&&_mtIsDone(t))return false;
    if(situacaoSel==="atrasadas"&&!(t.prazo&&t.prazo<hoje&&!_mtIsDone(t)))return false;
    if(situacaoSel==="concluidas"&&!_mtIsDone(t))return false;
    return true;
  });
  var rows=filtrados.length?filtrados.map(_mtRow).join(""):'<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma tarefa neste filtro</td></tr>';
  app.innerHTML=headerHTML("minhas-tarefas")
    +'<div style="padding:24px;max-width:1200px;margin:0 auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:16px;flex-wrap:wrap;">'
    +'<div><div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Minhas tarefas</div><div style="font-size:12px;color:var(--text3);margin-top:3px;">Responsavel: '+(sigla||nomeUser||emailUser)+'</div></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
    +'<span style="font-size:12px;font-weight:700;color:#2b76e5;background:#eff6ff;border-radius:20px;padding:5px 10px;">Abertas: '+abertas+'</span>'
    +'<span style="font-size:12px;font-weight:700;color:#dc2626;background:#fef2f2;border-radius:20px;padding:5px 10px;">Atrasadas: '+atrasadas+'</span>'
    +'<span style="font-size:12px;font-weight:700;color:var(--text2);background:#f8fafc;border-radius:20px;padding:5px 10px;">Total: '+itens.length+'</span>'
    +'</div></div>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 12px;">'
    +'<span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Filtros</span>'
    +'<select onchange="window._mtOrigem=this.value;renderMinhasTarefas()" style="font-size:12px;"><option value="">Todas as origens</option><option value="Demanda"'+(origemSel==="Demanda"?' selected':'')+'>Demandas</option><option value="Reuniao"'+(origemSel==="Reuniao"?' selected':'')+'>Reunioes</option><option value="Projeto"'+(origemSel==="Projeto"?' selected':'')+'>Projetos</option></select>'
    +'<select onchange="window._mtSituacao=this.value;renderMinhasTarefas()" style="font-size:12px;"><option value="">Todas as situacoes</option><option value="abertas"'+(situacaoSel==="abertas"?' selected':'')+'>Abertas</option><option value="atrasadas"'+(situacaoSel==="atrasadas"?' selected':'')+'>Atrasadas</option><option value="concluidas"'+(situacaoSel==="concluidas"?' selected':'')+'>Concluidas</option></select>'
    +(origemSel||situacaoSel?'<button onclick="window._mtOrigem=\'\';window._mtSituacao=\'\';renderMinhasTarefas()" class="rbtn rbtn-sm">Limpar</button>':'')
    +'<span style="font-size:12px;color:var(--text3);margin-left:auto;">Mostrando '+filtrados.length+' de '+itens.length+'</span>'
    +'</div>'
    +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:860px;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Origem','Tarefa','Contexto','Status','Prazo','Acao'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'</div>';
}

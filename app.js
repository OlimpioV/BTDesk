function checkAuth(){var p=sessionStorage.getItem("bari_perfil"),n=sessionStorage.getItem("bari_nome"),e=sessionStorage.getItem("bari_email"),i=sessionStorage.getItem("bari_id");if(p){perfil=p;nomeUser=n;emailUser=e;userDbId=i;var ea=sessionStorage.getItem("bari_equipe");try{equipeAtiva=ea?JSON.parse(ea):null;}catch(_){equipeAtiva=null;}return true;}return false;}
function logout(){sessionStorage.clear();perfil=null;nomeUser=null;emailUser=null;userDbId=null;equipeAtiva=null;equipesDB=[];demandaEquipesDB={};renderLogin();}
async function doLogin(){
  var email=(document.getElementById("login-email").value||"").trim().toLowerCase();
  var senha=document.getElementById("login-senha").value;
  if(!email||!senha){renderLogin("Preencha e-mail e senha.");return;}
  try{
    var r=await fetch(SB+"/rest/v1/usuarios?email=eq."+encodeURIComponent(email)+"&senha=eq."+encodeURIComponent(senha)+"&ativo=eq.true&select=*",{headers:H});
    var rows=await r.json();
    if(!rows||!rows.length){renderLogin("E-mail ou senha incorretos.");return;}
    var u=rows[0];perfil=u.perfil;nomeUser=u.nome;emailUser=u.email;userDbId=u.id;
    sessionStorage.setItem("bari_perfil",u.perfil);sessionStorage.setItem("bari_nome",u.nome);sessionStorage.setItem("bari_email",u.email);sessionStorage.setItem("bari_id",u.id);
    dbLog("Login","Acesso ao sistema");init();
  }catch(e){renderLogin("Erro ao conectar.");}
}
function renderLogin(erro){
  var app=document.getElementById("app");app.className="login-mode";
  app.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:url(BTpapeldeparede.png) center/contain no-repeat,linear-gradient(135deg,#1a2e3a,#253f4f);position:relative;"><div style="position:fixed;inset:0;background:rgba(15,26,35,.55);backdrop-filter:blur(2px);z-index:0;"></div><div style="position:relative;z-index:1;width:min(400px,92vw);"><div style="background:rgba(255,255,255,.94);backdrop-filter:blur(20px);border-radius:20px;padding:40px 44px;box-shadow:0 20px 60px rgba(0,0,0,.3);"><div style="text-align:center;margin-bottom:30px;"><div style="font-family:var(--font-titulo);font-size:28px;font-weight:700;color:#1a2e3a;letter-spacing:.03em;">BTDesk</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:.06em;text-transform:uppercase;">Barcellos Tucunduva</div></div><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(250,81,14,.3),transparent);margin-bottom:26px;"></div><div class="field"><label>E-mail</label><input type="email" id="login-email" placeholder="seu@email.com.br" onkeydown="if(event.key===\'Enter\')document.getElementById(\'login-senha\').focus()" style="padding:11px 14px;"/></div><div class="field"><label>Senha</label><input type="password" id="login-senha" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')doLogin()" style="padding:11px 14px;"/></div>'+(erro?'<div style="font-size:13px;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;margin-bottom:14px;">'+erro+'</div>':"")+'<button onclick="doLogin()" style="width:100%;padding:12px;font-size:14px;font-weight:600;font-family:inherit;border-radius:10px;border:none;background:linear-gradient(135deg,#253f4f,#1a2e3a);color:#fff;cursor:pointer;">Entrar</button><p style="font-size:11px;color:#cbd5e1;text-align:center;margin-top:22px;">2026 © Barcellos Tucunduva</p></div></div></div>';
  setTimeout(function(){var el=document.getElementById("login-email");if(el)el.focus();},100);
}

// ── PERFIL ──
function openMyProfile(){
  var isMestre=perfil==="mestre";
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Meu perfil</div><button onclick="closeModal()" style="background:transparent;border:none;color:var(--text3);cursor:pointer;">'+ic('close')+'</button></div><div class="field"><label>Nome</label><input id="mp-nome" value="'+nomeUser+'"/></div><div class="field"><label>E-mail</label><input id="mp-email" type="email" value="'+emailUser+'"/></div><div class="field"><label>Nova senha</label><input id="mp-senha" type="password" placeholder="Deixe vazio para manter"/></div>'+(isMestre?'<div class="field"><label>Sigla</label><input id="mp-sigla" style="max-width:120px;text-transform:uppercase;"/></div>':"")+'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveMyProfile()">Salvar</button></div></div></div>';
  if(isMestre){fetch(SB+"/rest/v1/usuarios?id=eq."+userDbId+"&select=sigla",{headers:H}).then(function(r){return r.json();}).then(function(rows){var el=document.getElementById("mp-sigla");if(el&&rows[0])el.value=rows[0].sigla||"";});}
}
async function saveMyProfile(){
  var nome=(document.getElementById("mp-nome").value||"").trim();var email=(document.getElementById("mp-email").value||"").trim().toLowerCase();var senha=document.getElementById("mp-senha").value;var siglEl=document.getElementById("mp-sigla");var sigla=siglEl?(siglEl.value||"").trim().toUpperCase():undefined;
  if(!nome||!email){toast("Preencha nome e e-mail",true);return;}
  var u={id:userDbId,nome,email,perfil,ativo:true};if(senha)u.senha=senha;if(sigla!==undefined)u.sigla=sigla;
  try{await dbSaveUser(u);nomeUser=nome;emailUser=email;sessionStorage.setItem("bari_nome",nome);sessionStorage.setItem("bari_email",email);await loadResp();toast("Perfil atualizado!");closeModal();}catch(e){toast("Erro",true);}
}

// ── HELPERS ──
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

// ── FORM MODAL (nova demanda inline) ──
function openCardFormModal(){
  var card=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var v=card||{titulo:"",responsavel:"",email:"",dataInicio:new Date().toISOString().split("T")[0],dataFim:"",horas:"",obs:"",tipos:[],status:COLS[0]?COLS[0].id:"aberto",clienteNum:null,casoNum:null};
  var tBtns=TIPOS.map(function(t){var sel=formTipos.includes(t),c=TC[t];return '<button type="button" onclick="toggleTipo(\''+t+'\')" id="tipo-'+t+'" style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:4px;cursor:pointer;background:'+(sel?c.bg:'var(--surface)')+';border:'+(sel?'1.5px solid '+c.border:'1.5px solid var(--border)')+';color:'+(sel?c.text:'var(--text2)')+';transition:all .15s;">'+t+'</button>';}).join("");
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join("");
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(v.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var cliTextVal="";if(v.clienteNum){var cliObj=clientesDB.find(function(c){return c.numero===v.clienteNum;});cliTextVal=v.clienteNum+(cliObj&&cliObj.nome?" — "+cliObj.nome:"");}
  var casos=v.clienteNum?casosDoCliente(parseInt(v.clienteNum)):[];
  var casoFI=casos.length>0?'<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(v.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>':'<input id="f-caso" type="number" min="1" max="9999" value="'+(v.casoNum||"")+'" placeholder="Ex: 745"/>';
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" style="width:min(96vw,580px);padding:0;overflow:hidden;" onclick="event.stopPropagation()"><div style="background:linear-gradient(135deg,#1a2e3a,#253f4f);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;"><span style="color:#fff;font-weight:700;font-size:14px;">'+(editingId?"Editar demanda":"Nova demanda")+'</span><button onclick="closeModal()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);border-radius:7px;padding:4px 8px;cursor:pointer;">'+ic('close')+'</button></div><div style="padding:22px 26px;max-height:80vh;overflow-y:auto;"><div class="field"><label>Título *</label><input id="f-titulo" value="'+v.titulo+'" placeholder="Ex: Análise de contrato CRI"/></div><div class="field"><label>Cliente</label><div class="ac-wrap"><input id="f-cli-txt" autocomplete="off" value="'+cliTextVal+'" placeholder="Digite nome ou número..." oninput="fAcInput(this.value)" onkeydown="fAcKd(event)" onblur="setTimeout(fHideAc,220)"/><input type="hidden" id="f-cli" value="'+(v.clienteNum||"")+'"/><div id="f-ac-list" class="ac-list" style="display:none;"></div></div></div><div class="field"><label>Caso</label><div id="caso-wrap">'+casoFI+'</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="field"><div><label>Responsável</label><select id="f-resp" style="width:100%;"><option value="">Selecione...</option>'+rO+'</select></div><div><label>Status</label><select id="f-status" style="width:100%;">'+sO+'</select></div></div><div class="field"><label>E-mail da solicitação</label><input id="f-email" value="'+(v.email||"")+'" placeholder="Ex: Fwd: Assembleia Geral"/></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="field"><div><label>Início</label><input type="date" id="f-di" value="'+(v.dataInicio||"")+'"/></div><div><label>Encerramento</label><input type="date" id="f-df" value="'+(v.dataFim||"")+'"/></div><div><label>Horas</label><input type="number" id="f-horas" value="'+(v.horas||"")+'" placeholder="Ex: 2.5" step="0.5"/></div></div><div class="field"><label>Tipo(s)</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;">'+tBtns+'</div></div><div class="field"><label>Observações</label><textarea id="f-obs" rows="3" style="resize:vertical;line-height:1.6;">'+(v.obs||"")+'</textarea></div><div style="height:1px;background:var(--border);margin:16px 0;"></div><div style="display:flex;gap:9px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveCard()" style="display:flex;align-items:center;gap:5px;">'+ic('spark')+' Salvar demanda</button></div></div></div></div>';
  setTimeout(function(){var el=document.getElementById("f-titulo");if(el)el.focus();},50);
}

// ── FORM (nova/editar demanda) ──
function renderForm(){
  var app=document.getElementById("app");app.className="page-mode";
  var card=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var v=card||{titulo:"",responsavel:"",email:"",dataInicio:new Date().toISOString().split("T")[0],dataFim:"",horas:"",obs:"",tipos:[],status:COLS[0]?COLS[0].id:"aberto",clienteNum:null,casoNum:null};
  var tBtns=TIPOS.map(function(t){var sel=formTipos.includes(t),c=TC[t];return '<button type="button" onclick="toggleTipo(\''+t+'\')" id="tipo-'+t+'" style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:4px;cursor:pointer;background:'+(sel?c.bg:'var(--surface)')+';border:'+(sel?'1.5px solid '+c.border:'1.5px solid var(--border)')+';color:'+(sel?c.text:'var(--text2)')+';transition:all .15s;">'+t+'</button>';}).join("");
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join("");
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(v.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var cliTextVal="";if(v.clienteNum){var cliObj=clientesDB.find(function(c){return c.numero===v.clienteNum;});cliTextVal=v.clienteNum+(cliObj&&cliObj.nome?" — "+cliObj.nome:"");}
  var casos=v.clienteNum?casosDoCliente(parseInt(v.clienteNum)):[];
  var casoFI=casos.length>0?'<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(v.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>':'<input id="f-caso" type="number" min="1" max="9999" value="'+(v.casoNum||"")+'" placeholder="Ex: 745"/>';
  app.innerHTML='<div style="background:var(--surface);min-height:100vh;padding-bottom:40px;"><div style="background:linear-gradient(135deg,#1a2e3a,#253f4f);height:52px;padding:0 14px;display:flex;align-items:center;gap:14px;"><button onclick="renderView()" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);font-size:13px;font-weight:500;padding:5px 12px;border-radius:7px;font-family:inherit;">'+ic('back')+' Voltar</button><span style="color:rgba(255,255,255,.25);">/</span><span style="color:#fff;font-weight:600;font-size:14px;">'+(editingId?"Editar demanda":"Nova demanda")+'</span></div><div style="max-width:560px;margin:22px auto;padding:0 14px;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:24px 28px;box-shadow:var(--shadow-md);"><div class="field"><label>Título *</label><input id="f-titulo" value="'+v.titulo+'" placeholder="Ex: Análise de contrato CRI"/></div><div class="field"><label>Cliente</label><div class="ac-wrap"><input id="f-cli-txt" autocomplete="off" value="'+cliTextVal+'" placeholder="Digite nome ou número..." oninput="fAcInput(this.value)" onkeydown="fAcKd(event)" onblur="setTimeout(fHideAc,220)"/><input type="hidden" id="f-cli" value="'+(v.clienteNum||"")+'"/><div id="f-ac-list" class="ac-list" style="display:none;"></div></div></div><div class="field"><label>Caso</label><div id="caso-wrap">'+casoFI+'</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="field"><div><label>Responsável</label><select id="f-resp" style="width:100%;"><option value="">Selecione...</option>'+rO+'</select></div><div><label>Status</label><select id="f-status" style="width:100%;">'+sO+'</select></div></div><div class="field"><label>E-mail da solicitação</label><input id="f-email" value="'+(v.email||"")+'" placeholder="Ex: Fwd: Assembleia Geral"/></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="field"><div><label>Início</label><input type="date" id="f-di" value="'+(v.dataInicio||"")+'"/></div><div><label>Encerramento</label><input type="date" id="f-df" value="'+(v.dataFim||"")+'"/></div><div><label>Horas</label><input type="number" id="f-horas" value="'+(v.horas||"")+'" placeholder="Ex: 2.5" step="0.5"/></div></div><div class="field"><label>Tipo(s)</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;">'+tBtns+'</div></div><div class="field"><label>Observações</label><textarea id="f-obs" rows="3" style="resize:vertical;line-height:1.6;">'+(v.obs||"")+'</textarea></div><div style="height:1px;background:var(--border);margin:16px 0;"></div><div style="display:flex;gap:9px;justify-content:flex-end;"><button class="btn" onclick="renderView()">Cancelar</button><button class="btn btn-primary" onclick="saveCard()" style="display:flex;align-items:center;gap:5px;">'+ic('spark')+' Salvar demanda</button></div></div></div></div>';
}
var _fAcM=[],_fAcI=-1;
function fAcInput(val){_fAcM=buildAcList(val);_fAcI=-1;var list=document.getElementById("f-ac-list");if(!list)return;if(!_fAcM.length){list.style.display="none";return;}list.innerHTML=_fAcM.map(function(c,i){return '<div class="ac-item" id="fac-'+i+'" onmousedown="fAcSel('+c.numero+')" onmouseover="_fAcI='+i+';fAcHL()"><strong>'+c.numero+'</strong>'+(c.nome?' — '+trunc(c.nome,40):'')+'</div>';}).join("");list.style.display="block";updateFormCaso(null);}
function fAcHL(){document.querySelectorAll("[id^='fac-']").forEach(function(el,i){el.classList.toggle("active",i===_fAcI);});}
function fAcKd(e){if(e.key==="ArrowDown"){e.preventDefault();_fAcI=Math.min(_fAcI+1,_fAcM.length-1);fAcHL();}else if(e.key==="ArrowUp"){e.preventDefault();_fAcI=Math.max(_fAcI-1,0);fAcHL();}else if(e.key==="Enter"&&_fAcI>=0){e.preventDefault();if(_fAcM[_fAcI])fAcSel(_fAcM[_fAcI].numero);}else if(e.key==="Escape"){fHideAc();}}
function fHideAc(){var list=document.getElementById("f-ac-list");if(list)list.style.display="none";_fAcI=-1;}
function fAcSel(num){var c=clientesDB.find(function(x){return x.numero===num;});var inp=document.getElementById("f-cli-txt");var hid=document.getElementById("f-cli");if(inp)inp.value=num+(c&&c.nome?" — "+c.nome:"");if(hid)hid.value=num;fHideAc();updateFormCaso(num);}
function updateFormCaso(cliNum){var wrap=document.getElementById("caso-wrap");if(!wrap)return;var casos=cliNum?casosDoCliente(parseInt(cliNum)):[];if(casos.length>0){wrap.innerHTML='<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'">'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>';}else{wrap.innerHTML='<input id="f-caso" type="number" min="1" max="9999" value="" placeholder="Ex: 745"/>';}}
function toggleTipo(t){var idx=formTipos.indexOf(t);if(idx>=0)formTipos.splice(idx,1);else formTipos.push(t);var c=TC[t],sel=formTipos.includes(t),btn=document.getElementById("tipo-"+t);if(!btn)return;btn.style.background=sel?c.bg:"var(--surface)";btn.style.border=sel?"1.5px solid "+c.border:"1.5px solid var(--border)";btn.style.color=sel?c.text:"var(--text2)";}
function openNew(){editingId=null;formTipos=[];openCardFormModal();}
async function saveCard(){
  var titulo=(document.getElementById("f-titulo").value||"").trim();if(!titulo){toast("Informe o título",true);return;}
  var id=editingId||Date.now().toString();var existing=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var cliVal=document.getElementById("f-cli").value;var casoEl=document.getElementById("f-caso");var casoVal=casoEl?casoEl.value:"";
  var card={id,titulo,clienteNum:cliVal?parseInt(cliVal):null,casoNum:casoVal?parseInt(casoVal):null,responsavel:document.getElementById("f-resp").value,status:document.getElementById("f-status").value,email:document.getElementById("f-email").value,dataInicio:document.getElementById("f-di").value,dataFim:document.getElementById("f-df").value,horas:document.getElementById("f-horas").value,obs:document.getElementById("f-obs").value,tipos:formTipos.slice(),comentarios:existing?existing.comentarios||[]:[]};
  if(existing){card.modelo_snapshot=existing.modelo_snapshot||_snapshotDemandaModelo();card.campos_valores=existing.campos_valores||{};}
  else{card.modelo_snapshot=_snapshotDemandaModelo();card.campos_valores={};}
  if(existing)card.ordem=existing.ordem||0;else{var cc=cards.filter(function(c){return c.status===card.status;});card.ordem=cc.length;}
  try{await dbUpsert(card);await dbLog(editingId?"Editou demanda":"Criou demanda",titulo);if(!editingId&&equipeAtiva){await dbUpsertDemandaEquipe({demanda_id:id,equipe_id:equipeAtiva.id});if(!demandaEquipesDB[id])demandaEquipesDB[id]=[];if(!demandaEquipesDB[id].includes(equipeAtiva.id))demandaEquipesDB[id].push(equipeAtiva.id);}if(editingId){cards=cards.map(function(c){return c.id===editingId?card:c;});}else cards.push(card);toast("Salvo!");editingId=null;document.getElementById("modal-container").innerHTML="";renderView();}catch(e){toast("Erro",true);}
}

// ── INIT ──
async function ensureDemandaSnapshots(){
  var alterados=cards.filter(function(c){return c.id!=="__cols__"&&!c.modelo_snapshot;});
  if(!alterados.length)return;
  for(var i=0;i<alterados.length;i++){
    alterados[i].modelo_snapshot=_snapshotDemandaModelo();
    alterados[i].campos_valores=alterados[i].campos_valores||{};
    try{await dbUpsert(alterados[i]);}catch(_){}
  }
}
async function init(){
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;"><div style="width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;"><span style="font-size:17px;font-weight:800;color:#fff;">BT</span></div><div style="width:28px;height:3px;background:linear-gradient(90deg,#ff8204,#e20500);border-radius:2px;animation:pulse 1.5s ease-in-out infinite;"></div><style>@keyframes pulse{0%,100%{opacity:.4;transform:scaleX(.8)}50%{opacity:1;transform:scaleX(1)}}</style><div style="font-size:13px;color:rgba(255,255,255,.35);">Carregando BTDesk...</div></div>';
  try{await Promise.all([loadResp(),loadClientes(),loadCasos(),dbLoadCols(),loadEquipes(),loadTarefaStatus(),loadDemandaModelo(),loadSubtarefaModelo()]);cards=await dbFetch();cards=cards.filter(function(c){return c.id!=="__cols__";});await ensureDemandaSnapshots();await Promise.all([loadTodasTarefas(),loadDemandaEquipes(),loadNotificacoes()]);await verificarAlertasPrazos();}catch(e){toast("Erro ao carregar",true);}
  if(!equipeAtiva&&perfil==="advogado"&&equipesDB.length){equipeAtiva=equipesDB[0];sessionStorage.setItem("bari_equipe",JSON.stringify(equipeAtiva));}
  loadEtq();renderKanban();
}
if(checkAuth()){loadEtq();init();}else{renderLogin();}

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

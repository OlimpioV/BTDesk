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

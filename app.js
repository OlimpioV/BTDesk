// Wrapper unico sobre window.fetch: em 401 numa chamada ao Supabase, tenta um
// refresh de token e repete a chamada uma vez (opts._retried evita loop).
// Exclui /auth/v1/ do proprio GoTrue para nao recursar em refreshSession.
(function(){
  var _origFetch=window.fetch;
  window.fetch=function(url,opts){
    opts=opts||{};
    var isSb=typeof url==="string"&&url.indexOf(SB)===0&&url.indexOf("/auth/v1/")===-1;
    return _origFetch(url,opts).then(function(r){
      if(isSb&&r.status===401&&!opts._retried){
        opts._retried=true;
        return refreshSession().then(function(ok){return ok?_origFetch(url,opts):r;});
      }
      return r;
    });
  };
})();

var _refreshTimer=null;
function _startRefreshTimer(){
  if(_refreshTimer)clearInterval(_refreshTimer);
  _refreshTimer=setInterval(function(){
    var exp=parseInt(sessionStorage.getItem("bari_expires_at")||"0",10);
    if(exp&&Date.now()>exp-5*60*1000)refreshSession();
  },60000);
}
function setSession(tok){
  sessionStorage.setItem("bari_access_token",tok.access_token);
  sessionStorage.setItem("bari_refresh_token",tok.refresh_token);
  sessionStorage.setItem("bari_expires_at",String(Date.now()+tok.expires_in*1000));
  H.Authorization="Bearer "+tok.access_token;
  _startRefreshTimer();
}
function clearSession(){
  sessionStorage.removeItem("bari_access_token");
  sessionStorage.removeItem("bari_refresh_token");
  sessionStorage.removeItem("bari_expires_at");
  H.Authorization="Bearer "+SK;
  if(_refreshTimer){clearInterval(_refreshTimer);_refreshTimer=null;}
}
async function refreshSession(){
  var rt=sessionStorage.getItem("bari_refresh_token");
  if(!rt){clearSession();renderLogin();return false;}
  try{
    var r=await fetch(SB+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({refresh_token:rt})});
    var tok=await r.json();
    if(!r.ok||!tok.access_token){clearSession();renderLogin();return false;}
    setSession(tok);
    return true;
  }catch(e){clearSession();renderLogin();return false;}
}
async function checkAuth(){
  var p=sessionStorage.getItem("bari_perfil"),n=sessionStorage.getItem("bari_nome"),e=sessionStorage.getItem("bari_email"),i=sessionStorage.getItem("bari_id");
  var at=sessionStorage.getItem("bari_access_token");
  if(!p||!at)return false;
  perfil=p;nomeUser=n;emailUser=e;userDbId=i;
  var ea=sessionStorage.getItem("bari_equipe");
  try{equipeAtiva=ea?JSON.parse(ea):null;}catch(_){equipeAtiva=null;}
  H.Authorization="Bearer "+at;
  var exp=parseInt(sessionStorage.getItem("bari_expires_at")||"0",10);
  if(Date.now()>exp)return await refreshSession();
  _startRefreshTimer();
  return true;
}
async function logout(){
  var at=sessionStorage.getItem("bari_access_token");
  if(at){try{await fetch(SB+"/auth/v1/logout",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+at}});}catch(_){}}
  clearSession();
  sessionStorage.clear();perfil=null;nomeUser=null;emailUser=null;userDbId=null;equipeAtiva=null;equipesDB=[];demandaEquipesDB={};renderLogin();
}
async function doLogin(){
  var email=(document.getElementById("login-email").value||"").trim().toLowerCase();
  var senha=document.getElementById("login-senha").value;
  if(!email||!senha){renderLogin("Preencha e-mail e senha.");return;}
  try{
    var r=await fetch(SB+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({email:email,password:senha})});
    var tok=await r.json();
    if(!r.ok||!tok.access_token){renderLogin("E-mail ou senha incorretos.");return;}
    setSession(tok);
    var ur=await fetch(SB+"/rest/v1/usuarios?auth_id=eq."+encodeURIComponent(tok.user.id)+"&select=*",{headers:H});
    var rows=await ur.json();
    var u=rows&&rows[0];
    if(!u||u.ativo!==true){clearSession();renderLogin("Conta inativa ou não encontrada.");return;}
    perfil=u.perfil;nomeUser=u.nome;emailUser=u.email;userDbId=u.id;
    sessionStorage.setItem("bari_perfil",u.perfil);sessionStorage.setItem("bari_nome",u.nome);sessionStorage.setItem("bari_email",u.email);sessionStorage.setItem("bari_id",u.id);
    dbLog("Login","Acesso ao sistema");init();
  }catch(e){renderLogin("Erro ao conectar.");}
}
function _loginShell(inner){
  var app=document.getElementById("app");app.className="login-mode";
  app.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:url(BTpapeldeparede.png) center/contain no-repeat,linear-gradient(135deg,#1a2e3a,#253f4f);position:relative;"><div style="position:fixed;inset:0;background:rgba(15,26,35,.55);backdrop-filter:blur(2px);z-index:0;"></div><div style="position:relative;z-index:1;width:min(400px,92vw);"><div style="background:rgba(255,255,255,.94);backdrop-filter:blur(20px);border-radius:20px;padding:40px 44px;box-shadow:0 20px 60px rgba(0,0,0,.3);"><div style="text-align:center;margin-bottom:30px;"><div style="font-family:var(--font-titulo);font-size:28px;font-weight:700;color:#1a2e3a;letter-spacing:.03em;">BTDesk</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:.06em;text-transform:uppercase;">Barcellos Tucunduva</div></div><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(250,81,14,.3),transparent);margin-bottom:26px;"></div>'
    +inner+'<p style="font-size:11px;color:#cbd5e1;text-align:center;margin-top:22px;">2026 © Barcellos Tucunduva</p></div></div></div>';
}
function _loginMsg(erro,ok){
  if(erro)return '<div style="font-size:13px;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;margin-bottom:14px;">'+erro+'</div>';
  if(ok)return '<div style="font-size:13px;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 13px;margin-bottom:14px;">'+ok+'</div>';
  return "";
}
var _loginBtn='width:100%;padding:12px;font-size:14px;font-weight:600;font-family:inherit;border-radius:10px;border:none;background:linear-gradient(135deg,#253f4f,#1a2e3a);color:#fff;cursor:pointer;';
var _loginLink='display:block;margin:14px auto 0;border:none;background:none;font-size:13px;font-family:inherit;color:#64748b;text-decoration:underline;cursor:pointer;';
function renderLogin(erro,ok,emailPre){
  _loginShell('<div class="field"><label>E-mail</label><input type="email" id="login-email" placeholder="seu@email.com.br" value="'+escHTML(emailPre||"")+'" onkeydown="if(event.key===\'Enter\')document.getElementById(\'login-senha\').focus()" style="padding:11px 14px;"/></div>'
    +'<div class="field"><label>Senha</label><input type="password" id="login-senha" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')doLogin()" style="padding:11px 14px;"/></div>'
    +_loginMsg(erro,ok)
    +'<button onclick="doLogin()" style="'+_loginBtn+'">Entrar</button>'
    +'<button onclick="renderEsqueciSenha()" style="'+_loginLink+'">Esqueci minha senha</button>');
  setTimeout(function(){var el=document.getElementById(emailPre?"login-senha":"login-email");if(el)el.focus();},100);
}

// ── ESQUECI MINHA SENHA (Supabase Auth: /recover envia o link; o link volta com #type=recovery) ──
function renderEsqueciSenha(erro,ok){
  var em=(document.getElementById("login-email")||{}).value||"";
  _loginShell('<div style="font-size:16px;font-weight:700;color:#1a2e3a;margin-bottom:6px;">Esqueci minha senha</div>'
    +'<p style="font-size:13px;color:#64748b;margin-bottom:16px;">Informe seu e-mail. Se ele estiver cadastrado, você vai receber um link para criar uma senha nova.</p>'
    +'<div class="field"><label>E-mail</label><input type="email" id="rec-email" placeholder="seu@email.com.br" value="'+escHTML(em)+'" onkeydown="if(event.key===\'Enter\')enviarRecuperacaoSenha()" style="padding:11px 14px;"/></div>'
    +_loginMsg(erro,ok)
    +'<button id="rec-btn" onclick="enviarRecuperacaoSenha()" style="'+_loginBtn+'">Enviar link</button>'
    +'<button onclick="renderLogin()" style="'+_loginLink+'">Voltar ao login</button>');
  setTimeout(function(){var el=document.getElementById("rec-email");if(el)el.focus();},100);
}
async function enviarRecuperacaoSenha(){
  var email=((document.getElementById("rec-email")||{}).value||"").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){renderEsqueciSenha("Informe um e-mail válido.");return;}
  var btn=document.getElementById("rec-btn");if(btn){btn.disabled=true;btn.textContent="Enviando...";}
  var volta=location.origin+location.pathname;
  try{
    var r=await fetch(SB+"/auth/v1/recover?redirect_to="+encodeURIComponent(volta),{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({email:email})});
    if(r.status===429){renderEsqueciSenha("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");return;}
    // resposta igual para e-mail cadastrado ou nao, para nao revelar quem tem conta
    renderEsqueciSenha(null,"Pronto. Se <b>"+escHTML(email)+"</b> estiver cadastrado, o link chega em alguns minutos. Confira também a caixa de spam.");
  }catch(e){renderEsqueciSenha("Erro ao conectar. Tente novamente.");}
}
function renderNovaSenha(token,erro){
  _loginShell('<div style="font-size:16px;font-weight:700;color:#1a2e3a;margin-bottom:6px;">Definir nova senha</div>'
    +'<p style="font-size:13px;color:#64748b;margin-bottom:16px;">Escolha uma senha com pelo menos 8 caracteres.</p>'
    +'<div class="field"><label>Nova senha</label><input type="password" id="ns-senha" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')document.getElementById(\'ns-conf\').focus()" style="padding:11px 14px;"/></div>'
    +'<div class="field"><label>Confirme a nova senha</label><input type="password" id="ns-conf" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')salvarNovaSenha()" style="padding:11px 14px;"/></div>'
    +_loginMsg(erro)
    +'<button id="ns-btn" onclick="salvarNovaSenha()" style="'+_loginBtn+'">Salvar nova senha</button>'
    +'<button onclick="_recToken=null;renderLogin()" style="'+_loginLink+'">Cancelar</button>');
  _recToken=token;
  setTimeout(function(){var el=document.getElementById("ns-senha");if(el)el.focus();},100);
}
var _recToken=null;
async function salvarNovaSenha(){
  var s=(document.getElementById("ns-senha")||{}).value||"",c=(document.getElementById("ns-conf")||{}).value||"";
  if(s.length<8){renderNovaSenha(_recToken,"A senha precisa ter pelo menos 8 caracteres.");return;}
  if(s!==c){renderNovaSenha(_recToken,"As duas senhas não são iguais.");return;}
  var btn=document.getElementById("ns-btn");if(btn){btn.disabled=true;btn.textContent="Salvando...";}
  try{
    var r=await fetch(SB+"/auth/v1/user",{method:"PUT",headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+_recToken},body:JSON.stringify({password:s})});
    var j={};try{j=await r.json();}catch(_){}
    if(!r.ok){
      var cod=j.error_code||j.code||"";
      var msg=cod==="same_password"?"A senha nova precisa ser diferente da anterior.":(cod==="weak_password"?"Senha fraca. Use letras e números.":(r.status===401||r.status===403?"O link expirou. Peça um novo em \"Esqueci minha senha\".":"Não foi possível salvar a senha."));
      renderNovaSenha(_recToken,msg);return;
    }
    // encerra a sessao temporaria do link; a pessoa entra normalmente com a senha nova
    try{await fetch(SB+"/auth/v1/logout",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+_recToken}});}catch(_){}
    _recToken=null;
    renderLogin(null,"Senha alterada! Entre com a senha nova.",(j&&j.email)||"");
  }catch(e){renderNovaSenha(_recToken,"Erro ao conectar. Tente novamente.");}
}
// Le o retorno do link de recuperacao (#access_token=...&type=recovery ou #error=...) e limpa a URL
function _tratarRetornoRecuperacao(){
  var h=location.hash||"";if(h.length<2)return false;
  var p=new URLSearchParams(h.slice(1));
  if(p.get("type")==="recovery"&&p.get("access_token")){
    history.replaceState(null,"",location.pathname+location.search);
    renderNovaSenha(p.get("access_token"));return true;
  }
  if(p.get("error")||p.get("error_code")){
    history.replaceState(null,"",location.pathname+location.search);
    renderEsqueciSenha(p.get("error_code")==="otp_expired"?"Este link expirou ou já foi usado. Peça um novo abaixo.":"Não foi possível validar o link. Peça um novo abaixo.");
    return true;
  }
  return false;
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
// Congela a cor atual (derivada da coluna) como cor propria de cada card, uma
// unica vez. Depois disso a cor do card fica estatica e so muda pelo seletor.
async function ensureCardColors(){
  var alterados=cards.filter(function(c){return c.id!=="__cols__"&&!c.coverColor;});
  if(!alterados.length)return;
  for(var i=0;i<alterados.length;i++){
    var col=COLS.find(function(c){return c.id===alterados[i].status;});
    alterados[i].coverColor=(col&&col.cover)||"#e2e8f0";
    try{await dbUpsert(alterados[i]);}catch(_){}
  }
}
// ── TELA DE ABERTURA (#bt-abertura no index.html; estilos no fim de styles.css) ──
// A barra avanca pelas etapas reais do init(); a saida espera as barras da logo terminarem de entrar (~1,3s).
var _abHTML=(document.getElementById("bt-abertura")||{}).outerHTML||"",_abInicio=performance.now(),_abTimers=[];
function _abReduzido(){return window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;}
function _aberturaRespirar(){_abTimers.push(setTimeout(function(){var l=document.getElementById("ab-logo");if(l&&!l.classList.contains("sai"))l.classList.add("respira");},1350));}
function _aberturaGarantir(){
  if(document.getElementById("bt-abertura")||!_abHTML)return;
  document.body.insertAdjacentHTML("beforeend",_abHTML);_abInicio=performance.now();_aberturaRespirar();
}
function _aberturaEtapa(txt,pct){
  var i=document.getElementById("ab-i");if(i)i.style.width=pct+"%";
  var e=document.getElementById("ab-et");if(e&&txt)e.innerHTML="<span>"+txt+"</span>";
}
function _aberturaOi(){
  var el=document.getElementById("ab-oi");if(!el)return;
  var h=new Date().getHours(),n=String(nomeUser||"").trim().split(/\s+/)[0]||"";
  el.textContent=(h<12?"Bom dia":h<18?"Boa tarde":"Boa noite")+(n?", "+n:"");
}
function _aberturaFechar(entrarQuadro){
  var ab=document.getElementById("bt-abertura");if(!ab||ab.dataset.fechando)return;
  ab.dataset.fechando="1";
  var red=_abReduzido(),espera=red?0:Math.max(0,1300-(performance.now()-_abInicio));
  _abTimers.push(setTimeout(function(){
    ab.classList.add("saindo-logo");
    var l=document.getElementById("ab-logo");if(l){l.classList.remove("respira");l.classList.add("sai");}
    _abTimers.push(setTimeout(function(){
      ab.classList.add("saindo");
      var app=document.getElementById("app");
      if(entrarQuadro&&app&&!red){app.classList.add("ab-entrando");setTimeout(function(){app.classList.remove("ab-entrando");},650);}
      _abTimers.push(setTimeout(function(){_abTimers.forEach(clearTimeout);_abTimers=[];ab.remove();},520));
    },red?0:650));
  },espera));
}
_aberturaRespirar();

async function init(){
  var app=document.getElementById("app");app.className="kanban-mode";app.innerHTML="";
  _aberturaGarantir();_aberturaOi();_aberturaEtapa("Carregando demandas…",28);
  try{
    await Promise.all([loadResp(),loadClientes(),loadCasos(),dbLoadCols(),loadEtq(),loadEquipes(),loadTarefaStatus(),loadDemandaModelo(),loadSubtarefaModelo(),loadProjetoModelo()]);cards=await dbFetch();cards=cards.filter(function(c){return c.id!=="__cols__";});
    _aberturaEtapa("Carregando equipes e tarefas…",58);
    await ensureDemandaSnapshots();await ensureCardColors();await Promise.all([loadTodasTarefas(),loadDemandaEquipes(),loadNotificacoes()]);
    _aberturaEtapa("Organizando o quadro…",86);
    await migrarTarefasCardsParaTabela();await verificarAlertasPrazos();
  }catch(e){console.error("Falha ao carregar dados iniciais:",e);toast("Erro ao carregar os dados. Recarregue a pagina.",true);}
  if(!equipeAtiva&&perfil==="advogado"&&equipesDB.length){equipeAtiva=equipesDB[0];sessionStorage.setItem("bari_equipe",JSON.stringify(equipeAtiva));}
  renderKanban();
  _aberturaEtapa(null,100);_aberturaFechar(true);
  abrirCardDaUrl();
}
(async function(){
  if(_tratarRetornoRecuperacao()){_aberturaFechar(false);return;}
  if(await checkAuth()){init();}else{renderLogin();_aberturaFechar(false);}
})();

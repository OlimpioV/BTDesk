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
  if(!email||!senha){_loginErro("Preencha e-mail e senha.",email);return;}
  var btn=document.getElementById("lg-btn");if(btn)btn.classList.add("carregando");
  var lembrar=!!(document.getElementById("lg-lembrar")||{}).checked;
  try{
    var r=await fetch(SB+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({email:email,password:senha})});
    var tok=await r.json();
    if(!r.ok||!tok.access_token){_loginErro("E-mail ou senha incorretos.",email);return;}
    setSession(tok);
    var ur=await fetch(SB+"/rest/v1/usuarios?auth_id=eq."+encodeURIComponent(tok.user.id)+"&select=*",{headers:H});
    var rows=await ur.json();
    var u=rows&&rows[0];
    if(!u||u.ativo!==true){clearSession();_loginErro("Conta inativa ou não encontrada.",email);return;}
    perfil=u.perfil;nomeUser=u.nome;emailUser=u.email;userDbId=u.id;
    sessionStorage.setItem("bari_perfil",u.perfil);sessionStorage.setItem("bari_nome",u.nome);sessionStorage.setItem("bari_email",u.email);sessionStorage.setItem("bari_id",u.id);
    // "Lembrar meu e-mail": guarda so o e-mail neste navegador, nunca a senha
    try{if(lembrar)localStorage.setItem("bt_email_login",email);else localStorage.removeItem("bt_email_login");}catch(_){}
    dbLog("Login","Acesso ao sistema");
    _loginParaCarregamento();
  }catch(e){_loginErro("Erro ao conectar.",email);}
}
// Erro no login: mantem o e-mail digitado, mostra a mensagem e sacode o cartao
function _loginErro(msg,email){
  renderLogin(msg,null,email);
  var c=document.getElementById("lg-cartao");if(c){c.classList.remove("sacode");void c.offsetWidth;c.classList.add("sacode");}
  var s=document.getElementById("login-senha");if(s)setTimeout(function(){s.focus();},60);
}
// Login certo: o cartao recolhe e a logo volta do cartao para o centro, virando a tela de carregamento
function _loginParaCarregamento(){
  var alvo=document.getElementById("lg-alvo"),origem=alvo?alvo.getBoundingClientRect():null;
  var c=document.getElementById("lg-cartao");if(c){c.classList.remove("on","sacode");c.classList.add("recolhe");}
  if(alvo)alvo.style.visibility="hidden";
  setTimeout(function(){init(origem);},_abReduzido()?0:280);
}
function _lgLogoSVG(){
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="lgG" x1="12" y1="0" x2="84" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8204"/><stop offset="1" stop-color="#e20500"/></linearGradient></defs>'
    +'<path fill="url(#lgG)" d="M12.5 10h12.6c15.6 20.4 16.8 59.6 0 80H12.5c-1 0-1.4-.9-.8-1.6C29 69 29 31 11.7 11.6c-.6-.7-.2-1.6.8-1.6z"/>'
    +'<path fill="url(#lgG)" d="M43.4 10h11.3c10.6 23.8 10.6 56.2 0 80H43.4c-.9 0-1.3-.8-1-1.5C50.9 68 50.9 32 42.4 11.5c-.3-.7.1-1.5 1-1.5z"/>'
    +'<rect fill="url(#lgG)" x="71" y="10" width="11.5" height="80" rx="1.6"/></svg>';
}
var _LG_OLHO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
var _LG_OLHO_X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2M3 3l18 18"/></svg>';
// Monta o cartao uma vez; trocas entre login / esqueci / nova senha so substituem o miolo (a logo fica parada)
function _loginShell(inner){
  var app=document.getElementById("app");
  var v=document.getElementById("lg-vista");
  if(v&&app.className==="login-mode"&&document.getElementById("lg-cartao")){v.innerHTML='<div class="lg-vista-in">'+inner+'</div>';return;}
  app.className="login-mode";
  var comAbertura=!!document.getElementById("bt-abertura");
  app.innerHTML='<div class="lg-cena"><div class="lg-cartao" id="lg-cartao"><span class="lg-alvo" id="lg-alvo">'+(comAbertura?'':_lgLogoSVG())+'</span>'
    +'<div class="lg-marca"><b>BTDesk</b><small>Barcellos Tucunduva Advogados</small></div>'
    +'<div id="lg-vista"><div class="lg-vista-in">'+inner+'</div></div>'
    +'<div class="lg-rodape">© 2026 Barcellos Tucunduva</div></div></div>';
  // sem a abertura na tela (ex.: depois de sair), o cartao aparece sozinho; com ela, _aberturaParaLogin() o revela
  if(!comAbertura)requestAnimationFrame(function(){var c=document.getElementById("lg-cartao");if(c)c.classList.add("on");});
}
function _loginMsg(erro,ok){
  if(erro)return '<div class="lg-msg erro">'+erro+'</div>';
  if(ok)return '<div class="lg-msg ok">'+ok+'</div>';
  return "";
}
function _lgOlho(btn){
  var s=btn.parentNode.querySelector("input"),ver=s.type==="password";
  s.type=ver?"text":"password";btn.innerHTML=ver?_LG_OLHO_X:_LG_OLHO;btn.title=ver?"Esconder senha":"Mostrar senha";s.focus();
}
function _lgCaps(e){var c=document.getElementById("lg-caps");if(c&&e.getModifierState)c.classList.toggle("on",e.getModifierState("CapsLock"));}
function _lgSenhaHTML(id,label,auto,enter){
  return '<div class="lg-campo"><label for="'+id+'">'+label+'</label><div class="lg-cx"><input type="password" id="'+id+'" class="lg-com-olho" autocomplete="'+auto+'" placeholder="••••••••" onkeydown="_lgCaps(event);if(event.key===\'Enter\'){'+enter+'}" onkeyup="_lgCaps(event)"/>'
    +'<button type="button" class="lg-olho" title="Mostrar senha" onclick="_lgOlho(this)">'+_LG_OLHO+'</button></div></div>';
}
function renderLogin(erro,ok,emailPre){
  var salvo="";try{salvo=localStorage.getItem("bt_email_login")||"";}catch(_){}
  var em=emailPre||salvo;
  _loginShell('<div class="lg-campo"><label for="login-email">E-mail</label><div class="lg-cx"><input type="email" id="login-email" autocomplete="username" placeholder="seu@email.com.br" value="'+escHTML(em)+'" onkeydown="if(event.key===\'Enter\')document.getElementById(\'login-senha\').focus()"/></div></div>'
    +_lgSenhaHTML("login-senha","Senha","current-password","doLogin()")
    +'<div class="lg-caps" id="lg-caps">&#8682; Caps Lock está ligado</div>'
    +_loginMsg(erro,ok)
    +'<div class="lg-linha"><label class="lg-lembrar"><input type="checkbox" id="lg-lembrar"'+(salvo?' checked':'')+'/> Lembrar meu e-mail</label><button class="lg-link" onclick="renderEsqueciSenha()">Esqueci minha senha</button></div>'
    +'<button class="lg-entrar" id="lg-btn" onclick="doLogin()">Entrar</button>');
  setTimeout(function(){var el=document.getElementById(em?"login-senha":"login-email");if(el)el.focus();},100);
}

// ── ESQUECI MINHA SENHA (Supabase Auth: /recover envia o link; o link volta com #type=recovery) ──
function renderEsqueciSenha(erro,ok){
  var em=(document.getElementById("login-email")||{}).value||"";
  _loginShell('<h2>Esqueci minha senha</h2>'
    +'<p class="lg-exp">Informe seu e-mail. Se ele estiver cadastrado, você vai receber um link para criar uma senha nova.</p>'
    +'<div class="lg-campo"><label for="rec-email">E-mail</label><div class="lg-cx"><input type="email" id="rec-email" placeholder="seu@email.com.br" value="'+escHTML(em)+'" onkeydown="if(event.key===\'Enter\')enviarRecuperacaoSenha()"/></div></div>'
    +_loginMsg(erro,ok)
    +'<button class="lg-entrar" id="rec-btn" onclick="enviarRecuperacaoSenha()">Enviar link</button>'
    +'<button class="lg-link lg-voltar" onclick="renderLogin(null,null,(document.getElementById(\'rec-email\')||{}).value)">Voltar ao login</button>');
  setTimeout(function(){var el=document.getElementById("rec-email");if(el)el.focus();},100);
}
async function enviarRecuperacaoSenha(){
  var email=((document.getElementById("rec-email")||{}).value||"").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){renderEsqueciSenha("Informe um e-mail válido.");return;}
  var btn=document.getElementById("rec-btn");if(btn)btn.classList.add("carregando");
  var volta=location.origin+location.pathname;
  try{
    var r=await fetch(SB+"/auth/v1/recover?redirect_to="+encodeURIComponent(volta),{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({email:email})});
    if(r.status===429){renderEsqueciSenha("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");return;}
    // resposta igual para e-mail cadastrado ou nao, para nao revelar quem tem conta
    renderEsqueciSenha(null,"Pronto. Se <b>"+escHTML(email)+"</b> estiver cadastrado, o link chega em alguns minutos. Confira também a caixa de spam.");
  }catch(e){renderEsqueciSenha("Erro ao conectar. Tente novamente.");}
}
function renderNovaSenha(token,erro){
  _loginShell('<h2>Definir nova senha</h2>'
    +'<p class="lg-exp">Escolha uma senha com pelo menos 8 caracteres.</p>'
    +_lgSenhaHTML("ns-senha","Nova senha","new-password","document.getElementById('ns-conf').focus()")
    +_lgSenhaHTML("ns-conf","Confirme a nova senha","new-password","salvarNovaSenha()")
    +'<div class="lg-caps" id="lg-caps">&#8682; Caps Lock está ligado</div>'
    +_loginMsg(erro)
    +'<button class="lg-entrar" id="ns-btn" onclick="salvarNovaSenha()">Salvar nova senha</button>'
    +'<button class="lg-link lg-voltar" onclick="_recToken=null;renderLogin()">Cancelar</button>');
  _recToken=token;
  setTimeout(function(){var el=document.getElementById("ns-senha");if(el)el.focus();},100);
}
var _recToken=null;
async function salvarNovaSenha(){
  var s=(document.getElementById("ns-senha")||{}).value||"",c=(document.getElementById("ns-conf")||{}).value||"";
  if(s.length<8){renderNovaSenha(_recToken,"A senha precisa ter pelo menos 8 caracteres.");return;}
  if(s!==c){renderNovaSenha(_recToken,"As duas senhas não são iguais.");return;}
  var btn=document.getElementById("ns-btn");if(btn)btn.classList.add("carregando");
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
// Depois do login: recria a abertura; com "origem" (posicao da logo no cartao), a logo ja vem montada e volta ao centro
function _aberturaGarantir(origem){
  if(document.getElementById("bt-abertura")||!_abHTML)return;
  document.body.insertAdjacentHTML("beforeend",_abHTML);_abInicio=performance.now();_aberturaRespirar();
  var ab=document.getElementById("bt-abertura"),l=document.getElementById("ab-logo");
  if(!origem||!ab||!l||_abReduzido())return;
  ab.classList.add("ab-vindo");
  var r=l.getBoundingClientRect();
  l.style.transform="translate("+((origem.left+origem.width/2)-(r.left+r.width/2))+"px,"+((origem.top+origem.height/2)-(r.top+r.height/2))+"px) scale("+(origem.width/r.width)+")";
  void l.offsetWidth;
  l.style.transition="transform .75s cubic-bezier(.65,0,.25,1)";l.style.transform="none";
}
// Sem sessao: a logo da abertura voa ate o topo do cartao de login, o fundo da abertura some e o cartao aparece
function _aberturaParaLogin(){
  var ab=document.getElementById("bt-abertura"),c=document.getElementById("lg-cartao");
  if(!ab){if(c)c.classList.add("on");return;}
  if(ab.dataset.fechando)return;ab.dataset.fechando="1";
  var red=_abReduzido(),espera=red?0:Math.max(0,1300-(performance.now()-_abInicio));
  _abTimers.push(setTimeout(function(){
    var alvo=document.getElementById("lg-alvo"),l=document.getElementById("ab-logo");
    ab.classList.add("saindo-logo","ab-para-login");
    if(alvo&&l&&!red){
      var a=alvo.getBoundingClientRect(),r=l.getBoundingClientRect();
      l.classList.remove("respira");
      l.style.transition="transform .75s cubic-bezier(.65,0,.25,1)";
      l.style.transform="translate("+((a.left+a.width/2)-(r.left+r.width/2))+"px,"+((a.top+a.height/2)-(r.top+r.height/2))+"px) scale("+(a.width/r.width)+")";
    }
    _abTimers.push(setTimeout(function(){var cc=document.getElementById("lg-cartao");if(cc)cc.classList.add("on");},red?0:220));
    _abTimers.push(setTimeout(function(){
      var al=document.getElementById("lg-alvo");if(al&&!al.innerHTML)al.innerHTML=_lgLogoSVG();
      _abTimers.forEach(clearTimeout);_abTimers=[];ab.remove();
    },red?0:820));
  },espera));
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

// ── ROTAS (hash na URL: #/demandas, #/lista, #/minhas-tarefas, #/projetos, #/reunioes[/ID], #/admin/SECAO, #/card/ID) ──
// headerHTML() avisa a tela atual via _rotaMarcar; Voltar/Avancar do navegador chamam _rotaIr. Cartao abre/fecha com replaceState (nao suja o historico)
var _rotaInicialHash=location.hash,_rotaPronta=false,_rotaTela="#/demandas";
var _ROTAS_ABA={kanban:"demandas",lista:"lista","minhas-tarefas":"minhas-tarefas",projetos:"projetos",reunioes:"reunioes"};
function _rotaHash(aba){
  if(_ROTAS_ABA[aba])return "#/"+_ROTAS_ABA[aba];
  if(typeof _isAdminAba==="function"&&_isAdminAba(aba))return "#/admin/"+aba;
  return "";
}
function _rotaUrl(h){return location.pathname+location.search+h;}
function _rotaMarcar(aba){
  if(!_rotaPronta)return;
  var h=_rotaHash(aba);if(!h)return;
  if(document.querySelector("#modal-container .modal-trello"))return;
  if(aba==="reunioes"&&/^#\/reunioes(\/|$)/.test(location.hash)){_rotaTela=location.hash;return;}
  _rotaTela=h;
  if(location.hash!==h)history.pushState(null,"",_rotaUrl(h));
}
function _rotaCard(id){if(_rotaPronta)history.replaceState(null,"",_rotaUrl("#/card/"+id));}
function _rotaReuniao(id){if(_rotaPronta&&id){_rotaTela="#/reunioes/"+id;history.replaceState(null,"",_rotaUrl(_rotaTela));}}
function _rotaFecharCard(){if(/^#\/card\//.test(location.hash))history.replaceState(null,"",_rotaUrl(_rotaTela||"#/demandas"));}
function _rotaIr(h){
  if(!perfil||!/^#\//.test(h||""))return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var mc=document.getElementById("modal-container");if(mc)mc.innerHTML="";
  var partes=h.slice(2).split("/");
  var dest=partes[0],arg=decodeURIComponent(partes.slice(1).join("/"));
  if(dest==="card"){
    var card=cards.find(function(c){return c.id===arg;});
    if(!card){toast("Demanda não encontrada ou sem acesso",true);history.replaceState(null,"",_rotaUrl(_rotaTela));return;}
    if(card.arquivado)toast("Esta demanda está arquivada");
    if(!document.querySelector("#app.kanban-mode")){viewMode="kanban";renderKanban();}
    openCardModal(arg);return;
  }
  if(dest==="lista"){viewMode="lista";renderLista();}
  else if(dest==="minhas-tarefas"&&ce)renderMinhasTarefas();
  else if(dest==="projetos")renderProjetosEquipe();
  else if(dest==="reunioes"&&ce){if(arg)_mtAbrirReuniao(arg);else renderReunioes();}
  else if(dest==="admin"&&perfil==="mestre")renderAdministracao(arg||"usr");
  else{viewMode="kanban";renderKanban();}
}
function _rotaInicial(){
  var h=_rotaInicialHash;_rotaInicialHash="";
  var q=new URLSearchParams(location.search).get("card");
  if(q){h="#/card/"+q;history.replaceState(null,"",location.pathname+h);}
  _rotaPronta=true;_rotaTela="#/demandas";
  if(!/^#\//.test(h||"")){history.replaceState(null,"",_rotaUrl("#/demandas"));return;}
  _rotaIr(h);
}
window.addEventListener("popstate",function(){_rotaIr(location.hash);});
async function init(origem){
  var app=document.getElementById("app");app.className="kanban-mode";app.innerHTML="";
  _aberturaGarantir(origem);_aberturaOi();_aberturaEtapa("Carregando demandas…",28);
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
  _rotaInicial();
}
(async function(){
  if(_tratarRetornoRecuperacao()){_aberturaParaLogin();return;}
  if(await checkAuth()){init();}else{renderLogin();_aberturaParaLogin();}
})();

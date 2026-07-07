// ── REUNIOES ──
var _calMes=(new Date()).getMonth();
var _calAno=(new Date()).getFullYear();
var modelosDB=[];
var _projExpanded={};
var _checklistCache={};
var _commentsCache={};
var _projCommentsExpanded={};
var _tarefasPautaCache={};
var _subtarefasCache={};
var _tarefaExpandida={};
var _tarefaCmtsCache={};
var _tarefaCmtsExpanded={};
var _subCollapsed={};
var _anterioresAberto=false;
var _modelosAdminContext=false;
var _projCampoEditando={};
// Tipos de reuniao (Fase 0). Slug salvo na coluna reunioes.tipo; label/cor/icone
// definidos aqui. Vira configuravel pelo mestre no construtor (Fase 1).
var REUNIAO_TIPOS={
  acompanhamento:{label:'Reunião de equipe',cor:'#185FA5',ic:'users'},
  evento:{label:'Evento',cor:'#fa510e',ic:'spark'}
};
function _reunTipo(r){
  if(r&&r.modelo_snapshot){
    return {label:r.modelo_snapshot.nome||"Reuni\u00e3o",cor:r.modelo_snapshot.cor||"#185FA5",ic:r.modelo_snapshot.icone||"users"};
  }
  var m=r?_modeloPorTipo(r.tipo):null;
  if(m)return {label:m.nome||"Reuni\u00e3o",cor:m.cor||"#185FA5",ic:m.icone||"users"};
  return (r&&REUNIAO_TIPOS[r.tipo])||REUNIAO_TIPOS.acompanhamento;
}
function _modeloSlug(txt){
  return String(txt||"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}
function _modeloPorTipo(tipo){
  return (modelosDB||[]).find(function(m){return m.slug===tipo;})||(modelosDB||[]).find(function(m){return m.slug==="acompanhamento";})||null;
}
function _snapshotModelo(m){
  if(!m)return null;
  return snapshotModeloConfig(m,"Reunião",{
    id:m.id,
    cor:m.cor,
    icone:m.icone,
    slug:m.slug,
    colunas_tarefa:cloneEstrutura(m.colunas_tarefa||[])
  });
}
function _snapshotProjetoModelo(){
  var m=projetoModeloDB||{nome:"Projeto padrão",campos:[]};
  return snapshotModeloConfig(m,"Projeto padrão");
}
function _projetoCampos(p){
  if(p&&p.modelo_snapshot&&p.modelo_snapshot.campos)return p.modelo_snapshot.campos||[];
  return (projetoModeloDB&&projetoModeloDB.campos)||[];
}
function _projetoCampoVal(campo,val){
  return _tcolRenderVal(campo,val);
}
function toggleAnteriores(){
  _anterioresAberto=!_anterioresAberto;
  var el=document.getElementById("reun-anteriores");if(el)el.style.display=_anterioresAberto?'block':'none';
  var ch=document.getElementById("reun-anteriores-toggle");if(ch)ch.classList.toggle('aberto',_anterioresAberto);
}

async function renderReunioes(){
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("reunioes")+'<div style="padding:24px;max-width:1100px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    reunioesDB=await dbFetchReunioes(eqId);
    pautasDB=await dbFetchPautas(eqId);
    await loadProjetoModelo();
    projetosDB=await dbFetchProjetos(eqId);
    await ensureProjetoSnapshots();
    try{modelosDB=await dbFetchModelos();}catch(_){modelosDB=[];}
  }catch(e){toast("Erro ao carregar reunioes",true);}
  _renderReunioesPagina();
}

async function ensureProjetoSnapshots(){
  var snap=_snapshotProjetoModelo();
  for(var i=0;i<(projetosDB||[]).length;i++){
    var p=projetosDB[i];
    if(!p||p.arquivado)continue;
    var patch={id:p.id};
    var mudou=false;
    if(!p.modelo_snapshot){patch.modelo_snapshot=snap;mudou=true;}
    if(!p.campos_valores){patch.campos_valores={};mudou=true;}
    if(!mudou)continue;
    try{
      var salvo=await dbUpsertProjeto(patch);
      projetosDB[i]=Object.assign({},p,salvo||patch);
    }catch(_){}
  }
}

function _renderReunioesPagina(){
  var app=document.getElementById("app");
  var ce=perfil==="mestre"||perfil==="advogado";
  var hoje=new Date().toISOString().slice(0,10);
  var proximas=reunioesDB.filter(function(r){return r.data>=hoje;}).sort(function(a,b){return a.data.localeCompare(b.data);});
  var passadas=reunioesDB.filter(function(r){return r.data<hoje;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var statusCores={'agendada':'#3b82f6','realizada':'#22c55e','cancelada':'#ef4444'};
  var diasSem=['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  var mesesCurtos=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  // Reserva espaco para reunioes passadas recentes: sem isso, muitas futuras pre-criadas escondiam as passadas.
  var proximasMostrar=proximas.slice(0,15);
  var passadasMostrar=passadas.slice(0,Math.max(5,20-proximasMostrar.length));
  var _mkRcard=function(r){
    var ativa=reuniaoAtiva&&reuniaoAtiva.id===r.id;
    var p=r.data.split('-');
    var d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    var dataLabel=diasSem[d.getDay()]+', '+p[2]+' '+mesesCurtos[parseInt(p[1])-1];
    var sc=statusCores[r.status]||'#94a3b8';
    var stLbl=(r.status||'').charAt(0).toUpperCase()+(r.status||'').slice(1);
    return '<div onclick="selecionarReuniao(\''+r.id+'\')" class="reun-card'+(ativa?' ativa':'')+'">'
      +'<div class="reun-card-stripe" style="background:'+_reunTipo(r).cor+';"></div>'
      +'<div class="reun-card-titulo">'+trunc(r.titulo||('Reunião de '+dataLabel),34)+'</div>'
      +'<div class="reun-card-meta">'
      +'<span class="reun-card-data">'+dataLabel+' '+r.hora.slice(0,5)+'</span>'
      +'<span class="reun-status-chip flat" style="background:'+sc+'22;color:'+sc+';">'+stLbl+'</span>'
      +'</div>'
      +'</div>';
  };
  var listaSidebar='';
  if(proximasMostrar.length)listaSidebar+='<div class="reun-grp-lbl">Próximas · '+proximasMostrar.length+'</div>'+proximasMostrar.map(_mkRcard).join("");
  if(passadasMostrar.length){
    listaSidebar+='<div id="reun-anteriores-toggle" class="reun-grp-lbl reun-grp-toggle'+(_anterioresAberto?' aberto':'')+'" onclick="toggleAnteriores()">'+ic("chevdown")+' Anteriores · '+passadasMostrar.length+'</div>'
      +'<div id="reun-anteriores" style="display:'+(_anterioresAberto?'block':'none')+';">'+passadasMostrar.map(_mkRcard).join("")+'</div>';
  }
  var mainContent=reuniaoAtiva?_buildReuniaoDetalhe(reuniaoAtiva):_buildReuniaoPlaceholder();
  app.innerHTML=headerHTML("reunioes")
    +'<div class="reun-wrap">'
    +'<div id="reun-backdrop" class="reun-backdrop" onclick="toggleReunSidebar()"></div>'
    +'<div class="reun-sidebar" id="reun-sidebar">'
    +'<div class="reun-sidebar-hdr">'
    +'<span class="reun-sidebar-title">Reuniões</span>'
    +'<div style="display:flex;align-items:center;gap:5px;">'
    +(ce?'<button onclick="openNovaReuniao()" class="rbtn rbtn-accent rbtn-sm">'+ic("plus")+' Nova</button>':"")
    +'<button class="reun-mob-btn" onclick="toggleReunSidebar()" style="padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text3);cursor:pointer;font-size:16px;line-height:1;">&times;</button>'
    +'</div>'
    +'</div>'
    +'<div id="mini-cal-area"></div>'
    +'<div class="reun-sidebar-list">'+(listaSidebar||'<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma reuniao</div>')+'</div>'
    +'<div class="reun-sidebar-footer">'
    +'</div>'
    +'</div>'
    +'<div class="reun-main">'
    +'<div class="reun-mob-topbar">'
    +'<button onclick="toggleReunSidebar()" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--bt-navy);cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;">&#9776; Reuniões</button>'
    +(reuniaoAtiva?'<span style="font-size:12px;color:var(--text3);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+trunc(reuniaoAtiva.titulo||_fmtData(reuniaoAtiva.data),28)+'</span>':"")
    +'</div>'
    +mainContent
    +'</div>'
    +'</div>';
  _renderMiniCal();
}

function _fmtData(d){
  if(!d)return "";
  var p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0];
}

function _labelTipoPauta(tipo){
  return {'seminario':'Seminario','projeto':'Projetos','atualizacao_demandas':'Atualizacao de demandas','avisos_gerais':'Avisos gerais','livre':'Livre','demanda':'Demanda'}[tipo]||tipo||'Livre';
}

function _buildReuniaoPlaceholder(){
  return '<div class="reun-empty" style="height:100%;">'
    +'<div class="reun-empty-icon">'+ic("meeting")+'</div>'
    +'<div class="reun-empty-msg">Selecione ou crie uma reuniao</div>'
    +'</div>';
}

function _renderMiniCal(){
  var el=document.getElementById("mini-cal-area");if(!el)return;
  var hoje=new Date();
  var hojeD=hoje.getDate(),hojeM=hoje.getMonth(),hojeA=hoje.getFullYear();
  var hojeStr=String(hojeA)+'-'+(hojeM+1<10?'0':'')+(hojeM+1)+'-'+(hojeD<10?'0':'')+hojeD;
  var mesesNome=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var diasSem=['D','S','T','Q','Q','S','S'];
  var primeiroDia=new Date(_calAno,_calMes,1).getDay();
  var diasNoMes=new Date(_calAno,_calMes+1,0).getDate();
  var diasAnterior=new Date(_calAno,_calMes,0).getDate();
  var mesStr=String(_calAno)+'-'+((_calMes+1)<10?'0':'')+(_calMes+1);
  var datasComReuniao={};
  (reunioesDB||[]).forEach(function(r){
    if(!r||typeof r.data!=='string'||r.data.length<10)return;
    var key=r.data.slice(0,10);
    if(!datasComReuniao[key])datasComReuniao[key]=r;
  });
  var selStr=reuniaoAtiva&&reuniaoAtiva.data?String(reuniaoAtiva.data).slice(0,10):'';
  var html='<div class="mini-cal">'
    +'<div class="mini-cal-hdr">'
    +'<button class="mini-cal-nav" onclick="_navCalMes(-1)">&#8249;</button>'
    +'<div class="mini-cal-mes">'+mesesNome[_calMes]+' '+_calAno+'</div>'
    +'<button class="mini-cal-nav" onclick="_navCalMes(1)">&#8250;</button>'
    +'</div>'
    +'<div class="mini-cal-grid">';
  diasSem.forEach(function(d){html+='<div class="mini-cal-dow">'+d+'</div>';});
  for(var i=primeiroDia-1;i>=0;i--){html+='<div class="mini-cal-day outro-mes">'+(diasAnterior-i)+'</div>';}
  for(var d=1;d<=diasNoMes;d++){
    var ddStr=mesStr+'-'+(d<10?'0':'')+d;
    var cls='mini-cal-day';
    var isHoje=ddStr===hojeStr;
    var isSel=!!selStr&&ddStr===selStr;
    var r=datasComReuniao[ddStr]||null;
    if(isSel)cls+=' sel';else if(isHoje)cls+=' hoje';
    if(r){cls+=' tem-reun';html+='<div class="'+cls+'" style="--dot:'+_reunTipo(r).cor+';" onclick="selecionarReuniao(\''+r.id+'\')">'+d+'</div>';}
    else{html+='<div class="'+cls+'">'+d+'</div>';}
  }
  var total=primeiroDia+diasNoMes;
  var resto=total%7?7-(total%7):0;
  for(var d2=1;d2<=resto;d2++){html+='<div class="mini-cal-day outro-mes">'+d2+'</div>';}
  html+='</div></div><hr class="mini-cal-sep"/>';
  el.innerHTML=html;
}

function _navCalMes(delta){
  _calMes+=delta;
  if(_calMes<0){_calMes=11;_calAno--;}
  if(_calMes>11){_calMes=0;_calAno++;}
  _renderMiniCal();
}
function toggleReunSidebar(){
  var sb=document.getElementById("reun-sidebar");
  var bd=document.getElementById("reun-backdrop");
  if(!sb)return;
  var isOpen=sb.classList.contains("aberta");
  sb.classList.toggle("aberta",!isOpen);
  if(bd)bd.classList.toggle("visivel",!isOpen);
}

function _buildReuniaoDetalhe(r){
  var ce=perfil==="mestre"||perfil==="advogado";
  var tp=_reunTipo(r);
  var dataFmt=_fmtData(r.data);
  var statusCor={'agendada':'#2b76e5','realizada':'#00c875','cancelada':'#e2445c'}[r.status]||'#94a3b8';
  var statusLabel={'agendada':'Agendada','realizada':'Realizada','cancelada':'Cancelada'}[r.status]||r.status;
  var diasSemLong=['Domingo','Segunda-feira','Terca-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sabado'];
  var mesesLong=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var p=r.data.split('-');
  var dObj=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
  var dataLong=diasSemLong[dObj.getDay()]+', '+parseInt(p[2])+' de '+mesesLong[parseInt(p[1])-1]+' de '+p[0];
  var html='<div class="reun-detalhe">'
    +'<div class="reun-hero">'
    +'<div class="reun-hero-band" style="background:'+tp.cor+';"></div>'
    +'<div class="reun-hero-bd">'
    +'<div class="reun-hero-top">'
    +'<div style="min-width:0;flex:1;">'
    +'<div class="reun-hero-eye" style="color:'+tp.cor+';">'+ic(tp.ic)+' '+tp.label.toUpperCase()+'</div>'
    +'<div class="reun-hero-title">'+(r.titulo||('Reunião de '+dataFmt))+'</div>'
    +'<div class="reun-hero-meta">'
    +'<span class="reun-hmeta">'+ic("cal")+' '+dataLong+'</span>'
    +'<span class="reun-hmeta">'+ic("clock")+' '+r.hora.slice(0,5)+'</span>'
    +'<span class="reun-statuspill" style="background:'+statusCor+';">'+statusLabel+'</span>'
    +'</div>'
    +(r.observacoes?'<div class="reun-hero-obs">'+r.observacoes+'</div>':'')
    +'</div>'
    +(ce?'<div class="reun-hero-actions">'
      +'<button onclick="openEditReuniao(\''+r.id+'\')" class="reun-abtn">'+ic("edit")+' Editar</button>'
      +'<button onclick="openDuplicarReuniao(\''+r.id+'\')" class="reun-abtn">Duplicar</button>'
      +'<button onclick="gerarAta(\''+r.id+'\')" class="reun-abtn dark">Gerar ata</button>'
      +'</div>':"")
    +'</div>'
    +'<div class="reun-hero-foot">'
    +'<span class="reun-foot-lbl">Participantes</span>'
    +'<div id="reuniao-part-area" class="reun-parts-stack">Carregando...</div>'
    +(ce?'<button onclick="openGerenciarParticipantes(\''+r.id+'\')" class="rbtn rbtn-sm rbtn-ghost" style="margin-left:auto;">'+ic("users")+' Gerenciar</button>':"")
    +'</div>'
    +'</div></div>';
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(r.data&&r.data<hoje);
  if(_buildCamposGrid(r,ce,ehPassado)){
    html+='<div class="reun-section">'
      +'<div class="reun-sechdr"><div class="reun-sectitles"><span class="reun-sec-eye">Estrutura</span><span class="reun-sec-ttl">Informa\u00e7\u00f5es</span></div></div>'
      +'<div id="reun-campos-area">'+_buildCamposGrid(r,ce,ehPassado)+'</div>'
      +'</div>';
  }
  // Participantes agora ficam no rodape do hero (cabecalho da reuniao).
  html+='<div class="reun-section">'
    +'<div class="reun-sechdr">'
    +'<div class="reun-sectitles"><span class="reun-sec-eye">Acompanhamento</span><span class="reun-sec-ttl">Pendências anteriores</span></div>'
    +'</div>'
    +'<div id="reun-pendencias-area">Carregando...</div>'
    +'</div>';
  html+='<div class="reun-section">'
    +'<div class="reun-sechdr">'
    +'<div class="reun-sectitles"><span class="reun-sec-eye">O que será discutido</span><span class="reun-sec-ttl">Pautas</span></div>'
    +(ce?'<button onclick="openGerenciarPautas(\''+r.id+'\')" class="rbtn rbtn-sm rbtn-ghost">'+ic("plus")+' Gerenciar</button>':"")
    +'</div>'
    +'<div id="reun-pautas-area">Carregando...</div>'
    +'</div>';
  html+='<div class="reun-section">'
    +'<div class="reun-sechdr"><div class="reun-sectitles"><span class="reun-sec-eye">Discussão geral</span><span class="reun-sec-ttl">Comentários</span></div></div>'
    +'<div id="reun-cmts-area">Carregando...</div>'
    +'</div>';
  html+='</div>';
  setTimeout(function(){_loadParticipantesArea(r.id);_loadPendenciasAnteriores(r.id);_loadPautasSection(r.id);_loadReuniaoComentários(r.id);},0);
  return html;
}

// ── CAMPOS CUSTOMIZADOS DA REUNIAO ──
function _buildCamposGrid(r,ce,ehPassado){
  var campos=(r.modelo_snapshot&&r.modelo_snapshot.campos)||[];
  if(!campos.length)return '';
  var editavel=ce&&!ehPassado;
  return '<div class="rcampos">'+campos.map(function(c){return _renderCampoCelula(c,r,editavel,false);}).join("")+'</div>';
}

function _renderCampoCelula(campo,r,editavel,modoEdicao){
  var vals=r.campos_valores||{};
  var val=vals[campo.id];
  var html='<div class="rcampo'+(editavel?' editavel':'')+'">';
  html+='<div class="rcampo-lbl">'+campo.label+'</div>';
  html+='<div class="rcampo-val">';
  if(modoEdicao){
    html+=_renderCampoEditar(campo,r,val);
  } else {
    html+=_renderCampoVisualizacao(campo,val,editavel);
  }
  html+='</div></div>';
  return html;
}

function _renderCampoVisualizacao(campo,val,editavel){
  var tipo=campo.tipo;
  var onclick=editavel?' onclick="_campoAbrir(\''+campo.id+'\')"':'';
  if(tipo==='texto'||tipo==='numero'){
    return '<span style="'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'+(val!==undefined&&val!==null&&val!==''?String(val):'<span style="color:var(--text3);">—</span>')+'</span>';
  }
  if(tipo==='texto_longo'){
    return '<div style="white-space:pre-wrap;'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'+(val?val:'<span style="color:var(--text3);">—</span>')+'</div>';
  }
  if(tipo==='data'){
    var dfmt=val?_fmtData(val):'<span style="color:var(--text3);">—</span>';
    return '<span style="'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'+dfmt+'</span>';
  }
  if(tipo==='status'){
    var opcoes=campo.opcoes||[];
    var op=val?opcoes.find(function(o){return o.id===val;}):null;
    if(op){
      var cor=op.cor||'#94a3b8';
      return '<span class="reun-status-chip" style="background:'+cor+'22;color:'+cor+';'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'+op.label+'</span>';
    }
    return '<span class="reun-status-chip" style="background:#e8edf2;color:#94a3b8;'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>—</span>';
  }
  if(tipo==='responsavel'){
    if(val){
      var u=(usuariosFullDB||[]).find(function(x){return x.sigla===val;})||{};
      var cor=_avCor(u.id||val);
      return '<div style="display:inline-flex;align-items:center;gap:5px;'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'
        +'<span class="av av-sm" style="background:'+cor+';">'+val.slice(0,2).toUpperCase()+'</span>'
        +'<span>'+val+'</span>'
        +'</div>';
    }
    return '<span style="color:var(--text3);'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>—</span>';
  }
  if(tipo==='checkbox'){
    var chk=!!val;
    if(editavel){
      return '<input type="checkbox"'+(chk?' checked':'')+' onchange="_campoSalvarCheckbox(\''+campo.id+'\',this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--bt-navy);"/>';
    }
    return '<span style="font-size:16px;color:'+(chk?'#22c55e':'#94a3b8')+';">'+(chk?'✓':'—')+'</span>';
  }
  if(tipo==='link'){
    if(val){
      return '<div style="display:flex;align-items:center;gap:6px;">'
        +'<a href="'+val.replace(/"/g,'&quot;')+'" target="_blank" style="color:var(--bt-navy);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;" title="'+val.replace(/"/g,'&quot;')+'">'+trunc(val,30)+'</a>'
        +(editavel?'<button onclick="_campoAbrir(\''+campo.id+'\')" class="rbtn rbtn-sm" style="padding:2px 5px;flex-shrink:0;">'+ic("edit")+'</button>':'')
        +'</div>';
    }
    return '<span style="color:var(--text3);'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>—</span>';
  }
  if(tipo==='multi'){
    var opcoes=campo.opcoes||[];
    var selecionados=Array.isArray(val)?val:[];
    if(selecionados.length){
      var chips=opcoes.filter(function(o){return selecionados.indexOf(o.id)>=0;}).map(function(o){
        return '<span class="reun-status-chip" style="background:#e8edf2;color:var(--text2);margin:1px 2px;font-size:11px;">'+o.label+'</span>';
      }).join("");
      return '<div style="display:flex;flex-wrap:wrap;'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>'+chips+'</div>';
    }
    return '<span style="color:var(--text3);'+(editavel?'cursor:pointer;':'')+'"'+onclick+'>—</span>';
  }
  return '<span style="color:var(--text3);">—</span>';
}

function _renderCampoEditar(campo,r,val){
  var tipo=campo.tipo;
  var vid=campo.id.replace(/[^a-zA-Z0-9]/g,'_');
  if(tipo==='texto'){
    return '<input id="rcf-'+vid+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:13px;" onkeydown="_campokd(event,\''+campo.id+'\')" onblur="_campoSalvarBlur(\''+campo.id+'\')" autofocus/>';
  }
  if(tipo==='numero'){
    return '<input id="rcf-'+vid+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:13px;" onkeydown="_campokd(event,\''+campo.id+'\')" onblur="_campoSalvarBlur(\''+campo.id+'\')" autofocus/>';
  }
  if(tipo==='texto_longo'){
    return '<textarea id="rcf-'+vid+'" rows="3" style="width:100%;font-size:13px;resize:vertical;" autofocus>'+(val||'')+'</textarea>'
      +'<div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">'
      +'<button onclick="_campoFechar(\''+campo.id+'\')" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="_campoSalvarExplicito(\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Salvar</button>'
      +'</div>';
  }
  if(tipo==='data'){
    return '<input id="rcf-'+vid+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:13px;" onchange="_campoSalvarChange(\''+campo.id+'\')" onblur="_campoFechar(\''+campo.id+'\')" autofocus/>';
  }
  if(tipo==='status'){
    var opcoes=campo.opcoes||[];
    return '<select id="rcf-'+vid+'" onchange="_campoSalvarChange(\''+campo.id+'\')" style="width:100%;font-size:13px;" autofocus>'
      +'<option value="">Sem valor</option>'
      +opcoes.map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='responsavel'){
    var respOpts=(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>';}).join("");
    return '<select id="rcf-'+vid+'" onchange="_campoSalvarChange(\''+campo.id+'\')" style="width:100%;font-size:13px;" autofocus>'
      +'<option value="">Sem responsável</option>'+respOpts+'</select>';
  }
  if(tipo==='link'){
    return '<input id="rcf-'+vid+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:13px;" onkeydown="_campokd(event,\''+campo.id+'\')" onblur="_campoSalvarBlur(\''+campo.id+'\')" autofocus/>';
  }
  if(tipo==='multi'){
    var opcoes=campo.opcoes||[];
    var selecionados=Array.isArray(val)?val:[];
    var checks=opcoes.map(function(o){
      return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:4px 0;">'
        +'<input type="checkbox" value="'+o.id+'"'+(selecionados.indexOf(o.id)>=0?' checked':'')+'/>'
        +o.label
        +'</label>';
    }).join("");
    return '<div id="rcf-'+vid+'" style="display:flex;flex-direction:column;">'+checks+'</div>'
      +'<div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">'
      +'<button onclick="_campoFechar(\''+campo.id+'\')" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="_campoSalvarMulti(\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Aplicar</button>'
      +'</div>';
  }
  return '';
}

var _campoEditandoId=null;
var _campoEsc=false;

function _campoAbrir(campoId){
  _campoEditandoId=campoId;
  var r=reuniaoAtiva;if(!r)return;
  var campo=(r.modelo_snapshot&&r.modelo_snapshot.campos||[]).find(function(c){return c.id===campoId;});if(!campo)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(r.data&&r.data<hoje);
  var el=document.getElementById("reun-campos-area");if(!el)return;
  el.innerHTML='<div class="rcampos">'
    +(r.modelo_snapshot.campos||[]).map(function(c){
      var emEdicao=c.id===campoId;
      return _renderCampoCelula(c,r,ce&&!ehPassado,emEdicao);
    }).join("")
    +'</div>';
  // Foca no input/select
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  setTimeout(function(){var el2=document.getElementById("rcf-"+vid);if(el2)el2.focus();},30);
}

function _campoFechar(campoId){
  _campoEditandoId=null;
  var r=reuniaoAtiva;if(!r)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(r.data&&r.data<hoje);
  var el=document.getElementById("reun-campos-area");if(!el)return;
  el.innerHTML=_buildCamposGrid(r,ce,ehPassado);
}

function _campokd(evt,campoId){
  if(evt.key==='Enter'){evt.preventDefault();_campoEsc=true;_campoSalvarExplicito(campoId);}
  else if(evt.key==='Escape'){_campoEsc=true;_campoFechar(campoId);}
}

async function _campoSalvarBlur(campoId){
  if(_campoEsc){_campoEsc=false;return;}
  await _campoSalvarExplicito(campoId);
}

async function _campoSalvarExplicito(campoId){
  var r=reuniaoAtiva;if(!r)return;
  var campo=(r.modelo_snapshot&&r.modelo_snapshot.campos||[]).find(function(c){return c.id===campoId;});if(!campo)return;
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var el=document.getElementById("rcf-"+vid);if(!el)return;
  var tipo=campo.tipo;
  var val;
  if(tipo==='numero'){val=el.value!==''?parseFloat(el.value):null;}
  else if(tipo==='texto_longo'){val=(el.value||'').trim()||null;}
  else{val=(el.value||'').trim()||null;}
  await _campoSalvar(campoId,val);
}

async function _campoSalvarChange(campoId){
  var r=reuniaoAtiva;if(!r)return;
  var campo=(r.modelo_snapshot&&r.modelo_snapshot.campos||[]).find(function(c){return c.id===campoId;});if(!campo)return;
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var el=document.getElementById("rcf-"+vid);if(!el)return;
  var val=(el.value||'')||null;
  await _campoSalvar(campoId,val);
}

async function _campoSalvarCheckbox(campoId,checked){
  await _campoSalvar(campoId,checked);
}

async function _campoSalvarMulti(campoId){
  var r=reuniaoAtiva;if(!r)return;
  var campo=(r.modelo_snapshot&&r.modelo_snapshot.campos||[]).find(function(c){return c.id===campoId;});if(!campo)return;
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var container=document.getElementById("rcf-"+vid);if(!container)return;
  var checks=container.querySelectorAll("input[type=checkbox]");
  var selecionados=[];
  checks.forEach(function(cb){if(cb.checked)selecionados.push(cb.value);});
  await _campoSalvar(campoId,selecionados.length?selecionados:null);
}

async function _campoSalvar(campoId,valor){
  var r=reuniaoAtiva;if(!r){_campoFechar(campoId);return;}
  _campoEsc=false;
  var novo=Object.assign({},r.campos_valores||{});
  if(valor===null||valor===undefined||(Array.isArray(valor)&&valor.length===0)){delete novo[campoId];}
  else{novo[campoId]=valor;}
  try{
    await dbUpsertReuniao({id:r.id,campos_valores:novo});
    reuniaoAtiva.campos_valores=novo;
    reunioesDB=reunioesDB.map(function(x){return x.id===r.id?Object.assign({},x,{campos_valores:novo}):x;});
    toast("Salvo!");
  }catch(e){toast("Erro ao salvar",true);}
  _campoFechar(campoId);
}

function _renderPautaView(pauta,snap,ce,ehPassado){
  var tipo=pauta.tipo;
  var html='';
  if(tipo==='projeto'){
    html+=_buildProjetosSection(snap,ce,ehPassado);
  } else if(tipo==='seminario'){
    var tSem=snap.titulo_seminario||'';
    var rSem=snap.responsavel_nome||'';
    var oSem=snap.observacoes||'';
    if(!tSem&&!rSem&&!oSem){
      html+='<div class="pauta-empty">Sem registros para este seminario.</div>';
    } else {
      if(tSem)html+='<div class="pauta-kv"><b>Tema</b><span style="color:var(--bt-navy);font-weight:600;">'+tSem+'</span></div>';
      if(rSem)html+='<div class="pauta-kv"><b>Responsavel</b><span style="color:var(--text2);">'+rSem+'</span></div>';
      if(oSem)html+='<div class="notas" style="margin-top:8px;">'+oSem+'</div>';
    }
  } else if(tipo==='atualizacao_demandas'){
    var adNotas=snap.notas||'';
    var adDemandas=snap.demandas||[];
    if(!adNotas&&!adDemandas.length){
      html+='<div class="pauta-empty">Sem atualizacoes registradas.</div>';
    } else {
      adDemandas.forEach(function(d){
        var card=(cards||[]).find(function(c){return c.id===d.card_id;})||{};
        var titulo=card.titulo||d.titulo||d.card_id||"Demanda";
        var col=(typeof COLS!=='undefined'&&COLS?COLS.find(function(c){return c.id===card.status;}):null)||{dot:'#94a3b8'};
        html+='<div class="dem-row"><span class="dem-tick" style="background:'+(col.dot||'#94a3b8')+';"></span><span class="dem-t">'+trunc(titulo,52)+'</span>'+(d.obs?'<span class="dem-obs">'+d.obs+'</span>':'')+'</div>';
      });
      if(adNotas)html+='<div class="notas" style="margin-top:10px;">'+adNotas+'</div>';
    }
  } else {
    if(snap.notas)html+='<div class="notas">'+snap.notas+'</div>';
    else html+='<div class="pauta-empty">Sem notas para esta pauta nesta reuniao.</div>';
  }
  return html;
}

function _buildProjetosSection(snap,ce,ehPassado){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var projs=projetosDB.filter(function(p){return(!eqId||p.equipe_id===eqId)&&!p.arquivado;});
  var html='';
  if(!projs.length){html+='<div class="pauta-empty">Nenhum projeto de equipe.</div>';}
  else{
    projs.forEach(function(p){
      html+='<div id="proj-item-'+p.id+'">'+_buildProjetoCardHTML(p,!!_projExpanded[p.id],_checklistCache[p.id]||null,_commentsCache[p.id]||null,ce,ehPassado)+'</div>';
    });
  }
  if(ce&&!ehPassado)html+='<button onclick="openNovoProjeto()" class="rbtn rbtn-sm" style="margin-top:6px;">'+ic("plus")+' Novo projeto</button>';
  if(snap.notas)html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-soft);"><div class="cl-lbl">Notas da reuniao</div><div class="notas">'+snap.notas+'</div></div>';
  return html;
}
async function _refreshProjetosNaReuniao(){
  if(reuniaoAtiva)await _loadPautasSection(reuniaoAtiva.id);
  if(reuniaoAtiva&&document.getElementById("reun-projetos-area"))_loadProjetosArea(reuniaoAtiva.id);
}
function _buildProjetoCardHTML(p,expanded,checklist,comments,ce,ehPassado){
  var cor=statusTarefaCor(p.status||"em_andamento",'#94a3b8');
  var lbl=statusTarefaLabel(p.status||"em_andamento");
  var resp=(p.usuarios&&(p.usuarios.sigla||p.usuarios.nome))||"";
  var respNome=(p.usuarios&&p.usuarios.nome)||resp;
  var isPontual=p.tipo==='pontual';
  var ehP=!!ehPassado;
  var html='<div class="proj"><div class="proj-top"><div class="proj-bar" style="background:'+cor+';"></div><div class="proj-main">';
  html+='<div class="proj-row1"><span class="proj-t">'+p.titulo+'</span><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
  html+='<span class="reun-status-chip" style="background:'+cor+'1f;color:'+cor+';">'+lbl+'</span>';
  html+='<button onclick="_toggleProjeto(\''+p.id+'\','+ehP+')" class="rbtn rbtn-sm" style="padding:3px 7px;" title="'+(expanded?'Fechar':'Expandir')+'">'+(expanded?'&#9650;':'&#9660;')+'</button>';
  html+='</div></div>';
  if(resp)html+='<div class="proj-resp"><span class="av av-sm" style="background:'+_avCor((p.usuarios&&p.usuarios.id)||respNome)+';" title="'+resp+'">'+resp.slice(0,2).toUpperCase()+'</span><span class="nm">'+resp+'</span></div>';
  if(p.descricao)html+='<div class="proj-desc">'+p.descricao+'</div>';
  html+=_buildProjetoCamposGrid(p,ce&&!ehP);
  if(isPontual&&checklist&&checklist.length){
    html+=_buildChecklistBar(checklist);
    var done=checklist.filter(function(i){return statusTarefaFinalizador(i.status);}).length;
    html+='<div class="prog-info">'+done+' de '+checklist.length+' subtarefas concluídas</div>';
  }
  if(expanded){
    if(checklist!==null)html+=_buildChecklistUI(p.id,checklist||[],ce,ehP);
    else html+='<div class="pauta-empty" style="margin-top:10px;">Carregando...</div>';
    html+=_buildInlineComments(p.id,comments||[],ce,ehP,!!(_projCommentsExpanded&&_projCommentsExpanded[p.id]));
  }
  if(ce&&!ehP){
    html+='<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">';
    html+='<button onclick="_editProjetoInline(\''+p.id+'\','+ehP+')" class="rbtn rbtn-sm">'+ic("edit")+' Editar</button>';
    html+='<button onclick="openDuplicarProjeto(\''+p.id+'\')" class="rbtn rbtn-sm">Duplicar</button>';
    html+='<button onclick="arquivarProjeto(\''+p.id+'\')" class="rbtn rbtn-sm">Arquivar</button>';
    html+='</div>';
  }
  html+='</div></div></div>';
  return html;
}
function _buildProjetoCamposGrid(p,editavel){
  var campos=_projetoCampos(p);
  if(!campos.length)return "";
  var vals=p.campos_valores||{};
  var html='<div class="tcols" style="margin-top:10px;">';
  campos.forEach(function(campo){
    var editando=_projCampoEditando[p.id]===campo.id;
    html+='<div class="tcol'+(editavel?' editavel':'')+'"'+(editavel&&!editando?' onclick="_projCampoAbrir(\''+p.id+'\',\''+campo.id+'\')"':'')+'>'
      +'<div class="tcol-lbl">'+campo.label+'</div>'
      +'<div class="tcol-val">'+(editando?_projCampoEditor(campo,vals[campo.id],p.id):_projetoCampoVal(campo,vals[campo.id]))+'</div>'
      +'</div>';
  });
  html+='</div>';
  return html;
}
function _projCampoAbrir(projetoId,campoId){
  _projCampoEditando[projetoId]=campoId;
  _reloadProjetoCard(projetoId,false);
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  setTimeout(function(){var el=document.getElementById("pcf-"+vid);if(el)el.focus();},30);
}
function _projCampoFechar(projetoId){
  delete _projCampoEditando[projetoId];
  _reloadProjetoCard(projetoId,false);
}
function _projCampoEditor(campo,val,projetoId){
  var tipo=campo.tipo;
  var vid=campo.id.replace(/[^a-zA-Z0-9]/g,'_');
  if(tipo==='texto'){
    return '<input id="pcf-'+vid+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;" onkeydown="_projCampoKd(event,\''+projetoId+'\',\''+campo.id+'\')" onblur="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')"/>';
  }
  if(tipo==='numero'){
    return '<input id="pcf-'+vid+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;" onkeydown="_projCampoKd(event,\''+projetoId+'\',\''+campo.id+'\')" onblur="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')"/>';
  }
  if(tipo==='texto_longo'){
    return '<textarea id="pcf-'+vid+'" rows="3" style="width:100%;font-size:12px;resize:vertical;">'+(val||'')+'</textarea>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;"><button onclick="_projCampoFechar(\''+projetoId+'\')" class="rbtn rbtn-sm">Cancelar</button><button onclick="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Salvar</button></div>';
  }
  if(tipo==='data'){
    return '<input id="pcf-'+vid+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;" onchange="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')" onblur="_projCampoFechar(\''+projetoId+'\')"/>';
  }
  if(tipo==='status'){
    return '<select id="pcf-'+vid+'" onchange="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')" style="width:100%;font-size:12px;">'
      +'<option value="">Sem valor</option>'
      +(campo.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='responsavel'){
    return '<select id="pcf-'+vid+'" onchange="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')" style="width:100%;font-size:12px;">'
      +'<option value="">Sem responsavel</option>'
      +(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='checkbox'){
    return '<input id="pcf-'+vid+'" type="checkbox"'+(val?' checked':'')+' onchange="_projCampoPersistir(\''+projetoId+'\',\''+campo.id+'\',this.checked?true:null)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--bt-navy);"/>';
  }
  if(tipo==='link'){
    return '<input id="pcf-'+vid+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;" onkeydown="_projCampoKd(event,\''+projetoId+'\',\''+campo.id+'\')" onblur="_projCampoSalvar(\''+projetoId+'\',\''+campo.id+'\')"/>';
  }
  if(tipo==='multi'){
    var sel=Array.isArray(val)?val:[];
    var checks=(campo.opcoes||[]).map(function(o){
      return '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0;"><input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/> '+o.label+'</label>';
    }).join("");
    return '<div id="pcf-'+vid+'" style="display:flex;flex-direction:column;">'+checks+'</div>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;"><button onclick="_projCampoFechar(\''+projetoId+'\')" class="rbtn rbtn-sm">Cancelar</button><button onclick="_projCampoSalvarMulti(\''+projetoId+'\',\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Aplicar</button></div>';
  }
  return "";
}
function _projCampoKd(evt,projetoId,campoId){
  if(evt.key==="Enter"){evt.preventDefault();_projCampoSalvar(projetoId,campoId);}
  else if(evt.key==="Escape"){delete _projCampoEditando[projetoId];_reloadProjetoCard(projetoId,false);}
}
async function _projCampoSalvar(projetoId,campoId){
  var p=projetosDB.find(function(x){return x.id===projetoId;});if(!p)return;
  var campo=_projetoCampos(p).find(function(c){return c.id===campoId;});if(!campo)return;
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var el=document.getElementById("pcf-"+vid);if(!el)return;
  var val;
  if(campo.tipo==="numero")val=el.value!==""?parseFloat(el.value):null;
  else if(campo.tipo==="texto_longo")val=(el.value||"").trim()||null;
  else val=(el.value||"").trim()||null;
  await _projCampoPersistir(projetoId,campoId,val);
}
async function _projCampoSalvarMulti(projetoId,campoId){
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var container=document.getElementById("pcf-"+vid);if(!container)return;
  var sel=[];container.querySelectorAll("input[type=checkbox]").forEach(function(cb){if(cb.checked)sel.push(cb.value);});
  await _projCampoPersistir(projetoId,campoId,sel.length?sel:null);
}
async function _projCampoPersistir(projetoId,campoId,valor){
  var p=projetosDB.find(function(x){return x.id===projetoId;});if(!p)return;
  var novo=Object.assign({},p.campos_valores||{});
  if(valor===null||valor===undefined||(Array.isArray(valor)&&!valor.length))delete novo[campoId];
  else novo[campoId]=valor;
  try{
    await dbUpsertProjeto({id:projetoId,campos_valores:novo});
    p.campos_valores=novo;
    delete _projCampoEditando[projetoId];
    _reloadProjetoCard(projetoId,false);
    toast("Salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _snapshotSubtarefaProjetoModelo(){
  var m=subtarefaModeloDB||{nome:"Subtarefa padrão",campos:[]};
  return snapshotModeloConfig(m,"Subtarefa padrão");
}
function _checklistCampos(it){
  if(it&&it.modelo_snapshot&&it.modelo_snapshot.campos)return it.modelo_snapshot.campos||[];
  return (subtarefaModeloDB&&subtarefaModeloDB.campos)||[];
}
function _checkCampoId(itemId,campoId){
  return "clc-"+String(itemId).replace(/[^a-zA-Z0-9]/g,"_")+"-"+String(campoId).replace(/[^a-zA-Z0-9]/g,"_");
}
function _buildChecklistCamposPreview(it){
  var campos=_checklistCampos(it);
  if(!campos.length)return "";
  var vals=it.campos_valores||{};
  var html='<div class="tcols" style="margin:5px 0 8px 18px;">';
  campos.forEach(function(campo){
    html+='<div class="tcol"><div class="tcol-lbl">'+campo.label+'</div><div class="tcol-val">'+_tcolRenderVal(campo,vals[campo.id])+'</div></div>';
  });
  html+='</div>';
  return html;
}
function _buildChecklistCamposEdit(it){
  var campos=_checklistCampos(it);
  if(!campos.length)return "";
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;">';
  campos.forEach(function(campo){
    html+='<div><div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">'+campo.label+'</div>'+_checkCampoInput(it,campo)+'</div>';
  });
  html+='</div>';
  return html;
}
function _checkCampoInput(it,campo){
  var val=(it.campos_valores||{})[campo.id];
  var id=_checkCampoId(it.id,campo.id);
  if(campo.tipo==="texto")return '<input id="'+id+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;"/>';
  if(campo.tipo==="numero")return '<input id="'+id+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;"/>';
  if(campo.tipo==="texto_longo")return '<textarea id="'+id+'" rows="2" style="width:100%;font-size:12px;resize:vertical;">'+(val||'')+'</textarea>';
  if(campo.tipo==="data")return '<input id="'+id+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;"/>';
  if(campo.tipo==="status")return '<select id="'+id+'" style="width:100%;font-size:12px;"><option value="">Sem valor</option>'+(campo.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")+'</select>';
  if(campo.tipo==="responsavel")return '<select id="'+id+'" style="width:100%;font-size:12px;"><option value="">Sem responsável</option>'+(responsaveis||[]).map(function(r){return '<option value="'+r+'"'+(val===r?' selected':'')+'>'+r+'</option>';}).join("")+'</select>';
  if(campo.tipo==="checkbox")return '<input id="'+id+'" type="checkbox"'+(val?' checked':'')+' style="width:18px;height:18px;accent-color:var(--bt-navy);"/>';
  if(campo.tipo==="link")return '<input id="'+id+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;"/>';
  if(campo.tipo==="multi"){
    var sel=Array.isArray(val)?val:[];
    return '<div id="'+id+'" style="display:flex;flex-direction:column;gap:2px;">'+(campo.opcoes||[]).map(function(o){return '<label style="display:flex;gap:5px;align-items:center;font-size:12px;color:var(--text2);"><input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/> '+o.label+'</label>';}).join("")+'</div>';
  }
  return "";
}
function _checkCamposColetar(itemId,campos,atual){
  var novo=Object.assign({},atual||{});
  campos.forEach(function(campo){
    var el=document.getElementById(_checkCampoId(itemId,campo.id));if(!el)return;
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
function _buildChecklistBar(checklist){
  if(!checklist||!checklist.length)return '';
  return '<div class="prog">'+checklist.map(function(it){
    return '<div class="prog-seg" style="background:'+statusTarefaCor(it.status,'#e8edf2')+';"></div>';
  }).join("")+'</div>';
}
function _buildChecklistUI(projetoId,checklist,ce,ehPassado){
  var html='<div class="cl"><div class="cl-lbl">Subtarefas</div>';
  if(!checklist.length){html+='<div class="pauta-empty">Nenhuma subtarefa.</div>';}
  else{
    checklist.forEach(function(it){
      var cor=statusTarefaCor(it.status,'#94a3b8');
      var respIt=(it.usuarios&&(it.usuarios.sigla||it.usuarios.nome))||"";
      var concEm=statusTarefaConclusaoEm(it);
      html+='<div id="cl-item-'+it.id+'" class="cl-item">';
      html+='<span class="cl-dot" style="background:'+cor+';"></span>';
      html+='<span class="cl-t">'+it.titulo+'</span>';
      if(respIt)html+='<span class="cl-resp">'+respIt+'</span>';
      if(concEm)html+='<span class="cl-resp" style="background:#dcfce7;color:#15803d;">Concluida em '+statusTarefaFmtData(concEm)+'</span>';
      if(ce&&!ehPassado){
        html+='<button onclick="_editChecklistItemInline(\''+it.id+'\',\''+projetoId+'\','+ehPassado+')" class="rbtn rbtn-sm" style="padding:2px 6px;flex-shrink:0;">'+ic("edit")+'</button>';
        html+='<button onclick="delChecklistItem(\''+it.id+'\',\''+projetoId+'\','+ehPassado+')" class="rbtn rbtn-sm rbtn-danger" style="padding:2px 6px;flex-shrink:0;">'+ic("trash")+'</button>';
      }
      html+='</div>';
      html+=_buildChecklistCamposPreview(it);
    });
  }
  if(ce&&!ehPassado){
    html+='<div id="cl-add-'+projetoId+'" style="margin-top:8px;">';
    html+='<button onclick="_showAddChecklistItem(\''+projetoId+'\',false)" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar subtarefa</button>';
    html+='</div>';
  }
  html+='</div>';
  return html;
}
async function _toggleProjeto(projetoId,ehPassado){
  _projExpanded[projetoId]=!_projExpanded[projetoId];
  if(_projExpanded[projetoId]){
    try{_checklistCache[projetoId]=await dbFetchChecklist(projetoId);}catch(_){_checklistCache[projetoId]=[];}
    try{_commentsCache[projetoId]=await dbFetchProjetoComentarios(projetoId);}catch(_){_commentsCache[projetoId]=[];}
  }
  _reloadProjetoCard(projetoId,ehPassado);
}
async function arquivarProjeto(projetoId){
  modalConfirm("Arquivar este projeto? Ele nao aparecera mais na lista.",async function(){
    try{
      await dbUpsertProjeto({id:projetoId,arquivado:true});
      projetosDB=projetosDB.map(function(p){return p.id===projetoId?Object.assign({},p,{arquivado:true}):p;});
      var el=document.getElementById("proj-item-"+projetoId);
      if(el)el.remove();
      await _refreshProjetosNaReuniao();
      toast("Projeto arquivado!");
    }catch(e){toast("Erro ao arquivar",true);}
  });
}
function _reloadProjetoCard(projetoId,ehPassado){
  var el=document.getElementById("proj-item-"+projetoId);if(!el)return;
  var p=projetosDB.find(function(x){return x.id===projetoId;});if(!p)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  el.innerHTML=_buildProjetoCardHTML(p,!!_projExpanded[projetoId],_checklistCache[projetoId]||null,_commentsCache[projetoId]||null,ce,!!ehPassado);
}
// ── CHECKLIST ──
async function _showAddChecklistItem(projetoId,ehPassado){
  var el=document.getElementById("cl-add-"+projetoId);if(!el)return;
  var advs=[];
  try{var us=await dbFetchUsers();advs=us.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});}catch(_){}
  var respOpts=advs.map(function(u){return '<option value="'+u.id+'">'+(u.sigla||u.nome||"")+'</option>';}).join("");
  el.innerHTML='<div style="padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-top:4px;display:flex;flex-direction:column;gap:6px;">'
    +'<input id="cli-titulo-'+projetoId+'" placeholder="Titulo da subtarefa *" style="font-size:12px;"/>'
    +'<div style="display:flex;gap:6px;">'
    +'<select id="cli-resp-'+projetoId+'" style="flex:1;font-size:11px;"><option value="">Responsável...</option>'+respOpts+'</select>'
    +'<select id="cli-status-'+projetoId+'" style="flex:1;font-size:11px;">'+statusTarefaOptions("nao_iniciada",false)+'</select>'
    +'</div>'
    +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
    +'<button onclick="_cancelAddChecklistItem(\''+projetoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="_salvarAddChecklistItem(\''+projetoId+'\','+!!ehPassado+')" class="btn btn-primary" style="font-size:11px;">Adicionar</button>'
    +'</div></div>';
  var inp=document.getElementById("cli-titulo-"+projetoId);if(inp)inp.focus();
}
function _cancelAddChecklistItem(projetoId){
  var el=document.getElementById("cl-add-"+projetoId);if(!el)return;
  el.innerHTML='<button onclick="_showAddChecklistItem(\''+projetoId+'\',false)" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Adicionar subtarefa</button>';
}
async function _salvarAddChecklistItem(projetoId,ehPassado){
  var inp=document.getElementById("cli-titulo-"+projetoId);
  var titulo=(inp?inp.value||"":"").trim();
  if(!titulo){toast("Informe o titulo da subtarefa",true);return;}
  var respId=document.getElementById("cli-resp-"+projetoId).value||null;
  var status=document.getElementById("cli-status-"+projetoId).value||"nao_iniciada";
  var cl=_checklistCache[projetoId]||[];
  try{
    var novoItem=normalizarStatusTarefa({projeto_id:projetoId,titulo:titulo,status:status,responsavel_id:respId,ordem:cl.length,modelo_snapshot:_snapshotSubtarefaProjetoModelo(),campos_valores:{}},status);
    var criado=await dbUpsertChecklistItem(novoItem);
    if(!_checklistCache[projetoId])_checklistCache[projetoId]=[];
    if(criado)_checklistCache[projetoId].push(criado);
    _reloadProjetoCard(projetoId,ehPassado);toast("Subtarefa adicionada!");
  }catch(e){toast("Erro ao adicionar subtarefa",true);}
}
async function _editChecklistItemInline(itemId,projetoId,ehPassado){
  var el=document.getElementById("cl-item-"+itemId);if(!el)return;
  var cl=_checklistCache[projetoId]||[];
  var it=cl.find(function(x){return x.id===itemId;});if(!it)return;
  var advs=[];
  try{var us=await dbFetchUsers();advs=us.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});}catch(_){}
  var respOpts=advs.map(function(u){return '<option value="'+u.id+'"'+(it.responsavel_id===u.id?' selected':'')+'>'+((u.sigla||"")||(u.nome||""))+'</option>';}).join("");
  el.innerHTML='<div style="display:flex;flex-direction:column;gap:4px;width:100%;padding:4px 0;">'
    +'<input id="cli-edit-t-'+itemId+'" value="'+it.titulo+'" style="font-size:12px;width:100%;"/>'
    +'<div style="display:flex;gap:6px;">'
    +'<select id="cli-edit-r-'+itemId+'" style="flex:1;font-size:11px;"><option value="">Responsável...</option>'+respOpts+'</select>'
    +'<select id="cli-edit-s-'+itemId+'" style="flex:1;font-size:11px;">'+statusTarefaOptions(it.status||"nao_iniciada",false)+'</select>'
    +'</div>'
    +_buildChecklistCamposEdit(it)
    +'<div style="display:flex;gap:4px;justify-content:flex-end;">'
    +'<button onclick="_reloadProjetoCard(\''+projetoId+'\','+!!ehPassado+')" style="font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="_saveChecklistItemInline(\''+itemId+'\',\''+projetoId+'\','+!!ehPassado+')" class="btn btn-primary" style="font-size:10px;padding:2px 8px;">Salvar</button>'
    +'</div></div>';
}
async function _saveChecklistItemInline(itemId,projetoId,ehPassado){
  var titulo=(document.getElementById("cli-edit-t-"+itemId).value||"").trim();
  if(!titulo){toast("Informe o titulo",true);return;}
  var respId=document.getElementById("cli-edit-r-"+itemId).value||null;
  var status=document.getElementById("cli-edit-s-"+itemId).value||"pendente";
  try{
    var it=(_checklistCache[projetoId]||[]).find(function(x){return x.id===itemId;})||{};
    var campos=_checklistCampos(it);
    var atualValores=it.campos_valores||{};
    var modelo=(it&&it.modelo_snapshot)||_snapshotSubtarefaProjetoModelo();
    var valores=_checkCamposColetar(itemId,campos,atualValores);
    var patch=normalizarStatusTarefa({id:itemId,titulo:titulo,responsavel_id:respId,status:status,modelo_snapshot:modelo,campos_valores:valores},status);
    var atualizado=await dbUpsertChecklistItem(patch);
    var cl=_checklistCache[projetoId]||[];
    _checklistCache[projetoId]=cl.map(function(x){return x.id===itemId?Object.assign({},x,atualizado||patch):x;});
    _reloadProjetoCard(projetoId,ehPassado);toast("Subtarefa atualizada!");
  }catch(e){toast("Erro",true);}
}
async function delChecklistItem(itemId,projetoId,ehPassado){
  modalConfirm("Excluir esta subtarefa?",async function(){
    try{
      await dbDelChecklistItem(itemId);
      if(_checklistCache[projetoId])_checklistCache[projetoId]=_checklistCache[projetoId].filter(function(x){return x.id!==itemId;});
      _reloadProjetoCard(projetoId,ehPassado);toast("Subtarefa excluida!");
    }catch(e){toast("Erro",true);}
  });
}

function _buildInlineComments(projetoId,comments,ce,ehPassado,expanded){
  var toShow=expanded?[].concat(comments).reverse():([].concat(comments).reverse()).slice(0,3);
  var hasMore=comments.length>3;
  var html='<div class="cmts">';
  html+='<div class="cl-lbl">Comentários</div>';
  if(!toShow.length){html+='<div class="pauta-empty" style="margin-bottom:6px;">Nenhum comentário.</div>';}
  else{
    html+='<div style="max-height:260px;overflow-y:auto;">';
    toShow.forEach(function(c){
      var u=c.usuarios||{};
      var isSinal=c.tipo==='sinalizado';
      var corAv=_avCor(u.id||u.nome||"?");
      var ini=(u.sigla||u.nome||"?").slice(0,2).toUpperCase();
      var dt=new Date(c.criado_em);
      var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      html+='<div class="cmt'+(isSinal?' sinal':'')+'">';
      html+='<span class="av av-sm" style="background:'+corAv+';" title="'+(u.nome||u.sigla||"")+'">'+ini+'</span>';
      html+='<div class="cmt-body">';
      html+='<div class="cmt-head">';
      html+='<span class="cmt-nm">'+(u.sigla||u.nome||"?")+(isSinal?'<span class="cmt-flag">SINAL</span>':'')+'</span>';
      html+='<span class="cmt-dt">'+dtStr+'</span>';
      html+='</div>';
      html+='<div class="cmt-tx">'+c.texto+'</div>';
      html+='</div></div>';
    });
    html+='</div>';
    if(hasMore&&!expanded){
      html+='<button onclick="_toggleProjetoComments(\''+projetoId+'\',true)" style="font-size:11px;color:var(--bt-navy);background:none;border:none;cursor:pointer;padding:4px 0;text-decoration:underline;">Ver todos ('+comments.length+')</button>';
    } else if(expanded&&comments.length>3){
      html+='<button onclick="_toggleProjetoComments(\''+projetoId+'\',false)" style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;padding:4px 0;text-decoration:underline;">Mostrar menos</button>';
    }
  }
  if(ce&&!ehPassado){
    var meIni=((nomeUser||"?").slice(0,2).toUpperCase());
    html+='<div class="cmt-box">';
    html+='<span class="av av-sm" style="background:'+_avCor(userDbId||"")+';">'+meIni+'</span>';
    html+='<input id="cmt-inline-'+projetoId+'" placeholder="Comentar..."/>';
    html+='<button onclick="_addProjetoComentarioInline(\''+projetoId+'\')" class="rbtn rbtn-primary rbtn-sm">Enviar</button>';
    html+='<button onclick="sinalizarProjeto(\''+projetoId+'\')" class="rbtn rbtn-sm rbtn-danger" style="font-weight:700;">! Sinalizar</button>';
    html+='</div>';
  }
  html+='</div>';
  return html;
}
function _toggleProjetoComments(projetoId,expand){
  if(!_projCommentsExpanded)_projCommentsExpanded={};
  _projCommentsExpanded[projetoId]=expand;
  var p=projetosDB.find(function(x){return x.id===projetoId;});
  var ce=perfil==="mestre"||perfil==="advogado";
  var el=document.getElementById("proj-item-"+projetoId);if(!el||!p)return;
  el.innerHTML=_buildProjetoCardHTML(p,true,_checklistCache[projetoId]||null,_commentsCache[projetoId]||null,ce,false);
}
async function _addProjetoComentarioInline(projetoId){
  var ta=document.getElementById("cmt-inline-"+projetoId);
  var txt=(ta?ta.value||"":"").trim();
  if(!txt){toast("Escreva um comentário",true);return;}
  try{
    await dbUpsertProjetoComentario({projeto_id:projetoId,usuario_id:userDbId,texto:txt,tipo:"comentario"});
    _commentsCache[projetoId]=await dbFetchProjetoComentarios(projetoId);
    _reloadProjetoCard(projetoId,false);toast("Comentario adicionado!");
  }catch(e){toast("Erro",true);}
}
async function _editProjetoInline(projetoId,ehPassado){
  var p=projetosDB.find(function(x){return x.id===projetoId;})||{};
  var el=document.getElementById("proj-item-"+projetoId);if(!el)return;
  var advs=[];try{var us=await dbFetchUsers();advs=us.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});}catch(_){}
  var respOpts=advs.map(function(u){return '<option value="'+u.id+'"'+(p.responsavel_id===u.id?' selected':'')+'>'+((u.sigla||"")||(u.nome||u.email||""))+'</option>';}).join("");
  var eqOpts=equipesDB.map(function(e){return '<option value="'+e.id+'"'+(p.equipe_id===e.id?' selected':'')+'>'+e.nome+'</option>';}).join("");
  el.innerHTML='<div class="proj-card"><div class="proj-card-bar" style="background:#94a3b8;"></div><div class="proj-card-content">'
    +'<div class="field" style="margin-bottom:10px;"><label>Titulo *</label><input id="pei-titulo-'+projetoId+'" value="'+p.titulo+'" style="font-size:13px;"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
    +'<div><label class="icell-label">Tipo</label><select id="pei-tipo-'+projetoId+'" style="width:100%;font-size:12px;"><option value="continuo"'+(!p.tipo||p.tipo==="continuo"?" selected":"")+'>Continuo</option><option value="pontual"'+(p.tipo==="pontual"?" selected":"")+'>Pontual (subtarefas)</option></select></div>'
    +'<div><label class="icell-label">Status</label><select id="pei-status-'+projetoId+'" style="width:100%;font-size:12px;">'+statusTarefaOptions(p.status||"em_andamento",false)+'</select></div>'
    +'</div>'
    +'<div style="margin-bottom:10px;"><label class="icell-label">Responsavel</label><select id="pei-resp-'+projetoId+'" style="width:100%;font-size:12px;"><option value="">Nenhum</option>'+respOpts+'</select></div>'
    +(eqOpts?'<div style="margin-bottom:10px;"><label class="icell-label">Equipe</label><select id="pei-equipe-'+projetoId+'" style="width:100%;font-size:12px;"><option value="">Sem equipe</option>'+eqOpts+'</select></div>':"")
    +'<div style="margin-bottom:10px;"><label class="icell-label">Descricao</label><textarea id="pei-desc-'+projetoId+'" rows="2" style="font-size:12px;">'+(p.descricao||"")+'</textarea></div>'
    +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
    +'<button onclick="delProjeto(\''+projetoId+'\')" class="btn btn-danger" style="font-size:11px;padding:3px 10px;margin-right:auto;">Excluir</button>'
    +'<button onclick="_reloadProjetoCard(\''+projetoId+'\','+!!ehPassado+')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="_saveProjetoInline(\''+projetoId+'\','+!!ehPassado+')" class="btn btn-primary" style="font-size:11px;padding:3px 10px;">Salvar</button>'
    +'</div></div></div>';
}
async function _saveProjetoInline(projetoId,ehPassado){
  var titulo=(document.getElementById("pei-titulo-"+projetoId).value||"").trim();
  if(!titulo){toast("Informe o titulo",true);return;}
  var tipo=document.getElementById("pei-tipo-"+projetoId).value||"continuo";
  var status=document.getElementById("pei-status-"+projetoId).value||"em_andamento";
  var respId=document.getElementById("pei-resp-"+projetoId).value||null;
  var desc=(document.getElementById("pei-desc-"+projetoId).value||"").trim();
  var eqEl=document.getElementById("pei-equipe-"+projetoId);
  var p=projetosDB.find(function(x){return x.id===projetoId;})||{};
  var equipe_id=eqEl?eqEl.value||null:(p.equipe_id||null);
  var obj={id:projetoId,titulo:titulo,tipo:tipo,status:status,responsavel_id:respId,descricao:desc||null,equipe_id:equipe_id};
  try{
    var salvo=await dbUpsertProjeto(obj);
    projetosDB=projetosDB.map(function(x){return x.id===projetoId?Object.assign({},x,salvo||obj):x;});
    if(_checklistCache[projetoId])delete _checklistCache[projetoId];
    await _refreshProjetosNaReuniao();
    _reloadProjetoCard(projetoId,!!ehPassado);toast("Projeto salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _loadProjetosArea(reuniaoId){
  var el=document.getElementById("reun-projetos-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  el.innerHTML=_buildProjetosSection({},ce,ehPassado);
}

async function selecionarReuniao(id){
  reuniaoAtiva=reunioesDB.find(function(r){return r.id===id;})||null;
  if(reuniaoAtiva){var _p=reuniaoAtiva.data.split('-');_calMes=parseInt(_p[1])-1;_calAno=parseInt(_p[0]);}
  _renderReunioesPagina();
}

// ── NOVA / EDITAR REUNIAO ──
function openNovaReuniao(){
  var hoje=new Date().toISOString().slice(0,10);
  _abrirFormReuniao({data:hoje,hora:"09:30",status:"agendada"});
}
async function openEditReuniao(id){
  var r=reunioesDB.find(function(x){return x.id===id;});
  if(r)_abrirFormReuniao(r);
}
function _abrirFormReuniao(r){
  var isEdit=!!r.id;
  var eqOptions=equipesDB.map(function(e){return '<option value="'+e.id+'"'+(r.equipe_id===e.id?' selected':'')+'>'+e.nome+'</option>';}).join("");
  var tipoSel=r.tipo||(r.modelo_snapshot&&r.modelo_snapshot.slug)||'acompanhamento';
  var tipoOpts=(modelosDB&&modelosDB.length)?modelosDB.map(function(m){return '<option value="'+(m.slug||_modeloSlug(m.nome))+'"'+(tipoSel===(m.slug||_modeloSlug(m.nome))?' selected':'')+'>'+m.nome+'</option>';}).join(""):Object.keys(REUNIAO_TIPOS).map(function(k){return '<option value="'+k+'"'+(tipoSel===k?' selected':'')+'>'+REUNIAO_TIPOS[k].label+'</option>';}).join("");
  var modeloField='<div class="field"><label>Tipo</label><select id="rf-tipo">'+tipoOpts+'</select></div>';
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,520px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(isEdit?"Editar reuniao":"Nova reuniao")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Titulo</label><input id="rf-titulo" value="'+(r.titulo||"")+'"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="field">'
    +'<div><label>Data</label><input type="date" id="rf-data" value="'+(r.data||"")+'"/></div>'
    +'<div><label>Hora</label><input type="time" id="rf-hora" value="'+(r.hora?r.hora.slice(0,5):"09:30")+'"/></div>'
    +'</div>'
    +'<div class="field"><label>Status</label><select id="rf-status"><option value="agendada"'+(r.status==="agendada"?" selected":"")+'>Agendada</option><option value="realizada"'+(r.status==="realizada"?" selected":"")+'>Realizada</option><option value="cancelada"'+(r.status==="cancelada"?" selected":"")+'>Cancelada</option></select></div>'
    +modeloField
    +(equipesDB.length?'<div class="field"><label>Equipe</label><select id="rf-equipe"><option value="">Selecione...</option>'+eqOptions+'</select></div>':"")
    +'<div class="field"><label>Observacoes</label><textarea id="rf-obs" rows="3" style="resize:vertical;">'+(r.observacoes||"")+'</textarea></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +(isEdit?'<button class="btn btn-danger" onclick="delReuniao(\''+r.id+'\')">Excluir</button>':"")
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="salvarReuniao('+(isEdit?"'"+r.id+"'":"null")+')">Salvar</button>'
    +'</div>'
    +'</div></div>';
}
async function salvarReuniao(id){
  var titulo=(document.getElementById("rf-titulo").value||"").trim();
  var data=(document.getElementById("rf-data").value||"").trim();
  var hora=(document.getElementById("rf-hora").value||"09:30").trim();
  var status=document.getElementById("rf-status").value;
  var eqEl=document.getElementById("rf-equipe");var equipe_id=eqEl?eqEl.value||null:null;
  var obs=(document.getElementById("rf-obs").value||"").trim();
  if(!data){toast("Informe a data",true);return;}
  var tipoEl=document.getElementById("rf-tipo");var tipo=tipoEl?tipoEl.value:'acompanhamento';
  var obj={data,hora:hora+":00",status,tipo,observacoes:obs||null,equipe_id,criado_por:userDbId};
  if(titulo)obj.titulo=titulo;
  var existente=id?reunioesDB.find(function(x){return x.id===id;}):null;
  var modelo=_modeloPorTipo(tipo);
  if(modelo&&(!id||!existente||existente.tipo!==tipo||!existente.modelo_snapshot)){
    obj.modelo_id=modelo.id;
    obj.modelo_snapshot=_snapshotModelo(modelo);
  }
  if(id)obj.id=id;
  try{
    var criada=await dbUpsertReuniao(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    reunioesDB=await dbFetchReunioes(eqId);
    if(id){
      reuniaoAtiva=reunioesDB.find(function(r){return r.id===id;})||null;
    } else if(criada){
      reuniaoAtiva=reunioesDB.find(function(r){return r.id===criada.id;})||null;
      // Adiciona pautas recorrentes automaticamente
      var recorrentes=pautasDB.filter(function(p){return p.recorrente&&(!p.equipe_id||p.equipe_id===equipe_id);});
      for(var i=0;i<recorrentes.length;i++){
        try{await dbUpsertReuniaoPauta({reuniao_id:criada.id,pauta_id:recorrentes[i].id,ordem:i,snapshot_json:{notas:null}});}catch(_){}
      }
      // Vincula membros da equipe como participantes (busca em tempo real)
      if(equipe_id){
        try{
          var rm=await fetch(SB+"/rest/v1/equipe_membros?equipe_id=eq."+equipe_id+"&select=usuario_id",{headers:H});
          if(rm.ok){var mList=await rm.json();await Promise.all(mList.map(function(m){return dbUpsertReuniaoParticipante({reuniao_id:criada.id,usuario_id:m.usuario_id});}));}
        }catch(_){}
      }
      // Cria notificacoes para membros da equipe
      if(equipe_id){
        var titulo_r=obj.titulo||("Reuniao de "+_fmtData(obj.data));
        await criarNotifParaMembros(equipe_id,"reuniao_criada",criada.id,"Nova reuniao agendada: "+titulo_r+" em "+_fmtData(obj.data));
      }
    }
    if(status==="realizada"&&reuniaoAtiva)await salvarSnapshotReuniao(reuniaoAtiva.id);
    closeModal();_renderReunioesPagina();toast("Reuniao salva!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function delReuniao(id){
  closeModal();
  modalConfirm("Excluir esta reuniao?",async function(){
    try{
      await dbDelReuniao(id);
      reunioesDB=reunioesDB.filter(function(r){return r.id!==id;});
      if(reuniaoAtiva&&reuniaoAtiva.id===id)reuniaoAtiva=null;
      _renderReunioesPagina();toast("Reuniao excluida!");
    }catch(e){toast("Erro",true);}
  });
}

function _avCor(str){
  var pal=['#185FA5','#e67e22','#27ae60','#8e44ad','#c0392b','#16a085','#2980b9','#d35400','#7f8c8d'];
  var h=0;for(var i=0;i<(str||'').length;i++)h=(h*31+str.charCodeAt(i))&0xffff;
  return pal[h%pal.length];
}

// ── PARTICIPANTES ──
async function _loadParticipantesArea(reuniaoId){
  var el=document.getElementById("reuniao-part-area");if(!el)return;
  try{
    var parts=await dbFetchReuniaoParticipantes(reuniaoId);
    var users=parts.map(function(p){return p.usuarios;}).filter(Boolean);
    if(!users.length){el.innerHTML='<span style="font-size:12px;color:var(--text3);">Ninguém ainda</span>';return;}
    var max=6;var extra=users.length-max;
    var avs=users.slice(0,max).map(function(u){
      var nome=u.nome||u.email||'?';
      var ini=u.sigla||(nome.replace(/\s+/g,' ').trim().split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase());
      var cor=_avCor(u.id||nome);
      return '<div class="av" style="background:'+cor+';" title="'+nome+'">'+ini+'</div>';
    }).join("");
    if(extra>0)avs+='<div class="av reun-av-more" title="mais '+extra+'">+'+extra+'</div>';
    el.innerHTML=avs;
  }catch(_){if(el)el.innerHTML='';}
}
async function openGerenciarParticipantes(reuniaoId){
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,460px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Participantes</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div id="part-list" style="max-height:320px;overflow-y:auto;margin-bottom:14px;">Carregando...</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarParticipantes(\''+reuniaoId+'\')">Salvar</button></div>'
    +'</div></div>';
  try{
    var [todosUsers,atuais]=await Promise.all([dbFetchUsers(),dbFetchReuniaoParticipantes(reuniaoId)]);
    var idsAtuais=atuais.map(function(p){return p.usuario_id;});
    var advs=todosUsers.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});
    var el=document.getElementById("part-list");if(!el)return;
    if(!advs.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;">Nenhum usuario disponivel.</div>';return;}
    el.innerHTML=advs.map(function(u){
      var sel=idsAtuais.includes(u.id);
      return '<label style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);cursor:pointer;">'
        +'<input type="checkbox" data-uid="'+u.id+'"'+(sel?' checked':'')+'/>'
        +'<span style="font-size:13px;color:var(--bt-navy);font-weight:600;">'+(u.sigla?u.sigla+' — ':'')+(u.nome||u.email||"")+'</span>'
        +'<span style="font-size:11px;color:var(--text3);">'+u.email+'</span>'
        +'</label>';
    }).join("");
  }catch(e){var el2=document.getElementById("part-list");if(el2)el2.innerHTML='<div style="color:var(--text3);">Erro ao carregar.</div>';}
}
async function salvarParticipantes(reuniaoId){
  var checks=document.querySelectorAll("#part-list input[data-uid]");
  var selecionados=[];
  checks.forEach(function(c){if(c.checked)selecionados.push(c.getAttribute("data-uid"));});
  try{
    var atuais=await dbFetchReuniaoParticipantes(reuniaoId);
    var idsAtuais=atuais.map(function(p){return p.usuario_id;});
    var adicionar=selecionados.filter(function(id){return !idsAtuais.includes(id);});
    var remover=idsAtuais.filter(function(id){return !selecionados.includes(id);});
    await Promise.all(adicionar.map(function(uid){return dbUpsertReuniaoParticipante({reuniao_id:reuniaoId,usuario_id:uid});}));
    await Promise.all(remover.map(function(uid){return dbDelReuniaoParticipante(reuniaoId,uid);}));
    closeModal();_loadParticipantesArea(reuniaoId);toast("Participantes salvos!");
  }catch(e){toast("Erro ao salvar",true);}
}

// ── PAUTAS ──
async function renderPautas(){
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("reunioes")+'<div style="padding:24px;max-width:800px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    pautasDB=await dbFetchPautas(eqId);
  }catch(e){toast("Erro",true);}
  var ce=perfil==="mestre"||perfil==="advogado";
  var rows=!pautasDB.length?'<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma pauta</td></tr>':pautasDB.map(function(p){
    return '<tr style="border-bottom:1px solid var(--border);">'
      +'<td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+p.titulo+'</td>'
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+_labelTipoPauta(p.tipo)+(p.recorrente?' (recorrente)':'')+'</td>'
      +'<td style="padding:11px 14px;"><div style="display:flex;gap:4px;">'
      +(ce?'<button onclick="openEditPauta(\''+p.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">'+ic("edit")+' Editar</button>':'')
      +(ce?'<button onclick="delPauta(\''+p.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">'+ic("trash")+' Excluir</button>':'')
      +'</div></td></tr>';
  }).join("");
  app.innerHTML=headerHTML("reunioes")
    +'<div style="padding:24px;max-width:800px;margin:0 auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="display:flex;align-items:center;gap:8px;"><button onclick="renderReunioes()" style="background:none;border:none;cursor:pointer;color:var(--text3);display:flex;align-items:center;gap:4px;font-size:12px;">'+ic("back")+' Reunioes</button><div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Pautas</div></div>'
    +(ce?'<button class="btn btn-accent" onclick="openEditPauta(null)" style="display:flex;align-items:center;gap:5px;border-radius:8px;">'+ic("plus")+' Nova pauta</button>':"")
    +'</div>'
    +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);">'
    +'<table style="width:100%;border-collapse:collapse;">'
    +'<thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'
    +['Titulo','Tipo','Acoes'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")
    +'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
function openEditPauta(id){
  var p=id?pautasDB.find(function(x){return x.id===id;}):null;
  var eqOptions=equipesDB.map(function(e){return '<option value="'+e.id+'"'+(p&&p.equipe_id===e.id?' selected':'')+'>'+e.nome+'</option>';}).join("");
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,480px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(p?"Editar pauta":"Nova pauta")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Titulo *</label><input id="pf-titulo" value="'+(p?p.titulo:'')+'"/></div>'
    +'<div class="field"><label>Tipo</label><select id="pf-tipo">'+_tiposOpts(p?p.tipo:'livre')+'</select></div>'
    +'<div class="field"><label>Descricao</label><textarea id="pf-desc" rows="3">'+(p?p.descricao||'':"")+'</textarea></div>'
    +'<div style="display:flex;gap:16px;margin-bottom:12px;">'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="pf-recorrente"'+(p&&p.recorrente?' checked':'')+'/> Recorrente</label>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="pf-padrao"'+(p&&p.padrao?' checked':'')+'/> Padrao</label>'
    +'</div>'
    +(equipesDB.length?'<div class="field"><label>Equipe</label><select id="pf-equipe"><option value="">Selecione...</option>'+eqOptions+'</select></div>':"")
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarPauta('+(p?"'"+p.id+"'":"null")+')">Salvar</button></div>'
    +'</div></div>';
}
async function salvarPauta(id){
  var titulo=(document.getElementById("pf-titulo").value||"").trim();
  if(!titulo){toast("Informe o titulo",true);return;}
  var tipo=document.getElementById("pf-tipo").value;
  var descricao=(document.getElementById("pf-desc").value||"").trim();
  var recorrente=document.getElementById("pf-recorrente").checked;
  var padrao=document.getElementById("pf-padrao").checked;
  var eqEl=document.getElementById("pf-equipe");var equipe_id=eqEl?eqEl.value||null:null;
  var obj={titulo,tipo,descricao:descricao||null,recorrente,padrao,equipe_id,criado_por:userDbId};
  if(id)obj.id=id;
  try{
    await dbUpsertPauta(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    pautasDB=await dbFetchPautas(eqId);
    closeModal();renderPautas();toast("Pauta salva!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function delPauta(id){
  modalConfirm("Excluir esta pauta?",async function(){
    try{await dbDelPauta(id);pautasDB=pautasDB.filter(function(p){return p.id!==id;});renderPautas();toast("Pauta excluida!");}catch(e){toast("Erro",true);}
  });
}

// ── ADICIONAR PAUTA A REUNIAO ──
function _tiposOpts(sel){
  return '<option value="livre"'+(sel==='livre'?' selected':'')+'>Livre</option>'
    +'<option value="seminario"'+(sel==='seminario'?' selected':'')+'>Seminario</option>'
    +'<option value="projeto"'+(sel==='projeto'?' selected':'')+'>Projetos de equipe</option>'
    +'<option value="atualizacao_demandas"'+(sel==='atualizacao_demandas'?' selected':'')+'>Atualizacao de demandas</option>'
    +'<option value="avisos_gerais"'+(sel==='avisos_gerais'?' selected':'')+'>Avisos gerais</option>';
}
var _apCatSel=null;var _apReuniao=null;var _gpEditando=null;var _apPautasCtx=[];
async function openGerenciarPautas(reuniaoId){
  _apReuniao=reuniaoId;
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="_apAplicar()"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,860px);min-width:min(95vw,800px);min-height:600px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:90vh;">'
    +'<div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);flex-shrink:0;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Gerenciar Pautas</div>'
    +'<button onclick="_apAplicar()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="ap-body" style="display:flex;flex:1;overflow:hidden;min-height:320px;">'
    +'<div style="padding:20px;text-align:center;color:var(--text3);width:100%;">Carregando...</div>'
    +'</div>'
    +'<div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
    +'<span id="ap-sel-count" style="font-size:12px;color:var(--text3);"></span>'
    +'<div style="display:flex;gap:8px;">'
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="_apAplicar()">Confirmar seleção</button>'
    +'</div>'
    +'</div>'
    +'</div></div>';
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var cats=await dbFetchPautaCategorias(eqId);
    try{
      var rps=await dbFetchReuniaoPautas(reuniaoId);
      _apPautasCtx=rps.map(function(rp){
        var p=pautasDB.find(function(x){return x.id===rp.pauta_id;})||{};
        return {reuniao_pauta_id:rp.id,pauta_id:rp.pauta_id,titulo:p.titulo||"Pauta"};
      });
    }catch(_){_apPautasCtx=[];}
    _apRenderDoisPaineis(reuniaoId,cats,cats[0]?cats[0].id:null);
  }catch(e){var b=document.getElementById("ap-body");if(b)b.innerHTML='<div style="padding:20px;color:var(--text3);">Erro ao carregar.</div>';}
}
async function _apAplicar(){
  var reuniaoId=_apReuniao;
  closeModal();
  if(reuniaoId)await _loadPautasSection(reuniaoId);
}
function openAdicionarPauta(reuniaoId){openGerenciarPautas(reuniaoId);}
var _apCats=[];
function _apRenderDoisPaineis(reuniaoId,cats,catSelId){
  _apCatSel=catSelId;
  _apCats=cats;
  var body=document.getElementById("ap-body");if(!body)return;
  _apRenderCatList(cats,catSelId);
  body.innerHTML=document.getElementById("ap-cats-wrap")?body.innerHTML:'';
  var leftHTML='<div id="ap-cats-wrap" style="width:220px;min-width:180px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--surface);">'
    +'<div id="ap-cats" style="flex:1;overflow-y:auto;"></div>'
    +'<div id="ap-nova-cat-area" style="border-top:1px solid var(--border);padding:8px 10px;">'
    +'<button onclick="_apMostrarNovaCategoria()" style="font-size:12px;color:var(--text2);background:none;border:none;cursor:pointer;padding:2px 4px;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Nova categoria</button>'
    +'</div></div>';
  body.innerHTML=leftHTML+'<div id="ap-items" style="flex:1;overflow-y:auto;padding:4px 0;max-height:500px;"></div>';
  _apRenderCatList(cats,catSelId);
  _gpRefreshBadges();
  if(!cats.length){
    document.getElementById("ap-items").innerHTML='<div style="padding:20px;color:var(--text3);text-align:center;width:100%;">Nenhuma categoria. Crie a primeira.</div>';
  } else if(catSelId){
    _gpLoadItens(catSelId);
  }
}
function _apRenderCatList(cats,catSelId){
  var el=document.getElementById("ap-cats");if(!el)return;
  if(!cats.length){el.innerHTML='';return;}
  el.innerHTML=cats.map(function(cat){
    var sel=cat.id===(catSelId||_apCatSel);
    return '<div id="ap-cat-row-'+cat.id+'" style="padding:8px 10px;display:flex;align-items:center;gap:4px;background:'+(sel?'#fff':'')+';border-left:3px solid '+(sel?'var(--bt-orange)':'transparent')+';">'
      +'<span id="ap-cat-nome-'+cat.id+'" title="'+cat.nome.replace(/"/g,'&quot;')+'" onclick="_apSelectCat(\''+cat.id+'\')" style="font-size:13px;font-weight:'+(sel?'700':'400')+';color:var(--bt-navy);flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+cat.nome+'</span>'
      +'<span id="ap-cat-badge-'+cat.id+'" class="badge-count">...</span>'
      +'<button onclick="event.stopPropagation();_apIniciarEditCat(\''+cat.id+'\',\''+cat.nome.replace(/'/g,"\\'")+'\')" title="Editar categoria" aria-label="Editar categoria" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text3);font-size:13px;flex-shrink:0;" onmouseover="this.style.color=\'#2563eb\'" onmouseout="this.style.color=\'var(--text3)\'">'+ic("edit")+'</button>'
      +'<button onclick="event.stopPropagation();_apDeletarCategoria(\''+cat.id+'\')" title="Excluir categoria" aria-label="Excluir categoria" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text3);font-size:13px;flex-shrink:0;" onmouseover="this.style.color=\'#dc2626\'" onmouseout="this.style.color=\'var(--text3)\'">'+ic("trash")+'</button>'
      +'</div>';
  }).join("");
}
function _apSelectCat(catId){
  _apCatSel=catId;
  _apRenderCatList(_apCats,catId);
  _gpRefreshBadges();
  _gpLoadItens(catId);
}
function _apIniciarEditCat(catId,nomeAtual){
  var row=document.getElementById("ap-cat-row-"+catId);if(!row)return;
  row.innerHTML='<input id="ap-cat-edit-input" value="'+nomeAtual.replace(/"/g,'&quot;')+'" style="flex:1;font-size:13px;padding:2px 5px;border:1.5px solid var(--bt-orange);border-radius:4px;min-width:0;"/>'
    +'<button onclick="_apSalvarEditCat(\''+catId+'\')" title="Salvar" style="background:none;border:none;cursor:pointer;color:#22c55e;font-size:14px;padding:2px;flex-shrink:0;">&#10003;</button>'
    +'<button onclick="_apCancelarEditCat(\''+catId+'\',\''+nomeAtual.replace(/'/g,"\\'")+'\');" title="Cancelar" style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:14px;padding:2px;flex-shrink:0;">&#10005;</button>';
  var inp=document.getElementById("ap-cat-edit-input");if(inp)inp.focus();
}
async function _apSalvarEditCat(catId){
  var inp=document.getElementById("ap-cat-edit-input");
  var nome=(inp?inp.value||"":"").trim();
  if(!nome){toast("Informe o nome",true);return;}
  try{
    await dbUpsertPautaCategoria({id:catId,nome:nome});
    _apCats=_apCats.map(function(c){return c.id===catId?Object.assign({},c,{nome:nome}):c;});
    _apRenderCatList(_apCats,_apCatSel);
    _gpRefreshBadges();
    toast("Categoria salva!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _apCancelarEditCat(catId,nomeOriginal){
  _apRenderCatList(_apCats,_apCatSel);
  _gpRefreshBadges();
}
async function _apDeletarCategoria(catId){
  modalConfirm("Excluir esta categoria e todos os seus itens?",async function(){
    try{
      await dbDelPautaCategoria(catId);
      _apCats=_apCats.filter(function(c){return c.id!==catId;});
      var novasel=_apCatSel===catId?(_apCats[0]?_apCats[0].id:null):_apCatSel;
      _apCatSel=novasel;
      _apRenderCatList(_apCats,novasel);
      _gpRefreshBadges();
      if(novasel){_gpLoadItens(novasel);}
      else{var el=document.getElementById("ap-items");if(el)el.innerHTML='<div style="padding:20px;color:var(--text3);text-align:center;">Nenhuma categoria.</div>';}
      toast("Categoria excluida!");
    }catch(e){toast("Erro ao excluir",true);}
  });
}
function _apMostrarNovaCategoria(){
  var el=document.getElementById("ap-nova-cat-area");if(!el)return;
  el.innerHTML='<div style="display:flex;gap:4px;align-items:center;">'
    +'<input id="ap-nova-cat-input" placeholder="Nome da categoria" style="flex:1;font-size:12px;padding:3px 6px;border:1.5px solid var(--bt-orange);border-radius:4px;min-width:0;"/>'
    +'<button onclick="_apSalvarNovaCategoria()" title="Salvar" style="background:none;border:none;cursor:pointer;color:#22c55e;font-size:14px;padding:2px;flex-shrink:0;">&#10003;</button>'
    +'<button onclick="_apCancelarNovaCategoria()" title="Cancelar" style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:14px;padding:2px;flex-shrink:0;">&#10005;</button>'
    +'</div>';
  var inp=document.getElementById("ap-nova-cat-input");if(inp)inp.focus();
}
function _apCancelarNovaCategoria(){
  var el=document.getElementById("ap-nova-cat-area");if(!el)return;
  el.innerHTML='<button onclick="_apMostrarNovaCategoria()" style="font-size:12px;color:var(--text2);background:none;border:none;cursor:pointer;padding:2px 4px;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Nova categoria</button>';
}
async function _apSalvarNovaCategoria(){
  var inp=document.getElementById("ap-nova-cat-input");
  var nome=(inp?inp.value||"":"").trim();
  if(!nome){toast("Informe o nome",true);return;}
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var cat=await dbUpsertPautaCategoria({nome:nome,tipo:'livre',equipe_id:eqId,ordem:_apCats.length+1});
    if(!cat||!cat.id){toast("Erro ao criar",true);return;}
    _apCats.push(cat);
    _apRenderCatList(_apCats,_apCatSel);
    _gpRefreshBadges();
    _apCancelarNovaCategoria();
    toast("Categoria criada!");
  }catch(e){toast("Erro ao criar categoria",true);}
}
function _gpRefreshBadges(){
  var reuniaoId=_apReuniao;if(!reuniaoId)return;
  fetch(SB+"/rest/v1/reuniao_tarefas?reuniao_id=eq."+reuniaoId+"&select=tarefas(pauta_categoria_id)",{headers:H})
    .then(function(r){return r.ok?r.json():[];})
    .then(function(rows){
      var counts={};
      rows.forEach(function(row){var t=row.tarefas;var cid=t&&t.pauta_categoria_id;if(cid){if(!counts[cid])counts[cid]=0;counts[cid]++;}});
      var total=0;
      _apCats.forEach(function(cat){var c=counts[cat.id]||0;total+=c;var b=document.getElementById("ap-cat-badge-"+cat.id);if(b){b.textContent=c;b.className=c===0?'badge-count zero':'badge-count';}});
      var catCount=0;_apCats.forEach(function(cat){if((counts[cat.id]||0)>0)catCount++;});
      var msg='';if(total>0){msg=total+' tarefa'+(total===1?'':'s')+' selecionada'+(total===1?'':'s')+' em '+catCount+' categoria'+(catCount===1?'':'s');}
      var sc=document.getElementById("ap-sel-count");if(sc)sc.textContent=msg;
    }).catch(function(){});
}
async function _gpLoadItens(catId){
  var el=document.getElementById("ap-items");if(!el)return;
  el.innerHTML='<div style="padding:16px;"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';
  var reuniaoId=_apReuniao;
  try{
    var r1=await fetch(SB+"/rest/v1/tarefas?pauta_categoria_id=eq."+catId+"&parent_id=is.null&order=criado_em",{headers:H});
    var itens=r1.ok?await r1.json():[];
    var r2=await fetch(SB+"/rest/v1/reuniao_tarefas?reuniao_id=eq."+reuniaoId+"&select=tarefa_id",{headers:H});
    var linked=r2.ok?await r2.json():[];
    var linkedIds={};linked.forEach(function(x){linkedIds[x.tarefa_id]=true;});
    var catObj=_apCats.find(function(c){return c.id===catId;})||null;
    var catNome=catObj?catObj.nome:'';
    var headerHTML='<div style="padding:12px 16px 8px;border-bottom:1px solid #f1f5f9;">'
      +'<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;">'+catNome+'</div>'
      +'</div>';
    var respOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join("");
    var pautaOpts='<option value="">Sem pauta especifica</option>'+(_apPautasCtx||[]).map(function(p){return '<option value="'+p.reuniao_pauta_id+'">'+p.titulo+'</option>';}).join("");
    var formHTML='<div id="gp-novo-item-form" style="display:none;padding:12px 14px;border-bottom:2px solid var(--bt-orange);background:#fffbf5;">'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Titulo *</label>'
      +'<input id="gp-ni-titulo" placeholder="Titulo da tarefa..." style="font-size:13px;"/></div>'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Descricao</label>'
      +'<textarea id="gp-ni-descricao" rows="2" placeholder="Descricao opcional..." style="font-size:13px;resize:vertical;"></textarea></div>'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Responsavel *</label>'
      +'<select id="gp-ni-resp" style="font-size:13px;">'+respOpts+'</select></div>'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Pauta da reuniao</label>'
      +'<select id="gp-ni-pauta" style="font-size:13px;">'+pautaOpts+'</select></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
      +'<div class="field"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Inicio</label>'
      +'<input id="gp-ni-inicio" type="date" style="font-size:13px;"/></div>'
      +'<div class="field"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Encerramento *</label>'
      +'<input id="gp-ni-fim" type="date" style="font-size:13px;"/></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
      +'<button onclick="_gpCancelarNovaTarefa()" style="font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_gpSalvarNovaTarefa(\''+catId+'\')" class="btn" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
    var btnHTML='<button class="rt-cat-add-btn" onclick="_gpMostrarNovaTarefa()">'+ic("plus")+' Nova tarefa</button>';
    var listaHTML=itens.length?itens.map(function(t){
      var isLinked=!!linkedIds[t.id];
      var rAvatar='';
      if(t.responsavel){
        var u=(usuariosFullDB||[]).find(function(x){return x.sigla===t.responsavel;})||{};
        var ini=t.responsavel.slice(0,2).toUpperCase();
        rAvatar='<div class="av av-sm" style="background:'+_avCor(u.id||t.responsavel)+';flex-shrink:0;font-size:10px;width:22px;height:22px;min-width:22px;">'+ini+'</div>';
      }
      return '<div id="gp-row-'+t.id+'" style="display:flex;align-items:center;gap:10px;padding:8px 1rem;border-bottom:0.5px solid var(--border);">'
        +'<input type="checkbox"'+(isLinked?' checked':'')+' onchange="_gpToggleReuniaoTarefa(\''+reuniaoId+'\',\''+t.id+'\',this.checked,\''+catId+'\')" style="cursor:pointer;accent-color:var(--bt-orange);flex-shrink:0;">'
        +'<span style="font-size:13px;font-weight:500;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+t.texto+'</span>'
        +rAvatar
        +'</div>';
    }).join(""):'<div style="padding:16px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma tarefa nesta categoria. Crie a primeira.</div>';
    el.innerHTML=headerHTML+formHTML+btnHTML+listaHTML;
  }catch(e){if(el)el.innerHTML='<div style="padding:16px;color:var(--text3);">Erro ao carregar.</div>';}
}
function _gpMostrarNovaTarefa(){
  var f=document.getElementById("gp-novo-item-form");if(!f)return;
  f.style.display='';
  var t=document.getElementById("gp-ni-titulo");if(t)t.focus();
}
function _gpCancelarNovaTarefa(){
  var f=document.getElementById("gp-novo-item-form");if(!f)return;
  f.style.display='none';
  var t=document.getElementById("gp-ni-titulo");if(t)t.value='';
  var d=document.getElementById("gp-ni-descricao");if(d)d.value='';
}
async function _gpSalvarNovaTarefa(catId){
  var texto=(document.getElementById("gp-ni-titulo").value||"").trim();
  if(!texto){toast("Informe o titulo",true);return;}
  var descricao=(document.getElementById("gp-ni-descricao").value||"").trim()||null;
  var resp=document.getElementById("gp-ni-resp").value||null;
  var pautaSel=document.getElementById("gp-ni-pauta");
  var reuniaoPautaId=pautaSel?pautaSel.value||null:null;
  var inicio=document.getElementById("gp-ni-inicio").value||null;
  var fim=document.getElementById("gp-ni-fim").value||null;
  if(!resp){toast("Informe o responsavel",true);return;}
  if(!fim){toast("Informe o prazo",true);return;}
  if(inicio&&fim&&fim<inicio){toast("Prazo final menor que o inicio",true);return;}
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var tarefaId=uid();
    var payload={id:tarefaId,texto:texto,descricao:descricao||null,responsavel:resp||null,status:'pendente',data_inicio:inicio||null,data_fim:fim||null,criado_em:new Date().toISOString()};
    if(catId)payload.pauta_categoria_id=catId;
    if(eqId)payload.equipe_id=eqId;
    if(_apReuniao)payload.reuniao_id=_apReuniao;
    if(reuniaoPautaId){
      var pctx=(_apPautasCtx||[]).find(function(p){return p.reuniao_pauta_id===reuniaoPautaId;});
      if(pctx)payload.campos_valores={reuniao_pauta_id:pctx.reuniao_pauta_id,pauta_id:pctx.pauta_id,pauta_titulo:pctx.titulo};
    }
    await dbUpsertTarefa(payload);
    await dbUpsertReuniaoTarefa({reuniao_id:_apReuniao,tarefa_id:tarefaId});
    await notificarTarefaReuniao(tarefaId,resp,texto,_apReuniao);
    _gpLoadItens(catId);
    _gpRefreshBadges();
    toast("Tarefa criada!");
  }catch(e){toast("Erro ao criar tarefa",true);}
}
async function _gpDeletarTarefa(tarefaId,catId){
  modalConfirm("Excluir esta tarefa da reuniao?",async function(){
    try{
      await dbDelTarefa(tarefaId);
      _gpLoadItens(catId);
      _gpRefreshBadges();
      toast("Tarefa removida!");
    }catch(_){toast("Erro",true);}
  });
}
async function _gpToggleReuniaoTarefa(reuniaoId,tarefaId,checked,catId){
  try{
    if(checked){
      var eqId=equipeAtiva?equipeAtiva.id:null;
      var patch={id:tarefaId,reuniao_id:reuniaoId};
      if(eqId)patch.equipe_id=eqId;
      await dbUpsertTarefa(patch);
      await dbUpsertReuniaoTarefa({reuniao_id:reuniaoId,tarefa_id:tarefaId});
      try{
        var rows=await dbFetchTarefasReuniao(reuniaoId);
        var t=rows.find(function(x){return x.id===tarefaId;});
        if(t)await notificarTarefaReuniao(tarefaId,t.responsavel,t.texto,reuniaoId);
      }catch(_){}
    }
    else{await dbDelReuniaoTarefa(reuniaoId,tarefaId);}
    _gpRefreshBadges();
  }catch(_){toast("Erro",true);_gpLoadItens(catId);}
}
function _gpIniciarEditTarefa(tarefaId,catId){
  _gpEditando=tarefaId;
  _gpLoadItens(catId);
}
function _gpCancelarEditTarefa(catId){
  _gpEditando=null;
  _gpLoadItens(catId);
}
async function _gpSalvarEditTarefa(tarefaId,catId){
  var texto=(document.getElementById("gp-edit-titulo-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe o titulo",true);return;}
  var descricao=(document.getElementById("gp-edit-descricao-"+tarefaId).value||"").trim()||null;
  var resp=document.getElementById("gp-edit-resp-"+tarefaId).value||null;
  var inicio=document.getElementById("gp-edit-inicio-"+tarefaId).value||null;
  var fim=document.getElementById("gp-edit-fim-"+tarefaId).value||null;
  try{
    await dbUpsertTarefa({id:tarefaId,texto:texto,descricao:descricao||null,responsavel:resp||null,data_inicio:inicio||null,data_fim:fim||null});
    _gpEditando=null;
    _gpLoadItens(catId);
    toast("Tarefa salva!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function adicionarPautaExistenteReuniao(reuniaoId,pautaId){
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    if(rps.find(function(rp){return rp.pauta_id===pautaId;})){toast("Pauta ja adicionada a esta reuniao",true);return;}
    await dbUpsertReuniaoPauta({reuniao_id:reuniaoId,pauta_id:pautaId,ordem:rps.length,snapshot_json:{notas:null}});
    closeModal();_loadPautasSection(reuniaoId);toast("Pauta adicionada!");
  }catch(e){toast("Erro ao adicionar pauta",true);}
}
async function delPautaDoModal(pautaId,reuniaoId){
  modalConfirm("Excluir esta pauta? Os vinculos com reunioes tambem serao removidos.",async function(){
    try{
      await dbDelPauta(pautaId);
      pautasDB=pautasDB.filter(function(p){return p.id!==pautaId;});
      closeModal();openAdicionarPauta(reuniaoId);toast("Pauta excluida!");
    }catch(e){toast("Erro ao excluir",true);}
  });
}
async function salvarNovaPautaReuniao(reuniaoId){
  var titulo=(document.getElementById("np-titulo").value||"").trim();
  if(!titulo){toast("Informe o titulo",true);return;}
  var tipo=document.getElementById("np-tipo").value;
  var respId=document.getElementById("np-resp").value||null;
  var recorrente=document.getElementById("np-recorrente").checked;
  var padrao=document.getElementById("np-padrao").checked;
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var obj={titulo,tipo,recorrente,padrao,equipe_id:eqId,criado_por:userDbId};
  if(respId)obj.responsavel_id=respId;
  try{
    var pauta=await dbUpsertPauta(obj);
    if(!pauta||!pauta.id){toast("Erro ao criar pauta",true);return;}
    pautasDB.push(pauta);
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    await dbUpsertReuniaoPauta({reuniao_id:reuniaoId,pauta_id:pauta.id,ordem:rps.length,snapshot_json:{notas:null}});
    closeModal();_loadPautasSection(reuniaoId);toast("Pauta criada e adicionada!");
  }catch(e){toast("Erro ao criar pauta",true);}
}
async function _editPautaInline(rpId,reuniaoId,tipo){
  var el=document.getElementById("pb-"+rpId);if(!el)return;
  var rp;
  try{var rps=await dbFetchReuniaoPautas(reuniaoId);rp=rps.find(function(x){return x.id===rpId;});}catch(e){toast("Erro",true);return;}
  if(!rp){toast("Pauta nao encontrada",true);return;}
  var snap=rp.snapshot_json||{};
  var html='';
  if(tipo==='projeto'){
    html+='<div class="field" style="margin-top:8px;"><label>Notas da reuniao</label>'
      +'<textarea id="pbi-notas" rows="4" style="resize:vertical;" placeholder="Notas sobre projetos nesta reuniao...">'+(snap.notas||"")+'</textarea></div>';
  } else if(tipo==='seminario'){
    html+='<div class="field"><label>Titulo do seminario</label><input id="pbi-tit" value="'+(snap.titulo_seminario||"")+'"/></div>'
      +'<div class="field"><label>Responsavel</label><input id="pbi-resp" value="'+(snap.responsavel_nome||"")+'" placeholder="Nome do responsavel"/></div>'
      +'<div class="field"><label>Observacoes</label><textarea id="pbi-obs" rows="4" style="resize:vertical;" placeholder="Observacoes...">'+(snap.observacoes||"")+'</textarea></div>';
  } else if(tipo==='atualizacao_demandas'){
    window._pbiDemandas=JSON.parse(JSON.stringify(snap.demandas||[]));
    html+='<div class="field"><label>Notas gerais</label><textarea id="pbi-notas" rows="3" style="resize:vertical;" placeholder="Notas gerais...">'+(snap.notas||"")+'</textarea></div>';
    html+='<div style="margin-top:6px;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Demandas vinculadas</div>';
    html+='<div id="pbi-demandas-list">';
    if(!window._pbiDemandas.length){html+='<div style="font-size:12px;color:var(--text3);">Nenhuma demanda vinculada.</div>';}
    else{
      window._pbiDemandas.forEach(function(d,i){
        var card=(cards||[]).find(function(c){return c.id===d.card_id;})||{};
        html+='<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);">'
          +'<span style="flex:1;font-size:12px;color:var(--bt-navy);">'+trunc(card.titulo||d.titulo||"Demanda",36)+'</span>'
          +'<input data-demanda-obs data-idx="'+i+'" value="'+(d.obs||"")+'" placeholder="Obs..." style="width:130px;font-size:11px;padding:2px 5px;border:1px solid var(--border);border-radius:4px;"/>'
          +'<button onclick="_removerDemandaInline('+i+')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>'
          +'</div>';
      });
    }
    html+='</div>';
    html+='<div style="margin-top:8px;"><input id="pbi-busca-card" placeholder="Buscar demanda para vincular..." style="width:100%;font-size:12px;margin-bottom:4px;" oninput="_filtrarCardsInline()"/>'
      +'<div id="pbi-cards-resultados" style="max-height:110px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;display:none;"></div>'
      +'</div></div>';
  } else {
    html+='<textarea id="pbi-notas" rows="5" style="width:100%;resize:vertical;" placeholder="Notas...">'+(snap.notas||"")+'</textarea>';
  }
  html+='<div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end;">'
    +'<button onclick="_cancelPautaEdit(\''+rpId+'\',\''+reuniaoId+'\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="_savePautaInline(\''+rpId+'\',\''+reuniaoId+'\',\''+tipo+'\')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
    +'</div>';
  el.innerHTML=html;
}
async function _savePautaInline(rpId,reuniaoId,tipo){
  var rp;
  try{var rps=await dbFetchReuniaoPautas(reuniaoId);rp=rps.find(function(x){return x.id===rpId;});}catch(e){toast("Erro",true);return;}
  if(!rp){toast("Pauta nao encontrada",true);return;}
  var snap={};
  if(tipo==='projeto'){
    var notasP=(document.getElementById("pbi-notas").value||"").trim();
    snap=Object.assign({},rp.snapshot_json||{},{notas:notasP||null});
  } else if(tipo==='seminario'){
    var tit=(document.getElementById("pbi-tit").value||"").trim();
    var resp=(document.getElementById("pbi-resp").value||"").trim();
    var obs=(document.getElementById("pbi-obs").value||"").trim();
    snap={titulo_seminario:tit||null,responsavel_nome:resp||null,observacoes:obs||null};
  } else if(tipo==='atualizacao_demandas'){
    var notasA=(document.getElementById("pbi-notas").value||"").trim();
    var obsInputs=document.querySelectorAll("#pb-"+rpId+" [data-demanda-obs]");
    var demandas=(window._pbiDemandas||[]).map(function(d,i){var inp=obsInputs[i];return Object.assign({},d,{obs:inp?inp.value.trim():d.obs||""});});
    snap={notas:notasA||null,demandas:demandas.length?demandas:null};
    window._pbiDemandas=null;
  } else {
    var notasL=(document.getElementById("pbi-notas").value||"").trim();
    snap=Object.assign({},rp.snapshot_json||{},{notas:notasL||null});
  }
  rp=Object.assign({},rp,{snapshot_json:snap});
  try{
    await dbUpsertReuniaoPauta(rp);
    _loadPautasSection(reuniaoId);toast("Notas salvas!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _cancelPautaEdit(rpId,reuniaoId){
  window._pbiDemandas=null;
  _loadPautasSection(reuniaoId);
}
function _filtrarCardsInline(){
  var q=(document.getElementById("pbi-busca-card").value||"").toLowerCase().trim();
  var el=document.getElementById("pbi-cards-resultados");if(!el)return;
  if(!q){el.style.display="none";el.innerHTML="";return;}
  var found=(cards||[]).filter(function(c){return c.titulo&&c.titulo.toLowerCase().indexOf(q)>=0;}).slice(0,8);
  el.style.display="block";
  if(!found.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:6px 8px;">Nenhuma demanda encontrada.</div>';return;}
  el.innerHTML=found.map(function(c){
    return '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid var(--border);">'
      +'<span style="flex:1;font-size:12px;color:var(--bt-navy);">'+trunc(c.titulo||"",38)+'</span>'
      +'<button onclick="_adicionarDemandaInline(\''+c.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;flex-shrink:0;">Adicionar</button>'
      +'</div>';
  }).join("");
}
function _adicionarDemandaInline(cardId){
  if(!window._pbiDemandas)window._pbiDemandas=[];
  if(window._pbiDemandas.find(function(d){return d.card_id===cardId;})){toast("Demanda ja vinculada",true);return;}
  var card=(cards||[]).find(function(c){return c.id===cardId;})||{titulo:cardId};
  var obsInputs=document.querySelectorAll("[data-demanda-obs]");
  window._pbiDemandas.forEach(function(d,i){if(obsInputs[i])d.obs=obsInputs[i].value.trim();});
  window._pbiDemandas.push({card_id:cardId,titulo:card.titulo||cardId,obs:""});
  _renderDemandasInlineList();
  var busca=document.getElementById("pbi-busca-card");if(busca)busca.value="";
  var res=document.getElementById("pbi-cards-resultados");if(res){res.innerHTML="";res.style.display="none";}
}
function _removerDemandaInline(idx){
  if(!window._pbiDemandas)return;
  var obsInputs=document.querySelectorAll("[data-demanda-obs]");
  window._pbiDemandas.forEach(function(d,i){if(obsInputs[i])d.obs=obsInputs[i].value.trim();});
  window._pbiDemandas.splice(idx,1);
  _renderDemandasInlineList();
}
function _renderDemandasInlineList(){
  var el=document.getElementById("pbi-demandas-list");if(!el)return;
  if(!window._pbiDemandas||!window._pbiDemandas.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);">Nenhuma demanda vinculada.</div>';return;}
  el.innerHTML=window._pbiDemandas.map(function(d,i){
    var card=(cards||[]).find(function(c){return c.id===d.card_id;})||{};
    return '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);">'
      +'<span style="flex:1;font-size:12px;color:var(--bt-navy);">'+trunc(card.titulo||d.titulo||"Demanda",36)+'</span>'
      +'<input data-demanda-obs data-idx="'+i+'" value="'+(d.obs||"")+'" placeholder="Obs..." style="width:130px;font-size:11px;padding:2px 5px;border:1px solid var(--border);border-radius:4px;"/>'
      +'<button onclick="_removerDemandaInline('+i+')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>'
      +'</div>';
  }).join("");
}
async function openHistoricoPauta(pautaId,reuniaoIdAtual){
  var pauta=pautasDB.find(function(p){return p.id===pautaId;})||{titulo:"Pauta"};
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,560px);max-height:80vh;display:flex;flex-direction:column;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0;">'
    +'<div style="font-size:15px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Historico: '+pauta.titulo+'</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="hist-list" style="flex:1;overflow-y:auto;min-height:80px;">Carregando...</div>'
    +'</div></div>';
  try{
    var r=await fetch(SB+"/rest/v1/reuniao_pautas?pauta_id=eq."+pautaId+"&select=*",{headers:H});
    var rps=r.ok?await r.json():[];
    var itens=rps.map(function(rp){
      var re=reunioesDB.find(function(x){return x.id===rp.reuniao_id;})||{data:'1900-01-01'};
      return {rp:rp,data:re.data||'1900-01-01',titulo:re.titulo};
    }).sort(function(a,b){return b.data.localeCompare(a.data);});
    var elH=document.getElementById("hist-list");if(!elH)return;
    if(!itens.length){elH.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0;">Nenhum historico.</div>';return;}
    elH.innerHTML=itens.map(function(item){
      var snap=item.rp.snapshot_json||{};
      var isAtual=item.rp.reuniao_id===reuniaoIdAtual;
      var dataFmt=item.data&&item.data!=='1900-01-01'?_fmtData(item.data):'Data desconhecida';
      var notas=snap.notas;
      var demandas=snap.demandas||[];
      var conteudo='';
      if(notas)conteudo+='<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-top:4px;">'+notas+'</div>';
      if(demandas.length){
        conteudo+='<div style="margin-top:4px;">';
        demandas.forEach(function(d){
          var card=(cards||[]).find(function(c){return c.id===d.card_id;})||{};
          conteudo+='<div style="font-size:11px;color:var(--bt-navy);padding:2px 0;">'+trunc(card.titulo||d.titulo||"Demanda",44)+(d.obs?' - '+d.obs:'')+'</div>';
        });
        conteudo+='</div>';
      }
      if(!conteudo)conteudo='<div style="font-size:11px;color:var(--text3);font-style:italic;">Sem notas.</div>';
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">'
        +'<div style="font-size:12px;font-weight:600;color:var(--bt-navy);margin-bottom:3px;">'+dataFmt+(isAtual?' (reuniao atual)':'')+'</div>'
        +conteudo+'</div>';
    }).join("");
  }catch(e){var elH2=document.getElementById("hist-list");if(elH2)elH2.innerHTML='<div style="color:var(--text3);">Erro ao carregar.</div>';}
}
async function removerPautaDaReuniao(rpId){
  modalConfirm("Remover pauta desta reuniao?",async function(){
    try{
      await dbDelReuniaoPauta(rpId);
      if(reuniaoAtiva)_loadPautasSection(reuniaoAtiva.id);
      toast("Pauta removida!");
    }catch(e){toast("Erro",true);}
  });
}

// ── PROJETOS INTERNOS ──
function openNovoProjeto(){openEditProjeto(null);}
async function openEditProjeto(id){
  var p=id?projetosDB.find(function(x){return x.id===id;}):null;
  var eqOptions=equipesDB.map(function(e){return '<option value="'+e.id+'"'+(p&&p.equipe_id===e.id?' selected':(!p&&equipeAtiva&&equipeAtiva.id===e.id?' selected':''))+'>'+e.nome+'</option>';}).join("");
  var todosUsers=[];
  try{todosUsers=await dbFetchUsers();}catch(_){}
  var advs=todosUsers.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});
  var respOpts=advs.map(function(u){return '<option value="'+u.id+'"'+(p&&p.responsavel_id===u.id?' selected':'')+'>'+((u.sigla||"")||(u.nome||u.email||""))+'</option>';}).join("");
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,500px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(p?"Editar projeto":"Novo projeto de equipe")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Titulo *</label><input id="proj-titulo" value="'+(p?p.titulo:'')+'"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="field">'
    +'<div><label>Tipo</label><select id="proj-tipo"><option value="continuo"'+((!p||p.tipo==="continuo"||!p.tipo)?" selected":"")+'>Continuo</option><option value="pontual"'+((p&&p.tipo==="pontual")?" selected":"")+'>Pontual (subtarefas)</option></select></div>'
    +'<div><label>Status</label><select id="proj-status">'+statusTarefaOptions((p&&p.status)||"em_andamento",false)+'</select></div>'
    +'</div>'
    +'<div class="field"><label>Responsavel</label><select id="proj-resp"><option value="">Selecione...</option>'+respOpts+'</select></div>'
    +'<div class="field"><label>Descricao</label><textarea id="proj-desc" rows="3">'+(p?p.descricao||'':"")+'</textarea></div>'
    +(equipesDB.length?'<div class="field"><label>Equipe</label><select id="proj-equipe"><option value="">Selecione...</option>'+eqOptions+'</select></div>':"")
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +(p?'<button class="btn btn-danger" onclick="delProjeto(\''+p.id+'\')">Excluir</button>':"")
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="salvarProjeto('+(p?"'"+p.id+"'":"null")+')">Salvar</button>'
    +'</div></div></div>';
}
async function salvarProjeto(id){
  var titulo=(document.getElementById("proj-titulo").value||"").trim();
  if(!titulo){toast("Informe o titulo",true);return;}
  var resp=document.getElementById("proj-resp").value||null;
  var tipo=document.getElementById("proj-tipo").value||"continuo";
  var status=document.getElementById("proj-status").value;
  var desc=(document.getElementById("proj-desc").value||"").trim();
  var eqEl=document.getElementById("proj-equipe");var equipe_id=eqEl?eqEl.value||null:(equipeAtiva?equipeAtiva.id:null);
  var obj={titulo:titulo,tipo:tipo,responsavel_id:resp,status:status,descricao:desc||null,equipe_id:equipe_id};
  if(!id){obj.modelo_snapshot=_snapshotProjetoModelo();obj.campos_valores={};}
  if(id)obj.id=id;
  try{
    var salvo=await dbUpsertProjeto(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    projetosDB=await dbFetchProjetos(eqId);
    if(id&&_checklistCache[id])delete _checklistCache[id];
    closeModal();
    await _refreshProjetosNaReuniao();
    toast("Projeto salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function delProjeto(id){
  closeModal();
  modalConfirm("Excluir este projeto? As subtarefas e comentarios tambem serao removidos.",async function(){
    try{
      await dbDelProjeto(id);
      projetosDB=projetosDB.filter(function(p){return p.id!==id;});
      delete _projExpanded[id];delete _checklistCache[id];
      await _refreshProjetosNaReuniao();
      toast("Projeto excluido!");
    }catch(e){toast("Erro",true);}
  });
}
function openDuplicarProjeto(id){
  var p=projetosDB.find(function(x){return x.id===id;});
  if(!p){toast("Projeto nao encontrado",true);return;}
  _abrirDialogoDuplicar({
    titulo:"Duplicar projeto",
    opcoes:[
      {id:"subtarefas",label:"Subtarefas",marcado:true},
      {id:"valores",label:"Valores dos campos",marcado:true},
      {id:"comentarios",label:"Comentários",marcado:false}
    ],
    onConfirm:function(vals){_confirmarDuplicarProjeto(p,vals);}
  });
}
async function _confirmarDuplicarProjeto(p,vals){
  try{
    var novoId=uid();
    var novo={
      id:novoId,
      titulo:(p.titulo||"Projeto")+" (cópia)",
      tipo:p.tipo||"continuo",
      status:p.status||"em_andamento",
      responsavel_id:p.responsavel_id||null,
      descricao:p.descricao||null,
      equipe_id:p.equipe_id||(equipeAtiva?equipeAtiva.id:null),
      arquivado:false,
      criado_em:new Date().toISOString(),
      modelo_snapshot:p.modelo_snapshot||_snapshotProjetoModelo(),
      campos_valores:{}
    };
    if(vals.opcoes.valores&&p.campos_valores&&Object.keys(p.campos_valores).length){
      novo.campos_valores=JSON.parse(JSON.stringify(p.campos_valores));
    }
    var criado=await dbUpsertProjeto(novo);
    if(vals.opcoes.subtarefas){
      var itens=_checklistCache[p.id]||null;
      if(itens===null){try{itens=await dbFetchChecklist(p.id);}catch(_){itens=[];}}
      for(var i=0;i<(itens||[]).length;i++){
        var it=itens[i];
        var novoItem=normalizarStatusTarefa({
          id:uid(),
          projeto_id:novoId,
          titulo:(it.titulo||"Subtarefa"),
          status:it.status||"nao_iniciada",
          responsavel_id:it.responsavel_id||null,
          ordem:it.ordem||i,
          modelo_snapshot:it.modelo_snapshot||_snapshotSubtarefaProjetoModelo(),
          campos_valores:it.campos_valores?JSON.parse(JSON.stringify(it.campos_valores)):{}
        },it.status||"nao_iniciada");
        if(novoItem.campos_valores)delete novoItem.campos_valores.concluida_em;
        await dbUpsertChecklistItem(novoItem);
      }
    }
    if(vals.opcoes.comentarios){
      var cmts=_commentsCache[p.id]||null;
      if(cmts===null){try{cmts=await dbFetchProjetoComentarios(p.id);}catch(_){cmts=[];}}
      for(var ci=0;ci<(cmts||[]).length;ci++){
        var c=cmts[ci];
        await dbUpsertProjetoComentario({projeto_id:novoId,usuario_id:c.usuario_id,texto:c.texto,tipo:c.tipo||"comentario"});
      }
    }
    var eqId=equipeAtiva?equipeAtiva.id:null;
    projetosDB=await dbFetchProjetos(eqId);
    if(criado)projetosDB=projetosDB.map(function(x){return x.id===novoId?Object.assign({},x,criado):x;});
    await _refreshProjetosNaReuniao();
    toast("Projeto duplicado!");
  }catch(e){toast("Erro ao duplicar projeto",true);}
}
async function openProjetoComentários(projetoId){
  var p=projetosDB.find(function(x){return x.id===projetoId;})||{titulo:"Projeto"};
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,580px);max-height:85vh;display:flex;flex-direction:column;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0;">'
    +'<div style="font-size:15px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+p.titulo+'</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="proj-cmts" style="flex:1;overflow-y:auto;min-height:80px;padding-right:2px;">Carregando...</div>'
    +'<div style="margin-top:12px;flex-shrink:0;border-top:1px solid var(--border);padding-top:12px;">'
    +'<textarea id="proj-cmt-txt" rows="2" placeholder="Adicionar comentario..." style="width:100%;resize:none;"></textarea>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:6px;gap:6px;">'
    +'<button class="btn btn-primary" onclick="addProjetoComentario(\''+projetoId+'\')">Comentar</button>'
    +'</div></div></div></div>';
  _loadProjetoComentários(projetoId);
}
async function _loadProjetoComentários(projetoId){
  var el=document.getElementById("proj-cmts");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  try{
    var cmts=await dbFetchProjetoComentarios(projetoId);
    if(!cmts.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0;">Nenhum comentário ainda.</div>';return;}
    el.innerHTML=cmts.map(function(c){
      var u=c.usuarios||{};
      var isSinal=c.tipo==='sinalizado';
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre'||perfil==='advogado')&&ce;
      var bgStyle=isSinal?'background:#fff5f5;border-left:3px solid #ef4444;padding:8px 12px;margin:0 -4px;border-radius:0 6px 6px 0;':'';
      return '<div id="proj-cmt-'+c.id+'" style="padding:8px 0;border-bottom:1px solid var(--border);">'
        +'<div style="'+bgStyle+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        +'<div style="display:flex;align-items:center;gap:5px;">'
        +(isSinal?'<span style="color:#ef4444;font-size:13px;font-weight:700;">!</span>':'')
        +'<span style="font-size:12px;font-weight:600;color:var(--bt-navy);">'+(u.sigla||u.nome||"?")+'</span>'
        +(isSinal?'<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:#fee2e2;color:#ef4444;font-weight:600;">SINAL</span>':"")
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:4px;">'
        +'<span style="font-size:11px;color:var(--text3);">'+new Date(c.criado_em).toLocaleDateString("pt-BR")+'</span>'
        +(canEdit?'<button onclick="editarComentarioProjeto(\''+c.id+'\',\''+projetoId+'\')" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>':'')
        +(canEdit?'<button onclick="delComentarioProjeto(\''+c.id+'\',\''+projetoId+'\')" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>':'')
        +'</div>'
        +'</div>'
        +'<div style="font-size:13px;color:var(--text2);white-space:pre-wrap;line-height:1.5;">'+c.texto+'</div>'
        +'</div></div>';
    }).join("");
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar.</div>';}
}
async function addProjetoComentario(projetoId){
  var txt=(document.getElementById("proj-cmt-txt").value||"").trim();
  if(!txt){toast("Escreva um comentário",true);return;}
  try{
    await dbUpsertProjetoComentario({projeto_id:projetoId,usuario_id:userDbId,texto:txt,tipo:"comentario"});
    document.getElementById("proj-cmt-txt").value="";
    _loadProjetoComentários(projetoId);
    toast("Comentario adicionado!");
  }catch(e){toast("Erro",true);}
}
async function editarComentarioProjeto(cId,projetoId){
  var el=document.getElementById("proj-cmt-"+cId);if(!el)return;
  var cmts;
  try{cmts=await dbFetchProjetoComentarios(projetoId);}catch(e){toast("Erro",true);return;}
  var c=cmts.find(function(x){return x.id===cId;});if(!c)return;
  var isSinal=c.tipo==='sinalizado';
  var bgStyle=isSinal?'background:#fff5f5;border-left:3px solid #ef4444;padding:8px 12px;margin:0 -4px;border-radius:0 6px 6px 0;':'';
  var u=c.usuarios||{};
  el.innerHTML='<div style="padding:8px 0;"><div style="'+bgStyle+'">'
    +'<div style="font-size:12px;font-weight:600;color:var(--bt-navy);margin-bottom:6px;">'+(u.sigla||u.nome||"?")+'</div>'
    +'<textarea id="cmt-edit-'+cId+'" rows="3" style="width:100%;resize:none;border:1px solid var(--border);border-radius:6px;padding:6px;font-size:13px;">'+c.texto+'</textarea>'
    +'<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px;">'
    +'<button onclick="_loadProjetoComentários(\''+projetoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="salvarComentarioProjeto(\''+cId+'\',\''+projetoId+'\')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
    +'</div></div></div>';
}
async function salvarComentarioProjeto(cId,projetoId){
  var txt=(document.getElementById("cmt-edit-"+cId).value||"").trim();
  if(!txt){toast("Texto nao pode ser vazio",true);return;}
  try{
    await dbUpsertProjetoComentario({id:cId,texto:txt});
    _loadProjetoComentários(projetoId);toast("Comentario editado!");
  }catch(e){toast("Erro",true);}
}
async function delComentarioProjeto(cId,projetoId){
  modalConfirm("Excluir este comentario?",async function(){
    try{
      await dbDelProjetoComentario(cId);
      _loadProjetoComentários(projetoId);toast("Comentario excluido!");
    }catch(e){toast("Erro",true);}
  });
}

// ── NOTIFICACOES ──
function toggleNotifDropdown(){
  var existing=document.getElementById("notif-dropdown");
  if(existing){existing.remove();return;}
  var naoLidas=(notificacoesDB||[]).filter(function(n){return !n.lida;});
  var todas=(notificacoesDB||[]).slice(0,15);
  var itens=!todas.length?'<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma notificacao</div>':todas.map(function(n){
    return '<div onclick="abrirNotificacao(\''+n.id+'\')" style="padding:10px 14px;border-bottom:1px solid var(--border);background:'+(n.lida?"#fff":"#eff6ff")+';cursor:pointer;">'
      +'<div style="font-size:12px;color:var(--bt-navy);font-weight:'+(n.lida?"400":"600")+';">'+n.mensagem+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;">'+new Date(n.criado_em).toLocaleDateString("pt-BR")+'</div>'
      +'</div>';
  }).join("");
  var drop=document.createElement("div");
  drop.id="notif-dropdown";
  drop.style.cssText="position:fixed;top:52px;right:14px;width:300px;max-height:400px;overflow-y:auto;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:200;";
  drop.innerHTML='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">'
    +'<div style="font-size:13px;font-weight:700;color:var(--bt-navy);">Notificacoes</div>'
    +(naoLidas.length?'<button onclick="marcarTodasNotifLidas()" style="font-size:11px;background:none;border:none;color:var(--accent);cursor:pointer;">Marcar todas como lidas</button>':"")
    +'</div>'+itens;
  document.body.appendChild(drop);
  setTimeout(function(){document.addEventListener("click",function h(e){if(!drop.contains(e.target)){drop.remove();document.removeEventListener("click",h);}},true);},10);
}
async function marcarTodasNotifLidas(){
  try{
    await dbMarcarTodasLidas();
    notificacoesDB=notificacoesDB.map(function(n){return Object.assign({},n,{lida:true});});
    var drop=document.getElementById("notif-dropdown");if(drop)drop.remove();
    var app=document.getElementById("app");
    var hdr=app.querySelector(".bt-header");
  }catch(e){}
}
async function notificarTarefaReuniao(tarefaId,responsavel,texto,reuniaoId){
  if(!responsavel||!tarefaId)return;
  try{
    var user=(usuariosFullDB||[]).find(function(u){return u.sigla===responsavel;});
    if(!user||!user.id)return;
    var r=(reunioesDB||[]).find(function(x){return x.id===reuniaoId;})||reuniaoAtiva||{};
    var tituloReuniao=r.titulo||("Reuniao de "+(r.data?_fmtData(r.data):""));
    var msg='Nova tarefa de reuniao para voce: '+trunc(texto||"Tarefa",80)+' ('+tituloReuniao+')';
    var n={usuario_id:user.id,tipo:"tarefa_reuniao",mensagem:msg};
    if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tarefaId))n.referencia_id=tarefaId;
    await dbUpsertNotificacao(n);
    if(user.id===userDbId){
      try{notificacoesDB=await dbFetchNotificacoes();}catch(_){}
    }
  }catch(_){}
}

// PENDENCIAS ANTERIORES
function _reuniaoKey(r){
  return String((r&&r.data)||"")+" "+String((r&&r.hora)||"00:00");
}
function _getReuniaoAnterior(r){
  if(!r)return null;
  var eqId=r.equipe_id||(equipeAtiva?equipeAtiva.id:null);
  var atualKey=_reuniaoKey(r);
  var candidatas=(reunioesDB||[]).filter(function(x){
    if(!x||x.id===r.id||x.status==="cancelada")return false;
    if(eqId&&x.equipe_id&&x.equipe_id!==eqId)return false;
    return _reuniaoKey(x)<atualKey;
  });
  candidatas.sort(function(a,b){return _reuniaoKey(b).localeCompare(_reuniaoKey(a));});
  return candidatas[0]||null;
}
function _buildPendenciaItem(t,cor){
  var prazo=t.data_fim?_fmtDateBrShort(t.data_fim):"Sem prazo";
  return '<div class="pend-card" style="border-left-color:'+cor+';">'
    +'<div class="pend-title">'+trunc(t.texto||"Tarefa sem titulo",90)+'</div>'
    +'<div class="pend-meta">'
    +'<span>Responsavel: '+(t.responsavel||"Sem responsavel")+'</span>'
    +'<span>Prazo: '+prazo+'</span>'
    +'<span>Status: '+statusTarefaLabel(t.status)+'</span>'
    +'</div>'
    +'</div>';
}
function _buildPendenciaPoolItem(item,marcado){
  var cor=item.origem==="projeto"?'#7c3aed':'#2b76e5';
  var meta=[];
  if(item.contexto)meta.push(item.contexto);
  if(item.responsavel)meta.push("Resp.: "+item.responsavel);
  if(item.prazo)meta.push("Prazo: "+_fmtDateBrShort(item.prazo));
  if(item.status)meta.push(statusTarefaLabel(item.status));
  return '<label class="pend-pool-item'+(marcado?' marcado':'')+'" style="border-left-color:'+cor+';">'
    +'<input type="checkbox" '+(marcado?'checked':'')+' onchange="_togglePendenciaPool(\''+item.key+'\',this.checked)">'
    +'<span class="pend-pool-content">'
    +'<span class="pend-title">'+trunc(item.texto||"Tarefa sem titulo",100)+'</span>'
    +'<span class="pend-meta">'+meta.join(" · ")+'</span>'
    +(marcado?'<span class="pend-marked">Marcada nesta reunião</span>':'')
    +'</span>'
    +'</label>';
}
function _buildPendenciaGrupo(titulo,itens,cor){
  return '<div class="pend-group">'
    +'<div class="pend-group-hdr">'
    +'<span class="pend-group-dot" style="background:'+cor+';"></span>'
    +'<span class="pend-group-title">'+titulo+'</span>'
    +'<span class="pend-group-count">'+itens.length+'</span>'
    +'</div>'
    +(itens.length?itens.map(function(t){return _buildPendenciaItem(t,cor);}).join(""):'<div class="pend-empty">Nenhuma.</div>')
    +'</div>';
}
var _pendenciasPoolCache={};
async function _coletarPendenciasPool(reuniaoId,anterior,tarefasAnterior){
  var pool=[];
  (tarefasAnterior||[]).filter(function(t){return !statusTarefaFinalizador(t.status);}).forEach(function(t){
    pool.push({key:"tarefa:"+t.id,origem:"reuniao",id:t.id,texto:t.texto,status:t.status,responsavel:t.responsavel,prazo:t.data_fim,campos_valores:t.campos_valores||{},contexto:anterior?(anterior.titulo||("Reuniao de "+_fmtData(anterior.data))):"Reuniao anterior"});
  });
  try{
    if(!tarefasDB||!Object.keys(tarefasDB).length)await loadTodasTarefas();
  }catch(_){}
  (cards||[]).filter(function(card){
    if(!card||card.id==="__cols__")return false;
    if(equipeAtiva&&!(demandaEquipesDB[card.id]||[]).includes(equipeAtiva.id))return false;
    return true;
  }).forEach(function(card){
    (tarefasDB[card.id]||[]).filter(function(t){return !statusTarefaFinalizador(t.status);}).forEach(function(t){
      pool.push({key:"demanda:"+card.id+":"+t.id,origem:"demanda",id:t.id,card_id:card.id,texto:t.texto,status:t.status,responsavel:t.responsavel,prazo:t.data_fim,campos_valores:t.campos_valores||{},contexto:"Demanda: "+(card.titulo||"Demanda")});
    });
  });
  var projetos=(projetosDB||[]).filter(function(p){return !p.arquivado&&(!equipeAtiva||!p.equipe_id||p.equipe_id===equipeAtiva.id);});
  for(var i=0;i<projetos.length;i++){
    var p=projetos[i];
    var checklist=[];
    try{
      checklist=_checklistCache[p.id]||await dbFetchChecklist(p.id);
      _checklistCache[p.id]=checklist;
    }catch(_){checklist=[];}
    checklist.filter(function(it){return !statusTarefaFinalizador(it.status);}).forEach(function(it){
      var resp=(it.usuarios&&(it.usuarios.sigla||it.usuarios.nome))||"";
      pool.push({key:"projeto:"+p.id+":"+it.id,origem:"projeto",projeto_id:p.id,checklist_id:it.id,texto:it.titulo,status:it.status,responsavel:resp,prazo:null,contexto:"Projeto: "+(p.titulo||"Projeto")});
    });
  }
  _pendenciasPoolCache[reuniaoId]=pool;
  return pool;
}
async function _pendenciasMarcadasReuniao(reuniaoId){
  var marcadas={};
  try{
    var tarefas=await dbFetchTarefasReuniao(reuniaoId);
    tarefas.forEach(function(t){
      if(t.campos_valores&&t.campos_valores.pendencia_origem_key)marcadas[t.campos_valores.pendencia_origem_key]=true;
      marcadas["tarefa:"+t.id]=true;
    });
  }catch(_){}
  return marcadas;
}
async function _loadPendenciasAnteriores(reuniaoId){
  var el=document.getElementById("reun-pendencias-area");if(!el)return;
  var atual=(reunioesDB||[]).find(function(r){return r.id===reuniaoId;})||reuniaoAtiva;
  var anterior=_getReuniaoAnterior(atual);
  try{
    var tarefas=anterior?await dbFetchTarefasReuniao(anterior.id):[];
    var refData=(atual&&atual.data)||new Date().toISOString().slice(0,10);
    var abertas=tarefas.filter(function(t){return !statusTarefaFinalizador(t.status);});
    var atrasadas=abertas.filter(function(t){return t.data_fim&&t.data_fim<refData;});
    var abertasNoPrazo=abertas.filter(function(t){return !(t.data_fim&&t.data_fim<refData);});
    var concluidas=tarefas.filter(function(t){return statusTarefaFinalizador(t.status);});
    var pool=await _coletarPendenciasPool(reuniaoId,anterior,tarefas);
    var marcadas=await _pendenciasMarcadasReuniao(reuniaoId);
    var marcadasCount=pool.filter(function(item){return !!marcadas[item.key];}).length;
    var html='<div class="pend-head">'
      +'<div class="pend-help">Selecione subtarefas abertas para discutir nesta reunião.</div>'
      +'<div class="pend-actions">'
      +'<button onclick="abrirPendenciasPoolModal(\''+reuniaoId+'\')" class="rbtn rbtn-accent rbtn-sm">'+ic("list")+' Pool de subtarefas abertas'+(pool.length?' <span class="rbtn-count">'+(pool.length-marcadasCount)+'/'+pool.length+'</span>':'')+'</button>'
      +(anterior?'<button onclick="selecionarReuniao(\''+anterior.id+'\')" class="rbtn rbtn-sm">Abrir anterior</button>':'')
      +'</div>'
      +'</div>';
    if(!pool.length)html+='<div class="pend-empty wide">Nenhuma subtarefa aberta encontrada em demandas, reuniões anteriores ou projetos.</div>';
    if(tarefas.length){
      html+='<div class="pend-grid">'
        +_buildPendenciaGrupo("Atrasadas",atrasadas,"#dc2626")
        +_buildPendenciaGrupo("Abertas",abertasNoPrazo,"#2b76e5")
        +_buildPendenciaGrupo("Concluídas",concluidas,"#16a34a")
        +'</div>';
    }
    el.innerHTML=html;
  }catch(e){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);">Erro ao carregar pendencias anteriores.</div>';
  }
}

// ── GERAR ATA ──
async function abrirPendenciasPoolModal(reuniaoId){
  reuniaoId=reuniaoId||(reuniaoAtiva&&reuniaoAtiva.id);
  if(!reuniaoId)return;
  var pool=_pendenciasPoolCache[reuniaoId]||[];
  if(!pool.length){
    var atual=(reunioesDB||[]).find(function(r){return r.id===reuniaoId;})||reuniaoAtiva;
    var anterior=_getReuniaoAnterior(atual);
    var tarefas=anterior?await dbFetchTarefasReuniao(anterior.id):[];
    pool=await _coletarPendenciasPool(reuniaoId,anterior,tarefas);
  }
  var marcadas=await _pendenciasMarcadasReuniao(reuniaoId);
  var abertas=pool.filter(function(item){return !marcadas[item.key];}).length;
  var grupos={demanda:[],reuniao:[],projeto:[]};
  pool.forEach(function(item){(grupos[item.origem]||grupos.reuniao).push(item);});
  function bloco(titulo,itens){
    if(!itens.length)return "";
    return '<div class="pend-modal-group">'
      +'<div class="pend-modal-group-title">'+titulo+' <span>'+itens.length+'</span></div>'
      +itens.map(function(item){return _buildPendenciaPoolItem(item,!!marcadas[item.key]);}).join("")
      +'</div>';
  }
  var html='<div class="modal-overlay" onclick="_mc2Close()" style="z-index:320;">'
    +'<div class="modal-box pend-modal" onclick="event.stopPropagation()">'
    +'<div class="pend-modal-hdr">'
    +'<div><div class="pend-modal-title">Pool de subtarefas abertas</div>'
    +'<div class="pend-modal-sub">'+abertas+' pendente'+(abertas===1?'':'s')+' para marcar nesta reunião</div></div>'
    +'<button onclick="_mc2Close()" class="icon-btn" title="Fechar">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="pend-pool-modal-body" class="pend-modal-body">';
  if(!pool.length)html+='<div class="pend-empty wide">Nenhuma subtarefa aberta encontrada.</div>';
  else html+=bloco("Demandas",grupos.demanda)+bloco("Reuniões anteriores",grupos.reuniao)+bloco("Projetos de equipe",grupos.projeto);
  html+='</div></div></div>';
  _mc2().innerHTML=html;
}
async function _garantirPautaDemandasNaReuniao(reuniaoId,cardId){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var pauta=null;
  try{
    var pautas=await dbFetchPautas(eqId);
    pauta=(pautas||[]).find(function(p){return p.tipo==="atualizacao_demandas";})||null;
  }catch(_){}
  if(!pauta){
    pauta=await dbUpsertPauta({titulo:"Atualização de demandas",tipo:"atualizacao_demandas",descricao:"Demandas com subtarefas selecionadas para a reunião",recorrente:true,equipe_id:eqId,criado_por:userDbId||null});
  }
  if(!pauta||!pauta.id)return null;
  var rps=[];
  try{rps=await dbFetchReuniaoPautas(reuniaoId);}catch(_){rps=[];}
  var rp=(rps||[]).find(function(x){return x.pauta_id===pauta.id;});
  if(!rp){
    await dbUpsertReuniaoPauta({reuniao_id:reuniaoId,pauta_id:pauta.id,ordem:(rps||[]).length,snapshot_json:{notas:null,demandas:[]}});
    try{rps=await dbFetchReuniaoPautas(reuniaoId);}catch(_){rps=[];}
    rp=(rps||[]).find(function(x){return x.pauta_id===pauta.id;});
  }
  if(cardId&&rp){
    var snap=Object.assign({},rp.snapshot_json||{});
    var demandas=Array.isArray(snap.demandas)?snap.demandas.slice():[];
    if(!demandas.find(function(d){return d.card_id===cardId;})){
      var card=(cards||[]).find(function(c){return c.id===cardId;})||{};
      demandas.push({card_id:cardId,titulo:card.titulo||cardId,obs:"Subtarefa selecionada para esta reunião"});
      snap.demandas=demandas;
      await dbUpsertReuniaoPauta(Object.assign({},rp,{snapshot_json:snap}));
    }
  }
  return pauta;
}
async function _garantirPautaProjetosNaReuniao(reuniaoId){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var pauta=null;
  try{
    var pautas=await dbFetchPautas(eqId);
    pauta=(pautas||[]).find(function(p){return p.tipo==="projeto";})||null;
  }catch(_){}
  if(!pauta){
    pauta=await dbUpsertPauta({titulo:"Projetos de equipe",tipo:"projeto",descricao:"Acompanhamento de projetos de equipe",recorrente:true,equipe_id:eqId,criado_por:userDbId||null});
  }else if(pauta.titulo==="Projetos"){
    try{pauta=await dbUpsertPauta(Object.assign({},pauta,{titulo:"Projetos de equipe",descricao:pauta.descricao||"Acompanhamento de projetos de equipe"}));}catch(_){}
  }
  if(!pauta||!pauta.id)return null;
  var rps=[];
  try{rps=await dbFetchReuniaoPautas(reuniaoId);}catch(_){rps=[];}
  var existente=(rps||[]).find(function(rp){return rp.pauta_id===pauta.id;});
  if(!existente){
    await dbUpsertReuniaoPauta({reuniao_id:reuniaoId,pauta_id:pauta.id,ordem:(rps||[]).length,snapshot_json:{notas:null}});
  }
  return pauta;
}

async function _refreshPendenciasPoolUI(reuniaoId){
  _tarefasPautaCache[reuniaoId]=await dbFetchTarefasReuniao(reuniaoId);
  await _loadPendenciasAnteriores(reuniaoId);
  await _loadPautasSection(reuniaoId);
  if(document.getElementById("pend-pool-modal-body"))await abrirPendenciasPoolModal(reuniaoId);
}
async function _togglePendenciaPool(key,checked){
  if(checked)await _marcarPendenciaPool(key);
  else await _desmarcarPendenciaPool(key);
}
async function _desmarcarPendenciaPool(key){
  var reuniaoId=reuniaoAtiva?reuniaoAtiva.id:null;
  if(!reuniaoId)return;
  var pool=_pendenciasPoolCache[reuniaoId]||[];
  var item=pool.find(function(x){return x.key===key;});
  try{
    var tarefas=await dbFetchTarefasReuniao(reuniaoId);
    var tarefa=null;
    if(item&&item.origem==="projeto"){
      tarefa=(tarefas||[]).find(function(t){return t.campos_valores&&t.campos_valores.pendencia_origem_key===key;})||null;
      if(tarefa){
        await dbDelReuniaoTarefa(reuniaoId,tarefa.id);
        await dbDelTarefa(tarefa.id);
      }
    }else{
      var tarefaId=(item&&item.id)||null;
      tarefa=(tarefas||[]).find(function(t){
        return (tarefaId&&t.id===tarefaId)||(t.campos_valores&&t.campos_valores.pendencia_origem_key===key);
      })||null;
      if(tarefa){
        await dbDelReuniaoTarefa(reuniaoId,tarefa.id);
        var campos=Object.assign({},tarefa.campos_valores||{});
        delete campos.pendencia_origem_key;
        delete campos.demanda_card_id;
        delete campos.demanda_titulo;
        await dbUpsertTarefa({id:tarefa.id,reuniao_id:null,campos_valores:campos});
      }
    }
    await _refreshPendenciasPoolUI(reuniaoId);
    toast("Pendencia removida da reuniao!");
  }catch(_){
    toast("Erro ao desmarcar pendencia",true);
    await _loadPendenciasAnteriores(reuniaoId);
  }
}
async function _marcarPendenciaPool(key){
  var reuniaoId=reuniaoAtiva?reuniaoAtiva.id:null;
  if(!reuniaoId)return;
  var pool=_pendenciasPoolCache[reuniaoId]||[];
  var item=pool.find(function(x){return x.key===key;});
  if(!item)return;
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    if(item.origem==="reuniao"){
      var cache=(_tarefasPautaCache[reuniaoId]||[]).find(function(t){return t.id===item.id;})||{};
      await dbUpsertTarefa({id:item.id,reuniao_id:reuniaoId,equipe_id:eqId,campos_valores:Object.assign({},item.campos_valores||{},cache.campos_valores||{},{pendencia_origem_key:key})});
      await dbUpsertReuniaoTarefa({reuniao_id:reuniaoId,tarefa_id:item.id});
    }else if(item.origem==="demanda"){
      await _garantirPautaDemandasNaReuniao(reuniaoId,item.card_id);
      var cacheDem=(_tarefasPautaCache[reuniaoId]||[]).find(function(t){return t.id===item.id;})||{};
      await dbUpsertTarefa({id:item.id,reuniao_id:reuniaoId,equipe_id:eqId,campos_valores:Object.assign({},item.campos_valores||{},cacheDem.campos_valores||{},{pendencia_origem_key:key,demanda_card_id:item.card_id,demanda_titulo:item.contexto})});
      await dbUpsertReuniaoTarefa({reuniao_id:reuniaoId,tarefa_id:item.id});
    }else if(item.origem==="projeto"){
      await _garantirPautaProjetosNaReuniao(reuniaoId);
      var novoId=uid();
      var projeto=(projetosDB||[]).find(function(p){return p.id===item.projeto_id;})||{};
      await dbUpsertTarefa({
        id:novoId,
        texto:item.texto,
        status:item.status||"pendente",
        reuniao_id:reuniaoId,
        equipe_id:eqId,
        criado_em:new Date().toISOString(),
        campos_valores:{pendencia_origem_key:key,projeto_id:item.projeto_id,checklist_item_id:item.checklist_id,projeto_titulo:projeto.titulo||"Projeto"}
      });
      await dbUpsertReuniaoTarefa({reuniao_id:reuniaoId,tarefa_id:novoId});
    }
    await _refreshPendenciasPoolUI(reuniaoId);
    toast("Pendencia marcada na reuniao!");
  }catch(_){
    toast("Erro ao marcar pendencia",true);
    await _loadPendenciasAnteriores(reuniaoId);
  }
}

async function _coletarSnapshotTarefasReuniao(reuniaoId){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var catMap={"sem_cat":"Geral"};
  try{var catsDB=await dbFetchPautaCategorias(eqId);catsDB.forEach(function(c){catMap[c.id]=c.nome;});}catch(_){}
  var tarefas=[];
  try{tarefas=await dbFetchTarefasReuniao(reuniaoId);}catch(_){tarefas=[];}
  for(var i=0;i<tarefas.length;i++){
    try{tarefas[i]=Object.assign({},tarefas[i],{subtarefas:await dbFetchSubtarefas(tarefas[i].id)});}catch(_){tarefas[i]=Object.assign({},tarefas[i],{subtarefas:[]});}
  }
  return {criado_em:new Date().toISOString(),categorias:catMap,tarefas:tarefas};
}
function _getSnapshotTarefas(rps){
  for(var i=0;i<(rps||[]).length;i++){
    var snap=rps[i].snapshot_json&&rps[i].snapshot_json.tarefas_snapshot;
    if(snap&&Array.isArray(snap.tarefas))return snap;
  }
  return null;
}
async function salvarSnapshotReuniao(reuniaoId){
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    if(!rps.length)return null;
    var snapTarefas=await _coletarSnapshotTarefasReuniao(reuniaoId);
    for(var i=0;i<rps.length;i++){
      var rp=Object.assign({},rps[i]);
      rp.snapshot_json=Object.assign({},rp.snapshot_json||{},{tarefas_snapshot:snapTarefas});
      await dbUpsertReuniaoPauta(rp);
    }
    return snapTarefas;
  }catch(_){return null;}
}
async function gerarAta(reuniaoId){
  var r=reunioesDB.find(function(x){return x.id===reuniaoId;});if(!r)return;
  await salvarSnapshotReuniao(reuniaoId);
  var rps=await dbFetchReuniaoPautas(reuniaoId);
  var snapTarefas=_getSnapshotTarefas(rps);
  var tarefas=snapTarefas?snapTarefas.tarefas:[];
  var catMap=(snapTarefas&&snapTarefas.categorias)||{"sem_cat":"Geral"};
  var dataFmt=_fmtData(r.data);
  var linhas=["ATA DE REUNIAO","","Titulo: "+(r.titulo||("Reuniao de "+dataFmt)),"Data: "+dataFmt+" as "+r.hora.slice(0,5),"Status: "+r.status,""];
  if(r.observacoes){linhas.push("Observacoes: "+r.observacoes);linhas.push("");}
  linhas.push("PAUTAS DISCUTIDAS","");
  rps.forEach(function(rp,i){
    var pauta=pautasDB.find(function(p){return p.id===rp.pauta_id;})||{titulo:"Pauta "+(i+1)};
    linhas.push((i+1)+". "+pauta.titulo);
    var notas=rp.snapshot_json&&rp.snapshot_json.notas;
    if(notas){notas.split("\n").forEach(function(l){linhas.push("   "+l);});}
    linhas.push("");
  });
  linhas.push("TAREFAS DA REUNIAO","");
  if(!tarefas.length){
    linhas.push("Nenhuma tarefa vinculada a esta reuniao.","");
  } else {
    tarefas.forEach(function(t,i){
      var catId=t.pauta_categoria_id||"sem_cat";
      var subs=t.subtarefas||[];
      var concluidas=subs.filter(function(s){return statusTarefaFinalizador(s.status);}).length;
      linhas.push((i+1)+". "+(t.texto||"Tarefa sem titulo"));
      var pautaTitulo=t.campos_valores&&t.campos_valores.pauta_titulo;
      linhas.push("   Categoria/pauta: "+(pautaTitulo||catMap[catId]||"Geral"));
      linhas.push("   Responsavel: "+(t.responsavel||"Sem responsavel"));
      linhas.push("   Status: "+statusTarefaLabel(t.status));
      linhas.push("   Prazo: "+(t.data_fim?_fmtDateBr(t.data_fim):"Sem prazo"));
      if(t.data_inicio)linhas.push("   Inicio: "+_fmtDateBr(t.data_inicio));
      if(subs.length)linhas.push("   Progresso: "+concluidas+"/"+subs.length+" subtarefas concluidas");
      if(t.descricao){
        linhas.push("   Descricao:");
        String(t.descricao).split("\n").forEach(function(l){linhas.push("      "+l);});
      }
      linhas.push("");
    });
  }
  linhas.push("","--- Fim da ata ---");
  var texto=linhas.join("\n");
  var blob=new Blob([texto],{type:"text/plain;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.download="ata-"+dataFmt.replace(/\//g,"-")+".txt";a.click();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  toast("Ata gerada!");
}

// ── PAUTAS SECTION ──
async function _loadPautasSection(reuniaoId){
  var el=document.getElementById("reun-pautas-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var rps=[];
    var snapTarefas=null;
    try{rps=await dbFetchReuniaoPautas(reuniaoId);snapTarefas=ehPassado?_getSnapshotTarefas(rps):null;}catch(_){}
    var tarefas=await dbFetchTarefasReuniao(reuniaoId);
    if(snapTarefas&&snapTarefas.tarefas){
      tarefas=snapTarefas.tarefas;
      tarefas.forEach(function(t){_subtarefasCache[t.id]=t.subtarefas||[];});
    }
    _tarefasPautaCache[reuniaoId]=tarefas;
    if(!tarefas.length){
      el.innerHTML='<div style="font-size:12px;color:var(--text3);font-style:italic;">Nenhuma tarefa de pauta. Use o botao Gerenciar.</div>';
      return;
    }
    var cats={};var catOrder=[];
    tarefas.forEach(function(t){
      var cid=t.pauta_categoria_id||"sem_cat";
      if(!cats[cid]){cats[cid]={nome:'Geral',itens:[]};catOrder.push(cid);}
      cats[cid].itens.push(t);
    });
    var eqId=equipeAtiva?equipeAtiva.id:null;
    if(snapTarefas&&snapTarefas.categorias){Object.keys(snapTarefas.categorias).forEach(function(cid){if(cats[cid])cats[cid].nome=snapTarefas.categorias[cid];});}
    else{try{var catsDB=await dbFetchPautaCategorias(eqId);catsDB.forEach(function(c){if(cats[c.id])cats[c.id].nome=c.nome;});}catch(_){}}
    var html='<div style="display:flex;flex-direction:column;gap:18px;">';
    catOrder.forEach(function(catId){
      var cat=cats[catId];
      var nItens=cat.itens.length;
      html+='<div class="bgroup">';
      html+='<div class="bgroup-hd"><span class="bgroup-nm">'+cat.nome+'</span><span class="bgroup-ct">'+nItens+' '+(nItens===1?'tarefa':'tarefas')+'</span></div>';
      html+='<div class="board">';
      html+='<div class="bcols"><span></span><span>Tarefa</span><span>Responsável</span><span>Status</span><span>Prazo</span><span>Progresso</span></div>';
      cat.itens.forEach(function(t){
        html+='<div id="tp-card-'+t.id+'" class="brow-wrap">'+_buildTarefaCard(t,ce,ehPassado)+'</div>';
      });
      if(ce&&!ehPassado){
        html+='<button class="brow-add" onclick="openAdicionarPauta(\''+reuniaoId+'\')">'+ic("plus")+' Nova tarefa</button>';
      }
      html+='</div>';// fecha board
      html+='</div>';// fecha bgroup
    });
    html+='</div>';
    el.innerHTML=html;
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar pautas.</div>';}
}
var _itemEditando=null;
var _subEditando=null;
function _fmtDateBr(d){if(!d)return '';var p=d.split('-');if(p.length<3)return d;return p[2]+'/'+p[1]+'/'+p[0];}
function _fmtDateBrShort(d){if(!d)return '';var p=d.split('-');if(p.length<3)return d;return p[2]+'/'+p[1]+'/'+p[0];}
function _isAtrasado(dataFim,status){if(!dataFim||statusTarefaFinalizador(status))return false;var hoje=new Date().toISOString().slice(0,10);return dataFim<hoje;}

// Retorna as colunas customizadas de tarefa do snapshot da reuniao ativa
function _colunasTarefaSnapshot(){
  return (reuniaoAtiva&&reuniaoAtiva.modelo_snapshot&&reuniaoAtiva.modelo_snapshot.colunas_tarefa)||[];
}

// Renderiza o valor de uma coluna customizada para visualizacao no card
function _tcolRenderVal(col,val){
  var tipo=col.tipo;
  if(val===undefined||val===null||val==='')return '<span style="color:var(--text-faint,#94a3b8);">&#8212;</span>';
  if(tipo==='texto'||tipo==='numero'){return String(val);}
  if(tipo==='texto_longo'){return '<span title="'+String(val).replace(/"/g,'&quot;')+'">'+trunc(String(val),40)+'</span>';}
  if(tipo==='data'){return _fmtDateBrShort(val);}
  if(tipo==='status'){
    var op=(col.opcoes||[]).find(function(o){return o.id===val;});
    if(op){var cor=op.cor||'#94a3b8';return '<span class="reun-status-chip" style="background:'+cor+'22;color:'+cor+';font-size:10px;">'+op.label+'</span>';}
    return '<span style="color:var(--text-faint,#94a3b8);">&#8212;</span>';
  }
  if(tipo==='responsavel'){
    var u=(usuariosFullDB||[]).find(function(x){return x.sigla===val;})||{};
    var cor=_avCor(u.id||val);
    return '<div style="display:inline-flex;align-items:center;gap:4px;">'
      +'<span class="av av-sm" style="background:'+cor+';font-size:9px;width:18px;height:18px;min-width:18px;">'+String(val).slice(0,2).toUpperCase()+'</span>'
      +'<span>'+val+'</span></div>';
  }
  if(tipo==='checkbox'){return val?'<span style="color:#22c55e;font-size:13px;">&#10003;</span>':'<span style="color:#94a3b8;font-size:13px;">&#8212;</span>';}
  if(tipo==='link'){return '<a href="'+String(val).replace(/"/g,'&quot;')+'" target="_blank" style="color:var(--bt-navy);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;display:inline-block;" title="'+String(val).replace(/"/g,'&quot;')+'">'+trunc(val,24)+'</a>';}
  if(tipo==='multi'){
    var sel=Array.isArray(val)?val:[];
    if(!sel.length)return '<span style="color:var(--text-faint,#94a3b8);">&#8212;</span>';
    return (col.opcoes||[]).filter(function(o){return sel.indexOf(o.id)>=0;}).map(function(o){
      return '<span class="reun-status-chip" style="background:#e8edf2;color:var(--text2);font-size:10px;margin:1px 2px;">'+o.label+'</span>';
    }).join('');
  }
  return String(val);
}

// Renderiza o editor inline de uma celula de coluna customizada
function _tcolRenderEditor(col,val,tarefaId){
  var tipo=col.tipo;
  var vid=col.id.replace(/[^a-zA-Z0-9]/g,'_');
  var salvar='_tcolSalvar(\''+tarefaId+'\',\''+col.id+'\')';
  var fechar='_tcolFechar(\''+tarefaId+'\',\''+col.id+'\')';
  if(tipo==='texto'){
    return '<input id="tcol-inp-'+vid+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;" onkeydown="_tcolKd(event,\''+tarefaId+'\',\''+col.id+'\')" onblur="_tcolBlur(\''+tarefaId+'\',\''+col.id+'\')" autofocus/>';
  }
  if(tipo==='numero'){
    return '<input id="tcol-inp-'+vid+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;" onkeydown="_tcolKd(event,\''+tarefaId+'\',\''+col.id+'\')" onblur="_tcolBlur(\''+tarefaId+'\',\''+col.id+'\')" autofocus/>';
  }
  if(tipo==='texto_longo'){
    return '<textarea id="tcol-inp-'+vid+'" rows="3" style="width:100%;font-size:12px;resize:vertical;" autofocus>'+(val||'')+'</textarea>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">'
      +'<button onclick="'+fechar+'" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="'+salvar+'" class="rbtn rbtn-sm rbtn-accent">Salvar</button>'
      +'</div>';
  }
  if(tipo==='data'){
    return '<input id="tcol-inp-'+vid+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;" onchange="'+salvar+'" onblur="'+fechar+'" autofocus/>';
  }
  if(tipo==='status'){
    return '<select id="tcol-inp-'+vid+'" onchange="'+salvar+'" style="width:100%;font-size:12px;" autofocus>'
      +'<option value="">Sem valor</option>'
      +(col.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='responsavel'){
    return '<select id="tcol-inp-'+vid+'" onchange="'+salvar+'" style="width:100%;font-size:12px;" autofocus>'
      +'<option value="">Sem responsável</option>'
      +(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='checkbox'){
    return '<input id="tcol-inp-'+vid+'" type="checkbox"'+(val?' checked':'')+' onchange="_tcolSalvarCheckbox(\''+tarefaId+'\',\''+col.id+'\',this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--bt-navy);" autofocus/>';
  }
  if(tipo==='link'){
    return '<input id="tcol-inp-'+vid+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;" onkeydown="_tcolKd(event,\''+tarefaId+'\',\''+col.id+'\')" onblur="_tcolBlur(\''+tarefaId+'\',\''+col.id+'\')" autofocus/>';
  }
  if(tipo==='multi'){
    var sel=Array.isArray(val)?val:[];
    var checks=(col.opcoes||[]).map(function(o){
      return '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0;">'
        +'<input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/>'
        +o.label+'</label>';
    }).join("");
    return '<div id="tcol-inp-'+vid+'" style="display:flex;flex-direction:column;">'+checks+'</div>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">'
      +'<button onclick="'+fechar+'" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="_tcolSalvarMulti(\''+tarefaId+'\',\''+col.id+'\')" class="rbtn rbtn-sm rbtn-accent">Aplicar</button>'
      +'</div>';
  }
  return '';
}

var _tcolEditando={};// {tarefaId: colId}
var _tcolEsc=false;

function _tcolAbrir(tarefaId,colId){
  _tcolEditando[tarefaId]=colId;
  _reloadTarefaCard(tarefaId,false);
  var col=_colunasTarefaSnapshot().find(function(c){return c.id===colId;});
  if(!col)return;
  var vid=colId.replace(/[^a-zA-Z0-9]/g,'_');
  setTimeout(function(){var el=document.getElementById("tcol-inp-"+vid);if(el)el.focus();},30);
}

function _tcolFechar(tarefaId,colId){
  if(_tcolEsc){_tcolEsc=false;return;}
  delete _tcolEditando[tarefaId];
  _reloadTarefaCard(tarefaId,false);
}

function _tcolKd(evt,tarefaId,colId){
  if(evt.key==='Enter'){evt.preventDefault();_tcolEsc=true;_tcolSalvar(tarefaId,colId);}
  else if(evt.key==='Escape'){_tcolEsc=true;delete _tcolEditando[tarefaId];_reloadTarefaCard(tarefaId,false);}
}

function _tcolBlur(tarefaId,colId){
  if(_tcolEsc){_tcolEsc=false;return;}
  _tcolSalvar(tarefaId,colId);
}

async function _tcolSalvar(tarefaId,colId){
  _tcolEsc=false;
  var col=_colunasTarefaSnapshot().find(function(c){return c.id===colId;});if(!col)return;
  var vid=colId.replace(/[^a-zA-Z0-9]/g,'_');
  var el=document.getElementById("tcol-inp-"+vid);if(!el)return;
  var tipo=col.tipo;
  var val;
  if(tipo==='numero'){val=el.value!==''?parseFloat(el.value):null;}
  else if(tipo==='texto_longo'){val=(el.value||'').trim()||null;}
  else{val=(el.value||'').trim()||null;}
  await _tcolPersistir(tarefaId,colId,val);
}

async function _tcolSalvarCheckbox(tarefaId,colId,checked){
  await _tcolPersistir(tarefaId,colId,checked?true:null);
}

async function _tcolSalvarMulti(tarefaId,colId){
  var col=_colunasTarefaSnapshot().find(function(c){return c.id===colId;});if(!col)return;
  var vid=colId.replace(/[^a-zA-Z0-9]/g,'_');
  var container=document.getElementById("tcol-inp-"+vid);if(!container)return;
  var checks=container.querySelectorAll("input[type=checkbox]");
  var sel=[];checks.forEach(function(cb){if(cb.checked)sel.push(cb.value);});
  await _tcolPersistir(tarefaId,colId,sel.length?sel:null);
}

async function _tcolPersistir(tarefaId,colId,valor){
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  var cache=_tarefasPautaCache[rId]||[];
  var t=cache.find(function(x){return x.id===tarefaId;});
  var novo=Object.assign({},t?t.campos_valores||{}:{});
  if(valor===null||valor===undefined||(Array.isArray(valor)&&valor.length===0)){delete novo[colId];}
  else{novo[colId]=valor;}
  try{
    await dbUpsertTarefa({id:tarefaId,campos_valores:novo});
    if(t)t.campos_valores=novo;
    delete _tcolEditando[tarefaId];
    _reloadTarefaCard(tarefaId,false);
    toast("Salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}

function _subcolInputId(subId,colId){
  return "scol-inp-"+String(subId).replace(/[^a-zA-Z0-9]/g,'_')+"-"+String(colId).replace(/[^a-zA-Z0-9]/g,'_');
}
function _subcolRenderEditor(col,val,subId,parentId,ehPassado){
  var tipo=col.tipo;
  var idInp=_subcolInputId(subId,col.id);
  var salvar='_subcolSalvar(\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')';
  var fechar='_subcolFechar(\''+subId+'\',\''+parentId+'\','+!!ehPassado+')';
  if(tipo==='texto'){
    return '<input id="'+idInp+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;" onkeydown="_subcolKd(event,\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" onblur="_subcolBlur(\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" autofocus/>';
  }
  if(tipo==='numero'){
    return '<input id="'+idInp+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;" onkeydown="_subcolKd(event,\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" onblur="_subcolBlur(\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" autofocus/>';
  }
  if(tipo==='texto_longo'){
    return '<textarea id="'+idInp+'" rows="3" style="width:100%;font-size:12px;resize:vertical;" autofocus>'+(val||'')+'</textarea>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">'
      +'<button onclick="'+fechar+'" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="'+salvar+'" class="rbtn rbtn-sm rbtn-accent">Salvar</button>'
      +'</div>';
  }
  if(tipo==='data'){
    return '<input id="'+idInp+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;" onchange="'+salvar+'" onblur="'+fechar+'" autofocus/>';
  }
  if(tipo==='status'){
    return '<select id="'+idInp+'" onchange="'+salvar+'" style="width:100%;font-size:12px;" autofocus>'
      +'<option value="">Sem valor</option>'
      +(col.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='responsavel'){
    return '<select id="'+idInp+'" onchange="'+salvar+'" style="width:100%;font-size:12px;" autofocus>'
      +'<option value="">Sem responsável</option>'
      +(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>';}).join("")
      +'</select>';
  }
  if(tipo==='checkbox'){
    return '<input id="'+idInp+'" type="checkbox"'+(val?' checked':'')+' onchange="_subcolSalvarCheckbox(\''+subId+'\',\''+parentId+'\',\''+col.id+'\',this.checked,'+!!ehPassado+')" style="width:18px;height:18px;cursor:pointer;accent-color:var(--bt-navy);" autofocus/>';
  }
  if(tipo==='link'){
    return '<input id="'+idInp+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;" onkeydown="_subcolKd(event,\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" onblur="_subcolBlur(\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" autofocus/>';
  }
  if(tipo==='multi'){
    var sel=Array.isArray(val)?val:[];
    var checks=(col.opcoes||[]).map(function(o){
      return '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0;">'
        +'<input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/>'
        +o.label+'</label>';
    }).join("");
    return '<div id="'+idInp+'" style="display:flex;flex-direction:column;">'+checks+'</div>'
      +'<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">'
      +'<button onclick="'+fechar+'" class="rbtn rbtn-sm">Cancelar</button>'
      +'<button onclick="_subcolSalvarMulti(\''+subId+'\',\''+parentId+'\',\''+col.id+'\','+!!ehPassado+')" class="rbtn rbtn-sm rbtn-accent">Aplicar</button>'
      +'</div>';
  }
  return '';
}
function _subcolAbrir(subId,parentId,colId,ehPassado){
  _tcolEditando[subId]=colId;
  _reloadTarefaCard(parentId,ehPassado);
  setTimeout(function(){var el=document.getElementById(_subcolInputId(subId,colId));if(el)el.focus();},30);
}
function _subcolFechar(subId,parentId,ehPassado){
  if(_tcolEsc){_tcolEsc=false;return;}
  delete _tcolEditando[subId];
  _reloadTarefaCard(parentId,ehPassado);
}
function _subcolKd(evt,subId,parentId,colId,ehPassado){
  if(evt.key==='Enter'){evt.preventDefault();_tcolEsc=true;_subcolSalvar(subId,parentId,colId,ehPassado);}
  else if(evt.key==='Escape'){_tcolEsc=true;delete _tcolEditando[subId];_reloadTarefaCard(parentId,ehPassado);}
}
function _subcolBlur(subId,parentId,colId,ehPassado){
  if(_tcolEsc){_tcolEsc=false;return;}
  _subcolSalvar(subId,parentId,colId,ehPassado);
}
async function _subcolSalvar(subId,parentId,colId,ehPassado){
  _tcolEsc=false;
  var col=_colunasTarefaSnapshot().find(function(c){return c.id===colId;});if(!col)return;
  var el=document.getElementById(_subcolInputId(subId,colId));if(!el)return;
  var val;
  if(col.tipo==='numero'){val=el.value!==''?parseFloat(el.value):null;}
  else if(col.tipo==='texto_longo'){val=(el.value||'').trim()||null;}
  else{val=(el.value||'').trim()||null;}
  await _subcolPersistir(subId,parentId,colId,val,ehPassado);
}
async function _subcolSalvarCheckbox(subId,parentId,colId,checked,ehPassado){
  await _subcolPersistir(subId,parentId,colId,checked?true:null,ehPassado);
}
async function _subcolSalvarMulti(subId,parentId,colId,ehPassado){
  var container=document.getElementById(_subcolInputId(subId,colId));if(!container)return;
  var checks=container.querySelectorAll("input[type=checkbox]");
  var sel=[];checks.forEach(function(cb){if(cb.checked)sel.push(cb.value);});
  await _subcolPersistir(subId,parentId,colId,sel.length?sel:null,ehPassado);
}
async function _subcolPersistir(subId,parentId,colId,valor,ehPassado){
  var sub=(_subtarefasCache[parentId]||[]).find(function(s){return s.id===subId;});
  var novo=Object.assign({},sub&&sub.campos_valores?sub.campos_valores:{});
  if(valor===null||valor===undefined||(Array.isArray(valor)&&valor.length===0)){delete novo[colId];}
  else{novo[colId]=valor;}
  try{
    await dbUpsertTarefa({id:subId,campos_valores:novo});
    if(sub)sub.campos_valores=novo;
    delete _tcolEditando[subId];
    _reloadTarefaCard(parentId,ehPassado);
    toast("Salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}

function _buildTarefaCard(t,ce,ehPassado){
  var bar=statusTarefaCor(t.status,'#E24B4A');
  var bg=bar;
  var txt='#fff';
  var lbl=statusTarefaLabel(t.status);
  var subtarefas=_subtarefasCache[t.id]||null;
  var cmts=_tarefaCmtsCache[t.id]||null;
  var subExp=subtarefas!==null&&!_subCollapsed[t.id];
  var canEdit=ce&&!ehPassado&&_itemEditando!==t.id;
  var html='';

  // ── LINHA DO BOARD (estilo Monday) ──
  var dragAttr=(ce&&!ehPassado)?' onpointerdown="_tarefaDragStart(event,\''+t.id+'\',false,null,'+!!ehPassado+')" title="Arraste para o lado para alterar status"':'';
  html+='<div class="brow"'+dragAttr+'>';
  html+='<div class="brow-strip" style="background:'+bar+';"></div>';
  // coluna 1: expandir
  html+='<div class="bc bc-chev"><button class="tcard-chev'+(subExp?' aberto':'')+'" onclick="_toggleSubExpand(\''+t.id+'\','+!!ehPassado+')" title="'+(subExp?'Ocultar subtarefas':'Ver subtarefas')+'">'+ic("chevdown")+'</button></div>';
  // coluna 2: tarefa (titulo editavel)
  html+='<div class="bc bc-task"><div class="btask-wrap"><span id="tp-txt-'+t.id+'" class="btask'+(statusTarefaFinalizador(t.status)?' done':'')+'"'
    +(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_iniciarEdicaoTitulo(\''+t.id+'\',false,null,'+!!ehPassado+')" title="Clique para editar"':'')+'>'+t.texto+'</span>'
    +(t.campos_valores&&t.campos_valores.pauta_titulo?'<span class="bsub">Pauta: '+trunc(t.campos_valores.pauta_titulo,64)+'</span>':'')
    +(t.campos_valores&&t.campos_valores.projeto_titulo?'<span class="bsub">Projeto: '+trunc(t.campos_valores.projeto_titulo,64)+'</span>':'')
    +((t.descricao&&!subExp)?'<span class="bsub">'+trunc(t.descricao,64)+'</span>':'')
    +'</div></div>';
  // coluna 3: responsavel
  html+='<div id="tp-resp-'+t.id+'" class="bc bc-resp'+(canEdit?' inline-edit-hit':'')+'"'
    +(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_abrirRespInline(\''+t.id+'\',false,null,'+!!ehPassado+')" title="Clique para editar responsavel"':'')+'>';
  if(t.responsavel){
    var u=(usuariosFullDB||[]).find(function(x){return x.sigla===t.responsavel;})||{};
    html+='<span class="av av-sm" style="background:'+_avCor(u.id||t.responsavel)+';font-size:9px;width:24px;height:24px;min-width:24px;flex-shrink:0;">'+t.responsavel.slice(0,2).toUpperCase()+'</span><span class="bresp-nm">'+t.responsavel+'</span>';
  } else { html+='<span class="bdash">&#8212;</span>'; }
  html+='</div>';
  // coluna 4: status solido
  html+='<div class="bc bc-status"><span id="sc-'+t.id+'" class="statcell" style="background:'+bar+';'+(ce&&!ehPassado?'cursor:pointer;':'')+'"'
    +(ce&&!ehPassado?' onclick="_abrirStatusDropdown(event,\''+t.id+'\',false,null,'+!!ehPassado+')"':'')
    +'>'+lbl+(ce&&!ehPassado?' <span class="cv">&#9660;</span>':'')+'</span></div>';
  // coluna 5: prazo
  var atrasado=t.data_fim&&_isAtrasado(t.data_fim,t.status);
  html+='<div id="tp-date-'+t.id+'" class="bc bc-date'+(atrasado?' late':'')+(canEdit?' inline-edit-hit':'')+'"'
    +(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_abrirPrazoInline(\''+t.id+'\',false,null,'+!!ehPassado+')" title="Clique para editar prazo"':'')+'>'
    +(t.data_fim?_fmtDateBrShort(t.data_fim)+(atrasado?' &#128336;':''):'<span class="bdash">&#8212;</span>')+'</div>';
  // coluna 6: progresso + menu de acoes
  html+='<div class="bc bc-prog">';
  if(subtarefas&&subtarefas.length>0){
    var _conc=subtarefas.filter(function(s){return statusTarefaFinalizador(s.status);}).length;
    html+='<div class="bprogwrap" onclick="_toggleSubExpand(\''+t.id+'\','+!!ehPassado+')" title="Ver subtarefas">';
    html+='<div class="btrack">';
    subtarefas.forEach(function(s){html+='<div class="bseg" style="background:'+statusTarefaCor(s.status,'#e8edf2')+';"></div>';});
    html+='</div><span class="bpct">'+_conc+'/'+subtarefas.length+'</span></div>';
  } else if(ce&&!ehPassado){
    html+='<button class="baddsub" onclick="_toggleSubExpand(\''+t.id+'\','+!!ehPassado+')" title="Adicionar subtarefa">'+ic("plus")+'<span>subtarefa</span></button>';
  } else { html+='<span class="bdash" style="flex:1;">&#8212;</span>'; }
  if(ce&&!ehPassado){
    html+='<button onclick="_abrirMenuTarefa(event,\''+t.id+'\',false,null,'+!!ehPassado+')" class="rt-menu-btn" title="Acoes">&#8943;</button>';
  }
  html+='</div>';
  html+='</div>';// fecha brow
  var colunasCustom=_colunasTarefaSnapshot();
  if(colunasCustom.length){
    var valsCustom=t.campos_valores||{};
    html+='<div class="tcols">';
    colunasCustom.forEach(function(col){
      var editando=_tcolEditando[t.id]===col.id;
      html+='<div class="tcol'+(ce&&!ehPassado?' editavel':'')+'"'+(ce&&!ehPassado&&!editando?' onclick="_tcolAbrir(\''+t.id+'\',\''+col.id+'\')"':'')+'>'
        +'<div class="tcol-lbl">'+col.label+'</div>'
        +'<div class="tcol-val">'+(editando?_tcolRenderEditor(col,valsCustom[col.id],t.id):_tcolRenderVal(col,valsCustom[col.id]))+'</div>'
        +'</div>';
    });
    html+='</div>';
  }
  // ── BLOCO EXPANDIDO (descricao, edicao, checklist, comentarios) ──
  var _temExp=(_itemEditando===t.id)||subExp;
  if(_temExp){html+='<div class="brow-exp">';}

  // descricao (exibida so quando expandido, dentro do bloco expandido)
  if(subExp){
    if(t.descricao){
      html+='<div id="tp-desc-'+t.id+'" style="font-size:12px;color:var(--text2);line-height:1.55;white-space:pre-wrap;'+(canEdit?'cursor:text;':'')+'"'
        +(canEdit?' onclick="event.stopPropagation();_iniciarEdicaoDescricaoMain(\''+t.id+'\','+!!ehPassado+')"':'')+'>'+t.descricao+'</div>';
    } else if(canEdit&&!(subtarefas&&subtarefas.length)){
      html+='<div id="tp-desc-'+t.id+'" onclick="event.stopPropagation();_iniciarEdicaoDescricaoMain(\''+t.id+'\','+!!ehPassado+')" class="tp-add-desc-ph" style="font-size:12px;color:var(--text3);font-style:italic;cursor:text;">Adicionar descricao...</div>';
    }
  }

  // form de edicao da tarefa principal
  if(_itemEditando===t.id){
    var respOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(t.responsavel===s?' selected':'')+'>'+s+'</option>';}).join("");
    var statusOpts=statusTarefaOptions(t.status,false);
    html+='<div class="rt-edit-form" style="margin-top:10px;">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;">'
      +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Titulo</label>'
      +'<input id="tp-edit-titulo-'+t.id+'" value="'+t.texto.replace(/"/g,"&quot;")+'" style="font-size:13px;"/></div>'
      +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Status</label>'
      +'<select id="tp-edit-status-'+t.id+'" style="font-size:13px;">'+statusOpts+'</select></div>'
      +'</div>'
      +'<div class="field" style="margin-bottom:6px;"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Descricao</label>'
      +'<textarea id="tp-edit-descricao-'+t.id+'" rows="2" style="font-size:13px;resize:vertical;">'+(t.descricao||'')+'</textarea></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">'
      +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Responsavel</label>'
      +'<select id="tp-edit-resp-'+t.id+'" style="font-size:13px;">'+respOpts+'</select></div>'
      +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Inicio</label>'
      +'<input id="tp-edit-inicio-'+t.id+'" type="date" value="'+(t.data_inicio||'')+'" style="font-size:13px;"/></div>'
      +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Encerramento</label>'
      +'<input id="tp-edit-fim-'+t.id+'" type="date" value="'+(t.data_fim||'')+'" style="font-size:13px;"/></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
      +'<button onclick="_cancelarEditTarefaPauta(\''+t.id+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_salvarEditTarefaPauta(\''+t.id+'\')" class="btn" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
  }

  // bloco expandido: checklist + campo de adicionar subtarefa + comentarios
  if(subExp){
    html+='<div class="cl cl-subtasks">';
    html+='<div class="subboard">';
    var _temSubs=subtarefas&&subtarefas.length>0;
    if(_temSubs){
      html+='<div class="subcols"><span>Subtarefa</span><span>Resp.</span><span>Status</span><span>Prazo</span><span></span></div>';
    }
    if(_temSubs){
      subtarefas.forEach(function(s){
        var sBg=statusTarefaCor(s.status,'#FCEBEB');
        var sTxt='#fff';
        var sBar=statusTarefaCor(s.status,'#E24B4A');
        var sLbl=statusTarefaLabel(s.status);
        if(_subEditando===s.id){
          var sStatOpts=statusTarefaOptions(s.status,false);
          var sRespOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(sr){return '<option value="'+sr+'"'+(s.responsavel===sr?' selected':'')+'>'+sr+'</option>';}).join("");
          html+='<div class="rt-edit-form" style="margin:6px 0;">'
            +'<div class="field" style="margin-bottom:5px;"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Nome</label>'
            +'<input id="tp-sub-edit-titulo-'+s.id+'" value="'+s.texto.replace(/"/g,"&quot;")+'" style="font-size:12px;"/></div>'
            +'<div class="field" style="margin-bottom:5px;"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Descricao</label>'
            +'<textarea id="tp-sub-edit-desc-'+s.id+'" rows="2" style="font-size:12px;resize:vertical;">'+(s.descricao||'')+'</textarea></div>'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;">'
            +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Status</label>'
            +'<select id="tp-sub-edit-status-'+s.id+'" style="font-size:12px;">'+sStatOpts+'</select></div>'
            +'<div class="field"><label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Responsavel</label>'
            +'<select id="tp-sub-edit-resp-'+s.id+'" style="font-size:12px;">'+sRespOpts+'</select></div>'
            +'</div>'
            +'<div style="display:flex;gap:5px;justify-content:flex-end;">'
            +'<button onclick="_cancelarEditSubtarefaPauta(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')" style="font-size:11px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
            +'<button onclick="_salvarEditSubtarefaPauta(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')" class="btn" style="font-size:11px;">Salvar</button>'
            +'</div></div>';
        } else {
          html+='<div class="subrow"'+(canEdit?' onpointerdown="_tarefaDragStart(event,\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" title="Arraste para o lado para alterar status"':'')+'>';
          html+='<div class="subcell subcell-name"><span class="subdot" style="background:'+sBar+';"></span><div class="subname-wrap">';
          html+='<span id="tp-stxt-'+s.id+'" class="subname'+(statusTarefaFinalizador(s.status)?' done':'')+'"'+(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_iniciarEdicaoTitulo(\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" title="Clique para editar"':'')+'>'+s.texto+'</span>';
          if(s.descricao){
            html+='<span id="tp-sdesc-'+s.id+'" class="subdesc"'+(canEdit?' style="cursor:text;" onclick="_iniciarEdicaoDescricaoSub(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')"':'')+'>'+s.descricao+'</span>';
          } else if(canEdit){
            html+='<span id="tp-sdesc-'+s.id+'" class="subdesc subdesc-add" onclick="_iniciarEdicaoDescricaoSub(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')">+ descricao</span>';
          }
          html+='</div></div>';
          html+='<div id="tp-sresp-'+s.id+'" class="subcell subcell-resp'+(canEdit?' inline-edit-hit':'')+'"'
            +(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_abrirRespInline(\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" title="Clique para editar responsavel"':'')+'>';
          if(s.responsavel){
            var su=(usuariosFullDB||[]).find(function(x){return x.sigla===s.responsavel;})||{};
            html+='<span class="av av-sm" style="background:'+_avCor(su.id||s.responsavel)+';font-size:9px;width:22px;height:22px;min-width:22px;flex-shrink:0;">'+s.responsavel.slice(0,2).toUpperCase()+'</span><span class="subresp-nm">'+s.responsavel+'</span>';
          } else { html+='<span class="bdash">&#8212;</span>'; }
          html+='</div>';
          html+='<div class="subcell subcell-status"><span class="substat" style="background:'+sBar+';'+(canEdit?'cursor:pointer;':'')+'"'+(canEdit?' onclick="_abrirStatusDropdown(event,\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')"':'')+'>'+sLbl+(canEdit?' <span class="cv">&#9660;</span>':'')+'</span></div>';
          var sAtrasado=s.data_fim&&_isAtrasado(s.data_fim,s.status);
          var sConcEm=statusTarefaConclusaoEm(s);
          html+='<div id="tp-sdate-'+s.id+'" class="subcell subcell-date'+(sAtrasado?' late':'')+(canEdit?' inline-edit-hit':'')+'"'
            +(canEdit?' style="cursor:pointer;" onclick="event.stopPropagation();_abrirPrazoInline(\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" title="Clique para editar prazo"':'')+'>'
            +(sConcEm?'<span style="color:#16a34a;font-weight:700;">'+statusTarefaFmtData(sConcEm)+'</span>':(s.data_fim?_fmtDateBrShort(s.data_fim)+(sAtrasado?' &#128336;':''):'<span class="bdash">&#8212;</span>'))+'</div>';
          html+='<div class="subcell subcell-menu">'+(canEdit?'<button onclick="_abrirMenuTarefa(event,\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" class="rt-menu-btn" title="Acoes">&#8943;</button>':'')+'</div>';
          html+='</div>';
          var subCols=_colunasTarefaSnapshot();
          if(subCols.length){
            var valsSub=s.campos_valores||{};
            html+='<div class="tcols sub-tcols" style="margin:4px 0 8px 28px;">';
            subCols.forEach(function(col){
              var editandoSub=_tcolEditando[s.id]===col.id;
              html+='<div class="tcol'+(ce&&!ehPassado?' editavel':'')+'"'+(ce&&!ehPassado&&!editandoSub?' onclick="_subcolAbrir(\''+s.id+'\',\''+t.id+'\',\''+col.id+'\','+!!ehPassado+')"':'')+'>'
                +'<div class="tcol-lbl">'+col.label+'</div>'
                +'<div class="tcol-val">'+(editandoSub?_subcolRenderEditor(col,valsSub[col.id],s.id,t.id,ehPassado):_tcolRenderVal(col,valsSub[col.id]))+'</div>'
                +'</div>';
            });
            html+='</div>';
          }
        }
      });
    }
    if(ce&&!ehPassado){
      var respOptsQuick='<option value="">Resp...</option>'+(responsaveis||[]).map(function(sg){return '<option value="'+sg+'">'+sg+'</option>';}).join("");
      html+='<div class="subadd"><input id="tp-sub-quick-txt-'+t.id+'" placeholder="+ Adicionar subtarefa..." onkeydown="_quickSubKeydown(event,\''+t.id+'\','+!!ehPassado+')"><select id="tp-sub-quick-resp-'+t.id+'">'+respOptsQuick+'</select></div>';
    } else if(!_temSubs){
      html+='<div class="subempty">Nenhuma subtarefa.</div>';
    }
    html+='</div>';
    html+='</div>';

    // comentarios da tarefa
    html+='<div id="tp-cmts-'+t.id+'" class="cmts">';
    html+='<div class="cl-lbl">Comentários</div>';
    if(cmts===null){html+='<div style="font-size:11px;color:var(--text3);padding:4px 0;">Carregando comentarios...</div>';}
    else{html+=_buildTarefaCmtsHTML(cmts,t.id,ce,ehPassado);}
    html+='</div>';
  }

  if(_temExp){html+='</div>';}// fecha brow-exp
  return html;
}
function _editarTarefaPauta(tarefaId){
  _itemEditando=tarefaId;
  _reloadTarefaCard(tarefaId,false);
}
function _cancelarEditTarefaPauta(tarefaId){
  _itemEditando=null;
  _reloadTarefaCard(tarefaId,false);
}
async function _salvarEditTarefaPauta(tarefaId){
  var texto=(document.getElementById("tp-edit-titulo-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe o titulo",true);return;}
  var descricao=(document.getElementById("tp-edit-descricao-"+tarefaId).value||"").trim()||null;
  var resp=document.getElementById("tp-edit-resp-"+tarefaId).value||null;
  var status=document.getElementById("tp-edit-status-"+tarefaId).value||"pendente";
  var inicio=document.getElementById("tp-edit-inicio-"+tarefaId).value||null;
  var fim=document.getElementById("tp-edit-fim-"+tarefaId).value||null;
  try{
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    var atualTarefa=(_tarefasPautaCache[rId]||[]).find(function(t){return t.id===tarefaId;})||{};
    var patchTarefa=normalizarStatusTarefa({id:tarefaId,texto:texto,descricao:descricao,responsavel:resp,status:status,data_inicio:inicio||null,data_fim:fim||null,campos_valores:atualTarefa.campos_valores||{}},status);
    await dbUpsertTarefa(patchTarefa);
    (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId){Object.assign(t,patchTarefa);}});
    _itemEditando=null;
    _reloadTarefaCard(tarefaId,false);
    toast("Tarefa salva!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function _excluirTarefaPauta(tarefaId){
  var reuniaoId=reuniaoAtiva?reuniaoAtiva.id:'';
  modalConfirm("Excluir esta tarefa?",async function(){
    try{
      await dbDelTarefa(tarefaId);
      _tarefasPautaCache[reuniaoId]=(_tarefasPautaCache[reuniaoId]||[]).filter(function(t){return t.id!==tarefaId;});
      delete _subtarefasCache[tarefaId];
      var el=document.getElementById("tp-card-"+tarefaId);if(el)el.remove();
      toast("Tarefa excluida!");
    }catch(_){toast("Erro",true);}
  });
}
function _reloadTarefaCard(tarefaId,ehPassado){
  var el=document.getElementById("tp-card-"+tarefaId);if(!el)return;
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});if(!t)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
}
async function _toggleSubExpand(tarefaId,ehPassado){
  if(tarefaId in _subtarefasCache){
    _subCollapsed[tarefaId]=!_subCollapsed[tarefaId];
    _reloadTarefaCard(tarefaId,ehPassado);
  } else {
    try{
      _subtarefasCache[tarefaId]=await dbFetchSubtarefas(tarefaId);
      _subCollapsed[tarefaId]=false;
      try{_tarefaCmtsCache[tarefaId]=await dbFetchTarefaComentarios(tarefaId);}catch(_){_tarefaCmtsCache[tarefaId]=[];}
      _reloadTarefaCard(tarefaId,ehPassado);
    }catch(_){toast("Erro ao carregar subtarefas",true);}
  }
}
function _editarSubtarefaPauta(subId,parentId,ehPassado){
  _subEditando=subId;
  _reloadTarefaCard(parentId,ehPassado);
}
function _cancelarEditSubtarefaPauta(subId,parentId,ehPassado){
  _subEditando=null;
  _reloadTarefaCard(parentId,ehPassado);
}
async function _salvarEditSubtarefaPauta(subId,parentId,ehPassado){
  var texto=(document.getElementById("tp-sub-edit-titulo-"+subId).value||"").trim();
  if(!texto){toast("Informe o nome",true);return;}
  var descEl=document.getElementById("tp-sub-edit-desc-"+subId);
  var descricao=(descEl?descEl.value||"":"").trim()||null;
  var status=document.getElementById("tp-sub-edit-status-"+subId).value||"pendente";
  var respSubEdit=document.getElementById("tp-sub-edit-resp-"+subId);
  var respSE=respSubEdit?respSubEdit.value||null:null;
  try{
    var atualSub=(_subtarefasCache[parentId]||[]).find(function(s){return s.id===subId;})||{};
    var patchSub=normalizarStatusTarefa({id:subId,texto:texto,descricao:descricao,status:status,responsavel:respSE||null,campos_valores:atualSub.campos_valores||{}},status);
    await dbUpsertTarefa(patchSub);
    (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===subId){Object.assign(s,patchSub);}});
    _subEditando=null;
    _reloadTarefaCard(parentId,ehPassado);
    toast("Subtarefa salva!");
  }catch(_){toast("Erro ao salvar",true);}
}
async function _showAddSubtarefaPauta(parentId,ehPassado){
  if(!(parentId in _subtarefasCache)){
    try{_subtarefasCache[parentId]=await dbFetchSubtarefas(parentId);}catch(_){_subtarefasCache[parentId]=[];}
    _reloadTarefaCard(parentId,ehPassado);
  }
  var el=document.getElementById("tp-add-sub-"+parentId);if(!el)return;
  el.style.display='flex';
  var respOptsSub='<option value="">Responsável...</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join("");
  el.innerHTML='<input id="tp-sub-titulo-'+parentId+'" placeholder="Titulo da subtarefa..." style="flex:1;font-size:12px;padding:3px 7px;border:1.5px solid var(--bt-orange);border-radius:5px;min-width:100px;"/>'
    +'<select id="tp-sub-resp-'+parentId+'" style="font-size:11px;padding:3px 5px;border:1px solid var(--border);border-radius:5px;color:var(--text2);">'+respOptsSub+'</select>'
    +'<button onclick="_salvarSubtarefaPauta(\''+parentId+'\','+!!ehPassado+')" class="btn" style="font-size:11px;padding:3px 9px;">Ok</button>'
    +'<button onclick="_cancelarAddSubtarefaPauta(\''+parentId+'\','+!!ehPassado+')" style="font-size:11px;padding:3px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">x</button>';
  var inp=document.getElementById("tp-sub-titulo-"+parentId);if(inp)inp.focus();
}
function _cancelarAddSubtarefaPauta(parentId,ehPassado){
  var el=document.getElementById("tp-add-sub-"+parentId);if(!el)return;
  el.style.display='none';
  el.innerHTML='';
}
async function _salvarSubtarefaPauta(parentId,ehPassado){
  var inp=document.getElementById("tp-sub-titulo-"+parentId);
  var texto=(inp?inp.value||"":"").trim();
  if(!texto){toast("Informe o titulo",true);return;}
  var respElSub=document.getElementById("tp-sub-resp-"+parentId);
  var respSub=respElSub?respElSub.value||null:null;
  var rId=reuniaoAtiva?reuniaoAtiva.id:null;
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var payload={id:uid(),texto:texto,status:'pendente',responsavel:respSub||null,criado_em:new Date().toISOString()};
    if(parentId)payload.parent_id=parentId;
    if(rId)payload.reuniao_id=rId;
    if(eqId)payload.equipe_id=eqId;
    await dbUpsertTarefa(payload);
    await notificarTarefaReuniao(payload.id,respSub,texto,rId);
    _subtarefasCache[parentId]=await dbFetchSubtarefas(parentId);
    _reloadTarefaCard(parentId,ehPassado);
    toast("Subtarefa adicionada!");
  }catch(_){toast("Erro ao salvar subtarefa",true);}
}
async function _excluirSubtarefaPauta(subId,parentId,ehPassado){
  modalConfirm("Excluir esta subtarefa?",async function(){
    try{
      await dbDelTarefa(subId);
      _subtarefasCache[parentId]=(_subtarefasCache[parentId]||[]).filter(function(s){return s.id!==subId;});
      _reloadTarefaCard(parentId,ehPassado);
      toast("Subtarefa excluida!");
    }catch(_){toast("Erro ao excluir",true);}
  });
}
function _quickSubKeydown(evt,parentId,ehPassado){
  if(evt.key==='Enter'){evt.preventDefault();_quickSaveSubtarefa(parentId,ehPassado);}
  else if(evt.key==='Escape'){
    var inp=document.getElementById('tp-sub-quick-txt-'+parentId);
    if(inp){inp.value='';inp.blur();}
  }
}
async function _quickSaveSubtarefa(parentId,ehPassado){
  var inp=document.getElementById('tp-sub-quick-txt-'+parentId);
  var respEl=document.getElementById('tp-sub-quick-resp-'+parentId);
  if(!inp)return;
  var texto=inp.value.trim();if(!texto)return;
  var resp=(respEl?respEl.value||null:null);
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var parentT=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===parentId;});
  try{
    var nova={id:uid(),texto:texto,responsavel:resp||null,status:'pendente',criado_em:new Date().toISOString()};
    if(parentId)nova.parent_id=parentId;
    if(rId)nova.reuniao_id=rId;
    if(eqId)nova.equipe_id=eqId;
    await dbUpsertTarefa(nova);
    await notificarTarefaReuniao(nova.id,resp,texto,rId);
    if(!_subtarefasCache[parentId])_subtarefasCache[parentId]=[];
    _subtarefasCache[parentId].push(nova);
    inp.value='';
    if(respEl)respEl.value='';
    _reloadTarefaCard(parentId,ehPassado);
    toast("Subtarefa adicionada!");
  }catch(_){toast("Erro ao adicionar subtarefa",true);}
}
function _cmtKeydown(evt,tarefaId,ehPassado){
  if(evt.key==='Enter'&&!evt.shiftKey){evt.preventDefault();_addTarefaComentario(tarefaId,ehPassado);}
}

// ── EDICAO INLINE DE TITULO ──
var _tituloEsc=false;
function _inlineHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function _inlineActions(saveCall,cancelCall){
  return '<span class="rt-inline-actions inline-edit-hit">'
    +'<button type="button" class="rt-inline-action rt-inline-save" onmousedown="event.preventDefault()" onclick="event.stopPropagation();'+saveCall+'" title="Salvar">'+ic("check")+'</button>'
    +'<button type="button" class="rt-inline-action rt-inline-cancel" onmousedown="event.preventDefault()" onclick="event.stopPropagation();'+cancelCall+'" title="Cancelar">'+ic("close")+'</button>'
    +'</span>';
}
function _iniciarEdicaoTitulo(tarefaId,isSub,parentId,ehPassado){
  var elId=isSub?'tp-stxt-'+tarefaId:'tp-txt-'+tarefaId;
  var el=document.getElementById(elId);if(!el)return;
  var tex=(el.innerText||el.textContent||'').replace(/\n/g,'').trim();
  _tituloEsc=false;
  el.innerHTML='<span class="rt-inline-editor rt-inline-title inline-edit-hit">'
    +'<input id="tp-tit-inp-'+tarefaId+'" type="text" value="'+_inlineHtml(tex)+'" class="rt-inline-control"'
    +' onkeydown="_tituloKeydown(event,\''+tarefaId+'\','+!!isSub+',\''+(parentId||'')+'\','+!!ehPassado+')"'
    +' />'
    +_inlineActions("_doSaveTitulo('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")","_cancelarTituloInline('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")")
    +'</span>';
  var inp=document.getElementById('tp-tit-inp-'+tarefaId);
  if(inp){inp.focus();inp.select();}
}
function _tituloKeydown(e,tarefaId,isSub,parentId,ehPassado){
  if(e.key==='Enter'){e.preventDefault();_tituloEsc=true;_doSaveTitulo(tarefaId,isSub,parentId,ehPassado);}
  else if(e.key==='Escape'){_tituloEsc=true;_cancelarTituloInline(tarefaId,isSub,parentId,ehPassado);}
}
async function _salvarTituloInline(tarefaId,isSub,parentId,ehPassado){
  if(_tituloEsc){_tituloEsc=false;return;}
  await _doSaveTitulo(tarefaId,isSub,parentId,ehPassado);
}
async function _doSaveTitulo(tarefaId,isSub,parentId,ehPassado){
  var inp=document.getElementById('tp-tit-inp-'+tarefaId);
  if(!inp)return;
  var texto=inp.value.trim();
  if(!texto){_cancelarTituloInline(tarefaId,isSub,parentId,ehPassado);return;}
  try{
    await dbUpsertTarefa({id:tarefaId,texto:texto});
    if(isSub&&parentId){
      (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===tarefaId)s.texto=texto;});
      _reloadTarefaCard(parentId,ehPassado);
    } else {
      var rId=reuniaoAtiva?reuniaoAtiva.id:'';
      (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId)t.texto=texto;});
      _reloadTarefaCard(tarefaId,ehPassado);
    }
    toast('Titulo salvo!');
    (function(fId){setTimeout(function(){
      var fe=document.getElementById(fId);
      if(fe&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches){
        fe.style.transition='background-color .3s ease';fe.style.backgroundColor='#D1FAE5';
        setTimeout(function(){fe.style.transition='background-color .6s ease';fe.style.backgroundColor='';},800);
      }
    },20);})(isSub?'tp-stxt-'+tarefaId:'tp-txt-'+tarefaId);
  }catch(_){toast('Erro ao salvar',true);_cancelarTituloInline(tarefaId,isSub,parentId,ehPassado);}
}
function _cancelarTituloInline(tarefaId,isSub,parentId,ehPassado){
  _tituloEsc=false;
  if(isSub&&parentId)_reloadTarefaCard(parentId,ehPassado);
  else _reloadTarefaCard(tarefaId,ehPassado);
}

// ── EDICAO INLINE DE DESCRICAO DE SUBTAREFA ──
var _descEsc=false;
function _iniciarEdicaoDescricaoSub(subId,parentId,ehPassado){
  var el=document.getElementById('tp-sdesc-'+subId);if(!el)return;
  var tex=(el.innerText||el.textContent||'').replace(/^Adicionar descricao\.\.\.$/,'').trim();
  _descEsc=false;
  el.innerHTML='<span class="rt-inline-editor rt-inline-desc inline-edit-hit">'
    +'<textarea id="tp-sdesc-ta-'+subId+'" rows="3" class="rt-inline-control"'
    +' onkeydown="_descKeydown(event,\''+subId+'\',\''+parentId+'\','+!!ehPassado+')"'
    +'>'+_inlineHtml(tex)+'</textarea>'
    +_inlineActions("_doSaveDescricaoSub('"+subId+"','"+parentId+"',"+!!ehPassado+")","_cancelarDescricaoSub('"+subId+"','"+parentId+"',"+!!ehPassado+")")
    +'</span>';
  var ta=document.getElementById('tp-sdesc-ta-'+subId);
  if(ta){ta.focus();var l=ta.value.length;ta.setSelectionRange(l,l);}
}
function _descKeydown(e,subId,parentId,ehPassado){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();_descEsc=true;_doSaveDescricaoSub(subId,parentId,ehPassado);}
  else if(e.key==='Escape'){_descEsc=true;_cancelarDescricaoSub(subId,parentId,ehPassado);}
}
async function _salvarDescricaoSub(subId,parentId,ehPassado){
  if(_descEsc){_descEsc=false;return;}
  await _doSaveDescricaoSub(subId,parentId,ehPassado);
}
async function _doSaveDescricaoSub(subId,parentId,ehPassado){
  var ta=document.getElementById('tp-sdesc-ta-'+subId);
  if(!ta)return;
  var descricao=ta.value.trim()||null;
  try{
    await dbUpsertTarefa({id:subId,descricao:descricao});
    (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===subId)s.descricao=descricao;});
    _reloadTarefaCard(parentId,ehPassado);
    toast('Descricao salva!');
  }catch(_){toast('Erro ao salvar',true);_cancelarDescricaoSub(subId,parentId,ehPassado);}
}
function _cancelarDescricaoSub(subId,parentId,ehPassado){
  _descEsc=false;
  _reloadTarefaCard(parentId,ehPassado);
}

// ── EDICAO INLINE DE DESCRICAO DE TAREFA PRINCIPAL ──
var _descMainEsc=false;
function _iniciarEdicaoDescricaoMain(tarefaId,ehPassado){
  var el=document.getElementById('tp-desc-'+tarefaId);if(!el)return;
  var tex=(el.innerText||el.textContent||'').replace(/^Adicionar descricao\.\.\.$/,'').trim();
  _descMainEsc=false;
  el.innerHTML='<div class="rt-inline-editor rt-inline-desc rt-inline-desc-main inline-edit-hit">'
    +'<textarea id="tp-desc-ta-'+tarefaId+'" rows="4" class="rt-inline-control"'
    +' onkeydown="_descMainKeydown(event,\''+tarefaId+'\','+!!ehPassado+')"'
    +'>'+_inlineHtml(tex)+'</textarea>'
    +_inlineActions("_doSaveDescricaoMain('"+tarefaId+"',"+!!ehPassado+")","_cancelarDescricaoMain('"+tarefaId+"',"+!!ehPassado+")")
    +'</div>';
  var ta=document.getElementById('tp-desc-ta-'+tarefaId);
  if(ta){ta.focus();var l=ta.value.length;ta.setSelectionRange(l,l);}
}
function _descMainKeydown(e,tarefaId,ehPassado){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();_descMainEsc=true;_doSaveDescricaoMain(tarefaId,ehPassado);}
  else if(e.key==='Escape'){_descMainEsc=true;_cancelarDescricaoMain(tarefaId,ehPassado);}
}
async function _salvarDescricaoMain(tarefaId,ehPassado){
  if(_descMainEsc){_descMainEsc=false;return;}
  await _doSaveDescricaoMain(tarefaId,ehPassado);
}
async function _doSaveDescricaoMain(tarefaId,ehPassado){
  var ta=document.getElementById('tp-desc-ta-'+tarefaId);
  if(!ta)return;
  var descricao=ta.value.trim()||null;
  try{
    await dbUpsertTarefa({id:tarefaId,descricao:descricao});
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId)t.descricao=descricao;});
    _reloadTarefaCard(tarefaId,ehPassado);
    toast('Descricao salva!');
  }catch(_){toast('Erro ao salvar',true);_cancelarDescricaoMain(tarefaId,ehPassado);}
}
function _cancelarDescricaoMain(tarefaId,ehPassado){
  _descMainEsc=false;
  _reloadTarefaCard(tarefaId,ehPassado);
}

// ── STATUS DROPDOWN DE TAREFA ──
// Edicao direta de campos simples no board de tarefas
function _getTarefaBoardCache(tarefaId,isSub,parentId){
  if(isSub&&parentId)return (_subtarefasCache[parentId]||[]).find(function(s){return s.id===tarefaId;})||null;
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  return (_tarefasPautaCache[rId]||[]).find(function(t){return t.id===tarefaId;})||null;
}
function _patchTarefaBoardCache(tarefaId,isSub,parentId,patch){
  var item=_getTarefaBoardCache(tarefaId,isSub,parentId);
  if(item)Object.assign(item,patch);
}
function _reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado){
  if(isSub&&parentId)_reloadTarefaCard(parentId,ehPassado);
  else _reloadTarefaCard(tarefaId,ehPassado);
}
function _abrirRespInline(tarefaId,isSub,parentId,ehPassado){
  if(ehPassado)return;
  var el=document.getElementById(isSub?'tp-sresp-'+tarefaId:'tp-resp-'+tarefaId);if(!el)return;
  var t=_getTarefaBoardCache(tarefaId,isSub,parentId)||{};
  el.removeAttribute("onclick");
  el.removeAttribute("title");
  var opts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(t.responsavel===s?' selected':'')+'>'+s+'</option>';}).join("");
  el.innerHTML='<div class="rt-inline-editor rt-inline-select inline-edit-hit">'
    +'<select id="tp-resp-sel-'+tarefaId+'" class="rt-inline-control"'
    +' onclick="event.stopPropagation()"'
    +' onkeydown="_respInlineKey(event,\''+tarefaId+'\','+!!isSub+',\''+(parentId||'')+'\','+!!ehPassado+')">'+opts+'</select>'
    +_inlineActions("_salvarRespInline('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")","_reloadTarefaOuSub('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")")
    +'</div>';
  var sel=document.getElementById('tp-resp-sel-'+tarefaId);if(sel)sel.focus();
}
function _respInlineKey(e,tarefaId,isSub,parentId,ehPassado){
  if(e.key==='Enter'){e.preventDefault();_salvarRespInline(tarefaId,isSub,parentId,ehPassado);}
  else if(e.key==='Escape'){e.preventDefault();_reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);}
}
async function _salvarRespInline(tarefaId,isSub,parentId,ehPassado){
  var sel=document.getElementById('tp-resp-sel-'+tarefaId);if(!sel)return;
  var resp=sel.value||null;
  try{
    await dbUpsertTarefa({id:tarefaId,responsavel:resp});
    _patchTarefaBoardCache(tarefaId,isSub,parentId,{responsavel:resp});
    _reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);
    toast("Responsavel salvo!");
  }catch(_){
    toast("Erro ao salvar responsavel",true);
    _reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);
  }
}
function _abrirPrazoInline(tarefaId,isSub,parentId,ehPassado){
  if(ehPassado)return;
  var el=document.getElementById(isSub?'tp-sdate-'+tarefaId:'tp-date-'+tarefaId);if(!el)return;
  var t=_getTarefaBoardCache(tarefaId,isSub,parentId)||{};
  el.removeAttribute("onclick");
  el.removeAttribute("title");
  el.innerHTML='<div class="rt-inline-editor rt-inline-date inline-edit-hit">'
    +'<input id="tp-date-inp-'+tarefaId+'" class="rt-inline-control" type="date" value="'+(t.data_fim||'')+'"'
    +' onclick="event.stopPropagation()"'
    +' onkeydown="_prazoInlineKey(event,\''+tarefaId+'\','+!!isSub+',\''+(parentId||'')+'\','+!!ehPassado+')">'
    +_inlineActions("_salvarPrazoInline('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")","_reloadTarefaOuSub('"+tarefaId+"',"+!!isSub+",'"+(parentId||"")+"',"+!!ehPassado+")")
    +'</div>';
  var inp=document.getElementById('tp-date-inp-'+tarefaId);if(inp)inp.focus();
}
function _prazoInlineKey(e,tarefaId,isSub,parentId,ehPassado){
  if(e.key==='Enter'){e.preventDefault();_salvarPrazoInline(tarefaId,isSub,parentId,ehPassado);}
  else if(e.key==='Escape'){e.preventDefault();_reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);}
}
async function _salvarPrazoInline(tarefaId,isSub,parentId,ehPassado){
  var inp=document.getElementById('tp-date-inp-'+tarefaId);if(!inp)return;
  var data=inp.value||null;
  try{
    await dbUpsertTarefa({id:tarefaId,data_fim:data});
    _patchTarefaBoardCache(tarefaId,isSub,parentId,{data_fim:data});
    _reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);
    toast("Prazo salvo!");
  }catch(_){
    toast("Erro ao salvar prazo",true);
    _reloadTarefaOuSub(tarefaId,isSub,parentId,ehPassado);
  }
}

var _dragTarefaState=null;
function _tarefaStatusAtual(tarefaId,isSub,parentId){
  if(isSub&&parentId){
    var sub=(_subtarefasCache[parentId]||[]).find(function(s){return s.id===tarefaId;});
    return sub?sub.status:"pendente";
  }
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
  return t?t.status:"pendente";
}
function _statusPorArrasto(status,delta){
  var ordem=statusTarefaOrdem();
  if(!ordem.length)ordem=["pendente","em_andamento","pausado","concluido"];
  var idx=ordem.indexOf(status);
  if(idx<0)idx=0;
  if(delta>0)idx=Math.min(ordem.length-1,idx+1);
  else idx=Math.max(0,idx-1);
  return ordem[idx];
}
function _tarefaDragStart(ev,tarefaId,isSub,parentId,ehPassado){
  if(ehPassado)return;
  var alvo=ev.target;
  if(alvo&&alvo.closest&&alvo.closest("button,input,textarea,select,a,.statcell,.substat,.rt-menu-btn,.inline-edit-hit"))return;
  var row=alvo&&alvo.closest?(alvo.closest(".brow")||alvo.closest(".subrow")):null;
  if(!row)return;
  _dragTarefaState={id:tarefaId,isSub:!!isSub,parentId:parentId||null,ehPassado:!!ehPassado,startX:ev.clientX,row:row,moved:false};
  row.setPointerCapture&&row.setPointerCapture(ev.pointerId);
  row.style.transition="none";
  row.addEventListener("pointermove",_tarefaDragMove);
  row.addEventListener("pointerup",_tarefaDragEnd);
  row.addEventListener("pointercancel",_tarefaDragCancel);
}
function _tarefaDragMove(ev){
  if(!_dragTarefaState)return;
  var dx=ev.clientX-_dragTarefaState.startX;
  if(Math.abs(dx)>6)_dragTarefaState.moved=true;
  var lim=Math.max(-110,Math.min(110,dx));
  _dragTarefaState.row.style.transform="translateX("+lim+"px)";
  _dragTarefaState.row.style.opacity=String(1-Math.min(0.22,Math.abs(lim)/500));
}
async function _tarefaDragEnd(ev){
  if(!_dragTarefaState)return;
  var st=_dragTarefaState;
  var dx=ev.clientX-st.startX;
  _tarefaDragCleanup();
  if(Math.abs(dx)<70)return;
  var atual=_tarefaStatusAtual(st.id,st.isSub,st.parentId);
  var novo=_statusPorArrasto(atual,dx);
  if(novo!==atual)await _alterarStatusTarefa(st.id,novo,st.isSub,st.parentId,st.ehPassado);
}
function _tarefaDragCancel(){
  _tarefaDragCleanup();
}
function _tarefaDragCleanup(){
  if(!_dragTarefaState)return;
  var row=_dragTarefaState.row;
  row.removeEventListener("pointermove",_tarefaDragMove);
  row.removeEventListener("pointerup",_tarefaDragEnd);
  row.removeEventListener("pointercancel",_tarefaDragCancel);
  row.style.transition="transform .16s ease, opacity .16s ease";
  row.style.transform="";
  row.style.opacity="";
  _dragTarefaState=null;
}

function _abrirStatusDropdown(ev,tarefaId,isSub,parentId,ehPassado){
  var old=document.getElementById("status-dd-wrap");if(old)old.remove();
  var statusList=statusTarefaList(false);
  var top=120,left=120;
  var anchor=ev&&(ev.currentTarget||ev.target);
  if(anchor&&anchor.getBoundingClientRect){var rect=anchor.getBoundingClientRect();top=rect.bottom+4;left=rect.left;}
  left=Math.max(8,Math.min(left,window.innerWidth-170));
  top=Math.min(top,window.innerHeight-180);
  var html='<div id="status-dd-wrap" style="position:fixed;inset:0;z-index:2000;" onclick="document.getElementById(\'status-dd-wrap\').remove();">';
  html+='<div style="position:fixed;top:'+top+'px;left:'+left+'px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);padding:4px;min-width:150px;z-index:2001;" onclick="event.stopPropagation();">';
  statusList.forEach(function(st){
    html+='<div onclick="_alterarStatusTarefa(\''+tarefaId+'\',\''+st.id+'\','+!!isSub+',\''+parentId+'\','+!!ehPassado+')" style="padding:7px 12px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">'
      +'<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+statusTarefaCor(st.id,'#94a3b8')+';flex-shrink:0;"></span>'
      +'<span style="font-size:13px;color:'+statusTarefaCor(st.id,'#475569')+';">'+statusTarefaLabel(st.id)+'</span>'
      +'</div>';
  });
  html+='</div></div>';
  var d=document.createElement("div");d.innerHTML=html;document.body.appendChild(d.firstChild);
}
async function _alterarStatusTarefa(tarefaId,novoStatus,isSub,parentId,ehPassado){
  var sd=document.getElementById("status-dd-wrap");if(sd)sd.remove();
  try{
    if(isSub&&parentId){
      var sub=(_subtarefasCache[parentId]||[]).find(function(s){return s.id===tarefaId;});
      var patchSub=normalizarStatusTarefa({id:tarefaId,status:novoStatus,campos_valores:sub&&sub.campos_valores?sub.campos_valores:{}},novoStatus);
      await dbUpsertTarefa(patchSub);
      (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===tarefaId){s.status=novoStatus;s.campos_valores=patchSub.campos_valores;}});
      _reloadTarefaCard(parentId,ehPassado);
    } else {
      var rId=reuniaoAtiva?reuniaoAtiva.id:'';
      var tarefa=(_tarefasPautaCache[rId]||[]).find(function(t){return t.id===tarefaId;});
      var patchTarefa=normalizarStatusTarefa({id:tarefaId,status:novoStatus,campos_valores:tarefa&&tarefa.campos_valores?tarefa.campos_valores:{}},novoStatus);
      await dbUpsertTarefa(patchTarefa);
      (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId){t.status=novoStatus;t.campos_valores=patchTarefa.campos_valores;}});
      _reloadTarefaCard(tarefaId,ehPassado);
    }
  }catch(_){toast("Erro ao alterar status",true);}
}

// ── MENU DE ACOES DE TAREFA ──
function _abrirMenuTarefa(evt,tarefaId,isSub,parentId,ehPassado){
  evt.stopPropagation();
  var old=document.getElementById("rt-menu-dd");if(old)old.remove();
  var rect=evt.currentTarget.getBoundingClientRect();
  var top=Math.round(rect.bottom+4);
  var left=Math.round(rect.right-160);
  if(left<4)left=4;
  var ce=perfil==="mestre"||perfil==="advogado";
  var html='<div id="rt-menu-dd" style="position:fixed;inset:0;z-index:2000;" onclick="document.getElementById(\'rt-menu-dd\').remove();">';
  html+='<div style="position:fixed;top:'+top+'px;left:'+left+'px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);padding:4px;min-width:160px;z-index:2001;" onclick="event.stopPropagation();">';
  if(isSub){
    html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();_editarSubtarefaPauta(\''+tarefaId+'\',\''+parentId+'\','+!!ehPassado+')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:var(--text2);" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">Editar</div>';
    if(ce&&!ehPassado){
      html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();openDuplicarSubtarefa(\''+tarefaId+'\',\''+parentId+'\')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:var(--text2);" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">Duplicar</div>';
    }
    html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();_excluirSubtarefaPauta(\''+tarefaId+'\',\''+parentId+'\','+!!ehPassado+')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:#dc2626;" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'\'">Excluir</div>';
  } else {
    html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();_editarTarefaPauta(\''+tarefaId+'\')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:var(--text2);" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">Editar</div>';
    if(ce&&!ehPassado){
      html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();openDuplicarTarefa(\''+tarefaId+'\')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:var(--text2);" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">Duplicar</div>';
    }
    html+='<div onclick="document.getElementById(\'rt-menu-dd\').remove();_excluirTarefaPauta(\''+tarefaId+'\')" style="padding:8px 12px;cursor:pointer;border-radius:6px;font-size:13px;color:#dc2626;" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'\'">Excluir</div>';
  }
  html+='</div></div>';
  var d=document.createElement("div");d.innerHTML=html;document.body.appendChild(d.firstChild);
}

// ── COMENTARIOS DE TAREFA ──
async function _toggleTarefaCmts(tarefaId,ehPassado){
  _tarefaCmtsExpanded[tarefaId]=!_tarefaCmtsExpanded[tarefaId];
  var rId=reuniaoAtiva?reuniaoAtiva.id:'';
  var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
  if(!t)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var el=document.getElementById("tp-card-"+tarefaId);if(!el)return;
  el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
  if(_tarefaCmtsExpanded[tarefaId]&&_tarefaCmtsCache[tarefaId]===undefined){
    try{
      _tarefaCmtsCache[tarefaId]=await dbFetchTarefaComentarios(tarefaId);
      el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
    }catch(_){}
  }
}
function _buildTarefaCmtsHTML(cmts,tarefaId,ce,ehPassado){
  var html='';
  if(!cmts.length){
    html+='<div class="pauta-empty">Nenhum comentario ainda.</div>';
  } else {
    cmts.forEach(function(c){
      var u=c.usuarios||{};
      var dt=new Date(c.criado_em);var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre'||perfil==='advogado')&&ce&&!ehPassado;
      var sigla=(u.sigla||u.nome||'?').slice(0,2).toUpperCase();
      var avCor=_avCor(c.usuario_id||sigla);
      html+='<div id="tcmt-'+c.id+'" class="cmt">';
      html+='<div class="av" style="width:30px;height:30px;font-size:11px;background:'+avCor+';flex-shrink:0;">'+sigla+'</div>';
      html+='<div class="cmt-body">';
      html+='<div class="cmt-head">';
      html+='<span class="cmt-nm">'+(u.sigla||u.nome||'?')+'</span>';
      html+='<div style="display:flex;gap:4px;align-items:center;">';
      html+='<span class="cmt-dt">'+dtStr+'</span>';
      if(canEdit)html+='<button onclick="_editTarefaComentarioInline(\''+c.id+'\',\''+tarefaId+'\','+!!ehPassado+')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>';
      if(canEdit)html+='<button onclick="_delTarefaComentario(\''+c.id+'\',\''+tarefaId+'\','+!!ehPassado+')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>';
      html+='</div></div>';
      html+='<div class="cmt-tx">'+c.texto+'</div>';
      html+='</div></div>';
    });
  }
  if(ce&&!ehPassado){
    var myAv=(nomeUser||'').slice(0,2).toUpperCase()||'EU';
    var myAvCor=_avCor(userDbId||myAv);
    html+='<div class="cmt-box">';
    html+='<div class="av" style="width:30px;height:30px;font-size:11px;background:'+myAvCor+';flex-shrink:0;">'+myAv+'</div>';
    html+='<input id="tcmt-new-'+tarefaId+'" placeholder="Comentar..." onkeydown="_cmtKeydown(event,\''+tarefaId+'\','+!!ehPassado+')">';
    html+='<button onclick="_addTarefaComentario(\''+tarefaId+'\','+!!ehPassado+')" class="rbtn rbtn-primary rbtn-sm">Enviar</button>';
    html+='</div>';
  }
  return html;
}
async function _addTarefaComentario(tarefaId,ehPassado){
  var ta=document.getElementById("tcmt-new-"+tarefaId);
  var txt=(ta?ta.value||"":"").trim();if(!txt){toast("Escreva um comentário",true);return;}
  try{
    await dbUpsertTarefaComentario({tarefa_id:tarefaId,usuario_id:userDbId,texto:txt});
    _tarefaCmtsCache[tarefaId]=await dbFetchTarefaComentarios(tarefaId);
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
    var ce=perfil==="mestre"||perfil==="advogado";
    var el=document.getElementById("tp-card-"+tarefaId);
    if(el&&t)el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
    toast("Comentário adicionado!");
  }catch(_){toast("Erro",true);}
}
async function _editTarefaComentarioInline(cId,tarefaId,ehPassado){
  var el=document.getElementById("tcmt-"+cId);if(!el)return;
  try{
    var cmts=await dbFetchTarefaComentarios(tarefaId);
    var c=cmts.find(function(x){return x.id===cId;});if(!c)return;
    el.innerHTML='<div style="display:flex;flex:1;flex-direction:column;gap:4px;padding:4px 0;">'
      +'<textarea id="tcmt-edit-'+cId+'" rows="3" style="font-size:13px;resize:none;border:1px solid var(--border);border-radius:6px;padding:6px 10px;">'+c.texto+'</textarea>'
      +'<div style="display:flex;gap:4px;justify-content:flex-end;">'
      +'<button onclick="_reloadTarefaCmts(\''+tarefaId+'\','+!!ehPassado+')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_saveTarefaComentario(\''+cId+'\',\''+tarefaId+'\','+!!ehPassado+')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
  }catch(_){toast("Erro",true);}
}
async function _saveTarefaComentario(cId,tarefaId,ehPassado){
  var txt=(document.getElementById("tcmt-edit-"+cId).value||"").trim();
  if(!txt){toast("Texto nao pode ser vazio",true);return;}
  try{
    await dbUpsertTarefaComentario({id:cId,texto:txt});
    _reloadTarefaCmts(tarefaId,ehPassado);
    toast("Comentario editado!");
  }catch(_){toast("Erro",true);}
}
function _delTarefaComentario(cId,tarefaId,ehPassado){
  modalConfirm("Excluir este comentario?",async function(){
    try{
      await dbDelTarefaComentario(cId);
      _reloadTarefaCmts(tarefaId,ehPassado);
      toast("Comentario excluido!");
    }catch(_){toast("Erro",true);}
  });
}
async function _reloadTarefaCmts(tarefaId,ehPassado){
  try{
    _tarefaCmtsCache[tarefaId]=await dbFetchTarefaComentarios(tarefaId);
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
    var ce=perfil==="mestre"||perfil==="advogado";
    var el=document.getElementById("tp-card-"+tarefaId);
    if(el&&t)el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
  }catch(_){}
}

// ── COMENTARIOS DA REUNIAO ──
async function _loadReuniaoComentários(reuniaoId){
  var el=document.getElementById("reun-cmts-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var cmts=await dbFetchReuniaoComentarios(reuniaoId);
    el.innerHTML=_buildReuniaoComtsHTML(cmts,reuniaoId,ce,ehPassado);
  }catch(_){if(el)el.innerHTML='';}
}
function _buildReuniaoComtsHTML(cmts,reuniaoId,ce,ehPassado){
  var html='<div style="max-height:300px;overflow-y:auto;padding-right:2px;">';
  if(!cmts.length){html+='<div style="font-size:12px;color:var(--text3);font-style:italic;padding:4px 0;">Nenhum comentário.</div>';}
  else{
    cmts.forEach(function(c){
      var u=c.usuarios||{};var ini=(u.sigla||u.nome||'?').slice(0,2).toUpperCase();
      var corAv=_avCor(u.id||u.nome||'?');
      var dt=new Date(c.criado_em);var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre'||perfil==='advogado')&&ce&&!ehPassado;
      html+='<div id="rcmt-'+c.id+'" style="display:flex;gap:7px;padding:7px 0;border-bottom:1px solid var(--border);">';
      html+='<div class="av av-sm" style="background:'+corAv+';flex-shrink:0;">'+ini+'</div>';
      html+='<div style="flex:1;min-width:0;">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">';
      html+='<span style="font-size:11px;font-weight:700;color:var(--bt-navy);">'+(u.sigla||u.nome||'?')+'</span>';
      html+='<div style="display:flex;gap:3px;align-items:center;">';
      html+='<span style="font-size:10px;color:var(--text3);">'+dtStr+'</span>';
      if(canEdit)html+='<button onclick="_editReuniaoComentarioInline(\''+c.id+'\',\''+reuniaoId+'\')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>';
      if(canEdit)html+='<button onclick="_delReuniaoComentario(\''+c.id+'\',\''+reuniaoId+'\')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>';
      html+='</div></div>';
      html+='<div style="font-size:13px;color:var(--text2);white-space:pre-wrap;line-height:1.5;margin-top:2px;">'+c.texto+'</div>';
      html+='</div></div>';
    });
  }
  html+='</div>';
  if(ce&&!ehPassado){
    var meIni=((nomeUser||'?').slice(0,2).toUpperCase());
    html+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">';
    html+='<div style="display:flex;gap:6px;align-items:flex-start;">';
    html+='<div class="av av-sm" style="background:'+_avCor(userDbId||'')+';flex-shrink:0;">'+meIni+'</div>';
    html+='<textarea id="rcmt-new" rows="2" placeholder="Comentar sobre a reuniao..." style="flex:1;resize:none;font-size:13px;padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;"></textarea>';
    html+='<button onclick="_addReuniaoComentario(\''+reuniaoId+'\')" style="font-size:11px;padding:6px 12px;border-radius:6px;border:none;background:var(--bt-navy);color:#fff;cursor:pointer;flex-shrink:0;">Enviar</button>';
    html+='</div></div>';
  }
  return html;
}
async function _addReuniaoComentario(reuniaoId){
  var ta=document.getElementById("rcmt-new");
  var txt=(ta?ta.value||"":"").trim();if(!txt){toast("Escreva um comentário",true);return;}
  try{
    await dbUpsertReuniaoComentario({reuniao_id:reuniaoId,usuario_id:userDbId,texto:txt});
    _loadReuniaoComentários(reuniaoId);toast("Comentario adicionado!");
  }catch(_){toast("Erro",true);}
}
async function _editReuniaoComentarioInline(cId,reuniaoId){
  var el=document.getElementById("rcmt-"+cId);if(!el)return;
  try{
    var cmts=await dbFetchReuniaoComentarios(reuniaoId);
    var c=cmts.find(function(x){return x.id===cId;});if(!c)return;
    el.innerHTML='<div style="display:flex;flex:1;flex-direction:column;gap:4px;padding:4px 0;">'
      +'<textarea id="rcmt-edit-'+cId+'" rows="3" style="font-size:13px;resize:none;border:1px solid var(--border);border-radius:6px;padding:6px 10px;">'+c.texto+'</textarea>'
      +'<div style="display:flex;gap:4px;justify-content:flex-end;">'
      +'<button onclick="_loadReuniaoComentários(\''+reuniaoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_saveReuniaoComentario(\''+cId+'\',\''+reuniaoId+'\')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
  }catch(_){toast("Erro",true);}
}
async function _saveReuniaoComentario(cId,reuniaoId){
  var txt=(document.getElementById("rcmt-edit-"+cId).value||"").trim();
  if(!txt){toast("Texto nao pode ser vazio",true);return;}
  try{
    await dbUpsertReuniaoComentario({id:cId,texto:txt});
    _loadReuniaoComentários(reuniaoId);toast("Comentario editado!");
  }catch(_){toast("Erro",true);}
}
function _delReuniaoComentario(cId,reuniaoId){
  modalConfirm("Excluir este comentario?",async function(){
    try{await dbDelReuniaoComentario(cId);_loadReuniaoComentários(reuniaoId);toast("Comentario excluido!");}
    catch(_){toast("Erro",true);}
  });
}

// ── SINALIZAR PROJETO ──
async function sinalizarProjeto(projetoId){
  var p=projetosDB.find(function(x){return x.id===projetoId;});
  if(!p){toast("Projeto nao encontrado",true);return;}
  var assunto="[BTDesk] Sinalizacao: "+p.titulo;
  var corpo_html="<h2>Sinalizacao de projeto</h2>"
    +"<p><strong>Projeto:</strong> "+p.titulo+"</p>"
    +(p.descricao?"<p>"+p.descricao+"</p>":"")
    +"<p><strong>Status:</strong> "+p.status.replace("_"," ")+"</p>"
    +"<p><strong>Sinalizado por:</strong> "+nomeUser+"</p>"
    +"<hr/><p style='font-size:12px;color:#888;'>BTDesk - Barcellos Tucunduva Advogados</p>";

  // Busca e-mails dos participantes da reuniao ativa
  var destinatarios=[];
  if(reuniaoAtiva){
    try{
      var parts=await dbFetchReuniaoParticipantes(reuniaoAtiva.id);
      parts.forEach(function(pr){if(pr.usuarios&&pr.usuarios.email)destinatarios.push(pr.usuarios.email);});
    }catch(_){}
  }

  var btn=document.querySelector("[onclick=\"sinalizarProjeto('"+projetoId+"')\"]");
  if(btn){btn.textContent="Sinalizando...";btn.disabled=true;}

  // Registrar comentario de sinalizacao no banco (sempre, independente de e-mail)
  try{
    await dbUpsertProjetoComentario({projeto_id:projetoId,usuario_id:userDbId,texto:"Projeto sinalizado por "+nomeUser+".",tipo:"sinalizado"});
    _commentsCache[projetoId]=await dbFetchProjetoComentarios(projetoId);
    _reloadProjetoCard(projetoId,false);
  }catch(_){}

  // Notificacao interna para participantes da reuniao ativa
  if(reuniaoAtiva){
    try{
      await criarNotifParaParticipantes(reuniaoAtiva.id,"projeto_sinalizado",projetoId,"Projeto sinalizado: "+p.titulo);
      notificacoesDB=await dbFetchNotificacoes();
    }catch(_){}
  }

  // Tentar enviar e-mail (opcional, nao quebra se a Edge Function nao existir)
  if(destinatarios.length){
    try{
      await enviarEmail({destinatarios:destinatarios,assunto:assunto,corpo_html:corpo_html,tipo:"projeto_sinalizado",referencia_id:projetoId});
    }catch(_){}
  }

  toast("Sinalizado!");
  if(btn){btn.textContent="! Sinalizar";btn.disabled=false;}
}

// ── GESTAO DE MODELOS DE REUNIAO ──
var _mfCor='#185FA5';
var _mfIcone='users';
var _mfEditId=null;
var _mfCampos=[];
var _mfColunas=[];
var _MODELO_CORES=['#185FA5','#fa510e','#7c3aed','#16a34a','#d97706','#dc2626','#0e7490','#475569'];
var _MODELO_ICONES=['users','spark','cal','briefcase','tag','bell','check','group','meeting'];
// Retorna o array e o container-id corretos para o contexto ('campos' ou 'colunas')
function _mfCtx(ctx){
  if(ctx==='colunas')return {arr:_mfColunas,listId:'mf-colunas-lista'};
  return {arr:_mfCampos,listId:'mf-campos-lista'};
}
var TIPOS_CAMPO={
  texto:'Texto',
  texto_longo:'Texto longo',
  data:'Data',
  status:'Status',
  responsavel:'Responsável',
  numero:'Número',
  checkbox:'Caixa de seleção',
  link:'Link',
  multi:'Seleção múltipla'
};

function openGerenciarModelos(){
  _modelosAdminContext=false;
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,560px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Modelos de reunião</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="modelos-lista" style="margin-bottom:14px;"></div>'
    +'<div style="display:flex;justify-content:flex-end;">'
    +'<button onclick="openFormModelo()" class="rbtn rbtn-accent rbtn-sm">'+ic("plus")+' Novo modelo</button>'
    +'</div>'
    +'</div></div>';
  _renderModelosLista();
}

function openAdminFormModelo(idOpcional){
  _modelosAdminContext=true;
  if(typeof _estruturaModelosCache!=="undefined"&&_estruturaModelosCache&&_estruturaModelosCache.length)modelosDB=_estruturaModelosCache.slice();
  openFormModelo(idOpcional);
}

function openAdminProjetoModelo(){
  var m=projetoModeloDB||{nome:"Projeto padrão",campos:[]};
  _mfCampos=JSON.parse(JSON.stringify(m.campos||[]));
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,540px);max-height:85vh;overflow-y:auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Modelo de projetos</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="pm-nome" value="'+(m.nome||"Projeto padrão").replace(/"/g,'&quot;')+'"/></div>'
    +'<div class="field">'
    +'<label style="margin-bottom:6px;display:block;">Campos do projeto</label>'
    +'<div id="mf-campos-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>'
    +'<button type="button" onclick="_mfAdicionarCampo(\'campos\')" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar campo</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">'
    +'<button class="btn" onclick="closeModal();renderEstrutura()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="salvarProjetoModelo()">Salvar</button>'
    +'</div>'
    +'</div></div>';
  _mfRenderCampos('campos');
}

async function salvarProjetoModelo(){
  var nome=(document.getElementById("pm-nome").value||"").trim()||"Projeto padrão";
  for(var ci=0;ci<_mfCampos.length;ci++){
    if(!(_mfCampos[ci].label||"").trim()){toast("Preencha o rótulo do campo "+(ci+1),true);return;}
  }
  var data={nome:nome,campos:_mfCampos};
  try{
    projetoModeloDB=await dbSaveProjetoModelo(data);
    closeModal();
    renderEstrutura();
    toast("Modelo de projetos salvo!");
  }catch(e){toast("Erro ao salvar modelo de projetos",true);}
}

function openAdminDemandaModelo(){
  var m=demandaModeloDB||{nome:"Demanda padrão",campos:[]};
  _mfCampos=JSON.parse(JSON.stringify(m.campos||[]));
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,540px);max-height:85vh;overflow-y:auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Modelo de demandas</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="dm-nome" value="'+(m.nome||"Demanda padrão").replace(/"/g,'&quot;')+'"/></div>'
    +'<div class="field">'
    +'<label style="margin-bottom:6px;display:block;">Campos da demanda</label>'
    +'<div id="mf-campos-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>'
    +'<button type="button" onclick="_mfAdicionarCampo(\'campos\')" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar campo</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">'
    +'<button class="btn" onclick="closeModal();renderEstrutura()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="salvarDemandaModelo()">Salvar</button>'
    +'</div>'
    +'</div></div>';
  _mfRenderCampos('campos');
}

async function salvarDemandaModelo(){
  var nome=(document.getElementById("dm-nome").value||"").trim()||"Demanda padrão";
  for(var ci=0;ci<_mfCampos.length;ci++){
    if(!(_mfCampos[ci].label||"").trim()){toast("Preencha o rótulo do campo "+(ci+1),true);return;}
  }
  var data={nome:nome,campos:_mfCampos};
  try{
    demandaModeloDB=await dbSaveDemandaModelo(data);
    closeModal();
    renderEstrutura();
    toast("Modelo de demandas salvo!");
  }catch(e){toast("Erro ao salvar modelo de demandas",true);}
}

function openAdminSubtarefaModelo(){
  var m=subtarefaModeloDB||{nome:"Subtarefa padrão",campos:[]};
  _mfCampos=JSON.parse(JSON.stringify(m.campos||[]));
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,540px);max-height:85vh;overflow-y:auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Modelo de subtarefas</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="sm-nome" value="'+(m.nome||"Subtarefa padrão").replace(/"/g,'&quot;')+'"/></div>'
    +'<div class="field">'
    +'<label style="margin-bottom:6px;display:block;">Campos da subtarefa</label>'
    +'<div id="mf-campos-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>'
    +'<button type="button" onclick="_mfAdicionarCampo(\'campos\')" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar campo</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">'
    +'<button class="btn" onclick="closeModal();renderEstrutura()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="salvarSubtarefaModelo()">Salvar</button>'
    +'</div>'
    +'</div></div>';
  _mfRenderCampos('campos');
}

async function salvarSubtarefaModelo(){
  var nome=(document.getElementById("sm-nome").value||"").trim()||"Subtarefa padrão";
  for(var ci=0;ci<_mfCampos.length;ci++){
    if(!(_mfCampos[ci].label||"").trim()){toast("Preencha o rótulo do campo "+(ci+1),true);return;}
  }
  var data={nome:nome,campos:_mfCampos};
  try{
    subtarefaModeloDB=await dbSaveSubtarefaModelo(data);
    closeModal();
    renderEstrutura();
    toast("Modelo de subtarefas salvo!");
  }catch(e){toast("Erro ao salvar modelo de subtarefas",true);}
}

function _renderModelosLista(){
  var el=document.getElementById("modelos-lista");if(!el)return;
  if(!modelosDB.length){el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:8px 0;">Nenhum modelo cadastrado.</div>';return;}
  el.innerHTML=modelosDB.map(function(m){
    return '<div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);padding:8px 4px;">'
      +'<span style="width:10px;height:10px;border-radius:50%;background:'+m.cor+';flex-shrink:0;display:inline-block;"></span>'
      +'<span style="color:var(--text3);display:flex;align-items:center;">'+ic(m.icone||'users')+'</span>'
      +'<span style="font-size:13px;font-weight:700;color:var(--bt-navy);flex:1;min-width:0;">'+m.nome+'</span>'
      +'<div style="display:flex;gap:4px;flex-shrink:0;">'
      +'<button onclick="openFormModelo(\''+m.id+'\')" class="rbtn rbtn-sm">'+ic("edit")+' Editar</button>'
      +'<button onclick="duplicarModelo(\''+m.id+'\')" class="rbtn rbtn-sm">'+ic("tag")+' Duplicar</button>'
      +'<button onclick="delModelo(\''+m.id+'\')" class="rbtn rbtn-sm rbtn-danger">'+ic("trash")+' Excluir</button>'
      +'</div>'
      +'</div>';
  }).join("");
}

function openFormModelo(idOpcional){
  _mfEditId=idOpcional||null;
  var m=idOpcional?modelosDB.find(function(x){return x.id===idOpcional;}):null;
  _mfCor=(m&&m.cor)||'#185FA5';
  _mfIcone=(m&&m.icone)||'users';
  _mfCampos=m?JSON.parse(JSON.stringify(m.campos||[])):[];
  _mfColunas=m?JSON.parse(JSON.stringify(m.colunas_tarefa||[])):[];
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,540px);max-height:85vh;overflow-y:auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(m?"Editar modelo":"Novo modelo")+'</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="mf-nome" value="'+(m?m.nome.replace(/"/g,'&quot;'):'')+'"/></div>'
    +'<div class="field"><label>Cor</label><div class="mf-swatch-row" id="mf-cores">'
    +_MODELO_CORES.map(function(c){return '<span class="mf-swatch'+(c===_mfCor?' selecionado':'')+'" style="background:'+c+';" onclick="_mfSelecionarCor(\''+c+'\')"></span>';}).join("")
    +'</div></div>'
    +'<div class="field"><label>Ícone</label><div class="mf-ic-row" id="mf-icones">'
    +_MODELO_ICONES.map(function(i){return '<button type="button" class="mf-ic-btn'+(i===_mfIcone?' selecionado':'')+'" onclick="_mfSelecionarIcone(\''+i+'\')">'+ic(i)+'</button>';}).join("")
    +'</div></div>'
    +'<div class="field">'
    +'<label style="margin-bottom:6px;display:block;">Campos da reunião</label>'
    +'<div id="mf-campos-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>'
    +'<button type="button" onclick="_mfAdicionarCampo(\'campos\')" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar campo</button>'
    +'</div>'
    +'<hr style="border:none;border-top:1px solid var(--border);margin:8px 0 14px;"/>'
    +'<div class="field">'
    +'<label style="margin-bottom:4px;display:block;">Colunas das tarefas e subtarefas</label>'
    +'<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">Campos extras exibidos em cada tarefa e subtarefa desta reunião.</div>'
    +'<div id="mf-colunas-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>'
    +'<button type="button" onclick="_mfAdicionarCampo(\'colunas\')" class="rbtn rbtn-sm">'+ic("plus")+' Adicionar coluna</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">'
      +'<button class="btn" onclick="'+(_modelosAdminContext?'closeModal();renderEstrutura()':'openGerenciarModelos()')+'">Cancelar</button>'
      +'<button class="btn btn-primary" onclick="salvarModelo()">Salvar</button>'
    +'</div>'
    +'</div></div>';
  _mfRenderCampos('campos');
  _mfRenderCampos('colunas');
}

function _mfRenderCampos(ctx){
  ctx=ctx||'campos';
  var x=_mfCtx(ctx);
  var arr=x.arr;
  var el=document.getElementById(x.listId);if(!el)return;
  var vazio=ctx==='colunas'?'Nenhuma coluna definida.':'Nenhum campo definido.';
  if(!arr.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:4px 0;">'+vazio+'</div>';return;}
  el.innerHTML=arr.map(function(campo,i){
    var tipoOpts=Object.keys(TIPOS_CAMPO).map(function(t){return '<option value="'+t+'"'+(campo.tipo===t?' selected':'')+'>'+TIPOS_CAMPO[t]+'</option>';}).join("");
    var temOpcoes=campo.tipo==='status'||campo.tipo==='multi';
    var html='<div class="mfc-row" data-idx="'+i+'">'
      +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
      +'<input class="mfc-label" data-idx="'+i+'" value="'+campo.label.replace(/"/g,'&quot;')+'" placeholder="Rótulo *" oninput="_mfCampoLabelInput('+i+',this.value,\''+ctx+'\')" style="flex:1;min-width:120px;font-size:13px;"/>'
      +'<select class="mfc-tipo" data-idx="'+i+'" onchange="_mfCampoTipoChange('+i+',this.value,\''+ctx+'\')" style="font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);">'+tipoOpts+'</select>'
      +'<button type="button" onclick="_mfMoverCampo('+i+',-1,\''+ctx+'\')" '+(i===0?'disabled':'')+' class="rbtn rbtn-sm" style="padding:3px 7px;" title="Mover para cima">&#8593;</button>'
      +'<button type="button" onclick="_mfMoverCampo('+i+',1,\''+ctx+'\')" '+(i===arr.length-1?'disabled':'')+' class="rbtn rbtn-sm" style="padding:3px 7px;" title="Mover para baixo">&#8595;</button>'
      +'<button type="button" onclick="_mfRemoverCampo('+i+',\''+ctx+'\')" class="rbtn rbtn-sm rbtn-danger" style="padding:3px 7px;" title="Remover">'+ic("trash")+'</button>'
      +'</div>';
    if(temOpcoes){html+=_mfRenderOpcoes(campo,i,ctx);}
    html+='</div>';
    return html;
  }).join("");
}

function _mfCampoLabelInput(idx,val,ctx){ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;if(arr[idx])arr[idx].label=val;}

function _mfCampoTipoChange(idx,tipo,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  if(!arr[idx])return;
  arr[idx].tipo=tipo;
  var temOpcoes=tipo==='status'||tipo==='multi';
  if(temOpcoes){if(!arr[idx].opcoes)arr[idx].opcoes=[];}
  else{delete arr[idx].opcoes;}
  _mfRenderCampos(ctx);
}

function _mfMoverCampo(idx,delta,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  var dest=idx+delta;
  if(dest<0||dest>=arr.length)return;
  var tmp=arr[idx];arr[idx]=arr[dest];arr[dest]=tmp;
  _mfRenderCampos(ctx);
}

function _mfRemoverCampo(idx,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  arr.splice(idx,1);
  _mfRenderCampos(ctx);
}

function _mfAdicionarCampo(ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;var listId=_mfCtx(ctx).listId;
  arr.push({id:uid(),label:'',tipo:'texto'});
  _mfRenderCampos(ctx);
  setTimeout(function(){
    var lista=document.getElementById(listId);
    if(!lista)return;
    var inputs=lista.querySelectorAll(".mfc-label");
    if(inputs.length)inputs[inputs.length-1].focus();
  },30);
}

function _mfRenderOpcoes(campo,cidx,ctx){
  ctx=ctx||'campos';
  var opcoes=campo.opcoes||[];
  var html='<div class="mfc-opcoes">';
  opcoes.forEach(function(op,oi){
    var swatches=_MODELO_CORES.map(function(c){
      return '<span class="mfc-mini-swatch'+(c===(op.cor||'#94a3b8')?' sel':'')+'" style="background:'+c+';" onclick="_mfOpcaoCor('+cidx+','+oi+',\''+c+'\',\''+ctx+'\')" title="'+c+'"></span>';
    }).join("");
    html+='<div class="mfc-opcao-row">'
      +(campo.tipo==='status'?'<div class="mfc-swatches">'+swatches+'</div>':'')
      +'<input value="'+op.label.replace(/"/g,'&quot;')+'" placeholder="Opção..." oninput="_mfOpcaoLabelInput('+cidx+','+oi+',this.value,\''+ctx+'\')" style="flex:1;font-size:12px;padding:3px 7px;border:1px solid var(--border);border-radius:5px;min-width:80px;"/>'
      +'<button type="button" onclick="_mfRemoverOpcao('+cidx+','+oi+',\''+ctx+'\')" class="rbtn rbtn-sm rbtn-danger" style="padding:2px 5px;">'+ic("trash")+'</button>'
      +'</div>';
  });
  html+='<button type="button" onclick="_mfAdicionarOpcao('+cidx+',\''+ctx+'\')" class="rbtn rbtn-sm" style="margin-top:4px;font-size:11px;">'+ic("plus")+' Opção</button>';
  html+='</div>';
  return html;
}

function _mfOpcaoLabelInput(cidx,oidx,val,ctx){ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;if(arr[cidx]&&arr[cidx].opcoes&&arr[cidx].opcoes[oidx])arr[cidx].opcoes[oidx].label=val;}

function _mfOpcaoCor(cidx,oidx,cor,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  if(!arr[cidx]||!arr[cidx].opcoes||!arr[cidx].opcoes[oidx])return;
  arr[cidx].opcoes[oidx].cor=cor;
  _mfRenderCampos(ctx);
}

function _mfAdicionarOpcao(cidx,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  if(!arr[cidx])return;
  if(!arr[cidx].opcoes)arr[cidx].opcoes=[];
  arr[cidx].opcoes.push({id:uid(),label:'',cor:'#94a3b8'});
  _mfRenderCampos(ctx);
}

function _mfRemoverOpcao(cidx,oidx,ctx){
  ctx=ctx||'campos';var arr=_mfCtx(ctx).arr;
  if(!arr[cidx]||!arr[cidx].opcoes)return;
  arr[cidx].opcoes.splice(oidx,1);
  _mfRenderCampos(ctx);
}

function _mfSelecionarCor(cor){
  _mfCor=cor;
  var row=document.getElementById("mf-cores");if(!row)return;
  row.querySelectorAll(".mf-swatch").forEach(function(s){s.classList.toggle("selecionado",s.style.background===cor||s.style.backgroundColor===cor);});
}

function _mfSelecionarIcone(icone){
  _mfIcone=icone;
  var row=document.getElementById("mf-icones");if(!row)return;
  row.querySelectorAll(".mf-ic-btn").forEach(function(b){b.classList.remove("selecionado");});
  var btn=row.querySelector("[onclick=\"_mfSelecionarIcone('"+icone+"')\"]");if(btn)btn.classList.add("selecionado");
}

async function salvarModelo(){
  var nome=(document.getElementById("mf-nome").value||"").trim();
  if(!nome){toast("Informe o nome do modelo",true);return;}
  var modeloAtual=_mfEditId?modelosDB.find(function(x){return x.id===_mfEditId;}):null;
  // Valida labels dos campos
  for(var ci=0;ci<_mfCampos.length;ci++){
    if(!(_mfCampos[ci].label||"").trim()){toast("Preencha o rótulo do campo "+(ci+1),true);return;}
  }
  // Valida labels das colunas
  for(var ki=0;ki<_mfColunas.length;ki++){
    if(!(_mfColunas[ki].label||"").trim()){toast("Preencha o rótulo da coluna "+(ki+1),true);return;}
  }
  var obj={nome:nome,cor:_mfCor,icone:_mfIcone,slug:(modeloAtual&&modeloAtual.slug)||_modeloSlug(nome),campos:_mfCampos,colunas_tarefa:_mfColunas};
  if(_mfEditId){obj.id=_mfEditId;}else{obj.criado_por=userDbId;}
  try{
    await dbUpsertModelo(obj);
    modelosDB=await dbFetchModelos();
    toast("Modelo salvo!");
    if(_modelosAdminContext){closeModal();renderEstrutura();}
    else openGerenciarModelos();
  }catch(e){toast("Erro ao salvar modelo",true);}
}

async function duplicarModelo(id){
  var m=modelosDB.find(function(x){return x.id===id;});if(!m)return;
  function _clonarArr(arr){
    return (arr||[]).map(function(c){
      var nc=Object.assign({},c,{id:uid()});
      if(nc.opcoes){nc.opcoes=nc.opcoes.map(function(o){return Object.assign({},o,{id:uid()});});}
      return nc;
    });
  }
  try{
    var nomeCopia=m.nome+' (cópia)';
    await dbUpsertModelo({nome:nomeCopia,slug:_modeloSlug(nomeCopia),cor:m.cor,icone:m.icone,campos:_clonarArr(m.campos),colunas_tarefa:_clonarArr(m.colunas_tarefa),criado_por:userDbId});
    modelosDB=await dbFetchModelos();
    toast("Modelo duplicado!");
    _renderModelosLista();
  }catch(e){toast("Erro ao duplicar",true);}
}

async function delModelo(id){
  modalConfirm("Excluir este modelo? Reuniões já criadas não serão afetadas.",async function(){
    try{
      await dbDelModelo(id);
      modelosDB=await dbFetchModelos();
      toast("Modelo excluído!");
      _renderModelosLista();
    }catch(e){toast("Erro ao excluir",true);}
  });
}

// ── DUPLICACAO ──

// Diálogo genérico de duplicação renderizado no modal-container2.
// cfg = {titulo, descricao?, campos?:[{tipo:'date',id,label,valor}], opcoes:[{id,label,marcado}], onConfirm({opcoes:{id:bool},campos:{id:valor}})}
function _abrirDialogoDuplicar(cfg){
  var mc=_mc2();mc.innerHTML="";
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);width:min(95vw,400px);padding:22px 22px 18px;";
  box.onclick=function(e){e.stopPropagation();};
  var titulo=document.createElement("div");
  titulo.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);margin-bottom:4px;";
  titulo.textContent=cfg.titulo;
  box.appendChild(titulo);
  if(cfg.descricao){
    var desc=document.createElement("div");
    desc.style.cssText="font-size:12px;color:var(--text3);margin-bottom:14px;";
    desc.textContent=cfg.descricao;
    box.appendChild(desc);
  } else {
    var sep=document.createElement("div");sep.style.height="14px";box.appendChild(sep);
  }
  // Campos extras (ex.: data)
  var camposIds={};
  if(cfg.campos&&cfg.campos.length){
    cfg.campos.forEach(function(f){
      var wrap=document.createElement("div");
      wrap.className="field";
      wrap.style.marginBottom="12px";
      var lbl=document.createElement("label");
      lbl.style.cssText="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px;";
      lbl.textContent=f.label;
      var inp=document.createElement("input");
      inp.id="dup-campo-"+f.id;
      inp.type=f.tipo||"text";
      if(f.valor)inp.value=f.valor;
      inp.style.cssText="width:100%;font-size:13px;";
      wrap.appendChild(lbl);wrap.appendChild(inp);
      box.appendChild(wrap);
      camposIds[f.id]=true;
    });
  }
  // Checkboxes de opções
  var opcoesWrap=document.createElement("div");
  opcoesWrap.style.cssText="margin-bottom:16px;";
  cfg.opcoes.forEach(function(op){
    var row=document.createElement("label");
    row.className="dup-opcao";
    row.style.cssText="display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:13px;color:var(--text2);cursor:pointer;";
    var cb=document.createElement("input");
    cb.type="checkbox";
    cb.id="dup-op-"+op.id;
    cb.checked=!!op.marcado;
    cb.style.cssText="width:15px;height:15px;accent-color:var(--bt-navy);cursor:pointer;flex-shrink:0;";
    row.appendChild(cb);
    var span=document.createElement("span");span.textContent=op.label;
    row.appendChild(span);
    opcoesWrap.appendChild(row);
  });
  box.appendChild(opcoesWrap);
  // Botões
  var btnRow=document.createElement("div");
  btnRow.style.cssText="display:flex;gap:8px;justify-content:flex-end;";
  var btnCancel=document.createElement("button");
  btnCancel.className="rbtn rbtn-sm";
  btnCancel.textContent="Cancelar";
  btnCancel.onclick=function(){_mc2Close();};
  var btnOk=document.createElement("button");
  btnOk.className="rbtn rbtn-sm rbtn-primary";
  btnOk.textContent="Duplicar";
  btnOk.onclick=function(){
    var vals={opcoes:{},campos:{}};
    cfg.opcoes.forEach(function(op){
      var el=document.getElementById("dup-op-"+op.id);
      vals.opcoes[op.id]=el?el.checked:op.marcado;
    });
    if(cfg.campos){
      cfg.campos.forEach(function(f){
        var el=document.getElementById("dup-campo-"+f.id);
        vals.campos[f.id]=el?el.value:"";
      });
    }
    _mc2Close();
    cfg.onConfirm(vals);
  };
  btnRow.appendChild(btnCancel);btnRow.appendChild(btnOk);
  box.appendChild(btnRow);
  ov.appendChild(box);
  mc.appendChild(ov);
}

// Duplicar tarefa principal de pauta
function openDuplicarTarefa(tarefaId){
  var rId=reuniaoAtiva?reuniaoAtiva.id:"";
  var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
  if(!t){toast("Tarefa nao encontrada",true);return;}
  _abrirDialogoDuplicar({
    titulo:"Duplicar tarefa",
    opcoes:[
      {id:"subtarefas",label:"Subtarefas",marcado:true},
      {id:"valores",label:"Valores das colunas",marcado:true},
      {id:"comentarios",label:"Comentários",marcado:false}
    ],
    onConfirm:function(vals){_confirmarDuplicarTarefa(t,vals);}
  });
}

async function _confirmarDuplicarTarefa(t,vals){
  var rId=reuniaoAtiva?reuniaoAtiva.id:"";
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var novoId=uid();
    var nova={id:novoId,texto:t.texto+" (cópia)",status:t.status,criado_em:new Date().toISOString()};
    if(t.descricao)nova.descricao=t.descricao;
    if(t.responsavel)nova.responsavel=t.responsavel;
    if(t.data_inicio)nova.data_inicio=t.data_inicio;
    if(t.data_fim)nova.data_fim=t.data_fim;
    if(rId)nova.reuniao_id=rId;
    if(t.pauta_categoria_id)nova.pauta_categoria_id=t.pauta_categoria_id;
    if(t.campos_valores)nova.campos_valores=JSON.parse(JSON.stringify(t.campos_valores));
    if(eqId)nova.equipe_id=eqId;
    if(vals.opcoes.valores&&t.campos_valores&&Object.keys(t.campos_valores).length){
      nova.campos_valores=JSON.parse(JSON.stringify(t.campos_valores));
    }
    if(nova.campos_valores)delete nova.campos_valores.concluida_em;
    nova=normalizarStatusTarefa(nova,nova.status);
    await dbUpsertTarefa(nova);
    if(rId)await dbUpsertReuniaoTarefa({reuniao_id:rId,tarefa_id:novoId});
    // Subtarefas
    if(vals.opcoes.subtarefas){
      var subs=_subtarefasCache[t.id]||null;
      if(subs===null){
        try{subs=await dbFetchSubtarefas(t.id);}catch(_){subs=[];}
      }
      for(var i=0;i<subs.length;i++){
        var s=subs[i];
        var nsId=uid();
        var ns={id:nsId,parent_id:novoId,texto:s.texto,status:s.status,criado_em:new Date().toISOString()};
        if(s.descricao)ns.descricao=s.descricao;
        if(s.responsavel)ns.responsavel=s.responsavel;
        if(s.data_inicio)ns.data_inicio=s.data_inicio;
        if(s.data_fim)ns.data_fim=s.data_fim;
        if(rId)ns.reuniao_id=rId;
        if(eqId)ns.equipe_id=eqId;
        ns=normalizarStatusTarefa(ns,ns.status);
        await dbUpsertTarefa(ns);
      }
    }
    // Comentários
    if(vals.opcoes.comentarios){
      var cmts=_tarefaCmtsCache[t.id]||null;
      if(cmts===null){
        try{cmts=await dbFetchTarefaComentarios(t.id);}catch(_){cmts=[];}
      }
      for(var ci=0;ci<cmts.length;ci++){
        var c=cmts[ci];
        await dbUpsertTarefaComentario({tarefa_id:novoId,usuario_id:c.usuario_id,texto:c.texto});
      }
    }
    // Atualiza cache e re-renderiza
    if(rId){
      var tarefasAtualizadas=await dbFetchTarefasReuniao(rId);
      _tarefasPautaCache[rId]=tarefasAtualizadas;
    }
    await _loadPautasSection(rId);
    toast("Tarefa duplicada!");
  }catch(e){toast("Erro ao duplicar",true);}
}

// Duplicar subtarefa
function openDuplicarSubtarefa(subId,parentId){
  var sub=(_subtarefasCache[parentId]||[]).find(function(x){return x.id===subId;});
  if(!sub){toast("Subtarefa nao encontrada",true);return;}
  _abrirDialogoDuplicar({
    titulo:"Duplicar subtarefa",
    opcoes:[
      {id:"comentarios",label:"Comentários",marcado:false}
    ],
    onConfirm:function(vals){_confirmarDuplicarSubtarefa(sub,parentId,vals);}
  });
}

async function _confirmarDuplicarSubtarefa(sub,parentId,vals){
  var rId=reuniaoAtiva?reuniaoAtiva.id:"";
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var hoje=new Date().toISOString().slice(0,10);
  var reuniao=reunioesDB.find(function(r){return r.id===rId;})||{};
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var novoId=uid();
    var nova={id:novoId,parent_id:parentId,texto:sub.texto+" (cópia)",status:sub.status,criado_em:new Date().toISOString()};
    if(sub.descricao)nova.descricao=sub.descricao;
    if(sub.responsavel)nova.responsavel=sub.responsavel;
    if(sub.data_inicio)nova.data_inicio=sub.data_inicio;
    if(sub.data_fim)nova.data_fim=sub.data_fim;
    if(rId)nova.reuniao_id=rId;
    if(eqId)nova.equipe_id=eqId;
    nova=normalizarStatusTarefa(nova,nova.status);
    await dbUpsertTarefa(nova);
    // Comentários
    if(vals.opcoes.comentarios){
      var cmts=_tarefaCmtsCache[sub.id]||null;
      if(cmts===null){
        try{cmts=await dbFetchTarefaComentarios(sub.id);}catch(_){cmts=[];}
      }
      for(var ci=0;ci<cmts.length;ci++){
        var c=cmts[ci];
        await dbUpsertTarefaComentario({tarefa_id:novoId,usuario_id:c.usuario_id,texto:c.texto});
      }
    }
    // Atualiza cache e re-renderiza
    _subtarefasCache[parentId]=await dbFetchSubtarefas(parentId);
    _reloadTarefaCard(parentId,ehPassado);
    toast("Subtarefa duplicada!");
  }catch(e){toast("Erro ao duplicar",true);}
}

// Duplicar reunião
function openDuplicarReuniao(reuniaoId){
  var r=reunioesDB.find(function(x){return x.id===reuniaoId;});
  if(!r){toast("Reuniao nao encontrada",true);return;}
  _abrirDialogoDuplicar({
    titulo:"Duplicar reunião",
    campos:[
      {tipo:"date",id:"data",label:"Data da nova reunião",valor:""}
    ],
    opcoes:[
      {id:"participantes",label:"Participantes",marcado:true},
      {id:"pautas",label:"Pautas e tarefas",marcado:true},
      {id:"valores",label:"Valores preenchidos",marcado:false},
      {id:"comentarios",label:"Comentários da reunião",marcado:false}
    ],
    onConfirm:function(vals){_confirmarDuplicarReuniao(r,vals);}
  });
}

async function _confirmarDuplicarReuniao(r,vals){
  var dataEscolhida=(vals.campos&&vals.campos.data)||"";
  if(!dataEscolhida){toast("Informe a data da nova reunião",true);openDuplicarReuniao(r.id);return;}
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    // 1. Criar nova reunião
    var objNova={data:dataEscolhida,hora:r.hora,status:"agendada",criado_por:userDbId};
    if(r.titulo)objNova.titulo=r.titulo+" (cópia)";
    if(r.observacoes)objNova.observacoes=r.observacoes;
    if(r.tipo)objNova.tipo=r.tipo;
    if(r.equipe_id)objNova.equipe_id=r.equipe_id;
    if(r.modelo_id)objNova.modelo_id=r.modelo_id;
    if(r.modelo_snapshot)objNova.modelo_snapshot=r.modelo_snapshot;
    if(vals.opcoes.valores&&r.campos_valores&&Object.keys(r.campos_valores).length){
      objNova.campos_valores=JSON.parse(JSON.stringify(r.campos_valores));
    }
    var nova=await dbUpsertReuniao(objNova);
    if(!nova||!nova.id){toast("Erro ao criar reunião duplicada",true);return;}
    // 2. Participantes
    if(vals.opcoes.participantes){
      var parts=[];
      try{parts=await dbFetchReuniaoParticipantes(r.id);}catch(_){}
      await Promise.all(parts.map(function(p){
        return dbUpsertReuniaoParticipante({reuniao_id:nova.id,usuario_id:p.usuario_id});
      }));
    }
    // 3. Pautas e tarefas
    if(vals.opcoes.pautas){
      var tarefasOrig=[];
      try{tarefasOrig=await dbFetchTarefasReuniao(r.id);}catch(_){}
      // mapa oldId -> newId para recriar subtarefas
      var mapa={};
      // processar apenas tarefas principais (parent_id nulo)
      var principais=tarefasOrig.filter(function(t){return !t.parent_id;});
      for(var i=0;i<principais.length;i++){
        var t=principais[i];
        var novoId=uid();
        mapa[t.id]=novoId;
        var nt={id:novoId,texto:t.texto,status:t.status,reuniao_id:nova.id,criado_em:new Date().toISOString()};
        if(t.descricao)nt.descricao=t.descricao;
        if(t.responsavel)nt.responsavel=t.responsavel;
        if(t.data_inicio)nt.data_inicio=t.data_inicio;
        if(t.data_fim)nt.data_fim=t.data_fim;
        if(t.pauta_categoria_id)nt.pauta_categoria_id=t.pauta_categoria_id;
        if(t.equipe_id)nt.equipe_id=t.equipe_id;
        if(vals.opcoes.valores&&t.campos_valores&&Object.keys(t.campos_valores).length){
          nt.campos_valores=JSON.parse(JSON.stringify(t.campos_valores));
        }
        if(nt.campos_valores)delete nt.campos_valores.concluida_em;
        nt=normalizarStatusTarefa(nt,nt.status);
        await dbUpsertTarefa(nt);
        await dbUpsertReuniaoTarefa({reuniao_id:nova.id,tarefa_id:novoId});
      }
      // subtarefas
      var subs=tarefasOrig.filter(function(t){return !!t.parent_id&&mapa[t.parent_id];});
      for(var si=0;si<subs.length;si++){
        var s=subs[si];
        var nsId=uid();
        var ns={id:nsId,parent_id:mapa[s.parent_id],texto:s.texto,status:s.status,reuniao_id:nova.id,criado_em:new Date().toISOString()};
        if(s.descricao)ns.descricao=s.descricao;
        if(s.responsavel)ns.responsavel=s.responsavel;
        if(s.data_inicio)ns.data_inicio=s.data_inicio;
        if(s.data_fim)ns.data_fim=s.data_fim;
        if(s.equipe_id)ns.equipe_id=s.equipe_id;
        ns=normalizarStatusTarefa(ns,ns.status);
        await dbUpsertTarefa(ns);
      }
    }
    // 4. Comentários da reunião
    if(vals.opcoes.comentarios){
      var rcmts=[];
      try{rcmts=await dbFetchReuniaoComentarios(r.id);}catch(_){}
      for(var ri=0;ri<rcmts.length;ri++){
        var rc=rcmts[ri];
        await dbUpsertReuniaoComentario({reuniao_id:nova.id,usuario_id:rc.usuario_id,texto:rc.texto});
      }
    }
    // 5. Atualiza lista e navega para a nova
    reunioesDB=await dbFetchReunioes(eqId);
    selecionarReuniao(nova.id);
    toast("Reunião duplicada!");
  }catch(e){toast("Erro ao duplicar reunião",true);}
}

// ── REUNIOES ──
var _calMes=(new Date()).getMonth();
var _calAno=(new Date()).getFullYear();
var _projExpanded={};
var _checklistCache={};
var _commentsCache={};
var _projCommentsExpanded={};

async function renderReunioes(){
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("reunioes")+'<div style="padding:24px;max-width:1100px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    reunioesDB=await dbFetchReunioes(eqId);
    pautasDB=await dbFetchPautas(eqId);
    projetosDB=await dbFetchProjetos(eqId);
  }catch(e){toast("Erro ao carregar reunioes",true);}
  _renderReunioesPagina();
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
  var listaSidebar=proximas.concat(passadas).slice(0,20).map(function(r){
    var ativa=reuniaoAtiva&&reuniaoAtiva.id===r.id;
    var p=r.data.split('-');
    var d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    var dataLabel=diasSem[d.getDay()]+', '+p[2]+' '+mesesCurtos[parseInt(p[1])-1];
    var sc=statusCores[r.status]||'#94a3b8';
    return '<div onclick="selecionarReuniao(\''+r.id+'\')" class="reun-card'+(ativa?' ativa':'')+'">'
      +'<div class="reun-card-stripe" style="background:'+sc+';"></div>'
      +'<div class="reun-card-titulo">'+trunc(r.titulo||('Reuniao de '+dataLabel),34)+'</div>'
      +'<div class="reun-card-meta">'
      +'<span class="reun-card-data">'+dataLabel+' '+r.hora.slice(0,5)+'</span>'
      +'<span class="reun-status-chip" style="background:'+sc+'22;color:'+sc+';">'+r.status+'</span>'
      +'</div>'
      +'</div>';
  }).join("");
  var mainContent=reuniaoAtiva?_buildReuniaoDetalhe(reuniaoAtiva):_buildReuniaoPlaceholder();
  app.innerHTML=headerHTML("reunioes")
    +'<div class="reun-wrap">'
    +'<div id="reun-backdrop" class="reun-backdrop" onclick="toggleReunSidebar()"></div>'
    +'<div class="reun-sidebar" id="reun-sidebar">'
    +'<div class="reun-sidebar-hdr">'
    +'<span class="reun-sidebar-title">Reunioes</span>'
    +'<div style="display:flex;align-items:center;gap:5px;">'
    +(ce?'<button onclick="openNovaReuniao()" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic("plus")+' Nova</button>':"")
    +'<button class="reun-mob-btn" onclick="toggleReunSidebar()" style="padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text3);cursor:pointer;font-size:16px;line-height:1;">&times;</button>'
    +'</div>'
    +'</div>'
    +'<div id="mini-cal-area"></div>'
    +'<div class="reun-sidebar-list">'+(listaSidebar||'<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma reuniao</div>')+'</div>'
    +'<div class="reun-sidebar-footer">'
    +'<div class="reun-section-label" style="margin-bottom:6px;">Pautas</div>'
    +(ce?'<button onclick="renderPautaCategorias()" style="width:100%;font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;text-align:left;display:flex;align-items:center;gap:4px;margin-bottom:4px;">'+ic("edit")+' Gerenciar categorias</button>':"")
    +(ce?'<button onclick="renderPautas()" style="width:100%;font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;text-align:left;display:flex;align-items:center;gap:4px;">'+ic("edit")+' Pautas (legado)</button>':"")
    +'</div>'
    +'</div>'
    +'<div class="reun-main">'
    +'<div class="reun-mob-topbar">'
    +'<button onclick="toggleReunSidebar()" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--bt-navy);cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;">&#9776; Reunioes</button>'
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
    if(r){cls+=' tem-reun';html+='<div class="'+cls+'" onclick="selecionarReuniao(\''+r.id+'\')">'+d+'</div>';}
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
  var dataFmt=_fmtData(r.data);
  var statusCor={'agendada':'#3b82f6','realizada':'#22c55e','cancelada':'#ef4444'}[r.status]||'#94a3b8';
  var statusLabel={'agendada':'Agendada','realizada':'Realizada','cancelada':'Cancelada'}[r.status]||r.status;
  var diasSemLong=['Domingo','Segunda-feira','Terca-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sabado'];
  var mesesLong=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var p=r.data.split('-');
  var dObj=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
  var dataLong=diasSemLong[dObj.getDay()]+', '+parseInt(p[2])+' de '+mesesLong[parseInt(p[1])-1]+' de '+p[0];
  var html='<div class="reun-detalhe">'
    +'<div class="reun-detalhe-hdr">'
    +'<div style="min-width:0;">'
    +'<div class="reun-detalhe-titulo">'+(r.titulo||('Reuniao de '+dataFmt))+'</div>'
    +'<div class="reun-detalhe-sub">'
    +'<span style="font-size:12px;color:var(--text3);display:inline-flex;align-items:center;gap:4px;">'+ic("cal")+' '+dataLong+'</span>'
    +'<span style="font-size:12px;color:var(--text3);">'+r.hora.slice(0,5)+'</span>'
    +'<span class="reun-status-chip" style="background:'+statusCor+'22;color:'+statusCor+';">'+statusLabel+'</span>'
    +'</div>'
    +'</div>'
    +(ce?'<div style="display:flex;gap:6px;flex-shrink:0;margin-top:2px;">'
      +'<button onclick="openEditReuniao(\''+r.id+'\')" class="btn" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:3px;">'+ic("edit")+' Editar</button>'
      +'<button onclick="gerarAta(\''+r.id+'\')" class="btn" style="font-size:11px;padding:4px 10px;">Gerar ata</button>'
      +'</div>':"")
    +'</div>';
  if(r.observacoes){html+='<div style="background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--bt-navy);border-radius:0 8px 8px 0;padding:10px 14px;margin-top:12px;font-size:13px;color:var(--text2);line-height:1.6;">'+r.observacoes+'</div>';}
  html+='<hr class="reun-detalhe-sep"/>';
  html+='<div class="reun-section">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    +'<div class="reun-section-label">Participantes</div>'
    +(ce?'<button onclick="openGerenciarParticipantes(\''+r.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("users")+' Gerenciar</button>':"")
    +'</div>'
    +'<div id="reuniao-part-area" style="min-height:24px;">Carregando...</div>'
    +'</div>';
  html+='<div class="reun-section">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    +'<div class="reun-section-label">Projetos internos</div>'
    +(ce?'<button onclick="openNovoProjeto()" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Novo</button>':"")
    +'</div>'
    +'<div id="reuniao-projetos-area">Carregando...</div>'
    +'</div>';
  html+='<div class="reun-section">'
    +'<div class="reun-section-label" style="margin-bottom:10px;">Itens de pauta</div>'
    +'<div id="reuniao-itens-area">Carregando...</div>'
    +'</div>';
  html+='</div>';
  setTimeout(function(){_loadParticipantesArea(r.id);_loadProjetosArea(r.id);_loadReuniaoItens(r.id);},0);
  return html;
}

async function _loadReuniaoPautas(reuniaoId){
  var el=document.getElementById("reuniao-pautas-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var hoje=new Date().toISOString().slice(0,10);
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    var addBtn=(ce&&!ehPassado)?'<button onclick="openAdicionarPauta(\''+reuniaoId+'\')" class="btn-outlined" style="margin-bottom:14px;">'+ic("plus")+' Adicionar pauta</button>':"";
    if(!rps.length){
      el.innerHTML=addBtn
        +'<div class="reun-empty" style="padding:28px 20px;">'
        +'<div class="reun-empty-icon">'+ic("meeting")+'</div>'
        +'<div class="reun-empty-msg">Nenhuma pauta adicionada a esta reuniao</div>'
        +'</div>';
      return;
    }
    var html='<div style="display:flex;flex-direction:column;gap:10px;">';
    rps.forEach(function(rp){
      var pauta=pautasDB.find(function(p){return p.id===rp.pauta_id;})||{titulo:"Pauta",tipo:"livre"};
      var snap=rp.snapshot_json||{};
      var tipoCor={'seminario':'#8b5cf6','projeto':'#3b82f6','atualizacao_demandas':'#f59e0b','livre':'#94a3b8','avisos_gerais':'#22c55e'}[pauta.tipo]||'#94a3b8';
      html+='<div class="pauta-card" id="pauta-card-'+rp.id+'">';
      html+='<div class="pauta-card-hdr">';
      html+='<div class="pauta-card-titulo">'+pauta.titulo+'</div>';
      html+='<div style="display:flex;align-items:center;gap:6px;">';
      html+='<span class="reun-status-chip" style="background:'+tipoCor+'22;color:'+tipoCor+';">'+_labelTipoPauta(pauta.tipo)+'</span>';
      if(ehPassado)html+='<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:var(--text3);">snapshot</span>';
      html+='</div></div>';
      html+='<div id="pb-'+rp.id+'" class="pauta-card-body">';
      html+=_renderPautaView(pauta,snap,ce,ehPassado);
      html+='</div>';
      html+='<div class="pauta-card-footer">';
      if(ce&&!ehPassado){
        html+='<button onclick="_editPautaInline(\''+rp.id+'\',\''+reuniaoId+'\',\''+pauta.tipo+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("edit")+' Editar notas</button>';
      }
      if(pauta.tipo==='livre'||pauta.tipo==='avisos_gerais'||pauta.tipo==='atualizacao_demandas'){
        html+='<button onclick="openHistoricoPauta(\''+rp.pauta_id+'\',\''+reuniaoId+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Historico</button>';
      }
      if(ce&&!ehPassado){
        html+='<button onclick="removerPautaDaReuniao(\''+rp.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;margin-left:auto;">Remover</button>';
      }
      html+='</div></div>';
    });
    html+='</div>';
    el.innerHTML=addBtn+html;
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar pautas.</div>';}
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
      html+='<div style="font-size:12px;color:var(--text3);font-style:italic;">Sem registros para este seminario.</div>';
    } else {
      if(tSem)html+='<div style="margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;">Titulo:</span> <span style="font-size:13px;color:var(--bt-navy);font-weight:600;">'+tSem+'</span></div>';
      if(rSem)html+='<div style="margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;">Responsavel:</span> <span style="font-size:13px;color:var(--text2);">'+rSem+'</span></div>';
      if(oSem)html+='<div class="pauta-notas" style="margin-top:6px;">'+oSem+'</div>';
    }
  } else if(tipo==='atualizacao_demandas'){
    var adNotas=snap.notas||'';
    var adDemandas=snap.demandas||[];
    if(!adNotas&&!adDemandas.length){
      html+='<div style="font-size:12px;color:var(--text3);font-style:italic;">Sem atualizacoes registradas.</div>';
    } else {
      if(adDemandas.length){
        html+='<div style="margin-bottom:8px;">';
        adDemandas.forEach(function(d){
          var card=(cards||[]).find(function(c){return c.id===d.card_id;})||{};
          var titulo=card.titulo||d.titulo||d.card_id||"Demanda";
          html+='<div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">';
          html+='<span style="font-size:12px;font-weight:600;color:var(--bt-navy);flex:1;">'+trunc(titulo,46)+'</span>';
          if(d.obs)html+='<span style="font-size:11px;color:var(--text3);flex-shrink:0;">'+d.obs+'</span>';
          html+='</div>';
        });
        html+='</div>';
      }
      if(adNotas)html+='<div class="pauta-notas">'+adNotas+'</div>';
    }
  } else {
    if(snap.notas)html+='<div class="pauta-notas">'+snap.notas+'</div>';
    else html+='<div style="font-size:12px;color:var(--text3);font-style:italic;">Sem notas para esta pauta nesta reuniao.</div>';
  }
  return html;
}

function _buildProjetosSection(snap,ce,ehPassado){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var projs=projetosDB.filter(function(p){return(!eqId||p.equipe_id===eqId)&&!p.arquivado;});
  var html='';
  if(!projs.length){html+='<div style="font-size:12px;color:var(--text3);font-style:italic;">Nenhum projeto de equipe.</div>';}
  else{
    html+='<div style="display:flex;flex-direction:column;gap:8px;">';
    projs.forEach(function(p){
      html+='<div id="proj-item-'+p.id+'">'+_buildProjetoCardHTML(p,!!_projExpanded[p.id],_checklistCache[p.id]||null,_commentsCache[p.id]||null,ce,ehPassado)+'</div>';
    });
    html+='</div>';
  }
  if(ce&&!ehPassado)html+='<button onclick="openNovoProjeto()" style="margin-top:10px;font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Novo projeto</button>';
  if(snap.notas)html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);"><div class="reun-section-label" style="margin-bottom:4px;">Notas da reuniao</div><div class="pauta-notas">'+snap.notas+'</div></div>';
  return html;
}
function _buildProjetoCardHTML(p,expanded,checklist,comments,ce,ehPassado){
  var corSt={'em_andamento':'#3b82f6','concluida':'#22c55e','pausado':'#a855f7','concluido':'#22c55e'};
  var lblSt={'em_andamento':'Em andamento','concluida':'Concluido','pausado':'Pausado','concluido':'Concluido'};
  var cor=corSt[p.status]||'#94a3b8';
  var lbl=lblSt[p.status]||p.status.replace('_',' ');
  var resp=(p.usuarios&&(p.usuarios.sigla||p.usuarios.nome))||"";
  var respNome=(p.usuarios&&p.usuarios.nome)||resp;
  var isPontual=p.tipo==='pontual';
  var ehP=!!ehPassado;
  var html='<div class="proj-card"><div class="proj-card-bar" style="background:'+cor+';"></div><div class="proj-card-content">';
  html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">';
  html+='<div class="proj-card-titulo">'+p.titulo+'</div>';
  html+='<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">';
  html+='<span class="reun-status-chip" style="background:'+cor+'22;color:'+cor+';">'+lbl+'</span>';
  html+='<button onclick="_toggleProjeto(\''+p.id+'\','+ehP+')" title="'+(expanded?'Fechar':'Expandir')+'" style="font-size:11px;padding:1px 7px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text3);cursor:pointer;line-height:1.5;">'+(expanded?'&#9650;':'&#9660;')+'</button>';
  html+='</div></div>';
  html+='<div style="font-size:11px;color:var(--text3);margin-top:3px;display:flex;align-items:center;gap:6px;">';
  if(resp)html+='<div class="av av-sm" style="background:'+_avCor((p.usuarios&&p.usuarios.id)||respNome)+';flex-shrink:0;" title="'+resp+'">'+resp.slice(0,2).toUpperCase()+'</div>';
  if(resp)html+='<span>'+resp+'</span>';
  html+='</div>';
  if(p.descricao)html+='<div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5;">'+p.descricao+'</div>';
  if(isPontual&&checklist&&checklist.length){
    html+=_buildChecklistBar(checklist);
    var done=checklist.filter(function(i){return i.status==='concluida';}).length;
    html+='<div style="font-size:10px;color:var(--text3);margin-bottom:2px;">'+done+'/'+checklist.length+' concluidos</div>';
  }
  if(expanded){
    if(checklist!==null)html+=_buildChecklistUI(p.id,checklist||[],ce,ehP);
    else html+='<div style="font-size:12px;color:var(--text3);margin-top:6px;font-style:italic;">Carregando...</div>';
    html+=_buildInlineComments(p.id,comments||[],ce,ehP,!!(_projCommentsExpanded&&_projCommentsExpanded[p.id]));
  }
  html+='<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">';
  if(ce&&!ehP){
    html+='<button onclick="_editProjetoInline(\''+p.id+'\','+ehP+')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:2px;">'+ic("edit")+' Editar</button>';
    html+='<button onclick="arquivarProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text3);cursor:pointer;">Arquivar</button>';
  }
  html+='</div>';
  html+='</div></div>';
  return html;
}
function _buildChecklistBar(checklist){
  if(!checklist||!checklist.length)return '';
  var corItem={'nao_iniciada':'#e2e8f0','pendente':'#e2e8f0','em_andamento':'#3b82f6','bloqueada':'#ef4444','concluida':'#22c55e','concluido':'#22c55e'};
  return '<div style="display:flex;gap:2px;margin-top:8px;margin-bottom:2px;">'+checklist.map(function(it){
    return '<div style="flex:1;height:6px;background:'+(corItem[it.status]||'#e2e8f0')+';border-radius:2px;"></div>';
  }).join("")+'</div>';
}
function _buildChecklistUI(projetoId,checklist,ce,ehPassado){
  var corStatus={'nao_iniciada':'#94a3b8','pendente':'#94a3b8','em_andamento':'#3b82f6','bloqueada':'#ef4444','concluida':'#22c55e','concluido':'#22c55e'};
  var lblStatus={'nao_iniciada':'Nao iniciada','pendente':'Nao iniciada','em_andamento':'Em andamento','bloqueada':'Bloqueada','concluida':'Concluida','concluido':'Concluida'};
  var html='<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">';
  html+='<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Checklist</div>';
  if(!checklist.length){html+='<div style="font-size:12px;color:var(--text3);font-style:italic;">Nenhum item.</div>';}
  else{
    checklist.forEach(function(it){
      var cor=corStatus[it.status]||'#94a3b8';
      var lbl=lblStatus[it.status]||it.status;
      var respIt=(it.usuarios&&(it.usuarios.sigla||it.usuarios.nome))||"";
      html+='<div id="cl-item-'+it.id+'" style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">';
      html+='<div style="width:8px;height:8px;border-radius:50%;background:'+cor+';flex-shrink:0;"></div>';
      html+='<span style="flex:1;font-size:12px;color:var(--bt-navy);">'+it.titulo+'</span>';
      if(respIt)html+='<span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#f1f5f9;color:var(--text3);flex-shrink:0;">'+respIt+'</span>';
      html+='<span style="font-size:10px;padding:1px 5px;border-radius:4px;background:'+cor+'22;color:'+cor+';flex-shrink:0;">'+lbl+'</span>';
      if(ce&&!ehPassado){
        html+='<button onclick="_editChecklistItemInline(\''+it.id+'\',\''+projetoId+'\','+ehPassado+')" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;flex-shrink:0;">'+ic("edit")+'</button>';
        html+='<button onclick="delChecklistItem(\''+it.id+'\',\''+projetoId+'\','+ehPassado+')" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;flex-shrink:0;">'+ic("trash")+'</button>';
      }
      html+='</div>';
    });
  }
  if(ce&&!ehPassado){
    html+='<div id="cl-add-'+projetoId+'" style="margin-top:6px;">';
    html+='<button onclick="_showAddChecklistItem(\''+projetoId+'\',false)" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Adicionar item</button>';
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
    +'<input id="cli-titulo-'+projetoId+'" placeholder="Titulo do item *" style="font-size:12px;"/>'
    +'<div style="display:flex;gap:6px;">'
    +'<select id="cli-resp-'+projetoId+'" style="flex:1;font-size:11px;"><option value="">Responsavel...</option>'+respOpts+'</select>'
    +'<select id="cli-status-'+projetoId+'" style="flex:1;font-size:11px;"><option value="nao_iniciada">Nao iniciada</option><option value="em_andamento">Em andamento</option><option value="bloqueada">Bloqueada</option><option value="concluida">Concluida</option></select>'
    +'</div>'
    +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
    +'<button onclick="_cancelAddChecklistItem(\''+projetoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="_salvarAddChecklistItem(\''+projetoId+'\','+!!ehPassado+')" class="btn btn-primary" style="font-size:11px;">Adicionar</button>'
    +'</div></div>';
  var inp=document.getElementById("cli-titulo-"+projetoId);if(inp)inp.focus();
}
function _cancelAddChecklistItem(projetoId){
  var el=document.getElementById("cl-add-"+projetoId);if(!el)return;
  el.innerHTML='<button onclick="_showAddChecklistItem(\''+projetoId+'\',false)" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Adicionar item</button>';
}
async function _salvarAddChecklistItem(projetoId,ehPassado){
  var inp=document.getElementById("cli-titulo-"+projetoId);
  var titulo=(inp?inp.value||"":"").trim();
  if(!titulo){toast("Informe o titulo do item",true);return;}
  var respId=document.getElementById("cli-resp-"+projetoId).value||null;
  var status=document.getElementById("cli-status-"+projetoId).value||"nao_iniciada";
  var cl=_checklistCache[projetoId]||[];
  try{
    var criado=await dbUpsertChecklistItem({projeto_id:projetoId,titulo:titulo,status:status,responsavel_id:respId,ordem:cl.length});
    if(!_checklistCache[projetoId])_checklistCache[projetoId]=[];
    if(criado)_checklistCache[projetoId].push(criado);
    _reloadProjetoCard(projetoId,ehPassado);toast("Item adicionado!");
  }catch(e){toast("Erro ao adicionar item",true);}
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
    +'<select id="cli-edit-r-'+itemId+'" style="flex:1;font-size:11px;"><option value="">Responsavel...</option>'+respOpts+'</select>'
    +'<select id="cli-edit-s-'+itemId+'" style="flex:1;font-size:11px;"><option value="nao_iniciada"'+((it.status==="nao_iniciada"||it.status==="pendente"||!it.status)?" selected":"")+'>Nao iniciada</option><option value="em_andamento"'+(it.status==="em_andamento"?" selected":"")+'>Em andamento</option><option value="bloqueada"'+(it.status==="bloqueada"?" selected":"")+'>Bloqueada</option><option value="concluida"'+((it.status==="concluida"||it.status==="concluido")?" selected":"")+'>Concluida</option></select>'
    +'</div>'
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
    var atualizado=await dbUpsertChecklistItem({id:itemId,titulo:titulo,responsavel_id:respId,status:status});
    var cl=_checklistCache[projetoId]||[];
    _checklistCache[projetoId]=cl.map(function(x){return x.id===itemId?Object.assign({},x,atualizado||{titulo:titulo,status:status,responsavel_id:respId}):x;});
    _reloadProjetoCard(projetoId,ehPassado);toast("Item atualizado!");
  }catch(e){toast("Erro",true);}
}
async function delChecklistItem(itemId,projetoId,ehPassado){
  modalConfirm("Excluir este item do checklist?",async function(){
    try{
      await dbDelChecklistItem(itemId);
      if(_checklistCache[projetoId])_checklistCache[projetoId]=_checklistCache[projetoId].filter(function(x){return x.id!==itemId;});
      _reloadProjetoCard(projetoId,ehPassado);toast("Item excluido!");
    }catch(e){toast("Erro",true);}
  });
}

function _buildInlineComments(projetoId,comments,ce,ehPassado,expanded){
  var toShow=expanded?[].concat(comments).reverse():([].concat(comments).reverse()).slice(0,3);
  var hasMore=comments.length>3;
  var html='<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">';
  html+='<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Comentarios</div>';
  if(!toShow.length){html+='<div style="font-size:11px;color:var(--text3);font-style:italic;margin-bottom:6px;">Nenhum comentario.</div>';}
  else{
    html+='<div style="max-height:240px;overflow-y:auto;padding-right:2px;">';
    toShow.forEach(function(c){
      var u=c.usuarios||{};
      var isSinal=c.tipo==='sinalizado';
      var corAv=_avCor(u.id||u.nome||"?");
      var ini=(u.sigla||u.nome||"?").slice(0,2).toUpperCase();
      var dt=new Date(c.criado_em);
      var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      html+='<div style="display:flex;gap:7px;padding:5px 0;border-bottom:1px solid var(--border);'+(isSinal?'background:#fff5f5;border-left:3px solid #ef4444;padding-left:6px;border-radius:0 4px 4px 0;':'')+';">';
      html+='<div class="av av-sm" style="background:'+corAv+';flex-shrink:0;" title="'+(u.nome||u.sigla||"")+'">'+ini+'</div>';
      html+='<div style="flex:1;min-width:0;">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">';
      html+='<span style="font-size:11px;font-weight:700;color:var(--bt-navy);">'+(u.sigla||u.nome||"?")+(isSinal?' <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:#fee2e2;color:#ef4444;">SINAL</span>':'')+'</span>';
      html+='<span style="font-size:10px;color:var(--text3);">'+dtStr+'</span>';
      html+='</div>';
      html+='<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;line-height:1.5;margin-top:2px;">'+c.texto+'</div>';
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
    html+='<div style="display:flex;gap:5px;margin-top:8px;align-items:flex-start;">';
    var meIni=((nomeUser||"?").slice(0,2).toUpperCase());
    html+='<div class="av av-sm" style="background:'+_avCor(userDbId||"")+';flex-shrink:0;">'+meIni+'</div>';
    html+='<textarea id="cmt-inline-'+projetoId+'" rows="1" placeholder="Comentar..." style="flex:1;resize:none;font-size:12px;padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;"></textarea>';
    html+='<button onclick="_addProjetoComentarioInline(\''+projetoId+'\')" style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--bt-navy);background:var(--bt-navy);color:#fff;cursor:pointer;flex-shrink:0;">Enviar</button>';
    html+='<button onclick="sinalizarProjeto(\''+projetoId+'\')" style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid #fecaca;background:#fff5f5;color:#dc2626;cursor:pointer;font-weight:700;flex-shrink:0;">! Sinalizar</button>';
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
  if(!txt){toast("Escreva um comentario",true);return;}
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
    +'<div><label class="icell-label">Tipo</label><select id="pei-tipo-'+projetoId+'" style="width:100%;font-size:12px;"><option value="continuo"'+(!p.tipo||p.tipo==="continuo"?" selected":"")+'>Continuo</option><option value="pontual"'+(p.tipo==="pontual"?" selected":"")+'>Pontual (checklist)</option></select></div>'
    +'<div><label class="icell-label">Status</label><select id="pei-status-'+projetoId+'" style="width:100%;font-size:12px;"><option value="em_andamento"'+(!p.status||p.status==="em_andamento"?" selected":"")+'>Em andamento</option><option value="concluido"'+(p.status==="concluido"?" selected":"")+'>Concluido</option><option value="pausado"'+(p.status==="pausado"?" selected":"")+'>Pausado</option></select></div>'
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
    _reloadProjetoCard(projetoId,!!ehPassado);toast("Projeto salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _loadProjetosArea(reuniaoId){
  var el=document.getElementById("reuniao-projetos-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  el.innerHTML=_buildProjetosSection({},ce,ehPassado);
}
async function _loadReuniaoItens(reuniaoId){
  var el=document.getElementById("reuniao-itens-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var itens=await dbFetchReuniaoItens(reuniaoId);
    var addBtn=(ce&&!ehPassado)?'<button onclick="openAdicionarPauta(\''+reuniaoId+'\')" class="btn-outlined" style="margin-bottom:12px;">'+ic("plus")+' Adicionar item</button>':"";
    if(!itens.length){el.innerHTML=addBtn+'<div style="font-size:12px;color:var(--text3);font-style:italic;">Nenhum item de pauta adicionado.</div>';return;}
    var cats={};
    itens.forEach(function(it){
      var cid=it.categoria_id||"sem_cat";
      if(!cats[cid])cats[cid]={nome:(it.pauta_categorias&&it.pauta_categorias.nome)||'Geral',itens:[]};
      cats[cid].itens.push(it);
    });
    var html='<div style="display:flex;flex-direction:column;gap:10px;">';
    Object.keys(cats).forEach(function(catId){
      var cat=cats[catId];
      html+='<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">';
      html+='<div style="padding:7px 14px;background:var(--surface);font-size:11px;font-weight:700;color:var(--bt-navy);text-transform:uppercase;letter-spacing:.04em;">'+cat.nome+'</div>';
      html+='<div>';
      cat.itens.forEach(function(it){
        var item=it.pauta_itens||{};
        var isConcluido=it.estado==='concluido';
        html+='<div id="reun-item-'+it.id+'" style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);">';
        if(ce&&!ehPassado){
          html+='<input type="checkbox"'+(isConcluido?' checked':'')+' onchange="_toggleReuniaoItem(\''+it.id+'\',this.checked,\''+reuniaoId+'\')" style="width:auto;flex-shrink:0;cursor:pointer;"/>';
        } else {
          html+='<input type="checkbox"'+(isConcluido?' checked':'')+' disabled style="width:auto;flex-shrink:0;"/>';
        }
        html+='<span style="flex:1;font-size:13px;color:'+(isConcluido?'var(--text3)':'var(--bt-navy)')+';'+(isConcluido?'text-decoration:line-through;':'')+'">'+item.titulo+'</span>';
        if(it.notas)html+='<span style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+it.notas+'</span>';
        if(ce&&!ehPassado){
          html+='<button onclick="_delReuniaoItem(\''+it.id+'\',\''+reuniaoId+'\')" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;flex-shrink:0;">'+ic("trash")+'</button>';
        }
        html+='</div>';
      });
      html+='</div></div>';
    });
    html+='</div>';
    el.innerHTML=addBtn+html;
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar itens.</div>';}
}
async function _toggleReuniaoItem(itemId,concluido,reuniaoId){
  try{
    await dbUpsertReuniaoItem({id:itemId,estado:concluido?'concluido':'pendente'});
    var row=document.getElementById("reun-item-"+itemId);
    if(row){
      var sp=row.querySelector("span:not(.reun-status-chip)");
      if(sp){sp.style.color=concluido?'var(--text3)':'var(--bt-navy)';sp.style.textDecoration=concluido?'line-through':'';}
    }
  }catch(e){toast("Erro",true);var cb=document.querySelector("input[onchange*=\"'"+itemId+"'\"]");if(cb)cb.checked=!concluido;}
}
async function _delReuniaoItem(itemId,reuniaoId){
  try{await dbDelReuniaoItem(itemId);_loadReuniaoItens(reuniaoId);toast("Item removido!");}
  catch(e){toast("Erro",true);}
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
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,520px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">'+(isEdit?"Editar reuniao":"Nova reuniao")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Titulo</label><input id="rf-titulo" value="'+(r.titulo||"")+'"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="field">'
    +'<div><label>Data</label><input type="date" id="rf-data" value="'+(r.data||"")+'"/></div>'
    +'<div><label>Hora</label><input type="time" id="rf-hora" value="'+(r.hora?r.hora.slice(0,5):"09:30")+'"/></div>'
    +'</div>'
    +'<div class="field"><label>Status</label><select id="rf-status"><option value="agendada"'+(r.status==="agendada"?" selected":"")+'>Agendada</option><option value="realizada"'+(r.status==="realizada"?" selected":"")+'>Realizada</option><option value="cancelada"'+(r.status==="cancelada"?" selected":"")+'>Cancelada</option></select></div>'
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
  var obj={data,hora:hora+":00",status,observacoes:obs||null,equipe_id,criado_por:userDbId};
  if(titulo)obj.titulo=titulo;
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
      // Cria notificacoes para membros da equipe
      if(equipe_id){
        var titulo_r=obj.titulo||("Reuniao de "+_fmtData(obj.data));
        await criarNotifParaMembros(equipe_id,"reuniao_criada",criada.id,"Nova reuniao agendada: "+titulo_r+" em "+_fmtData(obj.data));
      }
    }
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
  var ce=perfil==="mestre"||perfil==="advogado";
  try{
    var parts=await dbFetchReuniaoParticipantes(reuniaoId);
    if(!parts.length){
      el.innerHTML='<span style="font-size:12px;color:var(--text3);">Nenhum participante.'
        +(ce?' <button onclick="openGerenciarParticipantes(\''+reuniaoId+'\')" style="background:none;border:none;color:var(--bt-navy);cursor:pointer;font-size:12px;font-weight:600;text-decoration:underline;">Adicionar</button>':'')
        +'</span>';
      return;
    }
    var avs=parts.map(function(p){
      var u=p.usuarios||{};
      var nome=u.nome||u.email||'?';
      var ini=u.sigla||(nome.replace(/\s+/g,' ').trim().split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase());
      var cor=_avCor(u.id||nome);
      return '<div class="av" style="background:'+cor+';" title="'+nome+'">'+ini+'</div>';
    }).join("");
    el.innerHTML='<div class="av-group" style="flex-direction:row;">'+avs+'</div>';
  }catch(_){if(el)el.innerHTML='';}
}
async function openGerenciarParticipantes(reuniaoId){
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,460px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Participantes</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
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
    +'<div style="display:flex;align-items:center;gap:8px;"><button onclick="renderReunioes()" style="background:none;border:none;cursor:pointer;color:var(--text3);display:flex;align-items:center;gap:4px;font-size:12px;">'+ic("back")+' Reunioes</button><div style="font-size:18px;font-weight:700;color:var(--bt-navy);">Pautas</div></div>'
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
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">'+(p?"Editar pauta":"Nova pauta")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
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
var _apCatSel=null;var _apAtivosIds=[];var _apReuniao=null;
async function openAdicionarPauta(reuniaoId){
  _apReuniao=reuniaoId;
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,640px);padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:90vh;">'
    +'<div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);flex-shrink:0;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Adicionar itens de pauta</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="ap-body" style="display:flex;flex:1;overflow:hidden;min-height:320px;">'
    +'<div style="padding:20px;text-align:center;color:var(--text3);width:100%;">Carregando...</div>'
    +'</div>'
    +'<div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
    +(perfil==='mestre'?'<button onclick="closeModal();renderPautaCategorias()" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Gerenciar categorias</button>':'<div></div>')
    +'<button class="btn" onclick="closeModal()">Fechar</button>'
    +'</div>'
    +'</div></div>';
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var cats=await dbFetchPautaCategorias(eqId);
    var itensAtivos=await dbFetchReuniaoItens(reuniaoId);
    _apAtivosIds=itensAtivos.map(function(ri){return ri.item_id;});
    _apRenderDoisPaineis(reuniaoId,cats,cats[0]?cats[0].id:null);
  }catch(e){var b=document.getElementById("ap-body");if(b)b.innerHTML='<div style="padding:20px;color:var(--text3);">Erro ao carregar.</div>';}
}
function _apRenderDoisPaineis(reuniaoId,cats,catSelId){
  _apCatSel=catSelId;
  var body=document.getElementById("ap-body");if(!body)return;
  if(!cats.length){
    body.innerHTML='<div style="padding:20px;color:var(--text3);text-align:center;width:100%;">Nenhuma categoria. Clique em "Gerenciar categorias" para criar.</div>';
    return;
  }
  var leftHTML='<div id="ap-cats" style="width:200px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface);">';
  cats.forEach(function(cat){
    var sel=cat.id===catSelId;
    leftHTML+='<div onclick="_apSelectCat(\''+cat.id+'\')" style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:'+(sel?'#fff':'')+';border-left:3px solid '+(sel?'var(--bt-orange)':'transparent')+';">'
      +'<span style="font-size:13px;font-weight:'+(sel?'700':'400')+';color:var(--bt-navy);">'+cat.nome+'</span>'
      +'<span id="ap-cat-badge-'+cat.id+'" style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:#e2e8f0;color:var(--text3);">...</span>'
      +'</div>';
  });
  leftHTML+='</div>';
  body.innerHTML=leftHTML+'<div id="ap-items" style="flex:1;overflow-y:auto;padding:4px 0;"></div>';
  cats.forEach(function(cat){
    dbFetchPautaItens(cat.id).then(function(itens){
      var badge=document.getElementById("ap-cat-badge-"+cat.id);
      if(badge)badge.textContent=itens.length;
    }).catch(function(){});
  });
  if(catSelId)_apLoadItens(catSelId);
}
async function _apSelectCat(catId){
  _apCatSel=catId;
  var allDivs=document.querySelectorAll("#ap-cats > div");
  allDivs.forEach(function(div){
    var isSel=div.getAttribute("onclick")&&div.getAttribute("onclick").indexOf(catId)>=0;
    div.style.background=isSel?'#fff':'';
    div.style.borderLeftColor=isSel?'var(--bt-orange)':'transparent';
    var sp=div.querySelector("span:first-child");if(sp)sp.style.fontWeight=isSel?'700':'400';
  });
  _apLoadItens(catId);
}
async function _apLoadItens(catId){
  var el=document.getElementById("ap-items");if(!el)return;
  el.innerHTML='<div style="padding:16px;color:var(--text3);font-size:12px;">Carregando...</div>';
  try{
    var itens=await dbFetchPautaItens(catId);
    if(!itens.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhum item nesta categoria.</div>';return;}
    el.innerHTML=itens.map(function(item){
      var ativo=(_apAtivosIds||[]).indexOf(item.id)>=0;
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);">'
        +'<input type="checkbox" id="ap-item-'+item.id+'"'+(ativo?' checked':'')+' onchange="_apToggleItem(\''+item.id+'\',\''+catId+'\',this.checked)" style="width:auto;cursor:pointer;flex-shrink:0;"/>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);">'+item.titulo+'</div>'
        +(item.descricao?'<div style="font-size:11px;color:var(--text3);margin-top:1px;">'+item.descricao+'</div>':"")
        +'</div>'
        +(item.recorrente?'<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:#f0fdf4;color:#15803d;flex-shrink:0;">REC</span>':"")
        +'</div>';
    }).join("");
  }catch(e){if(el)el.innerHTML='<div style="padding:16px;color:var(--text3);">Erro ao carregar.</div>';}
}
async function _apToggleItem(itemId,catId,checked){
  var reuniaoId=_apReuniao;if(!reuniaoId)return;
  try{
    if(checked){
      await dbUpsertReuniaoItem({reuniao_id:reuniaoId,item_id:itemId,categoria_id:catId,estado:'pendente'});
      if(!_apAtivosIds)_apAtivosIds=[];_apAtivosIds.push(itemId);
    } else {
      var itens=await dbFetchReuniaoItens(reuniaoId);
      var ri=itens.find(function(x){return x.item_id===itemId;});
      if(ri)await dbDelReuniaoItem(ri.id);
      _apAtivosIds=(_apAtivosIds||[]).filter(function(id){return id!==itemId;});
    }
    var area=document.getElementById("reuniao-itens-area");if(area)_loadReuniaoItens(reuniaoId);
  }catch(e){var cb=document.getElementById("ap-item-"+itemId);if(cb)cb.checked=!checked;toast("Erro",true);}
}
function _apTab(n,reuniaoId){
  var p1=document.getElementById("ap-panel-1");
  var p2=document.getElementById("ap-panel-2");
  var t1=document.getElementById("ap-tab-1");
  var t2=document.getElementById("ap-tab-2");
  if(!p1||!p2)return;
  p1.style.display=n===1?'':'none';p2.style.display=n===2?'':'none';
  if(t1){t1.style.color=n===1?'var(--bt-navy)':'var(--text3)';t1.style.borderBottomColor=n===1?'var(--bt-navy)':'transparent';}
  if(t2){t2.style.color=n===2?'var(--bt-navy)':'var(--text3)';t2.style.borderBottomColor=n===2?'var(--bt-navy)':'transparent';}
}
async function adicionarPautaExistenteReuniao(reuniaoId,pautaId){
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    if(rps.find(function(rp){return rp.pauta_id===pautaId;})){toast("Pauta ja adicionada a esta reuniao",true);return;}
    await dbUpsertReuniaoPauta({reuniao_id:reuniaoId,pauta_id:pautaId,ordem:rps.length,snapshot_json:{notas:null}});
    closeModal();_loadReuniaoPautas(reuniaoId);toast("Pauta adicionada!");
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
    closeModal();_loadReuniaoPautas(reuniaoId);toast("Pauta criada e adicionada!");
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
    _loadReuniaoPautas(reuniaoId);toast("Notas salvas!");
  }catch(e){toast("Erro ao salvar",true);}
}
function _cancelPautaEdit(rpId,reuniaoId){
  window._pbiDemandas=null;
  _loadReuniaoPautas(reuniaoId);
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
    +'<div style="font-size:15px;font-weight:700;color:var(--bt-navy);">Historico: '+pauta.titulo+'</div>'
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
      if(reuniaoAtiva)_loadReuniaoPautas(reuniaoAtiva.id);
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
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">'+(p?"Editar projeto":"Novo projeto interno")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Titulo *</label><input id="proj-titulo" value="'+(p?p.titulo:'')+'"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="field">'
    +'<div><label>Tipo</label><select id="proj-tipo"><option value="continuo"'+((!p||p.tipo==="continuo"||!p.tipo)?" selected":"")+'>Continuo</option><option value="pontual"'+((p&&p.tipo==="pontual")?" selected":"")+'>Pontual (checklist)</option></select></div>'
    +'<div><label>Status</label><select id="proj-status"><option value="em_andamento"'+((!p||p.status==="em_andamento")?" selected":"")+'>Em andamento</option><option value="concluido"'+((p&&p.status==="concluido")?" selected":"")+'>Concluido</option><option value="pausado"'+((p&&p.status==="pausado")?" selected":"")+'>Pausado</option></select></div>'
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
  if(id)obj.id=id;
  try{
    var salvo=await dbUpsertProjeto(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    projetosDB=await dbFetchProjetos(eqId);
    if(id&&_checklistCache[id])delete _checklistCache[id];
    closeModal();
    if(reuniaoAtiva)_loadReuniaoPautas(reuniaoAtiva.id);
    toast("Projeto salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function delProjeto(id){
  closeModal();
  modalConfirm("Excluir este projeto? O checklist e comentarios tambem serao removidos.",async function(){
    try{
      await dbDelProjeto(id);
      projetosDB=projetosDB.filter(function(p){return p.id!==id;});
      delete _projExpanded[id];delete _checklistCache[id];
      if(reuniaoAtiva)_loadReuniaoPautas(reuniaoAtiva.id);
      toast("Projeto excluido!");
    }catch(e){toast("Erro",true);}
  });
}
async function openProjetoComentarios(projetoId){
  var p=projetosDB.find(function(x){return x.id===projetoId;})||{titulo:"Projeto"};
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,580px);max-height:85vh;display:flex;flex-direction:column;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0;">'
    +'<div style="font-size:15px;font-weight:700;color:var(--bt-navy);">'+p.titulo+'</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="proj-cmts" style="flex:1;overflow-y:auto;min-height:80px;padding-right:2px;">Carregando...</div>'
    +'<div style="margin-top:12px;flex-shrink:0;border-top:1px solid var(--border);padding-top:12px;">'
    +'<textarea id="proj-cmt-txt" rows="2" placeholder="Adicionar comentario..." style="width:100%;resize:none;"></textarea>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:6px;gap:6px;">'
    +'<button class="btn btn-primary" onclick="addProjetoComentario(\''+projetoId+'\')">Comentar</button>'
    +'</div></div></div></div>';
  _loadProjetoComentarios(projetoId);
}
async function _loadProjetoComentarios(projetoId){
  var el=document.getElementById("proj-cmts");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  try{
    var cmts=await dbFetchProjetoComentarios(projetoId);
    if(!cmts.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0;">Nenhum comentario ainda.</div>';return;}
    el.innerHTML=cmts.map(function(c){
      var u=c.usuarios||{};
      var isSinal=c.tipo==='sinalizado';
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre')&&ce;
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
  if(!txt){toast("Escreva um comentario",true);return;}
  try{
    await dbUpsertProjetoComentario({projeto_id:projetoId,usuario_id:userDbId,texto:txt,tipo:"comentario"});
    document.getElementById("proj-cmt-txt").value="";
    _loadProjetoComentarios(projetoId);
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
    +'<button onclick="_loadProjetoComentarios(\''+projetoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
    +'<button onclick="salvarComentarioProjeto(\''+cId+'\',\''+projetoId+'\')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
    +'</div></div></div>';
}
async function salvarComentarioProjeto(cId,projetoId){
  var txt=(document.getElementById("cmt-edit-"+cId).value||"").trim();
  if(!txt){toast("Texto nao pode ser vazio",true);return;}
  try{
    await dbUpsertProjetoComentario({id:cId,texto:txt});
    _loadProjetoComentarios(projetoId);toast("Comentario editado!");
  }catch(e){toast("Erro",true);}
}
async function delComentarioProjeto(cId,projetoId){
  modalConfirm("Excluir este comentario?",async function(){
    try{
      await dbDelProjetoComentario(cId);
      _loadProjetoComentarios(projetoId);toast("Comentario excluido!");
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
    return '<div style="padding:10px 14px;border-bottom:1px solid var(--border);background:'+(n.lida?"#fff":"#eff6ff")+';cursor:default;">'
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

// ── GERAR ATA ──
async function gerarAta(reuniaoId){
  var r=reunioesDB.find(function(x){return x.id===reuniaoId;});if(!r)return;
  var rps=await dbFetchReuniaoPautas(reuniaoId);
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
  linhas.push("","--- Fim da ata ---");
  var texto=linhas.join("\n");
  var blob=new Blob([texto],{type:"text/plain;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.download="ata-"+dataFmt.replace(/\//g,"-")+".txt";a.click();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  toast("Ata gerada!");
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

  if(!destinatarios.length&&!p.responsavel_id){
    toast("Nenhum destinatario encontrado. Configure participantes da reuniao ou e-mails extras em E-mails > Configuracoes.",true);
    return;
  }

  try{
    var btn=document.querySelector("[onclick=\"sinalizarProjeto('"+projetoId+"')\"]");
    if(btn){btn.textContent="Enviando...";btn.disabled=true;}
    await enviarEmail({destinatarios,assunto,corpo_html,tipo:"projeto_sinalizado",referencia_id:projetoId});
    // Notificacao interna para participantes da reuniao ativa
    if(reuniaoAtiva){
      await criarNotifParaParticipantes(reuniaoAtiva.id,"projeto_sinalizado",projetoId,"Projeto sinalizado: "+p.titulo);
      notificacoesDB=await dbFetchNotificacoes();
    }
    toast("Sinalizacao enviada!");
    if(btn){btn.textContent="! Sinalizar";btn.disabled=false;}
  }catch(e){
    toast("Erro ao enviar: "+e.message,true);
    var btn2=document.querySelector("[onclick=\"sinalizarProjeto('"+projetoId+"')\"]");
    if(btn2){btn2.textContent="! Sinalizar";btn2.disabled=false;}
  }
}

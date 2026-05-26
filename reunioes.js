// ── REUNIOES ──
var _calMes=(new Date()).getMonth();
var _calAno=(new Date()).getFullYear();
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
    +'<div class="reun-section-label">Pautas</div>'
    +(ce?'<button onclick="openGerenciarPautas(\''+r.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Gerenciar</button>':"")
    +'</div>'
    +'<div id="reun-pautas-area">Carregando...</div>'
    +'</div>';
  html+='<div class="reun-section">'
    +'<div class="reun-section-label" style="margin-bottom:10px;">Comentarios</div>'
    +'<div id="reun-cmts-area">Carregando...</div>'
    +'</div>';
  html+='</div>';
  setTimeout(function(){_loadParticipantesArea(r.id);_loadPautasSection(r.id);_loadReuniaoComentarios(r.id);},0);
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
    if(!users.length){el.innerHTML='<span style="font-size:12px;color:var(--text3);">Nenhum participante.</span>';return;}
    var avs=users.map(function(u){
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
var _apCatSel=null;var _apReuniao=null;var _gpEditando=null;
async function openGerenciarPautas(reuniaoId){
  _apReuniao=reuniaoId;
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="_apAplicar()"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,860px);min-width:min(95vw,800px);min-height:600px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:90vh;">'
    +'<div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);flex-shrink:0;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Gerenciar pautas</div>'
    +'<button onclick="_apAplicar()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button>'
    +'</div>'
    +'<div id="ap-body" style="display:flex;flex:1;overflow:hidden;min-height:320px;">'
    +'<div style="padding:20px;text-align:center;color:var(--text3);width:100%;">Carregando...</div>'
    +'</div>'
    +'<div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;align-items:center;flex-shrink:0;">'
    +'<button class="btn" onclick="_apAplicar()">Aplicar</button>'
    +'</div>'
    +'</div></div>';
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var cats=await dbFetchPautaCategorias(eqId);
    _apRenderDoisPaineis(reuniaoId,cats,cats[0]?cats[0].id:null);
  }catch(e){var b=document.getElementById("ap-body");if(b)b.innerHTML='<div style="padding:20px;color:var(--text3);">Erro ao carregar.</div>';}
}
async function _apAplicar(){
  var reuniaoId=_apReuniao;
  closeModal();
  if(reuniaoId)await _loadPautasSection(reuniaoId);
}
var _apCats=[];
function _apRenderDoisPaineis(reuniaoId,cats,catSelId){
  _apCatSel=catSelId;
  _apCats=cats;
  var body=document.getElementById("ap-body");if(!body)return;
  _apRenderCatList(cats,catSelId);
  body.innerHTML=document.getElementById("ap-cats-wrap")?body.innerHTML:'';
  var leftHTML='<div id="ap-cats-wrap" style="width:220px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--surface);">'
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
      +'<span id="ap-cat-nome-'+cat.id+'" onclick="_apSelectCat(\''+cat.id+'\')" style="font-size:13px;font-weight:'+(sel?'700':'400')+';color:var(--bt-navy);flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+cat.nome+'</span>'
      +'<span id="ap-cat-badge-'+cat.id+'" style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:20px;background:#e2e8f0;color:var(--text3);flex-shrink:0;">...</span>'
      +'<button onclick="event.stopPropagation();_apIniciarEditCat(\''+cat.id+'\',\''+cat.nome.replace(/'/g,"\\'")+'\')" title="Editar" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text3);font-size:13px;flex-shrink:0;" onmouseover="this.style.color=\'#2563eb\'" onmouseout="this.style.color=\'var(--text3)\'">'+ic("edit")+'</button>'
      +'<button onclick="event.stopPropagation();_apDeletarCategoria(\''+cat.id+'\')" title="Excluir" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text3);font-size:13px;flex-shrink:0;" onmouseover="this.style.color=\'#dc2626\'" onmouseout="this.style.color=\'var(--text3)\'">'+ic("trash")+'</button>'
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
      _apCats.forEach(function(cat){var b=document.getElementById("ap-cat-badge-"+cat.id);if(b)b.textContent=counts[cat.id]||0;});
    }).catch(function(){});
}
async function _gpLoadItens(catId){
  var el=document.getElementById("ap-items");if(!el)return;
  el.innerHTML='<div style="padding:16px;color:var(--text3);font-size:12px;">Carregando...</div>';
  var reuniaoId=_apReuniao;
  try{
    var r1=await fetch(SB+"/rest/v1/tarefas?pauta_categoria_id=eq."+catId+"&parent_id=is.null&order=criado_em",{headers:H});
    var itens=r1.ok?await r1.json():[];
    var r2=await fetch(SB+"/rest/v1/reuniao_tarefas?reuniao_id=eq."+reuniaoId+"&select=tarefa_id",{headers:H});
    var linked=r2.ok?await r2.json():[];
    var linkedIds={};linked.forEach(function(x){linkedIds[x.tarefa_id]=true;});
    var respOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join("");
    var formHTML='<div id="gp-novo-item-form" style="display:none;padding:12px 14px;border-bottom:2px solid var(--bt-orange);background:#fffbf5;">'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Titulo *</label>'
      +'<input id="gp-ni-titulo" placeholder="Titulo da tarefa..." style="font-size:13px;"/></div>'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Descricao</label>'
      +'<textarea id="gp-ni-descricao" rows="2" placeholder="Descricao opcional..." style="font-size:13px;resize:vertical;"></textarea></div>'
      +'<div class="field" style="margin-bottom:7px;"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Responsavel</label>'
      +'<select id="gp-ni-resp" style="font-size:13px;">'+respOpts+'</select></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
      +'<div class="field"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Inicio</label>'
      +'<input id="gp-ni-inicio" type="date" style="font-size:13px;"/></div>'
      +'<div class="field"><label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Encerramento</label>'
      +'<input id="gp-ni-fim" type="date" style="font-size:13px;"/></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
      +'<button onclick="_gpCancelarNovaTarefa()" style="font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_gpSalvarNovaTarefa(\''+catId+'\')" class="btn" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
    var btnHTML='<div style="padding:10px 14px;border-bottom:1px solid var(--border);">'
      +'<button onclick="_gpMostrarNovaTarefa()" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Nova tarefa</button>'
      +'</div>';
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
    el.innerHTML=formHTML+btnHTML+listaHTML;
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
  var inicio=document.getElementById("gp-ni-inicio").value||null;
  var fim=document.getElementById("gp-ni-fim").value||null;
  var eqId=equipeAtiva?equipeAtiva.id:null;
  try{
    var tarefaId=uid();
    await dbUpsertTarefa({id:tarefaId,texto:texto,descricao:descricao||null,responsavel:resp||null,status:'pendente',data_inicio:inicio||null,data_fim:fim||null,pauta_categoria_id:catId,equipe_id:eqId,criado_em:new Date().toISOString()});
    await dbUpsertReuniaoTarefa({reuniao_id:_apReuniao,tarefa_id:tarefaId});
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
    if(checked){await dbUpsertReuniaoTarefa({reuniao_id:reuniaoId,tarefa_id:tarefaId});}
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
    if(reuniaoAtiva)_loadPautasSection(reuniaoAtiva.id);
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
      if(reuniaoAtiva)_loadPautasSection(reuniaoAtiva.id);
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

// ── PAUTAS SECTION ──
async function _loadPautasSection(reuniaoId){
  var el=document.getElementById("reun-pautas-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var reuniao=reunioesDB.find(function(r){return r.id===reuniaoId;})||reuniaoAtiva||{};
  var hoje=new Date().toISOString().slice(0,10);
  var ehPassado=!!(reuniao.data&&reuniao.data<hoje);
  try{
    var tarefas=await dbFetchTarefasReuniao(reuniaoId);
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
    try{var catsDB=await dbFetchPautaCategorias(eqId);catsDB.forEach(function(c){if(cats[c.id])cats[c.id].nome=c.nome;});}catch(_){}
    var html='<div style="display:flex;flex-direction:column;gap:16px;">';
    catOrder.forEach(function(catId){
      var cat=cats[catId];
      html+='<div style="border:1px solid var(--border);border-radius:12px;overflow:visible;">';
      html+='<div style="padding:9px 16px;background:var(--surface);font-size:11px;font-weight:700;color:var(--bt-navy);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);">'+cat.nome+'</div>';
      html+='<div style="overflow-x:auto;">';
      html+='<div class="rt-thead">'
        +'<div class="rt-th">Tarefa</div>'
        +'<div class="rt-th">Responsavel</div>'
        +'<div class="rt-th">Status</div>'
        +'<div class="rt-th">Inicio</div>'
        +'<div class="rt-th">Encerramento</div>'
        +'<div class="rt-th"></div>'
        +'</div>';
      html+='<div class="rt-table">';
      cat.itens.forEach(function(t){
        html+='<div id="tp-card-'+t.id+'">'+_buildTarefaCard(t,ce,ehPassado)+'</div>';
      });
      html+='</div>';
      html+='</div>';
      if(ce&&!ehPassado){
        html+='<button class="rt-cat-add-btn" onclick="openAdicionarPauta(\''+reuniaoId+'\')">'
          +'<span style="font-size:16px;line-height:1;font-weight:300;">+</span> Nova tarefa'
          +'</button>';
      }
      html+='</div>';
    });
    html+='</div>';
    el.innerHTML=html;
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar pautas.</div>';}
}
var _itemEditando=null;
var _subEditando=null;
function _fmtDateBr(d){if(!d)return '';var p=d.split('-');if(p.length<3)return d;return p[2]+'/'+p[1]+'/'+p[0];}
function _fmtDateBrShort(d){if(!d)return '';var p=d.split('-');if(p.length<3)return d;return p[2]+'/'+p[1];}
function _isAtrasado(dataFim,status){if(!dataFim||status==='concluido')return false;var hoje=new Date().toISOString().slice(0,10);return dataFim<hoje;}
function _buildTarefaCard(t,ce,ehPassado){
  var corBar={'pendente':'#E24B4A','em_andamento':'#185FA5','pausado':'#EF9F27','concluido':'#639922'};
  var corBg={'pendente':'#FCEBEB','em_andamento':'#E6F1FB','pausado':'#FAEEDA','concluido':'#EAF3DE'};
  var corTxt={'pendente':'#A32D2D','em_andamento':'#0C447C','pausado':'#854F0B','concluido':'#27500A'};
  var lblStatus={'pendente':'Pendente','em_andamento':'Em andamento','pausado':'Pausado','concluido':'Concluida'};
  var bar=corBar[t.status]||'#E24B4A';
  var bg=corBg[t.status]||'#FCEBEB';
  var txt=corTxt[t.status]||'#A32D2D';
  var lbl=lblStatus[t.status]||t.status||'Pendente';
  var subtarefas=_subtarefasCache[t.id]||null;
  var cmts=_tarefaCmtsCache[t.id]||null;
  var cmtsExp=!!_tarefaCmtsExpanded[t.id];
  var subExp=subtarefas!==null&&!_subCollapsed[t.id];
  var canEdit=ce&&!ehPassado&&_itemEditando!==t.id;
  var html='';

  // ── linha principal ──
  html+='<div class="rt-row" style="border-left:3px solid '+bar+';">';
  html+='<div class="rt-cell rt-cell-task" style="align-items:flex-start;">';
  html+='<div style="display:flex;align-items:flex-start;gap:5px;width:100%;">';
  html+='<span onclick="_toggleSubExpand(\''+t.id+'\','+!!ehPassado+')" style="font-size:11px;display:inline-block;transition:transform .15s;cursor:pointer;flex-shrink:0;margin-top:3px;'+(subExp?'transform:rotate(90deg);color:var(--bt-navy);':'color:var(--text3);')+'">&#9658;</span>';
  html+='<div style="min-width:0;flex:1;">';
  html+='<div id="tp-txt-'+t.id+'" style="font-size:13px;font-weight:600;line-height:1.35;'+(t.status==='concluido'?'text-decoration:line-through;color:var(--text3);':'color:var(--bt-navy);')+(canEdit?'cursor:pointer;':'')+'"'
    +(canEdit?' onclick="event.stopPropagation();_iniciarEdicaoTitulo(\''+t.id+'\',false,null,'+!!ehPassado+')" title="Clique para editar"':'')+'>'+t.texto+'</div>';
  if(subExp){
    if(t.descricao){
      html+='<div id="tp-desc-'+t.id+'" style="font-size:11px;color:var(--text3);line-height:1.35;white-space:pre-wrap;'+(canEdit?'cursor:text;':'')+'"'
        +(canEdit?' onclick="event.stopPropagation();_iniciarEdicaoDescricaoMain(\''+t.id+'\','+!!ehPassado+')"':'')+'>'+t.descricao+'</div>';
    } else if(canEdit){
      html+='<div id="tp-desc-'+t.id+'" onclick="event.stopPropagation();_iniciarEdicaoDescricaoMain(\''+t.id+'\','+!!ehPassado+')" style="font-size:11px;color:var(--text3);font-style:italic;cursor:text;">Adicionar descricao...</div>';
    }
    if(subtarefas&&subtarefas.length>0){
      var conc=subtarefas.filter(function(s){return s.status==='concluido';}).length;
      html+='<div class="rt-progress">';
      subtarefas.forEach(function(s){var sc={'concluido':'#639922','em_andamento':'#185FA5','pausado':'#EF9F27','pendente':'#E24B4A'}[s.status]||'#E24B4A';html+='<div class="rt-progress-seg" style="background:'+sc+';"></div>';});
      html+='</div><span style="font-size:10px;color:var(--text3);">'+conc+'/'+subtarefas.length+'</span>';
    }
  }
  var nCmts=cmts?cmts.length:0;
  html+='<span onclick="_toggleTarefaCmts(\''+t.id+'\','+!!ehPassado+')" style="font-size:11px;color:var(--text3);cursor:pointer;margin-top:3px;">Comentarios ('+nCmts+')</span>';
  html+='</div>';
  html+='</div>';
  html+='</div>';
  if(t.responsavel){
    var u=(usuariosFullDB||[]).find(function(x){return x.sigla===t.responsavel;})||{};
    var ini=t.responsavel.slice(0,2).toUpperCase();
    html+='<div class="rt-cell" style="gap:5px;">'
      +'<div class="av av-sm" style="background:'+_avCor(u.id||t.responsavel)+';flex-shrink:0;font-size:9px;width:22px;height:22px;min-width:22px;">'+ini+'</div>'
      +'<span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+t.responsavel+'</span>'
      +'</div>';
  } else {html+='<div class="rt-cell"></div>';}
  html+='<div class="rt-cell">'
    +'<span id="sc-'+t.id+'" class="reun-status-chip" style="background:'+bg+';color:'+txt+';border:1px solid '+txt+'44;font-size:11px;'+(ce&&!ehPassado?'cursor:pointer;':'')+'"'
    +(ce&&!ehPassado?' onclick="_abrirStatusDropdown(\''+t.id+'\',false,null,'+!!ehPassado+')"':'')
    +'>'+lbl+'</span></div>';
  html+='<div class="rt-cell" style="font-size:11px;color:var(--text3);">'+(t.data_inicio?_fmtDateBrShort(t.data_inicio):'-')+'</div>';
  var atrasado=_isAtrasado(t.data_fim,t.status);
  html+='<div class="rt-cell" style="font-size:11px;color:'+(atrasado?'#dc2626':'var(--text3)')+';font-weight:'+(atrasado?'700':'400')+';">'+(t.data_fim?_fmtDateBrShort(t.data_fim):'-')+'</div>';
  html+='<div class="rt-cell rt-actions">';
  if(ce&&!ehPassado){
    html+='<button onclick="_editarTarefaPauta(\''+t.id+'\')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid var(--border);color:var(--text2);background:var(--surface);cursor:pointer;" title="Editar">'+ic("edit")+'</button>';
    html+='<button onclick="_showAddSubtarefaPauta(\''+t.id+'\','+!!ehPassado+')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid var(--border);color:var(--text2);background:var(--surface);cursor:pointer;" title="Subtarefa">&#8627;</button>';
    html+='<button onclick="_excluirTarefaPauta(\''+t.id+'\')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;" title="Excluir">'+ic("trash")+'</button>';
  }
  html+='</div>';
  html+='</div>';

  // ── form de edicao ──
  if(_itemEditando===t.id){
    var respOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(t.responsavel===s?' selected':'')+'>'+s+'</option>';}).join("");
    var statusOpts=['pendente','em_andamento','pausado','concluido'].map(function(s){return '<option value="'+s+'"'+(t.status===s?' selected':'')+'>'+lblStatus[s]+'</option>';}).join("");
    html+='<div class="rt-edit-form">'
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

  // ── subtarefas ──
  if(subExp){
    html+='<div class="rt-sub-group">';
    subtarefas.forEach(function(s){
      var sBg=corBg[s.status]||'#FCEBEB';
      var sTxt=corTxt[s.status]||'#A32D2D';
      var sBar=corBar[s.status]||'#E24B4A';
      var sLbl=lblStatus[s.status]||s.status;
      if(_subEditando===s.id){
        var sStatOpts=['pendente','em_andamento','pausado','concluido'].map(function(ss){return '<option value="'+ss+'"'+(s.status===ss?' selected':'')+'>'+lblStatus[ss]+'</option>';}).join("");
        var sRespOpts='<option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(sr){return '<option value="'+sr+'"'+(s.responsavel===sr?' selected':'')+'>'+sr+'</option>';}).join("");
        html+='<div class="rt-edit-form" style="padding-left:44px;">'
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
        html+='<div class="rt-sub-row">';
        html+='<div class="rt-cell rt-cell-sub-task">';
        html+='<span id="tp-stxt-'+s.id+'" style="font-size:12px;font-weight:500;'+(s.status==='concluido'?'color:var(--text3);text-decoration:line-through;':'color:var(--text2);')+((ce&&!ehPassado&&_subEditando!==s.id)?'cursor:pointer;':'')+'"'
          +((ce&&!ehPassado&&_subEditando!==s.id)?' onclick="event.stopPropagation();_iniciarEdicaoTitulo(\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')" title="Clique para editar"':'')+'>'+s.texto+'</span>';
        if(s.descricao){
          html+='<div id="tp-sdesc-'+s.id+'" style="font-size:11px;color:var(--text3);white-space:pre-wrap;line-height:1.35;'+((ce&&!ehPassado)?'cursor:text;':'')+'"'
            +((ce&&!ehPassado)?' onclick="_iniciarEdicaoDescricaoSub(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')"':'')+'>'+s.descricao+'</div>';
        } else if(ce&&!ehPassado){
          html+='<div id="tp-sdesc-'+s.id+'" onclick="_iniciarEdicaoDescricaoSub(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')" style="font-size:11px;color:var(--text3);font-style:italic;cursor:text;">Adicionar descricao...</div>';
        }
        html+='</div>';
        if(s.responsavel){
          var su=(usuariosFullDB||[]).find(function(x){return x.sigla===s.responsavel;})||{};
          var sini=s.responsavel.slice(0,2).toUpperCase();
          html+='<div class="rt-cell" style="gap:5px;">'
            +'<div class="av av-sm" style="background:'+_avCor(su.id||s.responsavel)+';flex-shrink:0;font-size:9px;width:22px;height:22px;min-width:22px;">'+sini+'</div>'
            +'<span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+s.responsavel+'</span>'
            +'</div>';
        } else {html+='<div class="rt-cell"></div>';}
        html+='<div class="rt-cell">'
          +'<span style="font-size:10px;padding:1px 7px;border-radius:9px;background:'+sBg+';color:'+sTxt+';border:1px solid '+sTxt+'44;'+(ce&&!ehPassado?'cursor:pointer;':'')+'"'
          +(ce&&!ehPassado?' onclick="_abrirStatusDropdown(\''+s.id+'\',true,\''+t.id+'\','+!!ehPassado+')"':'')
          +'>'+sLbl+'</span></div>';
        html+='<div class="rt-cell" style="font-size:11px;color:var(--text3);">'+(s.data_inicio?_fmtDateBrShort(s.data_inicio):'-')+'</div>';
        var sAtrasado=_isAtrasado(s.data_fim,s.status);
        html+='<div class="rt-cell" style="font-size:11px;color:'+(sAtrasado?'#dc2626':'var(--text3)')+';font-weight:'+(sAtrasado?'700':'400')+';">'+(s.data_fim?_fmtDateBrShort(s.data_fim):'-')+'</div>';
        html+='<div class="rt-cell rt-actions">';
        if(ce&&!ehPassado){
          html+='<button onclick="_editarSubtarefaPauta(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid var(--border);color:var(--text2);background:var(--surface);cursor:pointer;">'+ic("edit")+'</button>';
          html+='<button onclick="_excluirSubtarefaPauta(\''+s.id+'\',\''+t.id+'\','+!!ehPassado+')" style="font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>';
        }
        html+='</div>';
        html+='</div>';
      }
    });
    html+='</div>';
    if(ce&&!ehPassado){
      html+='<div id="tp-add-sub-'+t.id+'" class="rt-add-sub-row" style="display:none;"></div>';
    }
  }

  // ── painel de comentarios ──
  if(cmtsExp&&subExp){
    html+='<div id="tp-cmts-'+t.id+'" class="rt-cmts-panel">';
    if(cmts===null){html+='<div style="font-size:12px;color:var(--text3);">Carregando...</div>';}
    else{html+=_buildTarefaCmtsHTML(cmts,t.id,ce,ehPassado);}
    html+='</div>';
  }
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
    await dbUpsertTarefa({id:tarefaId,texto:texto,descricao:descricao,responsavel:resp,status:status,data_inicio:inicio||null,data_fim:fim||null});
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId){t.texto=texto;t.descricao=descricao;t.responsavel=resp;t.status=status;t.data_inicio=inicio;t.data_fim=fim;}});
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
    await dbUpsertTarefa({id:subId,texto:texto,descricao:descricao,status:status,responsavel:respSE||null});
    (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===subId){s.texto=texto;s.descricao=descricao;s.status=status;s.responsavel=respSE||null;}});
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
  var respOptsSub='<option value="">Responsavel...</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join("");
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
    await dbUpsertTarefa({id:uid(),texto:texto,status:'pendente',responsavel:respSub||null,parent_id:parentId,reuniao_id:rId,equipe_id:eqId,criado_em:new Date().toISOString()});
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

// ── EDICAO INLINE DE TITULO ──
var _tituloEsc=false;
function _iniciarEdicaoTitulo(tarefaId,isSub,parentId,ehPassado){
  var elId=isSub?'tp-stxt-'+tarefaId:'tp-txt-'+tarefaId;
  var el=document.getElementById(elId);if(!el)return;
  var tex=(el.innerText||el.textContent||'').replace(/\n/g,'').trim();
  _tituloEsc=false;
  el.innerHTML='<input id="tp-tit-inp-'+tarefaId+'" type="text" value="'+tex.replace(/"/g,'&quot;')+'"'
    +' style="width:100%;display:block;font-size:inherit;font-weight:inherit;font-family:inherit;border:1.5px solid var(--bt-orange);border-radius:4px;padding:2px 6px;box-sizing:border-box;"'
    +' onkeydown="_tituloKeydown(event,\''+tarefaId+'\','+!!isSub+',\''+(parentId||'')+'\','+!!ehPassado+')"'
    +' onblur="_salvarTituloInline(\''+tarefaId+'\','+!!isSub+',\''+(parentId||'')+'\','+!!ehPassado+')" />';
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
  el.innerHTML='<textarea id="tp-sdesc-ta-'+subId+'" rows="2"'
    +' style="width:100%;display:block;font-size:11px;font-family:inherit;border:1.5px solid var(--bt-orange);border-radius:4px;padding:3px 6px;box-sizing:border-box;resize:vertical;"'
    +' onkeydown="_descKeydown(event,\''+subId+'\',\''+parentId+'\','+!!ehPassado+')"'
    +' onblur="_salvarDescricaoSub(\''+subId+'\',\''+parentId+'\','+!!ehPassado+')">'+tex+'</textarea>';
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
  el.innerHTML='<textarea id="tp-desc-ta-'+tarefaId+'" rows="2"'
    +' style="width:100%;display:block;font-size:12px;font-family:inherit;border:1.5px solid var(--bt-orange);border-radius:4px;padding:3px 6px;box-sizing:border-box;resize:vertical;"'
    +' onkeydown="_descMainKeydown(event,\''+tarefaId+'\','+!!ehPassado+')"'
    +' onblur="_salvarDescricaoMain(\''+tarefaId+'\','+!!ehPassado+')">'+tex+'</textarea>';
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
function _abrirStatusDropdown(tarefaId,isSub,parentId,ehPassado){
  var anchorId=isSub?null:"sc-"+tarefaId;
  var anchor=anchorId?document.getElementById(anchorId):null;
  var mc2=document.getElementById("modal-container2");if(!mc2)return;
  var lblStatus={'pendente':'Pendente','em_andamento':'Em andamento','pausado':'Pausado','concluido':'Concluido'};
  var corBg={'pendente':'#fee2e2','em_andamento':'#dbeafe','pausado':'#FAEEDA','concluido':'#dcfce7'};
  var corTxt={'pendente':'#dc2626','em_andamento':'#1d4ed8','pausado':'#854F0B','concluido':'#15803d'};
  var top=40,left=0;
  if(anchor){var rect=anchor.getBoundingClientRect();top=rect.bottom+4;left=rect.left;}
  var html='<div id="status-dd-ov" style="position:fixed;inset:0;z-index:2000;" onclick="document.getElementById(\'modal-container2\').innerHTML=\'\';">';
  html+='<div style="position:fixed;top:'+top+'px;left:'+left+'px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);padding:4px;min-width:150px;z-index:2001;" onclick="event.stopPropagation();">';
  ['pendente','em_andamento','pausado','concluido'].forEach(function(s){
    html+='<div onclick="_alterarStatusTarefa(\''+tarefaId+'\',\''+s+'\','+!!isSub+',\''+parentId+'\','+!!ehPassado+')" style="padding:7px 12px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">'
      +'<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+corTxt[s]+';flex-shrink:0;"></span>'
      +'<span style="font-size:13px;color:'+corTxt[s]+';">'+lblStatus[s]+'</span>'
      +'</div>';
  });
  html+='</div></div>';
  mc2.innerHTML=html;
}
async function _alterarStatusTarefa(tarefaId,novoStatus,isSub,parentId,ehPassado){
  document.getElementById("modal-container2").innerHTML="";
  try{
    await dbUpsertTarefa({id:tarefaId,status:novoStatus});
    if(isSub&&parentId){
      (_subtarefasCache[parentId]||[]).forEach(function(s){if(s.id===tarefaId)s.status=novoStatus;});
      _reloadTarefaCard(parentId,ehPassado);
    } else {
      var rId=reuniaoAtiva?reuniaoAtiva.id:'';
      (_tarefasPautaCache[rId]||[]).forEach(function(t){if(t.id===tarefaId)t.status=novoStatus;});
      _reloadTarefaCard(tarefaId,ehPassado);
    }
  }catch(_){toast("Erro ao alterar status",true);}
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
  var html='<div style="max-height:240px;overflow-y:auto;padding-right:2px;">';
  if(!cmts.length){html+='<div style="font-size:12px;color:var(--text3);font-style:italic;padding:4px 0;">Nenhum comentario.</div>';}
  else{
    cmts.forEach(function(c){
      var u=c.usuarios||{};var ini=(u.sigla||u.nome||'?').slice(0,2).toUpperCase();
      var corAv=_avCor(u.id||u.nome||'?');
      var dt=new Date(c.criado_em);var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre')&&ce&&!ehPassado;
      html+='<div id="tcmt-'+c.id+'" style="display:flex;gap:7px;padding:6px 0;border-bottom:1px solid var(--border);">';
      html+='<div class="av av-sm" style="background:'+corAv+';flex-shrink:0;">'+ini+'</div>';
      html+='<div style="flex:1;min-width:0;">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">';
      html+='<span style="font-size:11px;font-weight:700;color:var(--bt-navy);">'+(u.sigla||u.nome||'?')+'</span>';
      html+='<div style="display:flex;gap:3px;align-items:center;">';
      html+='<span style="font-size:10px;color:var(--text3);">'+dtStr+'</span>';
      if(canEdit)html+='<button onclick="_editTarefaComentarioInline(\''+c.id+'\',\''+tarefaId+'\','+!!ehPassado+')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>';
      if(canEdit)html+='<button onclick="_delTarefaComentario(\''+c.id+'\',\''+tarefaId+'\','+!!ehPassado+')" style="font-size:10px;padding:1px 4px;border-radius:4px;border:1px solid #fecaca;color:#dc2626;background:#fff;cursor:pointer;">'+ic("trash")+'</button>';
      html+='</div></div>';
      html+='<div style="font-size:13px;color:var(--text2);white-space:pre-wrap;line-height:1.5;margin-top:2px;">'+c.texto+'</div>';
      html+='</div></div>';
    });
  }
  html+='</div>';
  if(ce&&!ehPassado){
    var meIni=((nomeUser||'?').slice(0,2).toUpperCase());
    html+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">';
    html+='<div style="display:flex;gap:6px;align-items:flex-start;">';
    html+='<div class="av av-sm" style="background:'+_avCor(userDbId||'')+';flex-shrink:0;">'+meIni+'</div>';
    html+='<textarea id="tcmt-new-'+tarefaId+'" rows="2" placeholder="Comentar sobre esta tarefa..." style="flex:1;resize:none;font-size:13px;padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;"></textarea>';
    html+='<button onclick="_addTarefaComentario(\''+tarefaId+'\','+!!ehPassado+')" style="font-size:11px;padding:6px 12px;border-radius:6px;border:none;background:var(--bt-navy);color:#fff;cursor:pointer;flex-shrink:0;">Enviar</button>';
    html+='</div></div>';
  }
  return html;
}
async function _addTarefaComentario(tarefaId,ehPassado){
  var ta=document.getElementById("tcmt-new-"+tarefaId);
  var txt=(ta?ta.value||"":"").trim();if(!txt){toast("Escreva um comentario",true);return;}
  try{
    await dbUpsertTarefaComentario({tarefa_id:tarefaId,usuario_id:userDbId,texto:txt});
    _tarefaCmtsCache[tarefaId]=await dbFetchTarefaComentarios(tarefaId);
    var rId=reuniaoAtiva?reuniaoAtiva.id:'';
    var t=(_tarefasPautaCache[rId]||[]).find(function(x){return x.id===tarefaId;});
    var ce=perfil==="mestre"||perfil==="advogado";
    var el=document.getElementById("tp-card-"+tarefaId);
    if(el&&t)el.innerHTML=_buildTarefaCard(t,ce,!!ehPassado);
    toast("Comentario adicionado!");
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
async function _loadReuniaoComentarios(reuniaoId){
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
  if(!cmts.length){html+='<div style="font-size:12px;color:var(--text3);font-style:italic;padding:4px 0;">Nenhum comentario.</div>';}
  else{
    cmts.forEach(function(c){
      var u=c.usuarios||{};var ini=(u.sigla||u.nome||'?').slice(0,2).toUpperCase();
      var corAv=_avCor(u.id||u.nome||'?');
      var dt=new Date(c.criado_em);var dtStr=dt.toLocaleDateString("pt-BR")+' '+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      var canEdit=(c.usuario_id===userDbId||perfil==='mestre')&&ce&&!ehPassado;
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
  var txt=(ta?ta.value||"":"").trim();if(!txt){toast("Escreva um comentario",true);return;}
  try{
    await dbUpsertReuniaoComentario({reuniao_id:reuniaoId,usuario_id:userDbId,texto:txt});
    _loadReuniaoComentarios(reuniaoId);toast("Comentario adicionado!");
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
      +'<button onclick="_loadReuniaoComentarios(\''+reuniaoId+'\')" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Cancelar</button>'
      +'<button onclick="_saveReuniaoComentario(\''+cId+'\',\''+reuniaoId+'\')" class="btn btn-primary" style="font-size:11px;">Salvar</button>'
      +'</div></div>';
  }catch(_){toast("Erro",true);}
}
async function _saveReuniaoComentario(cId,reuniaoId){
  var txt=(document.getElementById("rcmt-edit-"+cId).value||"").trim();
  if(!txt){toast("Texto nao pode ser vazio",true);return;}
  try{
    await dbUpsertReuniaoComentario({id:cId,texto:txt});
    _loadReuniaoComentarios(reuniaoId);toast("Comentario editado!");
  }catch(_){toast("Erro",true);}
}
function _delReuniaoComentario(cId,reuniaoId){
  modalConfirm("Excluir este comentario?",async function(){
    try{await dbDelReuniaoComentario(cId);_loadReuniaoComentarios(reuniaoId);toast("Comentario excluido!");}
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

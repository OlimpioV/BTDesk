// ── REUNIOES ──
var _calMes=(new Date()).getMonth();
var _calAno=(new Date()).getFullYear();

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
    +'<div class="reun-sidebar">'
    +'<div class="reun-sidebar-hdr">'
    +'<span class="reun-sidebar-title">Reunioes</span>'
    +(ce?'<button onclick="openNovaReuniao()" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic("plus")+' Nova</button>':"")
    +'</div>'
    +'<div id="mini-cal-area"></div>'
    +'<div class="reun-sidebar-list">'+(listaSidebar||'<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma reuniao</div>')+'</div>'
    +'<div class="reun-sidebar-footer">'
    +'<div class="reun-section-label" style="margin-bottom:6px;">Pautas</div>'
    +(ce?'<button onclick="renderPautas()" style="width:100%;font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;text-align:left;display:flex;align-items:center;gap:4px;">'+ic("edit")+' Gerenciar pautas</button>':"")
    +'</div>'
    +'</div>'
    +'<div class="reun-main">'+mainContent+'</div>'
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
    +'<div class="reun-section-label" style="margin-bottom:10px;">Pautas</div>'
    +'<div id="reuniao-pautas-area">Carregando pautas...</div>'
    +'</div>';
  html+='</div>';
  setTimeout(function(){_loadParticipantesArea(r.id);_loadReuniaoPautas(r.id);},0);
  return html;
}

async function _loadReuniaoPautas(reuniaoId){
  var el=document.getElementById("reuniao-pautas-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    var addBtn=ce?'<button onclick="openAdicionarPauta(\''+reuniaoId+'\')" class="btn-outlined" style="margin-bottom:14px;">'+ic("plus")+' Adicionar pauta</button>':"";
    if(!rps.length){
      el.innerHTML=addBtn
        +'<div class="reun-empty" style="padding:28px 20px;">'
        +'<div class="reun-empty-icon">'+ic("meeting")+'</div>'
        +'<div class="reun-empty-msg">Nenhuma pauta adicionada a esta reuniao</div>'
        +'</div>';
      return;
    }
    var corStatusProj={'em_andamento':'#3b82f6','concluido':'#22c55e','pausado':'#a855f7'};
    var lblStatusProj={'em_andamento':'Em andamento','concluido':'Concluido','pausado':'Pausado'};
    var eqIdProj=equipeAtiva?equipeAtiva.id:null;
    var html='<div style="display:flex;flex-direction:column;gap:10px;">';
    rps.forEach(function(rp,i){
      var pauta=pautasDB.find(function(p){return p.id===rp.pauta_id;})||{titulo:"Pauta "+i,tipo:"livre"};
      var snap=rp.snapshot_json||{};
      var tipoCor={'seminario':'#8b5cf6','projeto':'#3b82f6','atualizacao_demandas':'#f59e0b','livre':'#94a3b8'}[pauta.tipo]||'#94a3b8';
      html+='<div class="pauta-card">'
        +'<div class="pauta-card-hdr">'
        +'<div class="pauta-card-titulo">'+pauta.titulo+'</div>'
        +'<span class="reun-status-chip" style="background:'+tipoCor+'22;color:'+tipoCor+';flex-shrink:0;">'+_labelTipoPauta(pauta.tipo)+'</span>'
        +'</div>'
        +'<div class="pauta-card-body">';
      if(pauta.tipo==='projeto'){
        var proj=projetosDB.filter(function(p){return !eqIdProj||p.equipe_id===eqIdProj;});
        if(!proj.length){html+='<div style="font-size:12px;color:var(--text3);">Nenhum projeto de equipe.</div>';}
        else{
          html+='<div style="display:flex;flex-direction:column;gap:6px;">';
          proj.forEach(function(p){
            var resp=(p.usuarios&&(p.usuarios.sigla||p.usuarios.nome))||"";
            var respNome=(p.usuarios&&p.usuarios.nome)||resp;
            var cor=corStatusProj[p.status]||'#94a3b8';
            var lbl=lblStatusProj[p.status]||p.status.replace('_',' ');
            html+='<div class="proj-card">'
              +'<div class="proj-card-bar" style="background:'+cor+';"></div>'
              +'<div class="proj-card-content">'
              +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">'
              +'<div class="proj-card-titulo">'+p.titulo+'</div>'
              +'<div class="proj-card-meta">'
              +'<span class="reun-status-chip" style="background:'+cor+'22;color:'+cor+';">'+lbl+'</span>'
              +(resp?'<div class="av av-sm" style="background:'+_avCor(respNome)+'" title="'+resp+'">'+resp.slice(0,2).toUpperCase()+'</div>':"")
              +'</div></div>'
              +(p.descricao?'<div style="font-size:11px;color:var(--text2);margin-top:3px;line-height:1.5;">'+p.descricao+'</div>':"")
              +(ce?'<div style="display:flex;gap:4px;margin-top:7px;flex-wrap:wrap;">'
                +'<button onclick="openEditProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:2px;">'+ic("edit")+' Editar</button>'
                +'<button onclick="openProjetoComentarios(\''+p.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:2px;">'+ic("comment")+' Historico</button>'
                +'<button onclick="sinalizarProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid #fbbf24;background:#fffbeb;color:#92400e;cursor:pointer;font-weight:600;">! Sinalizar</button>'
                +'</div>':"")
              +'</div></div>';
          });
          html+='</div>';
        }
        if(ce){html+='<button onclick="openNovoProjeto()" style="margin-top:10px;font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:3px;">'+ic("plus")+' Novo projeto</button>';}
        if(snap.notas){html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);"><div class="reun-section-label" style="margin-bottom:4px;">Notas da reuniao</div><div class="pauta-notas">'+snap.notas+'</div></div>';}
      }else{
        html+=snap.notas?'<div class="pauta-notas">'+snap.notas+'</div>':'<div style="font-size:12px;color:var(--text3);font-style:italic;">Sem notas para esta pauta nesta reuniao.</div>';
      }
      html+='</div>';
      if(ce){html+='<div class="pauta-card-footer">'
        +'<button onclick="openEditReuniaoPauta(\''+rp.id+'\',\''+reuniaoId+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Editar notas</button>'
        +'<button onclick="removerPautaDaReuniao(\''+rp.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;margin-left:auto;">Remover</button>'
        +'</div>';}
      html+='</div>';
    });
    html+='</div>';
    el.innerHTML=addBtn+html;
  }catch(e){if(el)el.innerHTML='<div style="color:var(--text3);font-size:12px;">Erro ao carregar pautas.</div>';}
}

function _loadReuniaoProjectos(){
  var el=document.getElementById("reuniao-projetos-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var proj=projetosDB.filter(function(p){return !eqId||p.equipe_id===eqId;});
  if(!proj.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;">Nenhum projeto interno.</div>';return;}
  var corStatus={'em_andamento':'#3b82f6','concluido':'#22c55e','pausado':'#a855f7'}
  el.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+proj.map(function(p){
    var resp=(p.usuarios&&(p.usuarios.sigla||p.usuarios.nome))||"";
    var cor=corStatus[p.status]||'#94a3b8';
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);">'+p.titulo+'</div>'
      +'<div style="display:flex;gap:4px;align-items:center;">'
      +'<span style="font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;background:'+cor+'22;color:'+cor+';">'+p.status.replace('_',' ')+'</span>'
      +(ce?'<button onclick="openEditProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>':'')
      +(ce?'<button onclick="openProjetoComentarios(\''+p.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("comment")+'</button>':'')
      +(ce?'<button onclick="sinalizarProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid #fbbf24;background:#fffbeb;color:#92400e;cursor:pointer;font-weight:600;">! Sinalizar</button>':'')
      +'</div></div>'
      +(resp?'<div style="font-size:11px;color:var(--text3);margin-top:4px;">Resp: '+resp+'</div>':"")
      +(p.descricao?'<div style="font-size:12px;color:var(--text2);margin-top:4px;">'+p.descricao+'</div>':"")
      +'</div>';
  }).join("")+'</div>';
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
      var cor=_avCor(nome);
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
function openAdicionarPauta(reuniaoId){
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var pautasFiltradas=pautasDB.filter(function(p){return !p.equipe_id||p.equipe_id===eqId||perfil==='mestre';});
  var padroes=pautasFiltradas.filter(function(p){return p.padrao;});
  var outras=pautasFiltradas.filter(function(p){return !p.padrao;});
  var lista=padroes.concat(outras);
  function rowPauta(p){
    var tipoCor={'seminario':'#8b5cf6','projeto':'#3b82f6','atualizacao_demandas':'#f59e0b','livre':'#94a3b8','avisos_gerais':'#22c55e'}[p.tipo]||'#94a3b8';
    return '<div style="display:flex;align-items:center;gap:8px;padding:9px 4px;border-bottom:1px solid var(--border);">'
      +(p.padrao?'<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:#eff6ff;color:var(--bt-navy);flex-shrink:0;">PADRAO</span>':'')
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+p.titulo+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:1px;"><span style="color:'+tipoCor+';">'+_labelTipoPauta(p.tipo)+'</span>'+(p.recorrente?' - recorrente':'')+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:4px;flex-shrink:0;">'
      +'<button onclick="adicionarPautaExistenteReuniao(\''+reuniaoId+'\',\''+p.id+'\')" class="btn btn-primary" style="font-size:11px;padding:3px 10px;">Adicionar</button>'
      +'<button onclick="openEditPauta(\''+p.id+'\')" style="font-size:11px;padding:3px 7px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>'
      +'<button onclick="delPautaDoModal(\''+p.id+'\',\''+reuniaoId+'\')" style="font-size:11px;padding:3px 7px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">'+ic("trash")+'</button>'
      +'</div></div>';
  }
  var listaHtml=lista.length
    ?'<div style="max-height:260px;overflow-y:auto;">'+lista.map(rowPauta).join('')+'</div>'
    :'<div class="reun-empty" style="padding:28px 0;"><div class="reun-empty-icon">'+ic("edit")+'</div><div class="reun-empty-msg">Nenhuma pauta cadastrada. Crie uma na aba "Nova pauta".</div></div>';
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,520px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Adicionar pauta</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div style="display:flex;border-bottom:2px solid var(--border);margin:12px 0 0;">'
    +'<button id="ap-tab-1" onclick="_apTab(1,\''+reuniaoId+'\')" style="padding:8px 16px;border:none;background:none;font-size:13px;font-weight:600;color:var(--bt-navy);border-bottom:2px solid var(--bt-navy);margin-bottom:-2px;cursor:pointer;">Pautas cadastradas</button>'
    +'<button id="ap-tab-2" onclick="_apTab(2,\''+reuniaoId+'\')" style="padding:8px 16px;border:none;background:none;font-size:13px;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;">Nova pauta</button>'
    +'</div>'
    +'<div id="ap-panel-1" style="padding-top:12px;">'+listaHtml+'</div>'
    +'<div id="ap-panel-2" style="display:none;padding-top:12px;">'
    +'<div class="field"><label>Titulo *</label><input id="np-titulo" placeholder="Nome da pauta"/></div>'
    +'<div class="field"><label>Tipo</label><select id="np-tipo">'+_tiposOpts('livre')+'</select></div>'
    +'<div class="field"><label>Responsavel</label><select id="np-resp"><option value="">Nenhum</option></select></div>'
    +'<div style="display:flex;gap:16px;margin-bottom:12px;">'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="np-recorrente"/> Recorrente</label>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="np-padrao"/> Padrao</label>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovaPautaReuniao(\''+reuniaoId+'\')">Criar e adicionar</button></div>'
    +'</div>'
    +'</div></div>';
  dbFetchUsers().then(function(users){
    var advs=(users||[]).filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});
    var sel=document.getElementById("np-resp");if(!sel)return;
    advs.forEach(function(u){var o=document.createElement("option");o.value=u.id;o.textContent=(u.sigla?u.sigla+' - ':'')+u.nome;sel.appendChild(o);});
  }).catch(function(){});
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
function openEditReuniaoPauta(rpId,reuniaoId){
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,460px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Editar notas da pauta</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Notas</label><textarea id="erp-notas" rows="6" placeholder="Notas desta pauta nesta reuniao..."></textarea></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditReuniaoPauta(\''+rpId+'\',\''+reuniaoId+'\')">Salvar</button></div>'
    +'</div></div>';
  dbFetchReuniaoPautas(reuniaoId).then(function(rps){
    var rp=rps.find(function(x){return x.id===rpId;});
    var el=document.getElementById("erp-notas");
    if(el&&rp&&rp.snapshot_json)el.value=rp.snapshot_json.notas||"";
  });
}
async function salvarEditReuniaoPauta(rpId,reuniaoId){
  var notas=(document.getElementById("erp-notas").value||"").trim();
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    var rp=rps.find(function(x){return x.id===rpId;});
    if(!rp)return;
    rp.snapshot_json=Object.assign({},rp.snapshot_json,{notas:notas||null});
    await dbUpsertReuniaoPauta(rp);
    closeModal();_loadReuniaoPautas(reuniaoId);toast("Notas salvas!");
  }catch(e){toast("Erro",true);}
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
    +'<div class="field"><label>Responsavel</label><select id="proj-resp"><option value="">Selecione...</option>'+respOpts+'</select></div>'
    +'<div class="field"><label>Status</label><select id="proj-status"><option value="em_andamento"'+((!p||p.status==="em_andamento")?" selected":"")+'>Em andamento</option><option value="concluido"'+((p&&p.status==="concluido")?" selected":"")+'>Concluido</option><option value="pausado"'+((p&&p.status==="pausado")?" selected":"")+'>Pausado</option></select></div>'
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
  var status=document.getElementById("proj-status").value;
  var desc=(document.getElementById("proj-desc").value||"").trim();
  var eqEl=document.getElementById("proj-equipe");var equipe_id=eqEl?eqEl.value||null:(equipeAtiva?equipeAtiva.id:null);
  var obj={titulo,responsavel_id:resp,status,descricao:desc||null,equipe_id};
  if(id)obj.id=id;
  try{
    await dbUpsertProjeto(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    projetosDB=await dbFetchProjetos(eqId);
    closeModal();_loadReuniaoProjectos();toast("Projeto salvo!");
  }catch(e){toast("Erro ao salvar",true);}
}
async function delProjeto(id){
  closeModal();
  modalConfirm("Excluir este projeto?",async function(){
    try{
      await dbDelProjeto(id);
      projetosDB=projetosDB.filter(function(p){return p.id!==id;});
      _loadReuniaoProjectos();toast("Projeto excluido!");
    }catch(e){toast("Erro",true);}
  });
}
async function openProjetoComentarios(projetoId){
  var p=projetosDB.find(function(x){return x.id===projetoId;})||{titulo:"Projeto"};
  var mc=document.getElementById("modal-container");
  mc.innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,560px);max-height:80vh;display:flex;flex-direction:column;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0;"><div style="font-size:15px;font-weight:700;color:var(--bt-navy);">'+p.titulo+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div id="proj-cmts" style="flex:1;overflow-y:auto;min-height:80px;">Carregando...</div>'
    +'<div style="margin-top:12px;flex-shrink:0;"><textarea id="proj-cmt-txt" rows="2" placeholder="Adicionar comentario..." style="width:100%;resize:none;"></textarea><div style="display:flex;justify-content:flex-end;margin-top:6px;"><button class="btn btn-primary" onclick="addProjetoComentario(\''+projetoId+'\')">Comentar</button></div></div>'
    +'</div></div>';
  _loadProjetoComentarios(projetoId);
}
async function _loadProjetoComentarios(projetoId){
  var el=document.getElementById("proj-cmts");if(!el)return;
  try{
    var cmts=await dbFetchProjetoComentarios(projetoId);
    if(!cmts.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0;">Nenhum comentario ainda.</div>';return;}
    el.innerHTML=cmts.map(function(c){
      var u=c.usuarios||{};
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        +'<span style="font-size:12px;font-weight:600;color:var(--bt-navy);">'+(u.sigla||u.nome||"?")+'</span>'
        +'<span style="font-size:11px;color:var(--text3);">'+new Date(c.criado_em).toLocaleDateString("pt-BR")+'</span>'
        +'</div>'
        +'<div style="font-size:13px;color:var(--text2);white-space:pre-wrap;">'+c.texto+'</div>'
        +'</div>';
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

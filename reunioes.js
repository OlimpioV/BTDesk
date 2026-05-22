// ── REUNIOES ──

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
  var passadas=reunioesDB.filter(function(r){return r.data<hoje;});
  var listaSidebar=proximas.concat(passadas).slice(0,20).map(function(r){
    var ativa=reuniaoAtiva&&reuniaoAtiva.id===r.id;
    var dataFmt=_fmtData(r.data);
    return '<div onclick="selecionarReuniao(\''+r.id+'\')" style="padding:10px 14px;cursor:pointer;border-radius:8px;margin-bottom:4px;background:'+(ativa?"rgba(37,63,79,.12)":"transparent")+';border:1px solid '+(ativa?"var(--border)":"transparent")+';transition:background .15s;" onmouseover="if(!'+ativa+')this.style.background=\'rgba(0,0,0,.04)\'" onmouseout="if(!'+ativa+')this.style.background=\'transparent\'">'
      +'<div style="font-size:12px;font-weight:600;color:var(--bt-navy);">'+trunc(r.titulo||("Reuniao de "+dataFmt),32)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;">'+dataFmt+' '+r.hora.slice(0,5)+'</div>'
      +'</div>';
  }).join("");
  var mainContent=reuniaoAtiva?_buildReuniaoDetalhe(reuniaoAtiva):_buildReuniaoPlaceholder();
  app.innerHTML=headerHTML("reunioes")
    +'<div style="display:flex;height:calc(100vh - 104px);overflow:hidden;">'
    +'<div style="width:260px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:#fff;">'
    +'<div style="padding:14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">'
    +'<div style="font-size:13px;font-weight:700;color:var(--bt-navy);">Reunioes</div>'
    +(ce?'<button onclick="openNovaReuniao()" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic("plus")+' Nova</button>':"")
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;padding:8px;">'+(listaSidebar||'<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Nenhuma reuniao</div>')+'</div>'
    +'<div style="border-top:1px solid var(--border);padding:10px 14px;">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Pautas</div>'
    +(ce?'<button onclick="renderPautas()" style="width:100%;font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;text-align:left;">Gerenciar pautas</button>':"")
    +'</div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;background:var(--bg);">'+mainContent+'</div>'
    +'</div>';
}

function _fmtData(d){
  if(!d)return "";
  var p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0];
}

function _buildReuniaoPlaceholder(){
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text3);gap:12px;">'
    +'<div style="font-size:32px;opacity:.3;">'+ic("meeting")+'</div>'
    +'<div style="font-size:14px;">Selecione ou crie uma reuniao</div>'
    +'</div>';
}

function _buildReuniaoDetalhe(r){
  var ce=perfil==="mestre"||perfil==="advogado";
  var dataFmt=_fmtData(r.data);
  var statusBadge={'agendada':'#3b82f6','realizada':'#22c55e','cancelada':'#ef4444'}[r.status]||'#94a3b8';
  var html='<div style="padding:28px;max-width:820px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">'
    +'<div>'
    +'<div style="font-size:20px;font-weight:700;color:var(--bt-navy);">'+(r.titulo||("Reuniao de "+dataFmt))+'</div>'
    +'<div style="display:flex;gap:10px;align-items:center;margin-top:6px;">'
    +'<span style="font-size:12px;color:var(--text3);">'+ic("cal")+' '+dataFmt+' as '+r.hora.slice(0,5)+'</span>'
    +'<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:'+statusBadge+'22;color:'+statusBadge+';">'+r.status+'</span>'
    +'</div>'
    +'</div>'
    +(ce?'<div style="display:flex;gap:6px;">'
      +'<button onclick="openEditReuniao(\''+r.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic("edit")+' Editar</button>'
      +'<button onclick="gerarAta(\''+r.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Gerar ata</button>'
      +'</div>':"")
    +'</div>';
  if(r.observacoes){html+='<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:var(--text2);">'+r.observacoes+'</div>';}
  html+='<div id="reuniao-pautas-area">Carregando pautas...</div>';
  html+='<div style="margin-top:28px;"><div style="font-size:13px;font-weight:700;color:var(--bt-navy);margin-bottom:12px;">Projetos internos</div>'
    +'<div id="reuniao-projetos-area">Carregando projetos...</div>'
    +(ce?'<button onclick="openNovoProjeto()" style="margin-top:10px;font-size:12px;padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:4px;">'+ic("plus")+' Novo projeto interno</button>':"")
    +'</div>';
  html+='</div>';
  setTimeout(function(){_loadReuniaoPautas(r.id);_loadReuniaoProjectos();},0);
  return html;
}

async function _loadReuniaoPautas(reuniaoId){
  var el=document.getElementById("reuniao-pautas-area");if(!el)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  try{
    var rps=await dbFetchReuniaoPautas(reuniaoId);
    if(!rps.length){
      el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:12px 0;">Nenhuma pauta adicionada.'+(ce?' <button onclick="openAdicionarPauta(\''+reuniaoId+'\')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;">Adicionar pauta</button>':'')+'</div>';
      return;
    }
    var html='<div style="display:flex;flex-direction:column;gap:8px;">';
    rps.forEach(function(rp,i){
      var pauta=pautasDB.find(function(p){return p.id===rp.pauta_id;})||{titulo:"Pauta "+i,tipo:"livre"};
      var snap=rp.snapshot_json||{};
      html+='<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);">'+pauta.titulo+'</div>'
        +'<div style="display:flex;gap:4px;">'
        +(ce?'<button onclick="openEditReuniaoPauta(\''+rp.id+'\',\''+reuniaoId+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">Editar</button>':'')
        +(ce?'<button onclick="removerPautaDaReuniao(\''+rp.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">Remover</button>':'')
        +'</div></div>'
        +(snap.notas?'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;">'+snap.notas+'</div>':'<div style="font-size:12px;color:var(--text3);">Sem notas.</div>')
        +'</div>';
    });
    html+='</div>';
    if(ce){html+='<button onclick="openAdicionarPauta(\''+reuniaoId+'\')" style="margin-top:8px;font-size:12px;padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:4px;">'+ic("plus")+' Adicionar pauta</button>';}
    el.innerHTML=html;
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
    var resp=responsaveis.indexOf(p.responsavel_id)>=0?p.responsavel_id:"";
    var cor=corStatus[p.status]||'#94a3b8';
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);">'+p.titulo+'</div>'
      +'<div style="display:flex;gap:4px;align-items:center;">'
      +'<span style="font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;background:'+cor+'22;color:'+cor+';">'+p.status.replace('_',' ')+'</span>'
      +(ce?'<button onclick="openEditProjeto(\''+p.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("edit")+'</button>':'')
      +(ce?'<button onclick="openProjetoComentarios(\''+p.id+'\')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;">'+ic("comment")+'</button>':'')
      +'</div></div>'
      +(p.descricao?'<div style="font-size:12px;color:var(--text2);margin-top:6px;">'+p.descricao+'</div>':"")
      +'</div>';
  }).join("")+'</div>';
}

async function selecionarReuniao(id){
  reuniaoAtiva=reunioesDB.find(function(r){return r.id===id;})||null;
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
    await dbUpsertReuniao(obj);
    var eqId=equipeAtiva?equipeAtiva.id:null;
    reunioesDB=await dbFetchReunioes(eqId);
    if(id)reuniaoAtiva=reunioesDB.find(function(r){return r.id===id;})||null;
    else reuniaoAtiva=null;
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
      +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+p.tipo+(p.recorrente?' (recorrente)':'')+'</td>'
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
    +'<div class="field"><label>Tipo</label><select id="pf-tipo"><option value="livre"'+((!p||p.tipo==="livre")?" selected":"")+'>Livre</option><option value="projeto"'+((p&&p.tipo==="projeto")?" selected":"")+'>Projeto interno</option><option value="demanda"'+((p&&p.tipo==="demanda")?" selected":"")+'>Demanda</option></select></div>'
    +'<div class="field"><label>Descricao</label><textarea id="pf-desc" rows="3">'+(p?p.descricao||'':"")+'</textarea></div>'
    +'<div class="field" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="pf-recorrente"'+(p&&p.recorrente?' checked':'')+'/><label for="pf-recorrente" style="margin-bottom:0;cursor:pointer;">Recorrente (aparece em todas as reunioes)</label></div>'
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
  var eqEl=document.getElementById("pf-equipe");var equipe_id=eqEl?eqEl.value||null:null;
  var obj={titulo,tipo,descricao:descricao||null,recorrente,equipe_id,criado_por:userDbId};
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
function openAdicionarPauta(reuniaoId){
  var opts=pautasDB.map(function(p){return '<option value="'+p.id+'">'+p.titulo+'</option>';}).join("");
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()" style="width:min(95vw,420px);">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Adicionar pauta</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +(opts?'<div class="field"><label>Pauta</label><select id="ap-pauta"><option value="">Selecione...</option>'+opts+'</select></div>':"<div style='font-size:13px;color:var(--text3);padding:8px 0;'>Nenhuma pauta cadastrada. Crie pautas primeiro.</div>")
    +'<div class="field"><label>Notas iniciais</label><textarea id="ap-notas" rows="3" placeholder="Notas para esta pauta nesta reuniao..."></textarea></div>'
    +(opts?'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="adicionarPautaReuniao(\''+reuniaoId+'\')">Adicionar</button></div>':"<div style='display:flex;justify-content:flex-end;'><button class='btn' onclick='closeModal()'>Fechar</button></div>")
    +'</div></div>';
}
async function adicionarPautaReuniao(reuniaoId){
  var pautaId=(document.getElementById("ap-pauta")||{}).value;
  if(!pautaId){toast("Selecione uma pauta",true);return;}
  var notas=(document.getElementById("ap-notas").value||"").trim();
  var rps=await dbFetchReuniaoPautas(reuniaoId);
  var obj={reuniao_id:reuniaoId,pauta_id:pautaId,ordem:rps.length,snapshot_json:{notas:notas||null}};
  try{await dbUpsertReuniaoPauta(obj);closeModal();_loadReuniaoPautas(reuniaoId);toast("Pauta adicionada!");}
  catch(e){toast("Erro",true);}
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
function openEditProjeto(id){
  var p=id?projetosDB.find(function(x){return x.id===id;}):null;
  var eqOptions=equipesDB.map(function(e){return '<option value="'+e.id+'"'+(p&&p.equipe_id===e.id?' selected':(!p&&equipeAtiva&&equipeAtiva.id===e.id?' selected':''))+'>'+e.nome+'</option>';}).join("");
  var respOpts=responsaveis.map(function(r){return '<option value="'+r+'"'+(p&&p.responsavel_id===r?' selected':'')+'>'+r+'</option>';}).join("");
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

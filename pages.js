// ── EQUIPES ──
async function renderEquipes(){
  if(perfil!=="mestre"){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("eq")+'<div style="padding:24px;max-width:900px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var equipes=await dbFetchEquipes();
    var us=await dbFetchUsers();
    var rows=equipes.length===0?'<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma equipe</td></tr>':equipes.map(function(eq){
      return '<tr style="border-bottom:1px solid var(--border);">'
        +'<td style="padding:11px 14px;"><span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--bt-navy);"><span style="width:10px;height:10px;border-radius:50%;background:'+eq.cor+';flex-shrink:0;"></span>'+eq.nome+'</span></td>'
        +'<td style="padding:11px 14px;" id="eq-mem-'+eq.id+'"><span style="font-size:12px;color:var(--text3);">...</span></td>'
        +'<td style="padding:11px 14px;"><div style="display:flex;gap:5px;"><button onclick="openEditEquipe(\''+eq.id+'\',\''+eq.nome.replace(/'/g,"\\'")+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('edit')+' Editar</button><button onclick="openEquipeMembros(\''+eq.id+'\',\''+eq.nome.replace(/'/g,"\\'")+'\',this)" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('users')+' Membros</button><button onclick="delEquipe(\''+eq.id+'\',\''+eq.nome.replace(/'/g,"\\'")+'\')\" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('trash')+' Excluir</button></div></td>'
        +'</tr>';
    }).join("");
    app.innerHTML=headerHTML("eq")
      +'<div style="padding:24px;max-width:900px;margin:0 auto;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
      +'<div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Equipes</div>'
      +'<button class="btn btn-accent" onclick="openEditEquipe()" style="display:flex;align-items:center;gap:5px;border-radius:8px;">'+ic('plus')+' Nova equipe</button>'
      +'</div>'
      +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);">'
      +'<table style="width:100%;border-collapse:collapse;">'
      +'<thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'
      +['Nome','Membros','Ações'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")
      +'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
    equipes.forEach(function(eq){_loadEquipeMembrosCell(eq.id);});
  }catch(e){toast("Erro",true);}
}
async function _loadEquipeMembrosCell(equipeId){
  try{
    var rows=await dbFetchEquipeMembros(equipeId);
    var el=document.getElementById("eq-mem-"+equipeId);if(!el)return;
    if(!rows.length){el.innerHTML='<span style="font-size:12px;color:var(--text3);">Nenhum</span>';return;}
    el.innerHTML=rows.map(function(r){var u=r.usuarios;return '<span style="font-size:11px;font-weight:600;background:#f1f5f9;border-radius:4px;padding:2px 7px;color:#475569;margin-right:3px;">'+(u?(u.sigla||u.nome):"?")+'</span>';}).join("");
  }catch(e){}
}
function openEditEquipe(id,nome){
  var isE=!!id;
  var corAtual=id?(equipesDB.find(function(e){return e.id===id;})||{cor:"#185FA5"}).cor:"#185FA5";
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(isE?"Editar equipe":"Nova equipe")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button></div>'
    +'<div class="field"><label>Nome</label><input id="meq-nome" value="'+(nome||"")+'" placeholder="Ex: Societário"/></div>'
    +'<div class="field"><label>Cor</label><input id="meq-cor" type="color" value="'+corAtual+'" style="width:60px;height:34px;padding:2px;border-radius:8px;border:1px solid var(--border);cursor:pointer;"/></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveEquipe(\''+(id||"")+'\')">Salvar</button></div>'
    +'</div></div>';
  setTimeout(function(){var el=document.getElementById("meq-nome");if(el)el.focus();},50);
}
async function saveEquipe(id){
  var nome=(document.getElementById("meq-nome").value||"").trim();var cor=document.getElementById("meq-cor").value;
  if(!nome){toast("Informe o nome",true);return;}
  var e={nome,cor};if(id)e.id=id;
  try{await dbUpsertEquipe(e);await loadEquipes();toast(id?"Atualizada!":"Criada!");closeModal();renderEquipes();}catch(err){toast("Erro",true);}
}
function delEquipe(id,nome){
  modalConfirm('Excluir a equipe "'+nome+'"?',async function(){
    try{await dbDelEquipe(id);await loadEquipes();toast("Excluída!");renderEquipes();}catch(e){toast("Erro",true);}
  });
}
async function openEquipeMembros(equipeId,equipeNome){
  var us=await dbFetchUsers();
  var membros=await dbFetchEquipeMembros(equipeId);
  var memIds=membros.map(function(m){return m.usuario_id;});
  var checks=us.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";}).map(function(u){
    var isMem=memIds.includes(u.id);
    return '<label style="display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;border-bottom:1px solid var(--border);">'
      +'<input type="checkbox" id="emem-'+u.id+'" '+(isMem?"checked":"")+' style="width:auto;cursor:pointer;"/>'
      +'<span style="font-size:13px;color:var(--bt-navy);font-weight:'+(isMem?'600':'400')+'">'+(u.sigla?u.sigla+' — ':'')+u.nome+'</span>'
      +'</label>';
  }).join("");
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Membros: '+equipeNome+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button></div>'
    +'<div style="max-height:320px;overflow-y:auto;margin-bottom:16px;">'+checks+'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveEquipeMembros(\''+equipeId+'\')">Salvar</button></div>'
    +'</div></div>';
}
async function saveEquipeMembros(equipeId){
  var us=await dbFetchUsers();
  var membros=await dbFetchEquipeMembros(equipeId);
  var memIds=membros.map(function(m){return m.usuario_id;});
  var advs=us.filter(function(u){return u.perfil==="advogado"||u.perfil==="mestre";});
  try{
    for(var i=0;i<advs.length;i++){
      var u=advs[i];var checked=document.getElementById("emem-"+u.id);if(!checked)continue;
      var quer=checked.checked;var tem=memIds.includes(u.id);
      if(quer&&!tem)await dbUpsertEquipeMembro({equipe_id:equipeId,usuario_id:u.id});
      if(!quer&&tem)await dbDelEquipeMembro(equipeId,u.id);
    }
    await loadEquipes();toast("Membros atualizados!");closeModal();renderEquipes();
  }catch(e){toast("Erro",true);}
}

// â”€â”€ ESTRUTURA â”€â”€
var _estruturaStatusCache=[];

function _estruturaSlug(txt){
  return String(txt||"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}

async function renderEstrutura(){
  if(perfil!=="mestre"){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("estrutura")+'<div style="padding:24px;max-width:980px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    _estruturaStatusCache=await dbFetchTarefaStatus();
    var ativos=_estruturaStatusCache.filter(function(s){return s.ativo!==false;}).length;
    var finalizadores=_estruturaStatusCache.filter(function(s){return s.finalizador&&s.ativo!==false;}).length;
    var rows=_estruturaStatusCache.length===0?'<tr><td colspan="6" style="text-align:center;padding:34px;color:var(--text3);">Nenhum status cadastrado</td></tr>':_estruturaStatusCache.map(function(s){
      return '<tr style="border-bottom:1px solid var(--border);">'
        +'<td style="padding:11px 14px;"><span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--bt-navy);"><span style="width:10px;height:10px;border-radius:50%;background:'+(s.cor||"#94a3b8")+';flex-shrink:0;"></span>'+s.nome+'</span></td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);font-family:monospace;">'+s.id+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+s.ordem+'</td>'
        +'<td style="padding:11px 14px;">'+(s.finalizador?'<span class="badge" style="background:#dcfce7;color:#15803d;">Finalizador</span>':'<span class="badge" style="background:#f1f5f9;color:#64748b;">Aberto</span>')+'</td>'
        +'<td style="padding:11px 14px;">'+(s.ativo!==false?'<span style="font-size:12px;font-weight:700;color:#16a34a;">Ativo</span>':'<span style="font-size:12px;font-weight:700;color:#94a3b8;">Inativo</span>')+'</td>'
        +'<td style="padding:11px 14px;"><div style="display:flex;gap:5px;flex-wrap:wrap;"><button onclick="openEditTarefaStatus(\''+s.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic("edit")+' Editar</button><button onclick="toggleTarefaStatusAtivo(\''+s.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">'+(s.ativo!==false?'Desativar':'Ativar')+'</button></div></td>'
        +'</tr>';
    }).join("");
    app.innerHTML=headerHTML("estrutura")
      +'<div style="padding:24px;max-width:980px;margin:0 auto;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;">'
      +'<div><div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Estrutura</div><div style="font-size:12px;color:var(--text3);margin-top:3px;">Configura\u00e7\u00e3o modular inicial de tarefas e subtarefas.</div></div>'
      +'<button class="btn btn-accent" onclick="openEditTarefaStatus()" style="display:flex;align-items:center;gap:5px;border-radius:8px;">'+ic("plus")+' Novo status</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;">'
      +'<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;"><div style="font-size:11px;color:var(--text3);font-weight:800;text-transform:uppercase;">Status ativos</div><div style="font-size:24px;font-weight:800;color:var(--bt-navy);margin-top:3px;">'+ativos+'</div></div>'
      +'<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;"><div style="font-size:11px;color:var(--text3);font-weight:800;text-transform:uppercase;">Finalizadores</div><div style="font-size:24px;font-weight:800;color:var(--bt-navy);margin-top:3px;">'+finalizadores+'</div></div>'
      +'</div>'
      +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);">'
      +'<table style="width:100%;border-collapse:collapse;">'
      +'<thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'
      +['Status','ID','Ordem','Tipo','Uso','A\u00e7\u00f5es'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")
      +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:12px;line-height:1.5;">Nesta etapa os status ficam configurados na Administra\u00e7\u00e3o. A pr\u00f3xima etapa \u00e9 fazer as telas de tarefas, reuni\u00f5es e projetos consumirem esta estrutura.</div>'
      +'</div>';
  }catch(e){toast("Erro ao carregar estrutura",true);}
}

function openEditTarefaStatus(id){
  var s=id?(_estruturaStatusCache||[]).find(function(x){return x.id===id;}):null;
  var isE=!!s;
  var nome=s?s.nome:"";
  var sid=s?s.id:"";
  var cor=s?s.cor:"#2b76e5";
  var ordem=s?s.ordem:(_estruturaStatusCache||[]).length;
  var finalizador=s&&s.finalizador;
  var ativo=!s||s.ativo!==false;
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">'+(isE?"Editar status":"Novo status")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic("close")+'</button></div>'
    +'<div class="field"><label>Nome</label><input id="ts-nome" value="'+nome.replace(/"/g,"&quot;")+'" placeholder="Ex: Em revisao" oninput="previewStatusId('+isE+')"/></div>'
    +'<div class="field"><label>ID</label><input id="ts-id" value="'+sid+'" placeholder="em_revisao" '+(isE?'disabled':'')+' style="font-family:monospace;"/></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="field"><div><label>Cor</label><input id="ts-cor" type="color" value="'+cor+'" style="width:70px;height:36px;padding:2px;"/></div><div><label>Ordem</label><input id="ts-ordem" type="number" value="'+ordem+'" style="width:100%;"/></div></div>'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);margin:8px 0;"><input id="ts-finalizador" type="checkbox" '+(finalizador?'checked':'')+' style="accent-color:var(--bt-orange);"> Status finalizador</label>'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);margin:8px 0 16px;"><input id="ts-ativo" type="checkbox" '+(ativo?'checked':'')+' style="accent-color:var(--bt-orange);"> Ativo</label>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveTarefaStatus(\''+(sid||"")+'\')">Salvar</button></div>'
    +'</div></div>';
  if(!isE)previewStatusId(false);
}

function previewStatusId(isEdit){
  if(isEdit)return;
  var nomeEl=document.getElementById("ts-nome");
  var idEl=document.getElementById("ts-id");
  if(nomeEl&&idEl&&!idEl.dataset.touched)idEl.value=_estruturaSlug(nomeEl.value);
}

async function saveTarefaStatus(idAtual){
  var nome=(document.getElementById("ts-nome").value||"").trim();
  var id=(idAtual||document.getElementById("ts-id").value||"").trim();
  var cor=document.getElementById("ts-cor").value||"#94a3b8";
  var ordem=parseInt(document.getElementById("ts-ordem").value||"0",10);
  var finalizador=document.getElementById("ts-finalizador").checked;
  var ativo=document.getElementById("ts-ativo").checked;
  if(!nome){toast("Informe o nome",true);return;}
  if(!id){id=_estruturaSlug(nome);}
  if(!id){toast("Informe um ID valido",true);return;}
  try{
    await dbUpsertTarefaStatus({id:id,nome:nome,cor:cor,ordem:ordem,finalizador:finalizador,ativo:ativo});
    closeModal();toast("Status salvo!");renderEstrutura();
  }catch(e){toast("Erro ao salvar status",true);}
}

async function toggleTarefaStatusAtivo(id){
  var s=(_estruturaStatusCache||[]).find(function(x){return x.id===id;});if(!s)return;
  try{
    await dbUpsertTarefaStatus({id:id,nome:s.nome,cor:s.cor,ordem:s.ordem,finalizador:!!s.finalizador,ativo:s.ativo===false});
    toast(s.ativo===false?"Status ativado":"Status desativado");
    renderEstrutura();
  }catch(e){toast("Erro ao alterar status",true);}
}

// Etapa 1 da consolidacao: funcoes de IMPORTAR, ETIQUETAS, LOGS, USUARIOS e FORMULARIO de
// card removidas daqui por estarem duplicadas em app.js (que carrega por ultimo e prevalecia).
// Exclusivas mantidas neste arquivo: EQUIPES (acima) e EMAILS + CATEGORIAS DE PAUTA (abaixo).

// ── EMAILS (admin mestre) ──
async function renderEmails(){
  if(perfil!=="mestre"){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("emails")+'<div style="padding:24px;max-width:1000px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  var logs=[],config=[];
  try{logs=await dbFetchEmailLogs();}catch(e){}
  try{config=await dbFetchNotifConfig();}catch(e){}
  _renderEmailsPagina(logs,config);
}

function _renderEmailsPagina(logs,config){
  var app=document.getElementById("app");
  var abaAtiva=window._emailAba||"logs";
  var tabs='<div style="display:flex;gap:2px;margin-bottom:20px;">'
    +['logs','config'].map(function(a){var lab={logs:'Historico de envios',config:'Configuracoes'}[a];return '<button onclick="window._emailAba=\''+a+'\';renderEmails()" style="font-size:12px;font-weight:600;padding:6px 16px;border-radius:7px;border:1px solid var(--border);background:'+(abaAtiva===a?'var(--bt-navy)':'#fff')+';color:'+(abaAtiva===a?'#fff':'var(--text2)')+';cursor:pointer;">'+lab+'</button>';}).join("")
    +'</div>';

  var conteudo="";
  if(abaAtiva==="logs"){
    var statusCor={'enviado':'#22c55e','erro':'#ef4444','pendente':'#f59e0b'};
    var rows=!logs.length?'<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3);">Nenhum e-mail registrado</td></tr>':logs.map(function(l){
      var cor=statusCor[l.status]||'#94a3b8';
      var dest=(l.destinatarios||[]).join(', ');
      var dt=l.criado_em?new Date(l.criado_em).toLocaleString('pt-BR'):'—';
      return '<tr style="border-bottom:1px solid var(--border);">'
        +'<td style="padding:9px 12px;font-size:12px;color:var(--text2);">'+dt+'</td>'
        +'<td style="padding:9px 12px;font-size:12px;font-weight:600;color:var(--bt-navy);">'+(l.tipo||'—')+'</td>'
        +'<td style="padding:9px 12px;font-size:12px;color:var(--text2);">'+trunc(l.assunto||'',40)+'</td>'
        +'<td style="padding:9px 12px;font-size:11px;color:var(--text3);">'+trunc(dest,40)+'</td>'
        +'<td style="padding:9px 12px;"><div style="display:flex;align-items:center;gap:6px;">'
        +'<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:'+cor+'22;color:'+cor+';">'+l.status+'</span>'
        +(l.status==='erro'?'<button onclick="reenviarEmail(\''+l.id+'\')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Reenviar</button>':"")
        +'</div></td>'
        +'</tr>';
    }).join("");
    conteudo='<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);">'
      +'<table style="width:100%;border-collapse:collapse;">'
      +'<thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'
      +['Data','Tipo','Assunto','Destinatarios','Status'].map(function(h){return '<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.07em;">'+h+'</th>';}).join("")
      +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  } else {
    var tipoLabel={'projeto_sinalizado':'Sinalizar projeto (botao manual)','reuniao_criada':'Reuniao criada automaticamente','tarefa_atrasada':'Tarefa em atraso'};
    conteudo='<div style="display:flex;flex-direction:column;gap:14px;">'
      +'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e;">'
      +'Para ativar o envio, voce precisa: <br/>1. Criar uma conta em <strong>resend.com</strong> e gerar uma API key<br/>'
      +'2. No painel Supabase, ir em <strong>Edge Functions > enviar-email > Secrets</strong> e adicionar: <code>RESEND_API_KEY</code> e <code>FROM_EMAIL</code><br/>'
      +'3. Implantar a funcao: copie o codigo de <code>supabase/functions/enviar-email/index.ts</code> no dashboard do Supabase'
      +'</div>'
      +config.map(function(c){
        var lab=tipoLabel[c.tipo]||c.tipo;
        var extras=(c.emails_extras||[]).join(', ');
        return '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px 20px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
          +'<div style="font-size:14px;font-weight:600;color:var(--bt-navy);">'+lab+'</div>'
          +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--text2);">'
          +'<input type="checkbox" id="nc-ativo-'+c.id+'"'+(c.ativo?' checked':'')+' onchange="toggleNotifConfig(\''+c.id+'\',this.checked)"/>'
          +'Ativo</label>'
          +'</div>'
          +'<div class="field" style="margin-bottom:0;">'
          +'<label style="font-size:11px;">E-mails extras (alem dos participantes, separados por virgula)</label>'
          +'<div style="display:flex;gap:6px;"><input id="nc-ext-'+c.id+'" value="'+extras+'" placeholder="email1@exemplo.com, email2@..." style="flex:1;"/>'
          +'<button onclick="salvarExtras(\''+c.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Salvar</button>'
          +'</div></div></div>';
      }).join("")
      +'</div>';
  }

  app.innerHTML=headerHTML("emails")
    +'<div style="padding:24px;max-width:1000px;margin:0 auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Gestao de E-mails</div>'
    +(abaAtiva==="logs"?'<button onclick="renderEmails()" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;">Atualizar</button>':"")
    +'</div>'
    +tabs+conteudo
    +'</div>';
}

async function toggleNotifConfig(id,ativo){
  try{await dbUpsertNotifConfig({id,ativo});toast(ativo?"Notificacao ativada":"Notificacao desativada");}
  catch(e){toast("Erro",true);}
}
async function salvarExtras(id){
  var inp=document.getElementById("nc-ext-"+id);
  var val=(inp?inp.value:"").trim();
  var emails_extras=val?val.split(",").map(function(e){return e.trim();}).filter(Boolean):[];
  try{await dbUpsertNotifConfig({id,emails_extras});toast("Salvo!");}
  catch(e){toast("Erro",true);}
}
async function reenviarEmail(logId){
  try{await dbReenviarEmail(logId);toast("Reenviado!");renderEmails();}
  catch(e){toast("Erro ao reenviar: "+e.message,true);}
}

// ── PAUTA CATEGORIAS (admin) ──
var _catSel=null;
var _catItensCache={};

async function renderPautaCategorias(){
  if(perfil!=="mestre"){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("reun")+'<div style="padding:24px;max-width:1100px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    var cats=await dbFetchPautaCategorias(eqId);
    _renderCatPagina(cats);
  }catch(e){toast("Erro ao carregar categorias",true);}
}

function _renderCatPagina(cats){
  var app=document.getElementById("app");
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var catRows=!cats.length
    ?'<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px;">Nenhuma categoria</div>'
    :cats.map(function(c){
      var sel=_catSel===c.id;
      return '<div id="catrow-'+c.id+'" onclick="_catSelect(\''+c.id+'\')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;border-radius:8px;margin:2px 4px;background:'+(sel?'rgba(37,63,79,0.09)':'transparent')+';">'
        +'<span style="font-size:13px;font-weight:'+(sel?'700':'500')+';color:var(--bt-navy);flex:1;">'+c.nome+'</span>'
        +'<div style="display:flex;gap:4px;flex-shrink:0;" onclick="event.stopPropagation();">'
        +'<button onclick="_editCat(\''+c.id+'\',\''+c.nome.replace(/'/g,"\\'")+'\',\''+eqId+'\')" style="font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;">'+ic('edit')+'</button>'
        +'<button onclick="_delCat(\''+c.id+'\',\''+c.nome.replace(/'/g,"\\'")+'\')\" style="font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;display:flex;align-items:center;">'+ic('trash')+'</button>'
        +'</div></div>';
    }).join("");
  app.innerHTML=headerHTML("reun")
    +'<div style="padding:24px;max-width:1100px;margin:0 auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Categorias de pauta</div>'
    +'<button class="btn btn-accent" onclick="_novaCat(\''+eqId+'\')" style="display:flex;align-items:center;gap:5px;border-radius:8px;">'+ic('plus')+' Nova categoria</button>'
    +'</div>'
    +'<div style="display:flex;gap:16px;align-items:flex-start;">'
    +'<div style="width:280px;flex-shrink:0;background:#fff;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;">'
    +'<div style="padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);border-bottom:1px solid var(--border);">Categorias</div>'
    +'<div style="max-height:65vh;overflow-y:auto;padding:6px 0;">'+catRows+'</div>'
    +'</div>'
    +'<div style="flex:1;" id="cat-itens-panel">'
    +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:40px;text-align:center;color:var(--text3);font-size:13px;box-shadow:var(--shadow);">Selecione uma categoria para ver os itens</div>'
    +'</div>'
    +'</div></div>';
  if(_catSel)_catLoadItens(_catSel);
}

async function _catSelect(catId){
  _catSel=catId;
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var cats=await dbFetchPautaCategorias(eqId);
  _renderCatPagina(cats);
}

async function _catLoadItens(catId){
  var panel=document.getElementById("cat-itens-panel");if(!panel)return;
  try{
    var itens=await dbFetchPautaItens(catId);
    _catItensCache[catId]=itens;
    var rows=!itens.length
      ?'<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">Nenhum item nesta categoria</div>'
      :itens.map(function(it){
        return '<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">'
          +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:13px;font-weight:600;color:var(--bt-navy);">'+it.titulo+'</div>'
          +(it.descricao?'<div style="font-size:12px;color:var(--text2);margin-top:3px;">'+it.descricao+'</div>':"")
          +(it.recorrente?'<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px;background:#e0f2fe;color:#0369a1;margin-top:4px;display:inline-block;">Recorrente</span>':"")
          +'</div>'
          +'<div style="display:flex;gap:5px;flex-shrink:0;margin-left:10px;">'
          +'<button onclick="_editItemCat(\''+catId+'\',\''+it.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('edit')+' Editar</button>'
          +'<button onclick="_delItemCat(\''+it.id+'\',\''+catId+'\',\''+it.titulo.replace(/'/g,"\\'")+'\')\" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('trash')+' Excluir</button>'
          +'</div></div>';
      }).join("");
    panel.innerHTML='<div style="background:#fff;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;">'
      +'<div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);">'
      +'<div style="font-size:14px;font-weight:700;color:var(--bt-navy);">Itens</div>'
      +'<button onclick="_novoItemCat(\''+catId+'\')" style="font-size:11px;padding:4px 12px;border-radius:7px;border:none;background:var(--bt-navy);color:#fff;cursor:pointer;display:flex;align-items:center;gap:4px;">'+ic('plus')+' Novo item</button>'
      +'</div>'
      +'<div>'+rows+'</div></div>';
  }catch(e){if(panel)panel.innerHTML='<div style="padding:20px;color:#dc2626;font-size:13px;">Erro ao carregar itens</div>';}
}

function _novaCat(eqId){
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Nova categoria</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="ncat-nome" placeholder="Ex: Projetos de equipe"/></div>'
    +'<input type="hidden" id="ncat-eq" value="'+(eqId&&eqId!=="null"?eqId:"")+'"/>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="_salvarNovaCat()">Criar</button>'
    +'</div></div></div>';
  setTimeout(function(){var el=document.getElementById("ncat-nome");if(el)el.focus();},50);
}

function _editCat(id,nome,eqId){
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Editar categoria</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button>'
    +'</div>'
    +'<div class="field"><label>Nome</label><input id="ecat-nome" value="'+nome+'" placeholder="Ex: Projetos de equipe"/></div>'
    +'<input type="hidden" id="ecat-id" value="'+id+'"/>'
    +'<input type="hidden" id="ecat-eq" value="'+(eqId&&eqId!=="null"?eqId:"")+'"/>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="_salvarEditCat()">Salvar</button>'
    +'</div></div></div>';
  setTimeout(function(){var el=document.getElementById("ecat-nome");if(el)el.focus();},50);
}

async function _salvarNovaCat(){
  var nome=(document.getElementById("ncat-nome").value||"").trim();
  var eqEl=document.getElementById("ncat-eq");var eqId=eqEl&&eqEl.value?eqEl.value:null;
  if(!nome){toast("Informe o nome",true);return;}
  try{
    await dbUpsertPautaCategoria({nome,equipe_id:eqId});
    toast("Criada!");closeModal();
    var cats=await dbFetchPautaCategorias(eqId);_renderCatPagina(cats);
  }catch(e){toast("Erro",true);}
}

async function _salvarEditCat(){
  var id=document.getElementById("ecat-id").value;
  var nome=(document.getElementById("ecat-nome").value||"").trim();
  var eqEl=document.getElementById("ecat-eq");var eqId=eqEl&&eqEl.value?eqEl.value:null;
  if(!nome){toast("Informe o nome",true);return;}
  try{
    await dbUpsertPautaCategoria({id,nome,equipe_id:eqId});
    toast("Salva!");closeModal();
    var cats=await dbFetchPautaCategorias(eqId);_renderCatPagina(cats);
  }catch(e){toast("Erro",true);}
}

function _delCat(id,nome){
  modalConfirm('Excluir a categoria "'+nome+'"?',async function(){
    try{
      await dbDelPautaCategoria(id);
      if(_catSel===id)_catSel=null;
      toast("Excluida!");
      var eqId=equipeAtiva?equipeAtiva.id:null;
      var cats=await dbFetchPautaCategorias(eqId);_renderCatPagina(cats);
    }catch(e){toast("Erro",true);}
  });
}

function _novoItemCat(catId){
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Novo item de pauta</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button>'
    +'</div>'
    +'<div class="field"><label>Titulo</label><input id="nitem-titulo" placeholder="Ex: Relatorio mensal de demandas"/></div>'
    +'<div class="field"><label>Descricao (opcional)</label><textarea id="nitem-desc" rows="2" style="resize:vertical;"></textarea></div>'
    +'<label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;font-size:13px;color:var(--text2);">'
    +'<input type="checkbox" id="nitem-rec" style="width:auto;cursor:pointer;"/>'
    +'Recorrente <span style="font-size:11px;color:var(--text3);">(aparece em novas reunioes automaticamente)</span></label>'
    +'<input type="hidden" id="nitem-cat" value="'+catId+'"/>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="_salvarNovoItemCat()">Criar</button>'
    +'</div></div></div>';
  setTimeout(function(){var el=document.getElementById("nitem-titulo");if(el)el.focus();},50);
}

function _editItemCat(catId,itemId){
  var cache=_catItensCache[catId]||[];
  var it=cache.find(function(x){return x.id===itemId;});
  if(!it){toast("Item nao encontrado",true);return;}
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
    +'<div style="font-size:16px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Editar item</div>'
    +'<button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button>'
    +'</div>'
    +'<div class="field"><label>Titulo</label><input id="eitem-titulo" value="'+it.titulo.replace(/"/g,"&quot;")+'"/></div>'
    +'<div class="field"><label>Descricao (opcional)</label><textarea id="eitem-desc" rows="2" style="resize:vertical;">'+(it.descricao||'')+'</textarea></div>'
    +'<label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;font-size:13px;color:var(--text2);">'
    +'<input type="checkbox" id="eitem-rec"'+(it.recorrente?' checked':'')+' style="width:auto;cursor:pointer;"/>'
    +'Recorrente</label>'
    +'<input type="hidden" id="eitem-id" value="'+itemId+'"/>'
    +'<input type="hidden" id="eitem-cat" value="'+catId+'"/>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="_salvarEditItemCat()">Salvar</button>'
    +'</div></div></div>';
}

async function _salvarNovoItemCat(){
  var titulo=(document.getElementById("nitem-titulo").value||"").trim();
  var catId=document.getElementById("nitem-cat").value;
  var descricao=(document.getElementById("nitem-desc").value||"").trim();
  var recorrente=document.getElementById("nitem-rec").checked;
  if(!titulo){toast("Informe o titulo",true);return;}
  try{
    await dbUpsertPautaItem({titulo,descricao:descricao||null,recorrente,categoria_id:catId});
    toast("Criado!");closeModal();_catLoadItens(catId);
  }catch(e){toast("Erro",true);}
}

async function _salvarEditItemCat(){
  var id=document.getElementById("eitem-id").value;
  var catId=document.getElementById("eitem-cat").value;
  var titulo=(document.getElementById("eitem-titulo").value||"").trim();
  var descricao=(document.getElementById("eitem-desc").value||"").trim();
  var recorrente=document.getElementById("eitem-rec").checked;
  if(!titulo){toast("Informe o titulo",true);return;}
  try{
    await dbUpsertPautaItem({id,titulo,descricao:descricao||null,recorrente,categoria_id:catId});
    toast("Salvo!");closeModal();_catLoadItens(catId);
  }catch(e){toast("Erro",true);}
}

function _delItemCat(id,catId,titulo){
  modalConfirm('Excluir o item "'+titulo+'"?',async function(){
    try{await dbDelPautaItem(id);toast("Excluido!");_catLoadItens(catId);}
    catch(e){toast("Erro",true);}
  });
}


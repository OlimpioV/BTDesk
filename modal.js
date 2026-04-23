// ── MODAL ──
function openCardModal(id){
  modalCardId=id;editingCmtId=null;_ef=null;_ecid=null;
  // carrega tarefas do supabase antes de renderizar
  loadTarefasDoCard(id).then(function(){renderModal();});
}
function renderModal(){
  var id=modalCardId;
  var card=cards.find(function(c){return c.id===id;});if(!card)return;
  var col=COLS.find(function(c){return c.id===card.status;})||{label:"—",dot:"#94a3b8",cover:"#e2e8f0",badgeBg:"#f1f5f9",badgeText:"#475569"};
  var ce=perfil==="mestre"||perfil==="advogado";
  var cmts=getCmts(card);var cv=coverColor(card);
  var cn=cliNome(card.clienteNum);var cd=casoDesc(card.casoNum,card.clienteNum);
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(card.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(card.responsavel===r?' selected':'')+'>'+r+'</option>';}).join("");
  var tiposOpts=TIPOS.map(function(t){var sel=(card.tipos||[]).includes(t);var c=TC[t]||PALETA[0];return '<label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;margin-right:6px;margin-bottom:4px;"><input type="checkbox" '+(sel?"checked":"")+' onchange="toggleModalTipo(\''+id+'\',\''+t+'\')" style="width:auto;accent-color:'+c.border+';"/><span style="font-size:12px;font-weight:600;padding:2px 9px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span></label>';}).join("");
  var cmtHTML=cmts.length===0?'<div style="font-size:12px;color:var(--text3);padding:8px 0;">Nenhum comentário ainda</div>':cmts.map(function(c){var dt=new Date(c.data).toLocaleString("pt-BR");var ited=editingCmtId===c.id;var pode=canEditCmt(c.autor);return '<div style="display:flex;gap:9px;margin-bottom:12px;"><div style="width:28px;height:28px;border-radius:50%;background:'+col.dot+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">'+c.autor.charAt(0).toUpperCase()+'</div><div style="flex:1;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;"><span style="font-size:12px;font-weight:700;color:#172b4d;">'+c.autor+'</span><span style="font-size:11px;color:var(--text3);">'+dt+'</span>'+(c.editado?'<span style="font-size:10px;color:var(--text3);">(editado)</span>':"")+'</div>'+(ited?'<div><textarea id="edit-cmt-txt" rows="2" style="width:100%;font-size:13px;padding:8px;border-radius:8px;margin-bottom:5px;resize:vertical;">'+c.texto+'</textarea><div style="display:flex;gap:5px;"><button class="btn" style="font-size:12px;padding:4px 10px;" onclick="cancelEditCmt()">Cancelar</button><button class="btn btn-primary" style="font-size:12px;padding:4px 10px;" onclick="saveEditCmt(\''+id+'\',\''+c.id+'\')">Salvar</button></div></div>':'<div style="background:#fff;border-radius:8px;padding:8px 11px;font-size:13px;color:#172b4d;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.08);">'+c.texto+'</div>'+(pode?'<div style="display:flex;gap:8px;margin-top:4px;"><button onclick="startEditCmt(\''+c.id+'\')" style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;text-decoration:underline;">Editar</button><button onclick="confirmDelCmt(\''+c.id+'\')" style="font-size:11px;color:#dc2626;background:none;border:none;cursor:pointer;text-decoration:underline;">Excluir</button></div>':""))+'</div></div>';}).join("");
  var newCmt=canComment()?'<div style="display:flex;gap:9px;margin-top:6px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--bt-navy);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">'+emailUser.charAt(0).toUpperCase()+'</div><div style="flex:1;"><div class="cmt-wrap"><textarea id="new-cmt" rows="2" placeholder="Escreva um comentário..."></textarea></div><button class="btn btn-primary" style="font-size:12px;padding:5px 14px;" onclick="submitCmt(\''+id+'\')">Salvar</button></div></div>':"";
  var mw="min(96vw,860px)";
  var trashBtn=ce?'<button onclick="confirmDelCard(\''+id+'\')" style="background:rgba(0,0,0,.22);border:none;color:#fff;border-radius:8px;padding:6px 8px;cursor:pointer;display:flex;align-items:center;" title="Excluir card">'+ic("trash")+'</button>':"";
  var coverBtn=ce?'<button onclick="openCoverPicker(\''+id+'\')" style="background:rgba(0,0,0,.22);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px;">'+ic("palette")+' Cor</button>':"";
  var statusEl=ce
    ?'<select style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;border:none;font-family:inherit;background:'+col.badgeBg+';color:'+col.badgeText+';cursor:pointer;" onchange="updateStatus(\''+id+'\',this.value)">'+sO+'</select>'
    :'<div style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;background:'+col.badgeBg+';color:'+col.badgeText+';display:inline-flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:'+col.dot+';flex-shrink:0;"></span>'+col.label+'</div>';
  var etqEl=ce
    ?'<div style="display:flex;flex-wrap:wrap;gap:4px;">'+tiposOpts+'</div>'
    :(card.tipos&&card.tipos.length?'<div style="display:flex;flex-wrap:wrap;gap:4px;">'+card.tipos.map(function(t){var c=TC[t]||PALETA[0];return '<span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span>';}).join("")+'</div>':'<span style="font-size:12px;color:var(--text3);">Nenhuma</span>');
  var tarefasPanel='<div id="tarefas-panel-'+id+'" style="background:#ebecf0;padding:14px 12px;overflow-y:auto;border-left:1px solid #dfe1e6;">'+buildTarefasHTML(id,ce)+'</div>';
  document.getElementById("modal-container").innerHTML=
    '<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-trello" style="width:'+mw+';" onclick="event.stopPropagation()">'
    +'<div class="modal-cover" style="background:'+cv+';" id="mcover">'
    +'<div style="position:absolute;top:10px;left:12px;">'+coverBtn+'</div>'
    +'<div style="position:absolute;top:10px;right:12px;display:flex;gap:6px;align-items:center;">'+trashBtn+'<button class="mcclose" onclick="closeModal()">'+ic("close")+' Fechar</button></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);">'
    +'<div class="modal-main" style="border-right:1px solid #dfe1e6;">'
    +'<div class="msec">'
    +(ce?'<div class="ititle" id="mt-disp" onclick="startEditTitle(\''+id+'\')">'+card.titulo+'</div><textarea class="ititle-inp" id="mt-inp" rows="2" onkeydown="titleKd(event,\''+id+'\')">'+card.titulo+'</textarea>':'<div class="ititle" style="cursor:default;">'+card.titulo+'</div>')
    +'<div style="margin-top:8px;">'+statusEl+'</div>'
    +'</div>'
    +'<div class="msec"><div class="msec-title">'+ic("edit")+' Observações</div>'
    +(ce?'<div class="obs-block" id="obs-block-'+id+'" onclick="startEditObs(\''+id+'\')">'+(card.obs?'<div class="obs-text" id="obs-txt-'+id+'">'+card.obs+'</div>':'<div class="obs-ph" id="obs-txt-'+id+'">Clique para adicionar observações...</div>')+'<textarea id="obs-inp-'+id+'" class="obs-ta" style="display:none;" onkeydown="obsKd(event,\''+id+'\')" placeholder="Escreva observações... (Ctrl+Enter salva, Esc cancela)">'+(card.obs||"")+'</textarea></div>':(card.obs?'<div class="obs-block" style="cursor:default;"><div class="obs-text">'+card.obs+'</div></div>':""))
    +'</div>'
    +'<div class="msec"><div class="msec-title">'+ic("briefcase")+' Detalhes</div><div class="info-grid">'
    +icCell(id,"clienteNum","Cliente",card.clienteNum?(card.clienteNum+(cn?" — "+cn:"")):"—",ce,"ac")
    +icCell(id,"casoNum","Caso",card.casoNum?(card.casoNum+(cd?" — "+trunc(cd,40):"")):"—",ce,"ac")
    +icCell(id,"responsavel","Responsável",card.responsavel||"—",ce,"sel",rO)
    +icCell(id,"email","E-mail ref.",trunc(card.email,35)||"—",ce,"text")
    +icCell(id,"dataInicio","Início",card.dataInicio||"—",ce,"date")
    +icCell(id,"dataFim","Encerramento",card.dataFim||"—",ce,"date")
    +icCell(id,"horas","Horas",card.horas?(card.horas+"h"):"—",ce,"nstep")
    +'</div></div>'
    +'<div class="msec"><div class="msec-title">'+ic("tag")+' Etiquetas</div>'+etqEl+'</div>'
    +'<div class="msec"><div class="msec-title">'+ic("comment")+' Comentários <span style="background:#fff;border-radius:20px;padding:1px 7px;font-size:11px;font-weight:500;margin-left:3px;">'+cmts.length+'</span></div>'+cmtHTML+newCmt+'</div>'
    +'</div>'
    +tarefasPanel
    +'</div></div></div>';
}
function closeModal(e){if(e&&e.target!==document.querySelector(".modal-overlay"))return;document.getElementById("modal-container").innerHTML="";_ef=null;_ecid=null;}
async function submitCmt(cardId){var el=document.getElementById("new-cmt");var txt=(el?el.value:"").trim();if(!txt){toast("Escreva um comentário",true);return;}try{await addCmt(cardId,txt);toast("Adicionado!");renderModal();}catch(e){toast("Erro",true);}}
function startEditCmt(cid){editingCmtId=cid;renderModal();}
function cancelEditCmt(){editingCmtId=null;renderModal();}
async function saveEditCmt(cardId,cmtId){var el=document.getElementById("edit-cmt-txt");var txt=(el?el.value:"").trim();if(!txt){toast("Não pode ser vazio",true);return;}try{await editCmt(cardId,cmtId,txt);toast("Atualizado!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}}
function confirmDelCmt(cmtId){modalConfirm("Excluir este comentário?",async function(){try{await delCmt(modalCardId,cmtId);toast("Excluído!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}});}
async function toggleModalTipo(cardId,tipo){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.tipos=card.tipos||[];var idx=card.tipos.indexOf(tipo);if(idx>=0)card.tipos.splice(idx,1);else card.tipos.push(tipo);try{await dbUpsert(card);}catch(e){toast("Erro",true);}var mcover=document.getElementById("mcover");if(mcover)mcover.style.background=coverColor(card);}
async function updateStatus(cardId,val){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.status=val;try{await dbUpsert(card);toast("Status atualizado!");}catch(e){toast("Erro",true);}}
function confirmDelCard(id){var card=cards.find(function(c){return c.id===id;});modalConfirm('Excluir a demanda "'+(card?card.titulo:id)+'"?',async function(){try{await dbDel(id);await dbDelTarefasDoCard(id);await dbLog("Excluiu demanda",card?card.titulo:id);cards=cards.filter(function(c){return c.id!==id;});delete tarefasDB[id];closeModal();renderView();}catch(e){toast("Erro",true);}});}

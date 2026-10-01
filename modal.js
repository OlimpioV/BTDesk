// ── MODAL ──
// Etapa 2: helpers, edicao inline e modal principal voltaram para este modulo.
var _demCampoEditando={};
function _snapshotDemandaModelo(){
  var m=demandaModeloDB||{nome:"Demanda padrão",campos:[]};
  return snapshotModeloConfig(m,"Demanda padrão");
}
function _demandaCampos(card){
  if(card&&card.modelo_snapshot&&card.modelo_snapshot.campos)return card.modelo_snapshot.campos||[];
  return (demandaModeloDB&&demandaModeloDB.campos)||[];
}
function _buildDemandaCamposGrid(card,editavel){
  var campos=_demandaCampos(card);
  if(!campos.length)return "";
  var vals=card.campos_valores||{};
  var html='<div class="detail-grid" style="margin-top:8px;">';
  campos.forEach(function(campo){
    var editando=_demCampoEditando[card.id]===campo.id;
    html+='<div class="icell'+(editavel?'':'')+'"'+(editavel&&!editando?' onclick="_demCampoAbrir(\''+card.id+'\',\''+campo.id+'\')"':'')+' style="'+(editavel?'cursor:pointer;':'cursor:default;')+'">'
      +'<div class="icell-label">'+campo.label+'</div>'
      +'<div class="icell-val">'+(editando?_demCampoEditor(campo,vals[campo.id],card.id):_tcolRenderVal(campo,vals[campo.id]))+'</div>'
      +'</div>';
  });
  html+='</div>';
  return html;
}
function _demandaListaResumo(card){
  var vals=card.campos_valores||{};
  var campos=_demandaCampos(card).filter(function(c){return vals[c.id]!==undefined&&vals[c.id]!==null&&vals[c.id]!=="";}).slice(0,3);
  if(!campos.length)return "";
  return '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;">'+campos.map(function(c){
    return '<span style="font-size:10px;color:var(--text3);background:#f8fafc;border:1px solid var(--border);border-radius:5px;padding:2px 6px;"><b style="color:var(--text2);">'+c.label+':</b> '+_tcolRenderVal(c,vals[c.id])+'</span>';
  }).join("")+'</div>';
}
function _demCampoAbrir(cardId,campoId){
  _demCampoEditando[cardId]=campoId;
  renderModal();
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  setTimeout(function(){var el=document.getElementById("dcf-"+vid);if(el)el.focus();},30);
}
function _demCampoFechar(cardId){delete _demCampoEditando[cardId];renderModal();}
function _demCampoEditor(campo,val,cardId){
  var tipo=campo.tipo;
  var vid=campo.id.replace(/[^a-zA-Z0-9]/g,'_');
  if(tipo==='texto')return '<input id="dcf-'+vid+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" style="width:100%;font-size:12px;" onkeydown="_demCampoKd(event,\''+cardId+'\',\''+campo.id+'\')" onblur="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')"/>';
  if(tipo==='numero')return '<input id="dcf-'+vid+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" style="width:100%;font-size:12px;" onkeydown="_demCampoKd(event,\''+cardId+'\',\''+campo.id+'\')" onblur="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')"/>';
  if(tipo==='texto_longo')return '<textarea id="dcf-'+vid+'" rows="3" style="width:100%;font-size:12px;resize:vertical;">'+(val||'')+'</textarea><div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;"><button onclick="_demCampoFechar(\''+cardId+'\')" class="rbtn rbtn-sm">Cancelar</button><button onclick="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Salvar</button></div>';
  if(tipo==='data')return '<input id="dcf-'+vid+'" type="date" value="'+(val||'')+'" style="width:100%;font-size:12px;" onchange="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')" onblur="_demCampoFechar(\''+cardId+'\')"/>';
  if(tipo==='status')return '<select id="dcf-'+vid+'" onchange="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')" style="width:100%;font-size:12px;"><option value="">Sem valor</option>'+(campo.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")+'</select>';
  if(tipo==='responsavel')return '<select id="dcf-'+vid+'" onchange="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')" style="width:100%;font-size:12px;"><option value="">Sem responsavel</option>'+(responsaveis||[]).map(function(s){return '<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select>';
  if(tipo==='checkbox')return '<input id="dcf-'+vid+'" type="checkbox"'+(val?' checked':'')+' onchange="_demCampoPersistir(\''+cardId+'\',\''+campo.id+'\',this.checked?true:null)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--bt-navy);"/>';
  if(tipo==='link')return '<input id="dcf-'+vid+'" type="url" value="'+(val||'')+'" placeholder="https://..." style="width:100%;font-size:12px;" onkeydown="_demCampoKd(event,\''+cardId+'\',\''+campo.id+'\')" onblur="_demCampoSalvar(\''+cardId+'\',\''+campo.id+'\')"/>';
  if(tipo==='multi'){
    var sel=Array.isArray(val)?val:[];
    var checks=(campo.opcoes||[]).map(function(o){return '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0;"><input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/> '+o.label+'</label>';}).join("");
    return '<div id="dcf-'+vid+'" style="display:flex;flex-direction:column;">'+checks+'</div><div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;"><button onclick="_demCampoFechar(\''+cardId+'\')" class="rbtn rbtn-sm">Cancelar</button><button onclick="_demCampoSalvarMulti(\''+cardId+'\',\''+campo.id+'\')" class="rbtn rbtn-sm rbtn-accent">Aplicar</button></div>';
  }
  return "";
}
function _demCampoKd(evt,cardId,campoId){if(evt.key==="Enter"){evt.preventDefault();_demCampoSalvar(cardId,campoId);}else if(evt.key==="Escape"){delete _demCampoEditando[cardId];renderModal();}}
async function _demCampoSalvar(cardId,campoId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var campo=_demandaCampos(card).find(function(c){return c.id===campoId;});if(!campo)return;
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var el=document.getElementById("dcf-"+vid);if(!el)return;
  var val;
  if(campo.tipo==="numero")val=el.value!==""?parseFloat(el.value):null;
  else if(campo.tipo==="texto_longo")val=(el.value||"").trim()||null;
  else val=(el.value||"").trim()||null;
  await _demCampoPersistir(cardId,campoId,val);
}
async function _demCampoSalvarMulti(cardId,campoId){
  var vid=campoId.replace(/[^a-zA-Z0-9]/g,'_');
  var container=document.getElementById("dcf-"+vid);if(!container)return;
  var sel=[];container.querySelectorAll("input[type=checkbox]").forEach(function(cb){if(cb.checked)sel.push(cb.value);});
  await _demCampoPersistir(cardId,campoId,sel.length?sel:null);
}
async function _demCampoPersistir(cardId,campoId,valor){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var novo=Object.assign({},card.campos_valores||{});
  if(valor===null||valor===undefined||(Array.isArray(valor)&&!valor.length))delete novo[campoId];
  else novo[campoId]=valor;
  card.campos_valores=novo;
  try{await dbUpsert(card);delete _demCampoEditando[cardId];renderModal();toast("Salvo!");}
  catch(e){toast("Erro ao salvar",true);}
}


function getCmts(card){return card.comentarios||[];}
async function addCmt(cardId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;var cmts=getCmts(card);cmts.push({id:Date.now().toString(),texto,autor:emailUser,data:new Date().toISOString()});card.comentarios=cmts;await dbUpsert(card);await dbLog("Comentou",card.titulo);}
async function editCmt(cardId,cmtId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).map(function(c){return c.id===cmtId?Object.assign({},c,{texto,editado:true}):c;});await dbUpsert(card);}
async function delCmt(cardId,cmtId){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).filter(function(c){return c.id!==cmtId;});await dbUpsert(card);}
function canEditCmt(autor){return perfil==="mestre"||(emailUser===autor&&perfil==="advogado");}
function canComment(){return perfil==="mestre"||perfil==="advogado";}

function icCell(cardId,field,label,displayVal,canEdit,type,extraOpts){
  if(!canEdit)return '<div class="icell" style="cursor:default;"><div class="icell-label">'+label+'</div><div class="icell-val">'+displayVal+'</div></div>';
  var inputArea="";
  if(field==="clienteNum"){
    inputArea='<div class="ac-wrap"><input id="ic-cli-txt" autocomplete="off" placeholder="Nome ou número..." style="font-size:13px;margin-top:3px;" oninput="icAcInput(this.value,\''+cardId+'\')" onkeydown="icAcKd(event,\''+cardId+'\')"/><div id="ic-ac-list" class="ac-list" style="display:none;"></div></div>';
  } else if(field==="casoNum"){
    inputArea='<div id="ic-caso-area"></div>';
  } else if(type==="date"){
    inputArea='<input type="date" id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  } else if(type==="nstep"){
    inputArea='<input type="number" id="ic-'+field+'" min="0" step="0.5" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  } else if(type==="sel"){
    inputArea='<select id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')"><option value="">-</option>'+(extraOpts||"")+'</select>';
  } else {
    inputArea='<input type="text" id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')">';
  }
  return '<div class="icell" id="icw-'+field+'" onclick="openIcell(\''+cardId+'\',\''+field+'\')">'
    +'<div class="icell-label">'+label+'</div>'
    +'<div class="icell-val" id="icv-'+field+'">'+displayVal+'</div>'
    +'<div id="ici-'+field+'" style="display:none;">'+inputArea+'</div>'
    +'</div>';
}
function openIcell(cardId,field){
  if(_ef&&_ef!==field)closeIcell(_ef,true);
  _ef=field;_ecid=cardId;
  var card=cards.find(function(c){return c.id===cardId;});
  document.getElementById("icv-"+field).style.display="none";
  document.getElementById("ici-"+field).style.display="block";
  document.getElementById("icw-"+field).classList.add("open");
  if(field==="clienteNum"){
    var inp=document.getElementById("ic-cli-txt");
    if(inp){if(card&&card.clienteNum){var cn=cliNome(card.clienteNum);inp.value=card.clienteNum+(cn?" - "+cn:"");}inp.focus();inp.select();}
  } else if(field==="casoNum"){
    var area=document.getElementById("ic-caso-area");
    if(area&&card){
      var casos=card.clienteNum?casosDoCliente(parseInt(card.clienteNum)):[];
      if(casos.length>0){
        var opts='<option value="">Selecione...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(card.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' - '+trunc(c.descricao,35):'')+'</option>';}).join("");
        area.innerHTML='<select id="ic-casoNum" style="margin-top:3px;font-size:13px;" onkeydown="icKd(event,\''+cardId+'\',\'casoNum\')">'+opts+'</select>';
      } else {
        area.innerHTML='<input type="number" id="ic-casoNum" min="1" max="9999" placeholder="Nº caso" style="margin-top:3px;font-size:13px;" onkeydown="icKd(event,\''+cardId+'\',\'casoNum\')"/>';
        if(card.casoNum)document.getElementById("ic-casoNum").value=card.casoNum;
      }
      setTimeout(function(){var el=document.getElementById("ic-casoNum");if(el)el.focus();},10);
    }
  } else {
    var inp=document.getElementById("ic-"+field);
    if(inp&&card){
      if(field==="horas")inp.value=card.horas||"";
      else if(field==="dataInicio")inp.value=card.dataInicio||"";
      else if(field==="dataFim")inp.value=card.dataFim||"";
      else if(field==="responsavel")inp.value=card.responsavel||"";
      else if(field==="email")inp.value=card.email||"";
      inp.focus();if(inp.select)inp.select();
    }
  }
}
function closeIcell(field,cancel){
  if(!field)return;
  var wrap=document.getElementById("icw-"+field);var valEl=document.getElementById("icv-"+field);var inpWrap=document.getElementById("ici-"+field);
  if(wrap)wrap.classList.remove("open");if(valEl)valEl.style.display="";if(inpWrap)inpWrap.style.display="none";
  if(_ef===field){_ef=null;_ecid=null;}
}
function icKd(e,cardId,field){if(e.key==="Enter"){e.preventDefault();saveIcell(cardId,field);}if(e.key==="Escape"){e.preventDefault();closeIcell(field,true);}}
function icAcInput(val,cardId){_acMatches=buildAcList(val);_acI=-1;var list=document.getElementById("ic-ac-list");if(!list)return;if(!_acMatches.length){list.style.display="none";return;}list.innerHTML=_acMatches.map(function(c,i){return '<div class="ac-item" id="icac-'+i+'" onmousedown="icAcSelect('+c.numero+',\''+cardId+'\')" onmouseover="_acI='+i+';icAcHL()"><strong>'+c.numero+'</strong>'+(c.nome?' - '+trunc(c.nome,36):'')+'</div>';}).join("");list.style.display="block";}
function icAcHL(){document.querySelectorAll("[id^='icac-']").forEach(function(el,i){el.classList.toggle("active",i===_acI);});}
function icAcKd(e,cardId){var items=document.querySelectorAll("[id^='icac-']");if(e.key==="ArrowDown"){e.preventDefault();_acI=Math.min(_acI+1,items.length-1);icAcHL();}else if(e.key==="ArrowUp"){e.preventDefault();_acI=Math.max(_acI-1,0);icAcHL();}else if(e.key==="Enter"){e.preventDefault();if(_acI>=0&&_acMatches[_acI])icAcSelect(_acMatches[_acI].numero,cardId);else saveIcell(cardId,"clienteNum");}else if(e.key==="Escape"){e.preventDefault();closeIcell("clienteNum",true);}}
function icAcSelect(num,cardId){var c=clientesDB.find(function(x){return x.numero===num;});var inp=document.getElementById("ic-cli-txt");if(inp)inp.value=num+(c&&c.nome?" - "+c.nome:"");var list=document.getElementById("ic-ac-list");if(list)list.style.display="none";_acI=-1;var card=cards.find(function(x){return x.id===cardId;});if(card){card.clienteNum=num;card.casoNum=null;}var cn=cliNome(num);var valEl=document.getElementById("icv-clienteNum");if(valEl)valEl.textContent=num+(cn?" - "+cn:"");closeIcell("clienteNum",false);var valCaso=document.getElementById("icv-casoNum");if(valCaso)valCaso.textContent="-";dbUpsert(card).catch(function(){});}
async function saveIcell(cardId,field){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var displayVal="-";
  if(field==="clienteNum"){var inp=document.getElementById("ic-cli-txt");var num=numFromStr((inp?inp.value:"").trim());card.clienteNum=num||null;card.casoNum=null;var cn=num?cliNome(num):"";displayVal=num?(num+(cn?" - "+cn:"")):"-";var vCaso=document.getElementById("icv-casoNum");if(vCaso)vCaso.textContent="-";}
  else if(field==="casoNum"){var sel=document.getElementById("ic-casoNum");var nv=sel&&sel.value?parseInt(sel.value):null;card.casoNum=nv;var cd=nv?casoDesc(nv,card.clienteNum):"";displayVal=nv?(nv+(cd?" - "+trunc(cd,40):"")):"-";}
  else if(field==="horas"){var inp=document.getElementById("ic-"+field);card.horas=inp&&inp.value?inp.value:null;displayVal=card.horas?(card.horas+"h"):"-";}
  else if(field==="responsavel"){var sel=document.getElementById("ic-"+field);setResps(card,sel&&sel.value?[sel.value]:[]);displayVal=card.responsavel||"-";}
  else{var inp=document.getElementById("ic-"+field);card[field]=inp&&inp.value?inp.value:null;displayVal=card[field]||"-";}
  var valEl=document.getElementById("icv-"+field);if(valEl)valEl.textContent=displayVal;
  closeIcell(field,false);
  try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro ao salvar",true);}
}
function startEditTitle(cardId){if(_ef&&_ef!=="titulo")closeIcell(_ef,true);_ef="titulo";_ecid=cardId;var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(!disp||!inp)return;disp.classList.add("editing");inp.classList.add("editing");inp.focus();inp.select();}
function titleKd(e,cardId){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveTitleModal(cardId);}if(e.key==="Escape"){e.preventDefault();stopEditTitle();}}
async function saveTitleModal(cardId){var inp=document.getElementById("mt-inp");var val=(inp?inp.value:"").trim();if(!val){toast("Título não pode ser vazio",true);return;}var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.titulo=val;var disp=document.getElementById("mt-disp");if(disp)disp.textContent=val;stopEditTitle();var faceEl=document.getElementById("ct-"+cardId);if(faceEl)faceEl.textContent=val;try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditTitle(){var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(disp)disp.classList.remove("editing");if(inp)inp.classList.remove("editing");if(_ef==="titulo"){_ef=null;_ecid=null;}}
function startEditObs(cardId){if(_ef&&_ef!=="obs")closeIcell(_ef,true);_ef="obs";_ecid=cardId;var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(!block||!inpEl)return;block.classList.add("open");if(textEl)textEl.style.display="none";inpEl.style.display="block";inpEl.focus();}
function obsKd(e,cardId){if(e.key==="Escape"){e.preventDefault();stopEditObs(cardId,null);}if(e.key==="Enter"&&e.ctrlKey){e.preventDefault();saveObsModal(cardId);}}
async function saveObsModal(cardId){var ta=document.getElementById("obs-inp-"+cardId);var val=ta?ta.value:"";var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.obs=val;stopEditObs(cardId,val);var faceObs=document.getElementById("co-"+cardId);if(faceObs){if(val){faceObs.style.display="";faceObs.textContent=trunc(val,90);}else{faceObs.style.display="none";}}try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditObs(cardId,val){var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(block)block.classList.remove("open");if(inpEl)inpEl.style.display="none";if(textEl){textEl.style.display="";if(val!==null){if(val){textEl.className="obs-text";textEl.textContent=val;}else{textEl.className="obs-ph";textEl.textContent="Clique para adicionar observações...";}}}if(_ef==="obs"){_ef=null;_ecid=null;}}
function closeModal(e){if(e&&e.target!==document.querySelector(".modal-overlay"))return;var mc=document.getElementById("modal-container");var ov=mc.querySelector(".modal-overlay");_ef=null;_ecid=null;
  // Animacao de saida: so limpa se o mesmo modal ainda estiver na tela (outro pode ter sido aberto nesse meio tempo)
  _mtPopAberto=null;_stNovaCard=null;
  if(document.querySelector("#app.kanban-mode"))renderKanban();
  if(ov&&ov.querySelector(".modal-trello")&&!ov.classList.contains("mt-saindo")){ov.classList.remove("mt-entrando");ov.classList.add("mt-saindo");setTimeout(function(){if(ov.parentNode===mc)mc.innerHTML="";},170);}else mc.innerHTML="";}
async function submitCmt(cardId){var el=document.getElementById("new-cmt");var txt=(el?el.value:"").trim();if(!txt){toast("Escreva um comentário",true);return;}try{await addCmt(cardId,txt);toast("Adicionado!");renderModal();}catch(e){toast("Erro",true);}}
function startEditCmt(cid){editingCmtId=cid;renderModal();}
function cancelEditCmt(){editingCmtId=null;renderModal();}
async function saveEditCmt(cardId,cmtId){var el=document.getElementById("edit-cmt-txt");var txt=(el?el.value:"").trim();if(!txt){toast("Não pode ser vazio",true);return;}try{await editCmt(cardId,cmtId,txt);toast("Atualizado!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}}
function confirmDelCmt(cmtId){modalConfirm("Excluir este comentário?",async function(){try{await delCmt(modalCardId,cmtId);toast("Excluído!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}});}
async function toggleModalTipo(cardId,tipo){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.tipos=card.tipos||[];var idx=card.tipos.indexOf(tipo);if(idx>=0)card.tipos.splice(idx,1);else card.tipos.push(tipo);renderModal();try{await dbUpsert(card);}catch(e){toast("Erro",true);}}
async function updateStatus(cardId,val){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.status=val;if(modalCardId===cardId&&document.getElementById("mstatus"))renderModal();try{await dbUpsert(card);toast("Status atualizado!");}catch(e){toast("Erro",true);}}
function confirmDelCard(id){var card=cards.find(function(c){return c.id===id;});modalConfirm('Excluir a demanda "'+(card?card.titulo:id)+'"?',async function(){try{await dbDelTarefasDoCard(id);await dbDel(id);await dbLog("Excluiu demanda",card?card.titulo:id);delete tarefasDB[id];cards=cards.filter(function(c){return c.id!==id;});closeModal();renderView();}catch(e){toast("Erro",true);}});}

// ── COVER COLOR ──
function openCoverPicker(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var mc=_mc2();mc.innerHTML="";
  var ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="300";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,320px);";
  box.onclick=function(e){e.stopPropagation();};
  var hdr=document.createElement("div");hdr.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;";
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);";htitle.textContent="Cor do card";
  var hclose=document.createElement("button");hclose.style.cssText="background:none;border:none;cursor:pointer;color:var(--text3);";hclose.innerHTML=ic("close");hclose.onclick=_mc2Close;
  hdr.appendChild(htitle);hdr.appendChild(hclose);box.appendChild(hdr);
  var swRow=document.createElement("div");swRow.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;";
  COL_COLORS.forEach(function(cc){
    var sw=document.createElement("div");var sel=card.coverColor===cc.cover;
    sw.style.cssText="width:28px;height:28px;border-radius:50%;background:"+coverSolida(cc.cover)+";cursor:pointer;border:2px solid "+(sel?"#253f4f":"transparent")+";transition:transform .12s;";
    sw.onmouseover=function(){this.style.transform="scale(1.2)";};sw.onmouseout=function(){this.style.transform="scale(1)";};
    sw.onclick=function(){_mc2Close();applyCoverColor(cardId,cc.cover);};
    swRow.appendChild(sw);
  });
  box.appendChild(swRow);
  var btnRem=document.createElement("button");btnRem.className="btn";btnRem.style.cssText="width:100%;font-size:12px;";btnRem.textContent="Remover cor personalizada";
  btnRem.onclick=function(){_mc2Close();applyCoverColor(cardId,null);};
  box.appendChild(btnRem);ov.appendChild(box);mc.appendChild(ov);
}
async function applyCoverColor(cardId,color){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.coverColor=color||null;
  var mcover=document.getElementById("mcover");if(mcover)mcover.style.background=coverColor(card);
  var faceCard=document.getElementById("card-"+cardId);
  if(faceCard){var fc=faceCard.querySelector(".card-cover");if(fc)fc.style.background=coverColor(card);}
  try{await dbUpsert(card);}catch(e){toast("Erro",true);}
}

function openCardModal(id){modalCardId=id;editingCmtId=null;_ef=null;_ecid=null;renderModal();var ov=document.querySelector("#modal-container .modal-overlay");if(ov)ov.classList.add("mt-entrando");}
function renderModal(){
  var id=modalCardId;
  var card=cards.find(function(c){return c.id===id;});if(!card)return;
  var col=COLS.find(function(c){return c.id===card.status;})||{label:"—",dot:"#94a3b8"};
  var ce=perfil==="mestre"||perfil==="advogado";
  var cmts=getCmts(card);var cv=coverColor(card);var ok=_cardConcluido(card);
  var cn=cliNome(card.clienteNum);var cd=casoDesc(card.casoNum,card.clienteNum);
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(card.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var avCor=function(s){return typeof _avCor==="function"?_avCor(s):"#2b76e5";};
  var etqChip=function(t){var c=TC[t]||PALETA[0];return '<span class="mt-chip" style="background:'+c.border+';">'+escHTML(t)+'</span>';};

  // Capa: status a esquerda, cor/excluir/fechar a direita
  var statusEl='<label class="mt-status" id="mstatus"'+(ce?'':' style="cursor:default;"')+'><span class="mt-status-dot" style="background:'+col.dot+';"></span>'+col.label+(ce?ic("chevdown")+'<select aria-label="Status" onchange="updateStatus(\''+id+'\',this.value)">'+sO+'</select>':'')+'</label>';
  var capa='<div class="mt-capa" id="mcover" style="background:'+cv+';">'+statusEl+'<div class="mt-capa-acoes">'
    +(ce?'<button class="mt-ib" title="Cor da capa" onclick="openCoverPicker(\''+id+'\')">'+ic("palette")+'</button><button class="mt-ib" title="Arquivar" onclick="var c=modalCardId;closeModal();arquivarCard(c);">'+ic("archive")+'</button><button class="mt-ib mt-ib-del" title="Excluir demanda" onclick="confirmDelCard(\''+id+'\')">'+ic("trash")+'</button>':'')
    +'<button class="mt-ib" title="Fechar" onclick="closeModal()">'+ic("close")+'</button></div></div>';

  // Titulo com circulo de concluir
  var circ='<button class="mt-circ'+(ok?' ok':'')+'"'+(ce?' title="'+(ok?'Reabrir demanda':'Marcar como concluída')+'" onclick="toggleConcluidoModal(\''+id+'\')"':' disabled')+'>'+ic("check")+'</button>';
  var titulo=ce?'<div class="ititle'+(ok?' mt-concl':'')+'" id="mt-disp" onclick="startEditTitle(\''+id+'\')">'+escHTML(card.titulo)+'</div><textarea class="ititle-inp" id="mt-inp" rows="2" onkeydown="titleKd(event,\''+id+'\')">'+escHTML(card.titulo)+'</textarea>':'<div class="ititle'+(ok?' mt-concl':'')+'" style="cursor:default;">'+escHTML(card.titulo)+'</div>';

  // Popovers (etiquetas, responsavel, datas)
  var popEtq=TIPOS.length?TIPOS.map(function(t){var sel=(card.tipos||[]).includes(t);return '<label class="mt-pop-op"><input type="checkbox" '+(sel?'checked':'')+' onchange="toggleModalTipo(\''+id+'\',\''+escQ(t)+'\')"/>'+etqChip(t)+'</label>';}).join(''):'<div class="mt-pop-vazio">Nenhuma etiqueta cadastrada</div>';
  var resps=respsDe(card);
  var popResp=responsaveis.map(function(r){var on=resps.indexOf(r)>=0;return '<label class="mt-pop-m'+(on?' sel':'')+'"><input type="checkbox"'+(on?' checked':'')+' onchange="toggleModalResp(\''+id+'\',\''+escQ(r)+'\')"/><span class="mt-av" style="background:'+avCor(r)+';">'+escHTML(r)+'</span>'+escHTML(r)+'</label>';}).join('')||'<div class="mt-pop-vazio">Nenhum responsável cadastrado</div>';
  var popDatas='<div class="mt-fl">Início</div><input type="date" class="mt-in" id="mtd-ini" value="'+(card.dataInicio||'')+'"/><div class="mt-fl" style="margin-top:8px;">Encerramento</div><input type="date" class="mt-in" id="mtd-fim" value="'+(card.dataFim||'')+'"/><div class="mt-linha-btn"><button class="mt-btn-azul" onclick="setModalDatas(\''+id+'\')">Salvar</button><button class="mt-btn-txt" onclick="setModalDatas(\''+id+'\',true)">Remover</button></div>';
  var pops='<div class="mt-pop" id="mtp-etq" onclick="event.stopPropagation()"><div class="mt-pop-h">Etiquetas</div>'+popEtq+'</div>'
    +'<div class="mt-pop" id="mtp-resp" onclick="event.stopPropagation()"><div class="mt-pop-h">Responsáveis</div>'+popResp+'</div>'
    +'<div class="mt-pop" id="mtp-datas" onclick="event.stopPropagation()"><div class="mt-pop-h">Datas</div>'+popDatas+'</div>';

  var acoes=ce?'<div class="mt-acoes"><button class="mt-ab" onclick="mtPop(event,\'etq\')">'+ic("tag")+'Etiquetas</button><button class="mt-ab" onclick="openAddTarefa(\''+id+'\')">'+ic("check")+'Subtarefa</button><button class="mt-ab" onclick="mtPop(event,\'resp\')">'+ic("user")+'Responsáveis</button><button class="mt-ab" onclick="mtPop(event,\'datas\')">'+ic("clock")+'Datas</button></div>':'';

  // Responsavel / etiquetas / datas
  var selo=ok?'<span class="mt-selo ok">Concluído</span>':(_cardVencido(card)?'<span class="mt-selo atraso">Em atraso</span>':(card.dataFim&&card.dataFim===_hojeStr()?'<span class="mt-selo hoje">Vence hoje</span>':''));
  var dtTxt=card.dataInicio&&card.dataFim?_fmtDataCurta(card.dataInicio)+" - "+_fmtDataCurta(card.dataFim):(card.dataFim?_fmtDataCurta(card.dataFim):(card.dataInicio?"Começou: "+_fmtDataCurta(card.dataInicio):"Sem datas"));
  var mais=function(p){return ce?'<button class="mt-mais" onclick="mtPop(event,\''+p+'\')">'+ic("plus")+'</button>':'';};
  var meta='<div class="mt-meta">'
    +'<div><div class="mt-meta-l">Responsáveis</div><div class="mt-meta-v">'+resps.map(function(r){return '<span class="mt-av" title="'+escHTML(r)+'" style="background:'+avCor(r)+';">'+escHTML(r)+'</span>';}).join('')+mais("resp")+(resps.length||ce?'':'<span class="mt-vazio">Nenhum</span>')+'</div></div>'
    +'<div><div class="mt-meta-l">Etiquetas</div><div class="mt-meta-v">'+(card.tipos||[]).map(etqChip).join('')+mais("etq")+((card.tipos||[]).length||ce?'':'<span class="mt-vazio">Nenhuma</span>')+'</div></div>'
    +'<div><div class="mt-meta-l">Datas</div><button class="mt-datas"'+(ce?' onclick="mtPop(event,\'datas\')"':' disabled')+'>'+escHTML(dtTxt)+selo+(ce?ic("chevdown"):'')+'</button></div>'
    +'</div>';

  // Detalhes
  var detalhes='<div class="mt-sec"><div class="mt-sec-h">'+ic("briefcase")+'<h3>Detalhes</h3></div><div class="info-grid">'
    +icCell(id,"clienteNum","Cliente",card.clienteNum?(card.clienteNum+(cn?" — "+cn:"")):"—",ce,"ac")
    +icCell(id,"casoNum","Caso",card.casoNum?(card.casoNum+(cd?" — "+trunc(cd,40):"")):"—",ce,"ac")
    +icCell(id,"email","E-mail ref.",trunc(card.email,35)||"—",ce,"text")
    +icCell(id,"horas","Horas",card.horas?(card.horas+"h"):"—",ce,"nstep")
    +'</div>'+_buildDemandaCamposGrid(card,ce)+'</div>';

  // Observacoes
  var obs='<div class="mt-sec"><div class="mt-sec-h">'+ic("desc")+'<h3>Observações</h3>'+(ce&&card.obs?'<button class="mt-btn-sec" onclick="startEditObs(\''+id+'\')">Editar</button>':'')+'</div>'
    +(ce?'<div class="obs-block" id="obs-block-'+id+'" onclick="startEditObs(\''+id+'\')">'+(card.obs?'<div class="obs-text" id="obs-txt-'+id+'">'+escHTML(card.obs)+'</div>':'<div class="obs-ph" id="obs-txt-'+id+'">Adicione observações...</div>')+'<textarea id="obs-inp-'+id+'" class="obs-ta" style="display:none;" onkeydown="obsKd(event,\''+id+'\')" placeholder="Escreva observações... (Ctrl+Enter salva, Esc cancela)">'+escHTML(card.obs||"")+'</textarea></div>':(card.obs?'<div class="obs-block" style="cursor:default;"><div class="obs-text">'+escHTML(card.obs)+'</div></div>':'<div class="mt-vazio">Sem observações</div>'))
    +'</div>';

  // Comentarios (embaixo da coluna principal)
  var cmtHTML=cmts.length===0?'<div class="mt-vazio">Nenhum comentário ainda</div>':cmts.slice().reverse().map(function(c){
    var nome=(c.autor||"?").split("@")[0];var dt=new Date(c.data).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    var ited=editingCmtId===c.id;var pode=canEditCmt(c.autor);
    return '<div class="mt-cm"><span class="mt-av" style="background:'+avCor(c.autor||nome)+';">'+escHTML(nome.slice(0,2).toUpperCase())+'</span><div class="mt-cm-c"><div class="mt-cm-h"><b>'+escHTML(nome)+'</b><small>'+dt+(c.editado?' (editado)':'')+'</small></div>'
      +(ited?'<textarea id="edit-cmt-txt" class="mt-ta" rows="2">'+escHTML(c.texto)+'</textarea><div class="mt-linha-btn"><button class="mt-btn-azul" onclick="saveEditCmt(\''+id+'\',\''+c.id+'\')">Salvar</button><button class="mt-btn-txt" onclick="cancelEditCmt()">Cancelar</button></div>'
        :'<div class="mt-cm-t">'+escHTML(c.texto)+'</div>'+(pode?'<div class="mt-cm-a"><a onclick="startEditCmt(\''+c.id+'\')">Editar</a> · <a onclick="confirmDelCmt(\''+c.id+'\')">Excluir</a></div>':''))
      +'</div></div>';
  }).join("");
  var newCmt=canComment()?'<div class="mt-cm-novo"><span class="mt-av" style="background:var(--bt-navy);">'+escHTML(emailUser.charAt(0).toUpperCase())+'</span><div style="flex:1;min-width:0;"><textarea id="new-cmt" class="mt-ta" rows="2" placeholder="Escrever um comentário... (Ctrl+Enter envia)" onkeydown="if(event.key===\'Enter\'&&event.ctrlKey){event.preventDefault();submitCmt(\''+id+'\');}"></textarea><div class="mt-linha-btn"><button class="mt-btn-azul" onclick="submitCmt(\''+id+'\')">Salvar</button></div></div></div>':"";
  var comentarios='<div class="mt-sec"><div class="mt-sec-h">'+ic("comment")+'<h3>Comentários <span class="mt-cont">'+cmts.length+'</span></h3></div>'+newCmt+'<div class="mt-cm-lista">'+cmtHTML+'</div></div>';

  document.getElementById("modal-container").innerHTML=
    '<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-trello mt-dark" onclick="event.stopPropagation()">'
    +capa
    +'<div class="mt-corpo"><div class="mt-main" id="mt-main">'
    +'<div class="mt-tit-row">'+circ+'<div class="mt-tit">'+titulo+'</div></div>'
    +'<div class="mt-recuo">'+acoes+meta+detalhes+obs+comentarios+'</div>'
    +pops
    +'</div>'
    +'<div class="mt-side" id="tarefas-panel-'+id+'">'+buildTarefasHTML(card,ce)+'</div>'
    +'</div></div></div>';
  if(_mtPopAberto)mtPop(null,_mtPopAberto.id,_mtPopAberto);
}

// Popovers do modal: posicionados embaixo do botao clicado; sobrevivem a um renderModal (ex.: marcar etiqueta)
var _mtPopAberto=null;
function mtPop(e,pid,manter){
  if(e)e.stopPropagation();
  var pop=document.getElementById("mtp-"+pid),host=document.getElementById("mt-main");if(!pop||!host)return;
  var jaAberto=pop.classList.contains("on");
  document.querySelectorAll(".mt-pop.on").forEach(function(p){p.classList.remove("on");});
  if(jaAberto&&!manter){_mtPopAberto=null;return;}
  var pos=manter||null;
  if(!pos&&e){var b=e.currentTarget.getBoundingClientRect(),h=host.getBoundingClientRect();pos={id:pid,left:b.left-h.left,top:b.bottom-h.top+6};}
  if(!pos)return;
  var maxL=host.clientWidth-312;pop.style.left=Math.max(8,Math.min(pos.left,maxL))+"px";pop.style.top=pos.top+"px";
  pop.classList.add("on");_mtPopAberto={id:pid,left:pos.left,top:pos.top};
}
function mtPopFechar(){_mtPopAberto=null;document.querySelectorAll(".mt-pop.on").forEach(function(p){p.classList.remove("on");});}
document.addEventListener("click",function(e){if(_mtPopAberto&&!e.target.closest(".mt-pop,[onclick*=mtPop]"))mtPopFechar();},true);
async function toggleConcluidoModal(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.status=_cardConcluido(card)?_colAndamentoId():_colConcluidaId();
  renderModal();
  try{await dbUpsert(card);toast(_cardConcluido(card)?"Demanda concluída!":"Demanda reaberta");}catch(e){toast("Erro",true);}
}
async function toggleModalResp(cardId,sigla){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var lista=respsDe(card),i=lista.indexOf(sigla);if(i>=0)lista.splice(i,1);else lista.push(sigla);
  setResps(card,lista);renderModal();
  try{await dbUpsert(card);}catch(e){toast("Erro",true);}
}
async function setModalDatas(cardId,remover){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var ini=document.getElementById("mtd-ini"),fim=document.getElementById("mtd-fim");
  card.dataInicio=remover?null:((ini&&ini.value)||null);card.dataFim=remover?null:((fim&&fim.value)||null);
  mtPopFechar();renderModal();
  try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}
}

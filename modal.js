// ── MODAL ──
// Etapa 2: helpers de comentarios e edicao inline voltaram para este modulo.
// O modal principal e fluxos que dependem das tarefas dos cards ainda ficam em
// app.js ate reconciliar JSON versus tabela.
//
// ATENCAO (para a Etapa 2 / reorganizacao): a versao que vivia neste arquivo
// usava a TABELA de tarefas (loadTarefasDoCard, dbDelTarefasDoCard,
// buildTarefasHTML por id), enquanto a versao ativa em app.js usa o modelo
// antigo (tarefas embutidas no JSON do card). Ao reorganizar, decidir qual
// modelo manter antes de mover estas funcoes de volta para ca.
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
  else if(field==="responsavel"){var sel=document.getElementById("ic-"+field);card.responsavel=sel?sel.value||null:null;displayVal=card.responsavel||"-";}
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
function closeModal(e){if(e&&e.target!==document.querySelector(".modal-overlay"))return;document.getElementById("modal-container").innerHTML="";_ef=null;_ecid=null;}
async function submitCmt(cardId){var el=document.getElementById("new-cmt");var txt=(el?el.value:"").trim();if(!txt){toast("Escreva um comentário",true);return;}try{await addCmt(cardId,txt);toast("Adicionado!");renderModal();}catch(e){toast("Erro",true);}}
function startEditCmt(cid){editingCmtId=cid;renderModal();}
function cancelEditCmt(){editingCmtId=null;renderModal();}
async function saveEditCmt(cardId,cmtId){var el=document.getElementById("edit-cmt-txt");var txt=(el?el.value:"").trim();if(!txt){toast("Não pode ser vazio",true);return;}try{await editCmt(cardId,cmtId,txt);toast("Atualizado!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}}
function confirmDelCmt(cmtId){modalConfirm("Excluir este comentário?",async function(){try{await delCmt(modalCardId,cmtId);toast("Excluído!");editingCmtId=null;renderModal();}catch(e){toast("Erro",true);}});}
async function toggleModalTipo(cardId,tipo){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.tipos=card.tipos||[];var idx=card.tipos.indexOf(tipo);if(idx>=0)card.tipos.splice(idx,1);else card.tipos.push(tipo);try{await dbUpsert(card);}catch(e){toast("Erro",true);}var mcover=document.getElementById("mcover");if(mcover)mcover.style.background=coverColor(card);}
async function updateStatus(cardId,val){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.status=val;try{await dbUpsert(card);toast("Status atualizado!");}catch(e){toast("Erro",true);}}
function confirmDelCard(id){var card=cards.find(function(c){return c.id===id;});modalConfirm('Excluir a demanda "'+(card?card.titulo:id)+'"?',async function(){try{await dbDel(id);await dbLog("Excluiu demanda",card?card.titulo:id);cards=cards.filter(function(c){return c.id!==id;});closeModal();renderView();}catch(e){toast("Erro",true);}});}

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
    sw.style.cssText="width:28px;height:28px;border-radius:50%;background:"+cc.cover+";cursor:pointer;border:2px solid "+(sel?"#253f4f":"transparent")+";transition:transform .12s;";
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

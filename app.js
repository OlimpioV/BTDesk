    var u=rows[0];perfil=u.perfil;nomeUser=u.nome;emailUser=u.email;userDbId=u.id;
    sessionStorage.setItem("bari_perfil",u.perfil);sessionStorage.setItem("bari_nome",u.nome);sessionStorage.setItem("bari_email",u.email);sessionStorage.setItem("bari_id",u.id);
    dbLog("Login","Acesso ao sistema");init();
  }catch(e){renderLogin("Erro ao conectar.");}
}
function renderLogin(erro){
  var app=document.getElementById("app");app.className="login-mode";
  app.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:url(BTpapeldeparede.png) center/contain no-repeat,linear-gradient(135deg,#1a2e3a,#253f4f);position:relative;"><div style="position:fixed;inset:0;background:rgba(15,26,35,.55);backdrop-filter:blur(2px);z-index:0;"></div><div style="position:relative;z-index:1;width:min(400px,92vw);"><div style="background:rgba(255,255,255,.94);backdrop-filter:blur(20px);border-radius:20px;padding:40px 44px;box-shadow:0 20px 60px rgba(0,0,0,.3);"><div style="text-align:center;margin-bottom:30px;"><div style="font-size:26px;font-weight:700;color:#1a2e3a;">BTDesk</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:.06em;text-transform:uppercase;">Barcellos Tucunduva</div></div><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(250,81,14,.3),transparent);margin-bottom:26px;"></div><div class="field"><label>E-mail</label><input type="email" id="login-email" placeholder="seu@email.com.br" onkeydown="if(event.key===\'Enter\')document.getElementById(\'login-senha\').focus()" style="padding:11px 14px;"/></div><div class="field"><label>Senha</label><input type="password" id="login-senha" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')doLogin()" style="padding:11px 14px;"/></div>'+(erro?'<div style="font-size:13px;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;margin-bottom:14px;">'+erro+'</div>':"")+'<button onclick="doLogin()" style="width:100%;padding:12px;font-size:14px;font-weight:600;font-family:inherit;border-radius:10px;border:none;background:linear-gradient(135deg,#253f4f,#1a2e3a);color:#fff;cursor:pointer;">Entrar</button><p style="font-size:11px;color:#cbd5e1;text-align:center;margin-top:22px;">2026 © Barcellos Tucunduva</p></div></div></div>';
  setTimeout(function(){var el=document.getElementById("login-email");if(el)el.focus();},100);
}

// ── PERFIL ──
function openMyProfile(){
  var isMestre=perfil==="mestre";
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">Meu perfil</div><button onclick="closeModal()" style="background:transparent;border:none;color:var(--text3);cursor:pointer;">'+ic('close')+'</button></div><div class="field"><label>Nome</label><input id="mp-nome" value="'+nomeUser+'"/></div><div class="field"><label>E-mail</label><input id="mp-email" type="email" value="'+emailUser+'"/></div><div class="field"><label>Nova senha</label><input id="mp-senha" type="password" placeholder="Deixe vazio para manter"/></div>'+(isMestre?'<div class="field"><label>Sigla</label><input id="mp-sigla" style="max-width:120px;text-transform:uppercase;"/></div>':"")+'<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveMyProfile()">Salvar</button></div></div></div>';
  if(isMestre){fetch(SB+"/rest/v1/usuarios?id=eq."+userDbId+"&select=sigla",{headers:H}).then(function(r){return r.json();}).then(function(rows){var el=document.getElementById("mp-sigla");if(el&&rows[0])el.value=rows[0].sigla||"";});}
}
async function saveMyProfile(){
  var nome=(document.getElementById("mp-nome").value||"").trim();var email=(document.getElementById("mp-email").value||"").trim().toLowerCase();var senha=document.getElementById("mp-senha").value;var siglEl=document.getElementById("mp-sigla");var sigla=siglEl?(siglEl.value||"").trim().toUpperCase():undefined;
  if(!nome||!email){toast("Preencha nome e e-mail",true);return;}
  var u={id:userDbId,nome,email,perfil,ativo:true};if(senha)u.senha=senha;if(sigla!==undefined)u.sigla=sigla;
  try{await dbSaveUser(u);nomeUser=nome;emailUser=email;sessionStorage.setItem("bari_nome",nome);sessionStorage.setItem("bari_email",email);await loadResp();toast("Perfil atualizado!");closeModal();}catch(e){toast("Erro",true);}
}

// ── HELPERS ──
function cliNome(num){var c=clientesDB.find(function(c){return c.numero===num;});return c?c.nome:"";}
function casoDesc(num,cliNum){var cl=clientesDB.find(function(c){return c.numero===cliNum;});if(!cl)return "";var ca=casosDB.find(function(c){return c.numero===num&&c.cliente_id===cl.id;});return ca?ca.descricao:"";}
function casosDoCliente(cliNum){var cl=clientesDB.find(function(c){return c.numero===cliNum;});if(!cl)return [];return casosDB.filter(function(c){return c.cliente_id===cl.id;});}
function getFiltered(){return cards.filter(function(c){return (!filterResp||c.responsavel===filterResp)&&(!filterTipo||(c.tipos&&c.tipos.includes(filterTipo)))&&(!filterStatus||c.status===filterStatus)&&(!filterCliente||String(c.clienteNum)===String(filterCliente))&&(!filterCaso||String(c.casoNum)===String(filterCaso));}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});}
function coverColor(card){if(card.coverColor)return card.coverColor;var col=COLS.find(function(c){return c.id===card.status;});return col?col.cover:"#e2e8f0";}
function tipoTagsHTML(tipos){if(!tipos||!tipos.length)return "";return tipos.map(function(t){var c=TC[t]||PALETA[0];return '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span>';}).join("");}
function ccHTML(card){if(card.clienteNum&&card.casoNum)return '<span class="cc">'+card.clienteNum+'/'+card.casoNum+'</span>';if(card.clienteNum)return '<span class="cc">'+card.clienteNum+'</span>';return "";}
function buildAcList(q){if(!q||q.length<1)return [];var ql=q.toLowerCase();return clientesDB.filter(function(c){return String(c.numero).startsWith(ql)||(c.nome&&c.nome.toLowerCase().includes(ql));}).slice(0,8);}

// ── TOOLBAR ──
function toolbarHTML(ce){
  var th=cards.reduce(function(s,c){return s+(parseFloat(c.horas)||0);},0);
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(filterResp===r?' selected':'')+'>'+r+'</option>';}).join("");
  var tO=TIPOS.map(function(t){return '<option value="'+t+'"'+(filterTipo===t?' selected':'')+'>'+t+'</option>';}).join("");
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(filterStatus===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var caList=filterCliente?casosDoCliente(parseInt(filterCliente)):[];
  var casoField=!filterCliente?'<input placeholder="Caso" disabled value="" style="width:72px;opacity:.4;cursor:not-allowed;"/>':caList.length>0?'<select onchange="filterCaso=this.value;renderView()" style="width:84px;"><option value="">Caso</option>'+caList.map(function(c){return '<option value="'+c.numero+'"'+(String(filterCaso)===String(c.numero)?' selected':'')+'>'+c.numero+'</option>';}).join("")+'</select>':'<input placeholder="Caso" value="'+filterCaso+'" oninput="filterCaso=this.value;renderView()" style="width:72px;" type="number" min="1"/>';
  return '<div class="toolbar"><div style="display:flex;align-items:center;gap:5px;font-size:12px;color:rgba(255,255,255,.45);">'+ic('clock')+' <span style="font-weight:700;color:rgba(255,255,255,.8);">'+th.toFixed(1)+'h</span></div><div style="display:flex;gap:5px;align-items:center;padding:4px 0;flex-wrap:wrap;"><select onchange="filterStatus=this.value;renderView()"><option value="">Status</option>'+sO+'</select><select onchange="filterTipo=this.value;renderView()"><option value="">Tipo</option>'+tO+'</select><select onchange="filterResp=this.value;renderView()"><option value="">Resp.</option>'+rO+'</select><input id="fci" placeholder="Cliente" value="'+filterCliente+'" style="width:72px;" type="number" min="1" max="9999"/>'+casoField+'<div style="display:flex;gap:3px;"><button class="view-btn '+(viewMode==="kanban"?"active":"")+'" onclick="viewMode=\'kanban\';renderView()">'+ic("kanban")+'</button><button class="view-btn '+(viewMode==="lista"?"active":"")+'" onclick="viewMode=\'lista\';renderView()">'+ic("list")+'</button></div>'+(ce?'<button class="btn btn-accent" onclick="openNew()" style="display:flex;align-items:center;gap:5px;font-size:12px;padding:5px 13px;border-radius:8px;">'+ic('plus')+' Nova demanda</button>':"")+'</div></div>';
}
function bindFCI(){var el=document.getElementById("fci");if(!el)return;el.addEventListener("change",function(){filterCliente=this.value;filterCaso="";renderView();});el.addEventListener("keydown",function(e){if(e.key==="Enter"){filterCliente=this.value;filterCaso="";renderView();}});}

// ── DRAG & DROP (cards) ──
function onDragStart(e,id){dragCardId=id;e.dataTransfer.effectAllowed="move";setTimeout(function(){var el=document.getElementById("card-"+id);if(el)el.classList.add("dragging");},0);}
function onDragEnd(e,id){var el=document.getElementById("card-"+id);if(el)el.classList.remove("dragging");clearInds();dragCardId=null;_dOvColId=null;_dOvIdx=null;}
function clearInds(){document.querySelectorAll(".card-drop-ind").forEach(function(el){el.classList.remove("active");});}
function onColDragOver(e,colId){
  if(dragColId){e.preventDefault();e.dataTransfer.dropEffect="move";return;}
  e.preventDefault();if(!dragCardId)return;
  var colEl=document.getElementById("col-cards-"+colId);if(!colEl)return;
  var els=Array.from(colEl.querySelectorAll(".card-item:not(.dragging)"));
  var idx=els.length;
  for(var i=0;i<els.length;i++){var rect=els[i].getBoundingClientRect();if(e.clientY<rect.top+rect.height/2){idx=i;break;}}
  if(_dOvColId===colId&&_dOvIdx===idx)return;
  _dOvColId=colId;_dOvIdx=idx;clearInds();
  var ind=document.getElementById("ind-"+colId+"-"+idx);if(ind)ind.classList.add("active");
}
function onColDragLeave(e,colId){var colEl=document.getElementById("col-cards-"+colId);if(!colEl)return;var rect=colEl.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){clearInds();_dOvColId=null;_dOvIdx=null;}}
function onColDrop(e,colId){
  e.preventDefault();e.stopPropagation();clearInds();
  if(dragColId){onColHeaderDrop(e,colId);return;}
  var cid=dragCardId;
  if(!cid)return;
  dragCardId=null;
  var card=cards.find(function(c){return c.id===cid;});if(!card){return;}
  var col=cards.filter(function(c){return c.status===colId&&c.id!==cid;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
  var ins=(_dOvColId===colId&&_dOvIdx!=null)?_dOvIdx:col.length;
  _dOvColId=null;_dOvIdx=null;
  var antes=card.status;card.status=colId;col.splice(ins,0,card);col.forEach(function(c,i){c.ordem=i;});
  renderKanban();
  Promise.all(col.map(function(c){return dbUpsert(c);})).then(function(){
    if(antes!==colId){var al=COLS.find(function(c){return c.id===antes;});var dl=COLS.find(function(c){return c.id===colId;});dbLog("Moveu demanda",card.titulo+": "+(al?al.label:antes)+" \u2192 "+(dl?dl.label:colId));}
  }).catch(function(){toast("Erro ao salvar",true);});
}

// ── DRAG & DROP (colunas) ──
function onColDragStart(e,colId){
  if(dragCardId)return;
  dragColId=colId;e.dataTransfer.effectAllowed="move";
  setTimeout(function(){var el=document.getElementById("col-hdr-"+colId);if(el)el.style.opacity="0.5";},0);
}
function onColDragEnd(e,colId){dragColId=null;var el=document.getElementById("col-hdr-"+colId);if(el)el.style.opacity="";}
function onColHeaderDrop(e,targetColId){
  if(!dragColId||dragColId===targetColId){dragColId=null;return;}
  var fromIdx=COLS.findIndex(function(c){return c.id===dragColId;});
  var toIdx=COLS.findIndex(function(c){return c.id===targetColId;});
  if(fromIdx===-1||toIdx===-1){dragColId=null;return;}
  var moved=COLS.splice(fromIdx,1)[0];
  COLS.splice(toIdx,0,moved);
  COLS.forEach(function(c,i){c.ordem=i;});
  dragColId=null;
  renderKanban();
  dbSaveCols().catch(function(){toast("Erro ao salvar ordem",true);});
}

// ── COLUMNS ──
function colTitleInner(col){var isMestre=perfil==="mestre";return '<span class="col-title"'+(isMestre?' ondblclick="startRenameCol(\''+col.id+'\')" title="Duplo clique para renomear"':'')+'>'+col.label+'</span>';}
function startRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var el=document.getElementById("col-title-"+colId);if(!el)return;el.innerHTML='<input class="col-title-input" id="cti-'+colId+'" value="'+col.label+'" maxlength="40" onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\')cancelRenameCol(\''+colId+'\')" onblur="saveRenameCol(\''+colId+'\')"/>';var inp=document.getElementById("cti-"+colId);if(inp){inp.focus();inp.select();}}
function cancelRenameCol(colId){var col=COLS.find(function(c){return c.id===colId;});var el=document.getElementById("col-title-"+colId);if(el&&col)el.innerHTML=colTitleInner(col);}
async function saveRenameCol(colId){var inp=document.getElementById("cti-"+colId);if(!inp)return;var nome=(inp.value||"").trim();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(nome&&nome!==col.label){col.label=nome;try{await dbSaveCols();}catch(e){}}var el=document.getElementById("col-title-"+colId);if(el)el.innerHTML=colTitleInner(col);}
function toggleCP(colId,e){e.stopPropagation();if(cpOpen===colId){cpOpen=null;var el=document.getElementById("cp-"+colId);if(el)el.remove();return;}cpOpen=colId;document.querySelectorAll(".col-color-picker").forEach(function(el){el.remove();});var col=COLS.find(function(c){return c.id===colId;});var sw=COL_COLORS.map(function(cc,i){return '<div class="color-swatch'+(cc.dot===col.dot?" sel":"")+'" style="background:'+cc.dot+';" onclick="applyColColor(\''+colId+'\','+i+',event)"></div>';}).join("");var picker=document.createElement("div");picker.className="col-color-picker";picker.id="cp-"+colId;picker.innerHTML=sw;var hdr=document.getElementById("col-hdr-"+colId);if(hdr)hdr.appendChild(picker);setTimeout(function(){document.addEventListener("click",function h(){cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();document.removeEventListener("click",h);},true);},10);}
async function applyColColor(colId,idx,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;var cc=COL_COLORS[idx];col.dot=cc.dot;col.cover=cc.cover;cpOpen=null;var p=document.getElementById("cp-"+colId);if(p)p.remove();try{await dbSaveCols();}catch(err){}renderKanban();}
function addColuna(){modalInput("Nova coluna","Nome da coluna...",function(nome){var id="col_"+uid();var cc=COL_COLORS[COLS.length%COL_COLORS.length];COLS.push({id,label:nome,dot:cc.dot,cover:cc.cover,badgeBg:"#f1f5f9",badgeText:"#475569",ordem:COLS.length});dbSaveCols().then(function(){toast("Coluna criada!");}).catch(function(){toast("Erro",true);});renderKanban();});}
function delColuna(colId,e){e.stopPropagation();var col=COLS.find(function(c){return c.id===colId;});if(!col)return;if(cards.filter(function(c){return c.status===colId;}).length>0){toast("A coluna precisa estar vazia",true);return;}modalConfirm('Excluir a coluna "'+col.label+'"?',function(){COLS=COLS.filter(function(c){return c.id!==colId;});dbSaveCols().then(function(){toast("Coluna excluída!");}).catch(function(){});renderKanban();});}

// ── LABELS ──
function toggleLabels(cardId,e){e.stopPropagation();labelsGlobalExp=!labelsGlobalExp;cards.forEach(function(card){labelsExp[card.id]=labelsGlobalExp;var el=document.getElementById("clb-"+card.id);if(el)el.innerHTML=buildLabels(card);});}
function buildLabels(card){if(!card.tipos||!card.tipos.length)return "";var exp=!!labelsExp[card.id];return card.tipos.map(function(t){var c=TC[t]||PALETA[0];if(exp)return '<span class="lbar exp" style="background:'+c.border+';" onclick="toggleLabels(\''+card.id+'\',event)">'+t+'</span>';return '<span class="lbar" style="background:'+c.border+';" title="'+t+'" onclick="toggleLabels(\''+card.id+'\',event)"></span>';}).join("");}

// ── COMENTÁRIOS ──
function getCmts(card){return card.comentarios||[];}
async function addCmt(cardId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;var cmts=getCmts(card);cmts.push({id:Date.now().toString(),texto,autor:emailUser,data:new Date().toISOString()});card.comentarios=cmts;await dbUpsert(card);await dbLog("Comentou",card.titulo);}
async function editCmt(cardId,cmtId,texto){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).map(function(c){return c.id===cmtId?Object.assign({},c,{texto,editado:true}):c;});await dbUpsert(card);}
async function delCmt(cardId,cmtId){var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.comentarios=getCmts(card).filter(function(c){return c.id!==cmtId;});await dbUpsert(card);}
function canEditCmt(autor){return perfil==="mestre"||(emailUser===autor&&perfil==="advogado");}
function canComment(){return perfil==="mestre"||perfil==="advogado";}

// ── INLINE EDIT ──
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
    inputArea='<select id="ic-'+field+'" style="margin-top:3px;" onkeydown="icKd(event,\''+cardId+'\',\''+field+'\')"><option value="">—</option>'+(extraOpts||"")+'</select>';
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
    if(inp){if(card&&card.clienteNum){var cn=cliNome(card.clienteNum);inp.value=card.clienteNum+(cn?" — "+cn:"");}inp.focus();inp.select();}
  } else if(field==="casoNum"){
    var area=document.getElementById("ic-caso-area");
    if(area&&card){
      var casos=card.clienteNum?casosDoCliente(parseInt(card.clienteNum)):[];
      if(casos.length>0){
        var opts='<option value="">Selecione...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(card.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,35):'')+'</option>';}).join("");
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
function icAcInput(val,cardId){_acMatches=buildAcList(val);_acI=-1;var list=document.getElementById("ic-ac-list");if(!list)return;if(!_acMatches.length){list.style.display="none";return;}list.innerHTML=_acMatches.map(function(c,i){return '<div class="ac-item" id="icac-'+i+'" onmousedown="icAcSelect('+c.numero+',\''+cardId+'\')" onmouseover="_acI='+i+';icAcHL()"><strong>'+c.numero+'</strong>'+(c.nome?' — '+trunc(c.nome,36):'')+'</div>';}).join("");list.style.display="block";}
function icAcHL(){document.querySelectorAll("[id^='icac-']").forEach(function(el,i){el.classList.toggle("active",i===_acI);});}
function icAcKd(e,cardId){var items=document.querySelectorAll("[id^='icac-']");if(e.key==="ArrowDown"){e.preventDefault();_acI=Math.min(_acI+1,items.length-1);icAcHL();}else if(e.key==="ArrowUp"){e.preventDefault();_acI=Math.max(_acI-1,0);icAcHL();}else if(e.key==="Enter"){e.preventDefault();if(_acI>=0&&_acMatches[_acI])icAcSelect(_acMatches[_acI].numero,cardId);else saveIcell(cardId,"clienteNum");}else if(e.key==="Escape"){e.preventDefault();closeIcell("clienteNum",true);}}
function icAcSelect(num,cardId){var c=clientesDB.find(function(x){return x.numero===num;});var inp=document.getElementById("ic-cli-txt");if(inp)inp.value=num+(c&&c.nome?" — "+c.nome:"");var list=document.getElementById("ic-ac-list");if(list)list.style.display="none";_acI=-1;var card=cards.find(function(x){return x.id===cardId;});if(card){card.clienteNum=num;card.casoNum=null;}var cn=cliNome(num);var valEl=document.getElementById("icv-clienteNum");if(valEl)valEl.textContent=num+(cn?" — "+cn:"");closeIcell("clienteNum",false);var valCaso=document.getElementById("icv-casoNum");if(valCaso)valCaso.textContent="—";dbUpsert(card).catch(function(){});}
async function saveIcell(cardId,field){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var displayVal="—";
  if(field==="clienteNum"){var inp=document.getElementById("ic-cli-txt");var num=numFromStr((inp?inp.value:"").trim());card.clienteNum=num||null;card.casoNum=null;var cn=num?cliNome(num):"";displayVal=num?(num+(cn?" — "+cn:"")):"—";var vCaso=document.getElementById("icv-casoNum");if(vCaso)vCaso.textContent="—";}
  else if(field==="casoNum"){var sel=document.getElementById("ic-casoNum");var nv=sel&&sel.value?parseInt(sel.value):null;card.casoNum=nv;var cd=nv?casoDesc(nv,card.clienteNum):"";displayVal=nv?(nv+(cd?" — "+trunc(cd,40):"")):"—";}
  else if(field==="horas"){var inp=document.getElementById("ic-"+field);card.horas=inp&&inp.value?inp.value:null;displayVal=card.horas?(card.horas+"h"):"—";}
  else if(field==="responsavel"){var sel=document.getElementById("ic-"+field);card.responsavel=sel?sel.value||null:null;displayVal=card.responsavel||"—";}
  else{var inp=document.getElementById("ic-"+field);card[field]=inp&&inp.value?inp.value:null;displayVal=card[field]||"—";}
  var valEl=document.getElementById("icv-"+field);if(valEl)valEl.textContent=displayVal;
  closeIcell(field,false);
  try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro ao salvar",true);}
}

// ── TITLE / OBS inline ──
function startEditTitle(cardId){if(_ef&&_ef!=="titulo")closeIcell(_ef,true);_ef="titulo";_ecid=cardId;var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(!disp||!inp)return;disp.classList.add("editing");inp.classList.add("editing");inp.focus();inp.select();}
function titleKd(e,cardId){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveTitleModal(cardId);}if(e.key==="Escape"){e.preventDefault();stopEditTitle();}}
async function saveTitleModal(cardId){var inp=document.getElementById("mt-inp");var val=(inp?inp.value:"").trim();if(!val){toast("Título não pode ser vazio",true);return;}var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.titulo=val;var disp=document.getElementById("mt-disp");if(disp)disp.textContent=val;stopEditTitle();var faceEl=document.getElementById("ct-"+cardId);if(faceEl)faceEl.textContent=val;try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditTitle(){var disp=document.getElementById("mt-disp");var inp=document.getElementById("mt-inp");if(disp)disp.classList.remove("editing");if(inp)inp.classList.remove("editing");if(_ef==="titulo"){_ef=null;_ecid=null;}}
function startEditObs(cardId){if(_ef&&_ef!=="obs")closeIcell(_ef,true);_ef="obs";_ecid=cardId;var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(!block||!inpEl)return;block.classList.add("open");if(textEl)textEl.style.display="none";inpEl.style.display="block";inpEl.focus();}
function obsKd(e,cardId){if(e.key==="Escape"){e.preventDefault();stopEditObs(cardId,null);}if(e.key==="Enter"&&e.ctrlKey){e.preventDefault();saveObsModal(cardId);}}
async function saveObsModal(cardId){var ta=document.getElementById("obs-inp-"+cardId);var val=ta?ta.value:"";var card=cards.find(function(c){return c.id===cardId;});if(!card)return;card.obs=val;stopEditObs(cardId,val);var faceObs=document.getElementById("co-"+cardId);if(faceObs){if(val){faceObs.style.display="";faceObs.textContent=trunc(val,90);}else{faceObs.style.display="none";}}try{await dbUpsert(card);toast("Salvo!");}catch(e){toast("Erro",true);}}
function stopEditObs(cardId,val){var block=document.getElementById("obs-block-"+cardId);var textEl=document.getElementById("obs-txt-"+cardId);var inpEl=document.getElementById("obs-inp-"+cardId);if(block)block.classList.remove("open");if(inpEl)inpEl.style.display="none";if(textEl){textEl.style.display="";if(val!==null){if(val){textEl.className="obs-text";textEl.textContent=val;}else{textEl.className="obs-ph";textEl.textContent="Clique para adicionar observações...";}}}if(_ef==="obs"){_ef=null;_ecid=null;}}


// ── TAREFAS ──
function getTarefas(card){return card.tarefas||[];}
function refreshTarefasPanel(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var panel=document.getElementById("tarefas-panel-"+cardId);
  if(panel)panel.innerHTML=buildTarefasHTML(card,ce);
}
async function addTarefa(cardId,texto,resp,di,df,st){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var t={id:uid(),texto:texto,responsavel:resp||"",dataInicio:di||"",dataFim:df||"",status:st||(COLS[0]?COLS[0].id:"aberto"),criado:new Date().toISOString()};
  card.tarefas=getTarefas(card);card.tarefas.push(t);
  await dbUpsert(card);toast("Tarefa adicionada!");refreshTarefasPanel(cardId);
}
async function updateTarefa(cardId,tarefaId,fields){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).map(function(t){return t.id===tarefaId?Object.assign({},t,fields):t;});
  await dbUpsert(card);refreshTarefasPanel(cardId);
}
async function delTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  card.tarefas=(card.tarefas||[]).filter(function(t){return t.id!==tarefaId;});
  await dbUpsert(card);toast("Tarefa excluída!");refreshTarefasPanel(cardId);
}
function _mc2(){var el=document.getElementById("modal-container2");if(!el){el=document.createElement("div");el.id="modal-container2";document.body.appendChild(el);}return el;}
function _mc2Close(){var el=document.getElementById("modal-container2");if(el)el.innerHTML="";}
function _buildTarefaForm(cardId,t){
  var mc=_mc2();mc.innerHTML="";
  var isEdit=!!t;
  var ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="300";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,460px);";
  box.onclick=function(e){e.stopPropagation();};
  var hdr=document.createElement("div");hdr.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;";
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);";htitle.textContent=isEdit?"Editar tarefa":"Nova tarefa";
  var hclose=document.createElement("button");hclose.style.cssText="background:none;border:none;cursor:pointer;color:var(--text3);";hclose.innerHTML=ic("close");hclose.onclick=_mc2Close;
  hdr.appendChild(htitle);hdr.appendChild(hclose);box.appendChild(hdr);
  function mkField(lbl,inp){var f=document.createElement("div");f.className="field";var l=document.createElement("label");l.textContent=lbl;f.appendChild(l);f.appendChild(inp);return f;}
  var inpTexto=document.createElement("input");inpTexto.id="nt-texto";inpTexto.placeholder="Descreva a tarefa...";if(t)inpTexto.value=t.texto||"";
  box.appendChild(mkField("Descrição *",inpTexto));
  var selResp=document.createElement("select");selResp.id="nt-resp";
  var o0=document.createElement("option");o0.value="";o0.textContent="Selecione...";selResp.appendChild(o0);
  responsaveis.forEach(function(r){var o=document.createElement("option");o.value=r;o.textContent=r;if(t&&t.responsavel===r)o.selected=true;selResp.appendChild(o);});
  box.appendChild(mkField("Responsável",selResp));
  var grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:12px;";grid.className="field";
  var inpDi=document.createElement("input");inpDi.type="date";inpDi.id="nt-di";if(t)inpDi.value=t.dataInicio||"";
  var inpDf=document.createElement("input");inpDf.type="date";inpDf.id="nt-df";if(t)inpDf.value=t.dataFim||"";
  var wdi=document.createElement("div");var ldi=document.createElement("label");ldi.textContent="Data início";wdi.appendChild(ldi);wdi.appendChild(inpDi);
  var wdf=document.createElement("div");var ldf=document.createElement("label");ldf.textContent="Data vencimento";wdf.appendChild(ldf);wdf.appendChild(inpDf);
  grid.appendChild(wdi);grid.appendChild(wdf);box.appendChild(grid);
  var selSt=document.createElement("select");selSt.id="nt-status";
  COLS.forEach(function(col){var o=document.createElement("option");o.value=col.id;o.textContent=col.label;if(t&&t.status===col.id)o.selected=true;selSt.appendChild(o);});
  box.appendChild(mkField("Status",selSt));
  var row=document.createElement("div");row.style.cssText="display:flex;gap:8px;justify-content:flex-end;";
  if(isEdit){
    var btnDel=document.createElement("button");btnDel.className="btn btn-danger";btnDel.textContent="Excluir";
    btnDel.onclick=function(){_mc2Close();modalConfirm("Excluir esta tarefa?",function(){delTarefa(cardId,t.id);});};
    row.appendChild(btnDel);
  }
  var btnCancel=document.createElement("button");btnCancel.className="btn";btnCancel.textContent="Cancelar";btnCancel.onclick=_mc2Close;row.appendChild(btnCancel);
  var btnSave=document.createElement("button");btnSave.className="btn btn-primary";btnSave.textContent="Salvar";
  btnSave.onclick=async function(){
    var texto=(document.getElementById("nt-texto").value||"").trim();if(!texto){toast("Informe a descrição",true);return;}
    var fields={texto:texto,responsavel:document.getElementById("nt-resp").value,dataInicio:document.getElementById("nt-di").value,dataFim:document.getElementById("nt-df").value,status:document.getElementById("nt-status").value};
    _mc2Close();
    if(isEdit)await updateTarefa(cardId,t.id,fields);
    else await addTarefa(cardId,fields.texto,fields.responsavel,fields.dataInicio,fields.dataFim,fields.status);
  };
  row.appendChild(btnSave);box.appendChild(row);ov.appendChild(box);mc.appendChild(ov);
  setTimeout(function(){inpTexto.focus();},50);
}
function openAddTarefa(cardId){_buildTarefaForm(cardId,null);}
function openEditTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var t=(card.tarefas||[]).find(function(x){return x.id===tarefaId;});if(!t)return;
  _buildTarefaForm(cardId,t);
}
function toggleTarefaEdit(tid){
  var ep=document.getElementById("tep-"+tid);var cv=document.getElementById("tcv-"+tid);
  var ch=document.getElementById("tch-"+tid);
  if(!ep)return;
  var open=ep.style.display==="flex";
  ep.style.display=open?"none":"flex";
  if(cv)cv.style.cursor=open?"pointer":"default";
  if(ch)ch.style.transform=open?"rotate(0deg)":"rotate(180deg)";
}
async function saveTarefaInline(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var texto=(document.getElementById("ti-txt-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe a descrição",true);return;}
  var fields={
    texto:texto,
    responsavel:document.getElementById("ti-resp-"+tarefaId).value,
    status:document.getElementById("ti-st-"+tarefaId).value,
    dataInicio:document.getElementById("ti-di-"+tarefaId).value,
    dataFim:document.getElementById("ti-df-"+tarefaId).value
  };
  card.tarefas=(card.tarefas||[]).map(function(t){return t.id===tarefaId?Object.assign({},t,fields):t;});
  try{await dbUpsert(card);toast("Salvo!");refreshTarefasPanel(cardId);}catch(e){toast("Erro",true);}
}
function buildTarefasHTML(card,ce){
  var tarefas=getTarefas(card);
  var today=new Date().toISOString().split("T")[0];
  var cid=card.id;
  var btnAddHtml=ce?"<button class=\"msbtn\" style=\"width:auto;padding:4px 10px;font-size:11px;\" onclick=\"openAddTarefa('"+cid+"')\">"+ic("plus")+" Adicionar</button>":"";
  var badge=tarefas.length?" <span style=\"background:#fff;border-radius:20px;padding:1px 7px;font-size:11px;font-weight:500;\">"+tarefas.length+"</span>":"";
  var html="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;\"><div style=\"font-size:11px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:5px;\">"+ic("check")+" Tarefas"+badge+"</div>"+btnAddHtml+"</div>";
  if(!tarefas.length){html+="<div style=\"font-size:12px;color:#94a3b8;font-style:italic;padding:6px 0;\">Nenhuma tarefa</div>";return html;}
  tarefas.forEach(function(t){
    var col=COLS.find(function(co){return co.id===t.status;})||{label:"?",dot:"#94a3b8",badgeBg:"#f1f5f9",badgeText:"#475569"};
    var atrasada=t.status!=="concluido"&&t.dataFim&&t.dataFim<today;
    var concluida=t.status==="concluido";
    var bLeft=atrasada?"#dc2626":concluida?"#22c55e":"transparent";
    var titleStyle="font-size:12px;font-weight:600;color:"+(concluida?"#94a3b8":"#172b4d")+";flex:1;"+(concluida?"text-decoration:line-through;":"");
    var dc=atrasada?"#dc2626":"#94a3b8";var fw=atrasada?"font-weight:700;":"";
    var dateStr="";
    if(t.dataInicio||t.dataFim){
      dateStr="<span style=\"font-size:10px;color:"+dc+";"+fw+"\">";
      if(t.dataInicio)dateStr+=t.dataInicio.split("-").reverse().join("/");
      if(t.dataInicio&&t.dataFim)dateStr+=" \u2192 ";
      if(t.dataFim)dateStr+=t.dataFim.split("-").reverse().join("/");
      dateStr+="</span>";
    }
    var chevron="<svg id=\"tch-"+t.id+"\" width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2.5\" stroke-linecap=\"round\" style=\"flex-shrink:0;transition:transform .2s;\"><polyline points=\"6 9 12 15 18 9\"/></svg>";

    // VIEW row - clicável
    html+="<div style=\"background:#fff;border-radius:8px;margin-bottom:7px;border-left:3px solid "+bLeft+";overflow:hidden;\">";
    html+="<div id=\"tcv-"+t.id+"\" style=\"padding:8px 10px;cursor:"+(ce?"pointer":"default")+";\" "+(ce?"onclick=\"toggleTarefaEdit('"+t.id+"')\"":"")+">";
    html+="<div style=\"display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px;\">";
    html+="<div style=\""+titleStyle+"\">"+t.texto+"</div>"+(ce?chevron:"")+"</div>";
    html+="<div style=\"display:flex;align-items:center;gap:5px;flex-wrap:wrap;\">";
    html+="<span style=\"display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:"+col.badgeBg+";color:"+col.badgeText+";\"><span style=\"width:6px;height:6px;border-radius:50%;background:"+col.dot+";flex-shrink:0;\"></span>"+col.label+"</span>";
    if(t.responsavel)html+="<span style=\"font-size:10px;font-weight:600;background:#f4f5f7;border-radius:4px;padding:2px 6px;color:#5e6c84;\">"+t.responsavel+"</span>";
    if(dateStr)html+=dateStr;
    html+="</div></div>";

    if(ce){
      // EDIT panel - inline expandível
      var sOpts=COLS.map(function(co){return "<option value=\""+co.id+"\""+(t.status===co.id?" selected":"")+">"+co.label+"</option>";}).join("");
      var rOpts="<option value=\"\">Sem responsável</option>"+responsaveis.map(function(r){return "<option value=\""+r+"\""+(t.responsavel===r?" selected":"")+">"+r+"</option>";}).join("");
      html+="<div id=\"tep-"+t.id+"\" style=\"display:none;flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid #f0f0f0;background:#fafafa;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Descrição</div>";
      html+="<input id=\"ti-txt-"+t.id+"\" value=\""+t.texto.replace(/"/g,'&quot;')+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;outline:none;\"/></div>";
      html+="<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Responsável</div><select id=\"ti-resp-"+t.id+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;\">"+rOpts+"</select></div>";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Status</div><select id=\"ti-st-"+t.id+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;color:#172b4d;\">"+sOpts+"</select></div>";
      html+="</div>";
      html+="<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px;\">";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Início</div><input type=\"date\" id=\"ti-di-"+t.id+"\" value=\""+(t.dataInicio||"")+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;\"/></div>";
      html+="<div><div style=\"font-size:10px;font-weight:700;color:#5e6c84;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;\">Vencimento</div><input type=\"date\" id=\"ti-df-"+t.id+"\" value=\""+(t.dataFim||"")+"\" style=\"width:100%;font-size:12px;padding:5px 8px;border:1.5px solid #dfe1e6;border-radius:6px;font-family:inherit;\"/></div>";
      html+="</div>";
      html+="<div style=\"display:flex;justify-content:space-between;align-items:center;\">";
      html+="<button onclick=\"modalConfirm('Excluir esta tarefa?',function(){delTarefa('"+cid+"','"+t.id+"');})\" style=\"font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;cursor:pointer;\">Excluir</button>";
      html+="<button onclick=\"saveTarefaInline('"+cid+"','"+t.id+"')\" style=\"font-size:11px;font-weight:600;background:#253f4f;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;\">Salvar</button>";
      html+="</div></div>";
    }
    html+="</div>";
  });
  return html;
}

// ── COVER COLOR ──
function openCoverPicker(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var mc=_mc2();mc.innerHTML="";
  var ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="300";
  ov.onclick=function(e){if(e.target===ov)_mc2Close();};
  var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,320px);";
  box.onclick=function(e){e.stopPropagation();};
  var hdr=document.createElement("div");hdr.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;";
  var htitle=document.createElement("div");htitle.style.cssText="font-size:15px;font-weight:700;color:var(--bt-navy);";htitle.textContent="Cor do card";
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

// ── MODAL ──
function openCardModal(id){modalCardId=id;editingCmtId=null;_ef=null;_ecid=null;renderModal();}
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
  var sideHTML='<div class="mslabel">Ações</div>'+(ce?'<button class="msbtn" onclick="confirmDelCard(\''+id+'\')" style="color:#dc2626;">'+ic('trash')+' Excluir card</button>':"")+'<div class="mslabel">Status</div>'+(ce?'<select style="font-size:12px;font-weight:600;padding:7px 10px;border-radius:8px;border:none;width:100%;font-family:inherit;background:'+col.badgeBg+';color:'+col.badgeText+';" onchange="updateStatus(\''+id+'\',this.value)">'+sO+'</select>':'<div style="font-size:12px;font-weight:600;padding:7px 10px;border-radius:8px;background:'+col.badgeBg+';color:'+col.badgeText+';display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:'+col.dot+';"></span>'+col.label+'</div>')+'<div class="mslabel">Etiquetas</div>'+(ce?'<div style="background:#fff;border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;">'+tiposOpts+'</div>':(card.tipos&&card.tipos.length?'<div style="display:flex;flex-direction:column;gap:4px;">'+card.tipos.map(function(t){var c=TC[t]||PALETA[0];return '<span style="font-size:11px;font-weight:600;padding:5px 9px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span>';}).join("")+'</div>':'<span style="font-size:12px;color:var(--text3);">Nenhuma</span>'));
  var hasTarefas=(card.tarefas&&card.tarefas.length>0)||ce;
  var mw="min(96vw,860px)";
  var trashBtn=ce?'<button onclick="confirmDelCard(\''+id+'\')" style="background:rgba(0,0,0,.22);border:none;color:#fff;border-radius:8px;padding:6px 8px;cursor:pointer;display:flex;align-items:center;" title="Excluir card">'+ic("trash")+'</button>':"";
  var coverBtn=ce?'<button onclick="openCoverPicker(\''+id+'\')" style="background:rgba(0,0,0,.22);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px;">'+ic("palette")+' Cor</button>':"";
  var statusEl=ce
    ?'<select style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;border:none;font-family:inherit;background:'+col.badgeBg+';color:'+col.badgeText+';cursor:pointer;" onchange="updateStatus(\''+id+'\',this.value)">'+sO+'</select>'
    :'<div style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;background:'+col.badgeBg+';color:'+col.badgeText+';display:inline-flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:'+col.dot+';flex-shrink:0;"></span>'+col.label+'</div>';
  var etqEl=ce
    ?'<div style="display:flex;flex-wrap:wrap;gap:4px;">'+tiposOpts+'</div>'
    :(card.tipos&&card.tipos.length?'<div style="display:flex;flex-wrap:wrap;gap:4px;">'+card.tipos.map(function(t){var c=TC[t]||PALETA[0];return '<span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span>';}).join("")+'</div>':'<span style="font-size:12px;color:var(--text3);">Nenhuma</span>');
  var tarefasPanel='<div id="tarefas-panel-'+id+'" style="background:#ebecf0;padding:14px 12px;overflow-y:auto;border-left:1px solid #dfe1e6;">'+buildTarefasHTML(card,ce)+'</div>';
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
    +icCell(id,"clienteNum","Cliente",card.clienteNum?(card.clienteNum+(cn?" \u2014 "+cn:"")):"—",ce,"ac")
    +icCell(id,"casoNum","Caso",card.casoNum?(card.casoNum+(cd?" \u2014 "+trunc(cd,40):"")):"—",ce,"ac")
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
function confirmDelCard(id){var card=cards.find(function(c){return c.id===id;});modalConfirm('Excluir a demanda "'+(card?card.titulo:id)+'"?',async function(){try{await dbDel(id);await dbLog("Excluiu demanda",card?card.titulo:id);cards=cards.filter(function(c){return c.id!==id;});closeModal();renderView();}catch(e){toast("Erro",true);}});}

// ── KANBAN ──
function renderView(){if(viewMode==="lista")renderLista();else renderKanban();}
function taskChipHTML(card){
  var tarefas=card.tarefas||[];if(!tarefas.length)return "";
  var today=new Date().toISOString().split("T")[0];
  var total=tarefas.length;
  var done=tarefas.filter(function(t){return t.status==="concluido";}).length;
  var atrasada=tarefas.some(function(t){return t.status!=="concluido"&&t.dataFim&&t.dataFim<today;});
  if(atrasada)return '<span class="chip" style="background:#fef2f2;color:#dc2626;font-weight:700;">'+ic("check")+" "+done+"/"+total+" \u00b7 atraso</span>";
  if(done===total)return '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700;">'+ic("check")+" "+done+"/"+total+" \u00b7 ok</span>";
  return '<span class="chip">'+ic("check")+" "+done+"/"+total+"</span>";
}
function buildCardHTML(card,ce){
  var nc=getCmts(card).length;var cv=coverColor(card);var labels=buildLabels(card);var cc2=ccHTML(card);
  var obsP=card.obs?'<div class="card-obs" id="co-'+card.id+'">'+trunc(card.obs,90)+'</div>':'<div class="card-obs" id="co-'+card.id+'" style="display:none;"></div>';
  var taskChip=taskChipHTML(card);
  return '<div class="card-item" id="card-'+card.id+'" draggable="'+(ce?"true":"false")+'"'+(ce?' ondragstart="onDragStart(event,\''+card.id+'\')" ondragend="onDragEnd(event,\''+card.id+'\')"':"")+' onclick="openCardModal(\''+card.id+'\')">'+'<div class="card-cover" style="background:'+cv+';"></div>'+'<div class="card-body">'+(labels?'<div class="card-labels" id="clb-'+card.id+'">'+labels+'</div>':"")+'<div class="card-title" id="ct-'+card.id+'">'+card.titulo+'</div>'+obsP+'<div class="card-meta">'+(cc2||"")+(card.responsavel?'<span class="chip">'+ic("user")+" "+card.responsavel+"</span>":"")+(card.horas?'<span class="chip">'+ic("clock")+" "+card.horas+"h</span>":"")+(nc?'<span class="chip">'+ic("comment")+" "+nc+"</span>":"")+(card.dataFim?'<span class="chip">'+ic("cal")+" "+card.dataFim+"</span>":"")+(taskChip||"")+'</div></div></div>';
}

function renderKanban(){
  viewMode="kanban";var ce=perfil==="mestre"||perfil==="advogado";var isMestre=perfil==="mestre";var filtered=getFiltered();
  var sortedCols=[].concat(COLS).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
  var colsHtml=sortedCols.map(function(col){
    var colCards=filtered.filter(function(c){return c.status===col.id;});
    var isEmpty=cards.filter(function(c){return c.status===col.id;}).length===0;
    var inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div>';
    colCards.forEach(function(card,i){inner+=buildCardHTML(card,ce)+'<div class="card-drop-ind" id="ind-'+col.id+'-'+(i+1)+'"></div>';});
    if(colCards.length===0)inner='<div class="card-drop-ind" id="ind-'+col.id+'-0"></div><div style="border:1.5px dashed rgba(255,255,255,.15);border-radius:10px;padding:16px;text-align:center;font-size:12px;color:rgba(255,255,255,.3);">'+(ce?'Solte aqui':'Nenhuma')+'</div>';
    return '<div class="col-wrap">'
      +'<div class="col-header" id="col-hdr-'+col.id+'" draggable="'+(isMestre?"true":"false")+'"'
      +(isMestre?' ondragstart="onColDragStart(event,\''+col.id+'\')" ondragend="onColDragEnd(event,\''+col.id+'\')"':"")
      +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')">'
      +'<span style="width:9px;height:9px;border-radius:50%;background:'+col.dot+';box-shadow:0 0 5px '+col.dot+'70;flex-shrink:0;cursor:'+(isMestre?"pointer":"default")+';" '+(isMestre?'onclick="toggleCP(\''+col.id+'\',event)" title="Trocar cor"':"")+' ></span>'
      +'<div id="col-title-'+col.id+'" style="flex:1;min-width:0;">'+colTitleInner(col)+'</div>'
      +'<span class="col-count">'+colCards.length+'</span>'
      +(isMestre&&isEmpty?'<button onclick="delColuna(\''+col.id+'\',event)" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;padding:2px 4px;border-radius:5px;" title="Excluir coluna" onmouseover="this.style.color=\'#fca5a5\'" onmouseout="this.style.color=\'rgba(255,255,255,.35)\'">'+ic('trash')+'</button>':"")
      +'</div>'
      +'<div class="col-cards drop-zone" id="col-cards-'+col.id+'"'
      +' ondragover="onColDragOver(event,\''+col.id+'\')" ondrop="onColDrop(event,\''+col.id+'\')" ondragleave="onColDragLeave(event,\''+col.id+'\')">'
      +inner+'</div></div>';
  }).join("");
  var addBtn=isMestre?'<button class="add-col-btn" onclick="addColuna()">'+ic('plus')+' Adicionar coluna</button>':"";
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML=headerHTML("kanban")+toolbarHTML(ce)+'<div class="board-outer"><div class="board-inner">'+colsHtml+addBtn+'</div></div>';
  bindFCI();
}

// ── LISTA ──
function renderLista(){
  viewMode="lista";var ce=perfil==="mestre"||perfil==="advogado";var filtered=getFiltered();
  var app=document.getElementById("app");app.className="page-mode";
  var rows=filtered.length===0?'<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma demanda</td></tr>':filtered.map(function(card){var col=COLS.find(function(c){return c.id===card.status;})||{label:"—",badgeBg:"#f1f5f9",badgeText:"#475569",dot:"#94a3b8"};var sp='<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:'+col.badgeBg+';color:'+col.badgeText+';"><span style="width:6px;height:6px;border-radius:50%;background:'+col.dot+';"></span>'+col.label+'</span>';var nc=getCmts(card).length;var ccTd=(card.clienteNum&&card.casoNum)?card.clienteNum+"/"+card.casoNum:(card.clienteNum||"—");var ac=ce?'<button onclick="openCardModal(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;margin-right:3px;">Abrir</button><button onclick="confirmDelCard(\''+card.id+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;">Excluir</button>':"—";return '<tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'" onclick="openCardModal(\''+card.id+'\')">'+'<td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+card.titulo+'</td>'+'<td style="padding:11px 14px;">'+sp+'</td>'+'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+ccTd+'</td>'+'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+(card.responsavel||"—")+'</td>'+'<td style="padding:11px 14px;">'+(card.tipos&&card.tipos.length?'<div style="display:flex;gap:3px;flex-wrap:wrap;">'+tipoTagsHTML(card.tipos)+'</div>':"—")+'</td>'+'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataInicio||"—")+'</td>'+'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(card.dataFim||"—")+'</td>'+'<td style="padding:11px 14px;font-size:12px;color:var(--text3);">'+(nc?'<span style="display:flex;align-items:center;gap:3px;">'+ic('comment')+' '+nc+'</span>':"—")+'</td>'+'<td style="padding:11px 14px;" onclick="event.stopPropagation()">'+ac+'</td></tr>';}).join("");
  app.innerHTML=headerHTML("lista")+toolbarHTML(ce)+'<div style="padding:16px 16px 40px;max-width:1400px;margin:0 auto;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:900px;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Título','Status','C/C','Resp.','Tipos','Início','Encerramento','Com.','Ações'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  bindFCI();
}

// ── IMPORTAR ──
function renderImp(){var app=document.getElementById("app");app.className="page-mode";app.innerHTML=headerHTML("imp")+'<div style="padding:26px;max-width:680px;margin:0 auto;"><div style="margin-bottom:18px;"><div style="font-size:18px;font-weight:700;color:var(--bt-navy);">Importar planilha</div></div><div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:24px;box-shadow:var(--shadow);"><div style="margin-bottom:16px;padding:11px 13px;background:rgba(37,63,79,.05);border:1px solid rgba(37,63,79,.1);border-radius:9px;font-size:13px;color:var(--bt-navy);">A planilha deve ter as colunas: <strong>Cliente</strong>, <strong>Caso</strong>, <strong>Nome da Consulta</strong>, <strong>Objeto</strong>, <strong>Situação</strong>.</div><div class="field"><label>Arquivo Excel (.xlsx)</label><input type="file" id="import-file" accept=".xlsx,.xls" style="padding:8px;"/></div><button class="btn btn-primary" onclick="processarImp()" style="display:flex;align-items:center;gap:6px;">'+ic('upload')+' Importar</button><div id="imp-result" style="margin-top:12px;"></div></div></div>';}
async function processarImp(){var fi=document.getElementById("import-file");if(!fi||!fi.files||!fi.files[0]){toast("Selecione um arquivo",true);return;}var rd=document.getElementById("imp-result");rd.innerHTML='<div style="color:var(--text3);font-size:13px;">Processando...</div>';try{var data=await fi.files[0].arrayBuffer();var wb=XLSX.read(data,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws,{defval:""});var cm={};var ca=[];rows.forEach(function(row){var cs=String(row["Cliente"]||"").trim();var cas=String(row["Caso"]||"").trim();var cn=numFromStr(cs);var can=numFromStr(cas);if(!cn||!can)return;cm[cn]={numero:cn,nome:cs.replace(/^\d+\s*-\s*/,"").trim()};ca.push({cliNum:cn,casoNum:can,descricao:cas.replace(/^\d+\s*-\s*/,"").trim(),nome_consulta:String(row["Nome da Consulta"]||"").trim(),objeto:String(row["Objeto"]||"").trim(),situacao:String(row["Situação"]||row["Situacao"]||"").trim()});});var cl=Object.values(cm);var CHUNK=50;for(var i=0;i<cl.length;i+=CHUNK)await fetch(SB+"/rest/v1/clientes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(cl.slice(i,i+CHUNK))});await loadClientes();var ci=ca.map(function(c){var x=clientesDB.find(function(x){return x.numero===c.cliNum;});if(!x)return null;return {numero:c.casoNum,cliente_id:x.id,descricao:c.descricao,nome_consulta:c.nome_consulta,objeto:c.objeto,situacao:c.situacao};}).filter(Boolean);for(var j=0;j<ci.length;j+=CHUNK)await fetch(SB+"/rest/v1/casos",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(ci.slice(j,j+CHUNK))});await loadCasos();rd.innerHTML='<div style="padding:11px 13px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;font-size:13px;color:#14532d;">Importação concluída! <strong>'+cl.length+' clientes</strong> e <strong>'+ci.length+' casos</strong> processados.</div>';toast("Importação concluída!");}catch(e){rd.innerHTML='<div style="padding:11px 13px;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;font-size:13px;color:#dc2626;">Erro: '+e.message+'</div>';}}

// ── ETIQUETAS ──
function renderEtq(){var app=document.getElementById("app");app.className="page-mode";var rows=TIPOS.map(function(t){var c=TC[t],isD=!!TC_DEF[t];var pE=perfil==="mestre"||!isD;var ac='<div style="display:flex;gap:5px;"><button onclick="startEditEtq(\''+t+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('edit')+' Editar</button>'+(pE?'<button onclick="delEtq(\''+t+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('trash')+' Excluir</button>':"")+'</div>';return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:11px 14px;"><span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:4px;background:'+c.bg+';border:1px solid '+c.border+';color:'+c.text+';">'+t+'</span></td><td style="padding:11px 14px;">'+(isD&&perfil!=="mestre"?'<span style="font-size:11px;color:var(--text3);">padrão</span>':ac)+'</td></tr>';}).join("");var pal=PALETA.map(function(p,i){return '<div onclick="selCor('+i+')" id="cor-'+i+'" style="width:24px;height:24px;border-radius:50%;background:'+p.bg+';border:2px solid '+p.border+';cursor:pointer;transition:transform .12s;"></div>';}).join("");var isEd=editingEtq!==null;app.innerHTML=headerHTML("etq")+'<div style="padding:24px;max-width:660px;margin:0 auto;"><div style="margin-bottom:18px;"><div style="font-size:18px;font-weight:700;color:var(--bt-navy);">Etiquetas</div></div><div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow);margin-bottom:16px;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);"><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">Etiqueta</th><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">Ações</th></tr></thead><tbody>'+rows+'</tbody></table></div><div style="background:#fff;border-radius:14px;border:'+(isEd?'2px solid var(--bt-orange)':'1px solid var(--border)')+';padding:20px 24px;box-shadow:var(--shadow);"><div style="font-size:14px;font-weight:700;margin-bottom:14px;color:var(--bt-navy);">'+(isEd?'Editando: <span style="color:var(--bt-orange);">'+editingEtq+'</span>':'Nova etiqueta')+'</div><div class="field"><label>Nome</label><input id="etq-nome" placeholder="Ex: Regulatório" style="max-width:280px;" value="'+(isEd?editingEtq:'')+'"/></div><div class="field"><label>Cor</label><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:4px;" id="paleta-cores">'+pal+'</div></div><div style="display:flex;gap:7px;margin-top:7px;">'+(isEd?'<button class="btn" onclick="cancelEditEtq()">Cancelar</button>':"")+'<button class="btn btn-primary" onclick="'+(isEd?'saveEditEtq()':'criarEtq()')+'" style="display:flex;align-items:center;gap:5px;">'+(isEd?ic('edit')+' Salvar':ic('plus')+' Criar')+'</button></div></div></div>';var ci=0;if(isEd){var idx=PALETA.findIndex(function(p){return p.border===TC[editingEtq].border;});if(idx>=0)ci=idx;}selCor(ci);}
function selCor(i){corSel=i;PALETA.forEach(function(_,j){var el=document.getElementById("cor-"+j);if(el)el.style.transform=j===i?"scale(1.3)":"scale(1)";});}
function startEditEtq(n){editingEtq=n;renderEtq();}
function cancelEditEtq(){editingEtq=null;renderEtq();}
function criarEtq(){var n=(document.getElementById("etq-nome").value||"").trim();if(!n){toast("Informe o nome",true);return;}if(TC[n]){toast("Já existe",true);return;}TC[n]=PALETA[corSel];TIPOS=Object.keys(TC);saveEtq();toast("Criada!");renderEtq();}
function saveEditEtq(){var novo=(document.getElementById("etq-nome").value||"").trim();if(!novo){toast("Informe o nome",true);return;}var cor=PALETA[corSel];if(novo!==editingEtq){if(TC[novo]){toast("Já existe",true);return;}cards=cards.map(function(c){if(c.tipos&&c.tipos.includes(editingEtq)){c.tipos=c.tipos.map(function(t){return t===editingEtq?novo:t;});}return c;});if(TC_DEF[editingEtq])TC_DEF[editingEtq]=cor;delete TC[editingEtq];}TC[novo]=cor;TIPOS=Object.keys(TC);saveEtq();toast("Atualizada!");editingEtq=null;renderEtq();}
function delEtq(n){modalConfirm('Excluir a etiqueta "'+n+'"?',function(){delete TC[n];if(TC_DEF[n])delete TC_DEF[n];TIPOS=Object.keys(TC);saveEtq();toast("Excluída!");editingEtq=null;renderEtq();});}

// ── LOGS ──
async function renderLogs(){var app=document.getElementById("app");app.className="page-mode";app.innerHTML=headerHTML("logs")+'<div style="padding:24px;max-width:1100px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';try{var logs=await dbFetchLogs();var rows=logs.length===0?'<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text3);">Nenhum registro</td></tr>':logs.map(function(l){var dt=new Date(l.criado_em).toLocaleString("pt-BR");var b=l.perfil==="mestre"?'<span class="badge" style="background:rgba(168,85,247,.1);color:#7c3aed;">Mestre</span>':l.perfil==="advogado"?'<span class="badge" style="background:rgba(250,81,14,.1);color:var(--bt-orange);">Advogado</span>':'<span class="badge" style="background:var(--surface);color:#64748b;border:1px solid var(--border);">Cliente</span>';return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:11px 14px;font-size:12px;color:var(--text3);white-space:nowrap;">'+dt+'</td><td style="padding:11px 14px;">'+b+'</td><td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+l.acao+'</td><td style="padding:11px 14px;font-size:13px;color:var(--text2);">'+(l.detalhe||"")+'</td></tr>';}).join("");app.innerHTML=headerHTML("logs")+'<div style="padding:24px;max-width:1100px;margin:0 auto;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Data/hora','Perfil','Ação','Detalhe'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';}catch(e){toast("Erro",true);}}

// ── USUÁRIOS ──
function togglePwd(uid){
  var el=document.getElementById("pwd-"+uid);if(!el)return;
  var btn=el.nextElementSibling;
  if(el.dataset.shown==="1"){
    el.textContent="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    el.dataset.shown="0";
    if(btn)btn.style.color="var(--text3)";
  } else {
    var pwd=el.dataset.pwd;
    if(pwd){el.textContent=pwd;el.dataset.shown="1";if(btn)btn.style.color="var(--bt-orange)";}
  }
}
async function renderUsers(){
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("usr")+'<div style="padding:24px;max-width:1000px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  try{
    var us=await dbFetchUsers();
    var rows=us.map(function(u){
      var b=u.perfil==="mestre"?'<span class="badge" style="background:rgba(168,85,247,.1);color:#7c3aed;">Mestre</span>':u.perfil==="advogado"?'<span class="badge" style="background:rgba(250,81,14,.1);color:var(--bt-orange);">Advogado</span>':'<span class="badge" style="background:var(--surface);color:#64748b;border:1px solid var(--border);">Cliente</span>';
      var isM=u.perfil==="mestre";
      var ac=isM?'<span style="font-size:11px;color:var(--text3);">conta principal</span>':'<div style="display:flex;gap:5px;"><button onclick="openEditUser(\''+u.id+'\',\''+escQ(u.nome)+'\',\''+u.email+'\',\''+u.perfil+'\',\''+(u.sigla||'')+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('edit')+' Editar</button><button onclick="delUser(\''+u.id+'\',\''+escQ(u.nome)+'\')" style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;display:flex;align-items:center;gap:3px;">'+ic('trash')+' Excluir</button></div>';
      var eyeBtn='<button onclick="togglePwd(\''+u.id+'\')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:0;display:flex;align-items:center;" title="Ver senha"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
      var pwdCell='<td style="padding:11px 14px;"><div style="display:flex;align-items:center;gap:6px;"><span id="pwd-'+u.id+'" data-pwd="'+(u.senha||"")+'" data-shown="0" style="font-size:12px;font-family:monospace;color:var(--text2);letter-spacing:.05em;">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>'+eyeBtn+'</div></td>';
      return '<tr style="border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">'
        +'<td style="padding:11px 14px;font-size:13px;font-weight:600;color:var(--bt-navy);">'+u.nome+'</td>'
        +'<td style="padding:11px 14px;font-size:13px;color:var(--text2);">'+u.email+'</td>'
        +'<td style="padding:11px 14px;">'+b+'</td>'
        +'<td style="padding:11px 14px;font-size:12px;font-weight:700;color:var(--bt-navy);">'+(u.sigla||'\u2014')+'</td>'
        +pwdCell
        +'<td style="padding:11px 14px;"><span style="font-size:12px;font-weight:600;color:'+(u.ativo?"#16a34a":"#dc2626")+';">'+(u.ativo?"\u25cf Ativo":"\u25cf Inativo")+'</span></td>'
        +'<td style="padding:11px 14px;">'+ac+'</td>'
        +'</tr>';
    }).join("");
    app.innerHTML=headerHTML("usr")+'<div style="padding:24px;max-width:1000px;margin:0 auto;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">'
      +'<div style="font-size:18px;font-weight:700;color:var(--bt-navy);">Usu\u00e1rios</div>'
      +'<button class="btn btn-accent" onclick="openEditUser()" style="display:flex;align-items:center;gap:5px;border-radius:8px;">'+ic('plus')+' Novo usu\u00e1rio</button>'
      +'</div>'
      +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);">'
      +'<table style="width:100%;border-collapse:collapse;">'
      +'<thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'
      +['Nome','E-mail','Perfil','Sigla','Senha','Status','A\u00e7\u00f5es'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")
      +'</tr></thead>'
      +'<tbody>'+rows+'</tbody>'
      +'</table></div></div>';
  }catch(e){toast("Erro",true);}
}

function delUser(id,nome){modalConfirm('Excluir o usuário "'+nome+'"?',async function(){try{await dbDelUser(id);await dbLog("Excluiu usuário",nome);await loadResp();toast("Excluído!");renderUsers();}catch(e){toast("Erro",true);}});}

function openEditUser(id,nome,email,perf,sigla){var isE=!!id;document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><div style="font-size:16px;font-weight:700;color:var(--bt-navy);">'+(isE?"Editar usu\u00e1rio":"Novo usu\u00e1rio")+'</div><button onclick="closeModal()" style="background:var(--surface);border:1px solid var(--border);color:var(--text3);padding:5px;border-radius:7px;cursor:pointer;">'+ic('close')+'</button></div><div class="field"><label>Nome</label><input id="mu-nome" value="'+(nome||"")+'" placeholder="Nome completo"/></div><div class="field"><label>E-mail</label><input id="mu-email" type="email" value="'+(email||"")+'" placeholder="email@btlaw.com.br"/></div><div class="field"><label>'+(isE?"Nova senha (deixe vazio para manter)":"Senha")+'</label><input id="mu-senha" type="password" placeholder="'+(isE?"Nova senha...":"Senha de acesso...")+'"/></div><div class="field"><label>Perfil</label><select id="mu-perfil" onchange="toggleSigla()" style="width:100%;"><option value="advogado"'+(perf==="advogado"?" selected":"")+'>Advogado</option><option value="cliente"'+(perf==="cliente"?" selected":"")+'>Cliente</option></select></div><div class="field" id="sigla-field" style="'+((!perf||perf==="cliente")?"display:none;":"")+'"><label>Sigla</label><input id="mu-sigla" value="'+(sigla||"")+'" placeholder="Ex: VOL" style="max-width:120px;text-transform:uppercase;"/></div><div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveUser(\''+(id||"")+'\')">Salvar</button></div></div></div>';}
function toggleSigla(){var p=document.getElementById("mu-perfil").value;var f=document.getElementById("sigla-field");if(f)f.style.display=p==="advogado"?"":"none";}
async function saveUser(id){var nome=(document.getElementById("mu-nome").value||"").trim();var email=(document.getElementById("mu-email").value||"").trim().toLowerCase();var senha=document.getElementById("mu-senha").value;var perf=document.getElementById("mu-perfil").value;var siglEl=document.getElementById("mu-sigla");var sigla=siglEl?(siglEl.value||"").trim().toUpperCase():"";if(!nome||!email){toast("Preencha nome e e-mail",true);return;}if(!id&&!senha){toast("Informe a senha",true);return;}var u={nome,email,perfil:perf,ativo:true,sigla:(perf==="advogado"||perf==="mestre")?sigla:null};if(id)u.id=id;if(senha)u.senha=senha;try{await dbSaveUser(u);await dbLog(id?"Editou usu\u00e1rio":"Criou usu\u00e1rio",nome);await loadResp();toast(id?"Atualizado!":"Criado!");closeModal();renderUsers();}catch(e){toast("Erro",true);}}

// ── FORM MODAL (nova demanda inline) ──
function openCardFormModal(){
  var card=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var v=card||{titulo:"",responsavel:"",email:"",dataInicio:new Date().toISOString().split("T")[0],dataFim:"",horas:"",obs:"",tipos:[],status:COLS[0]?COLS[0].id:"aberto",clienteNum:null,casoNum:null};
  var tBtns=TIPOS.map(function(t){var sel=formTipos.includes(t),c=TC[t];return '<button type="button" onclick="toggleTipo(\''+t+'\')" id="tipo-'+t+'" style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:4px;cursor:pointer;background:'+(sel?c.bg:'var(--surface)')+';border:'+(sel?'1.5px solid '+c.border:'1.5px solid var(--border)')+';color:'+(sel?c.text:'var(--text2)')+';transition:all .15s;">'+t+'</button>';}).join("");
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join("");
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(v.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var cliTextVal="";if(v.clienteNum){var cliObj=clientesDB.find(function(c){return c.numero===v.clienteNum;});cliTextVal=v.clienteNum+(cliObj&&cliObj.nome?" — "+cliObj.nome:"");}
  var casos=v.clienteNum?casosDoCliente(parseInt(v.clienteNum)):[];
  var casoFI=casos.length>0?'<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(v.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>':'<input id="f-caso" type="number" min="1" max="9999" value="'+(v.casoNum||"")+'" placeholder="Ex: 745"/>';
  document.getElementById("modal-container").innerHTML='<div class="modal-overlay" onclick="closeModal(event)"><div class="modal-box" style="width:min(96vw,580px);padding:0;overflow:hidden;" onclick="event.stopPropagation()"><div style="background:linear-gradient(135deg,#1a2e3a,#253f4f);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;"><span style="color:#fff;font-weight:700;font-size:14px;">'+(editingId?"Editar demanda":"Nova demanda")+'</span><button onclick="closeModal()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);border-radius:7px;padding:4px 8px;cursor:pointer;">'+ic('close')+'</button></div><div style="padding:22px 26px;max-height:80vh;overflow-y:auto;"><div class="field"><label>Título *</label><input id="f-titulo" value="'+v.titulo+'" placeholder="Ex: Análise de contrato CRI"/></div><div class="field"><label>Cliente</label><div class="ac-wrap"><input id="f-cli-txt" autocomplete="off" value="'+cliTextVal+'" placeholder="Digite nome ou número..." oninput="fAcInput(this.value)" onkeydown="fAcKd(event)" onblur="setTimeout(fHideAc,220)"/><input type="hidden" id="f-cli" value="'+(v.clienteNum||"")+'"/><div id="f-ac-list" class="ac-list" style="display:none;"></div></div></div><div class="field"><label>Caso</label><div id="caso-wrap">'+casoFI+'</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="field"><div><label>Responsável</label><select id="f-resp" style="width:100%;"><option value="">Selecione...</option>'+rO+'</select></div><div><label>Status</label><select id="f-status" style="width:100%;">'+sO+'</select></div></div><div class="field"><label>E-mail da solicitação</label><input id="f-email" value="'+(v.email||"")+'" placeholder="Ex: Fwd: Assembleia Geral"/></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="field"><div><label>Início</label><input type="date" id="f-di" value="'+(v.dataInicio||"")+'"/></div><div><label>Encerramento</label><input type="date" id="f-df" value="'+(v.dataFim||"")+'"/></div><div><label>Horas</label><input type="number" id="f-horas" value="'+(v.horas||"")+'" placeholder="Ex: 2.5" step="0.5"/></div></div><div class="field"><label>Tipo(s)</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;">'+tBtns+'</div></div><div class="field"><label>Observações</label><textarea id="f-obs" rows="3" style="resize:vertical;line-height:1.6;">'+(v.obs||"")+'</textarea></div><div style="height:1px;background:var(--border);margin:16px 0;"></div><div style="display:flex;gap:9px;justify-content:flex-end;"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveCard()" style="display:flex;align-items:center;gap:5px;">'+ic('spark')+' Salvar demanda</button></div></div></div></div>';
  setTimeout(function(){var el=document.getElementById("f-titulo");if(el)el.focus();},50);
}

// ── FORM (nova/editar demanda) ──
function renderForm(){
  var app=document.getElementById("app");app.className="page-mode";
  var card=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var v=card||{titulo:"",responsavel:"",email:"",dataInicio:new Date().toISOString().split("T")[0],dataFim:"",horas:"",obs:"",tipos:[],status:COLS[0]?COLS[0].id:"aberto",clienteNum:null,casoNum:null};
  var tBtns=TIPOS.map(function(t){var sel=formTipos.includes(t),c=TC[t];return '<button type="button" onclick="toggleTipo(\''+t+'\')" id="tipo-'+t+'" style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:4px;cursor:pointer;background:'+(sel?c.bg:'var(--surface)')+';border:'+(sel?'1.5px solid '+c.border:'1.5px solid var(--border)')+';color:'+(sel?c.text:'var(--text2)')+';transition:all .15s;">'+t+'</button>';}).join("");
  var rO=responsaveis.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join("");
  var sO=COLS.map(function(c){return '<option value="'+c.id+'"'+(v.status===c.id?' selected':'')+'>'+c.label+'</option>';}).join("");
  var cliTextVal="";if(v.clienteNum){var cliObj=clientesDB.find(function(c){return c.numero===v.clienteNum;});cliTextVal=v.clienteNum+(cliObj&&cliObj.nome?" — "+cliObj.nome:"");}
  var casos=v.clienteNum?casosDoCliente(parseInt(v.clienteNum)):[];
  var casoFI=casos.length>0?'<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'"'+(String(v.casoNum)===String(c.numero)?' selected':'')+'>'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>':'<input id="f-caso" type="number" min="1" max="9999" value="'+(v.casoNum||"")+'" placeholder="Ex: 745"/>';
  app.innerHTML='<div style="background:var(--surface);min-height:100vh;padding-bottom:40px;"><div style="background:linear-gradient(135deg,#1a2e3a,#253f4f);height:52px;padding:0 14px;display:flex;align-items:center;gap:14px;"><button onclick="renderView()" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);font-size:13px;font-weight:500;padding:5px 12px;border-radius:7px;font-family:inherit;">'+ic('back')+' Voltar</button><span style="color:rgba(255,255,255,.25);">/</span><span style="color:#fff;font-weight:600;font-size:14px;">'+(editingId?"Editar demanda":"Nova demanda")+'</span></div><div style="max-width:560px;margin:22px auto;padding:0 14px;"><div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:24px 28px;box-shadow:var(--shadow-md);"><div class="field"><label>Título *</label><input id="f-titulo" value="'+v.titulo+'" placeholder="Ex: Análise de contrato CRI"/></div><div class="field"><label>Cliente</label><div class="ac-wrap"><input id="f-cli-txt" autocomplete="off" value="'+cliTextVal+'" placeholder="Digite nome ou número..." oninput="fAcInput(this.value)" onkeydown="fAcKd(event)" onblur="setTimeout(fHideAc,220)"/><input type="hidden" id="f-cli" value="'+(v.clienteNum||"")+'"/><div id="f-ac-list" class="ac-list" style="display:none;"></div></div></div><div class="field"><label>Caso</label><div id="caso-wrap">'+casoFI+'</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="field"><div><label>Responsável</label><select id="f-resp" style="width:100%;"><option value="">Selecione...</option>'+rO+'</select></div><div><label>Status</label><select id="f-status" style="width:100%;">'+sO+'</select></div></div><div class="field"><label>E-mail da solicitação</label><input id="f-email" value="'+(v.email||"")+'" placeholder="Ex: Fwd: Assembleia Geral"/></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="field"><div><label>Início</label><input type="date" id="f-di" value="'+(v.dataInicio||"")+'"/></div><div><label>Encerramento</label><input type="date" id="f-df" value="'+(v.dataFim||"")+'"/></div><div><label>Horas</label><input type="number" id="f-horas" value="'+(v.horas||"")+'" placeholder="Ex: 2.5" step="0.5"/></div></div><div class="field"><label>Tipo(s)</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;">'+tBtns+'</div></div><div class="field"><label>Observações</label><textarea id="f-obs" rows="3" style="resize:vertical;line-height:1.6;">'+(v.obs||"")+'</textarea></div><div style="height:1px;background:var(--border);margin:16px 0;"></div><div style="display:flex;gap:9px;justify-content:flex-end;"><button class="btn" onclick="renderView()">Cancelar</button><button class="btn btn-primary" onclick="saveCard()" style="display:flex;align-items:center;gap:5px;">'+ic('spark')+' Salvar demanda</button></div></div></div></div>';
}
var _fAcM=[],_fAcI=-1;
function fAcInput(val){_fAcM=buildAcList(val);_fAcI=-1;var list=document.getElementById("f-ac-list");if(!list)return;if(!_fAcM.length){list.style.display="none";return;}list.innerHTML=_fAcM.map(function(c,i){return '<div class="ac-item" id="fac-'+i+'" onmousedown="fAcSel('+c.numero+')" onmouseover="_fAcI='+i+';fAcHL()"><strong>'+c.numero+'</strong>'+(c.nome?' — '+trunc(c.nome,40):'')+'</div>';}).join("");list.style.display="block";updateFormCaso(null);}
function fAcHL(){document.querySelectorAll("[id^='fac-']").forEach(function(el,i){el.classList.toggle("active",i===_fAcI);});}
function fAcKd(e){if(e.key==="ArrowDown"){e.preventDefault();_fAcI=Math.min(_fAcI+1,_fAcM.length-1);fAcHL();}else if(e.key==="ArrowUp"){e.preventDefault();_fAcI=Math.max(_fAcI-1,0);fAcHL();}else if(e.key==="Enter"&&_fAcI>=0){e.preventDefault();if(_fAcM[_fAcI])fAcSel(_fAcM[_fAcI].numero);}else if(e.key==="Escape"){fHideAc();}}
function fHideAc(){var list=document.getElementById("f-ac-list");if(list)list.style.display="none";_fAcI=-1;}
function fAcSel(num){var c=clientesDB.find(function(x){return x.numero===num;});var inp=document.getElementById("f-cli-txt");var hid=document.getElementById("f-cli");if(inp)inp.value=num+(c&&c.nome?" — "+c.nome:"");if(hid)hid.value=num;fHideAc();updateFormCaso(num);}
function updateFormCaso(cliNum){var wrap=document.getElementById("caso-wrap");if(!wrap)return;var casos=cliNum?casosDoCliente(parseInt(cliNum)):[];if(casos.length>0){wrap.innerHTML='<select id="f-caso" style="width:100%;"><option value="">Selecione o caso...</option>'+casos.map(function(c){return '<option value="'+c.numero+'">'+c.numero+(c.descricao?' — '+trunc(c.descricao,40):'')+'</option>';}).join("")+'</select>';}else{wrap.innerHTML='<input id="f-caso" type="number" min="1" max="9999" value="" placeholder="Ex: 745"/>';}}
function toggleTipo(t){var idx=formTipos.indexOf(t);if(idx>=0)formTipos.splice(idx,1);else formTipos.push(t);var c=TC[t],sel=formTipos.includes(t),btn=document.getElementById("tipo-"+t);if(!btn)return;btn.style.background=sel?c.bg:"var(--surface)";btn.style.border=sel?"1.5px solid "+c.border:"1.5px solid var(--border)";btn.style.color=sel?c.text:"var(--text2)";}
function openNew(){editingId=null;formTipos=[];openCardFormModal();}
async function saveCard(){
  var titulo=(document.getElementById("f-titulo").value||"").trim();if(!titulo){toast("Informe o título",true);return;}
  var id=editingId||Date.now().toString();var existing=editingId?cards.find(function(c){return c.id===editingId;}):null;
  var cliVal=document.getElementById("f-cli").value;var casoEl=document.getElementById("f-caso");var casoVal=casoEl?casoEl.value:"";
  var card={id,titulo,clienteNum:cliVal?parseInt(cliVal):null,casoNum:casoVal?parseInt(casoVal):null,responsavel:document.getElementById("f-resp").value,status:document.getElementById("f-status").value,email:document.getElementById("f-email").value,dataInicio:document.getElementById("f-di").value,dataFim:document.getElementById("f-df").value,horas:document.getElementById("f-horas").value,obs:document.getElementById("f-obs").value,tipos:formTipos.slice(),comentarios:existing?existing.comentarios||[]:[]};
  if(existing)card.ordem=existing.ordem||0;else{var cc=cards.filter(function(c){return c.status===card.status;});card.ordem=cc.length;}
  try{await dbUpsert(card);await dbLog(editingId?"Editou demanda":"Criou demanda",titulo);if(editingId){cards=cards.map(function(c){return c.id===editingId?card:c;});}else cards.push(card);toast("Salvo!");editingId=null;document.getElementById("modal-container").innerHTML="";renderView();}catch(e){toast("Erro",true);}
}

// ── INIT ──
async function init(){
  var app=document.getElementById("app");app.className="kanban-mode";
  app.innerHTML='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;"><div style="width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;"><span style="font-size:17px;font-weight:800;color:#fff;">BT</span></div><div style="width:28px;height:3px;background:linear-gradient(90deg,#ff8204,#e20500);border-radius:2px;animation:pulse 1.5s ease-in-out infinite;"></div><style>@keyframes pulse{0%,100%{opacity:.4;transform:scaleX(.8)}50%{opacity:1;transform:scaleX(1)}}</style><div style="font-size:13px;color:rgba(255,255,255,.35);">Carregando BTDesk...</div></div>';
  try{await Promise.all([loadResp(),loadClientes(),loadCasos(),dbLoadCols()]);cards=await dbFetch();cards=cards.filter(function(c){return c.id!=="__cols__";});await loadTodasTarefas();}catch(e){toast("Erro ao carregar",true);}
  loadEtq();renderKanban();
}
if(checkAuth()){loadEtq();init();}else{renderLogin();}

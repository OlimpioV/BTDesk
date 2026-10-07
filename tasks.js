// ── TAREFAS ──
// tarefasDB: cache local indexado por card_id
var tarefasDB={};

// Exclusivas deste modulo (mantidas): leem a TABELA de tarefas para o cache.
async function loadTarefasDoCard(cardId){
  try{var rows=await dbFetchTarefas(cardId);tarefasDB[cardId]=rows;}catch(e){tarefasDB[cardId]=[];}
}

async function loadTodasTarefas(){
  try{
    var rows=await dbFetchTodasTarefas();
    tarefasDB={};
    rows.forEach(function(t){if(t.card_id){if(!tarefasDB[t.card_id])tarefasDB[t.card_id]=[];tarefasDB[t.card_id].push(t);}});
  }catch(e){}
}

// Etapa 2: o fluxo ativo de subtarefas dos cards usa a tabela tarefas. O JSON
// antigo dos cards e migrado no init quando encontrado.

function _snapshotSubtarefaModelo(){
  var m=subtarefaModeloDB||{nome:"Subtarefa padrão",campos:[]};
  return snapshotModeloConfig(m,"Subtarefa padrão");
}
function _subtarefaCampos(t){
  if(t&&t.modelo_snapshot&&t.modelo_snapshot.campos)return t.modelo_snapshot.campos||[];
  return (subtarefaModeloDB&&subtarefaModeloDB.campos)||[];
}
function _subtarefaCampoId(tarefaId,campoId){
  return "sti-"+String(tarefaId).replace(/[^a-zA-Z0-9]/g,"_")+"-"+String(campoId).replace(/[^a-zA-Z0-9]/g,"_");
}
function _buildSubtarefaCamposPreview(t){
  var campos=_subtarefaCampos(t);
  if(!campos.length)return "";
  var vals=t.campos_valores||{};
  var html='<div class="tcols" style="margin:7px 0 0 0;">';
  campos.forEach(function(campo){
    html+='<div class="tcol"><div class="tcol-lbl">'+campo.label+'</div><div class="tcol-val">'+_tcolRenderVal(campo,vals[campo.id])+'</div></div>';
  });
  html+='</div>';
  return html;
}
function _buildSubtarefaCamposEdit(t){
  var campos=_subtarefaCampos(t);
  if(!campos.length)return "";
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;">';
  campos.forEach(function(campo){
    html+='<div><div class="mt-fl">'+campo.label+'</div>'
      +_subtarefaCampoInput(t,campo)
      +'</div>';
  });
  html+='</div>';
  return html;
}
function _subtarefaCampoInput(t,campo){
  var val=(t.campos_valores||{})[campo.id];
  var id=_subtarefaCampoId(t.id,campo.id);
  if(campo.tipo==="texto")return '<input id="'+id+'" value="'+(val!==undefined&&val!==null?String(val).replace(/"/g,'&quot;'):'')+'" class="mt-in"/>';
  if(campo.tipo==="numero")return '<input id="'+id+'" type="number" value="'+(val!==undefined&&val!==null?val:'')+'" class="mt-in"/>';
  if(campo.tipo==="texto_longo")return '<textarea id="'+id+'" rows="2" class="mt-in mt-in-ta">'+(val||'')+'</textarea>';
  if(campo.tipo==="data")return '<input id="'+id+'" type="date" value="'+(val||'')+'" class="mt-in"/>';
  if(campo.tipo==="status")return '<select id="'+id+'" class="mt-in"><option value="">Sem valor</option>'+(campo.opcoes||[]).map(function(o){return '<option value="'+o.id+'"'+(val===o.id?' selected':'')+'>'+o.label+'</option>';}).join("")+'</select>';
  if(campo.tipo==="responsavel")return '<select id="'+id+'" class="mt-in"><option value="">Sem responsável</option>'+(responsaveis||[]).map(function(r){return '<option value="'+r+'"'+(val===r?' selected':'')+'>'+r+'</option>';}).join("")+'</select>';
  if(campo.tipo==="checkbox")return '<input id="'+id+'" type="checkbox"'+(val?' checked':'')+' style="width:18px;height:18px;accent-color:var(--bt-navy);"/>';
  if(campo.tipo==="link")return '<input id="'+id+'" type="url" value="'+(val||'')+'" placeholder="https://..." class="mt-in"/>';
  if(campo.tipo==="multi"){
    var sel=Array.isArray(val)?val:[];
    return '<div id="'+id+'" style="display:flex;flex-direction:column;gap:2px;">'+(campo.opcoes||[]).map(function(o){return '<label class="mst-multi"><input type="checkbox" value="'+o.id+'"'+(sel.indexOf(o.id)>=0?' checked':'')+'/> '+o.label+'</label>';}).join("")+'</div>';
  }
  return "";
}
function _subtarefaCamposColetar(tarefaId,campos,atual){
  var novo=Object.assign({},atual||{});
  campos.forEach(function(campo){
    var el=document.getElementById(_subtarefaCampoId(tarefaId,campo.id));if(!el)return;
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

// ── TAREFAS ──
// So envia a coluna "responsaveis" depois que ela existir no banco (detectada nas linhas lidas)
var _tarefasTemResps=false;
function _taskDbToCard(t){
  if(t&&Object.prototype.hasOwnProperty.call(t,"responsaveis"))_tarefasTemResps=true;
  return {
    id:t.id,
    texto:t.texto||"",
    responsavel:t.responsavel||"",
    responsaveis:Array.isArray(t.responsaveis)?t.responsaveis:[],
    dataInicio:t.data_inicio||"",
    dataFim:t.data_fim||"",
    status:t.status||"",
    criado:t.criado_em||"",
    campos_valores:t.campos_valores||{}
  };
}
function _taskCardToDb(cardId,t,base){
  var st=t.status||(statusTarefaList(false)[0]&&statusTarefaList(false)[0].id)||"pendente";
  var norm=normalizarStatusTarefa(Object.assign({},t,{status:st}),st);
  var out={
    id:norm.id||uid(),
    card_id:cardId,
    texto:norm.texto||"",
    responsavel:respsDe(norm)[0]||null,
    data_inicio:norm.dataInicio||null,
    data_fim:norm.dataFim||null,
    status:norm.status,
    campos_valores:norm.campos_valores||{}
  };
  if(_tarefasTemResps)out.responsaveis=respsDe(norm);
  if(base&&base.equipe_id)out.equipe_id=base.equipe_id;
  else if(equipeAtiva&&equipeAtiva.id)out.equipe_id=equipeAtiva.id;
  else if(demandaEquipesDB&&demandaEquipesDB[cardId]&&demandaEquipesDB[cardId][0])out.equipe_id=demandaEquipesDB[cardId][0];
  return out;
}
function _taskDbRow(cardId,tarefaId){
  return (tarefasDB[cardId]||[]).find(function(t){return t.id===tarefaId;})||null;
}
function getTarefas(card){
  if(!card)return [];
  var rows=tarefasDB[card.id]||[];
  if(rows.length)return rows.map(_taskDbToCard);
  return card.tarefas||[];
}
function refreshTarefasPanel(cardId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var ce=perfil==="mestre"||perfil==="advogado";
  var panel=document.getElementById("tarefas-panel-"+cardId);
  if(panel)panel.innerHTML=buildTarefasHTML(card,ce);
}
async function addTarefa(cardId,f){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var stList=statusTarefaList(false);
  var t=setResps({id:uid(),texto:f.texto,dataInicio:f.dataInicio||"",dataFim:f.dataFim||"",status:f.status||(stList[0]?stList[0].id:"pendente"),criado:new Date().toISOString(),modelo_snapshot:_snapshotSubtarefaModelo(),campos_valores:{}},f.responsaveis||[]);
  await dbUpsertTarefa(_taskCardToDb(cardId,t,null));
  await loadTarefasDoCard(cardId);
  toast("Subtarefa adicionada!");refreshTarefasPanel(cardId);
}
async function updateTarefa(cardId,tarefaId,fields){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  var atual=getTarefas(card).find(function(t){return t.id===tarefaId;})||{id:tarefaId};
  var next=Object.assign({},atual,fields);
  await dbUpsertTarefa(_taskCardToDb(cardId,next,_taskDbRow(cardId,tarefaId)));
  await loadTarefasDoCard(cardId);
  refreshTarefasPanel(cardId);
}
async function delTarefa(cardId,tarefaId){
  var card=cards.find(function(c){return c.id===cardId;});if(!card)return;
  try{
    await dbDelTarefa(tarefaId);
    await loadTarefasDoCard(cardId);
    toast("Subtarefa excluída!");refreshTarefasPanel(cardId);
  }catch(e){toast("Erro ao excluir",true);}
}
function _mc2(){var el=document.getElementById("modal-container2");if(!el){el=document.createElement("div");el.id="modal-container2";document.body.appendChild(el);}return el;}
function _mc2Close(){var el=document.getElementById("modal-container2");if(el)el.innerHTML="";}
// Nova subtarefa: formulario aberto logo abaixo da lista de subtarefas do modal
var _stNovaCard=null;
function openAddTarefa(cardId){
  _stNovaCard=cardId;refreshTarefasPanel(cardId);
  var ta=document.getElementById("nt-texto");if(ta){ta.focus();ta.scrollIntoView({block:"nearest",behavior:"smooth"});}
}
function fecharNovaTarefa(cardId){_stNovaCard=null;refreshTarefasPanel(cardId);}
function _stNovaKd(e,cardId){
  if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();salvarNovaTarefa(cardId);}
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();fecharNovaTarefa(cardId);}
}
async function salvarNovaTarefa(cardId){
  var ta=document.getElementById("nt-texto");var texto=(ta?ta.value:"").trim();
  if(!texto){toast("Informe a descrição",true);if(ta)ta.focus();return;}
  var f={texto:texto,responsaveis:_stRespsLidos("nt-resps"),dataInicio:(document.getElementById("nt-di")||{}).value,dataFim:(document.getElementById("nt-df")||{}).value,status:(document.getElementById("nt-status")||{}).value};
  var btn=document.getElementById("nt-salvar");if(btn)btn.disabled=true;
  try{await addTarefa(cardId,f);}catch(e){toast("Erro ao adicionar",true);if(btn)btn.disabled=false;return;}
  var ta2=document.getElementById("nt-texto");if(ta2)ta2.focus();
}
function _stRespChips(id,sel){
  sel=sel||[];
  if(!responsaveis.length)return '<div class="mt-vazio">Nenhum responsável cadastrado</div>';
  return '<div class="mst-rchips" id="'+id+'">'+responsaveis.map(function(r){
    return '<button type="button" class="mst-rchip'+(sel.indexOf(r)>=0?' on':'')+'" data-r="'+escHTML(r)+'" onclick="this.classList.toggle(\'on\')"><span class="mst-rav" style="background:'+(typeof _avCor==="function"?_avCor(r):"#2b76e5")+';">'+escHTML(r)+'</span>'+escHTML(r)+'</button>';
  }).join("")+'</div>';
}
function _stRespsLidos(id){
  var box=document.getElementById(id);if(!box)return [];
  return Array.prototype.map.call(box.querySelectorAll(".mst-rchip.on"),function(b){return b.getAttribute("data-r");});
}
function _stNovaHTML(cid){
  var ini=(statusTarefaList(false).find(function(s){return !s.finalizador;})||{}).id;
  return '<div class="mst-nova" onclick="event.stopPropagation()">'
    +'<textarea class="mt-in mt-in-ta" id="nt-texto" rows="2" placeholder="Descreva a subtarefa... (Enter adiciona, Esc fecha)" onkeydown="_stNovaKd(event,\''+cid+'\')"></textarea>'
    +'<div class="mt-fl">Responsáveis</div>'+_stRespChips("nt-resps",[])
    +'<div class="mst-g2"><div><div class="mt-fl">Início</div><input type="date" class="mt-in" id="nt-di"/></div><div><div class="mt-fl">Vencimento</div><input type="date" class="mt-in" id="nt-df"/></div></div>'
    +'<div><div class="mt-fl">Status</div><select class="mt-in" id="nt-status">'+statusTarefaOptions(ini,false)+'</select></div>'
    +'<div class="mst-ed-f"><button class="mt-btn-azul" id="nt-salvar" onclick="salvarNovaTarefa(\''+cid+'\')">Adicionar</button><button class="mt-btn-txt" onclick="fecharNovaTarefa(\''+cid+'\')">Cancelar</button></div>'
    +'</div>';
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
  var atual=getTarefas(card).find(function(t){return t.id===tarefaId;})||null;
  var texto=(document.getElementById("ti-txt-"+tarefaId).value||"").trim();
  if(!texto){toast("Informe a descrição",true);return;}
  var camposModelo=_subtarefaCampos(atual);
  var fields={
    texto:texto,
    responsaveis:_stRespsLidos("ti-resps-"+tarefaId),
    status:document.getElementById("ti-st-"+tarefaId).value,
    dataInicio:document.getElementById("ti-di-"+tarefaId).value,
    dataFim:document.getElementById("ti-df-"+tarefaId).value,
    modelo_snapshot:(atual&&atual.modelo_snapshot)||_snapshotSubtarefaModelo(),
    campos_valores:_subtarefaCamposColetar(tarefaId,camposModelo,atual?atual.campos_valores:{})
  };
  try{
    var next=Object.assign({},atual||{id:tarefaId},fields);
    await dbUpsertTarefa(_taskCardToDb(cardId,next,_taskDbRow(cardId,tarefaId)));
    await loadTarefasDoCard(cardId);
    toast("Salvo!");refreshTarefasPanel(cardId);
  }catch(e){toast("Erro",true);}
}
function buildTarefasHTML(card,ce){
  var tarefas=getTarefas(card);
  var today=new Date().toISOString().split("T")[0];
  var cid=card.id;
  var pg=statusTarefaProgresso(tarefas);
  var pct=pg.total?Math.round(pg.feitas/pg.total*100):0;
  var compondo=ce&&_stNovaCard===cid;
  var html='<div class="mst-h">'+ic("check")+'<h3>Subtarefas'+(pg.total?' <span class="mt-cont">'+pg.feitas+'/'+pg.total+'</span>':'')+'</h3>'
    +(ce&&!compondo?'<button class="mt-btn-sec" onclick="openAddTarefa(\''+cid+'\')">'+ic("plus")+' Adicionar</button>':'')+'</div>';
  if(!tarefas.length&&!compondo)return html+'<div class="mt-vazio">Nenhuma subtarefa</div>';
  if(pg.total)html+='<div class="mst-prog"><span>'+pct+'%</span><div class="mst-barra"><i class="'+(pct===100?'cheia':'')+'" style="width:'+pct+'%;"></i></div></div>';
  tarefas.forEach(function(t){
    var cancelada=statusTarefaCancelado(t.status);
    var concluida=statusTarefaFeita(t.status);
    var atrasada=!statusTarefaFinalizador(t.status)&&t.dataFim&&t.dataFim<today;
    var dateStr="";
    if(t.dataInicio||t.dataFim){
      dateStr='<span class="mst-data'+(atrasada?' atraso':'')+'">'+(t.dataInicio?statusTarefaFmtData(t.dataInicio):"")+(t.dataInicio&&t.dataFim?" → ":"")+(t.dataFim?statusTarefaFmtData(t.dataFim):"")+'</span>';
    }
    var concEm=concluida?statusTarefaConclusaoEm(t):"";
    var resps=respsDe(t);
    html+='<div class="mst'+(concluida?' feita':'')+(cancelada?' cancelada':'')+'">';
    html+='<div class="mst-row" id="tcv-'+t.id+'"'+(ce?' onclick="toggleTarefaEdit(\''+t.id+'\')"':' style="cursor:default;"')+'>';
    html+=(ce?'<input type="checkbox" class="mst-chk" title="'+(concluida?'Reabrir':'Concluir')+'"'+(concluida?' checked':'')+' onclick="event.stopPropagation()" onchange="toggleTarefaConcluida(\''+cid+'\',\''+t.id+'\',this.checked)"/>':'<span class="mst-chk-ro'+(concluida?' ok':'')+'">'+(concluida?ic("check"):'')+'</span>');
    html+='<div class="mst-c"><div class="mst-t">'+escHTML(t.texto)+'</div><div class="mst-m">';
    html+='<span class="mst-pill"><i style="background:'+statusTarefaCor(t.status,"#94a3b8")+';"></i>'+escHTML(statusTarefaLabel(t.status))+'</span>';
    resps.forEach(function(r){html+='<span class="mst-resp">'+escHTML(r)+'</span>';});
    html+=dateStr;
    if(concEm)html+='<span class="mst-data ok">Concluída em '+statusTarefaFmtData(concEm)+'</span>';
    html+='</div>'+_buildSubtarefaCamposPreview(t)+'</div>';
    if(ce)html+='<span class="mst-chev" id="tch-'+t.id+'">'+ic("chevdown")+'</span>';
    html+='</div>';
    if(ce){
      var sOpts=statusTarefaOptions(t.status,false);
      html+='<div class="mst-ed" id="tep-'+t.id+'" style="display:none;">';
      html+='<div><div class="mt-fl">Descrição</div><input class="mt-in" id="ti-txt-'+t.id+'" value="'+escHTML(t.texto)+'"/></div>';
      html+='<div><div class="mt-fl">Responsáveis</div>'+_stRespChips("ti-resps-"+t.id,resps)+'</div>';
      html+='<div class="mst-g2"><div><div class="mt-fl">Status</div><select class="mt-in" id="ti-st-'+t.id+'">'+sOpts+'</select></div><div></div></div>';
      html+='<div class="mst-g2"><div><div class="mt-fl">Início</div><input type="date" class="mt-in" id="ti-di-'+t.id+'" value="'+(t.dataInicio||"")+'"/></div><div><div class="mt-fl">Vencimento</div><input type="date" class="mt-in" id="ti-df-'+t.id+'" value="'+(t.dataFim||"")+'"/></div></div>';
      html+=_buildSubtarefaCamposEdit(t);
      html+='<div class="mst-ed-f"><button class="mt-btn-del" onclick="modalConfirm(\'Excluir esta subtarefa?\',function(){delTarefa(\''+cid+'\',\''+t.id+'\');})">Excluir</button><button class="mt-btn-azul" onclick="saveTarefaInline(\''+cid+'\',\''+t.id+'\')">Salvar</button></div>';
      html+='</div>';
    }
    html+='</div>';
  });
  if(compondo)html+=_stNovaHTML(cid);
  return html;
}
// Caixa de selecao da subtarefa: marca com o status de conclusao (nunca o de cancelada); desmarca para "em andamento"
async function toggleTarefaConcluida(cardId,tarefaId,marcar){
  var sts=statusTarefaList(false);
  var alvo=marcar?sts.find(function(s){return s.finalizador&&!statusTarefaCancelado(s.id);}):(sts.find(function(s){return !s.finalizador&&/andamento/i.test(s.nome||s.id);})||sts.find(function(s){return !s.finalizador;}));
  if(!alvo){toast("Nenhum status disponível",true);refreshTarefasPanel(cardId);return;}
  try{await updateTarefa(cardId,tarefaId,{status:alvo.id});}catch(e){toast("Erro",true);refreshTarefasPanel(cardId);}
}

async function migrarTarefasCardsParaTabela(){
  var cardsComJson=(cards||[]).filter(function(card){return card.id!=="__cols__"&&Array.isArray(card.tarefas)&&card.tarefas.length;});
  if(!cardsComJson.length)return;
  for(var i=0;i<cardsComJson.length;i++){
    var card=cardsComJson[i];
    var existentes={};
    (tarefasDB[card.id]||[]).forEach(function(t){existentes[t.id]=true;});
    for(var j=0;j<card.tarefas.length;j++){
      var t=card.tarefas[j];
      if(t&&t.id&&!existentes[t.id]){
        await dbUpsertTarefa(_taskCardToDb(card.id,t,null));
      }
    }
    delete card.tarefas;
    try{await dbUpsert(card);}catch(_){}
    await loadTarefasDoCard(card.id);
  }
}

// ── MODAL ──
// ── KANBAN ──

// Minhas tarefas e alertas
async function verificarAlertasPrazos(){
  if(!(perfil==="mestre"||perfil==="advogado"))return;
  var sigla=_mtUserSigla();if(!sigla)return;
  var hoje=new Date().toISOString().slice(0,10);
  var amanha=new Date(Date.now()+86400000).toISOString().slice(0,10);
  var existentes={};
  (notificacoesDB||[]).forEach(function(n){if(n&&n.mensagem)existentes[n.mensagem]=true;});
  var novas=[];
  function addAviso(tipo,texto,ctx,prazo){
    var prazoTxt=_mtFmtDate(prazo);
    var msg=(tipo==="atrasada"?"Tarefa atrasada: ":"Tarefa vence em breve: ")+trunc(texto||"Tarefa",70)+" ("+ctx+", prazo "+prazoTxt+")";
    if(!existentes[msg]){existentes[msg]=true;novas.push({usuario_id:userDbId,tipo:tipo==="atrasada"?"tarefa_atrasada":"tarefa_vencendo",mensagem:msg});}
  }
  getFiltered().forEach(function(card){
    getTarefas(card).forEach(function(t){
      if(respsDe(t).indexOf(sigla)<0||_mtIsDone(t)||!t.dataFim)return;
      if(t.dataFim<hoje)addAviso("atrasada",t.texto,card.titulo||"Demanda",t.dataFim);
      else if(t.dataFim===hoje||t.dataFim===amanha)addAviso("vencendo",t.texto,card.titulo||"Demanda",t.dataFim);
    });
  });
  try{
    var eqId=equipeAtiva?equipeAtiva.id:null;
    var reunioes=await dbFetchReunioes(eqId);
    var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
    var tarefas=await dbFetchTodasTarefas();
    tarefas.forEach(function(t){
      if(t.parent_id||!t.reuniao_id||respsDe(t).indexOf(sigla)<0||_mtIsDone(t)||!t.data_fim)return;
      if(eqId&&t.equipe_id&&t.equipe_id!==eqId)return;
      var r=rMap[t.reuniao_id]||null;
      if(!r)return;
      var ctx=r.titulo||("Reuniao de "+_mtFmtDate(r.data));
      if(t.data_fim<hoje)addAviso("atrasada",t.texto,ctx,t.data_fim);
      else if(t.data_fim===hoje||t.data_fim===amanha)addAviso("vencendo",t.texto,ctx,t.data_fim);
    });
  }catch(_){}
  if(!novas.length)return;
  try{
    for(var i=0;i<novas.length;i++)await dbUpsertNotificacao(novas[i]);
    notificacoesDB=await dbFetchNotificacoes();
  }catch(_){}
}

// ── IMPORTAR ──
function _mtUserSigla(){
  var u=(usuariosFullDB||[]).find(function(x){return x.id===userDbId||x.email===emailUser;});
  return u&&u.sigla?u.sigla:"";
}
function _mtStatusLabel(status){
  return statusTarefaLabel(status);
}
function _mtFmtDate(d){
  if(!d)return "—";
  var p=String(d).split("-");
  return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:d;
}
function _mtIsDone(t){
  return statusTarefaFinalizador(t.status);
}
function _mtRow(t){
  var hoje=new Date().toISOString().slice(0,10);
  var late=t.prazo&&t.prazo<hoje&&!_mtIsDone(t);
  var done=_mtIsDone(t);
  var cor=late?"#dc2626":done?"#16a34a":"#2b76e5";
  return '<tr style="border-bottom:1px solid var(--border);">'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text3);white-space:nowrap;"><span style="font-weight:700;color:'+cor+';">'+t.origem+'</span></td>'
    +'<td style="padding:11px 14px;font-size:13px;font-weight:650;color:var(--bt-navy);">'+escHTML(t.texto)+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);">'+t.contexto+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+_mtStatusLabel(t.status)+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:'+(late?"#dc2626":"var(--text2)")+';font-weight:'+(late?"700":"400")+';white-space:nowrap;">'+_mtFmtDate(t.prazo)+'</td>'
    +'<td style="padding:11px 14px;font-size:12px;color:var(--text2);white-space:nowrap;">'+(t.acao||"")+'</td>'
    +'</tr>';
}
async function _mtAbrirReuniao(id){
  await renderReunioes();
  selecionarReuniao(id);
}
async function _mtAbrirProjetos(projetoId){
  _projExpanded[projetoId]=true;
  await renderReunioes();
  if(!reuniaoAtiva&&reunioesDB&&reunioesDB.length)selecionarReuniao(reunioesDB[0].id);
}
function _notifTextoBase(msg){
  msg=msg||"";
  var m=msg.match(/^(?:Nova tarefa de reuniao para voce: |Tarefa atrasada: |Tarefa vence em breve: )(.+?) \(/);
  return m?m[1]:"";
}
async function abrirNotificacao(id){
  var n=(notificacoesDB||[]).find(function(x){return x.id===id;});
  if(!n)return;
  try{await dbMarcarNotificacaoLida(id);}catch(_){}
  notificacoesDB=(notificacoesDB||[]).map(function(x){return x.id===id?Object.assign({},x,{lida:true}):x;});
  var drop=document.getElementById("notif-dropdown");if(drop)drop.remove();
  if(n.tipo==="mencao"){
    var cid=_notifCardId(n.mensagem);
    if(cid&&cards.some(function(c){return c.id===cid;})){if(!document.querySelector("#app.kanban-mode"))renderKanban();openCardModal(cid);}
    else toast("Demanda não encontrada ou sem acesso",true);
    return;
  }
  if(n.tipo==="mencao_tarefa"){await _abrirMencaoTarefa(n.referencia_id);return;}
  var txt=_notifTextoBase(n.mensagem);
  if(txt){
    var cardMatch=null;
    getFiltered().some(function(card){
      var ok=getTarefas(card).some(function(t){return (t.texto||"").indexOf(txt)>=0||txt.indexOf(t.texto||"")>=0;});
      if(ok){cardMatch=card;return true;}
      return false;
    });
    if(cardMatch){openCardModal(cardMatch.id);return;}
    try{
      var eqId=equipeAtiva?equipeAtiva.id:null;
      var reunioes=await dbFetchReunioes(eqId);
      var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
      var tarefas=await dbFetchTodasTarefas();
      var tm=tarefas.find(function(t){return t.reuniao_id&&((t.texto||"").indexOf(txt)>=0||txt.indexOf(t.texto||"")>=0);});
      if(tm&&rMap[tm.reuniao_id]){await _mtAbrirReuniao(tm.reuniao_id);return;}
    }catch(_){}
  }
  renderMinhasTarefas();
}
async function renderMinhasTarefas(){
  if(!(perfil==="mestre"||perfil==="advogado")){renderView();return;}
  var app=document.getElementById("app");app.className="page-mode";
  app.innerHTML=headerHTML("minhas-tarefas")+'<div style="padding:24px;max-width:1200px;margin:0 auto;"><div style="text-align:center;padding:40px;color:var(--text3);">Carregando...</div></div>';
  var sigla=_mtUserSigla();
  var eqId=equipeAtiva?equipeAtiva.id:null;
  var itens=[];
  getFiltered().forEach(function(card){
    getTarefas(card).forEach(function(t){
      if(sigla&&respsDe(t).indexOf(sigla)<0)return;
      itens.push({origem:"Demanda",texto:t.texto||"Subtarefa sem descricao",contexto:card.titulo||"Demanda",status:t.status,prazo:t.dataFim,acao:'<button onclick="openCardModal(\''+card.id+'\')" class="rbtn rbtn-sm">Abrir</button>'});
    });
  });
  try{
    var reunioes=await dbFetchReunioes(eqId);
    var rMap={};reunioes.forEach(function(r){rMap[r.id]=r;});
    var tarefas=await dbFetchTodasTarefas();
    tarefas.filter(function(t){return !t.parent_id&&t.reuniao_id&&(!sigla||respsDe(t).indexOf(sigla)>=0)&&(!eqId||t.equipe_id===eqId);}).forEach(function(t){
      var r=rMap[t.reuniao_id]||null;
      if(!r&&t.reuniao_id)return;
      itens.push({origem:"Reuniao",texto:t.texto||"Tarefa sem titulo",contexto:r?(r.titulo||("Reuniao de "+_mtFmtDate(r.data))):"Sem reuniao",status:t.status,prazo:t.data_fim,acao:r?'<button onclick="_mtAbrirReuniao(\''+r.id+'\')" class="rbtn rbtn-sm">Abrir</button>':""});
    });
  }catch(_){}
  try{
    var projetos=await dbFetchProjetos(eqId);
    for(var pi=0;pi<projetos.length;pi++){
      var p=projetos[pi];
      if(p.arquivado)continue;
      var checklist=await dbFetchChecklist(p.id);
      checklist.filter(function(it){return it.responsavel_id===userDbId;}).forEach(function(it){
        itens.push({origem:"Projeto",texto:it.titulo||"Subtarefa sem titulo",contexto:p.titulo||"Projeto interno",status:it.status,prazo:null,acao:'<button onclick="_mtAbrirProjetos(\''+p.id+'\')" class="rbtn rbtn-sm">Abrir</button>'});
      });
    }
  }catch(_){}
  itens.sort(function(a,b){
    var ad=a.prazo||"9999-12-31",bd=b.prazo||"9999-12-31";
    if(_mtIsDone(a)&&!_mtIsDone(b))return 1;
    if(!_mtIsDone(a)&&_mtIsDone(b))return -1;
    return ad.localeCompare(bd);
  });
  var abertas=itens.filter(function(t){return !_mtIsDone(t);}).length;
  var hoje=new Date().toISOString().slice(0,10);
  var atrasadas=itens.filter(function(t){return t.prazo&&t.prazo<hoje&&!_mtIsDone(t);}).length;
  var origemSel=window._mtOrigem||"";
  var situacaoSel=window._mtSituacao||"";
  var filtrados=itens.filter(function(t){
    if(origemSel&&t.origem!==origemSel)return false;
    if(situacaoSel==="abertas"&&_mtIsDone(t))return false;
    if(situacaoSel==="atrasadas"&&!(t.prazo&&t.prazo<hoje&&!_mtIsDone(t)))return false;
    if(situacaoSel==="concluidas"&&!_mtIsDone(t))return false;
    return true;
  });
  var rows=filtrados.length?filtrados.map(_mtRow).join(""):'<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3);">Nenhuma tarefa neste filtro</td></tr>';
  app.innerHTML=headerHTML("minhas-tarefas")
    +'<div style="padding:24px;max-width:1200px;margin:0 auto;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:16px;flex-wrap:wrap;">'
    +'<div><div style="font-size:18px;font-weight:700;color:var(--bt-navy);font-family:var(--font-titulo);">Minhas tarefas</div><div style="font-size:12px;color:var(--text3);margin-top:3px;">Responsavel: '+(sigla||nomeUser||emailUser)+'</div></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
    +'<span style="font-size:12px;font-weight:700;color:#2b76e5;background:#eff6ff;border-radius:20px;padding:5px 10px;">Abertas: '+abertas+'</span>'
    +'<span style="font-size:12px;font-weight:700;color:#dc2626;background:#fef2f2;border-radius:20px;padding:5px 10px;">Atrasadas: '+atrasadas+'</span>'
    +'<span style="font-size:12px;font-weight:700;color:var(--text2);background:#f8fafc;border-radius:20px;padding:5px 10px;">Total: '+itens.length+'</span>'
    +'</div></div>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 12px;">'
    +'<span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;">Filtros</span>'
    +'<select onchange="window._mtOrigem=this.value;renderMinhasTarefas()" style="font-size:12px;"><option value="">Todas as origens</option><option value="Demanda"'+(origemSel==="Demanda"?' selected':'')+'>Demandas</option><option value="Reuniao"'+(origemSel==="Reuniao"?' selected':'')+'>Reunioes</option><option value="Projeto"'+(origemSel==="Projeto"?' selected':'')+'>Projetos</option></select>'
    +'<select onchange="window._mtSituacao=this.value;renderMinhasTarefas()" style="font-size:12px;"><option value="">Todas as situacoes</option><option value="abertas"'+(situacaoSel==="abertas"?' selected':'')+'>Abertas</option><option value="atrasadas"'+(situacaoSel==="atrasadas"?' selected':'')+'>Atrasadas</option><option value="concluidas"'+(situacaoSel==="concluidas"?' selected':'')+'>Concluidas</option></select>'
    +(origemSel||situacaoSel?'<button onclick="window._mtOrigem=\'\';window._mtSituacao=\'\';renderMinhasTarefas()" class="rbtn rbtn-sm">Limpar</button>':'')
    +'<span style="font-size:12px;color:var(--text3);margin-left:auto;">Mostrando '+filtrados.length+' de '+itens.length+'</span>'
    +'</div>'
    +'<div style="background:#fff;border-radius:14px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-md);"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:860px;"><thead><tr style="background:linear-gradient(135deg,#1a2e3a,#253f4f);">'+['Origem','Tarefa','Contexto','Status','Prazo','Acao'].map(function(h){return '<th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;">'+h+'</th>';}).join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'</div>';
}

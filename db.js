// ── DB ──
async function dbFetch(){var r=await fetch(SB+"/rest/v1/demandas?select=id,data",{headers:H});if(!r.ok)throw new Error();return (await r.json()).map(function(x){return Object.assign({id:x.id},x.data);});}
async function dbUpsert(card){var id=card.id,data=Object.assign({},card);delete data.id;delete data.tarefas;var r=await fetch(SB+"/rest/v1/demandas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify({id,data})});if(!r.ok)throw new Error();}
async function dbDel(id){await fetch(SB+"/rest/v1/demandas?id=eq."+id,{method:"DELETE",headers:H});}
async function dbLog(a,d){await fetch(SB+"/rest/v1/logs",{method:"POST",headers:H,body:JSON.stringify({perfil,acao:a,detalhe:d})});}
async function dbFetchLogs(){var r=await fetch(SB+"/rest/v1/logs?select=*&order=criado_em.desc&limit=100",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbFetchUsers(){var r=await fetch(SB+"/rest/v1/usuarios?select=*&order=nome",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbSaveUser(u){var r=await fetch(SB+"/rest/v1/usuarios",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(u)});if(!r.ok)throw new Error();}
async function dbDelUser(id){await fetch(SB+"/rest/v1/usuarios?id=eq."+id,{method:"DELETE",headers:H});}
async function dbSaveCols(){var data={colunas:COLS};await fetch(SB+"/rest/v1/demandas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify({id:"__cols__",data})});}
async function dbLoadCols(){var r=await fetch(SB+"/rest/v1/demandas?id=eq.__cols__&select=data",{headers:H});if(!r.ok)return;var rows=await r.json();if(rows&&rows[0]&&rows[0].data&&rows[0].data.colunas)COLS=rows[0].data.colunas;}
async function loadResp(){try{var r=await fetch(SB+"/rest/v1/usuarios?ativo=eq.true&select=id,sigla,nome,perfil",{headers:H});if(!r.ok)return;var rows=await r.json();var filtered=rows.filter(function(u){return u.sigla&&(u.perfil==="advogado"||u.perfil==="mestre");});responsaveis=filtered.map(function(u){return u.sigla;});usuariosFullDB=filtered;}catch(e){}}
async function loadClientes(){try{var all=[],from=0,chunk=1000;while(true){var r=await fetch(SB+"/rest/v1/clientes?select=*&order=numero&limit="+chunk+"&offset="+from,{headers:Object.assign({"Range-Unit":"items"},H)});if(!r.ok)break;var rows=await r.json();all=all.concat(rows);if(rows.length<chunk)break;from+=chunk;}clientesDB=all;}catch(e){}}
async function loadCasos(){try{var all=[],from=0,chunk=1000;while(true){var r=await fetch(SB+"/rest/v1/casos?select=*&order=numero&limit="+chunk+"&offset="+from,{headers:Object.assign({"Range-Unit":"items"},H)});if(!r.ok)break;var rows=await r.json();all=all.concat(rows);if(rows.length<chunk)break;from+=chunk;}casosDB=all;}catch(e){}}

// ── TAREFAS DB ──
async function dbFetchTarefas(cardId){
  var url=SB+"/rest/v1/tarefas?card_id=eq."+cardId+"&order=criado_em";
  var r=await fetch(url,{headers:H});if(!r.ok)return [];
  return r.json();
}
async function dbFetchTodasTarefas(){
  var all=[],from=0,chunk=1000;
  while(true){
    var r=await fetch(SB+"/rest/v1/tarefas?select=*&order=criado_em&limit="+chunk+"&offset="+from,{headers:Object.assign({"Range-Unit":"items"},H)});
    if(!r.ok)break;
    var rows=await r.json();all=all.concat(rows);
    if(rows.length<chunk)break;from+=chunk;
  }
  return all;
}
async function dbUpsertTarefa(t){
  var r=await fetch(SB+"/rest/v1/tarefas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(t)});
  if(!r.ok)throw new Error();
}
async function dbDelTarefa(id){
  await fetch(SB+"/rest/v1/tarefas?id=eq."+id,{method:"DELETE",headers:H});
}
async function dbDelTarefasDoCard(cardId){
  await fetch(SB+"/rest/v1/tarefas?card_id=eq."+cardId,{method:"DELETE",headers:H});
}
async function dbFetchTarefasReuniao(reuniaoId){var r=await fetch(SB+"/rest/v1/tarefas?reuniao_id=eq."+reuniaoId+"&parent_id=is.null&order=criado_em",{headers:H});if(!r.ok)return [];return r.json();}
async function dbFetchSubtarefas(parentId){var r=await fetch(SB+"/rest/v1/tarefas?parent_id=eq."+parentId+"&order=criado_em",{headers:H});if(!r.ok)return [];return r.json();}

// ── EQUIPES DB ──
async function dbFetchEquipes(){var r=await fetch(SB+"/rest/v1/equipes?select=*&order=nome",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbUpsertEquipe(e){var r=await fetch(SB+"/rest/v1/equipes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(e)});if(!r.ok)throw new Error();}
async function dbDelEquipe(id){await fetch(SB+"/rest/v1/equipes?id=eq."+id,{method:"DELETE",headers:H});}
async function dbFetchEquipeMembros(equipeId){var r=await fetch(SB+"/rest/v1/equipe_membros?equipe_id=eq."+equipeId+"&select=usuario_id,usuarios(id,nome,sigla,email,perfil)",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbUpsertEquipeMembro(m){var r=await fetch(SB+"/rest/v1/equipe_membros",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(m)});if(!r.ok)throw new Error();}
async function dbDelEquipeMembro(equipeId,userId){await fetch(SB+"/rest/v1/equipe_membros?equipe_id=eq."+equipeId+"&usuario_id=eq."+userId,{method:"DELETE",headers:H});}
async function dbUpsertDemandaEquipe(de){var r=await fetch(SB+"/rest/v1/demanda_equipes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(de)});if(!r.ok)throw new Error();}
async function dbDelDemandaEquipe(demandaId,equipeId){await fetch(SB+"/rest/v1/demanda_equipes?demanda_id=eq."+demandaId+"&equipe_id=eq."+equipeId,{method:"DELETE",headers:H});}
async function loadEquipes(){
  try{
    if(perfil==="mestre"){var r=await fetch(SB+"/rest/v1/equipes?select=*&order=nome",{headers:H});if(!r.ok)return;equipesDB=await r.json();}
    else{var r=await fetch(SB+"/rest/v1/equipe_membros?usuario_id=eq."+userDbId+"&select=equipes(id,nome,cor)",{headers:H});if(!r.ok)return;var rows=await r.json();equipesDB=rows.map(function(x){return x.equipes;}).filter(Boolean);}
  }catch(e){}
}
async function loadDemandaEquipes(){
  try{
    var all=[],from=0,chunk=1000;
    while(true){var r=await fetch(SB+"/rest/v1/demanda_equipes?select=demanda_id,equipe_id&limit="+chunk+"&offset="+from,{headers:Object.assign({"Range-Unit":"items"},H)});if(!r.ok)break;var rows=await r.json();all=all.concat(rows);if(rows.length<chunk)break;from+=chunk;}
    demandaEquipesDB={};
    all.forEach(function(x){if(!demandaEquipesDB[x.demanda_id])demandaEquipesDB[x.demanda_id]=[];demandaEquipesDB[x.demanda_id].push(x.equipe_id);});
  }catch(e){}
}

// ── REUNIOES DB ──
async function dbFetchReunioes(equipeId){
  var q=equipeId?"&equipe_id=eq."+equipeId:"";
  var r=await fetch(SB+"/rest/v1/reunioes?select=*&order=data.desc"+q,{headers:H});
  if(!r.ok)throw new Error();return r.json();
}
async function dbUpsertReuniao(rn){var r=await fetch(SB+"/rest/v1/reunioes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(rn)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbUpsertNotificacao(n){var r=await fetch(SB+"/rest/v1/notificacoes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(n)});if(!r.ok)throw new Error();}
async function criarNotifParaMembros(equipeId,tipo,referencia_id,mensagem){
  try{
    var r=await fetch(SB+"/rest/v1/equipe_membros?equipe_id=eq."+equipeId+"&select=usuario_id",{headers:H});
    if(!r.ok)return;var membros=await r.json();
    await Promise.all(membros.map(function(m){return dbUpsertNotificacao({usuario_id:m.usuario_id,tipo,referencia_id,mensagem});}));
  }catch(_){}
}
async function criarNotifParaParticipantes(reuniaoId,tipo,referencia_id,mensagem){
  try{
    var r=await fetch(SB+"/rest/v1/reuniao_participantes?reuniao_id=eq."+reuniaoId+"&select=usuario_id",{headers:H});
    if(!r.ok)return;var parts=await r.json();
    await Promise.all(parts.map(function(p){return dbUpsertNotificacao({usuario_id:p.usuario_id,tipo,referencia_id,mensagem});}));
  }catch(_){}
}
async function dbDelReuniao(id){await fetch(SB+"/rest/v1/reunioes?id=eq."+id,{method:"DELETE",headers:H});}
async function dbFetchReuniaoParticipantes(reuniaoId){var r=await fetch(SB+"/rest/v1/reuniao_participantes?reuniao_id=eq."+reuniaoId+"&select=usuario_id,usuarios(id,nome,sigla,email)",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertReuniaoParticipante(p){var r=await fetch(SB+"/rest/v1/reuniao_participantes",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(p)});if(!r.ok)throw new Error();}
async function dbDelReuniaoParticipante(reuniaoId,userId){await fetch(SB+"/rest/v1/reuniao_participantes?reuniao_id=eq."+reuniaoId+"&usuario_id=eq."+userId,{method:"DELETE",headers:H});}

// ── PAUTAS DB ──
async function dbFetchPautas(equipeId){
  var q=equipeId?"&equipe_id=eq."+equipeId:"";
  var r=await fetch(SB+"/rest/v1/pautas?select=*&order=titulo"+q,{headers:H});
  if(!r.ok)throw new Error();return r.json();
}
async function dbUpsertPauta(p){var r=await fetch(SB+"/rest/v1/pautas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(p)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelPauta(id){await fetch(SB+"/rest/v1/pautas?id=eq."+id,{method:"DELETE",headers:H});}
async function dbFetchReuniaoPautas(reuniaoId){var r=await fetch(SB+"/rest/v1/reuniao_pautas?reuniao_id=eq."+reuniaoId+"&select=*&order=ordem",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertReuniaoPauta(rp){var r=await fetch(SB+"/rest/v1/reuniao_pautas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(rp)});if(!r.ok)throw new Error();}
async function dbDelReuniaoPauta(id){await fetch(SB+"/rest/v1/reuniao_pautas?id=eq."+id,{method:"DELETE",headers:H});}

// ── PAUTA CATEGORIAS DB ──
async function dbFetchPautaCategorias(equipeId){var q=equipeId?"&equipe_id=eq."+equipeId:"";var r=await fetch(SB+"/rest/v1/pauta_categorias?select=*&order=nome"+q,{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbUpsertPautaCategoria(cat){var r=await fetch(SB+"/rest/v1/pauta_categorias",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(cat)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelPautaCategoria(id){await fetch(SB+"/rest/v1/pauta_categorias?id=eq."+id,{method:"DELETE",headers:H});}

// ── PROJETOS INTERNOS DB ──
async function dbFetchProjetos(equipeId){
  var q=equipeId?"&equipe_id=eq."+equipeId:"";
  var r=await fetch(SB+"/rest/v1/projetos_internos?select=*,usuarios(id,nome,sigla)&order=criado_em.desc"+q,{headers:H});
  if(!r.ok)throw new Error();return r.json();
}
async function dbUpsertProjeto(p){var r=await fetch(SB+"/rest/v1/projetos_internos",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(p)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelProjeto(id){await fetch(SB+"/rest/v1/projetos_internos?id=eq."+id,{method:"DELETE",headers:H});}
async function dbFetchProjetoComentarios(projetoId){var r=await fetch(SB+"/rest/v1/projeto_comentarios?projeto_id=eq."+projetoId+"&select=*,usuarios(id,nome,sigla)&order=criado_em",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertProjetoComentario(c){var r=await fetch(SB+"/rest/v1/projeto_comentarios",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(c)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelProjetoComentario(id){await fetch(SB+"/rest/v1/projeto_comentarios?id=eq."+id,{method:"DELETE",headers:H});}
async function dbFetchChecklist(projetoId){var r=await fetch(SB+"/rest/v1/checklist_projeto?projeto_id=eq."+projetoId+"&select=*,usuarios(id,nome,sigla)&order=ordem",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertChecklistItem(item){var r=await fetch(SB+"/rest/v1/checklist_projeto",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(item)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelChecklistItem(id){await fetch(SB+"/rest/v1/checklist_projeto?id=eq."+id,{method:"DELETE",headers:H});}
// ── REUNIAO COMENTARIOS DB ──
async function dbFetchReuniaoComentarios(reuniaoId){var r=await fetch(SB+"/rest/v1/reuniao_comentarios?reuniao_id=eq."+reuniaoId+"&select=*,usuarios(id,nome,sigla)&order=criado_em",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertReuniaoComentario(c){var r=await fetch(SB+"/rest/v1/reuniao_comentarios",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(c)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelReuniaoComentario(id){await fetch(SB+"/rest/v1/reuniao_comentarios?id=eq."+id,{method:"DELETE",headers:H});}

// ── TAREFA COMENTARIOS DB ──
async function dbFetchTarefaComentarios(tarefaId){var r=await fetch(SB+"/rest/v1/tarefa_comentarios?tarefa_id=eq."+tarefaId+"&select=*,usuarios(id,nome,sigla)&order=criado_em",{headers:H});if(!r.ok)return [];return r.json();}
async function dbUpsertTarefaComentario(c){var r=await fetch(SB+"/rest/v1/tarefa_comentarios",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates,return=representation"},H),body:JSON.stringify(c)});if(!r.ok)throw new Error();var rows=await r.json();return rows[0]||null;}
async function dbDelTarefaComentario(id){await fetch(SB+"/rest/v1/tarefa_comentarios?id=eq."+id,{method:"DELETE",headers:H});}

// ── NOTIFICACOES DB ──
async function dbFetchNotificacoes(){var r=await fetch(SB+"/rest/v1/notificacoes?usuario_id=eq."+userDbId+"&order=criado_em.desc&limit=50",{headers:H});if(!r.ok)return [];return r.json();}
async function dbMarcarNotificacaoLida(id){await fetch(SB+"/rest/v1/notificacoes?id=eq."+id,{method:"PATCH",headers:H,body:JSON.stringify({lida:true})});}
async function dbMarcarTodasLidas(){await fetch(SB+"/rest/v1/notificacoes?usuario_id=eq."+userDbId+"&lida=eq.false",{method:"PATCH",headers:H,body:JSON.stringify({lida:true})});}
async function loadNotificacoes(){try{notificacoesDB=await dbFetchNotificacoes();}catch(e){notificacoesDB=[];}}

// ── EMAIL LOGS ──
async function dbFetchEmailLogs(){var r=await fetch(SB+"/rest/v1/email_logs?select=*&order=criado_em.desc&limit=100",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbFetchNotifConfig(){var r=await fetch(SB+"/rest/v1/notif_config?select=*&order=tipo",{headers:H});if(!r.ok)throw new Error();return r.json();}
async function dbUpsertNotifConfig(c){var r=await fetch(SB+"/rest/v1/notif_config",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify(c)});if(!r.ok)throw new Error();}
async function enviarEmail(opts){
  var r=await fetch(SB+"/functions/v1/enviar-email",{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+SK},
    body:JSON.stringify(Object.assign({criado_por:userDbId},opts))
  });
  if(!r.ok){var t=await r.text();throw new Error(t);}
  return r.json();
}
async function dbReenviarEmail(logId){
  var r=await fetch(SB+"/rest/v1/email_logs?id=eq."+logId+"&select=*",{headers:H});
  if(!r.ok)throw new Error();
  var rows=await r.json();if(!rows.length)throw new Error();
  var log=rows[0];
  return enviarEmail({destinatarios:log.destinatarios,assunto:log.assunto,corpo_html:log.corpo_html,tipo:log.tipo,referencia_id:log.referencia_id});
}

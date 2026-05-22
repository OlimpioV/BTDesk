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
async function loadResp(){try{var r=await fetch(SB+"/rest/v1/usuarios?ativo=eq.true&select=sigla,nome,perfil",{headers:H});if(!r.ok)return;var rows=await r.json();responsaveis=rows.filter(function(u){return u.sigla&&(u.perfil==="advogado"||u.perfil==="mestre");}).map(function(u){return u.sigla;});}catch(e){}}
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

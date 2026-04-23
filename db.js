// ── DB ──
async function dbFetch(){var r=await fetch(SB+"/rest/v1/demandas?select=id,data",{headers:H});if(!r.ok)throw new Error();return (await r.json()).map(function(x){return Object.assign({id:x.id},x.data);});}
async function dbUpsert(card){var id=card.id,data=Object.assign({},card);delete data.id;var r=await fetch(SB+"/rest/v1/demandas",{method:"POST",headers:Object.assign({"Prefer":"resolution=merge-duplicates"},H),body:JSON.stringify({id,data})});if(!r.ok)throw new Error();}
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


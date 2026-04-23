const SB="https://ubgazsabtzdutgibrxbs.supabase.co";
const SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZ2F6c2FidHpkdXRnaWJyeGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjMxMDUsImV4cCI6MjA5MDczOTEwNX0.0O7vDwiL7uxr5uVSa9yGkx9bULtmkdV6p3CXbPFt7eI";
const H={"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+SK};

const COL_COLORS=[
  {dot:"#3b82f6",cover:"#bfdbfe"},{dot:"#f59e0b",cover:"#fde68a"},
  {dot:"#22c55e",cover:"#bbf7d0"},{dot:"#a855f7",cover:"#e9d5ff"},
  {dot:"#ec4899",cover:"#fbcfe8"},{dot:"#ef4444",cover:"#fecaca"},
  {dot:"#14b8a6",cover:"#99f6e4"},{dot:"#f97316",cover:"#fed7aa"},
  {dot:"#6366f1",cover:"#c7d2fe"},{dot:"#84cc16",cover:"#d9f99d"},
];
const COLS_DEFAULT=[
  {id:"aberto",    label:"Não iniciado",dot:"#3b82f6",cover:"#bfdbfe",badgeBg:"#dbeafe",badgeText:"#1d4ed8",ordem:0},
  {id:"andamento", label:"Em andamento",dot:"#f59e0b",cover:"#fde68a",badgeBg:"#fef3c7",badgeText:"#b45309",ordem:1},
  {id:"pausado",   label:"Pausado",     dot:"#a855f7",cover:"#e9d5ff",badgeBg:"#f3e8ff",badgeText:"#7e22ce",ordem:2},
  {id:"concluido", label:"Concluído",   dot:"#22c55e",cover:"#bbf7d0",badgeBg:"#dcfce7",badgeText:"#15803d",ordem:3},
];
let COLS=[...COLS_DEFAULT];

const EK="bari_etiquetas_v1";
const TC_DEF={
  Assembleia:{bg:"#EEEDFE",border:"#534AB7",text:"#3C3489",cover:"#c4b5fd"},
  Aditamentos:{bg:"#FAEEDA",border:"#BA7517",text:"#633806",cover:"#fcd34d"},
  Oferta:     {bg:"#E1F5EE",border:"#0F6E56",text:"#085041",cover:"#6ee7b7"},
  Interno:    {bg:"#FAECE7",border:"#993C1D",text:"#712B13",cover:"#fca5a5"},
};
const PALETA=[
  {bg:"#EEEDFE",border:"#534AB7",text:"#3C3489",cover:"#c4b5fd"},
  {bg:"#FAEEDA",border:"#BA7517",text:"#633806",cover:"#fcd34d"},
  {bg:"#E1F5EE",border:"#0F6E56",text:"#085041",cover:"#6ee7b7"},
  {bg:"#FAECE7",border:"#993C1D",text:"#712B13",cover:"#fca5a5"},
  {bg:"#E6F1FB",border:"#185FA5",text:"#0C447C",cover:"#93c5fd"},
  {bg:"#FEF9C3",border:"#A16207",text:"#713F12",cover:"#fde68a"},
  {bg:"#FCE7F3",border:"#9D174D",text:"#831843",cover:"#f9a8d4"},
  {bg:"#ECFDF5",border:"#065F46",text:"#064E3B",cover:"#6ee7b7"},
];

let cards=[],perfil=null,nomeUser=null,emailUser=null,userDbId=null;
let filterResp="",filterTipo="",filterStatus="",filterCliente="",filterCaso="";
let viewMode="kanban";
let dragCardId=null,_dOvColId=null,_dOvIdx=null;
let dragColId=null;
let editingId=null,formTipos=[];
let TC=Object.assign({},TC_DEF),TIPOS=Object.keys(TC);
let corSel=0,editingEtq=null;
let modalCardId=null,editingCmtId=null;
let responsaveis=[],clientesDB=[],casosDB=[];
let labelsGlobalExp=false,labelsExp={};
let cpOpen=null;
let _ef=null,_ecid=null;
let _acMatches=[],_acI=-1;

function trunc(s,n){return s&&s.length>n?s.substring(0,n)+"...":s||"";}
function escQ(s){return (s||"").replace(/'/g,"\\'");}
function numFromStr(s){var m=(s||"").match(/^(\d+)/);return m?parseInt(m[1]):null;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function loadEtq(){try{var s=localStorage.getItem(EK);if(s){Object.assign(TC,JSON.parse(s));TIPOS=Object.keys(TC);}}catch(e){}}
function saveEtq(){var ex={};Object.keys(TC).forEach(function(k){if(!TC_DEF[k])ex[k]=TC[k];});localStorage.setItem(EK,JSON.stringify(ex));}
function toast(msg,err){var el=document.getElementById("toast");el.textContent=msg;el.style.background=err?"#dc2626":"#253f4f";el.style.color="#fff";el.classList.add("show");setTimeout(function(){el.classList.remove("show");},3000);}
function _mcClose(){document.getElementById("modal-container").innerHTML="";}
function modalConfirm(msg,onOk){var mc=document.getElementById("modal-container");mc.innerHTML="";var ov=document.createElement("div");ov.className="modal-overlay";ov.style.alignItems="center";ov.onclick=function(e){if(e.target===ov)_mcClose();};var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,400px);padding:24px 28px;";box.onclick=function(e){e.stopPropagation();};var txt=document.createElement("div");txt.style.cssText="font-size:15px;font-weight:600;color:var(--bt-navy);margin-bottom:18px;";txt.textContent=msg;var row=document.createElement("div");row.style.cssText="display:flex;gap:8px;justify-content:flex-end;";var btnCancel=document.createElement("button");btnCancel.className="btn";btnCancel.textContent="Cancelar";btnCancel.onclick=_mcClose;var btnOk=document.createElement("button");btnOk.className="btn btn-danger";btnOk.textContent="Excluir";btnOk.onclick=function(){_mcClose();onOk();};row.appendChild(btnCancel);row.appendChild(btnOk);box.appendChild(txt);box.appendChild(row);ov.appendChild(box);mc.appendChild(ov);}
function modalInput(title,placeholder,onOk){var mc=document.getElementById("modal-container");mc.innerHTML="";var ov=document.createElement("div");ov.className="modal-overlay";ov.style.alignItems="center";ov.onclick=function(e){if(e.target===ov)_mcClose();};var box=document.createElement("div");box.className="modal-box";box.style.cssText="width:min(95vw,400px);padding:24px 28px;";box.onclick=function(e){e.stopPropagation();};var ttl=document.createElement("div");ttl.style.cssText="font-size:15px;font-weight:600;color:var(--bt-navy);margin-bottom:14px;";ttl.textContent=title;var field=document.createElement("div");field.className="field";var inp=document.createElement("input");inp.id="modal-input-val";inp.placeholder=placeholder;field.appendChild(inp);var row=document.createElement("div");row.style.cssText="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;";var btnCancel=document.createElement("button");btnCancel.className="btn";btnCancel.textContent="Cancelar";btnCancel.onclick=_mcClose;var btnOk=document.createElement("button");btnOk.className="btn btn-primary";btnOk.textContent="Confirmar";function doOk(){var v=inp.value.trim();if(!v){inp.focus();return;}_mcClose();onOk(v);}btnOk.onclick=doOk;inp.onkeydown=function(e){if(e.key==="Enter")doOk();if(e.key==="Escape")_mcClose();};row.appendChild(btnCancel);row.appendChild(btnOk);box.appendChild(ttl);box.appendChild(field);box.appendChild(row);ov.appendChild(box);mc.appendChild(ov);setTimeout(function(){inp.focus();},50);}


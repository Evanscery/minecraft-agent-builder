const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9346;
const PROFILE = path.join(require('os').tmpdir(), 'edge-mcab-profile2');
const SHOT = __dirname;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function getJson(url){ return new Promise((res,rej)=>{ http.get(url,(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej); }); }
async function waitForDebugger(maxMs=30000){ const start=Date.now(); while(Date.now()-start<maxMs){ try{const t=await getJson(`http://127.0.0.1:${PORT}/json`); if(Array.isArray(t)&&t.length) return t;}catch(e){} await sleep(400);} throw new Error('no debugger'); }

class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.logs=[];this.errors=[];this.netFails=[];this.netReqs=[];
    ws.onmessage=(ev)=>{ let msg; try{msg=JSON.parse(typeof ev.data==='string'?ev.data:ev.data.toString());}catch(e){return;}
      if(msg.id && this.pending.has(msg.id)){ const {resolve,reject}=this.pending.get(msg.id); this.pending.delete(msg.id); if(msg.error) reject(new Error(msg.error.message)); else resolve(msg); return; }
      if(msg.method==='Runtime.consoleAPICalled' && msg.params){ const a=(msg.params.args||[]).map(x=>{try{return typeof x.value!=='undefined'?JSON.stringify(x.value):x.description;}catch(e){return '';}}).join(' '); this.logs.push(`[${msg.params.type}] ${a}`); }
      if(msg.method==='Runtime.exceptionThrown' && msg.params){ const d=msg.params.exceptionDetails; this.errors.push((d.text||'')+(d.exception?(' :: '+(d.exception.description||d.exception.value||'')):'')); }
      if(msg.method==='Log.entryAdded' && msg.params && msg.params.entry){ this.logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text}`); }
      if(msg.method==='Network.loadingFailed' && msg.params){ this.netFails.push({url:msg.params.requestId, blocked:msg.params.blockedReason, err:msg.params.errorText, cors:msg.params.corsErrorStatus}); }
      if(msg.method==='Network.requestWillBeSent' && msg.params){ this.netReqs.push({url:msg.params.request.url,type:msg.params.type}); }
    };
  }
  send(method,params={}){ const id=++this.id; return new Promise((res,rej)=>{ this.pending.set(id,{resolve:res,reject:rej}); this.ws.send(JSON.stringify({id,method,params})); setTimeout(()=>{ if(this.pending.has(id)){ this.pending.delete(id); rej(new Error('timeout '+method)); } }, 60000); }); }
  async eval(expr,awaitPromise=true){ const r=await this.send('Runtime.evaluate',{expression:expr,awaitPromise,returnByReturn:true}); return r; }
  async evalV(expr,awaitPromise=true){ const r=await this.send('Runtime.evaluate',{expression:expr,awaitPromise,returnByValue:true}); if(r.result.exceptionDetails){ const d=r.result.exceptionDetails; return {__evalError:(d.exception&&d.exception.description)||d.text}; } return r.result.value; }
}

(async()=>{
  const report={flows:{}};
  const child=spawn(EDGE,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+PORT,'--user-data-dir='+PROFILE,'--window-size=1280,820','--hide-scrollbars','about:blank'],{stdio:'ignore'}); child.unref();
  process.on('exit',()=>{ try{child.kill('SIGKILL');}catch(e){} });
  try{
    const tabs=await waitForDebugger();
    const target=tabs.find(t=>t.type==='page')||tabs[0];
    const ws=new global.WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res,rej)=>{ ws.onopen=()=>res(); ws.onerror=(e)=>rej(new Error('ws '+((e&&e.message)||''))); });
    const cdp=new CDP(ws);
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Log.enable'); await cdp.send('Network.enable');

    const ev=(e)=>cdp.evalV(e);
    const shot=async(name)=>{ try{ const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:75}); const data=(r.result&&r.result.data)||(r.data); if(data){ fs.writeFileSync(path.join(SHOT,name),Buffer.from(data,'base64')); return 'ok'; } return 'no-data'; }catch(e){ return 'err:'+e.message; } };

    await cdp.send('Page.navigate',{url:'http://127.0.0.1:5173'});
    // wait for network idle-ish
    await sleep(5000);

    const f1={};
    f1.url=await ev('location.href');
    f1.title=await ev('document.title');
    f1.rootInnerLen=await ev('document.getElementById("root")? document.getElementById("root").innerHTML.length : -1');
    f1.rootChildCount=await ev('document.getElementById("root")? document.getElementById("root").childElementCount : -1');
    f1.bodyText=String(await ev('document.body.innerText')||'').slice(0,2000);
    f1.bodyHTMLlen=await ev('document.body.innerHTML.length');
    f1.outerHead=String(await ev('document.head.outerHTML')||'').slice(0,500);
    f1.headings=await ev("Array.from(document.querySelectorAll('h1,h2,h3,h4,[role=heading]')).map(h=>h.tagName+': '+h.innerText.trim()).filter(Boolean)");
    f1.allButtons=await ev("Array.from(document.querySelectorAll('button')).map(b=>({t:(b.innerText||'').trim().slice(0,40),aria:b.getAttribute('aria-label'),title:b.title,vis:!!(b.offsetParent||b.getClientRects().length),disabled:b.disabled,cls:(b.className||'').slice(0,50)}))");
    f1.allInputs=await ev("Array.from(document.querySelectorAll('input,select,textarea,label,[role=button],[role=switch],[role=checkbox]')).map(i=>({tag:i.tagName,type:i.type,ph:i.placeholder,name:i.name,id:i.id,txt:(i.innerText||'').trim().slice(0,30),forAttr:i.htmlFor,val:(i.value||'').slice(0,30),vis:!!(i.offsetParent||i.getClientRects().length)}))");
    f1.links=await ev("Array.from(document.querySelectorAll('a')).map(a=>({t:a.innerText.trim().slice(0,30),h:a.getAttribute('href')}))");
    f1.canvas=await ev("document.querySelectorAll('canvas').length");
    f1.svgs=await ev("document.querySelectorAll('svg').length");
    f1.tabs=await ev("Array.from(document.querySelectorAll('[role=tab]')).map(t=>({t:t.innerText.trim(),sel:t.getAttribute('aria-selected')}))");
    f1.tooltips=await ev("Array.from(document.querySelectorAll('[title],[aria-label]')).filter(e=>e.offsetParent).slice(0,40).map(e=>({tag:e.tagName,title:e.title,aria:e.getAttribute('aria-label'),txt:(e.innerText||'').trim().slice(0,30)}))");
    f1.netFails=cdp.netFails.slice(0,20);
    f1.netReqs=cdp.netReqs.slice(0,40).map(r=>r.url);
    f1.logs={logs:cdp.logs.slice(),errors:cdp.errors.slice()};
    f1.shot=await shot('s1_landing.jpg');
    report.flows.flow1=f1;
    fs.writeFileSync(path.join(__dirname,'report.json'), JSON.stringify(report,null,2));
    console.log('PHASE1 OK; rootInnerLen='+f1.rootInnerLen+' buttons='+((f1.allButtons||[]).length)+' inputs='+((f1.allInputs||[]).length)+' netFails='+f1.netFails.length);
  } finally { try{ child.kill('SIGKILL'); }catch(e){} }
})().catch(e=>{ console.error('FATAL',e); try{fs.writeFileSync(path.join(__dirname,'fatal.txt'),String(e&&e.stack||e));}catch(_){} try{spawn('taskkill',['/F','/IM','msedge.exe']);}catch(_){} process.exit(1); });
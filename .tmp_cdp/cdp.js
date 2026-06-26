// Minimal Chrome DevTools Protocol driver for Edge.
// Launches Edge headless with --remote-debugging-port, connects over CDP,
// exposes eval(pageExpr) and clickViaJS, and captures console + errors.

const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('') === undefined ? global.WebSocket : global.WebSocket;

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333;
const USER_DATA = 'C:\\Users\\Evanscery\\AppData\\Local\\Temp\\edge-cdp-profile';

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function getJson(url){
  return new Promise((resolve,reject)=>{
    http.get(url,(res)=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d)));
    }).on('error',reject);
  });
}

async function waitForDebugger(maxMs=30000){
  const start=Date.now();
  while(Date.now()-start<maxMs){
    try{
      const tabs=await getJson(`http://127.0.0.1:${PORT}/json`);
      if(Array.isArray(tabs) && tabs.length) return tabs;
    }catch(e){}
    await sleep(400);
  }
  throw new Error('Edge debugger never came up');
}

class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.logs=[];this.errors=[];this.wsClosed=false;
    ws.on('message',(data)=>{
      let msg; try{msg=JSON.parse(data.toString());}catch(e){return;}
      if(msg.id && this.pending.has(msg.id)){
        const {resolve}=this.pending.get(msg.id); this.pending.delete(msg.id); resolve(msg);
      }
      if(msg.method==='Runtime.consoleAPICalled' && msg.params){
        const a=msg.params.args.map(x=>x.value ?? x.description ?? x.unserializableValue ?? '').join(' ');
        this.logs.push(`[${msg.params.type}] ${a}`);
      }
      if(msg.method==='Runtime.exceptionThrown' && msg.params){
        this.errors.push(msg.params.exceptionDetails.text + (msg.params.exceptionDetails.exception?( ' :: '+ (msg.params.exceptionDetails.exception.description||'') ):''));
      }
      if(msg.method==='Log.entryAdded' && msg.params && msg.params.entry){
        this.logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text}`);
      }
    });
    ws.on('close',()=>{this.wsClosed=true;});
  }
  async send(method,params={}){
    if(this.wsClosed) throw new Error('ws closed');
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
      setTimeout(()=>{ if(this.pending.has(id)){ this.pending.delete(id); reject(new Error('timeout:'+method)); } },60000);
    });
  }
  async eval(expr,awaitPromise=true){
    const r=await this.send('Runtime.evaluate',{expression:expr,awaitPromise,returnByValue:true});
    if(r.result && r.result.exceptionDetails){
      return {__error:r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text};
    }
    return r.result ? r.result.value : undefined;
  }
}

(async ()=>{
  // Launch edge
  const args=[
    '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--remote-debugging-port='+PORT, '--user-data-dir='+USER_DATA,
    '--window-size=1280,800','--hide-scrollbars',
    'about:blank'
  ];
  const child=spawn(EDGE,args,{stdio:'ignore'});
  child.unref();

  process.on('exit',()=>{ try{child.kill('SIGKILL');}catch(e){} });

  const tabs=await waitForDebugger();
  let target=tabs.find(t=>t.type==='page') || tabs[0];

  // Navigate the page tab
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ ws.on('open',res); ws.on('error',rej); });

  const cdp=new CDP(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable',{maxResourceBufferSize:64*1024*1024,maxTotalBufferSize:128*1024*1024});

  // Expose cdp globally for the caller
  process.stdout.write('READY\n');
  process.stderr.write('READY\n');

  // Keep alive, respond to commands on stdin as JSON {op, ...}
  let buf='';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',async (chunk)=>{
    buf+=chunk;
    let idx;
    while((idx=buf.indexOf('\n'))>=0){
      const line=buf.slice(0,idx); buf=buf.slice(idx+1);
      if(!line.trim()) continue;
      let req; try{req=JSON.parse(line);}catch(e){ process.stdout.write(JSON.stringify({__error:'bad json:'+e.message})+'\n'); continue; }
      try{
        if(req.op==='navigate'){
          await cdp.send('Page.navigate',{url:req.url});
          // wait for load
          await sleep(req.waitMs||2500);
          process.stdout.write(JSON.stringify({ok:true})+'\n'); process.stdout.write('ENDCMD\n');
        } else if(req.op==='eval'){
          const v=await cdp.eval(req.expr, req.await!==false);
          process.stdout.write(JSON.stringify(v)+'\n'); process.stdout.write('ENDCMD\n');
        } else if(req.op==='html'){
          const v=await cdp.eval('document.documentElement.outerHTML.length>4000? "LEN:"+document.documentElement.outerHTML.length : document.documentElement.outerHTML', false);
          process.stdout.write(JSON.stringify(v)+'\n'); process.stdout.write('ENDCMD\n');
        } else if(req.op==='shot'){
          const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:70});
          require('fs').writeFileSync(req.path,Buffer.from(r.data,'base64'));
          process.stdout.write(JSON.stringify({ok:true})+'\n'); process.stdout.write('ENDCMD\n');
        } else if(req.op==='logs'){
          process.stdout.write(JSON.stringify({logs:cdp.logs.slice(),errors:cdp.errors.slice()})+'\n'); process.stdout.write('ENDCMD\n');
        } else if(req.op==='quit'){
          try{child.kill('SIGKILL');}catch(e){}
          process.exit(0);
        } else {
          process.stdout.write(JSON.stringify({__error:'unknown op '+req.op})+'\n'); process.stdout.write('ENDCMD\n');
        }
      }catch(e){
        process.stdout.write(JSON.stringify({__error:String(e&&e.message||e)})+'\n'); process.stdout.write('ENDCMD\n');
      }
    }
  });
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
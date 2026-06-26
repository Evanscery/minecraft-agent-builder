// Helper to send CDP commands to the driver process and read responses.
const { spawn } = require('child_process');
const path = require('path');

const driver = spawn('node', [path.join(__dirname, 'cdp.js')], { stdio:['pipe','pipe','pipe'] });
driver.stdout.setEncoding('utf8');
driver.stderr.setEncoding('utf8');
let pendingResolve=null; let buf='';
driver.stdout.on('data',(d)=>{
  buf+=d;
  let idx;
  while((idx=buf.indexOf('ENDCMD\n'))>=0){
    const line=buf.slice(0,idx); buf=buf.slice(idx+'ENDCMD\n'.length);
    if(line.trim()==='READY'){ return; }
    if(pendingResolve){ const r=pendingResolve; pendingResolve=null; try{ r.resolve(JSON.parse(line)); }catch(e){ r.resolve({__parseError:line}); } }
  }
  // ignore READY lines embedded
});
driver.stderr.on('data',(d)=>{ process.stderr.write('[drverr] '+d); });
driver.on('exit',(c)=>{ process.stderr.write('driver exited '+c+'\n'); });

function send(req){
  return new Promise((resolve,reject)=>{
    pendingResolve={resolve,reject};
    driver.stdin.write(JSON.stringify(req)+'\n');
    setTimeout(()=>{ if(pendingResolve){ pendingResolve=null; reject(new Error('timeout '+req.op)); } }, 90000);
  });
}

(async()=>{
  // Wait for READY
  await new Promise((res)=>{ const iv=setInterval(()=>{ if(pendingResolve===null && true){ } }, 50); setTimeout(()=>{ clearInterval(iv); res(); }, 1500); });

  const args=process.argv.slice(2);
  const out={};
  out.nav1 = await send({op:'navigate', url:'http://127.0.0.1:5173', waitMs:4000});

  // Helper eval
  const ev=(e)=>send({op:'eval', expr:e});

  // ---- FLOW 1: What loads? ----
  out.flow1_title = await ev('document.title');
  out.flow1_bodyText = await ev('document.body.innerText.slice(0,1500)');
  out.flow1_buttons = await ev("Array.from(document.querySelectorAll('button')).map(b=>({t:b.innerText.trim(),aria:b.getAttribute('aria-label'),title:b.title,cls:b.className.slice(0,40),vis:!!b.offsetParent})).filter(b=>b.t||b.aria||b.title)");
  out.flow1_inputs = await ev("Array.from(document.querySelectorAll('input,select,textarea')).map(i=>({type:i.type,ph:i.placeholder,name:i.name,val:i.value,vis:!!i.offsetParent}))");
  out.flow1_h = await ev("Array.from(document.querySelectorAll('h1,h2,h3,[role=heading]')).map(h=>h.innerText.trim()).filter(Boolean)");
  out.flow1_canvas = await ev("document.querySelectorAll('canvas').length");

  // screenshot
  await send({op:'shot', path: path.join(__dirname,'s1.jpg')});
  out.logs1 = await send({op:'logs'});

  if(args[0]==='stop'){ await send({op:'quit'}); return; }

  // Save and exit
  const fs=require('fs');
  fs.writeFileSync(path.join(__dirname,'report1.json'), JSON.stringify(out,null,2));
  await send({op:'quit'});
  console.log('done phase1');
})().catch(async e=>{ try{await send({op:'quit'});}catch(_){}; console.error('PHASE ERR',e); process.exit(1); });
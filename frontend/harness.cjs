const { chromium } = require('playwright-core');
const fs = require('fs');

const EXEC = 'C:/Users/EVANSC~1/AppData/Local/ms-playwright/chromium-1140/chrome-win/chrome.exe';
const URL = 'http://127.0.0.1:5173';
const OUT = 'D:/Coding/Coding Library/mcAgentBuilder/uishots';
fs.mkdirSync(OUT, { recursive: true });

const log = [];
const errors = [];

(async () => {
  const browser = await chromium.launch({
    executablePath: EXEC,
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,900']
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { log.push(`[${m.type()}] ${m.text()}`); if (m.type()==='error') errors.push(m.text()); });
  page.on('pageerror', e => { errors.push('PAGEERROR: ' + e.message); log.push('PAGEERROR: ' + e.message); });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => log.push('GOTO ERR '+e.message));
  await page.waitForTimeout(2500);

  // Dump the full rendered DOM text + interactive elements
  const snapshot = await page.evaluate(() => {
    function describe(el) {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName, id: el.id||undefined, cls: el.className && el.className.toString ? el.className.toString().slice(0,80) : undefined,
        text: (el.innerText||'').slice(0,40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        vis: r.width>0 && r.height>0
      };
    }
    const buttons = [...document.querySelectorAll('button')].map(describe);
    const links = [...document.querySelectorAll('a')].map(describe);
    const inputs = [...document.querySelectorAll('input,select,textarea')].map(describe);
    const bodyText = document.body.innerText.slice(0, 3000);
    const canvas = [...document.querySelectorAll('canvas')].map(describe);
    const panels = [...document.querySelectorAll('[class*=anel],[class*=idebar],[role=region]')].map(describe).slice(0,20);
    return { buttons, links, inputs, bodyText, canvas, panels };
  });
  fs.writeFileSync(OUT+'/snapshot.json', JSON.stringify(snapshot, null, 2));
  await page.screenshot({ path: OUT+'/01-initial.png' });
  console.log('=== BODY TEXT ===\n'+snapshot.bodyText);
  console.log('=== BUTTONS ('+snapshot.buttons.length+') ===');
  snapshot.buttons.forEach(b=>console.log(`  [${b.x},${b.y} ${b.w}x${b.h}] ${b.tag}#${b.id||''} .${(b.cls||'').slice(0,50)} :: "${b.text}"`));
  console.log('=== CANVAS ==='); snapshot.canvas.forEach(c=>console.log('  '+JSON.stringify(c)));
  console.log('=== INPUTS ('+snapshot.inputs.length+') ==='); snapshot.inputs.forEach(b=>console.log(`  ${b.tag} .${(b.cls||'').slice(0,40)} :: "${b.text}"`));
  console.log('=== CONSOLE ERRORS ==='); errors.slice(0,20).forEach(e=>console.log('  '+e));

  await browser.close();
})().catch(e => { console.error('HARNESS FAIL:', e.message); process.exit(1); });

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('tesla-motion/dist');
const out=path.resolve('tesla-qa');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp4':'video/mp4','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const stat=fs.statSync(file);const range=req.headers.range;const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};if(range){const [a,b]=range.replace('bytes=','').split('-');const start=Number(a),end=b?Number(b):stat.size-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
console.log('Preview: http://127.0.0.1:4173');
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-first-run','--no-default-browser-check','--remote-debugging-port=9227','--user-data-dir='+path.join(out,'chrome-profile'),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  let tab;for(let i=0;i<40;i++){try{tab=await(await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();break;}catch{await sleep(250);}}
  if(!tab)throw Error('Chrome debugging unavailable');
  socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let seq=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const assert=(value,message)=>{if(!value)throw Error(message);console.log('PASS '+message);};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await sleep(2500);
  for(let i=0;i<80;i++){if(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"))break;await sleep(300);}
  assert(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"),'3D film loads');
  await evaluate("document.documentElement.style.scrollBehavior='auto'");
  assert(await evaluate("document.querySelector('.hero').classList.contains('is-complete')"),'Final hero works with reduced motion');
  const hero=await evaluate("({left:document.querySelector('.hero-end-copy').getBoundingClientRect().left,align:getComputedStyle(document.querySelector('.hero-end-copy')).textAlign,bg:getComputedStyle(document.body).backgroundColor})");
  assert(hero.left<1440*.12&&hero.align==='left','Hero text sits on the side');
  assert(hero.bg==='rgb(9, 12, 16)','Website uses the dark background');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-hero-desktop.png'),Buffer.from(r.data,'base64')));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate("document.documentElement.style.scrollBehavior='auto';document.querySelector('#collection').scrollIntoView({behavior:'instant'})");await sleep(900);
  assert(await evaluate("document.querySelectorAll('[data-model]').length===6&&document.querySelectorAll('.vehicle-card').length===6"),'Expanded catalog contains six vehicles');
  await evaluate("document.querySelector('#compare-models').click()");
  assert(await evaluate("document.querySelector('dialog').open&&document.querySelectorAll('.compare-table tbody tr').length===6"),'Vehicle comparison opens with six models');
  await evaluate("document.querySelector('[data-compare-select=\"R\"]').click()");
  for(let i=0;i<20;i++){if(await evaluate("document.querySelector('#model-name').textContent==='Roadster'"))break;await sleep(200);}
  assert(await evaluate("document.querySelector('#model-name').textContent==='Roadster'&&!document.querySelector('dialog').open"),'Comparison selects Roadster in the catalog');
  await evaluate("document.querySelector('#vehicle-panel').scrollIntoView({behavior:'instant',block:'center'})");await sleep(900);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-collection-desktop.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('#roadster').scrollIntoView({behavior:'instant'})");await sleep(1000);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-roadster-desktop.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('#products').scrollIntoView({behavior:'instant'})");await sleep(1000);
  assert(await evaluate("document.querySelectorAll('.product-card').length===6"),'Energy catalog contains six products');
  await evaluate("document.querySelector('[data-filter=\"charging\"]').click()");
  assert(await evaluate("document.querySelectorAll('.product-card:not([hidden])').length===3&&document.querySelector('#product-count').textContent==='3 products'"),'Charging filter shows the correct products');
  await evaluate("document.querySelector('[data-filter=\"energy\"]').click()");
  assert(await evaluate("document.querySelectorAll('.product-card:not([hidden])').length===3"),'Energy filter shows the correct products');
  await evaluate("document.querySelector('[data-filter=\"all\"]').click()");await sleep(800);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-products-desktop.png'),Buffer.from(r.data,'base64')));
  for(const [key,title] of [['solar','Solar Panels'],['universal','Universal Wall Connector'],['megapack','Megapack']]){
    await evaluate("document.querySelector('[data-product=\""+key+"\"]').click()");
    assert(await evaluate("document.querySelector('#dialog-title').textContent==='"+title+"'"),title+' details open');
    await evaluate("document.querySelector('dialog').close()");
  }
  await evaluate("document.querySelector('#charging').scrollIntoView({behavior:'instant'});document.querySelector('[data-charge=\"road\"]').click()");await sleep(1000);
  assert(await evaluate("document.querySelector('#charge-title').textContent.includes('fresh start')&&document.querySelector('#charge-link').href.endsWith('/supercharger')"),'Interactive charging panel updates its content and link');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-charging-desktop.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('#ownership').scrollIntoView({behavior:'instant'});document.querySelector('.faq-list summary').click()");await sleep(600);
  assert(await evaluate("document.querySelector('.faq-list details').open"),'Ownership FAQ expands');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-ownership-desktop.png'),Buffer.from(r.data,'base64')));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("window.scrollTo(0,0)");await sleep(600);
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Mobile hero fits the viewport');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-hero-mobile.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('.menu').click();document.querySelector('nav a[href=\"#charging\"]').click()");await sleep(700);
  assert(await evaluate("!document.querySelector('nav').classList.contains('open')"),'Dark mobile navigation closes after selection');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-charging-mobile.png'),Buffer.from(r.data,'base64')));
  for(const id of ['collection','roadster','experience','products','charging','electric','ownership']){
    await evaluate("document.querySelector('#"+id+"').scrollIntoView({behavior:'instant'})");await sleep(500);
    assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),id+' fits mobile without overflow');
  }
  await evaluate("document.querySelector('#products').scrollIntoView({behavior:'instant'})");await sleep(700);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-products-mobile.png'),Buffer.from(r.data,'base64')));
  assert(await evaluate("Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0)"),'All new and existing images load');
  await evaluate("document.querySelector('[data-book]').click()");
  assert(await evaluate("document.querySelector('dialog').open&&document.querySelectorAll('select[name=\"model\"] option').length===6"),'Dark booking dialog includes the expanded model list');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'dark-dialog-mobile.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('dialog').close()");
  assert(errors.length===0,'No runtime exceptions');console.log('Dark showroom verification complete');
}finally{if(socket)socket.close();chrome.kill();server.close();}

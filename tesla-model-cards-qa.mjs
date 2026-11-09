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
  await evaluate("document.documentElement.style.scrollBehavior='auto';document.querySelector('.lineup-heading').scrollIntoView({behavior:'instant'})");await sleep(400);
  assert(await evaluate("document.querySelectorAll('.vehicle-card').length===6&&Array.from(document.querySelectorAll('.vehicle-card')).every(card=>card.querySelectorAll('.vehicle-card-details b').length===3&&card.querySelector('.vehicle-card-description').textContent.length>20)"),'All six redesigned cards contain descriptions and three concise data points');
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Desktop model grid stays inside the viewport');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'model-cards-desktop.png'),Buffer.from(r.data,'base64')));
  for(const [key,name,type] of [['Y','Model Y','SUV'],['C','Cybertruck','Utility truck'],['R','Roadster','Sports car']]){
    await evaluate("document.querySelector('[data-select=\""+key+"\"]').click()");
    for(let i=0;i<20;i++){if(await evaluate("document.querySelector('#model-name').textContent==='"+name+"'"))break;await sleep(150);}
    assert(await evaluate("document.querySelector('#model-name').textContent==='"+name+"'&&document.querySelector('#stage-type').textContent==='"+type+"'&&document.querySelector('[data-select=\""+key+"\"]').getAttribute('aria-pressed')==='true'"),name+' selection updates the main card, data and selected state');
  }
  await evaluate("document.querySelector('[data-model=\"S\"]').click()");await sleep(300);
  assert(await evaluate("document.querySelector('[data-select=\"S\"]').getAttribute('aria-pressed')==='true'&&document.querySelectorAll('.vehicle-card.is-selected').length===1"),'Tab selection stays synchronized with model cards');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await sleep(300);
  await evaluate("document.querySelector('.lineup-heading').scrollIntoView({behavior:'instant'})");await sleep(1000);
  const box=await evaluate("(()=>{const b=document.querySelector('.vehicle-card').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y});await sleep(450);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'model-cards-hover.png'),Buffer.from(r.data,'base64')));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('.lineup-heading').scrollIntoView({behavior:'instant'});document.querySelector('.lineup').scrollLeft=0");await sleep(700);
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.lineup').scrollWidth>document.querySelector('.lineup').clientWidth"),'Mobile cards form a contained swipeable carousel');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'model-cards-mobile.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('[data-lineup-direction=\"1\"]').click()");
  for(let i=0;i<20;i++){if(await evaluate("document.querySelector('.lineup').scrollLeft>50"))break;await sleep(100);}
  assert(await evaluate("document.querySelector('.lineup').scrollLeft>50"),'Mobile next arrow advances the model carousel');
  await evaluate("document.querySelector('[data-lineup-direction=\"-1\"]').click()");await sleep(600);
  for(const width of [320,768]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await sleep(250);
    assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Model cards fit '+width+'px without page overflow');
  }
  assert(errors.length===0,'No runtime exceptions');console.log('Model card verification complete');
}finally{if(socket)socket.close();chrome.kill();server.close();}

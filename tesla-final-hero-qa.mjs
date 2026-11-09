import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('tesla-motion/dist');
const out=path.resolve('tesla-qa');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp4':'video/mp4','.woff2':'font/woff2'};
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
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await sleep(2500);
  for(let i=0;i<80;i++){if(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"))break;await sleep(300);}
  assert(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"),'3D film loads');
  await evaluate("document.documentElement.style.scrollBehavior='auto'");
  assert(await evaluate("document.querySelector('#car-scene').dataset.mode==='intro'"),'The 20-second intro starts automatically');
  assert(await evaluate("document.querySelector('#scene-chapter').textContent.endsWith('/ 00:20')"),'Playback duration is displayed as 20 seconds');
  const initial=await evaluate("Number(document.querySelector('#car-scene').dataset.playbackSeconds)");
  const started=Date.now();
  for(let i=0;i<140;i++){if(await evaluate("document.querySelector('.hero').classList.contains('is-complete')"))break;await sleep(250);}
  const elapsed=(Date.now()-started)/1000;console.log({initial,elapsed,expectedRemaining:20-initial});
  assert(Math.abs(elapsed-(20-initial))<5,'Intro reaches the final hero on the 20-second clock');
  assert(await evaluate("document.querySelector('.hero').classList.contains('is-complete')&&document.querySelector('.hero-end').getAttribute('aria-hidden')==='false'"),'Static hero is revealed after completion');
  await sleep(1100);
  assert(await evaluate("getComputedStyle(document.querySelector('.hero-end')).opacity==='1'&&document.querySelector('#scene-motion').textContent==='Replay film'"),'Hero is fully visible with a replay control');
  const endTime=await evaluate("document.querySelector('#car-scene').dataset.time");await sleep(700);
  assert(await evaluate("document.querySelector('#car-scene').dataset.time==='"+endTime+"'"),'The finished hero stays static');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'final-hero-desktop.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('.hero-actions [data-book]').click()");
  assert(await evaluate("document.querySelector('dialog').open"),'Final hero Demo Drive button works');await evaluate("document.querySelector('dialog').close()");
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
  for(let i=0;i<15;i++){if(await evaluate("document.querySelector('.hero-end img').complete&&document.querySelector('.hero-end img').naturalHeight>document.querySelector('.hero-end img').naturalWidth"))break;await sleep(200);}
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.hero-end img').naturalHeight>document.querySelector('.hero-end img').naturalWidth"),'Mobile hero uses its portrait image and fits the viewport');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'final-hero-mobile.png'),Buffer.from(r.data,'base64')));
  await evaluate("document.querySelector('#scene-motion').click()");await sleep(400);
  assert(await evaluate("!document.querySelector('.hero').classList.contains('is-complete')&&document.querySelector('#scene-motion').textContent==='Pause motion'"),'Replay restarts the intro and hides the static hero');
  await evaluate("document.querySelector('#scene-motion').click()");
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(let i=0;i<30;i++){if(await evaluate("document.querySelector('.hero').classList.contains('is-complete')"))break;await sleep(200);}
  assert(await evaluate("document.querySelector('.hero').classList.contains('is-complete')"),'Reduced motion preference shows the static hero');
  assert(errors.length===0,'No runtime errors');console.log('20-second hero verification complete');
}finally{if(socket)socket.close();chrome.kill();server.close();}

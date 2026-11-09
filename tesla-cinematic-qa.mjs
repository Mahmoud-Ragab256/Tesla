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
  await send('Emulation.setDeviceMetricsOverride',{width:960,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await sleep(2500);
  for(let i=0;i<80;i++){if(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"))break;await sleep(300);}
  assert(await evaluate("document.querySelector('#car-scene').dataset.ready==='true'"),'3D film loads');
  await evaluate("document.documentElement.style.scrollBehavior='auto'");
  const initial=await evaluate("Number(document.querySelector('#car-scene').dataset.time)");
  for(let i=0;i<30;i++){if(await evaluate("Number(document.querySelector('#car-scene').dataset.time)>"+(initial+.3)))break;await sleep(200);}
  assert(await evaluate("scrollY===0&&Number(document.querySelector('#car-scene').dataset.time)>"+(initial+.3)),'Animation starts automatically without scroll or clicking');
  await evaluate("document.querySelector('#scene-motion').click()");
  const paused=await evaluate("Number(document.querySelector('#car-scene').dataset.time)");
  await evaluate("window.scrollTo(0,80)");await sleep(800);
  const after=await evaluate("Number(document.querySelector('#car-scene').dataset.time)");
  assert(Math.abs(after-paused)<.05,'Pause freezes playback and scrolling does not scrub or restart it');
  await evaluate("document.querySelector('#scene-motion').click()");
  for(let i=0;i<20;i++){if(await evaluate("Number(document.querySelector('#car-scene').dataset.time)>"+(after+.2)))break;await sleep(200);}
  assert(await evaluate("Number(document.querySelector('#car-scene').dataset.time)>"+(after+.2)),'Play resumes the animation after scrolling');
  assert(await evaluate("document.querySelector('.hero').offsetHeight===innerHeight"),'Hero no longer reserves extra scroll space');
  assert(await evaluate("document.querySelector('#car-scene').dataset.playbackRate==='1.5'&&document.querySelector('#scene-chapter').textContent.endsWith('/ 00:30')"),'Playback uses the faster 30-second cinematic sequence');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'cinematic-desktop.png'),Buffer.from(r.data,'base64')));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Cinematic scene fits the mobile layout');
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'cinematic-mobile.png'),Buffer.from(r.data,'base64')));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(300);
  for(let i=0;i<25;i++){if(await evaluate("document.querySelector('#scene-motion').textContent==='Play experience'"))break;await sleep(200);}
  assert(await evaluate("document.querySelector('#scene-motion').textContent==='Play experience'"),'Reduced motion preference keeps playback optional');
  assert(errors.length===0,'No runtime errors');console.log('Autoplay verification complete');
}finally{if(socket)socket.close();chrome.kill();server.close();}

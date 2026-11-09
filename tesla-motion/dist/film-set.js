import * as THREE from 'three';
import { RAMP } from './timeline.js';

export function createFilmSet(scene) {
  const white = new THREE.MeshBasicMaterial({ color: '#e7ecf2' });
  const red = new THREE.MeshBasicMaterial({ color: '#eb1425' });
  const steel = new THREE.MeshStandardMaterial({ color: '#20232a', roughness: .65, metalness: .65 });
  const points = [];
  for (let i = 0; i <= 100; i++) { const a = i / 100 * RAMP.angle; points.push(new THREE.Vector3(RAMP.x + RAMP.radius * Math.sin(a), RAMP.radius * (1 - Math.cos(a)), 0)); }
  const vertices = [], indices = [];
  points.forEach(p => vertices.push(p.x, p.y, -RAMP.width / 2, p.x, p.y, RAMP.width / 2));
  for (let i = 0; i < 100; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#7b7e83', roughness: .9, metalness: .05, side: THREE.DoubleSide }));
  road.receiveShadow = true; scene.add(road);
  for (const z of [-RAMP.width / 2, 0, RAMP.width / 2]) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y + .025, z)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 100, z === 0 ? .014 : .04, 5, false), z === 0 ? white : red));
  }
  // Batched structural trusses make the same sculptural ramp visible in wide shots.
  const beams = [];
  for (const z of [-2.05, 2.05]) {
    for (let i = 10; i <= 100; i += 10) {
      const p = points[i], prior = points[i - 10];
      beams.push([new THREE.Vector3(p.x + 1, .02, z), new THREE.Vector3(p.x + 1, p.y, z)]);
      beams.push([new THREE.Vector3(prior.x + 1, prior.y, z), new THREE.Vector3(p.x + 1, p.y, z)]);
      beams.push([new THREE.Vector3(prior.x + 1, prior.y, z), new THREE.Vector3(p.x + 1, Math.max(.1, p.y - 2), z)]);
    }
  }
  const supports = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .045, 1, 5), steel, beams.length);
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  beams.forEach(([a, b], index) => { transform.position.copy(a).add(b).multiplyScalar(.5); const direction = b.clone().sub(a); transform.quaternion.setFromUnitVectors(up, direction.clone().normalize()); transform.scale.set(1, direction.length(), 1); transform.updateMatrix(); supports.setMatrixAt(index, transform.matrix); });
  scene.add(supports);

  for (const z of [-5.5, 5.5, 10]) { const lane = new THREE.Mesh(new THREE.BoxGeometry(90, .008, .025), white); lane.position.set(-8, .015, z); scene.add(lane); }
  for (const x of [-18, -4]) { const cross = new THREE.Mesh(new THREE.BoxGeometry(.025, .008, 22), white); cross.position.set(x, .017, 1); scene.add(cross); }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(64, .06, .09), red); strip.position.set(-9, .08, -9); scene.add(strip);
  const led = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 5, 4), red, 48);
  for (let i = 0; i < 48; i++) { transform.position.set(-39 + i * 1.3, .5, -10); transform.scale.setScalar(1); transform.quaternion.identity(); transform.updateMatrix(); led.setMatrixAt(i, transform.matrix); } scene.add(led);

  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext('2d'), radial = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  radial.addColorStop(0, 'rgba(255,255,255,1)'); radial.addColorStop(.12, 'rgba(255,255,255,.6)'); radial.addColorStop(.45, 'rgba(255,255,255,.12)'); radial.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = radial; ctx.fillRect(0, 0, 64, 64);
  const glow = new THREE.CanvasTexture(glowCanvas);
  const floods = [];
  for (const x of [-22, -5, 14]) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#e5f3ff', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.position.set(x, 2.7, -8); sprite.scale.set(3.5, 3.5, 1); scene.add(sprite); floods.push(sprite);
    const lamp = new THREE.PointLight('#b6dfff', 60, 25, 2); lamp.position.copy(sprite.position); scene.add(lamp);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 2.6, 5), steel); post.position.set(x, 1.3, -8); scene.add(post);
  }
  const count = innerWidth < 800 ? 96 : 160;
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), alphas = new Float32Array(count);
  const smokeGeometry = new THREE.BufferGeometry(); smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); smokeGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1)); smokeGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const smokeMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uHeight: { value: innerHeight }, uTime: { value: 0 } },
    vertexShader: 'attribute float aSize; attribute float aAlpha; uniform float uHeight; varying float vAlpha; varying vec3 vPosition; void main(){vAlpha=aAlpha;vPosition=position;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uHeight/max(1.,-mv.z),1.,350.);}',
    fragmentShader: 'uniform float uTime; varying float vAlpha; varying vec3 vPosition; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);} void main(){vec2 p=gl_PointCoord-.5;float n=noise(gl_PointCoord*7.+vPosition.xz*.4+uTime*.05);float edge=smoothstep(.5,.1,length(p)+(n-.5)*.18);float alpha=edge*vAlpha; if(alpha<.005)discard;vec3 col=mix(vec3(.25,.38,.44),vec3(.85,.89,.92),noise(gl_PointCoord*3.+vPosition.xy));gl_FragColor=vec4(col,alpha);}' });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial); smoke.frustumCulled = false; scene.add(smoke);
  const seed = i => { const value = Math.sin(i * 127.1 + 41.7) * 43758.5453; return value - Math.floor(value); };
  const headlights = new THREE.Group();
  for (const z of [-.65, .65]) { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#c7f0ff', blending: THREE.AdditiveBlending, depthWrite: false })); sprite.position.set(2.2, .65, z); sprite.scale.set(.7, .7, 1); headlights.add(sprite); }
  const taillights = new THREE.Group();
  for (const z of [-.7, .7]) { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ff1325', blending: THREE.AdditiveBlending, depthWrite: false })); sprite.position.set(-2.25, .73, z); sprite.scale.set(.5, .3, 1); taillights.add(sprite); }
  const jets = new THREE.Group();
  const jetMaterial = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;uniform float uTime;void main(){float pulse=.5+.5*sin(vUv.y*32.-uTime*18.)*sin(vUv.x*28.+vUv.y*13.-uTime*7.);float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),1.5);float fade=smoothstep(0.,.4,vUv.y);float alpha=fade*edge*(.07+.055*pulse);vec3 col=mix(vec3(.02,.25,.8),vec3(.3,.95,1.),vUv.y);gl_FragColor=vec4(col,alpha);}'});
  for(const x of [-1.35,1.35])for(const z of [-.7,.7]){const plume=new THREE.Mesh(new THREE.ConeGeometry(.35,4.5,12,1,true),jetMaterial);plume.position.set(x,-2.1,z);jets.add(plume);const core=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:'#81efff',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));core.position.set(x,.12,z);core.scale.set(.55,.55,1);jets.add(core);}
  const jetLight=new THREE.PointLight('#42c5ff',25,12,2);jetLight.position.set(0,-.5,0);jets.add(jetLight);
  function attach(vehicle) { vehicle.add(headlights, taillights, jets); }
  function update(state, time, vehicle, camera, reduced) {
    smokeMaterial.uniforms.uHeight.value = camera.aspect < .8 ? innerHeight : innerHeight * 1.2;
    smokeMaterial.uniforms.uTime.value = time;
    jets.visible = ([3,4,7,8,11].includes(state.shot) || (state.shot === 6 && state.time > 19.49)) && state.position[1] > .4;
    jets.scale.y = 1 + .06 * Math.sin(time * 13);
    jetMaterial.uniforms.uTime.value = time;
    const life = 7;
    for (let i = 0; i < count; i++) {
      const ground = state.position[1] < .5, landing = state.impactAge >= 0;
      const age = landing ? state.impactAge - seed(i) * 1.1 : (time * .5 + seed(i) * 4) % 4;
      const alive = landing ? age > 0 && age < life : ground && state.trail > .05;
      const origin = landing ? state.smokeOrigin : state.position;
      const spread = Math.max(0, age) * .85;
      positions[i * 3] = origin[0] + (seed(i + 100) - .5) * (2 + spread * 2) - spread * .55;
      positions[i * 3 + 1] = .25 + Math.max(0, age) * (.65 + seed(i + 200) * .7);
      positions[i * 3 + 2] = origin[2] + (seed(i + 300) - .5) * (1.2 + spread);
      sizes[i] = alive ? 1.1 + Math.max(0, age) * .85 + seed(i + 400) : .01;
      alphas[i] = alive && !reduced ? (landing ? .5 * Math.sin(Math.PI * age / life) : .11 * state.trail) : 0;
    }
    smokeGeometry.attributes.position.needsUpdate = true; smokeGeometry.attributes.aSize.needsUpdate = true; smokeGeometry.attributes.aAlpha.needsUpdate = true;
    const front = new THREE.Vector3(1, 0, 0).applyQuaternion(vehicle.quaternion);
    const toCamera = camera.position.clone().sub(vehicle.position).normalize();
    headlights.children.forEach(light => light.material.opacity = .3 + .7 * Math.max(0, front.dot(toCamera)));
    floods.forEach((light, i) => light.material.opacity = (.6 + .12 * Math.sin(time * .7 + i)) * (1 - state.blackout));
  }
  return { attach, update };
}

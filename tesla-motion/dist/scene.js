import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './assets/vendor/environments/RoomEnvironment.js';
import { DURATION, INTRO_DURATION, PLAYBACK_RATE, sampleTimeline } from './timeline.js';
import { createFilmSet } from './film-set.js';

// The source geometry stays intact. This module authors the environment,
// materials, camera choreography and effects around the licensed vehicle.
export async function initScene() {
  const container = document.querySelector('#scene-container');
  const canvas = document.querySelector('#car-scene');
  const hero = document.querySelector('.hero');
  const endHero = document.querySelector('.hero-end');
  const motionButton = document.querySelector('#scene-motion');
  const chapter = document.querySelector('#scene-chapter');
  const progressBar = document.querySelector('.progress');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = preference.matches;
  let visible = true;
  let dragging = false;
  let lastX = 0;
  let orbit = 0;
  let targetOrbit = 0;
  let progress = 0;
  let targetProgress = 0;
  let autoplay = !reduced;
  let playedSeconds = 0;
  let completed = false;
  let frame = 0;
  let lastTime = 0;
  let effectTime = 0;
  let currentChapter = -1;
  let disposed = false;
  let slowFrames = 0;
  let qualityReduced = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.35 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#030407');
  scene.fog = new THREE.FogExp2('#030407', .011);
  const camera = new THREE.PerspectiveCamera(44, 1, .4, 250);
  const envScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(envScene, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .9;
  envScene.dispose(); pmrem.dispose();

  scene.add(new THREE.HemisphereLight('#bcd9ed', '#040507', 1.2));
  const key = new THREE.DirectionalLight('#ffffff', 3.5);
  key.position.set(2, 8, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .025;
  scene.add(key, key.target);
  const rim = new THREE.PointLight('#e82127', 65, 24, 2);
  rim.position.set(-3, 2.5, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight('#9ec7ff', 2.5);
  fill.position.set(-4, 3, -5); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), new THREE.MeshPhongMaterial({ color: '#04070b', specular: '#273240', shininess: 70 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.018; floor.receiveShadow = true; scene.add(floor);
  const filmSet = createFilmSet(scene);

  const loaded = await new GLTFLoader().loadAsync('./assets/model3.glb');
  const model = loaded.scene;
  const originalBounds = new THREE.Box3().setFromObject(model);
  const size = originalBounds.getSize(new THREE.Vector3());
  model.scale.setScalar(4.72 / Math.max(size.x, size.y, size.z));
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -bounds.min.y + .025, -center.z);
  const vehicle = new THREE.Group(); vehicle.add(model); scene.add(vehicle);
  const paintMaterials = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true; object.receiveShadow = false;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const materials = originals.map(original => {
      let material = original.clone();
      if (material.name === 'Geohoodsub00021Mtl') {
        const paint = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(paint, material);
        paint.color.set('#e7e8e8'); paint.metalness = .3; paint.roughness = .26; paint.clearcoat = 1; paint.clearcoatRoughness = .12; material = paint; paintMaterials.push(material);
      }
      if (material.name.includes('Tire')) material.roughness = .88;
      if (material.transparent) { material.depthWrite = false; material.roughness = .1; material.metalness = .3; }
      material.envMapIntensity = 1.1;
      if (material.map) material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      return material;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  filmSet.attach(vehicle);
  const secondVehicle = new THREE.Group();
  const secondModel = model.clone(true);
  secondModel.traverse(object => {
    if (!object.isMesh) return;
    object.material = object.material.clone();
    if (object.material.name === 'Geohoodsub00021Mtl') object.material.color.set('#505761');
  });
  secondVehicle.add(secondModel); scene.add(secondVehicle);
  let lastFov = 0;
  const target = new THREE.Vector3();
  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    if (reduced) render(performance.now());
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
  function completeIntro() {
    completed = true; autoplay = false; playedSeconds = INTRO_DURATION; progress = targetProgress = 1;
    hero.classList.add('is-complete'); endHero.setAttribute('aria-hidden', 'false');
    canvas.tabIndex = -1; canvas.setAttribute('aria-hidden', 'true'); canvas.dataset.mode = 'hero'; updateMotionButton();
  }
  function restartIntro() {
    completed = false; playedSeconds = progress = targetProgress = 0; orbit = targetOrbit = 0;
    hero.classList.remove('is-complete'); endHero.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = 0; canvas.setAttribute('aria-hidden', 'false'); canvas.dataset.mode = 'intro';
  }
  function updateMotionButton() { motionButton.textContent = completed ? 'Replay film' : autoplay ? 'Pause motion' : 'Play experience'; motionButton.setAttribute('aria-label', autoplay ? 'Pause 3D animation' : 'Play the 3D drive'); }
  canvas.addEventListener('pointerdown', event => { dragging = true; lastX = event.clientX; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (dragging) { targetOrbit -= (event.clientX - lastX) * .008; lastX = event.clientX; if (reduced) { orbit = targetOrbit; render(performance.now()); } } });
  function endDrag() { dragging = false; }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); targetOrbit += event.key === 'ArrowLeft' ? -.22 : .22; if (reduced) { orbit = targetOrbit; render(performance.now()); } } });
  document.querySelector('#scene-reset').onclick = () => { restartIntro(); autoplay = false; updateMotionButton(); render(performance.now()); };
  motionButton.onclick = () => { if (completed) restartIntro(); autoplay = !autoplay; if (!autoplay) { targetProgress = progress; playedSeconds = progress * INTRO_DURATION; } if (autoplay) targetOrbit = 0; updateMotionButton(); if (autoplay && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); } };
  document.querySelectorAll('[data-scene-paint]').forEach(button => button.onclick = () => {
    paintMaterials.forEach(material => material.color.set(button.dataset.scenePaint));
    document.querySelectorAll('[data-scene-paint]').forEach(other => { const selected = other === button; other.classList.toggle('selected', selected); other.setAttribute('aria-pressed', selected); });
    if (reduced) render(performance.now());
  });
  function render(time) {
    const seconds = progress * DURATION;
    const state = sampleTimeline(seconds);
    vehicle.position.fromArray(state.position);
    vehicle.rotation.set(...state.rotation);
    secondVehicle.visible = state.second.visible;
    secondVehicle.position.fromArray(state.second.position);
    secondVehicle.rotation.set(...state.second.rotation);
    target.fromArray(state.target);
    const offset = new THREE.Vector3(...state.eye).sub(target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
    offset.multiplyScalar(Math.max(1, .65 / camera.aspect));
    camera.position.copy(target).add(offset);
    if (!reduced && state.impactAge >= 0 && state.impactAge < .65) {
      const impact = .09 * Math.exp(-state.impactAge * 6);
      camera.position.x += Math.sin(seconds * 67) * impact;
      camera.position.y += Math.cos(seconds * 53) * impact * .55;
    }
    if (lastFov !== state.fov) { camera.fov = state.fov; camera.updateProjectionMatrix(); lastFov = state.fov; }
    camera.lookAt(target);
    key.position.set(state.position[0] + 3, state.position[1] + 9, 6);
    key.target.position.copy(vehicle.position);
    rim.position.set(state.position[0] - 3, state.position[1] + 2, -4);
    filmSet.update(state, seconds, vehicle, camera, reduced);
    container.style.setProperty('--scene-blackout', state.blackout);
    const clock = '00:' + String(Math.floor(seconds / PLAYBACK_RATE)).padStart(2, '0');
    chapter.textContent = String(state.shot + 1).padStart(2, '0') + ' / ' + state.name + ' · ' + clock + ' / 00:' + String(Math.floor(DURATION / PLAYBACK_RATE));
    currentChapter = state.shot;
    const percent = Math.round(progress * 100);
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.firstElementChild.style.transform = 'scaleX(' + progress + ')';
    canvas.dataset.progress = String(percent);
    canvas.dataset.shot = String(state.shot + 1);
    canvas.dataset.time = seconds.toFixed(2);
    canvas.dataset.playbackRate = String(PLAYBACK_RATE);
    canvas.dataset.playbackSeconds = playedSeconds.toFixed(2);
    renderer.render(scene, camera);
  }
  function tick(time) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = lastTime ? Math.max(0, (time - lastTime) / 1000) : .016; lastTime = time;
    if (!qualityReduced && dt > .08) {
      slowFrames++;
      if (slowFrames >= 8) { renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), .8)); qualityReduced = true; }
    }
    if (!reduced || autoplay) effectTime += dt;
    if (autoplay) {
      playedSeconds = Math.min(INTRO_DURATION, playedSeconds + dt);
      progress = targetProgress = playedSeconds / INTRO_DURATION;
      if (playedSeconds >= INTRO_DURATION) completeIntro();
    } else { progress = targetProgress; }
    orbit = THREE.MathUtils.lerp(orbit, targetOrbit, 1 - Math.exp(-dt * 9));
    render(time);
    if (!completed && (!reduced || autoplay)) frame = requestAnimationFrame(tick);
  }
  function resume() { if (!completed && visible && !document.hidden && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); } }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) resume(); else if (frame) { cancelAnimationFrame(frame); frame = 0; } }, { threshold: 0 }).observe(container);
  document.addEventListener('visibilitychange', resume);
  preference.addEventListener('change', event => { reduced = event.matches; if (reduced) { completeIntro(); if (frame) cancelAnimationFrame(frame); frame = 0; render(performance.now()); } else if (!completed) { autoplay = true; resume(); } updateMotionButton(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (frame) cancelAnimationFrame(frame); frame = 0; container.classList.remove('loaded'); canvas.dataset.ready = 'false'; document.querySelector('#scene-hint').textContent = 'Restoring 3D view…'; });
  canvas.addEventListener('webglcontextrestored', () => { container.classList.add('loaded'); canvas.dataset.ready = 'true'; document.querySelector('#scene-hint').textContent = 'Drag to explore'; resume(); });
  addEventListener('pagehide', event => { if (frame) cancelAnimationFrame(frame); frame = 0; if (!event.persisted) { disposed = true; resizeObserver.disconnect(); renderer.dispose(); } });
  addEventListener('pageshow', event => { if (event.persisted) resume(); });
  if (reduced) completeIntro();
  canvas.dataset.mode = completed ? 'hero' : 'intro';
  updateMotionButton(); render(performance.now());
  container.classList.add('loaded'); canvas.dataset.ready = 'true';
  document.querySelector('.scene-loader').classList.add('complete');
  document.querySelector('#scene-hint').textContent = 'Drag to explore';
  resume();
}

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
motionPreference.addEventListener('change', event => { reduced = event.matches; });
function updateHeader() { $('header').classList.toggle('scrolled', scrollY > 35); }
addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
import('./scene.js').then(module => module.initScene()).catch(error => {
  console.error('3D experience could not start:', error);
  document.querySelector('.hero').classList.add('is-complete');
  document.querySelector('.hero-end').setAttribute('aria-hidden', 'false');
  document.querySelector('.scene-controls').style.display = 'none';
  document.querySelector('.scene-loader').textContent = 'Explore the collection below';
  document.querySelector('#scene-hint').textContent = '3D unavailable on this device';
  document.querySelectorAll('.scene-controls button').forEach(button => button.disabled = true);
});
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), { threshold: .12 });
$$('.reveal').forEach(el => revealObserver.observe(el));
$$('.lineup, .product-grid, .electric-grid').forEach(grid => [...grid.children].forEach((el, i) => el.style.setProperty('--delay', i * 75 + 'ms')));
const menu = $('.menu');
function closeMenu() { $('nav').classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }
menu.onclick = () => { const open = $('nav').classList.toggle('open'); menu.setAttribute('aria-expanded', open); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
$$('a[href^="#"]').forEach(link => link.addEventListener('click', e => {
  const id = link.getAttribute('href'), target = id.length > 1 ? $(id) : null;
  if (!target) return;
  e.preventDefault(); closeMenu();
  target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  history.replaceState(null, '', id);
  target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
}));
const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) $$('nav a').forEach(a => { const active = a.hash === '#' + e.target.id; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
}), { rootMargin: '-15% 0px -55% 0px' });
$$('main > section[id]:not(#home)').forEach(el => navObserver.observe(el));
const models = {
  '3': { name: 'Model 3', desc: 'Less ordinary. More you.', tag: 'THE EVERYDAY EXTRAORDINARY', url: 'model3', image: 'model3.jpg' },
  Y: { name: 'Model Y', desc: 'Make room for everything you love.', tag: 'ROOM FOR YOUR WORLD', url: 'modely', image: 'modely.png' },
  S: { name: 'Model S', desc: 'A different kind of presence.', tag: 'BEYOND THE ORDINARY', url: 'models', image: 'models.jpg' },
  X: { name: 'Model X', desc: 'Open up a new perspective.', tag: 'A NEW PERSPECTIVE', url: 'modelx', image: 'modelx.jpg' },
  C: { name: 'Cybertruck', desc: 'Leave the familiar behind.', tag: 'BUILT FOR A DIFFERENT WORLD', url: 'cybertruck', image: 'cybertruck.jpg' },
  R: { name: 'Roadster', desc: 'An electric sports car preview. Explore current details with Tesla.', tag: 'A DIFFERENT KIND OF THRILL · PREVIEW', url: 'roadster', image: 'roadster.jpg' }
};
let current = '3', modelTransition = 0;
const asset = name => 'assets/' + name;
async function setModel(key) {
  if (!models[key] || current === key) return;
  current = key;
  $$('.vehicle-card').forEach(card => {
    const selected = card.dataset.select === key;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', selected);
    card.querySelector('.vehicle-card-status').textContent = selected ? 'Selected' : 'View model';
  });
  const transition = ++modelTransition, model = models[key], stage = $('.car-stage');
  $$('[data-model]').forEach(button => { const selected = button.dataset.model === key; button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; });
  $('#vehicle-panel').setAttribute('aria-labelledby', 'tab-' + key);
  $('#vehicle-panel').setAttribute('aria-busy', 'true'); stage.classList.add('switching');
  const nextImage = new Image(); nextImage.src = asset(model.image);
  await Promise.all([nextImage.decode().catch(() => {}), reduced ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, 180))]);
  if (transition !== modelTransition) return;
  $('#car-image').src = asset(model.image); $('#car-image').alt = 'Tesla ' + model.name;
  $('#model-name').textContent = model.name; $('#model-description').textContent = model.desc;
  $('#model-category').textContent = model.tag;
  const card = document.querySelector('.vehicle-card[data-select="' + key + '"]');
  const facts = card.querySelectorAll('.vehicle-card-details b');
  $('#stage-type').textContent = facts[0].textContent;
  $('#stage-character').textContent = facts[2].textContent;
  $('#model-link').href = 'https://www.tesla.com/' + model.url;
  stage.classList.remove('switching'); $('#vehicle-panel').removeAttribute('aria-busy');
}
$$('[data-model]').forEach(button => {
  button.onclick = () => setModel(button.dataset.model);
  button.onkeydown = e => {
    const tabs = $$('[data-model]'), index = tabs.indexOf(button); let next;
    if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0]; if (e.key === 'End') next = tabs.at(-1);
    if (next) { e.preventDefault(); next.focus(); setModel(next.dataset.model); }
  };
});
$$('[data-select]').forEach(button => button.onclick = () => { setModel(button.dataset.select); $('#vehicle-panel').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' }); $('#tab-' + button.dataset.select).focus({ preventScroll: true }); });
$$('[data-lineup-direction]').forEach(button => button.onclick = () => {
  const rail = $('.lineup'), distance = rail.querySelector('.vehicle-card').getBoundingClientRect().width + 16;
  rail.scrollBy({ left: Number(button.dataset.lineupDirection) * distance, behavior: reduced ? 'instant' : 'smooth' });
});
const dialog = $('#booking');
$('.close').onclick = () => dialog.close();
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
function showDialog(markup) { dialog.classList.remove('compare-dialog'); $('#dialog-content').innerHTML = markup; if (!dialog.open) dialog.showModal(); }
function openBooking() {
  showDialog('<p class="eyebrow">FEEL THE DIFFERENCE</p><h2 id="dialog-title">Your journey starts here.</h2><p>Explore a test drive request for your chosen vehicle.</p><form><label>Full name<input name="name" required autocomplete="name" placeholder="Your full name" maxlength="80"></label><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>Vehicle<select name="model">' + Object.keys(models).map(key => '<option ' + (current === key ? 'selected' : '') + '>' + models[key].name + '</option>').join('') + '</select></label><p class="form-note">Demo only. Your details are not sent or stored. No appointment or purchase is confirmed.</p><button class="button primary" type="submit">Preview request </button></form>');
  $('form').onsubmit = e => {
    e.preventDefault(); const data = new FormData(e.target);
    showDialog('<p class="eyebrow">YOUR NEXT CHAPTER</p><h2 id="dialog-title">Your request preview.</h2><p id="request-summary"></p><p>Your information has not been sent and no booking has been made. Continue to Tesla to check test drive availability in your region.</p><a class="button primary" href="https://www.tesla.com/drive" target="_blank" rel="noopener">Continue to Tesla </a>');
    $('#request-summary').textContent = data.get('name') + ', you selected ' + data.get('model') + ' for your test drive.';
    $('#dialog-title').tabIndex = -1; $('#dialog-title').focus();
  };
}
$$('[data-book]').forEach(button => button.onclick = openBooking);
$('#configure').onclick = () => {
  const model = models[current];
  showDialog('<p class="eyebrow">MAKE IT YOURS</p><h2 id="dialog-title">' + model.name + '</h2><p>Choose a color direction for your next chapter.</p><img class="config-preview" src="' + asset(model.image) + '" alt="' + model.name + '"><div class="swatches" role="group" aria-label="Color options">' + [['#e6e6e3', 'Pearl White'], ['#303336', 'Stealth Grey'], ['#a51e24', 'Deep Red'], ['#142f53', 'Midnight Blue']].map(([color, label], i) => '<button style="background:' + color + '" aria-label="' + label + '" aria-pressed="' + (i === 0) + '" class="' + (i === 0 ? 'selected' : '') + '" data-color="' + label + '" data-hex="' + color + '"></button>').join('') + '</div><p id="color-name" aria-live="polite">Pearl White</p><p class="form-note">Illustrative palette only. The vehicle image does not preview the selected paint. Available finishes depend on model and market.</p><button class="button primary" id="config-book">Experience ' + model.name + ' </button>');
  $$('[data-color]').forEach(button => button.onclick = () => { $$('[data-color]').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); }); button.classList.add('selected'); button.setAttribute('aria-pressed', 'true'); $('#color-name').textContent = button.dataset.color; $('.config-preview').style.borderBottom = '8px solid ' + button.dataset.hex; });
  $('#config-book').onclick = openBooking;
};
const products = {
  powerwall: { name: 'Powerwall', image: 'powerwall.jpg', description: 'Store energy at home for use when you need it. Explore system options, installation and regional availability with Tesla.', url: 'https://www.tesla.com/powerwall' },
  wall: { name: 'Wall Connector', image: 'wall-connector.png', description: 'A dedicated home charging solution. Check your vehicle, local electrical requirements and professional installation options before ordering.', url: 'https://shop.tesla.com/product/wall-connector' },
  mobile: { name: 'Mobile Connector', image: 'mobile-connector.png', description: 'Explore portable charging for compatible outlets. Adapter selection and electrical supply determine compatibility and charging performance.', url: 'https://shop.tesla.com/product/mobile-connector' },
  solar: { name: 'Solar Panels', image: 'solar-panels.jpg', description: 'Explore solar energy generation for your home. System design, installation, eligibility and availability depend on your property and region.', url: 'https://www.tesla.com/solarpanels' },
  universal: { name: 'Universal Wall Connector', image: 'universal-wall.png', description: 'Explore home charging for compatible Tesla and non-Tesla electric vehicles. Check regional connector standards and installation requirements before ordering.', url: 'https://shop.tesla.com/product/universal-wall-connector' },
  megapack: { name: 'Megapack', image: 'megapack.webp', description: 'Discover Tesla battery energy storage for large-scale applications. The image is a conceptual installation illustration; official system configurations vary.', url: 'https://www.tesla.com/megapack' }
};
$$('[data-product]').forEach(button => button.onclick = () => { const product = products[button.dataset.product]; showDialog('<p class="eyebrow">THE ELECTRIC ECOSYSTEM</p><h2 id="dialog-title">' + product.name + '</h2><img class="product-dialog-image" src="' + asset(product.image) + '" alt="' + product.name + '"><p>' + product.description + '</p><a class="button primary" href="' + product.url + '" target="_blank" rel="noopener">Explore with Tesla </a>'); });


const filterButtons = $$('[data-filter]');
filterButtons.forEach(button => button.onclick = () => {
  filterButtons.forEach(other => other.setAttribute('aria-pressed', other === button));
  let count = 0;
  $$('.product-card').forEach(card => {
    const show = button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter;
    card.hidden = !show;
    if (show) {
      card.classList.add('visible');
      if (!reduced) card.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, delay: count * 35, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      count++;
    }
  });
  $('#product-count').textContent = count + (count === 1 ? ' product' : ' products');
});
const charging = {
  home: { kicker: 'START EVERY DAY READY', title: 'Come home.<br>Plug in. Unwind.', description: 'Explore home charging and build a routine that fits your vehicle, your home and your day.', image: 'powerwall.jpg', alt: 'Tesla home energy installation', caption: 'YOUR EVERYDAY, ELECTRIFIED', label: 'Explore home charging', url: 'https://www.tesla.com/charging' },
  road: { kicker: 'THE JOURNEY IS PART OF IT', title: 'A stop.<br>A fresh start.', description: 'Explore Supercharging locations and plan charging stops around the places you want to go. Access and compatibility vary by region and vehicle.', image: 'supercharger.jpg', alt: 'A row of Tesla Superchargers', caption: 'THE ROAD IS CALLING', label: 'Explore Supercharging', url: 'https://www.tesla.com/supercharger' },
  away: { kicker: 'MAKE EVERY ARRIVAL COUNT', title: 'Park.<br>Recharge. Explore.', description: 'Discover charging at hotels, restaurants and other destinations. Check each location for access, availability and compatible connectors.', image: 'wall-connector.png', alt: 'Tesla Wall Connector', caption: 'MORE POSSIBILITY ON ARRIVAL', label: 'Discover charging options', url: 'https://www.tesla.com/charging' }
};
function selectCharging(key) {
  const option = charging[key];
  $$('[data-charge]').forEach(button => { const selected = button.dataset.charge === key; button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; });
  $('#charge-panel').setAttribute('aria-labelledby', 'charge-tab-' + key);
  $('#charge-kicker').textContent = option.kicker;
  $('#charge-title').innerHTML = option.title;
  $('#charge-description').textContent = option.description;
  $('#charge-image').src = asset(option.image); $('#charge-image').alt = option.alt;
  $('.charge-visual').classList.toggle('product-view', key === 'away');
  $('#charge-caption').textContent = option.caption;
  $('#charge-link').href = option.url; $('#charge-link').innerHTML = option.label + '<span>↗</span>';
  if (!reduced) $('#charge-panel').animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
}
$$('[data-charge]').forEach(button => {
  button.onclick = () => selectCharging(button.dataset.charge);
  button.onkeydown = event => {
    const buttons = $$('[data-charge]'), index = buttons.indexOf(button);
    let next;
    if (event.key === 'ArrowRight') next = buttons[(index + 1) % buttons.length];
    if (event.key === 'ArrowLeft') next = buttons[(index - 1 + buttons.length) % buttons.length];
    if (event.key === 'Home') next = buttons[0]; if (event.key === 'End') next = buttons.at(-1);
    if (next) { event.preventDefault(); next.focus(); selectCharging(next.dataset.charge); }
  };
});
const vehicleTypes = { '3': ['Sedan', 'Daily driving'], Y: ['SUV', 'Everyday space'], S: ['Premium sedan', 'Refined touring'], X: ['Premium SUV', 'Space & presence'], C: ['Utility vehicle', 'A different perspective'], R: ['Sports car · Preview', 'Discover the Roadster vision'] };
function compareModels() {
  showDialog('<p class="eyebrow">FIND YOUR FIT</p><h2 id="dialog-title">Six ways forward.</h2><p>Compare the character of the collection, then explore current details with Tesla.</p><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Vehicle</th><th>Body style</th><th>Explore</th><th><span class="visually-hidden">Select model</span></th></tr></thead><tbody>' + Object.keys(models).map(key => '<tr><td>' + models[key].name + '</td><td>' + vehicleTypes[key][0] + '</td><td>' + vehicleTypes[key][1] + '</td><td><button data-compare-select="' + key + '">View model</button></td></tr>').join('') + '</tbody></table></div><p class="form-note">A presentation comparison. Specifications, availability and prices depend on model, configuration and market.</p>');
  dialog.classList.add('compare-dialog');
  $$('[data-compare-select]').forEach(button => button.onclick = () => { dialog.close(); setModel(button.dataset.compareSelect); $('#collection').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' }); });
}
$('#compare-models').onclick = compareModels;
$$('[data-compare]').forEach(button => button.onclick = compareModels);
$$('.faq-list details').forEach(details => details.addEventListener('toggle', () => {
  if (details.open && !reduced) details.lastElementChild.animate([{ opacity: 0, transform: 'translateY(-7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
}));
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $$('.product-card, .vehicle-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reduced) return;
      const box = card.getBoundingClientRect(), x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      card.style.setProperty('--rx', (y - .5) * -3 + 'deg'); card.style.setProperty('--ry', (x - .5) * 3 + 'deg');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });
}
let parallaxQueued = false;
function updateEditorialMotion() {
  parallaxQueued = false;
  const image = $('.spotlight-image img'), rect = $('.spotlight').getBoundingClientRect();
  if (reduced) { image.style.transform = ''; return; }
  if (rect.bottom > 0 && rect.top < innerHeight) {
    const shift = Math.max(-25, Math.min(25, (rect.top + rect.height / 2 - innerHeight / 2) * .06));
    image.style.transform = 'translateY(' + shift + 'px) scale(1.07)';
  }
}
addEventListener('scroll', () => { if (!parallaxQueued) { parallaxQueued = true; requestAnimationFrame(updateEditorialMotion); } }, { passive: true });
motionPreference.addEventListener('change', updateEditorialMotion);


/* SK Jewellers 1 — Firebase edition.
   NOTHING in this file is secret. The Firebase config below is public by design;
   real protection comes from Firebase Auth + firestore.rules (enforced on Google's servers). */

/* ===== CONFIG: edit these ===== */
const CFG = {
  WA: '923143346969',
  FB: 'https://www.facebook.com/skjewellers1',   // TODO: your real Facebook page
  IG: 'https://www.instagram.com/skjewellers1'   // TODO: your real Instagram page
};
const FIREBASE_CONFIG = {                        // paste from Firebase console > Project settings > Your apps
  apiKey: 'AIzaSyBn1vPnLWqKhGbh44WFdsxuzc4uMwbxokw', authDomain: 'sk-jewelers.firebaseapp.com', projectId: 'sk-jewelers', appId: '1:181112452509:web:80bb1a2be3022a1867eb74'
};


const U = id => `https://images.unsplash.com/photo-${id}?w=700&q=80&auto=format&fit=crop`;
const FALLBACK = U('1515562141207-7a88fb7ce338');
const ADV = 350, $ = id => document.getElementById(id);
const PHONE_RE = /^03\d{2}-?\d{7}$/, NAME_RE = /^[A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF .'-]{2,}$/;
const CITY_RE = /^[A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF .'-]{1,38}$/;
const STATUSES = ['Pending', 'Advance Payment Verified', 'Dispatched', 'Delivered', 'Cancelled'];
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem('skj_' + k)) ?? d } catch { return d } };
const lsSet = (k, v) => { try { localStorage.setItem('skj_' + k, JSON.stringify(v)) } catch { } };
const pkr = n => 'PKR ' + Math.round(Number(n) || 0).toLocaleString();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEF_CATS = ['Watches', 'Bracelets', 'Rings', 'Glasses', 'Custom Accessories'];
const DEF_PRODUCTS = [
  { name: 'Classic Gold Chronograph', cost: 12000, old: 21000, price: 18500, cat: 'Watches', g: 'Him', badge: 'Bestseller', img: U('1523170335258-f5ed11844a49') },
  { name: 'Midnight Steel Watch', cost: 9500, old: 0, price: 14900, cat: 'Watches', g: 'Him', badge: 'New Arrival', img: U('1524592094714-0f0654e20314') },
  { name: 'Gold Link Bracelet', cost: 4800, old: 8800, price: 7500, cat: 'Bracelets', g: 'Her', badge: '', img: U('1611652022419-a9419f74343d') },
  { name: 'Silver Chain Bracelet', cost: 3300, old: 0, price: 5200, cat: 'Bracelets', g: 'Him', badge: '', img: U('1599458252573-56ae36120de1') },
  { name: 'Solitaire Gold Ring', cost: 6200, old: 11500, price: 9800, cat: 'Rings', g: 'Her', badge: 'Bestseller', img: U('1605100804763-247f67b3557e') },
  { name: 'Signet Band Ring', cost: 4000, old: 0, price: 6400, cat: 'Rings', g: 'Him', badge: 'New Arrival', img: U('1611591437281-460bfbe1220a') },
  { name: 'Aviator Sunglasses', cost: 3000, old: 0, price: 4800, cat: 'Glasses', g: 'Both', badge: '', img: U('1572635196237-14b3f281503f') },
  { name: 'Tinted Round Shades', cost: 2600, old: 4900, price: 4200, cat: 'Glasses', g: 'Her', badge: '', img: U('1511499767150-a48a237f0083') },
  { name: 'Name Engraved Pendant', cost: 4300, old: 0, price: 6900, cat: 'Custom Accessories', g: 'Her', badge: '', img: U('1535632066927-ab7c9ab60908'), custom: true },
  { name: 'Personalised Kada', cost: 5700, old: 0, price: 8900, cat: 'Custom Accessories', g: 'Him', badge: 'Bestseller', img: U('1599643478518-a784e5dc4c8f'), custom: true },
  { name: 'Engraved Cufflinks', cost: 3400, old: 0, price: 5500, cat: 'Custom Accessories', g: 'Him', badge: '', img: U('1573408301185-9146fe634ad0'), custom: true }
];

/* ---------- Firebase ---------- */
const configured = FIREBASE_CONFIG.apiKey !== 'PASTE_HERE';
let auth, db, TS;
if (configured) {
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth(); db = firebase.firestore(); TS = firebase.firestore.FieldValue.serverTimestamp;
  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => { });
}

let cats = [], products = [], costs = {}, orders = [], ready = false, admin = false, unsubs = [],
  cart = lsGet('cart', []), wish = lsGet('wish', []), myIds = lsGet('my', []),
  filter = { cat: null, g: null, wish: false }, upImg = '';
const persistCart = () => lsSet('cart', cart);
let tt;
function toast(m, err) { const t = $('toast'); t.textContent = m; t.className = err ? 'err' : ''; t.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => t.style.display = 'none', 2800) }
const img = p => `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" draggable="false" onerror="this.onerror=null;this.src='${FALLBACK}'">`;
const disc = p => p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
const margin = p => p.price ? (p.price - (costs[p.id] ?? 0)) / p.price * 100 : 0;
const dt = o => o.date?.toDate?.() || new Date();

/* ---------- Animations ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target) } }), { threshold: .1 });
const reveal = () => document.querySelectorAll('.rv:not(.in-view)').forEach(e => io.observe(e));
$('sparks').innerHTML = [...Array(14)].map(() => `<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * 6}s;animation-duration:${5 + Math.random() * 6}s"></i>`).join('');
addEventListener('scroll', () => {
  const h = document.documentElement, y = scrollY;
  $('progress').style.width = (y / Math.max(1, h.scrollHeight - innerHeight) * 100) + '%';
  $('hd').classList.toggle('small', y > 40); $('totop').classList.toggle('show', y > 600);
}, { passive: true });

/* ---------- Social links ---------- */
document.querySelectorAll('[data-s]').forEach(a => {
  a.href = { fb: CFG.FB, ig: CFG.IG, wa: `https://wa.me/${CFG.WA}?text=${encodeURIComponent('Hello SK Jewellers 1, I need help.')}` }[a.dataset.s];
});
$('mapLink').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('SK Jewellers 1, Gool Bagh, Near Brand Road, Multan');

/* ---------- Navigation ---------- */
function go(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.remove('on')); $('v-' + v).classList.add('on');
  if (v === 'home') { filter = { cat: null, g: null, wish: false }; renderShop() }
  if (v === 'orders') renderMyOrders();
  if (v === 'admin') renderAdmin();
  scrollTo(0, 0);
}
function setGender(g) { filter = { cat: null, g, wish: false }; renderShop(); $('products').scrollIntoView({ behavior: 'smooth' }) }
function setCat(c) { go('home'); filter.cat = c; renderShop(); $('products').scrollIntoView({ behavior: 'smooth' }) }
function toggleWish() { go('home'); filter.wish = true; renderShop(); $('products').scrollIntoView({ behavior: 'smooth' }) }
function renderNav() {
  $('nav').innerHTML = cats.map(c => `<a class="${filter.cat === c ? 'on' : ''}" onclick="setCat(this.dataset.c)" data-c="${esc(c)}">${esc(c)}</a>`).join('');
  // single-row category chips above the product row
  $('chips').innerHTML = [''].concat(cats).map(c => `<button type="button" class="chip ${!filter.wish && (filter.cat || '') === c ? 'on' : ''}" data-c="${esc(c)}" onclick="pickCat(this.dataset.c)">${c ? esc(c) : 'All'}</button>`).join('');
  // category list inside the menu drawer
  $('menuCats').innerHTML = [''].concat(cats).map(c => `<button type="button" class="ml ${!filter.wish && (filter.cat || '') === c ? 'on' : ''}" data-c="${esc(c)}" onclick="menuGo('cat',this.dataset.c)">${c ? esc(c) : 'All Products'}</button>`).join('');
}
function pickCat(c) { filter = { cat: c || null, g: null, wish: false }; renderShop() }

/* ---------- Menu drawer ---------- */
function toggleMenu(o) {
  const m = $('menu'), open = typeof o === 'boolean' ? o : !m.classList.contains('open');
  m.classList.toggle('open', open); m.setAttribute('aria-hidden', String(!open));
  $('menuBtn').setAttribute('aria-expanded', String(open)); $('menuBtn').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open) $('drawer').classList.remove('open');
  syncScrim();
}
function menuGo(a, v) {
  toggleMenu(false);
  if (a === 'home' || a === 'orders') return go(a);
  go('home');
  if (a === 'g') filter = { cat: null, g: v, wish: false };
  if (a === 'cat') filter = { cat: v || null, g: null, wish: false };
  if (a === 'wish') filter = { cat: null, g: null, wish: true };
  renderShop();
  setTimeout(() => (a === 'custom' ? $('customSec') : $('shopTitle')).scrollIntoView({ behavior: 'smooth' }), 60);
}

/* ---------- Horizontal scroller: arrows + keyboard + mouse-drag (touch uses native swipe) ---------- */
function initScroller(w) {
  const t = w.querySelector('.track'), p = w.querySelector('.prev'), n = w.querySelector('.next');
  const upd = () => {
    const max = t.scrollWidth - t.clientWidth - 2;
    p.disabled = t.scrollLeft <= 2; n.disabled = t.scrollLeft >= max; w.classList.toggle('no-scroll', max <= 0);
  };
  const step = () => Math.max(220, t.clientWidth * .85);
  p.onclick = () => t.scrollBy({ left: -step(), behavior: 'smooth' });
  n.onclick = () => t.scrollBy({ left: step(), behavior: 'smooth' });
  t.addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  if (window.ResizeObserver) new ResizeObserver(upd).observe(t);
  new MutationObserver(upd).observe(t, { childList: true });
  t.addEventListener('keydown', e => {
    if (e.target !== t) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); n.click() } else if (e.key === 'ArrowLeft') { e.preventDefault(); p.click() }
  });
  let down = false, moved = false, sx = 0, sl = 0;
  t.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('input,button,select')) return;
    down = true; moved = false; sx = e.clientX; sl = t.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - sx;
    if (!moved && Math.abs(dx) > 6) { moved = true; t.classList.add('drag') }
    if (moved) t.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { down = false; t.classList.remove('drag') });
  t.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true);
  upd();
}
function like(id) { wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id]; lsSet('wish', wish); renderShop() }

/* ---------- Shop ---------- */
// discounted price first (prominent), original price after it with a strikethrough
const priceHTML = p => `<div class="pr"><span class="now">${pkr(p.price)}</span>${disc(p) ? `<s class="was">${pkr(p.old)}</s>` : ''}</div>`;
let lastKey = '';
function card(p, i) {
  const d = disc(p), bd = (p.sold ? '<span class="bd">Sold out</span>' : '') + (d ? `<span class="bd sale">Sale -${d}%</span>` : '') + (p.badge ? `<span class="bd">${esc(p.badge)}</span>` : '');
  const id = esc(p.id), liked = wish.includes(p.id);
  return `<div class="card rv" style="--d:${(i % 4) * 70}ms"><div class="bds">${bd}</div><button class="heart ${liked ? 'on' : ''}" onclick="like('${id}')" aria-label="Wishlist">♥</button>${img(p)}<div class="in"><span class="cat">${esc(p.cat)} · ${esc(p.g)}</span><h3>${esc(p.name)}</h3>
  ${priceHTML(p)}
  ${p.custom ? `<input id="eng${id}" maxlength="20" placeholder="Engraving text (e.g. Ali)">` : ''}
  <button class="btn sm" ${p.sold ? 'disabled' : ''} onclick="addCart('${id}')">${p.sold ? 'Sold out' : 'Add to cart'}</button></div></div>`;
}
function renderShop() {
  renderNav(); $('wc').textContent = wish.length; $('wc2').textContent = wish.length;
  if (!configured) { $('products').innerHTML = '<p class="empty">Firebase is not configured yet. Follow the README (Step 2).</p>'; return }
  if (!ready) { $('products').innerHTML = '<div class="sk"></div>'.repeat(4); return }
  const q = ($('q').value || '').trim().toLowerCase(), s = $('sort').value;
  let list = products.filter(p => (!filter.cat || p.cat === filter.cat) && (!filter.g || p.g === filter.g || p.g === 'Both') && (!filter.wish || wish.includes(p.id)) &&
    (!q || (p.name + ' ' + p.cat + ' ' + p.g + ' ' + (p.badge || '')).toLowerCase().includes(q)));
  if (s === 'lh') list.sort((a, b) => a.price - b.price); if (s === 'hl') list.sort((a, b) => b.price - a.price);
  if (s === 'new' || !s) list.sort((a, b) => (b.added || 0) - (a.added || 0));
  $('shopTitle').textContent = filter.wish ? 'Your Wishlist' : filter.cat || (filter.g ? 'For ' + filter.g : 'The Collection');
  $('products').innerHTML = list.map(card).join('') || '<p class="empty">No products found.</p>';
  const key = JSON.stringify([filter, q, s]); if (key !== lastKey) { lastKey = key; $('products').scrollTo({ left: 0, behavior: 'instant' }) }
  $('customProducts').innerHTML = products.filter(p => p.custom).map(card).join('');
  $('customSec').style.display = (filter.cat && filter.cat !== 'Custom Accessories') || filter.wish ? 'none' : '';
  reveal();
}

/* ---------- Cart ---------- */
function addCart(id) {
  const p = products.find(x => x.id === id), el = $('eng' + id);
  if (!p || p.sold) return;
  let eng = '';
  if (p.custom) { eng = (el?.value || '').trim(); if (!eng) return toast('Please enter engraving text', 1) }
  const ex = cart.find(c => c.pid === id && c.eng === eng);
  ex ? ex.qty++ : cart.push({ pid: id, name: p.name, price: p.price, img: p.img, qty: 1, eng });
  persistCart(); renderCart(); toast('✔ ' + p.name + ' added to cart'); toggleCart(true);
}
const cartTotal = () => cart.reduce((s, c) => s + c.price * c.qty, 0);
function renderCart() {
  $('cc').textContent = cart.reduce((s, c) => s + c.qty, 0);
  $('cartItems').innerHTML = cart.map((c, i) => `<div class="ci"><img src="${esc(c.img)}" onerror="this.src='${FALLBACK}'"><div><b>${esc(c.name)}</b>${c.eng ? `<br><small>Engraving: "${esc(c.eng)}"</small>` : ''}<br>${pkr(c.price)}
  <div class="q"><button onclick="qty(${i},-1)">−</button> ${c.qty} <button onclick="qty(${i},1)">+</button></div></div></div>`).join('') || '<p>Your cart is empty.</p>';
  $('cartTotal').textContent = 'Total: ' + pkr(cartTotal());
}
function qty(i, d) { cart[i].qty += d; if (cart[i].qty < 1) cart.splice(i, 1); persistCart(); renderCart() }
const syncScrim = () => {
  const on = $('menu').classList.contains('open') || $('drawer').classList.contains('open');
  $('scrim').classList.toggle('on', on); document.body.classList.toggle('lock', on);
};
const toggleCart = o => {
  $('drawer').classList.toggle('open', o);
  if ($('drawer').classList.contains('open')) { $('menu').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', 'false') }
  syncScrim();
};
addEventListener('keydown', e => { if (e.key === 'Escape') { toggleMenu(false); toggleCart(false); closeCo() } });

/* ---------- Checkout ---------- */
function openCheckout() { if (!cart.length) return toast('Your cart is empty', 1); toggleCart(false); $('co').classList.add('open'); payUI() }
const closeCo = () => $('co').classList.remove('open');
function payUI() {
  const t = cartTotal();
  if ($('pm').value === 'jazz') {
    $('payBox').innerHTML = `<div class="note">Send <b>${pkr(t)}</b> via JazzCash to <b>0314-3346969</b>, then enter the transaction ID. Your order is confirmed after we verify the payment.</div><input id="tid" maxlength="40" placeholder="JazzCash transaction ID">`;
    $('coTotal').textContent = 'Pay now: ' + pkr(t);
  } else {
    $('payBox').innerHTML = `<div class="note">COD policy: a mandatory <b>PKR ${ADV} advance</b> must be sent via JazzCash/EasyPaisa before dispatch. Send to <b>0314-3346969</b> (SK Jewellers 1) and enter the transaction ID below. The remaining balance is paid on delivery.</div><input id="tid" maxlength="40" placeholder="Advance transaction ID">`;
    $('coTotal').textContent = `Advance now: ${pkr(ADV)} · On delivery: ${pkr(Math.max(t - ADV, 0))}`;
  }
}
async function placeOrder() {
  const name = $('cn').value.trim().replace(/\s+/g, ' '), phone = $('cph').value.trim(), addr = $('ca').value.trim().replace(/\s+/g, ' '), city = $('ccity').value.trim().replace(/\s+/g, ' '), cod = $('pm').value === 'cod', txn = $('tid').value.trim();
  const bad = [];
  if (!NAME_RE.test(name)) bad.push(['cn', 'Enter your original full name (letters only)']);
  if (addr.length < 10 || !/[A-Za-z\u0600-\u06FF]/.test(addr)) bad.push(['ca', 'Enter your complete real delivery address']);
  if (!CITY_RE.test(city)) bad.push(['ccity', 'Enter your city (e.g. Multan)']);
  if (!PHONE_RE.test(phone)) bad.push(['cph', 'Enter a valid WhatsApp number like 03XX-XXXXXXX']);
  if (txn.length < 4) bad.push(['tid', 'Enter the payment transaction ID']);
  ['cn', 'ca', 'ccity', 'cph', 'tid'].forEach(i => $(i)?.classList.toggle('bad', bad.some(b => b[0] === i)));
  if (bad.length) return toast(bad[0][1], 1);
  const fullAddr = addr + ', ' + city;   // city is stored inside the existing address field (rules unchanged)
  if (fullAddr.length > 250) return toast('Address is too long — please shorten it', 1);
  if (!cart.length) return toast('Your cart is empty', 1);
  if (!configured) return toast('Store is not connected yet', 1);
  // always re-price from the live catalogue, never trust the stored cart price
  const items = [];
  for (const c of cart) {
    const p = products.find(x => x.id === c.pid);
    if (!p || p.sold) return toast(`"${c.name}" is no longer available — please remove it`, 1);
    items.push({ pid: p.id, name: p.name, eng: c.eng || '', qty: c.qty, price: p.price });
  }
  const total = items.reduce((s, i) => s + i.price * i.qty, 0), ref = db.collection('orders').doc();
  $('poBtn').disabled = true;
  try {
    await ref.set({
      code: 'SKJ-' + ref.id.slice(0, 6).toUpperCase(), name, phone: phone.replace(/^(\d{4})(\d{7})$/, '$1-$2'), addr: fullAddr, items, total,
      pay: cod ? 'COD' : 'JazzCash', advance: cod ? ADV : total, txn, status: 'Pending', step: 0, date: TS()
    });
    myIds.push(ref.id); lsSet('my', myIds); cart = []; persistCart(); renderCart(); closeCo();
    toast('✔ Order placed! We will verify your payment on WhatsApp shortly.'); go('orders');
  } catch (e) { toast('Could not place order. Check your internet and try again.', 1) }
  $('poBtn').disabled = false;
}

/* ---------- Customer portal (fetches only the orders this device placed, by their random IDs) ---------- */
const FLOW = ['Order Placed', 'Advance Payment Verified', 'Dispatched', 'Delivered'];
async function renderMyOrders() {
  if (!configured || !myIds.length) { $('myOrders').innerHTML = '<p style="text-align:center">No orders yet.</p>'; return }
  const docs = (await Promise.all(myIds.map(id => db.doc('orders/' + id).get().catch(() => null)))).filter(d => d?.exists).map(d => ({ id: d.id, ...d.data() })).reverse();
  $('myOrders').innerHTML = docs.map(o => `<div class="order rv in-view"><b>${esc(o.code)}</b> · ${dt(o).toLocaleDateString()} · ${esc(o.pay)}
  <div>${esc(o.name)} · ${esc(o.phone)}<br><small>${esc(o.addr)}</small></div>
  <div>${o.items.map(i => `${i.qty}× ${esc(i.name)}${i.eng ? ` ("${esc(i.eng)}")` : ''}`).join('<br>')}</div><b>${pkr(o.total)}</b>
  ${o.status === 'Cancelled' ? '<span class="dn">Cancelled</span>' : `<div class="steps">${FLOW.map((_, i) => `<i class="${i <= o.step ? 'd' : ''}"></i>`).join('')}</div><span class="price">${o.step === 0 ? 'Awaiting payment verification' : FLOW[o.step]}</span>`}
  <a class="help" target="_blank" rel="noopener" href="https://wa.me/${CFG.WA}?text=${encodeURIComponent('Hello, I need help with order ' + o.code)}">Need help? Chat on WhatsApp →</a></div>`).join('') || '<p style="text-align:center">No orders found.</p>';
}

/* ---------- Live data from Firestore ---------- */
if (configured) {
  db.collection('products').onSnapshot(s => { products = s.docs.map(d => ({ id: d.id, ...d.data() })); ready = true; renderShop(); if (admin) renderAdmin() }, () => { ready = true; toast('Could not load products', 1); renderShop() });
  db.doc('settings/cats').onSnapshot(d => { cats = d.exists ? d.data().list || [] : []; renderNav(); if (admin) renderAdmin() }, () => { });
}

/* ---------- Admin: real login. Anything shown here is also enforced by firestore.rules ---------- */
addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); go('admin') } });
addEventListener('hashchange', () => { if (location.hash === '#admin') go('admin') });
function adminLogin() {
  if (!configured) return toast('Firebase is not configured yet', 1);
  auth.signInWithEmailAndPassword($('aem').value.trim(), $('apw').value).then(() => { $('apw').value = '' }).catch(() => toast('Wrong email or password', 1));
}
const adminLogout = () => { auth.signOut(); go('home') };
if (configured) auth.onAuthStateChanged(async u => {
  admin = false; unsubs.forEach(f => f()); unsubs = []; orders = []; costs = {};
  if (u) {
    const d = await db.doc('admins/' + u.uid).get().catch(() => null);
    admin = !!d?.exists;
    if (!admin) { auth.signOut(); toast('This account is not an admin', 1) }
  }
  if (admin) {
    unsubs.push(db.collection('orders').orderBy('date').onSnapshot(s => { orders = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAdmin() }, () => toast('No permission to read orders', 1)));
    unsubs.push(db.collection('costs').onSnapshot(s => { costs = {}; s.forEach(d => costs[d.id] = d.data().cost); renderAdmin() }, () => { }));
  }
  renderAdmin();
});
const oProfit = o => o.items.reduce((s, i) => s + (i.price - (costs[i.pid] ?? i.price * .65)) * i.qty, 0);
// flags orders whose prices differ from the live catalogue (possible tampering, or the price changed since)
const oCheck = o => o.items.some(i => products.find(p => p.id === i.pid)?.price !== i.price) || o.items.reduce((s, i) => s + i.price * i.qty, 0) !== o.total;
let charts = [];
function renderAdmin() {
  if (!$('v-admin').classList.contains('on')) return;
  $('adminLogin').style.display = admin ? 'none' : 'flex';
  if (!admin) { $('adminBody').innerHTML = ''; charts.forEach(c => c.destroy()); charts = []; return }
  if (!$('adminBody').firstElementChild) {
    $('adminBody').appendChild($('tplAdmin').content.cloneNode(true));
    $('os').innerHTML += STATUSES.map(s => `<option>${s}</option>`).join('');
  }
  $('seedBtn').style.display = products.length ? 'none' : '';
  const live = orders.filter(o => o.status !== 'Cancelled'), income = live.reduce((s, o) => s + o.total, 0), profit = Math.round(live.reduce((s, o) => s + oProfit(o), 0));
  $('kpis').innerHTML = [['Total Income', pkr(income)], ['Real Profit', pkr(profit)], ['Profit Margin', (income ? profit / income * 100 : 0).toFixed(1) + '%'], ['Orders', orders.length], ['Pending', orders.filter(o => o.status === 'Pending').length]].map(k => `<div class="kpi">${k[0]}<b>${k[1]}</b></div>`).join('');
  const byDay = {}, byProfit = {}; live.forEach(o => { const d = dt(o).toISOString().slice(5, 10); byDay[d] = (byDay[d] || 0) + o.total; byProfit[d] = (byProfit[d] || 0) + oProfit(o) });
  const labels = Object.keys(byDay).sort(), vals = labels.map(l => byDay[l]);
  charts.forEach(c => c.destroy());
  const opt = { plugins: { legend: { labels: { color: '#ccc' } } }, scales: { x: { ticks: { color: '#999' } }, y: { ticks: { color: '#999' } } } };
  charts = [new Chart($('ch1'), { type: 'line', data: { labels, datasets: [{ label: 'Sales (PKR)', data: vals, borderColor: '#D4AF37', tension: .35 }] }, options: opt }),
  new Chart($('ch2'), { type: 'bar', data: { labels, datasets: [{ label: 'Income', data: vals, backgroundColor: '#D4AF37' }, { label: 'Profit', data: labels.map(l => Math.round(byProfit[l])), backgroundColor: '#8a7424' }] }, options: opt })];
  renderAdminOrders();
  $('catList').innerHTML = cats.map((c, i) => `<div class="f"><input value="${esc(c)}" onchange="editCat(${i},this.value)"><button class="btn sm" onclick="delCat(${i})">Delete</button></div>`).join('');
  const sel = $('pc').value; $('pc').innerHTML = cats.map(c => `<option>${esc(c)}</option>`).join(''); if (sel) $('pc').value = sel;
  $('prodList').innerHTML = `<table><tr><th>Product</th><th>Cost</th><th>Old</th><th>Sell</th><th>Profit</th><th>Margin</th><th></th></tr>${products.map(p => {
    const pr = p.price - (costs[p.id] ?? 0), cl = pr >= 0 ? 'up' : 'dn';
    return `<tr><td>${esc(p.name)}<br><small>${esc(p.cat)}${p.sold ? ' · SOLD OUT' : ''}</small></td><td>${pkr(costs[p.id])}</td><td>${p.old ? pkr(p.old) : '—'}</td><td>${pkr(p.price)}${disc(p) ? `<br><small>-${disc(p)}%</small>` : ''}</td>
    <td class="${cl}">${pkr(pr)}</td><td class="${cl}">${margin(p).toFixed(1)}%</td><td><button class="btn sm" onclick="editProduct('${esc(p.id)}')">Edit</button> <button class="btn sm" onclick="delProduct('${esc(p.id)}')">Delete</button></td></tr>`;
  }).join('')}</table>`;
}
function renderAdminOrders() {
  if (!$('oq')) return;
  const q = $('oq').value.trim().toLowerCase(), qd = q.replace(/\D/g, ''), st = $('os').value;
  const list = orders.slice().reverse().filter(o => (!st || o.status === st) &&
    (!q || o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || (qd && o.phone.replace(/\D/g, '').includes(qd))));
  $('adminOrders').innerHTML = `<table><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Profit</th><th>Pay / Txn</th><th>Status</th><th></th></tr>${list.map(o => `<tr><td>${esc(o.code)}${oCheck(o) ? '<br><small class="dn">⚠ check prices</small>' : ''}</td>
  <td>${esc(o.name)}<br><small>${esc(o.phone)}<br>${esc(o.addr)}</small></td><td><small>${o.items.map(i => `${i.qty}× ${esc(i.name)}${i.eng ? ` ("${esc(i.eng)}")` : ''}`).join('<br>')}</small></td>
  <td>${pkr(o.total)}</td><td class="up">${pkr(oProfit(o))}</td><td>${esc(o.pay)}<br><small>${esc(o.txn)}</small></td>
  <td><select onchange="setStatus('${esc(o.id)}',this.value)">${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
  <td><button class="btn sm" onclick="delOrder('${esc(o.id)}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="8">No matching orders.</td></tr>'}</table>`;
}
const fail = () => toast('Action failed (no permission or no internet)', 1);
function setStatus(id, s) {
  const i = STATUSES.slice(0, 4).indexOf(s), o = orders.find(x => x.id === id), data = { status: s };
  data.step = i >= 0 ? i : o.step;
  db.doc('orders/' + id).update(data).then(() => toast('Status updated')).catch(fail);
}
function delOrder(id) { if (confirm('Delete this order permanently?')) db.doc('orders/' + id).delete().catch(fail) }
const saveCats = l => db.doc('settings/cats').set({ list: l }).catch(fail);
function addCat() { const n = $('catName').value.trim(); if (n && !cats.includes(n)) { saveCats([...cats, n]); $('catName').value = '' } }
function editCat(i, v) {
  const old = cats[i], b = db.batch(); v = v.trim(); if (!v) return;
  products.filter(p => p.cat === old).forEach(p => b.update(db.doc('products/' + p.id), { cat: v }));
  b.set(db.doc('settings/cats'), { list: cats.map((c, k) => k === i ? v : c) }); b.commit().catch(fail);
}
function delCat(i) { if (confirm('Delete category?')) saveCats(cats.filter((_, k) => k !== i)) }

function priceSync(w) {
  const o = +$('pold').value, d = +$('pdisc').value, p = +$('pp').value;
  if ((w === 'd' || w === 'o') && o && d) $('pp').value = Math.round(o * (1 - d / 100));
  if (w === 'p' && o && p) $('pdisc').value = Math.max(0, Math.round((1 - p / o) * 100));
  const sp = +$('pp').value, c = +$('pcost').value;
  $('pprev').textContent = sp ? `Profit: ${pkr(sp - c)} · Margin: ${((sp - c) / sp * 100).toFixed(1)}%` : 'Enter cost & selling price to see profit';
}
function pickImg(inp) { // gallery upload -> small JPEG stored inside the product document
  const f = inp.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => {
    const s = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s;
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); upImg = c.toDataURL('image/jpeg', .72); $('pi').value = ''; $('prev').src = upImg; $('prev').style.display = 'block';
  }; im.src = r.result }; r.readAsDataURL(f);
}
function saveProduct() {
  const price = +$('pp').value, cost = +$('pcost').value, old = +$('pold').value || 0, name = $('pn').value.trim();
  if (!name || !price) return toast('Name and selling price required', 1);
  if (cost < 0 || old && old < price) return toast('Cost must be ≥ 0 and old price must be above selling price', 1);
  if (!$('pc').value) return toast('Create a category first', 1);
  const id = $('pe').value || db.collection('products').doc().id, ex = products.find(p => p.id === id);
  const p = { name, old, price, cat: $('pc').value, g: $('pg').value, badge: $('pb').value, custom: $('pcu').checked, sold: $('psold').checked,
    img: upImg || $('pi').value.trim() || ex?.img || FALLBACK, added: ex?.added || Date.now() };
  if (p.img.length > 900000) return toast('Image too large — use a smaller one', 1);
  const b = db.batch(); b.set(db.doc('products/' + id), p); b.set(db.doc('costs/' + id), { cost });
  b.commit().then(() => { resetForm(); toast(ex ? 'Product updated' : 'Product added') }).catch(fail);
}
function editProduct(id) {
  const p = products.find(x => x.id === id); upImg = '';
  $('pe').value = id; $('pn').value = p.name; $('pcost').value = costs[id] ?? ''; $('pold').value = p.old || ''; $('pp').value = p.price; $('pdisc').value = disc(p) || '';
  $('pc').value = p.cat; $('pg').value = p.g; $('pb').value = p.badge || ''; $('pcu').checked = !!p.custom; $('psold').checked = !!p.sold; $('pi').value = p.img.startsWith('data:') ? '' : p.img;
  $('prev').src = p.img; $('prev').style.display = 'block'; $('pfTitle').textContent = 'Edit Product'; priceSync(); $('pfTitle').scrollIntoView({ behavior: 'smooth' });
}
function resetForm() {
  upImg = ''; ['pe', 'pn', 'pcost', 'pold', 'pdisc', 'pp', 'pi', 'pf'].forEach(i => $(i).value = ''); $('pcu').checked = false; $('psold').checked = false; $('pb').value = '';
  $('prev').style.display = 'none'; $('pfTitle').textContent = 'Add Product'; priceSync();
}
function delProduct(id) {
  if (!confirm('Delete this product?')) return;
  const b = db.batch(); b.delete(db.doc('products/' + id)); b.delete(db.doc('costs/' + id)); b.commit().catch(fail);
}
function seedDemo() {
  const b = db.batch(); b.set(db.doc('settings/cats'), { list: DEF_CATS });
  DEF_PRODUCTS.forEach((d, i) => { const { cost, ...p } = d, r = db.collection('products').doc(); b.set(r, { custom: false, sold: false, ...p, added: Date.now() - i * 1000 }); b.set(db.doc('costs/' + r.id), { cost }) });
  b.commit().then(() => toast('Demo products loaded')).catch(fail);
}

/* ---------- Exports (CSV cells are neutralised against Excel formula injection) ---------- */
const safe = c => { c = String(c ?? ''); return /^[=+\-@\t\r]/.test(c) ? "'" + c : c };
function exportCSV() {
  const rows = [['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Payment', 'Txn ID', 'Status', 'Total PKR', 'Profit PKR']].concat(orders.map(o => [o.code, dt(o).toISOString().slice(0, 10), o.name, o.phone, o.addr, o.pay, o.txn, o.status, o.total, Math.round(oProfit(o))]));
  const blob = new Blob([rows.map(r => r.map(c => `"${safe(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'sk-jewellers-sales.csv' }).click();
}
function exportPDF() {
  const d = new jspdf.jsPDF(); d.text('SK Jewellers 1 - Sales Report', 14, 16);
  d.autoTable({ startY: 24, head: [['ID', 'Date', 'Customer', 'Pay', 'Status', 'Total', 'Profit']], body: orders.map(o => [o.code, dt(o).toISOString().slice(0, 10), o.name, o.pay, o.status, o.total, Math.round(oProfit(o))]) });
  d.save('sk-jewellers-sales.pdf');
}

document.querySelectorAll('[data-scroller]').forEach(initScroller);
renderShop(); renderCart(); reveal();
if (location.hash === '#admin') go('admin');

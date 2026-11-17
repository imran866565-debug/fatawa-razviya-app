/* Fatawa Razviya — offline reader web app (plain HTML/CSS/JS, no build step).
   Content: ../content/*.json (manifest, jild-NN, fehrist-NN, rasail, lessons,
   tashreeh/jild-NN). Served from the project root, e.g.:
   cd ~/workspace/fatawa-app && python3 -m http.server 8137  ->  /app/
*/
'use strict';

const CONTENT = '../content';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------------- helpers ---------------- */
const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ur = n => String(n).replace(/\d/g, d => URDU_DIGITS[d]);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const store = {
  get(k, d) { try { const v = localStorage.getItem('fatawa.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fatawa.' + k, JSON.stringify(v)); } catch (e) { /* storage full/blocked */ } }
};
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2600);
}
/* tashkeel-insensitive search normalisation */
function normChar(c) {
  const code = c.charCodeAt(0);
  if ((code >= 0x064B && code <= 0x065F) || code === 0x0670 || code === 0x0640) return '';
  if ('أإآٱ'.includes(c)) return 'ا';
  if (c === 'ى') return 'ی';
  if (c === 'ة') return 'ہ';
  if (c === 'ك') return 'ک'; // Arabic kaf -> Urdu kaf (book text uses ك, users type ک)
  if (c === 'ي') return 'ی'; // Arabic yeh -> Urdu yeh
  if (c === 'ؤ') return 'و';
  if (c === 'ئ') return 'ی';
  return c;
}
function normStr(s) { let o = ''; for (const c of s) o += normChar(c); return o; }
function stripTags(s) { return s.replace(/<\/?(ar|q|h|ur)>/g, ''); }

/* Render decoded text: each <ar>/<q>/<h>/<ur> span becomes its own element
   with its own font, so shaping never joins across a span boundary
   (MARKUP.md §3). Text is escaped first; only decoder tags are re-opened. */
function renderTagged(text) {
  let e = esc(text);
  e = e.replace(/&lt;(ar|q|h|ur)&gt;/g, (m, t) => '<span class="sp-' + t + '">')
       .replace(/&lt;\/(ar|q|h|ur)&gt;/g, '</span>');
  return e;
}

/* ---------------- state ---------------- */
const settings = Object.assign(
  { theme: 'light', orig: 20, tash: 17, lh: 2.1, tashreehOn: true },
  store.get('settings', {}));
let manifest = null;          // [{volume_id, volume, jild, pages, page_min, page_max, lessons, rasail, words}]
let lessonsData = null;       // [{lesson_id, volume_id, volume, jild, name, is_resala, first_page, last_page, pages}]
let rasailData = null;
let allFehrist = null;        // cached flat list for search tab
const volumeCache = {};       // volume_id -> {part, pages:[{page,lesson_id,lesson,text}], pageNos:[], byPage:{}}
const fehristCache = {};      // jild -> entries
const tashreehCache = {};     // jild -> {masail: [...]}
const searchIndexCache = {};  // volume_id -> [{page, lesson, plain, normText, map}]
let currentVolumeId = null;
let currentPage = null;
let currentPart = null;
let lastScrollTop = 0;
let splashTimer = null;
let searchTab = 'word';
let searchDebounce = null;

/* ---------------- settings ---------------- */
function applySettings() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  const r = document.documentElement.style;
  r.setProperty('--orig-size', settings.orig + 'px');
  r.setProperty('--tash-size', settings.tash + 'px');
  r.setProperty('--lh', settings.lh);
  store.set('settings', settings);
  syncSettingsUI();
}
function syncSettingsUI() {
  $$('#set-theme button').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
  $$('#sheet-content [data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
  const so = $('#set-orig'); if (so) so.value = settings.orig;
  const st = $('#set-tash'); if (st) st.value = settings.tash;
  const sl = $('#set-lh'); if (sl) sl.value = settings.lh;
  const ov = $('#set-orig-val'); if (ov) ov.textContent = ur(settings.orig);
  const tv = $('#set-tash-val'); if (tv) tv.textContent = ur(settings.tash);
  const lv = $('#set-lh-val'); if (lv) lv.textContent = ur(settings.lh.toFixed(1).replace('.', '٫'));
  const tg = $('#set-tashreeh'); if (tg) tg.classList.toggle('on', settings.tashreehOn);
  const tg2 = $('#sheet-content .toggle'); if (tg2) tg2.classList.toggle('on', settings.tashreehOn);
}
function setTheme(t) { settings.theme = t; applySettings(); }

/* ---------------- volume helpers ---------------- */
function volEntry(vid) { return (manifest || []).find(v => v.volume_id === vid) || null; }
function jildOf(vid) { const e = volEntry(vid); return e ? e.jild : null; }
function volDisplay(vid) {
  const e = volEntry(vid);
  if (!e) return 'جلد';
  if (e.jild === 1) {
    const part = e.volume.includes('Part-2') || e.volume_id === 60 ? 'دوم' : 'اول';
    return 'جلد ۱، حصہ ' + part;
  }
  return 'جلد ' + ur(e.jild);
}
function volRange(vid) {
  const e = volEntry(vid);
  if (!e) return [0, 0];
  return [e.page_min ?? e.min ?? 0, e.page_max ?? e.max ?? 0];
}
function fillVolumeSelect(sel, selectedVid) {
  sel.innerHTML = (manifest || []).map(v =>
    `<option value="${v.volume_id}"${v.volume_id === selectedVid ? ' selected' : ''}>${esc(volDisplay(v.volume_id))} · ${v.pages} صفحات</option>`).join('');
}

/* ---------------- data loading ---------------- */
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) return null;
  return res.json();
}
async function loadManifest() {
  if (manifest) return manifest;
  manifest = await fetchJSON(CONTENT + '/manifest.json');
  if (!manifest) throw new Error('manifest.json نہیں ملی');
  manifest.sort((a, b) => (a.jild - b.jild) || (a.volume_id - b.volume_id));
  return manifest;
}
async function loadLessons() {
  if (lessonsData) return lessonsData;
  lessonsData = await fetchJSON(CONTENT + '/lessons.json') || [];
  return lessonsData;
}
async function loadRasail() {
  if (rasailData) return rasailData;
  rasailData = await fetchJSON(CONTENT + '/rasail.json') || [];
  return rasailData;
}
/* Load one volume part; merges duplicate-page fragments (11 pairs in the
   book: two rows share one printed page number — render both as one page). */
async function loadVolumePart(vid) {
  if (volumeCache[vid]) return volumeCache[vid];
  const jild = jildOf(vid);
  if (!jild) throw new Error('جلد نہیں ملی');
  const file = await fetchJSON(`${CONTENT}/jild-${String(jild).padStart(2, '0')}.json`);
  if (!file) throw new Error('جلد کی فائل نہیں ملی');
  for (const part of file) {
    const merged = [];
    const byPage = {};
    for (const p of part.pages) {
      if (byPage[p.page]) {
        byPage[p.page].text += '\n' + p.text;   // fragment: append, keep first lesson
      } else {
        const entry = { page: p.page, lesson_id: p.lesson_id, lesson: p.lesson, text: p.text };
        byPage[p.page] = entry;
        merged.push(entry);
      }
    }
    merged.sort((a, b) => a.page - b.page);
    volumeCache[part.volume_id] = {
      part, pages: merged,
      pageNos: merged.map(p => p.page),
      byPage
    };
  }
  return volumeCache[vid];
}
async function loadFehrist(jild) {
  if (fehristCache[jild]) return fehristCache[jild];
  const entries = await fetchJSON(`${CONTENT}/fehrist-${String(jild).padStart(2, '0')}.json`) || [];
  fehristCache[jild] = entries;
  return entries;
}
async function loadTashreeh(jild) {
  if (tashreehCache[jild]) return tashreehCache[jild];
  const data = await fetchJSON(`${CONTENT}/tashreeh/jild-${String(jild).padStart(2, '0')}.json`);
  tashreehCache[jild] = data || { masail: [] };
  return tashreehCache[jild];
}
async function loadAllFehrist() {
  if (allFehrist) return allFehrist;
  const lists = await Promise.all(Array.from({ length: 30 }, (_, i) => loadFehrist(i + 1)));
  allFehrist = lists.flat().map(e => ({ ...e, _n: normStr(e.title || '') }));
  return allFehrist;
}

/* ---------------- router ---------------- */
const NAV_ROUTES = ['volumes', 'rasail', 'search', 'bookmarks', 'settings'];
function showView(id) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
  const route = id.replace('view-', '');
  const showNav = NAV_ROUTES.includes(route);
  $('#nav').style.display = showNav ? 'flex' : 'none';
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  window.scrollTo(0, 0);
}
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const seg = h.split('/').filter(Boolean);
  const name = seg[0] || 'volumes';
  clearTimeout(splashTimer);
  switch (name) {
    case 'splash': showView('view-splash'); break;
    case 'volumes': showVolumes(); break;
    case 'rasail': showRasail(); break;
    case 'reader': showReader(parseInt(seg[1], 10), parseInt(seg[2], 10)); break;
    case 'search': showSearch(); break;
    case 'fehrist': showFehrist(seg[1] ? parseInt(seg[1], 10) : null); break;
    case 'bookmarks': showBookmarks(seg[1] === 'notes' ? 'notes' : 'saved'); break;
    case 'settings': showSettings(); break;
    default: showVolumes();
  }
}
window.addEventListener('hashchange', route);

/* ---------------- splash ---------------- */
function showSplash() {
  showView('view-splash');
  clearTimeout(splashTimer);
  splashTimer = setTimeout(() => { if ($('#view-splash').classList.contains('active')) go('#/volumes'); }, 1400);
}
$('#view-splash').addEventListener('click', () => go('#/volumes'));

/* ---------------- volumes ---------------- */
function lastRead() { return store.get('lastread', {}); }
function saveLastRead(vid, page) {
  const lr = lastRead(); lr[vid] = page; store.set('lastread', lr);
  store.set('lastvolume', vid);
}
async function showVolumes() {
  showView('view-volumes');
  const list = $('#volumes-list');
  try {
    await loadManifest();
  } catch (e) {
    list.innerHTML = '<p class="err">مواد لاد نہیں ہو سکا۔<br>یقینی بنائیں کہ ایپ پروجیکٹ کی جڑ سے چل رہی ہے<br>(python3 -m http.server)۔</p>';
    return;
  }
  const lr = lastRead();
  const lastVid = store.get('lastvolume', null);
  let html = '';
  if (lastVid && volEntry(lastVid) && lr[lastVid]) {
    const e = volEntry(lastVid);
    html += `<div class="card" style="background:var(--tint)">
      <h3>جاری رکھیں</h3>
      <p class="sub">${esc(volDisplay(lastVid))} · صفحہ ${ur(lr[lastVid])}</p>
      <div class="prog"><i style="width:${Math.round(((lr[lastVid] - (e.page_min ?? 0)) / Math.max(1, (e.page_max ?? 1) - (e.page_min ?? 0))) * 100)}%"></i></div>
      <p class="mt8"><button class="chip" data-resume="${lastVid}">پڑھنا جاری رکھیں ←</button></p>
    </div>`;
  }
  html += manifest.map(v => {
    const [mn, mx] = volRange(v.volume_id);
    const lp = lr[v.volume_id];
    const pct = lp ? Math.round(((lp - mn) / Math.max(1, mx - mn)) * 100) : 0;
    return `<div class="volrow" data-vid="${v.volume_id}" role="button" tabindex="0">
      <span class="volnum">${v.jild === 1 ? (v.volume_id === 59 ? '۱' : '۱') : ur(v.jild)}</span>
      <div style="flex:1;min-width:0">
        <div class="vtitle">${esc(volDisplay(v.volume_id))}</div>
        <div class="vmeta"><span class="num">${v.pages}</span> صفحات · <span class="num">${v.lessons}</span> اسباق · <span class="num">${v.rasail}</span> رسائل</div>
        ${lp ? `<div class="prog"><i style="width:${pct}%"></i></div><div class="vmeta">جاری رکھیں — صفحہ ${ur(lp)} · ${ur(pct)}٪</div>` : ''}
      </div>
      <button class="chip ghost" data-fehrist="${v.volume_id}">فہرست</button>
    </div>`;
  }).join('');
  list.innerHTML = html;
  $$('[data-resume]', list).forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    const vid = +b.dataset.resume;
    go(`#/reader/${vid}/${lastRead()[vid]}`);
  }));
  $$('[data-fehrist]', list).forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation(); go('#/fehrist/' + b.dataset.fehrist);
  }));
  $$('.volrow', list).forEach(row => {
    const open = () => {
      const vid = +row.dataset.vid;
      const lp = lastRead()[vid];
      const [mn] = volRange(vid);
      go(`#/reader/${vid}/${lp || mn}`);
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
  });
  const q = $('#volumes-search');
  q.addEventListener('input', () => {
    const nq = normStr(q.value.trim());
    $$('.volrow', list).forEach(row => {
      const vid = +row.dataset.vid;
      const name = volDisplay(vid);
      row.style.display = (!nq || normStr(name).includes(nq) || String(vid).includes(q.value.trim())) ? '' : 'none';
    });
  });
}

/* ---------------- rasail ---------------- */
let rasailFilter = 'all';
async function showRasail() {
  showView('view-rasail');
  const wrap = $('#rasail-list');
  try {
    await loadManifest(); await loadLessons();
  } catch (e) {
    wrap.innerHTML = '<p class="err">مواد لاد نہیں ہو سکا۔</p>'; return;
  }
  renderRasailList();
  $('#rasail-search').addEventListener('input', renderRasailList, { once: false });
}
function renderRasailList() {
  const wrap = $('#rasail-list');
  const q = normStr(($('#rasail-search').value || '').trim());
  const lessons = (lessonsData || []).filter(l => {
    if (rasailFilter === 'rasail' && !l.is_resala) return false;
    if (rasailFilter === 'abwab' && l.is_resala) return false;
    if (q && !normStr(l.name).includes(q)) return false;
    return true;
  });
  if (!lessons.length) { wrap.innerHTML = '<p class="empty">کچھ نہیں ملا۔</p>'; return; }
  const byVol = {};
  for (const l of lessons) (byVol[l.volume_id] = byVol[l.volume_id] || []).push(l);
  let html = '';
  for (const v of manifest) {
    const rows = byVol[v.volume_id];
    if (!rows) continue;
    html += `<div class="grouphead">${esc(volDisplay(v.volume_id))} <span class="count num">${rows.length}</span></div><div class="list">`;
    for (const l of rows) {
      const rng = l.first_page ? `صفحہ ${ur(l.first_page)}${l.last_page && l.last_page !== l.first_page ? '–' + ur(l.last_page) : ''}` : 'صفحہ —';
      html += `<button class="card clickable" data-lesson="${l.lesson_id}" ${l.first_page ? '' : 'disabled'}>
        <h3>${esc(l.name)}</h3>
        <p class="sub">${esc(volDisplay(v.volume_id))} · ${rng}${l.is_resala ? ' · رسالہ' : ''}</p>
      </button>`;
    }
    html += '</div>';
  }
  wrap.innerHTML = html;
  $$('[data-lesson]', wrap).forEach(b => b.addEventListener('click', () => {
    const l = lessonsData.find(x => x.lesson_id === +b.dataset.lesson);
    if (l && l.first_page) go(`#/reader/${l.volume_id}/${l.first_page}`);
    else toast('اس سبق کا کوئی صفحہ نہیں');
  }));
}
$$('#rasail-chips button').forEach(b => b.addEventListener('click', () => {
  $$('#rasail-chips button').forEach(x => x.classList.toggle('active', x === b));
  rasailFilter = b.dataset.filter;
  renderRasailList();
}));

/* ---------------- reader ---------------- */
function pageEntry(vid, pageNo) {
  const vc = volumeCache[vid];
  if (!vc) return null;
  return vc.byPage[pageNo] || null;
}
function nearestPage(vid, pageNo) {
  const vc = volumeCache[vid];
  if (!vc || !vc.pageNos.length) return null;
  let best = vc.pageNos[0];
  for (const p of vc.pageNos) { if (p <= pageNo) best = p; else break; }
  return best;
}
async function showReader(vid, pageNo) {
  showView('view-reader');
  if (!vid || !volEntry(vid)) { vid = store.get('lastvolume', 59) || 59; }
  const scroller = $('#reader-scroll');
  $('#reader-orig').innerHTML = '<p class="loading">صفحہ لاد ہو رہا ہے…</p>';
  $('#tashreeh-wrap').innerHTML = '';
  try {
    await loadManifest();
    const vc = await loadVolumePart(vid);
    let pg = pageNo;
    if (!vc.byPage[pg]) {
      const near = nearestPage(vid, pg);
      if (near === null) throw new Error('صفحہ نہیں ملا');
      pg = near;
    }
    currentVolumeId = vid; currentPage = pg; currentPart = vc;
    const entry = vc.byPage[pg];
    const idx = vc.pageNos.indexOf(pg);
    const [mn, mx] = volRange(vid);
    $('#reader-crumb').textContent = `${volDisplay(vid)} · صفحہ ${ur(pg)}`;
    $('#reader-lesson').textContent = entry.lesson ? entry.lesson.trim() : '';
    $('#reader-orig').innerHTML = renderTagged(entry.text);
    $('#reader-page').innerHTML = `<b>${ur(pg)}</b> / ${ur(mx)}`;
    $('#reader-prev').disabled = idx <= 0;
    $('#reader-next').disabled = idx >= vc.pageNos.length - 1;
    updateBookmarkBtn();
    saveLastRead(vid, pg);
    history.replaceState(null, '', `#/reader/${vid}/${pg}`);
    scroller.scrollTop = 0;
    showChrome();
    await renderTashreeh(vid, pg);
  } catch (e) {
    $('#reader-orig').innerHTML = `<p class="err">صفحہ لاد نہیں ہو سکا۔<br>${esc(e.message || e)}</p>`;
  }
}
function updateBookmarkBtn() {
  const b = $('#reader-bookmark');
  const on = isBookmarked(currentVolumeId, currentPage);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
async function renderTashreeh(vid, pg) {
  const wrap = $('#tashreeh-wrap');
  if (!settings.tashreehOn) { wrap.innerHTML = ''; return; }
  const jild = jildOf(vid);
  const data = await loadTashreeh(jild);
  const m = (data.masail || []).find(x => (x.pages || []).includes(pg));
  if (!m) {
    wrap.innerHTML = `<div class="divider">آسان تشریح</div>
      <div class="tashreeh"><p class="t-pending">اس صفحے کی تشریح جلد آ رہی ہے</p></div>`;
    return;
  }
  if (pg === m.start_page) {
    wrap.innerHTML = `<div class="divider">آسان تشریح</div>
      <div class="tashreeh">
        <p class="t-label">سوال — آسان تشریح</p>
        <p class="t-text">${esc(m.tashreeh_sawal)}</p>
        <p class="t-label">جواب — آسان تشریح</p>
        <p class="t-text">${esc(m.tashreeh_jawab)}</p>
        ${(m.notes || []).map(n => `<p class="t-note"><b>نوٹ:</b> ${esc(n)}</p>`).join('')}
      </div>`;
  } else {
    wrap.innerHTML = `<button class="continue-chip" id="tash-continue">تشریح جاری ہے — صفحہ ${ur(m.start_page)} پر دیکھیں ←</button>`;
    $('#tash-continue').addEventListener('click', () => go(`#/reader/${vid}/${m.start_page}`));
  }
}
function readerGo(dir) {
  if (!currentPart) return;
  const idx = currentPart.pageNos.indexOf(currentPage);
  const n = currentPart.pageNos[idx + dir];
  if (n !== undefined) go(`#/reader/${currentVolumeId}/${n}`);
}
$('#reader-prev').addEventListener('click', () => readerGo(-1));
$('#reader-next').addEventListener('click', () => readerGo(1));
$('#reader-back').addEventListener('click', () => { if (history.length > 1) history.back(); else go('#/volumes'); });
$('#reader-theme').addEventListener('click', () => {
  setTheme(settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'sepia' : 'light');
  toast(settings.theme === 'light' ? 'روشن تھیم' : settings.theme === 'dark' ? 'تاریک تھیم' : 'زعفرانی تھیم');
});
$('#vol-theme-btn').addEventListener('click', () => {
  setTheme(settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'sepia' : 'light');
});
$('#reader-bookmark').addEventListener('click', () => {
  if (!currentVolumeId || !currentPage) return;
  toggleBookmark(currentVolumeId, currentPage);
  updateBookmarkBtn();
});
$('#reader-note').addEventListener('click', () => openNoteSheet(currentVolumeId, currentPage));
$('#reader-font').addEventListener('click', openFontSheet);
$('#reader-goto').addEventListener('click', openGotoSheet);
/* chrome hide on scroll + tap */
let chromeHidden = false;
function showChrome() {
  chromeHidden = false;
  $('#reader-top').classList.remove('hidden');
  $('#reader-bottom').classList.remove('hidden');
}
function hideChrome() {
  chromeHidden = true;
  $('#reader-top').classList.add('hidden');
  $('#reader-bottom').classList.add('hidden');
}
$('#reader-scroll').addEventListener('scroll', () => {
  const sc = $('#reader-scroll');
  const top = sc.scrollTop;
  if (top > lastScrollTop && top > 120 && !chromeHidden) hideChrome();
  else if (top < lastScrollTop - 10 && chromeHidden) showChrome();
  lastScrollTop = top;
}, { passive: true });
$('#reader-orig').addEventListener('click', () => { chromeHidden ? showChrome() : hideChrome(); });
/* swipe: next page = swipe left (RTL reading direction) */
let touchX = null, touchY = null;
$('#reader-scroll').addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
}, { passive: true });
$('#reader-scroll').addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  touchX = touchY = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) readerGo(1); else readerGo(-1);
  }
}, { passive: true });

/* ---------------- bookmarks & notes ---------------- */
function getBookmarks() { return store.get('bookmarks', []); }
function isBookmarked(vid, pg) { return getBookmarks().some(b => b.volume_id === vid && b.page === pg); }
function toggleBookmark(vid, pg) {
  let list = getBookmarks();
  const i = list.findIndex(b => b.volume_id === vid && b.page === pg);
  if (i >= 0) { list.splice(i, 1); toast('محفوظ شدہ سے ہٹا دیا گیا'); }
  else {
    const entry = pageEntry(vid, pg);
    list.unshift({ volume_id: vid, page: pg, lesson: entry ? entry.lesson.trim() : '', date: new Date().toISOString() });
    toast('صفحہ محفوظ ہو گیا');
  }
  store.set('bookmarks', list);
}
function getNotes() { return store.get('notes', []); }
function getNote(vid, pg) { return getNotes().find(n => n.volume_id === vid && n.page === pg) || null; }
function saveNote(vid, pg, text) {
  let list = getNotes();
  const i = list.findIndex(n => n.volume_id === vid && n.page === pg);
  const entry = pageEntry(vid, pg);
  if (!text.trim()) {
    if (i >= 0) list.splice(i, 1);
  } else if (i >= 0) {
    list[i].text = text.trim(); list[i].updated = new Date().toISOString();
  } else {
    list.unshift({ volume_id: vid, page: pg, lesson: entry ? entry.lesson.trim() : '', text: text.trim(), date: new Date().toISOString() });
  }
  store.set('notes', list);
}
function deleteNote(vid, pg) {
  store.set('notes', getNotes().filter(n => !(n.volume_id === vid && n.page === pg)));
}
function fmtDate(iso) {
  try { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; } catch (e) { return ''; }
}
function showBookmarks(tab) {
  showView('view-bookmarks');
  $$('#bm-tabs button').forEach(b => b.classList.toggle('active', b.dataset.bmtab === tab));
  $('#bm-list').classList.toggle('hidden', tab !== 'saved');
  $('#notes-list').classList.toggle('hidden', tab !== 'notes');
  if (tab === 'saved') renderBookmarks(); else renderNotes();
}
$$('#bm-tabs button').forEach(b => b.addEventListener('click', () => go('#/bookmarks' + (b.dataset.bmtab === 'notes' ? '/notes' : ''))));
function renderBookmarks() {
  const list = $('#bm-list');
  const bms = getBookmarks();
  if (!bms.length) {
    list.innerHTML = '<p class="empty">ابھی کچھ محفوظ نہیں۔<br>مطالعے والی اسکرین سے کسی بھی صفحے کو محفوظ کریں۔</p>';
    return;
  }
  const byVol = {};
  for (const b of bms) (byVol[b.volume_id] = byVol[b.volume_id] || []).push(b);
  let html = '';
  for (const v of manifest || []) {
    const rows = byVol[v.volume_id];
    if (!rows) continue;
    html += `<div class="grouphead">${esc(volDisplay(v.volume_id))}</div>`;
    for (const b of rows) {
      html += `<div class="card">
        <h3>${esc(b.lesson || 'صفحہ ' + ur(b.page))}</h3>
        <p class="sub">${esc(volDisplay(b.volume_id))} · صفحہ ${ur(b.page)} · ${fmtDate(b.date)}</p>
        <p class="btnrow mt8">
          <button class="btn ghost" data-open="${b.volume_id}/${b.page}">کھولیں</button>
          <button class="btn danger" data-del="${b.volume_id}/${b.page}">حذف کریں</button>
        </p>
      </div>`;
    }
  }
  list.innerHTML = html;
  $$('[data-open]', list).forEach(x => x.addEventListener('click', () => {
    const [vid, pg] = x.dataset.open.split('/').map(Number);
    go(`#/reader/${vid}/${pg}`);
  }));
  $$('[data-del]', list).forEach(x => x.addEventListener('click', () => {
    const [vid, pg] = x.dataset.del.split('/').map(Number);
    store.set('bookmarks', getBookmarks().filter(b => !(b.volume_id === vid && b.page === pg)));
    toast('حذف کر دیا گیا'); renderBookmarks();
    if (currentVolumeId === vid && currentPage === pg) updateBookmarkBtn();
  }));
}
function renderNotes() {
  const list = $('#notes-list');
  const notes = getNotes();
  if (!notes.length) {
    list.innerHTML = '<p class="empty">ابھی کوئی نوٹ نہیں۔<br>مطالعے والی اسکرین سے کسی بھی صفحے پر نوٹ لکھیں۔</p>';
    return;
  }
  list.innerHTML = notes.map(n => `<div class="card">
    <h3>${esc(n.lesson || 'صفحہ ' + ur(n.page))}</h3>
    <p class="sub">${esc(volDisplay(n.volume_id))} · صفحہ ${ur(n.page)} · ${fmtDate(n.updated || n.date)}</p>
    <p class="mt8 nastaliq" style="font-size:16px;line-height:2;white-space:pre-line">${esc(n.text)}</p>
    <p class="btnrow mt8">
      <button class="btn ghost" data-edit="${n.volume_id}/${n.page}">تبدیل کریں</button>
      <button class="btn ghost" data-share="${n.volume_id}/${n.page}">بانٹیں</button>
      <button class="btn danger" data-delnote="${n.volume_id}/${n.page}">حذف کریں</button>
    </p>
  </div>`).join('');
  $$('[data-edit]', list).forEach(x => x.addEventListener('click', () => {
    const [vid, pg] = x.dataset.edit.split('/').map(Number);
    openNoteSheet(vid, pg, true);
  }));
  $$('[data-share]', list).forEach(x => x.addEventListener('click', async () => {
    const [vid, pg] = x.dataset.share.split('/').map(Number);
    const n = getNote(vid, pg);
    if (!n) return;
    const text = `${n.lesson || ''}\n${volDisplay(vid)} · صفحہ ${ur(pg)}\n\n${n.text}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('نوٹ نقل ہو گیا'); }
    } catch (e) { /* share dismissed */ }
  }));
  $$('[data-delnote]', list).forEach(x => x.addEventListener('click', () => {
    const [vid, pg] = x.dataset.delnote.split('/').map(Number);
    if (confirm('یہ نوٹ حذف کر دیا جائے؟')) { deleteNote(vid, pg); toast('نوٹ حذف کر دیا گیا'); renderNotes(); }
  }));
}

/* ---------------- search ---------------- */
function buildSearchIndex(vid) {
  if (searchIndexCache[vid]) return searchIndexCache[vid];
  const vc = volumeCache[vid];
  const idx = vc.pages.map(p => {
    const plain = stripTags(p.text);
    let normText = '';
    const map = new Array(plain.length);
    for (let i = 0; i < plain.length; i++) {
      const nc = normChar(plain[i]);
      map[i] = nc ? normText.length : -1;
      normText += nc;
    }
    return { page: p.page, lesson: p.lesson, plain, normText, map };
  });
  searchIndexCache[vid] = idx;
  return idx;
}
function searchInVolume(vid, query, limit) {
  const nq = normStr(query);
  if (!nq) return [];
  const idx = buildSearchIndex(vid);
  const out = [];
  for (const p of idx) {
    const at = p.normText.indexOf(nq);
    if (at === -1) continue;
    let pStart = p.map.findIndex(v => v === at);
    if (pStart === -1) pStart = 0;
    let pEnd = pStart;
    for (let i = pStart; i < p.map.length; i++) {
      if (p.map[i] !== -1 && p.map[i] < at + nq.length) pEnd = i + 1;
      else if (p.map[i] !== -1 && p.map[i] >= at + nq.length) break;
    }
    const s0 = Math.max(0, pStart - 45), s1 = Math.min(p.plain.length, pEnd + 70);
    const before = p.plain.slice(s0, pStart), match = p.plain.slice(pStart, pEnd), after = p.plain.slice(pEnd, s1);
    out.push({
      page: p.page, lesson: p.lesson,
      html: `${s0 > 0 ? '…' : ''}${esc(before)}<mark>${esc(match)}</mark>${esc(after)}${s1 < p.plain.length ? '…' : ''}`
    });
    if (out.length >= (limit || 50)) break;
  }
  return out;
}
async function showSearch() {
  showView('view-search');
  try { await loadManifest(); } catch (e) { /* search needs manifest for volume names */ }
  const sel = $('#search-vol');
  if (!sel.options.length && manifest) fillVolumeSelect(sel, store.get('lastvolume', 59) || 59);
  $('#search-vol-row').style.display = searchTab === 'word' ? '' : 'none';
  $('#search-hint').style.display = searchTab === 'word' ? '' : 'none';
  renderRecent();
}
$$('#search-tabs button').forEach(b => b.addEventListener('click', () => {
  $$('#search-tabs button').forEach(x => x.classList.toggle('active', x === b));
  searchTab = b.dataset.tab;
  $('#search-vol-row').style.display = searchTab === 'word' ? '' : 'none';
  $('#search-hint').style.display = searchTab === 'word' ? '' : 'none';
  $('#search-results').innerHTML = '';
  runSearch();
}));
$('#search-input').addEventListener('input', () => {
  $('#search-clear').classList.toggle('hidden', !$('#search-input').value);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 300);
});
$('#search-clear').addEventListener('click', () => {
  $('#search-input').value = '';
  $('#search-clear').classList.add('hidden');
  $('#search-results').innerHTML = '';
});
$('#search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearTimeout(searchDebounce); runSearch(true); }
});
$('#search-vol').addEventListener('change', runSearch);
$('#search-recent-clear').addEventListener('click', () => { store.set('recent', []); renderRecent(); });
function renderRecent() {
  const r = store.get('recent', []);
  const wrap = $('#search-recent');
  wrap.innerHTML = r.length
    ? r.map(q => `<button class="chip ghost" data-q="${esc(q)}">${esc(q)}</button>`).join('')
    : '<span class="muted small">ابھی کوئی حالیہ تلاش نہیں</span>';
  $$('[data-q]', wrap).forEach(b => b.addEventListener('click', () => {
    $('#search-input').value = b.dataset.q;
    $('#search-clear').classList.remove('hidden');
    runSearch(true);
  }));
}
function pushRecent(q) {
  q = q.trim();
  if (!q) return;
  let r = store.get('recent', []).filter(x => x !== q);
  r.unshift(q); r = r.slice(0, 8);
  store.set('recent', r); renderRecent();
}
async function runSearch(commit) {
  const q = ($('#search-input').value || '').trim();
  const box = $('#search-results');
  if (q.length < 2) { box.innerHTML = ''; return; }
  if (commit) pushRecent(q);
  if (searchTab === 'word') {
    const vid = +$('#search-vol').value || 59;
    box.innerHTML = '<p class="loading">تلاش ہو رہی ہے…</p>';
    try {
      await loadVolumePart(vid);
      const res = searchInVolume(vid, q, 50);
      if (!res.length) { box.innerHTML = `<p class="empty">اس جلد میں "${esc(q)}" نہیں ملا۔<br>دوسری جلد منتخب کر کے دوبارہ تلاش کریں۔</p>`; return; }
      box.innerHTML = res.map(r => `<button class="result" data-go="${vid}/${r.page}">
        <span class="rtext">${r.html}<span class="rmeta">${esc((r.lesson || '').trim())} · ${esc(volDisplay(vid))}</span></span>
        <span class="pgnum">${r.page}</span>
      </button>`).join('');
      bindResultButtons(box);
    } catch (e) {
      box.innerHTML = `<p class="err">تلاش نہیں ہو سکی۔<br>${esc(e.message || e)}</p>`;
    }
  } else if (searchTab === 'lesson') {
    await loadLessons();
    const nq = normStr(q);
    const res = lessonsData.filter(l => normStr(l.name).includes(nq)).slice(0, 50);
    if (!res.length) { box.innerHTML = '<p class="empty">کوئی سبق یا رسالہ نہیں ملا۔</p>'; return; }
    box.innerHTML = res.map(l => `<button class="result" data-go="${l.volume_id}/${l.first_page || ''}" ${l.first_page ? '' : 'disabled'}>
      <span class="rtext">${esc(l.name)}<span class="rmeta">${esc(volDisplay(l.volume_id))}${l.first_page ? ' · صفحہ ' + ur(l.first_page) : ''}${l.is_resala ? ' · رسالہ' : ''}</span></span>
      <span class="pgnum">${l.first_page || '—'}</span>
    </button>`).join('');
    bindResultButtons(box);
  } else {
    box.innerHTML = '<p class="loading">فہرست لادی جا رہی ہے…</p>';
    const all = await loadAllFehrist();
    const nq = normStr(q);
    const res = all.filter(e => e._n.includes(nq)).slice(0, 50);
    if (!res.length) { box.innerHTML = '<p class="empty">فہرست میں کچھ نہیں ملا۔</p>'; return; }
    box.innerHTML = res.map(e => `<button class="result" data-go="${e.volume_id}/${e.page}">
      <span class="rtext">${esc(e.title)}<span class="rmeta">${esc(volDisplay(e.volume_id))}</span></span>
      <span class="pgnum">${e.page}</span>
    </button>`).join('');
    bindResultButtons(box);
  }
}
function bindResultButtons(box) {
  $$('[data-go]', box).forEach(b => b.addEventListener('click', () => {
    const [vid, pg] = b.dataset.go.split('/');
    if (pg) go(`#/reader/${vid}/${pg}`);
  }));
}

/* ---------------- fehrist ---------------- */
async function showFehrist(vid) {
  showView('view-fehrist');
  try { await loadManifest(); } catch (e) { /* handled below */ }
  const sel = $('#fehrist-vol');
  if (!sel.options.length && manifest) fillVolumeSelect(sel, vid || store.get('lastvolume', 59) || 59);
  if (vid && sel.value !== String(vid)) sel.value = String(vid);
  sel.addEventListener('change', () => renderFehrist(+sel.value));
  renderFehrist(+sel.value || 59);
}
async function renderFehrist(vid) {
  const wrap = $('#fehrist-list');
  wrap.innerHTML = '<p class="loading">فہرست لادی جا رہی ہے…</p>';
  try {
    const jild = jildOf(vid);
    const entries = (await loadFehrist(jild)).filter(e => e.volume_id === vid);
    const part = await loadVolumePart(vid);
    const pageLesson = {};
    for (const p of part.pages) pageLesson[p.page] = (p.lesson || '').trim();
    const q = normStr(($('#fehrist-search').value || '').trim());
    const shown = entries.filter(e => !q || normStr(e.title || '').includes(q));
    if (!shown.length) { wrap.innerHTML = '<p class="empty">فہرست میں کچھ نہیں ملا۔</p>'; return; }
    const groups = [];
    const byLesson = {};
    for (const e of shown) {
      const lesson = pageLesson[e.page] || 'متفرق';
      if (!byLesson[lesson]) { byLesson[lesson] = []; groups.push(lesson); }
      byLesson[lesson].push(e);
    }
    wrap.innerHTML = groups.map((g, gi) => `
      <div class="grouphead"><button data-g="${gi}" aria-expanded="true">
        <span style="flex:1;text-align:right">${esc(g)}</span>
        <span class="count num">${byLesson[g].length}</span>
        <span aria-hidden="true">▾</span>
      </button></div>
      <div class="list" id="fg-${gi}">
        ${byLesson[g].map(e => `<button class="result" data-go="${vid}/${e.page}">
          <span class="rtext">${esc(e.title)}</span>
          <span class="pgnum">${e.page}</span>
        </button>`).join('')}
      </div>`).join('');
    $$('[data-g]', wrap).forEach(b => b.addEventListener('click', () => {
      const body = $('#fg-' + b.dataset.g);
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : '';
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      b.querySelector('span[aria-hidden]').textContent = open ? '▸' : '▾';
    }));
    bindResultButtons(wrap);
  } catch (e) {
    wrap.innerHTML = `<p class="err">فہرست لاد نہیں ہو سکی۔<br>${esc(e.message || e)}</p>`;
  }
}
$('#fehrist-search').addEventListener('input', () => {
  const sel = $('#fehrist-vol');
  if (sel.value) renderFehrist(+sel.value);
});
$('#fehrist-back').addEventListener('click', () => { if (history.length > 1) history.back(); else go('#/volumes'); });

/* ---------------- settings view ---------------- */
function showSettings() {
  showView('view-settings');
  if (manifest) {
    const totalPages = manifest.reduce((a, v) => a + v.pages, 0);
    const totalWords = manifest.reduce((a, v) => a + v.words, 0);
    $('#set-stats').textContent = `تمام جلدیں فون میں محفوظ ہیں — ${ur(31)} حصے · ${ur(totalPages)} صفحات · تقریباً ${ur(Math.round(totalWords / 100000) / 10)} ملین الفاظ · انٹرنیٹ کی ضرورت نہیں`;
  }
}
$$('#set-theme button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
$('#set-orig').addEventListener('input', e => { settings.orig = +e.target.value; applySettings(); });
$('#set-tash').addEventListener('input', e => { settings.tash = +e.target.value; applySettings(); });
$('#set-lh').addEventListener('input', e => { settings.lh = +e.target.value; applySettings(); });
$('#set-tashreeh').addEventListener('click', () => {
  settings.tashreehOn = !settings.tashreehOn; applySettings();
  if (currentVolumeId && currentPage) renderTashreeh(currentVolumeId, currentPage);
});

/* ---------------- bottom sheets ---------------- */
function openSheet(html) {
  $('#sheet-content').innerHTML = html;
  $('#sheet-backdrop').classList.add('open');
  $('#sheet').classList.add('open');
}
function closeSheet() {
  $('#sheet-backdrop').classList.remove('open');
  $('#sheet').classList.remove('open');
}
$('#sheet-backdrop').addEventListener('click', closeSheet);
function openFontSheet() {
  openSheet(`<h3>فونٹ اور تھیم</h3>
    <div class="row"><label>تھیم</label>
      <div class="seg" id="sheet-theme">
        <button data-theme="light">روشن</button>
        <button data-theme="dark">تاریک</button>
        <button data-theme="sepia">زعفرانی</button>
      </div>
    </div>
    <div class="row"><label>اصل متن کا فونٹ — <span id="sh-orig-val">${ur(settings.orig)}</span></label>
      <input type="range" id="sh-orig" min="16" max="28" step="1" value="${settings.orig}"></div>
    <div class="row"><label>تشریح کا فونٹ — <span id="sh-tash-val">${ur(settings.tash)}</span></label>
      <input type="range" id="sh-tash" min="14" max="24" step="1" value="${settings.tash}"></div>
    <div class="row"><label>لائن کی اونچائی — <span id="sh-lh-val">${ur(settings.lh.toFixed(1).replace('.', '٫'))}</span></label>
      <input type="range" id="sh-lh" min="1.9" max="2.4" step="0.1" value="${settings.lh}"></div>
    <div class="row"><div class="setrow" style="margin:0"><div class="st"><b>آسان تشریح دکھائیں</b></div>
      <button class="toggle ${settings.tashreehOn ? 'on' : ''}" id="sh-tashreeh"></button></div></div>
    <p class="btnrow"><button class="btn block" id="sh-done">ہو گیا</button></p>`);
  syncSettingsUI();
  $$('#sheet-theme button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  $('#sh-orig').addEventListener('input', e => { settings.orig = +e.target.value; $('#sh-orig-val').textContent = ur(settings.orig); applySettings(); });
  $('#sh-tash').addEventListener('input', e => { settings.tash = +e.target.value; $('#sh-tash-val').textContent = ur(settings.tash); applySettings(); });
  $('#sh-lh').addEventListener('input', e => { settings.lh = +e.target.value; $('#sh-lh-val').textContent = ur(settings.lh.toFixed(1).replace('.', '٫')); applySettings(); });
  $('#sh-tashreeh').addEventListener('click', () => {
    settings.tashreehOn = !settings.tashreehOn; applySettings();
    if (currentVolumeId && currentPage) renderTashreeh(currentVolumeId, currentPage);
  });
  $('#sh-done').addEventListener('click', closeSheet);
}
function openGotoSheet() {
  const [mn, mx] = volRange(currentVolumeId);
  openSheet(`<h3>صفحے پر جائیں</h3>
    <div class="row"><label>جلد</label>
      <select id="goto-vol">${(manifest || []).map(v => `<option value="${v.volume_id}"${v.volume_id === currentVolumeId ? ' selected' : ''}>${esc(volDisplay(v.volume_id))}</option>`).join('')}</select></div>
    <div class="row"><label>صفحہ نمبر (${ur(mn)} – ${ur(mx)})</label>
      <input type="number" id="goto-page" min="${mn}" max="${mx}" value="${currentPage}"></div>
    <p class="btnrow">
      <button class="btn" id="goto-jump">جائیں</button>
      <button class="btn ghost" id="goto-first">پہلا صفحہ</button>
      <button class="btn ghost" id="goto-last">آخری صفحہ</button>
    </p>`);
  const jump = pg => {
    const vid = +$('#goto-vol').value;
    const [a, b] = volRange(vid);
    pg = Math.max(a, Math.min(b, pg || a));
    closeSheet();
    go(`#/reader/${vid}/${pg}`);
  };
  $('#goto-jump').addEventListener('click', () => jump(+$('#goto-page').value));
  $('#goto-page').addEventListener('keydown', e => { if (e.key === 'Enter') jump(+e.target.value); });
  $('#goto-first').addEventListener('click', () => jump(volRange(+$('#goto-vol').value)[0]));
  $('#goto-last').addEventListener('click', () => jump(volRange(+$('#goto-vol').value)[1]));
  $('#goto-vol').addEventListener('change', () => {
    const [a, b] = volRange(+$('#goto-vol').value);
    const inp = $('#goto-page');
    inp.min = a; inp.max = b; inp.value = a;
    inp.previousElementSibling.textContent = `صفحہ نمبر (${ur(a)} – ${ur(b)})`;
  });
}
function openNoteSheet(vid, pg, fromNotes) {
  const n = getNote(vid, pg);
  const entry = pageEntry(vid, pg);
  openSheet(`<h3>نوٹ — ${esc(volDisplay(vid))} · صفحہ ${ur(pg)}</h3>
    <p class="small muted">${esc(entry ? (entry.lesson || '').trim() : '')}</p>
    <div class="row mt8"><textarea id="note-text" placeholder="اپنا نوٹ یہاں لکھیں…">${esc(n ? n.text : '')}</textarea></div>
    <p class="btnrow">
      <button class="btn" id="note-save">محفوظ کریں</button>
      ${n ? '<button class="btn danger" id="note-del">حذف کریں</button>' : ''}
      <button class="btn ghost" id="note-cancel">منسوخ</button>
    </p>`);
  $('#note-save').addEventListener('click', () => {
    saveNote(vid, pg, $('#note-text').value);
    toast($('#note-text').value.trim() ? 'نوٹ محفوظ ہو گیا' : 'نوٹ حذف کر دیا گیا');
    closeSheet();
    if (fromNotes) renderNotes();
  });
  const del = $('#note-del');
  if (del) del.addEventListener('click', () => {
    deleteNote(vid, pg); toast('نوٹ حذف کر دیا گیا'); closeSheet();
    if (fromNotes) renderNotes();
  });
  $('#note-cancel').addEventListener('click', closeSheet);
}

/* ---------------- init ---------------- */
async function init() {
  applySettings();
  try {
    await loadManifest();
    const totalRasail = manifest.reduce((a, v) => a + v.rasail, 0);
    const totalPages = manifest.reduce((a, v) => a + v.pages, 0);
    $('#splash-counts').textContent = `۳۰ جلدیں · ${ur(totalRasail)} رسائل · ${ur(totalPages)} صفحات · مکمل آف لائن`;
  } catch (e) {
    $('#splash-counts').textContent = 'مواد لاد نہیں ہو سکا — HTTP سے چلائیں';
  }
  if (location.hash && location.hash !== '#/splash') route();
  else { showSplash(); }
}
document.addEventListener('visibilitychange', () => { /* keep state fresh; nothing to do */ });
init();

/* Fatawa Razviya — offline reader web app (plain HTML/CSS/JS, no build step).
   Content: ../content/*.json (manifest, jild-NN, fehrist-NN, rasail, lessons,
   tashreeh/jild-NN). Served from the project root, e.g.:
   cd ~/workspace/fatawa-app && python3 -m http.server 8137  ->  /app/

   In the Android APK the same files are served by WebViewAssetLoader over
   https://appassets.androidplatform.net/assets/ — fetch() from a file://
   page is blocked in current Android WebView, which is why v1.1.0 showed
   "content could not be loaded" on the phone. See MainActivity.java.
   UI language: Urdu (default, RTL) or English (LTR) — book text stays Urdu.
*/
'use strict';

const CONTENT = '../content';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------------- language (Urdu / English) ---------------- */
let lang = 'ur';
try { const savedLang = localStorage.getItem('fatawa.lang'); if (savedLang === 'en' || savedLang === 'ur') lang = savedLang; } catch (e) { /* storage blocked */ }
const I18N = {
  ur: {
    appTitle: 'فتاویٰ رضویہ',
    appSubtitle: 'اصل متن اوپر، آسان تشریح نیچے',
    tapToContinue: 'آگے بڑھنے کے لیے تھپتھپائیں',
    author: 'اعلیٰ حضرت امام احمد رضا خان قادری رحمۃ اللہ علیہ',
    navVolumes: 'جلدیں', navRasail: 'رسائل', navSearch: 'تلاش', navSaved: 'محفوظ', navSettings: 'ترتیبات',
    volumesTitle: 'فتاویٰ رضویہ',
    rasailTitle: 'رسائل اور اسباق',
    searchTitle: 'تلاش',
    fehristTitle: 'فہرست',
    savedTitle: 'محفوظ شدہ',
    settingsTitle: 'ترتیبات',
    searchVolumesPh: 'تلاش کریں…',
    searchRasailPh: 'رسالے یا سبق میں تلاش کریں…',
    searchPh: 'لفظ، سبق یا فہرست تلاش کریں…',
    fehristPh: 'فہرست میں تلاش کریں…',
    filterAll: 'سب', filterRasail: 'رسائل', filterAbwab: 'ابواب',
    tabWord: 'لفظ سے', tabLesson: 'سبق / رسالہ سے', tabFehrist: 'فہرست سے',
    tabSaved: 'محفوظ صفحات', tabNotes: 'میرے نوٹ',
    continueReading: 'جاری رکھیں',
    resumeBtn: 'پڑھنا جاری رکھیں',
    pagesWord: 'صفحات', lessonsWord: 'اسباق', rasailWord: 'رسائل',
    fehristBtn: 'فہرست',
    continuePage: 'جاری رکھیں — صفحہ',
    loadingVolumes: 'جلدیں لادی جا رہی ہیں…',
    loadingRasail: 'فہرست لادی جا رہی ہے…',
    loadingPage: 'صفحہ لاد ہو رہا ہے…',
    loadingFehrist: 'فہرست لادی جا رہی ہے…',
    loadFail: 'مواد لاد نہیں ہو سکا۔',
    loadFailRetry: 'ایپ بند کر کے دوبارہ کھولیں۔',
    pageNotFound: 'صفحہ نہیں ملا',
    volumeNotFound: 'جلد نہیں ملی',
    volumeFileNotFound: 'جلد کی فائل نہیں ملی',
    manifestNotFound: 'فہرست نہیں ملی',
    nothingFound: 'کچھ نہیں ملا۔',
    noVolSelected: 'کوئی جلد منتخب نہیں — پہلے کسی جلد پر نشان لگائیں۔',
    pageLabel: 'صفحہ',
    risalaLabel: 'رسالہ',
    lessonNoPage: 'اس سبق کا کوئی صفحہ نہیں',
    easyTashreeh: 'آسان تشریح',
    qEasy: 'سوال — آسان تشریح',
    aEasy: 'جواب — آسان تشریح',
    noteLabel: 'نوٹ:',
    tashPending: 'اس صفحے کی تشریح جلد آ رہی ہے',
    tashContinue: 'تشریح جاری ہے — صفحہ {p} پر دیکھیں',
    searching: 'تلاش ہو رہی ہے…',
    searchFail: 'تلاش نہیں ہو سکی۔',
    noLessonFound: 'کوئی سبق یا رسالہ نہیں ملا۔',
    noFehristFound: 'فہرست میں کچھ نہیں ملا۔',
    fehristFail: 'فہرست لاد نہیں ہو سکی۔',
    miscGroup: 'متفرق',
    recentTitle: 'حالیہ تلاش',
    noRecent: 'ابھی کوئی حالیہ تلاش نہیں',
    clearRecent: 'حالیہ تلاش صاف کریں',
    savedEmpty: 'ابھی کچھ محفوظ نہیں۔',
    savedEmptyHint: 'مطالعے والی اسکرین سے کسی بھی صفحے کو محفوظ کریں۔',
    notesEmpty: 'ابھی کوئی نوٹ نہیں۔',
    notesEmptyHint: 'مطالعے والی اسکرین سے کسی بھی صفحے پر نوٹ لکھیں۔',
    openBtn: 'کھولیں', deleteBtn: 'حذف کریں', editBtn: 'تبدیل کریں', shareBtn: 'بانٹیں',
    confirmDeleteNote: 'یہ نوٹ حذف کر دیا جائے؟',
    bookmarkSaved: 'صفحہ محفوظ ہو گیا',
    bookmarkRemoved: 'محفوظ شدہ سے ہٹا دیا گیا',
    deleted: 'حذف کر دیا گیا',
    noteSaved: 'نوٹ محفوظ ہو گیا',
    noteDeleted: 'نوٹ حذف کر دیا گیا',
    noteCopied: 'نوٹ نقل ہو گیا',
    themeLight: 'روشن تھیم', themeDark: 'تاریک تھیم', themeSepia: 'زعفرانی تھیم',
    fontTheme: 'فونٹ اور تھیم',
    themeLabel: 'تھیم', themeHint: 'روشن، تاریک یا زعفرانی', lightLabel: 'روشن', darkLabel: 'تاریک', sepiaLabel: 'زعفرانی',
    origFont: 'اصل متن کا فونٹ', tashFont: 'تشریح کا فونٹ', lineHeight: 'لائن کی اونچائی',
    origFontRange: '۱۶ – ۲۸', tashFontRange: '۱۴ – ۲۴', lhRange: '۱٫۹ – ۲٫۴',
    nowLabel: 'ابھی',
    showTashreeh: 'آسان تشریح دکھائیں',
    tashreehOffHint: 'بند کریں تو صرف اصل متن پڑھیں',
    doneBtn: 'ہو گیا',
    gotoPage: 'صفحے پر جائیں',
    volumeLabel: 'جلد',
    pageNumber: 'صفحہ نمبر',
    goBtn: 'جائیں', firstPage: 'پہلا صفحہ', lastPage: 'آخری صفحہ',
    noteTitle: 'نوٹ',
    notePh: 'اپنا نوٹ یہاں لکھیں…',
    saveBtn: 'محفوظ کریں', cancelBtn: 'منسوخ',
    settingsReading: 'مطالعہ',
    settingsLanguage: 'زبان',
    settingsLanguageHint: 'اردو یا انگریزی — کتاب کا متن اردو ہی رہے گا',
    settingsData: 'ڈیٹا',
    offlineAvailable: 'آف لائن دستیاب',
    offlineStats: 'تمام جلدیں فون میں محفوظ ہیں — {parts} حصے · {pages} صفحات · تقریباً {words} ملین الفاظ · انٹرنیٹ کی ضرورت نہیں',
    offlineChip: '✓ آف لائن',
    settingsAbout: 'تعارف',
    aboutApp: 'فتاویٰ رضویہ — آسان اردو ایپ',
    aboutVersion: 'نسخہ 1.1.2',
    aboutTextTitle: 'متن',
    aboutText: 'اعلیٰ حضرت امام احمد رضا خان قادری رحمۃ اللہ علیہ — دعوتِ اسلامی ایڈیشن سے ماخوذ اصل متن۔ آسان تشریح نئی تحریر ہے، اعلیٰ حضرت کے الفاظ نہیں — وہ ہمیشہ "آسان تشریح" کے عنوان سے الگ دکھائی جاتی ہے۔',
    aboutPrivacyTitle: 'پرائیویسی',
    aboutPrivacy: 'کوئی اکاؤنٹ نہیں، کوئی ٹریکنگ نہیں، کوئی اشتہار نہیں۔ آپ کے محفوظ صفحات اور نوٹ صرف اسی آلے پر رہتے ہیں۔',
    splashCounts: '{v} جلدیں · {r} رسائل · {p} صفحات · مکمل آف لائن',
    searchModeWords: 'مختلف الفاظ سرچ کیجئے',
    searchModePhrase: 'مکمل جملہ سرچ کیجئے',
    scopeVolumes: 'جلدیں',
    scopeRasail: 'رسائل',
    rangeAll: 'تمام جلدوں میں سرچ',
    rangeSelected: 'منتخب جلدوں میں سرچ',
    searchGo: 'تلاش کریں',
    searchHint: 'لفظ یا جملہ لکھیں، پھر تلاش کریں دبائیں۔',
    selectAllVols: 'سب منتخب کریں',
    clearAllVols: 'سب ہٹائیں',
    resultsFound: '{n} نتائج ملے',
    showingFirst: 'پہلے {n} دکھائے جا رہے ہیں',
    showMore: 'مزید دکھائیں',
    searchingVol: 'تلاش ہو رہی ہے… ({cur}/{total})',
    backBtn: 'واپس',
    themeBtn: 'تھیم بدلیں',
    prevPage: 'پچھلا صفحہ',
    nextPage: 'اگلا صفحہ',
    bookmarkBtn: 'محفوظ کریں',
    noteBtn: 'نوٹ لکھیں',
    fontBtn: 'فونٹ اور تھیم',
    gotoBtn: 'صفحے پر جائیں'
  },
  en: {
    appTitle: 'Fatawa Razviya',
    appSubtitle: 'Original text above, easy explanation below',
    tapToContinue: 'Tap to continue',
    author: 'Ala Hazrat Imam Ahmad Raza Khan Qadri (may Allah have mercy on him)',
    navVolumes: 'Volumes', navRasail: 'Booklets', navSearch: 'Search', navSaved: 'Saved', navSettings: 'Settings',
    volumesTitle: 'Fatawa Razviya',
    rasailTitle: 'Booklets & Lessons',
    searchTitle: 'Search',
    fehristTitle: 'Contents',
    savedTitle: 'Saved',
    settingsTitle: 'Settings',
    searchVolumesPh: 'Search…',
    searchRasailPh: 'Search a booklet or lesson…',
    searchPh: 'Search a word, lesson or contents…',
    fehristPh: 'Search the contents…',
    filterAll: 'All', filterRasail: 'Booklets', filterAbwab: 'Chapters',
    tabWord: 'By word', tabLesson: 'By lesson / booklet', tabFehrist: 'By contents',
    tabSaved: 'Saved pages', tabNotes: 'My notes',
    continueReading: 'Continue',
    resumeBtn: 'Continue reading',
    pagesWord: 'pages', lessonsWord: 'lessons', rasailWord: 'booklets',
    fehristBtn: 'Contents',
    continuePage: 'Continue — page',
    loadingVolumes: 'Loading volumes…',
    loadingRasail: 'Loading list…',
    loadingPage: 'Loading page…',
    loadingFehrist: 'Loading contents…',
    loadFail: 'Content could not be loaded.',
    loadFailRetry: 'Please close and reopen the app.',
    pageNotFound: 'Page not found',
    volumeNotFound: 'Volume not found',
    volumeFileNotFound: 'Volume file not found',
    manifestNotFound: 'Contents list not found',
    nothingFound: 'Nothing found.',
    noVolSelected: 'No volume selected — tick a volume first.',
    pageLabel: 'Page',
    risalaLabel: 'Booklet',
    lessonNoPage: 'This lesson has no page',
    easyTashreeh: 'Easy explanation',
    qEasy: 'Question — easy explanation',
    aEasy: 'Answer — easy explanation',
    noteLabel: 'Note:',
    tashPending: 'The explanation for this page is coming soon',
    tashContinue: 'Explanation continues — see page {p}',
    searching: 'Searching…',
    searchFail: 'Search failed.',
    noLessonFound: 'No lesson or booklet found.',
    noFehristFound: 'Nothing found in the contents.',
    fehristFail: 'Contents could not be loaded.',
    miscGroup: 'Miscellaneous',
    recentTitle: 'Recent searches',
    noRecent: 'No recent searches yet',
    clearRecent: 'Clear recent searches',
    savedEmpty: 'Nothing saved yet.',
    savedEmptyHint: 'Save any page from the reading screen.',
    notesEmpty: 'No notes yet.',
    notesEmptyHint: 'Write a note on any page from the reading screen.',
    openBtn: 'Open', deleteBtn: 'Delete', editBtn: 'Edit', shareBtn: 'Share',
    confirmDeleteNote: 'Delete this note?',
    bookmarkSaved: 'Page saved',
    bookmarkRemoved: 'Removed from saved',
    deleted: 'Deleted',
    noteSaved: 'Note saved',
    noteDeleted: 'Note deleted',
    noteCopied: 'Note copied',
    themeLight: 'Light theme', themeDark: 'Dark theme', themeSepia: 'Sepia theme',
    fontTheme: 'Font & Theme',
    themeLabel: 'Theme', themeHint: 'Light, dark or sepia', lightLabel: 'Light', darkLabel: 'Dark', sepiaLabel: 'Sepia',
    origFont: 'Original text font', tashFont: 'Explanation font', lineHeight: 'Line height',
    origFontRange: '16 – 28', tashFontRange: '14 – 24', lhRange: '1.9 – 2.4',
    nowLabel: 'now',
    showTashreeh: 'Show easy explanation',
    tashreehOffHint: 'Off shows only the original text',
    doneBtn: 'Done',
    gotoPage: 'Go to page',
    volumeLabel: 'Volume',
    pageNumber: 'Page number',
    goBtn: 'Go', firstPage: 'First page', lastPage: 'Last page',
    noteTitle: 'Note',
    notePh: 'Write your note here…',
    saveBtn: 'Save', cancelBtn: 'Cancel',
    settingsReading: 'Reading',
    settingsLanguage: 'Language',
    settingsLanguageHint: 'Urdu or English — the book text stays in Urdu',
    settingsData: 'Data',
    offlineAvailable: 'Available offline',
    offlineStats: 'All volumes are saved on the phone — {parts} parts · {pages} pages · about {words} million words · no internet needed',
    offlineChip: '✓ Offline',
    settingsAbout: 'About',
    aboutApp: 'Fatawa Razviya — Easy Urdu app',
    aboutVersion: 'Version 1.1.2',
    aboutTextTitle: 'Text',
    aboutText: 'The original text of Ala Hazrat Imam Ahmad Raza Khan Qadri (may Allah have mercy on him), from the Dawate Islami edition. The easy explanation is a new writing, not Ala Hazrat’s own words — it is always shown separately under the heading “Easy explanation”.',
    aboutPrivacyTitle: 'Privacy',
    aboutPrivacy: 'No account, no tracking, no ads. Your saved pages and notes stay only on this device.',
    splashCounts: '{v} volumes · {r} booklets · {p} pages · fully offline',
    searchModeWords: 'Search different words',
    searchModePhrase: 'Search the complete sentence',
    scopeVolumes: 'Volumes',
    scopeRasail: 'Booklets',
    rangeAll: 'Search in all volumes',
    rangeSelected: 'Search in selected volumes',
    searchGo: 'Search',
    searchHint: 'Type a word or sentence, then press Search.',
    selectAllVols: 'Select all',
    clearAllVols: 'Clear all',
    resultsFound: '{n} results found',
    showingFirst: 'Showing first {n}',
    showMore: 'Show more',
    searchingVol: 'Searching… ({cur}/{total})',
    backBtn: 'Back',
    themeBtn: 'Change theme',
    prevPage: 'Previous page',
    nextPage: 'Next page',
    bookmarkBtn: 'Save page',
    noteBtn: 'Write a note',
    fontBtn: 'Font & theme',
    gotoBtn: 'Go to page'
  }
};
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.ur[k] || k;
const tf = (k, vars) => {
  let s = t(k);
  for (const [key, val] of Object.entries(vars || {})) s = s.split('{' + key + '}').join(String(val));
  return s;
};
function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.title = lang === 'en' ? 'Fatawa Razviya — Easy Urdu' : 'فتاویٰ رضویہ — آسان اردو';
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('#set-lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  syncSettingsUI();
}
function setLang(l) {
  if (lang === l) return;
  lang = l;
  try { localStorage.setItem('fatawa.lang', l); } catch (e) { /* storage blocked */ }
  applyLanguage();
  route(); // re-render the current view with the new language
}

/* ---------------- helpers ---------------- */
const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ur = n => lang === 'en' ? String(n) : String(n).replace(/\d/g, d => URDU_DIGITS[d]);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const store = {
  get(k, d) { try { const v = localStorage.getItem('fatawa.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fatawa.' + k, JSON.stringify(v)); } catch (e) { /* storage full/blocked */ } }
};
function toast(msg) {
  const tEl = $('#toast'); tEl.textContent = msg; tEl.classList.add('show');
  clearTimeout(tEl._tm); tEl._tm = setTimeout(() => tEl.classList.remove('show'), 2600);
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

/* Render decoded text: each <ar>/<q>/<h>/<ur> run becomes its own element
   with its own font, so shaping never joins across a FONT boundary
   (MARKUP.md §3). Adjacent runs of the SAME class are merged into one
   span: same font, so merging is shaping-safe, and it cuts the DOM node
   count (and the per-node Nastaliq shaping work) on every page.
   Text is escaped first; only decoder tags are re-opened. */
function renderTagged(text) {
  const e = esc(text);
  const parts = e.split(/&lt;(\/?)(ar|q|h|ur)&gt;/g);
  let out = '';
  let runCls = null;   // class of the buffered run, or null for bare text
  let runText = '';
  let runEnded = false; // a close tag was seen; the run flushes unless the
                          // same class re-opens immediately (merge case)
  const flush = () => {
    if (!runText) { runCls = null; runEnded = false; return; }
    out += runCls ? '<span class="sp-' + runCls + '">' + runText + '</span>' : runText;
    runText = '';
    runCls = null;
    runEnded = false;
  };
  for (let i = 0; i < parts.length; i += 3) {
    const chunk = parts[i];
    if (chunk) {
      if (runEnded) flush(); // bare text between spans: the run really ended
      runText += chunk;
    }
    if (i + 1 >= parts.length) break;
    const closing = parts[i + 1] === '/';
    const cls = parts[i + 2];
    if (closing) {
      if (runCls !== null) runEnded = true;
    } else if (runCls === cls && runEnded) {
      runEnded = false; // same class re-opens: resume the run, no boundary
    } else if (runCls !== cls) {
      flush();
      runCls = cls;
      runEnded = false;
    }
  }
  flush();
  return out;
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
const searchIndexCache = {};  // volume_id -> [{page, lesson, lesson_id, plain, normText, map}]
let currentVolumeId = null;
let currentPage = null;
let currentPart = null;
let lastScrollTop = 0;
let splashTimer = null;
let searchTab = 'word';
let searchDebounce = null;
/* search options (original app): mode words|phrase, scope volumes|rasail,
   range all|selected */
let searchMode = store.get('searchMode', 'words');
let searchScope = store.get('searchScope', 'volumes');
let searchRange = store.get('searchRange', 'all');
let lastSearchResults = [];   // [{vid, page, lesson, html}]
let searchRendered = 0;
const SEARCH_PAGE_SIZE = 50;
const SEARCH_MAX = 200;

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
function setTheme(th) { settings.theme = th; applySettings(); }

/* ---------------- volume helpers ---------------- */
function volEntry(vid) { return (manifest || []).find(v => v.volume_id === vid) || null; }
function jildOf(vid) { const e = volEntry(vid); return e ? e.jild : null; }
function volDisplay(vid) {
  const e = volEntry(vid);
  if (!e) return lang === 'en' ? 'Volume' : 'جلد';
  if (e.jild === 1) {
    const part = e.volume.includes('Part-2') || e.volume_id === 60 ? 2 : 1;
    return lang === 'en' ? 'Volume 1, Part ' + part : 'جلد ۱، حصہ ' + (part === 2 ? 'دوم' : 'اول');
  }
  return lang === 'en' ? 'Volume ' + e.jild : 'جلد ' + ur(e.jild);
}
function volRange(vid) {
  const e = volEntry(vid);
  if (!e) return [0, 0];
  return [e.page_min ?? e.min ?? 0, e.page_max ?? e.max ?? 0];
}
function fillVolumeSelect(sel, selectedVid) {
  sel.innerHTML = (manifest || []).map(v =>
    `<option value="${v.volume_id}"${v.volume_id === selectedVid ? ' selected' : ''}>${esc(volDisplay(v.volume_id))} · ${v.pages} ${esc(t('pagesWord'))}</option>`).join('');
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
  if (!manifest) throw new Error(t('manifestNotFound'));
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
  if (!jild) throw new Error(t('volumeNotFound'));
  const file = await fetchJSON(`${CONTENT}/jild-${String(jild).padStart(2, '0')}.json`);
  if (!file) throw new Error(t('volumeFileNotFound'));
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
  const routeName = id.replace('view-', '');
  const showNav = NAV_ROUTES.includes(routeName);
  $('#nav').style.display = showNav ? 'flex' : 'none';
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === routeName));
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
    list.innerHTML = '<p class="err">' + esc(t('loadFail')) + '<br>' + esc(t('loadFailRetry')) + '</p>';
    return;
  }
  const lr = lastRead();
  const lastVid = store.get('lastvolume', null);
  let html = '';
  if (lastVid && volEntry(lastVid) && lr[lastVid]) {
    const e = volEntry(lastVid);
    html += `<div class="card" style="background:var(--tint)">
      <h3>${esc(t('continueReading'))}</h3>
      <p class="sub">${esc(volDisplay(lastVid))} · ${esc(t('pageLabel'))} ${ur(lr[lastVid])}</p>
      <div class="prog"><i style="width:${Math.round(((lr[lastVid] - (e.page_min ?? 0)) / Math.max(1, (e.page_max ?? 1) - (e.page_min ?? 0))) * 100)}%"></i></div>
      <p class="mt8"><button class="chip" data-resume="${lastVid}">${esc(t('resumeBtn'))} ←</button></p>
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
        <div class="vmeta"><span class="num">${v.pages}</span> ${esc(t('pagesWord'))} · <span class="num">${v.lessons}</span> ${esc(t('lessonsWord'))} · <span class="num">${v.rasail}</span> ${esc(t('rasailWord'))}</div>
        ${lp ? `<div class="prog"><i style="width:${pct}%"></i></div><div class="vmeta">${esc(t('continuePage'))} ${ur(lp)} · ${ur(pct)}٪</div>` : ''}
      </div>
      <button class="chip ghost" data-fehrist="${v.volume_id}">${esc(t('fehristBtn'))}</button>
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
    wrap.innerHTML = '<p class="err">' + esc(t('loadFail')) + '</p>'; return;
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
  if (!lessons.length) { wrap.innerHTML = '<p class="empty">' + esc(t('nothingFound')) + '</p>'; return; }
  const byVol = {};
  for (const l of lessons) (byVol[l.volume_id] = byVol[l.volume_id] || []).push(l);
  let html = '';
  for (const v of manifest) {
    const rows = byVol[v.volume_id];
    if (!rows) continue;
    html += `<div class="grouphead">${esc(volDisplay(v.volume_id))} <span class="count num">${rows.length}</span></div><div class="list">`;
    for (const l of rows) {
      const rng = l.first_page ? `${esc(t('pageLabel'))} ${ur(l.first_page)}${l.last_page && l.last_page !== l.first_page ? '–' + ur(l.last_page) : ''}` : esc(t('pageLabel')) + ' —';
      html += `<button class="card clickable" data-lesson="${l.lesson_id}" ${l.first_page ? '' : 'disabled'}>
        <h3>${esc(l.name)}</h3>
        <p class="sub">${esc(volDisplay(v.volume_id))} · ${rng}${l.is_resala ? ' · ' + esc(t('risalaLabel')) : ''}</p>
      </button>`;
    }
    html += '</div>';
  }
  wrap.innerHTML = html;
  $$('[data-lesson]', wrap).forEach(b => b.addEventListener('click', () => {
    const l = lessonsData.find(x => x.lesson_id === +b.dataset.lesson);
    if (l && l.first_page) go(`#/reader/${l.volume_id}/${l.first_page}`);
    else toast(t('lessonNoPage'));
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
  $('#reader-orig').innerHTML = '<p class="loading">' + esc(t('loadingPage')) + '</p>';
  $('#tashreeh-wrap').innerHTML = '';
  try {
    await loadManifest();
    const vc = await loadVolumePart(vid);
    let pg = pageNo;
    if (!vc.byPage[pg]) {
      const near = nearestPage(vid, pg);
      if (near === null) throw new Error(t('pageNotFound'));
      pg = near;
    }
    currentVolumeId = vid; currentPage = pg; currentPart = vc;
    const entry = vc.byPage[pg];
    const idx = vc.pageNos.indexOf(pg);
    const [mn, mx] = volRange(vid);
    $('#reader-crumb').textContent = `${volDisplay(vid)} · ${t('pageLabel')} ${ur(pg)}`;
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
    $('#reader-orig').innerHTML = `<p class="err">${esc(t('loadFail'))}<br>${esc(e.message || e)}</p>`;
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
    wrap.innerHTML = `<div class="divider">${esc(t('easyTashreeh'))}</div>
      <div class="tashreeh"><p class="t-pending">${esc(t('tashPending'))}</p></div>`;
    return;
  }
  if (pg === m.start_page) {
    wrap.innerHTML = `<div class="divider">${esc(t('easyTashreeh'))}</div>
      <div class="tashreeh">
        <p class="t-label">${esc(t('qEasy'))}</p>
        <p class="t-text">${esc(m.tashreeh_sawal)}</p>
        <p class="t-label">${esc(t('aEasy'))}</p>
        <p class="t-text">${esc(m.tashreeh_jawab)}</p>
        ${(m.notes || []).map(n => `<p class="t-note"><b>${esc(t('noteLabel'))}</b> ${esc(n)}</p>`).join('')}
      </div>`;
  } else {
    wrap.innerHTML = `<button class="continue-chip" id="tash-continue">${esc(tf('tashContinue', { p: ur(m.start_page) }))} ←</button>`;
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
  toast(settings.theme === 'light' ? t('themeLight') : settings.theme === 'dark' ? t('themeDark') : t('themeSepia'));
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
let scrollTicking = false;
$('#reader-scroll').addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    const sc = $('#reader-scroll');
    const top = sc.scrollTop;
    if (top > lastScrollTop && top > 120 && !chromeHidden) hideChrome();
    else if (top < lastScrollTop - 10 && chromeHidden) showChrome();
    lastScrollTop = top;
  });
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
  if (i >= 0) { list.splice(i, 1); toast(t('bookmarkRemoved')); }
  else {
    const entry = pageEntry(vid, pg);
    list.unshift({ volume_id: vid, page: pg, lesson: entry ? entry.lesson.trim() : '', date: new Date().toISOString() });
    toast(t('bookmarkSaved'));
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
    list.innerHTML = '<p class="empty">' + esc(t('savedEmpty')) + '<br>' + esc(t('savedEmptyHint')) + '</p>';
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
        <h3>${esc(b.lesson || t('pageLabel') + ' ' + ur(b.page))}</h3>
        <p class="sub">${esc(volDisplay(b.volume_id))} · ${esc(t('pageLabel'))} ${ur(b.page)} · ${fmtDate(b.date)}</p>
        <p class="btnrow mt8">
          <button class="btn ghost" data-open="${b.volume_id}/${b.page}">${esc(t('openBtn'))}</button>
          <button class="btn danger" data-del="${b.volume_id}/${b.page}">${esc(t('deleteBtn'))}</button>
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
    toast(t('deleted')); renderBookmarks();
    if (currentVolumeId === vid && currentPage === pg) updateBookmarkBtn();
  }));
}
function renderNotes() {
  const list = $('#notes-list');
  const notes = getNotes();
  if (!notes.length) {
    list.innerHTML = '<p class="empty">' + esc(t('notesEmpty')) + '<br>' + esc(t('notesEmptyHint')) + '</p>';
    return;
  }
  list.innerHTML = notes.map(n => `<div class="card">
    <h3>${esc(n.lesson || t('pageLabel') + ' ' + ur(n.page))}</h3>
    <p class="sub">${esc(volDisplay(n.volume_id))} · ${esc(t('pageLabel'))} ${ur(n.page)} · ${fmtDate(n.updated || n.date)}</p>
    <p class="mt8 nastaliq" style="font-size:16px;line-height:2;white-space:pre-line">${esc(n.text)}</p>
    <p class="btnrow mt8">
      <button class="btn ghost" data-edit="${n.volume_id}/${n.page}">${esc(t('editBtn'))}</button>
      <button class="btn ghost" data-share="${n.volume_id}/${n.page}">${esc(t('shareBtn'))}</button>
      <button class="btn danger" data-delnote="${n.volume_id}/${n.page}">${esc(t('deleteBtn'))}</button>
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
    const text = `${n.lesson || ''}\n${volDisplay(vid)} · ${t('pageLabel')} ${ur(pg)}\n\n${n.text}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast(t('noteCopied')); }
    } catch (e) { /* share dismissed */ }
  }));
  $$('[data-delnote]', list).forEach(x => x.addEventListener('click', () => {
    const [vid, pg] = x.dataset.delnote.split('/').map(Number);
    if (confirm(t('confirmDeleteNote'))) { deleteNote(vid, pg); toast(t('noteDeleted')); renderNotes(); }
  }));
}

/* ---------------- search ----------------
   Word tab = the ORIGINAL app's search screen:
   - mode: مختلف الفاظ (different words, order-independent) vs مکمل جملہ
     (complete sentence, exact phrase)
   - scope: جلدیں (volumes) vs رسائل (booklets only)
   - range: تمام جلدوں میں سرچ (all volumes) vs منتخب جلدوں میں سرچ
     (selected volumes, checklist)
   - big تلاش کریں button (search runs on the button / Enter, not on every
     keystroke — a 31-part sweep is too heavy to run live).
   Lesson and fehrist tabs keep their live search. */
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
    return { page: p.page, lesson: p.lesson, lesson_id: p.lesson_id, plain, normText, map };
  });
  searchIndexCache[vid] = idx;
  return idx;
}
/* Match one page against the normalized terms. Returns the raw-text ranges
   of the occurrences found (at most 8 per term, earliest first) and the set
   of terms that occur at least once. */
function matchPage(entry, terms) {
  const ranges = [];
  const found = new Set();
  for (const term of terms) {
    let from = 0, count = 0;
    while (count < 8) {
      const at = entry.normText.indexOf(term, from);
      if (at === -1) break;
      found.add(term);
      let start = -1;
      for (let i = 0; i < entry.map.length; i++) {
        if (entry.map[i] === at) { start = i; break; }
      }
      if (start === -1) { from = at + 1; continue; }
      let end = start;
      for (let i = start; i < entry.map.length; i++) {
        if (entry.map[i] !== -1 && entry.map[i] < at + term.length) end = i + 1;
        else if (entry.map[i] !== -1 && entry.map[i] >= at + term.length) break;
      }
      ranges.push([start, end]);
      from = at + term.length;
      count++;
    }
  }
  return { ranges, found };
}
function snippetHtml(entry, ranges) {
  const first = Math.min(...ranges.map(r => r[0]));
  const last = Math.max(...ranges.map(r => r[1]));
  const s0 = Math.max(0, first - 45), s1 = Math.min(entry.plain.length, last + 70);
  const inWin = ranges.filter(r => r[1] > s0 && r[0] < s1)
    .map(r => [Math.max(r[0], s0), Math.min(r[1], s1)])
    .sort((a, b) => a[0] - b[0]);
  let html = s0 > 0 ? '…' : '', pos = s0;
  for (const [a, b] of inWin) {
    if (a < pos) continue; // overlapping range already covered
    html += esc(entry.plain.slice(pos, a)) + '<mark>' + esc(entry.plain.slice(a, b)) + '</mark>';
    pos = b;
  }
  html += esc(entry.plain.slice(pos, s1)) + (s1 < entry.plain.length ? '…' : '');
  return html;
}
/* Search one loaded volume part. Phrase mode passes a single term (the
   whole query); words mode passes one term per word and requires every
   term to occur on the page. opts.resalaIds (a Set of lesson_ids) limits
   the search to booklet pages. */
function searchInVolume(vid, terms, opts) {
  const idx = buildSearchIndex(vid);
  const out = [];
  for (const p of idx) {
    if (opts.resalaIds && !opts.resalaIds.has(p.lesson_id)) continue;
    const { ranges, found } = matchPage(p, terms);
    if (!ranges.length || found.size < terms.length) continue;
    out.push({ page: p.page, lesson: p.lesson, html: snippetHtml(p, ranges) });
    if (out.length >= (opts.limit || SEARCH_MAX)) break;
  }
  return out;
}
/* The volume parts to search, in manifest order. */
function searchParts() {
  const all = (manifest || []).map(v => v.volume_id);
  if (searchRange !== 'selected') return all;
  const sel = store.get('searchVols', null);
  if (!sel) return all;
  return all.filter(vid => sel.includes(vid));
}
function buildVolPicker() {
  const wrap = $('#search-vol-pick');
  if (!wrap || wrap.dataset.built) return;
  wrap.dataset.built = '1';
  const sel = store.get('searchVols', null);
  wrap.innerHTML = (manifest || []).map(v => {
    const checked = !sel || sel.includes(v.volume_id);
    return `<label class="volcheck"><input type="checkbox" data-vid="${v.volume_id}"${checked ? ' checked' : ''}> <span>${esc(v.volume)}</span></label>`;
  }).join('');
  $$('input[type=checkbox]', wrap).forEach(cb => cb.addEventListener('change', () => {
    const chosen = $$('input[type=checkbox]:checked', wrap).map(c => +c.dataset.vid);
    store.set('searchVols', chosen);
  }));
}
function syncSearchUI() {
  $$('#search-mode input').forEach(r => { r.checked = r.value === searchMode; });
  $$('#search-scope button').forEach(b => b.classList.toggle('active', b.dataset.scope === searchScope));
  $$('#search-range input').forEach(r => { r.checked = r.value === searchRange; });
  const pick = $('#search-vol-pick');
  if (pick) pick.classList.toggle('hidden', searchRange !== 'selected');
  const acts = $('#search-vol-actions');
  if (acts) acts.classList.toggle('hidden', searchRange !== 'selected');
}
async function showSearch() {
  showView('view-search');
  try { await loadManifest(); } catch (e) { /* search needs manifest for volume names */ }
  $('#search-word-panel').classList.toggle('hidden', searchTab !== 'word');
  if (searchTab === 'word' && manifest) {
    buildVolPicker();
    syncSearchUI();
  }
  renderRecent();
}
$$('#search-tabs button').forEach(b => b.addEventListener('click', () => {
  $$('#search-tabs button').forEach(x => x.classList.toggle('active', x === b));
  searchTab = b.dataset.tab;
  $('#search-word-panel').classList.toggle('hidden', searchTab !== 'word');
  $('#search-results').innerHTML = '';
  runSearch();
}));
$$('#search-mode input').forEach(r => r.addEventListener('change', () => {
  searchMode = r.value; store.set('searchMode', searchMode);
}));
$$('#search-scope button').forEach(b => b.addEventListener('click', () => {
  searchScope = b.dataset.scope; store.set('searchScope', searchScope);
  syncSearchUI();
}));
$$('#search-range input').forEach(r => r.addEventListener('change', () => {
  searchRange = r.value; store.set('searchRange', searchRange);
  syncSearchUI();
}));
$('#search-vol-all').addEventListener('click', () => {
  $$('#search-vol-pick input').forEach(c => { c.checked = true; });
  store.set('searchVols', (manifest || []).map(v => v.volume_id));
});
$('#search-vol-none').addEventListener('click', () => {
  $$('#search-vol-pick input').forEach(c => { c.checked = false; });
  store.set('searchVols', []);
});
$('#search-go').addEventListener('click', () => runSearch(true));
$('#search-input').addEventListener('input', () => {
  $('#search-clear').classList.toggle('hidden', !$('#search-input').value);
  clearTimeout(searchDebounce);
  // Word tab searches only on the button / Enter (a 31-part sweep is too
  // heavy to run on every keystroke). Lesson/fehrist tabs stay live.
  if (searchTab !== 'word') searchDebounce = setTimeout(runSearch, 300);
});
$('#search-clear').addEventListener('click', () => {
  $('#search-input').value = '';
  $('#search-clear').classList.add('hidden');
  $('#search-results').innerHTML = '';
});
$('#search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearTimeout(searchDebounce); runSearch(true); }
});
$('#search-recent-clear').addEventListener('click', () => { store.set('recent', []); renderRecent(); });
function renderRecent() {
  const r = store.get('recent', []);
  const wrap = $('#search-recent');
  wrap.innerHTML = r.length
    ? r.map(q => `<button class="chip ghost" data-q="${esc(q)}">${esc(q)}</button>`).join('')
    : '<span class="muted small">' + esc(t('noRecent')) + '</span>';
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
async function runWordSearch(q, commit) {
  const box = $('#search-results');
  const terms = searchMode === 'phrase' ? [normStr(q)].filter(Boolean) : q.split(/\s+/).map(normStr).filter(Boolean);
  if (!terms.length) { box.innerHTML = ''; return; }
  if (commit) pushRecent(q);
  const parts = searchParts();
  if (!parts.length) { box.innerHTML = '<p class="empty">' + esc(t('noVolSelected')) + '</p>'; return; }
  try {
    await loadManifest();
    let resalaIds = null;
    if (searchScope === 'rasail') {
      await loadLessons();
      resalaIds = new Set(lessonsData.filter(l => l.is_resala).map(l => l.lesson_id));
    }
    // Group the parts by jild: a jild file holds both its parts, and the
    // parsed data is freed after each jild to bound memory on a 31-part sweep.
    const byJild = {};
    for (const vid of parts) (byJild[jildOf(vid)] = byJild[jildOf(vid)] || []).push(vid);
    const jilds = Object.keys(byJild).map(Number).sort((a, b) => a - b);
    lastSearchResults = [];
    searchRendered = 0;
    box.innerHTML = '<p class="loading">' + esc(tf('searchingVol', { cur: 0, total: jilds.length })) + '</p>';
    let done = 0;
    for (const j of jilds) {
      const loadingEl = box.querySelector('.loading');
      if (loadingEl) loadingEl.textContent = tf('searchingVol', { cur: done + 1, total: jilds.length });
      for (const vid of byJild[j]) {
        await loadVolumePart(vid);
        const hits = searchInVolume(vid, terms, { limit: SEARCH_MAX - lastSearchResults.length, resalaIds });
        for (const h of hits) lastSearchResults.push({ vid, ...h });
        if (lastSearchResults.length >= SEARCH_MAX) break;
      }
      for (const v of manifest.filter(v => v.jild === j)) {
        delete volumeCache[v.volume_id];
        delete searchIndexCache[v.volume_id];
      }
      done++;
      if (lastSearchResults.length >= SEARCH_MAX) break;
    }
    renderSearchResults();
  } catch (e) {
    box.innerHTML = `<p class="err">${esc(t('searchFail'))}<br>${esc(e.message || e)}</p>`;
  }
}
function renderSearchResults() {
  const box = $('#search-results');
  const total = lastSearchResults.length;
  if (!total) { box.innerHTML = '<p class="empty">' + esc(t('nothingFound')) + '</p>'; return; }
  const show = lastSearchResults.slice(0, searchRendered + SEARCH_PAGE_SIZE);
  searchRendered = show.length;
  box.innerHTML = `<p class="small muted" style="text-align:center;padding:8px 0">${esc(tf('resultsFound', { n: total }))}${total > show.length ? ' · ' + esc(tf('showingFirst', { n: show.length })) : ''}</p>` +
    show.map(r => `<button class="result" data-go="${r.vid}/${r.page}">
      <span class="rtext">${r.html}<span class="rmeta">${esc((r.lesson || '').trim())} · ${esc(volDisplay(r.vid))}</span></span>
      <span class="pgnum">${r.page}</span>
    </button>`).join('') +
    (total > show.length ? `<p style="text-align:center;padding:8px 0"><button class="btn ghost" id="search-more">${esc(t('showMore'))}</button></p>` : '');
  bindResultButtons(box);
  const more = $('#search-more');
  if (more) more.addEventListener('click', renderSearchResults);
}
async function runSearch(commit) {
  const q = ($('#search-input').value || '').trim();
  const box = $('#search-results');
  if (q.length < 2) { box.innerHTML = ''; return; }
  if (searchTab === 'word') {
    runWordSearch(q, commit);
    return;
  }
  if (commit) pushRecent(q);
  if (searchTab === 'lesson') {
    await loadLessons();
    const nq = normStr(q);
    const res = lessonsData.filter(l => normStr(l.name).includes(nq)).slice(0, 50);
    if (!res.length) { box.innerHTML = '<p class="empty">' + esc(t('noLessonFound')) + '</p>'; return; }
    box.innerHTML = res.map(l => `<button class="result" data-go="${l.volume_id}/${l.first_page || ''}" ${l.first_page ? '' : 'disabled'}>
      <span class="rtext">${esc(l.name)}<span class="rmeta">${esc(volDisplay(l.volume_id))}${l.first_page ? ' · ' + esc(t('pageLabel')) + ' ' + ur(l.first_page) : ''}${l.is_resala ? ' · ' + esc(t('risalaLabel')) : ''}</span></span>
      <span class="pgnum">${l.first_page || '—'}</span>
    </button>`).join('');
    bindResultButtons(box);
  } else {
    box.innerHTML = '<p class="loading">' + esc(t('loadingFehrist')) + '</p>';
    const all = await loadAllFehrist();
    const nq = normStr(q);
    const res = all.filter(e => e._n.includes(nq)).slice(0, 50);
    if (!res.length) { box.innerHTML = '<p class="empty">' + esc(t('noFehristFound')) + '</p>'; return; }
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
  wrap.innerHTML = '<p class="loading">' + esc(t('loadingFehrist')) + '</p>';
  try {
    const jild = jildOf(vid);
    const entries = (await loadFehrist(jild)).filter(e => e.volume_id === vid);
    const part = await loadVolumePart(vid);
    const pageLesson = {};
    for (const p of part.pages) pageLesson[p.page] = (p.lesson || '').trim();
    const q = normStr(($('#fehrist-search').value || '').trim());
    const shown = entries.filter(e => !q || normStr(e.title || '').includes(q));
    if (!shown.length) { wrap.innerHTML = '<p class="empty">' + esc(t('noFehristFound')) + '</p>'; return; }
    const groups = [];
    const byLesson = {};
    for (const e of shown) {
      const lesson = pageLesson[e.page] || t('miscGroup');
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
    wrap.innerHTML = `<p class="err">${esc(t('fehristFail'))}<br>${esc(e.message || e)}</p>`;
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
    $('#set-stats').textContent = tf('offlineStats', { parts: ur(31), pages: ur(totalPages), words: ur(Math.round(totalWords / 100000) / 10) });
  }
}
$$('#set-theme button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
$$('#set-lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
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
  openSheet(`<h3>${esc(t('fontTheme'))}</h3>
    <div class="row"><label>${esc(t('themeLabel'))}</label>
      <div class="seg" id="sheet-theme">
        <button data-theme="light">${esc(t('lightLabel'))}</button>
        <button data-theme="dark">${esc(t('darkLabel'))}</button>
        <button data-theme="sepia">${esc(t('sepiaLabel'))}</button>
      </div>
    </div>
    <div class="row"><label>${esc(t('origFont'))} — <span id="sh-orig-val">${ur(settings.orig)}</span></label>
      <input type="range" id="sh-orig" min="16" max="28" step="1" value="${settings.orig}"></div>
    <div class="row"><label>${esc(t('tashFont'))} — <span id="sh-tash-val">${ur(settings.tash)}</span></label>
      <input type="range" id="sh-tash" min="14" max="24" step="1" value="${settings.tash}"></div>
    <div class="row"><label>${esc(t('lineHeight'))} — <span id="sh-lh-val">${ur(settings.lh.toFixed(1).replace('.', '٫'))}</span></label>
      <input type="range" id="sh-lh" min="1.9" max="2.4" step="0.1" value="${settings.lh}"></div>
    <div class="row"><div class="setrow" style="margin:0"><div class="st"><b>${esc(t('showTashreeh'))}</b></div>
      <button class="toggle ${settings.tashreehOn ? 'on' : ''}" id="sh-tashreeh"></button></div></div>
    <p class="btnrow"><button class="btn block" id="sh-done">${esc(t('doneBtn'))}</button></p>`);
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
  openSheet(`<h3>${esc(t('gotoPage'))}</h3>
    <div class="row"><label>${esc(t('volumeLabel'))}</label>
      <select id="goto-vol">${(manifest || []).map(v => `<option value="${v.volume_id}"${v.volume_id === currentVolumeId ? ' selected' : ''}>${esc(volDisplay(v.volume_id))}</option>`).join('')}</select></div>
    <div class="row"><label>${esc(t('pageNumber'))} (${ur(mn)} – ${ur(mx)})</label>
      <input type="number" id="goto-page" min="${mn}" max="${mx}" value="${currentPage}"></div>
    <p class="btnrow">
      <button class="btn" id="goto-jump">${esc(t('goBtn'))}</button>
      <button class="btn ghost" id="goto-first">${esc(t('firstPage'))}</button>
      <button class="btn ghost" id="goto-last">${esc(t('lastPage'))}</button>
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
    inp.previousElementSibling.textContent = `${t('pageNumber')} (${ur(a)} – ${ur(b)})`;
  });
}
function openNoteSheet(vid, pg, fromNotes) {
  const n = getNote(vid, pg);
  const entry = pageEntry(vid, pg);
  openSheet(`<h3>${esc(t('noteTitle'))} — ${esc(volDisplay(vid))} · ${esc(t('pageLabel'))} ${ur(pg)}</h3>
    <p class="small muted">${esc(entry ? (entry.lesson || '').trim() : '')}</p>
    <div class="row mt8"><textarea id="note-text" placeholder="${esc(t('notePh'))}">${esc(n ? n.text : '')}</textarea></div>
    <p class="btnrow">
      <button class="btn" id="note-save">${esc(t('saveBtn'))}</button>
      ${n ? '<button class="btn danger" id="note-del">' + esc(t('deleteBtn')) + '</button>' : ''}
      <button class="btn ghost" id="note-cancel">${esc(t('cancelBtn'))}</button>
    </p>`);
  $('#note-save').addEventListener('click', () => {
    saveNote(vid, pg, $('#note-text').value);
    toast($('#note-text').value.trim() ? t('noteSaved') : t('noteDeleted'));
    closeSheet();
    if (fromNotes) renderNotes();
  });
  const del = $('#note-del');
  if (del) del.addEventListener('click', () => {
    deleteNote(vid, pg); toast(t('noteDeleted')); closeSheet();
    if (fromNotes) renderNotes();
  });
  $('#note-cancel').addEventListener('click', closeSheet);
}

/* ---------------- init ---------------- */
async function init() {
  applyLanguage();
  applySettings();
  try {
    await loadManifest();
    const totalRasail = manifest.reduce((a, v) => a + v.rasail, 0);
    const totalPages = manifest.reduce((a, v) => a + v.pages, 0);
    $('#splash-counts').textContent = tf('splashCounts', { v: ur(30), r: ur(totalRasail), p: ur(totalPages) });
  } catch (e) {
    $('#splash-counts').textContent = t('loadFail');
  }
  if (location.hash && location.hash !== '#/splash') route();
  else { showSplash(); }
}
document.addEventListener('visibilitychange', () => { /* keep state fresh; nothing to do */ });
init();

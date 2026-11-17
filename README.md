# Fatawa Razviya — Aasan Urdu

Android reader for **Fatawa Razviya** (Imam Ahmad Raza Khan Qadri, Dawate Islami
edition): the original Urdu text of all 30 jilds on top, with an easy-Urdu
tashreeh underneath — so everyone can understand it.

- **Package:** `com.fatawa.razviya.easyurdu` (not the official app's
  `com.fatawaerazvia`)
- **Fully offline:** the whole book (19,709 pages) is bundled as JSON in
  `app/src/main/assets/` and shown in a WebView. No account, no internet
  needed. (When online, Noto Nastaliq / Inter load from Google Fonts;
  offline the system fonts are used.)
- **Features:** 31 volumes (Jild 1 in two parts), 187 rasail, fehrist
  (40,230 entries), word / lesson / fehrist search, bookmarks, per-page
  notes, 3 themes, adjustable font sizes.
- **Tashreeh:** labelled "آسان تشریح" and visually distinct from Ala
  Hazrat's words, always. Jild 1 tashreeh is complete; the other jilds show
  "تشریح جلد آ رہی ہے" until their tashreeh is written.

## Build

GitHub Actions builds the debug APK on every push to `main`
(`.github/workflows/build.yml`) and attaches it to the
[v1.0.0 release](../../releases/tag/v1.0.0). Requires JDK 17; Gradle 8.7
via the wrapper (no local Gradle install needed).

## Layout

- `app/src/main/java/.../MainActivity.java` — single Activity + WebView shell
- `app/src/main/assets/app/` — reader web app (`index.html`, `styles.css`, `app.js`)
- `app/src/main/assets/content/` — `manifest.json`, `jild-01..30.json`,
  `fehrist-01..30.json`, `rasail.json`, `lessons.json`, `tashreeh/jild-*.json`

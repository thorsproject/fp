# Flight Planning – Projektzustand (state)

> **Zweck:** Kurzer, belastbarer Projekt-Checkpoint, damit neue Chats/Debug-Sessions ohne Context-Posting starten können.

---

## Auto-Update (wird per Script gepflegt)
<!-- STATE:AUTO:BEGIN -->
- Last updated (commit time): 2026-02-28T22:13:26+01:00
- HEAD: 221eea9
- Branch: main
- App Version: 0.0.3
- Active Features:
  - ORM Workflow
  - Signature Stamping
  - Phone Popup (Config-locked)
  - Checklist State
  - Fuel Planning
  - Map View
- Last commits:
- 221eea9 STATE: CSS-Refactoring finished (thorsproject)
- Changed files (this commit):
  - .DS_Store
  - .github/workflows/update-state.yml
  - .github/workflows/update-weather.yml
  - .gitignore
  - .vscode/tasks.json
  - Layout_structure.txt
  - OLD/checklistOLD.css
  - OLD/components_OLD.css
  - css/base.css
  - css/components.css
  - css/layout.css
  - css/overlays.css
  - css/reset.css
  - css/utils.css
  - css/views/checklist.css
  - css/views/fuel.css
  - css/views/map.css
  - css/views/performance.css
  - css/views/route.css
  - css/views/settings.css
  - data/ORMBlatt.pdf
  - data/airfields.json
  - data/airfields_missing.txt
  - data/alternates.json
  - data/alternates_missing.txt
  - data/approved_airfields.csv
  - data/approved_alternates.csv
  - data/config.enc
  - data/weather.json
  - data/windgrid.json
  - icon-192.png
  - icon-512.png
  - index.html
  - js/airfields.js
  - js/app.js
  - js/attachments.js
  - js/buildAlternatesFromCsv.js
  - js/checklist.js
  - js/config_store.js
  - js/date.js
  - js/fuel.js
  - js/fuelConstants.js
  - js/include.js
  - js/intranet_detect.js
  - js/legs.js
  - js/lfz.js
  - js/mail_eo.js
  - js/map.js
  - js/metar.js
  - js/orm.js
  - js/path.js
  - js/phone_popup.js
  - js/phones.js
  - js/reset.js
  - js/resize.js
  - js/signature_stamp.js
  - js/signature_store.js
  - js/signature_ui.js
  - js/storage.js
  - js/ui/dom.js
  - js/ui/events.js
  - js/ui/index.js
  - js/ui/read.js
  - js/ui/selectors.js
  - js/ui/state.js
  - js/ui/ui.js
  - js/vertprof.js
  - js/wind.js
  - manifest.json
  - package.json
  - partials/checklist.html
  - partials/fuel.html
  - partials/legs.html
  - partials/performance.html
  - partials/settings.html
  - pdfjs/.DS_Store
  - pdfjs/LICENSE
  - pdfjs/build/.DS_Store
  - pdfjs/build/pdf.mjs
  - pdfjs/build/pdf.worker.mjs
  - pdfjs/web/.DS_Store
  - pdfjs/web/images/altText_add.svg
  - pdfjs/web/images/altText_disclaimer.svg
  - pdfjs/web/images/altText_done.svg
  - pdfjs/web/images/altText_spinner.svg
  - pdfjs/web/images/altText_warning.svg
  - pdfjs/web/images/annotation-check.svg
  - pdfjs/web/images/annotation-comment.svg
  - pdfjs/web/images/annotation-help.svg
  - pdfjs/web/images/annotation-insert.svg
  - pdfjs/web/images/annotation-key.svg
  - pdfjs/web/images/annotation-newparagraph.svg
  - pdfjs/web/images/annotation-noicon.svg
  - pdfjs/web/images/annotation-note.svg
  - pdfjs/web/images/annotation-paperclip.svg
  - pdfjs/web/images/annotation-paragraph.svg
  - pdfjs/web/images/annotation-pushpin.svg
  - pdfjs/web/images/checkmark.svg
  - pdfjs/web/images/comment-actionsButton.svg
  - pdfjs/web/images/comment-closeButton.svg
  - pdfjs/web/images/comment-editButton.svg
  - pdfjs/web/images/comment-popup-editButton.svg
  - pdfjs/web/images/cursor-editorFreeHighlight.svg
  - pdfjs/web/images/cursor-editorFreeText.svg
  - pdfjs/web/images/cursor-editorInk.svg
  - pdfjs/web/images/cursor-editorTextHighlight.svg
  - pdfjs/web/images/editor-toolbar-delete.svg
  - pdfjs/web/images/editor-toolbar-edit.svg
  - pdfjs/web/images/findbarButton-next.svg
  - pdfjs/web/images/findbarButton-previous.svg
  - pdfjs/web/images/gv-toolbarButton-download.svg
  - pdfjs/web/images/loading-icon.gif
  - pdfjs/web/images/loading.svg
  - pdfjs/web/images/messageBar_closingButton.svg
  - pdfjs/web/images/messageBar_info.svg
  - pdfjs/web/images/messageBar_warning.svg
  - pdfjs/web/images/pages_closeButton.svg
  - pdfjs/web/images/pages_selected.svg
  - pdfjs/web/images/pages_viewArrow.svg
  - pdfjs/web/images/pages_viewButton.svg
  - pdfjs/web/images/secondaryToolbarButton-documentProperties.svg
  - pdfjs/web/images/secondaryToolbarButton-firstPage.svg
  - pdfjs/web/images/secondaryToolbarButton-handTool.svg
  - pdfjs/web/images/secondaryToolbarButton-lastPage.svg
  - pdfjs/web/images/secondaryToolbarButton-rotateCcw.svg
  - pdfjs/web/images/secondaryToolbarButton-rotateCw.svg
  - pdfjs/web/images/secondaryToolbarButton-scrollHorizontal.svg
  - pdfjs/web/images/secondaryToolbarButton-scrollPage.svg
  - pdfjs/web/images/secondaryToolbarButton-scrollVertical.svg
  - pdfjs/web/images/secondaryToolbarButton-scrollWrapped.svg
  - pdfjs/web/images/secondaryToolbarButton-selectTool.svg
  - pdfjs/web/images/secondaryToolbarButton-spreadEven.svg
  - pdfjs/web/images/secondaryToolbarButton-spreadNone.svg
  - pdfjs/web/images/secondaryToolbarButton-spreadOdd.svg
  - pdfjs/web/images/toolbarButton-bookmark.svg
  - pdfjs/web/images/toolbarButton-currentOutlineItem.svg
  - pdfjs/web/images/toolbarButton-download.svg
  - pdfjs/web/images/toolbarButton-editorFreeText.svg
  - pdfjs/web/images/toolbarButton-editorHighlight.svg
  - pdfjs/web/images/toolbarButton-editorInk.svg
  - pdfjs/web/images/toolbarButton-editorSignature.svg
  - pdfjs/web/images/toolbarButton-editorStamp.svg
  - pdfjs/web/images/toolbarButton-menuArrow.svg
  - pdfjs/web/images/toolbarButton-openFile.svg
  - pdfjs/web/images/toolbarButton-pageDown.svg
  - pdfjs/web/images/toolbarButton-pageUp.svg
  - pdfjs/web/images/toolbarButton-presentationMode.svg
  - pdfjs/web/images/toolbarButton-print.svg
  - pdfjs/web/images/toolbarButton-search.svg
  - pdfjs/web/images/toolbarButton-secondaryToolbarToggle.svg
  - pdfjs/web/images/toolbarButton-viewAttachments.svg
  - pdfjs/web/images/toolbarButton-viewLayers.svg
  - pdfjs/web/images/toolbarButton-viewOutline.svg
  - pdfjs/web/images/toolbarButton-viewThumbnail.svg
  - pdfjs/web/images/toolbarButton-viewsManagerToggle.svg
  - pdfjs/web/images/toolbarButton-zoomIn.svg
  - pdfjs/web/images/toolbarButton-zoomOut.svg
  - pdfjs/web/images/treeitem-collapsed.svg
  - pdfjs/web/images/treeitem-expanded.svg
  - pdfjs/web/locale/.DS_Store
  - pdfjs/web/locale/ach/viewer.ftl
  - pdfjs/web/locale/af/viewer.ftl
  - pdfjs/web/locale/an/viewer.ftl
  - pdfjs/web/locale/ar/viewer.ftl
  - pdfjs/web/locale/ast/viewer.ftl
  - pdfjs/web/locale/az/viewer.ftl
  - pdfjs/web/locale/be/viewer.ftl
  - pdfjs/web/locale/bg/viewer.ftl
  - pdfjs/web/locale/bn/viewer.ftl
  - pdfjs/web/locale/bo/viewer.ftl
  - pdfjs/web/locale/br/viewer.ftl
  - pdfjs/web/locale/brx/viewer.ftl
  - pdfjs/web/locale/bs/viewer.ftl
  - pdfjs/web/locale/ca/viewer.ftl
  - pdfjs/web/locale/cak/viewer.ftl
  - pdfjs/web/locale/ckb/viewer.ftl
  - pdfjs/web/locale/cs/viewer.ftl
  - pdfjs/web/locale/cy/viewer.ftl
  - pdfjs/web/locale/da/viewer.ftl
  - pdfjs/web/locale/de/viewer.ftl
  - pdfjs/web/locale/dsb/viewer.ftl
  - pdfjs/web/locale/el/viewer.ftl
  - pdfjs/web/locale/en-CA/viewer.ftl
  - pdfjs/web/locale/en-GB/viewer.ftl
  - pdfjs/web/locale/en-US/viewer.ftl
  - pdfjs/web/locale/eo/viewer.ftl
  - pdfjs/web/locale/es-AR/viewer.ftl
  - pdfjs/web/locale/es-CL/viewer.ftl
  - pdfjs/web/locale/es-ES/viewer.ftl
  - pdfjs/web/locale/es-MX/viewer.ftl
  - pdfjs/web/locale/et/viewer.ftl
  - pdfjs/web/locale/eu/viewer.ftl
  - pdfjs/web/locale/fa/viewer.ftl
  - pdfjs/web/locale/ff/viewer.ftl
  - pdfjs/web/locale/fi/viewer.ftl
  - pdfjs/web/locale/fr/viewer.ftl
  - pdfjs/web/locale/fur/viewer.ftl
  - pdfjs/web/locale/fy-NL/viewer.ftl
  - pdfjs/web/locale/ga-IE/viewer.ftl
  - pdfjs/web/locale/gd/viewer.ftl
  - pdfjs/web/locale/gl/viewer.ftl
  - pdfjs/web/locale/gn/viewer.ftl
  - pdfjs/web/locale/gu-IN/viewer.ftl
  - pdfjs/web/locale/he/viewer.ftl
  - pdfjs/web/locale/hi-IN/viewer.ftl
  - pdfjs/web/locale/hr/viewer.ftl
  - pdfjs/web/locale/hsb/viewer.ftl
  - pdfjs/web/locale/hu/viewer.ftl
  - pdfjs/web/locale/hy-AM/viewer.ftl
  - pdfjs/web/locale/hye/viewer.ftl
  - pdfjs/web/locale/ia/viewer.ftl
  - pdfjs/web/locale/id/viewer.ftl
  - pdfjs/web/locale/is/viewer.ftl
  - pdfjs/web/locale/it/viewer.ftl
  - pdfjs/web/locale/ja/viewer.ftl
  - pdfjs/web/locale/ka/viewer.ftl
  - pdfjs/web/locale/kab/viewer.ftl
  - pdfjs/web/locale/kk/viewer.ftl
  - pdfjs/web/locale/km/viewer.ftl
  - pdfjs/web/locale/kn/viewer.ftl
  - pdfjs/web/locale/ko/viewer.ftl
  - pdfjs/web/locale/lij/viewer.ftl
  - pdfjs/web/locale/lo/viewer.ftl
  - pdfjs/web/locale/locale.json
  - pdfjs/web/locale/lt/viewer.ftl
  - pdfjs/web/locale/ltg/viewer.ftl
  - pdfjs/web/locale/lv/viewer.ftl
  - pdfjs/web/locale/meh/viewer.ftl
  - pdfjs/web/locale/mk/viewer.ftl
  - pdfjs/web/locale/ml/viewer.ftl
  - pdfjs/web/locale/mr/viewer.ftl
  - pdfjs/web/locale/ms/viewer.ftl
  - pdfjs/web/locale/my/viewer.ftl
  - pdfjs/web/locale/nb-NO/viewer.ftl
  - pdfjs/web/locale/ne-NP/viewer.ftl
  - pdfjs/web/locale/nl/viewer.ftl
  - pdfjs/web/locale/nn-NO/viewer.ftl
  - pdfjs/web/locale/oc/viewer.ftl
  - pdfjs/web/locale/pa-IN/viewer.ftl
  - pdfjs/web/locale/pl/viewer.ftl
  - pdfjs/web/locale/pt-BR/viewer.ftl
  - pdfjs/web/locale/pt-PT/viewer.ftl
  - pdfjs/web/locale/rm/viewer.ftl
  - pdfjs/web/locale/ro/viewer.ftl
  - pdfjs/web/locale/ru/viewer.ftl
  - pdfjs/web/locale/sat/viewer.ftl
  - pdfjs/web/locale/sc/viewer.ftl
  - pdfjs/web/locale/scn/viewer.ftl
  - pdfjs/web/locale/sco/viewer.ftl
  - pdfjs/web/locale/si/viewer.ftl
  - pdfjs/web/locale/sk/viewer.ftl
  - pdfjs/web/locale/skr/viewer.ftl
  - pdfjs/web/locale/sl/viewer.ftl
  - pdfjs/web/locale/son/viewer.ftl
  - pdfjs/web/locale/sq/viewer.ftl
  - pdfjs/web/locale/sr/viewer.ftl
  - pdfjs/web/locale/sv-SE/viewer.ftl
  - pdfjs/web/locale/szl/viewer.ftl
  - pdfjs/web/locale/ta/viewer.ftl
  - pdfjs/web/locale/te/viewer.ftl
  - pdfjs/web/locale/tg/viewer.ftl
  - pdfjs/web/locale/th/viewer.ftl
  - pdfjs/web/locale/tl/viewer.ftl
  - pdfjs/web/locale/tr/viewer.ftl
  - pdfjs/web/locale/trs/viewer.ftl
  - pdfjs/web/locale/uk/viewer.ftl
  - pdfjs/web/locale/ur/viewer.ftl
  - pdfjs/web/locale/uz/viewer.ftl
  - pdfjs/web/locale/vi/viewer.ftl
  - pdfjs/web/locale/wo/viewer.ftl
  - pdfjs/web/locale/xh/viewer.ftl
  - pdfjs/web/locale/zh-CN/viewer.ftl
  - pdfjs/web/locale/zh-TW/viewer.ftl
  - pdfjs/web/viewer.css
  - pdfjs/web/viewer.html
  - pdfjs/web/viewer.mjs
  - scripts/buildAirfieldsFromOurAirports.js
  - scripts/buildAlternatesFromCsv.js
  - scripts/fetchWeather.js
  - scripts/fetchWindGrid.js
  - state.md
  - state_manuell.md
  - tools/config-crypto.mjs
  - tools/update_state.mjs
<!-- STATE:AUTO:END -->

---

## TL;DR (30 Sekunden)
- **App:** PWA / GitHub Pages (thorsproject/fp)
- **Views:** Map, Checklist, Fuel, Performance, Settings (Topbar Switch)
- **Core-Fokus aktuell:** (kurz: z.B. “Telefon-Popup + Config-Access”, “ORM Workflow”, etc.)

---

## Architektur-Überblick
### UI / HTML
- `index.html` lädt CSS + `js/app.js` (module)
- Views: `#view-map`, `#view-checklist`, `#view-fuel`, `#view-performance`, `#view-settings`
- Partials werden via `data-include="partials/..."` geladen (Loader in app.js)

### JS Module (wichtigste)
- `js/app.js`: Bootstrapping (includes, init Reihenfolge)
- `js/ui/*`: qs/qsa, SEL, setText, readValue, setValue, event helpers
- `js/config_store.js`: Config laden/entschlüsseln, Passwort-Handling, Cache
- `js/orm.js`: ORM Overlay (Draft/Finalize/Badge/Lock/Signature)
- `js/signature_store.js`: Unterschrift (DataURL) local
- `js/signature_stamp.js`: pdf-lib stempeln + Felder locken
- `js/checklist.js`: lokale Checklist-States (toggles/fields)
- `js/phones.js`: Phone Buttons -> Config phones -> Popup (Passwort erforderlich)
- `js/phone_popup.js`: Modal UI (anzeigen/kopieren/schließen)

---

## Datenhaltung (localStorage Keys)
- `fp.orm.draft.v1`: ORM Draft (Base64 ArrayBuffer)
- `fp.orm.status.v1`: ORM Status (`template|draft|final`)
- `fp_checklist_v1`: Checklist toggles + fields
- `signature.*`: (siehe signature_store.js) – Unterschrift DataURL
- `config.*`: (siehe config_store.js) – config.enc cache/passwort/etc.

---

## ORM Workflow (Soll-Verhalten)
- Button in Checklist: **“ORM öffnen / Entwurf öffnen / ORM finalisiert”**
- **Entwurf speichern:** nur localStorage, Overlay schließt
- **Finalisieren:** stempelt Unterschrift + lockt Felder + Export via Save Picker/Download
- Nach Finalisierung: **ORM Button disabled**, **Mail EO senden enabled**
- Änderung an Datum/Callsign: Status zurück auf template, Draft/Final invalidieren

### PDF Hinweise
- macOS Vorschau zeigt Formularwerte ggf. nicht zuverlässig.
- PDF Expert / Acrobat Pro ok.

---

## Telefon / Config Workflow
- Telefonnummern liegen in `config.enc` unter `phones`.
- Telefonbuttons tragen `data-phone-key="..."`.
- Klick ohne entsperrte Config -> Popup Hinweis: Passwort in Settings erforderlich.

---

## CSS Struktur
- `reset.css`: **echtes Reset** (box-sizing, default margins, form controls inherit, remove native button styles) → **bleibt**.
- `base.css`: Root-Variablen + globale Basics (Farben/Typo).
- `layout.css`: Shell/Topbar/Views (Layout, Positioning).
- `utils.css`: kleine Helper (z.B. `.is-hidden`, `.u-danger-strong` etc.).
- `components.css`: **nur** wiederverwendbare UI-Komponenten (Panels/Inputs/Buttons/SaveIndicator). Aufgeräumt: keine doppelten Input-Regeln, keine ungenutzten Modifier mehr (außer `.c-input.was-clamped` aus `fuel.js`).
- View-spezifisch: `checklist.css`, `fuel.css`, `route.css`, `map.css`, `settings.css`, `performance.css`.
- Overlays: `overlays.css` (ORM Overlay, Signature Modal, Phone Popup).

**Buttons (aktueller Stand)**
- Basis: `.c-btn`
- Topnav Tabs: `.c-tab` (+ `.is-active`)
- Phone/Contact: `.c-contact` (Pill, etwas auffälliger)
- Checklist Toggle: `.c-toggle` (✔/✖ via `<span class="tgl">` + `.is-checked`)
- Reset/Warn: `.c-warn`


- Checklist Toggles: persistieren in `checklist.js`. Beim Init werden gespeicherte Toggles restored; unbekannte Toggles werden default auf ✖ gerendert (damit kein „nackter“ Button nach Reload entsteht).

---

## Bekannte Stolperstellen / Fixes
- PDF.js timing: `pdfDocument` ist anfangs null, erst später loaded
- Blob-URL revoke erst nach `documentloaded` (sonst “leerer Viewer”)
- Cross-realm ArrayBuffer/TypedArray: immer normalisieren, bevor pdf-lib verarbeitet

---

## Offene Bugs / ToDos (Priorität)
1. …
2. …
3. …

---

## “So testest du es schnell”
- Lokal: (dein workflow)
- GitHub Pages: (URL)
- Szenario-Tests:
  - ORM Draft speichern -> erneut öffnen -> Werte da
  - Finalisieren -> exportierte PDF in Acrobat öffnen
  - Datum/CS ändern -> status reset
  - Phone Button -> Popup -> Copy

---

# Flight Planning Web App — State Update (Layout, Checklist, ORM)

## Architektur

* Modularer Aufbau mit `index.html` + `partials/*` via `data-include`
* Klare Trennung:

  * `layout.css` → Struktur (l-main, l-sidebar, views)
  * `components.css` → wiederverwendbare UI-Elemente
  * `route.css`, `checklist.css`, `fuel.css` → view-spezifisch
* View-System:

  * `.view` → hidden
  * `.view.is-active` → sichtbar
  * `.view.is-active.is-flex` → flex-column Layout

---

## Panel- und ResetBar-System

* ResetBars sind eigene Panels außerhalb der scrollenden Panel-Bodies
* Struktur:

  * `.view-xyz__body` → flex:1, overflow hidden
  * `.c-panel.c-panel--stack`

    * `.c-panel__head`
    * `.c-panel__body` (scrollt)
  * `.c-resetBar` (fix unten im View)
* Konsistenter Abstand über margin (kein transform/top mehr)

---

## Sidebar / Route / Legs

* `.l-sidebar` fix: `flex: 0 0 530px`
* Scrollbar-Gutter nur auf `.c-panel__body`, nicht auf Sidebar
* master-grid basiert auf 6 Spalten (Details später entfernt → jetzt 4 Hauptspalten)
* Toggle-Buttons und Inputs stabilisiert

---

## Checklist View

* Struktur vereinheitlicht mit Route und Fuel
* `.c-panel__body` hinzugefügt → ResetBar sitzt korrekt unten
* ToDo-Schrift verkleinert (~12px)
* Kontakt-Text (`email`, `intranet`) eigene Klasse `.cg-contacts-text`
* intranet nutzt `.cg-contacts--wide` → grid-column span
* Wachleiter-Buttons vertikal gestapelt
* saubere Trennlinien zwischen `.cg-row`

---

## Fuel View

* gleiche Architektur wie Checklist und Route
* ResetBar vollständig getrennt vom Panel
* keine Altlasten mehr (`fuel-card` entfernt)

---

## Icons und Buttons

* SVG Icon-System aktiv (`assets/icons.svg`)
* Phone Buttons → mint pill style
* Reset Buttons → orange bevel style
* ORM Button → amber pill style (`.c-orm`)

---

## ORM Integration

* Button ID: `btnOrm`
* Listener in orm.js aktiv (`openOrm`)
* ORM Viewer öffnet korrekt (pdf.js iframe)

---

## Edge-spezifische Erkenntnis

* Edge reserviert Scrollbar-Breite strikt → scrollbar-gutter nur auf Scroll-Container
* Border-width 1.11111px war Folge von Zoom ≠ 100%
* Layout korrekt bei 100% Zoom

---

## Aktueller Status

Layout stabil in:

* Chrome
* Brave
* Safari
* Firefox
* Edge (bei 100% Zoom)

ResetBars, Panels, Checklist, Fuel und Route funktionieren konsistent.

---
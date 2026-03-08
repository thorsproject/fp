# Flight Planning – Projektzustand (state)

> **Zweck:** Kurzer, belastbarer Projekt-Checkpoint, damit neue Chats/Debug-Sessions ohne Context-Posting starten können.

---

## Auto-Update (wird per Script gepflegt)
<!-- STATE:AUTO:BEGIN -->
- Last updated (commit time): 2026-03-07T18:11:17+01:00
- HEAD: 61ea449
- Branch: main
- App Version: 0.3
- Active Features:
  - ORM Workflow
  - Signature Stamping
  - Phone Popup (Config-locked)
  - Checklist State
  - Fuel Planning
  - Performance Planning
  - Map View
- Last commits:
- 61ea449 STATE: Add DFS runway generator and initial runway dataset (thorsproject)
- Changed files (this commit):
  - .DS_Store
  - .github/workflows/update-state.yml
  - .github/workflows/update-weather.yml
  - .github/workflows/update-runways.yml
  - .gitignore
  - .vscode/tasks.json
  - Layout_structure.txt
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
  - data/Bildschirmfoto 2026-02-16 um 00.52.16.png
  - data/ORMBlatt.pdf
  - data/airfields.json
  - data/airfields_missing.txt
  - data/alternates.json
  - data/alternates_missing.txt
  - data/approved_airfields.csv
  - data/approved_alternates.csv
  - data/config.enc
  - data/performance_runways.json
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
  - js/performance.js
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
  - tools/icons.svg
  - tools/icons0.svg
  - tools/icons1.svg
  - tools/update-runways-auto.mjs
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

## Aktueller Status 01.03.2026

Layout stabil in:

* Chrome
* Brave
* Safari
* Firefox
* Edge (bei 100% Zoom)

ResetBars, Panels, Checklist, Fuel und Route funktionieren konsistent.


# Flight Planning Web App — State Update 06.03.2026 (Checklist, Phones, FDL, Fuel)

## Checklist

Checklist ist funktional abgeschlossen.

### Toggle-System
Toggle Buttons nutzen:

data-tb="..."

Beispiele:

data-tb="orm"  
data-tb="wx"  
data-tb="eo"

Zustände:

✖ = rot  
✔ = mint

### Persistenz

Checklist State wird gespeichert in:

fp_checklist_v1

Beim Laden der Checklist werden alle gespeicherten Toggle-States wiederhergestellt.

Fix implementiert:
Beim Init wird jetzt **immer** `checklistApplyToggle()` aufgerufen, auch wenn der Key im Storage existiert.  
Dadurch entstehen keine weißen Toggle Buttons mehr nach einem Reload.

---

## ORM Workflow

ORM Button befindet sich in Checklist.

Button:

btnOrm

Button Text:

"ORM öffnen"  
"Entwurf öffnen"  
"ORM finalisiert"

Statuslogik:

template → Standardzustand  
draft → Entwurf gespeichert  
final → ORM finalisiert

Speicherorte:

fp.orm.draft.v1  
fp.orm.status.v1

Verhalten:

Draft speichern  
→ Status "Entwurf lokal gespeichert"  
→ Checklist Toggle bleibt ✖

Finalisieren  
→ Badge "ORM finalisiert"  
→ Checklist Toggle ✔  
→ Button disabled

Datum oder Callsign Änderung  
→ ORM Status reset auf template

---

## Mail EO

Button:

btnMailEO

Zustände:

disabled → solange ORM nicht finalisiert  
aktiv → wenn ORM finalisiert  
mint → nach Klick (Mail gesendet)

Mint Zustand bleibt bis:

Datum oder LFZ geändert wird.

---

## Phone System

Telefon Buttons nutzen:

data-phone-key="..."

Beispiele:

wx_muenster  
bremen  
laage_rdr

Telefonnummern werden geladen aus:

config.enc → phones{}

Popup wird geöffnet über:

showPhonePopup()

Wenn Config nicht entsperrt ist:

Popup Hinweis  
"Passwort in Settings erforderlich"

---

## FDL Button

Neuer Telefonbutton in Checklist.

HTML:

<button class="c-btn c-phone c-fdl" id="btnFDL">
<span class="ico">📞</span>
<span class="label">FDL</span>
</button>

Der Buttontext wird dynamisch gesetzt über:

applyFdlToHeader({ name, tel })

Dabei werden gesetzt:

FDLoutput  
TELoutput  
Button Text (.label)

Die Telefonnummer wird zusätzlich im Button gespeichert:

data-phone

Damit kann das Phone Popup direkt darauf zugreifen.

---

## Layout Status

Layout vollständig stabilisiert.

Browser getestet:

Chrome  
Safari  
Firefox  
Edge  
Brave

Fixes:

Scrollbar nur auf `.c-panel__body`  
ResetBars außerhalb der Scrollbereiche  
Symmetrische Panelabstände links/rechts

Tablet Fix:

Portrait Orientation Overlay (Rotate Hinweis)

---

# Flight Planning Web App — State Update 06.03.2026 (Fuel Planning abgeschlossen)

## Fuel Planning

Fuel Planning ist funktional und optisch vorerst abgeschlossen.

### Funktionen
- Fuel Toggle Logik funktioniert
- `aux_on` reagiert wieder korrekt auf Klick
- Ursache war nicht fehlender Listener, sondern dass `syncFuelToggleUI()` den Aux-State bei `std_block = on` direkt wieder auf `on` zurückgesetzt hat
- Fix: Aux wird nicht mehr in `syncFuelToggleUI()` erzwungen, sondern nur noch beim Aktivieren von `std_block` einmalig gesetzt

### Inputs / Selects
Fuel Inputs und Selects wurden auf das bestehende Komponenten-System umgestellt:

- `class="c-input"`
- `class="c-select"`

Dadurch:
- keine weißen Felder mehr
- einheitliche Optik mit dem Rest der App
- keine Fuel-Sonderlösung für Input-Styling nötig

Betroffene Felder:
- `main_usg`
- `trip_usg` Leg 1–4
- `appr_ifr_n`
- `appr_vfr_n`
- `alt_usg_log`
- `#finres`

### Layout / Kompaktheit
Fuel View wurde optisch deutlich kompakter gemacht.

Umgesetzt:
- Fuel Controls links ausgerichtet
- Fuel Grid nicht mehr unnötig full-width gestreckt
- Leg 1–4 Spalten enger gesetzt
- untere KPI/Misc-Boxen ebenfalls kompakter
- lange Labels können gezielt über mehrere Grid-Spalten laufen

### Long Labels
Für breite Beschriftungen wurde ein flexibler Ansatz eingeführt:
CSS-Klassen:
- `c-desc--wide`

Beispiel:
```html
<div class="c-desc c-desc--wide">Contingency (5% Trip + Company)</div>



# Flight Planning Web App — State Update 08.03.2026

## Projekt

Webbasierte Flight-Planning App für GA-Operationen.

Hosting:

* GitHub Pages
* Repository: `thorsproject/fp`

Tech Stack:

* Vanilla JS (ES Modules)
* Leaflet Map
* GitHub Actions
* Cloudflare Worker (Tile Proxy)

---

# Aktueller Stand

## Route / Legs

* 4 Legs möglich
* Aerodrome Validierung über `airfields.json`
* Alternates integriert
* Leg Toggle aktiviert/deaktiviert Legs
* ETD / ETA Eingabe
* Karte zeigt:

  * Route
  * Departure
  * Destination
  * Alternates

---

# Fuel Planning

Komplett funktionsfähig.

Berechnungen:

* Trip Fuel
* Company Fuel
* Contingency (5%)
* Alternate Fuel
* Final Reserve IFR / VFR
* Planned Takeoff Fuel
* Extra Fuel LRC
* Takeoff Fuel
* Block Fuel
* Taxi Fuel
* Landing Fuel

Features:

* Standard Block Fuel Toggle
* Aux Tank Toggle
* Leg-abhängige Trip-Berechnung
* Kompakte Grid Darstellung

UI:

* Aviation Style Table Layout
* Item Column teilweise über mehrere Grid-Spalten
* Hervorgehobene Zeilen:

  * Takeoff Fuel
  * Block Fuel
  * Landing Fuel

---

# Performance Panel

Grundstruktur vorhanden.

Felder:
TAKEOFF
RETURN/DIV
LANDING

Automatische Werte:

* TO ICAO ← Leg1 Departure
* LD ICAO ← letzter aktiver Leg Destination
* RETURN/DIV ← Departure

RWY Auswahl:

* RWY Dropdown
* TORA aus DFS Datensatz
* LDA aus DFS Datensatz

Weitere Felder:

* Flaps (UP / APP / LDG)
* EOSID Auswahl
* LM Berechnung abhängig von EOSID

---

# Runway Daten

Quelle:
DFS AIP Dataset (AIXM XML)

Script:

```
tools/update-runways-auto.mjs
```

Funktion:

* lädt aktuelle DFS Dataset Version
* extrahiert:

  * ICAO
  * RWY
  * TORA
  * LDA
* erzeugt:

```
data/performance_runways.json
```

Automatisierung:
GitHub Action

```
auto-update-AIRAC.yml
```

läuft automatisch bei AIRAC Update.

---

# Wetter

## Wind

Quelle:
Open-Meteo

Script:

```
scripts/fetchWindGrid.js
```

GitHub Action:

```
update-weather.yml
```

Erzeugt:

```
data/wind_grid.json
```

Darstellung:

* Wind Barbs
* mehrere Höhen
* Toggle Button

---

## Weather Layer (Clouds)

Darstellung:
OpenWeatherMap Cloud Tiles

Problem:
API Key darf nicht öffentlich sein.

Lösung:
Cloudflare Worker Proxy

Worker URL:

```
https://fp-weather-proxy.thors-project.workers.dev
```

Worker übernimmt:

```
/clouds/{z}/{x}/{y}.png
```

→ leitet an OpenWeatherMap weiter
→ API Key bleibt geheim

Leaflet Layer:

```
https://fp-weather-proxy.thors-project.workers.dev/clouds/{z}/{x}/{y}.png
```

---

## Radar Layer

Quelle:
RainViewer

Layer:

```
https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png
```

Darstellung:
leicht transparent über Clouds.

---

# Map Architektur

Layer Reihenfolge:

1. OSM Basemap
2. Clouds (OWM via Worker)
3. Radar (RainViewer)
4. Wind (Barbs)

Leaflet Panes:

```
cloudPane
radarPane
windPane
```

---

# Map Controls

Buttons:

```
Weather  → Cloud Tiles
Radar    → RainViewer
Wind     → Wind Barbs
```

UI:
`.ctrl-chip` Toggle Buttons

---

# Cloudflare Worker

Proxy Code:

Route:

```
/clouds/{z}/{x}/{y}.png
```

Forward:

```
https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png
```

Secret:

```
OWM_API_KEY
```

---

# GitHub Actions

Workflows:

```
update-runways.yml
update-weather.yml
update-state.yml
```

---

# Offene Punkte / Next Steps

### Map

* METAR / TAF Integration
* Radar Animation
* bessere Cloud Opacity
* Zoom-abhängige Layer Darstellung

### Performance

* Aircraft Performance Daten integrieren
* Berechnung:

  * Takeoff Roll
  * ASD
  * Stop Margin
  * Landing Roll
  * LD ABN
  * OEI ROC
  * OEI SC

### Weather

* ggf. weitere Layer
* Alternative Datenquellen prüfen

### UI

* Map Controls verfeinern
* Layer Status Anzeige
* Performance Panel Feinschliff

---

# Struktur (wichtige Dateien)

```
/js
  app.js
  map.js
  fuel.js
  performance.js
  legs.js
  wind.js

/data
  airfields.json
  performance_runways.json
  wind_grid.json

/tools
  update-runways-auto.mjs

/scripts
  fetchWindGrid.js

/workflows
  auto-update-AIRAC.yml
  update-weather.yml
```

---

Ende State Update

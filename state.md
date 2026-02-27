# Flight Planning – Projektzustand (state)

> **Zweck:** Kurzer, belastbarer Projekt-Checkpoint, damit neue Chats/Debug-Sessions ohne Context-Posting starten können.

---

## Auto-Update (wird per Script gepflegt)
<!-- STATE:AUTO:BEGIN -->
- Last updated: (script writes)
- Branch: (script writes)
- Last commits: (script writes)
- Changed files (working tree): (script writes)
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
- `base.css`: root vars + global reset basics
- `layout.css`: Shell/Topbar/Views
- `components.css`: Panels, Buttons, Inputs, Indicators
- `checklist.css`, `fuel.css`, `route.css`, `map.css` jeweils view-spezifisch
- Utilities in `utils.css`

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

## Nächster Schritt (für neuen Chat)
**Ziel:** …
**Kontext:** …
**Fehlerbild:** …
**Relevant files:** …
**Logs:** …
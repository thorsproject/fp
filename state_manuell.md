# Flight Planning Web-App — Projektzustand (state.md)
Stand: 2026-02-27
Version: v0.3 (produktiver interner Einsatz, aktive Weiterentwicklung)

# 1. Projektüberblick

Web-basierte Flight Planning Anwendung für Missionsvorbereitung mit folgenden Hauptbereichen:

* Route Planung
* Map Anzeige (Leaflet)
* Checklist (inkl. ORM Workflow)
* Fuel Planning
* Performance (Platzhalter)
* Settings (inkl. geschützter Config)

Deployment über GitHub Pages:
https://thorsproject.github.io/fp/

Architektur: reines Frontend (kein Backend)

# 2. Architekturprinzipien

## Grundprinzipien

* modularer ES-Module Aufbau (`/js/*.js`)
* klare Trennung von Verantwortlichkeiten
* keine Inline-Logik in HTML
* Zustand entweder in:
  * localStorage (UI State, ORM Draft)
  * config.enc (geschützte Daten)
  * Attachment Registry (Export / Mail)

## Verzeichnisstruktur (komplett)
/fp
 ├── index.html
 ├── manifest.json
 ├── package.json
 ├── state_manuell.md
 ├── state.md
 ├── .gitignore
 ├── .github/workflows/
 │              ├── update-state.yml
 │              └── update-weather.yml
 ├── .vscode/
 │    └── tasks.json
 ├── css/views/
 │    │   ├── checklist.css
 │    │   ├── fuel.css
 │    │   ├── map.css
 │    │   ├── performance.css
 │    │   ├── route.css
 │    │   └── settings.css
 │    ├── base.css
 │    ├── components.css
 │    ├── layout.css
 │    ├── overlays.css
 │    ├── reset.css
 │    └── utils.css
 ├── data/
 │    ├── airfield_missing.txt
 │    ├── airfield.json
 │    ├── alternates_missing.txt
 │    ├── alternates.json
 │    ├── approved_airfields.csv
 │    ├── approved_alternates.csv
 │    ├── config.enc
 │    ├── ORMBlatt.pdf
 │    ├── weather.json
 │    └── windgrid.json
 ├── partials/
 │    ├── checklist.html
 │    ├── fuel.html
 │    ├── legs.html
 │    ├── performance.html
 │    └── settings.html
 ├── pdfjs/
 │    ├── build/
 │    │    ├── pdf.mjs
 │    │    └── pdf.workers.mjs
 │    └── web/
 │         ├── images/...
 │         ├── locale/...
 │         ├── viewer.css
 │         ├── viewer.html
 │         └── viewer.mjs
 ├── scripts
 │    ├── buildAirfieldFromOurAirports.js
 │    ├── buildAlternatesFromCsv.js
 │    ├── fetchWeather.js
 │    └── fetchWindGrid.js
 ├── tools
 │    ├── config-crypto.mjs
 │    └── update_stae.mjs
 └── js/
      ├── ui/
      │    ├── dom.js
      │    ├── events.js
      │    ├── index.js
      │    ├── read.js
      │    ├── selectors.js
      │    ├── state.js
      │    └── ui.js
      ├── airfields.js
      ├── app.js
      ├── attachments.js
      ├── buildAlternatesFromCsv.js
      ├── checklist.js
      ├── config-store.js
      ├── date.js
      ├── fuel.js
      ├── fuelConstants.js
      ├── include.js
      ├── intranet_detect.js
      ├── legs.js
      ├── lfz.js
      ├── mail_eo.js
      ├── map.js
      ├── metar.js
      ├── orm.js
      ├── path.js
      ├── phone_popup.js
      ├── phones.js
      ├── reset.js
      ├── resize.js
      ├── signature_stamp.js
      ├── signature_store.js
      ├── signature_ui.js
      ├── storage.js
      ├── vertprof.js
      └── wind.js

# 3. Zentrale Systeme
## 3.1 Config System (geschützt)

Datei:
    config.enc

Inhalt (verschlüsselt):
    phones
    airfields
    alternates
    emails
    https://...

Laden über:
    loadConfig()

Eigenschaften:
    * Passwortgeschützt
    * wird im Speicher gecached
    * nicht automatisch persistent entschlüsselt

Verwendung:

Module:
    * phones.js
    * airfields.js
    * mail_eo.js
    * etc.

## 3.2 Checklist System

Datei:
    js/checklist.js

Speichert in localStorage:
    fp_checklist_v1

Struktur:
    {
    toggles: { wx:true, orm:false, ... },
    fields: { wx_nr:"...", wx_void:"...", wx_init:"..." }
    }

Eigenschaften:
    * vollständig lokal
    * kein Export in config
    * UI wird automatisch wiederhergestellt

    ## 3.2.1 Phone System

    Dateien:
        phones.js
        phone_popup.js

    Funktion:
        * liest Telefonnummern aus config.enc
        * zeigt Popup statt Toast
        * blockiert Anzeige wenn Config gesperrt

    HTML Konvention:
        data-phone-key="wx_muenster"


## 3.2.2 ORM System (kritisch)

Datei:
    js/orm.js

Verwendet:
    pdf.js
    pdf-lib
    localStorage
    signature_store.js

### ORM Zustände

Status wird gespeichert in:
    fp.orm.status.v1

Mögliche Werte:
    template
    draft
    final

### Draft Speicherung

Key:
    fp.orm.draft.v1

Inhalt:
Base64 PDF

Eigenschaften:
    * vollständiger PDF Zustand
    * enthält Formularwerte
    * enthält KEINE Sperren
    * enthält KEINE finale Signatur

### Finalisierung

Workflow:
    PDF.js export
    → signature_stamp.js
    → lockFieldsInPdf()
    → Save Dialog
    → clear draft
    → status = final

Finalisierte Felder sind read-only.

### ORM Reset Trigger

Automatisch bei Änderung von:
    Callsign
    Datum

Logik:
    resetOrmToTemplate()

## 3.5 Signature System

Dateien:
    signature_store.js
    signature_stamp.js

Speichert lokal:
    fp.signature.image

Verwendung:
    * Initials Feld
    * Signature Feld

Kein echtes kryptografisches Signing.

Nur visuelle Dokumentation.

## 3.6 Attachment System

Datei:
    attachments.js

Zweck:
Sammlung exportierter Dateien für:
    * Mail EO
    * Export Funktionen

Speicher:
in memory registry

# 4. UI Architektur

Selektoren zentral definiert in:
    js/ui/selectors.js

Beispiel:
    SEL.orm.btnOpen
    SEL.checklist.toggleBtn

Verwendung:

immer über:
    qs()
    qsa()
    closest()

Nie direkt querySelector verwenden, wenn Selector existiert.

# 5. PDF.js Integration

Viewer:
    /pdfjs/web/viewer.html

Wird geladen über:
    viewerUrl()

Eigenschaften:
    * Form editing aktiv
    * scripting deaktiviert
    * annotationStorage wird verwendet
    * saveDocument() wird verwendet

Bekannte Einschränkung:
    macOS Vorschau zeigt Formwerte nicht korrekt.
    Acrobat / PDF Expert funktionieren korrekt.

# 6. LocalStorage Keys Übersicht

- `fp.orm.draft.v1`: ORM Draft (Base64 ArrayBuffer)
- `fp.orm.status.v1`: ORM Status (`template|draft|final`)
- `fp_checklist_v1`: Checklist toggles + fields
- `signature.*`: (siehe signature_store.js) – Unterschrift DataURL
- `config.*`: (siehe config_store.js) – config.enc cache/passwort/etc.

# 7. Aktueller stabiler Funktionsumfang

Funktioniert vollständig:
    * ORM öffnen
    * Draft speichern
    * Draft wieder öffnen
    * Finalisieren
    * Felder sperren
    * Signatur einfügen
    * Status Badge
    * Telefon Popup mit Config Schutz
    * Checklist Persistence
    * Config Encryption / Passwortschutz

# 8. Bekannte Einschränkungen

Keine kritischen Bugs aktuell.
Bekannte technische Einschränkungen:
    macOS Preview zeigt Formwerte nicht korrekt.
    Kein Backend (rein lokal)
    Signatur ist visuell, nicht kryptografisch

# 9. Wichtig für zukünftige Entwicklung

Folgende Regeln unbedingt einhalten:

## ORM
Niemals direkt template überschreiben.
Immer Workflow:
    Draft → Final

## Config
Nur über config_store.js zugreifen.
Nie direkt config.enc lesen.

## Telefonnummern
Nur über:
    data-phone-key
    phones.js

## UI Zugriff
Nur über:
    SEL.*
    qs()

# 10. Einstiegspunkt für neue Chats

Wenn ein neuer Chat gestartet wird, diesen Kontext geben:
"Arbeite auf Basis von state.md.
Projekt ist Flight Planning Web-App auf GitHub Pages.
Architektur modular mit pdf.js ORM Workflow, config.enc, localStorage Draft System."

Optional zusätzlich Problem beschreiben.

# 11. Priorisierte nächste Entwicklungsschritte (optional)

Mögliche nächste Verbesserungen:
    * Export gesamter Mission als Paket
    * Verbesserte Attachment Verwaltung
    * Config Editor UI
    * Mehr ORM Automatisierung
    * Performance View implementieren
    * Offline vollständige PWA Unterstützung

# Ende state.md

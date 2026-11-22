# Wohnungsfinder Dortmund · die Karte

Ganz Dortmund als interaktive 3D-Karte in three.js: 26 × 23 km, jede Straße, jedes Gewässer, jede Grünfläche und rund 379.000 Gebäude aus OpenStreetMap. Zwölf erfundene Neubauprojekte stehen als violette Modelle darauf. Ein Klick öffnet die Karte des Projekts, „Entdecken" lädt seine eigene Seite: das Gebäude in seiner echten Nachbarschaft, drehbar, mit Datenblatt.

Vorbild für Aufbau und Funktionen ist die Dubai-Karte von Todor3D für Evolutions: eine Kartenseite, eine Seite pro Immobilie.

## Was die Seite kann

- **Karte bewegen:** ziehen zum Verschieben, Mausrad oder zwei Finger zum Zoomen, rechte Maustaste oder Drehgeste zum Drehen, Pfeiltasten, `+` und `−`, `Q` und `E`. Die Kamera schaut aus der Ferne fast senkrecht und neigt sich beim Näherkommen.
- **Gebäude wachsen:** In der Übersicht sind die Häuser flache Blöcke. Wer näher kommt, bekommt rund um den Blick alle Gebäude mit ihrer Höhe; sie wachsen aus dem Boden.
- **Projekte:** Pins über den Modellen, aus der Ferne nur das Kürzel. Klick auf Pin oder Gebäude: Die Kamera fliegt hin, eine Karte nennt Lage, Kaufpreis, Wohnfläche und Fertigstellung. „Entdecken" führt zu den fünf Häusern des Projekts (`/threejs-demo-7/haeuser/`): jedes anklickbar und begehbar, drei verkauft, zwei frei. „Lage in 3D" führt zur Projektseite.
- **Stadtteil-Auswahl:** fliegt zu 16 Stadtteilen oder zurück zur Übersicht.
- **Menü:** die Liste aller Projekte.
- **Sprache:** Deutsch und Englisch.
- **Projektseite** (`objekt.html?id=…`): Das Modell dreht sich langsam in seiner Nachbarschaft, daneben das Datenblatt, darunter „Zurück zur Karte", Google Maps und „Drehen". „Häuser ansehen" führt zu den fünf Häusern.

## So ist sie gebaut

- **Daten:** `tools/extract.py` schneidet Dortmund und Umgebung aus einem OpenStreetMap-Auszug, `tools/place.py` rückt die erfundenen Projekte auf freie Flächen, `tools/build.py` schreibt daraus gepackte Binärdateien nach `data/`.
- **Zwei Detailstufen:** `data/base.bin.gz` (5,7 MB) enthält die ganze Übersicht: Wasser, Wald, Grün, die großen Straßen als Flächen, die kleinen als Linien, Bahn, Stadtgrenze und alle Gebäude zu Blöcken verschmolzen. Dazu kommen 42 Dateien `data/c_x_z.bin.gz` (zusammen 11 MB) mit jedem einzelnen Gebäude und den kleinen Straßen; geladen wird nur, was in der Nähe des Blicks liegt.
- **Nichts ruckelt beim Nachladen:** Ein Worker (`js/worker.js`) entpackt die Dateien und baut Dächer und Wände samt eingebackenem Licht abseits des Hauptfadens.
- **Kein Licht, keine Schatten zur Laufzeit:** Alle Farben stehen in den Eckpunkten. Die Karte zeichnet nur, wenn sich etwas bewegt, und nichts, solange die Seite verborgen ist. Flächen und Gebäudeblöcke sind in 4-km-Stücke geteilt, damit nur gezeichnet wird, was die Kamera sieht.
- **Geräte:** `js/quality.js` wählt die Auflösung nach Gerät und regelt nach. Handys laden einen kleineren Umkreis an Gebäuden und lassen Schuppen und Garagen weg.
- **Projekte als Code:** `js/models.js` baut die zwölf Gebäude aus wenigen Formen (Turm, Scheibe, Terrassenhaus, Hofblock, Zeilen, Stadthäuser, Speicher). Ihre Daten stehen in `js/projects.json`.

## Karte neu bauen

```bash
pip install osmium shapely numpy mapbox-earcut
# Auszug für den Regierungsbezirk Arnsberg, z. B. von download.openstreetmap.fr
python3 tools/extract.py arnsberg.osm.pbf raw.pkl
python3 tools/place.py raw.pkl        # nur nötig, wenn Projekte dazukommen
python3 tools/build.py raw.pkl data/
```

## Lokal starten

```bash
python -m http.server 8000
```

Dann http://localhost:8000/ öffnen. `?q=low|mid|high` erzwingt eine Gerätestufe, `?dpr=1` legt die Auflösung fest, `?still` überspringt den Anflug, `?p=kronenturm` öffnet die Karte bei einem Projekt.

## Herkunft und Lizenzen

- Kartendaten © [OpenStreetMap](https://www.openstreetmap.org/copyright)-Mitwirkende, [Open Database License](https://opendatacommons.org/licenses/odbl/). Die Dateien in `data/` sind daraus abgeleitet.
- Schrift: Manrope (SIL Open Font License, `fonts/Manrope-OFL.txt`). three.js (MIT) kommt von einem CDN.
- Alle Projekte, Namen, Preise und Daten sind erfunden. Für ihre Bauplätze wurden in der Karte einzelne echte Gebäude entfernt.

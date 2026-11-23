# three.js Demos

Sechs Wege, eine flache Architekturzeichnung in ein 3D-Erlebnis zu verwandeln, durch das man scrollt. Diese Seite ist die Übersicht: Sie lädt alle sechs Demos in einem Fenster und lässt Sie zwischen ihnen und ihren Varianten wechseln.

[**Übersicht live ansehen**](https://seofessionals-3js.github.io/threejs-demos/) · läuft auf Laptop, Tablet und Handy

## Die sechs Demos

| | Demo | Technik | Was passiert | Code |
|---|---|---|---|---|
| 1 | **[three.js Demo 1](https://seofessionals-3js.github.io/threejs-demo-6/)** | Kartonmodell | Ein weißes Kartonmodell nachts auf dem Tisch. Tauchen Sie hinab zur Maßstabsfigur, und der Karton wird zum echten Haus. | [Code](https://github.com/seofessionals-3js/threejs-demo-6) |
| 2 | **[three.js Demo 2](https://seofessionals-3js.github.io/threejs-demo-4/)** | Bauzeitraffer | Projekt Steininger: sechs Zeichnungen eines Hauses, Phase für Phase. Die Baustelle entsteht aus Scanlinien, dann gehen Sie durch drei Geschosse, die sich Woche für Woche einrichten, bis zur Übergabe am Pool. | [Code](https://github.com/seofessionals-3js/threejs-demo-4) |
| 3 | **[three.js Demo 3](https://seofessionals-3js.github.io/threejs-demo-2/)** | Schnitt-Scan | Ein Schnitt öffnet sich in die Tiefe, ein Scan macht aus Tusche Material und aus den gezeichneten Sonnenwinkeln echte Sonnenstrahlen. Dann gehen Sie durch den Schnitt hinein. | [Code](https://github.com/seofessionals-3js/threejs-demo-2) |
| 4 | **[three.js Demo 4](https://seofessionals-3js.github.io/threejs-demo-5/?dir=a)** | Bauzeitenplan | Projekt Steininger nach Plan: Scrollen Sie durch 38 Wochen Bauzeitenplan, und das Travertinhaus am Hang baut sich Balken für Balken selbst, samt Turmdrehkran. Dann öffnet sich die Tür zum Hof, und Sie gehen hinein bis an den Pool. | [Code](https://github.com/seofessionals-3js/threejs-demo-5) |
| 5 | **[three.js Demo 5](https://seofessionals-3js.github.io/threejs-demo-3/?dir=a)** | Offener Schnitt | Ein flacher Schnitt zeichnet sich selbst. Das Objektiv öffnet sich, während der Schnitt seine Größe behält, und die Kamera besucht jede Ebene. | [Code](https://github.com/seofessionals-3js/threejs-demo-3) |
| 6 | **[three.js Demo 6](https://seofessionals-3js.github.io/threejs-demo-1/?dir=a)** | Explosionsaxonometrie | Eine Explosionsaxonometrie setzt sich Schicht für Schicht in Bauabfolge zusammen. Dann weitet sich das Objektiv auf Augenhöhe, und Sie gehen hinein. | [Code](https://github.com/seofessionals-3js/threejs-demo-1) |

Die Nummern in Übersicht und Schau folgen der Reihenfolge der Schau, nicht den Repository-Namen. Die Repositories behalten ihre Namen, damit alle Adressen gültig bleiben.

## Sechs Demos, sechs Zeichenmedien

Jede Demo ist in einem eigenen, echten Planmedium gezeichnet: ein Blatt, eine Linienfarbe und genau ein Akzent, der aus dem Medium kommt. Sobald aus der Zeichnung ein Haus wird, gelten die Farben seiner Baustoffe bei Tageslicht. So gehört jede Farbe zu ihrem Haus, und die sechs Demos lesen sich trotzdem als eine Reihe.

| | Haus | Medium | Blatt | Linie | Akzent |
|---|---|---|---|---|---|
| 1 | Haus Passepartout | Kartonmodell auf der Schneidematte | Schneidematte `#2a7a57`, Atelier in der Dämmerung `#323841` | Karton `#f5f2ea` | Lampenlicht `#f2a531` |
| 2 | Projekt Steininger | Bauzeichnung nach Norm | Planweiß `#f5f4ef` | Schwarz `#17191c` | Neubau-Rot `#d43a2a` (Gelb `#f0c21a` für Aushub, Grau für Bestand) |
| 3 | Haus Linie | Tusche auf Transparentpapier | `#e9e7e0` | Tusche `#1b1c1e` | Sonnenorange `#e07a12` |
| 4 | Projekt Steininger | Lichtpause mit Textmarker | `#eeedea` | Lichtpaus-Violett `#3d3492` | Textmarker `#ffd23c` |
| 5 | Casa Dos, Deià | Aquarell und Bleistift auf Bütten | `#f3ebdb` | Sepia `#3b2f27`, Poché in Rosé `#cf7d68` | Meerblau `#1b7a8c` |
| 6 | Haus Karbon | Blaupause | Preußischblau `#1e4a8c` | Weißdruck `#f3f6fb` | Gelbstift `#f4b63f` |

Die Übersicht selbst ist der Planschrank: neutrales Papier `#eceae4` und Grafit `#1d1d1b`. Ihre einzige Farbe ist die der Demo, die gerade läuft. In der Schublade zeigt jede Karte die Farbkarte ihres Mediums, und die Übergangskarte der Schau ist das Deckblatt im Medium der Demo, die als Nächste kommt.

## Eine durchgehende Schau

Die Demos laufen als eine Schau nacheinander. Wenn eine Demo oder eine ihrer Varianten zu Ende gespielt ist, schließt ein Übergang das Bild, und die nächste lädt und spielt sich von selbst ab: zuerst Demo 1, dann Demo 2, Demo 3, Demo 4 mit A, B und C, Demo 5 mit A und C, Demo 6 mit A, B und C und danach wieder Demo 1. Eigenes Scrollen, Tippen oder Klicken übernimmt jederzeit, der Knopf unten in der Mitte gibt die Steuerung zurück. In der Übersicht folgt die Leiste oben der laufenden Demo.

Das steuert [`portfolio.js`](portfolio.js) in diesem Repository. Alle Demos außer der Blaupause binden es über `/threejs-demos/portfolio.js` ein; die Blaupause (Demo 6, Repository `threejs-demo-1`) übergibt am Ende selbst an Demo 1, das Kartonmodell. `?autoplay=1` startet eine Demo von selbst, `?noshow` schaltet die Schau für eine Seite ab.

Jede Demo liegt in einem eigenen Repository mit eigener GitHub-Pages-Seite. Die Übersicht lädt sie über relative Pfade (`../threejs-demo-1/` usw.), funktioniert also nur zusammen mit den sechs Demo-Seiten unter derselben Adresse.

## So sind sie gebaut

- three.js von einem CDN, dazu einfaches HTML, CSS und JavaScript. Kein Build-Schritt, nichts zu installieren.
- Keine Bilddateien und keine 3D-Modelle. Jede Wand, jedes Material und jedes Möbelstück entsteht im Code, auch die Holz- und Ziegeloberflächen werden beim Laden auf Canvas gemalt, deshalb ist jede Demo nur etwa 100 bis 190 KB groß.
- In fünf der sechs Demos ist die flache Zeichnung das echte 3D-Modell, gesehen durch ein sehr langes Objektiv, das es flach wirken lässt. Erst das Öffnen des Objektivs macht daraus 3D.

## Lokal starten

Alle sieben Repositories (die Übersicht und die sechs Demos) nebeneinander in einen Ordner klonen, dann in diesem Ordner:

```bash
python -m http.server 8000
```

und http://localhost:8000/threejs-demos/ öffnen.

## Herkunft und Lizenz

Basiert auf „Flat to 3D“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser und Adressen in den Demos sind erfunden. Die Kontaktdaten in Demo 2 und Demo 4 (Projekt Steininger) sind echt. three.js (MIT) wird von einem CDN geladen. Die Übersicht, Demo 2 und Demo 4 nutzen die Schriften BBH Bogle und Arimo aus dem Ordner `fonts/` (SIL Open Font License, als WOFF2 auf die verwendeten Zeichen reduziert, zusammen etwa 26 KB); die übrigen Demos laden Chakra Petch und IBM Plex Mono von Google Fonts.

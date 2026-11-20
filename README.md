# three.js Demos

Sieben Wege, eine flache Architekturzeichnung in ein 3D-Erlebnis zu verwandeln, durch das man scrollt. Diese Seite ist die Übersicht: Sie lädt alle sieben Demos in einem Fenster und lässt Sie zwischen ihnen und ihren Varianten wechseln.

[**Übersicht live ansehen**](https://seofessionals-3js.github.io/threejs-demos/) · am besten auf einem Laptop

## Die sieben Demos

| | Demo | Technik | Was passiert | Code |
|---|---|---|---|---|
| 1 | **[three.js Demo 1](https://seofessionals-3js.github.io/threejs-demo-1/?dir=a)** | Explosionsaxonometrie | Eine Explosionsaxonometrie setzt sich Schicht für Schicht in Bauabfolge zusammen. Dann weitet sich das Objektiv auf Augenhöhe, und Sie gehen hinein. | [Code](https://github.com/seofessionals-3js/threejs-demo-1) |
| 2 | **[three.js Demo 2](https://seofessionals-3js.github.io/threejs-demo-2/)** | Schnitt-Scan | Ein Schnitt öffnet sich in die Tiefe, ein Scan macht aus Tusche Material und aus den gezeichneten Sonnenwinkeln echte Sonnenstrahlen. Dann gehen Sie durch den Schnitt hinein. | [Code](https://github.com/seofessionals-3js/threejs-demo-2) |
| 3 | **[three.js Demo 3](https://seofessionals-3js.github.io/threejs-demo-3/?dir=a)** | Offener Schnitt | Ein flacher Schnitt zeichnet sich selbst. Das Objektiv öffnet sich, während der Schnitt seine Größe behält, und die Kamera besucht jede Ebene. | [Code](https://github.com/seofessionals-3js/threejs-demo-3) |
| 4 | **[three.js Demo 4](https://seofessionals-3js.github.io/threejs-demo-4/)** | Bau-Zeitraffer | Projekt Steininger: sechs Zeichnungen eines Hauses, Phase für Phase. Die Baustelle entsteht aus Scanlinien, dann gehen Sie durch drei Geschosse, die sich Woche für Woche einrichten, bis zur Übergabe am Pool. | [Code](https://github.com/seofessionals-3js/threejs-demo-4) |
| 5 | **[three.js Demo 5](https://seofessionals-3js.github.io/threejs-demo-5/?dir=a)** | Bauzeitenplan | Projekt Steininger nach Plan: Scrollen Sie durch 38 Wochen Bauzeitenplan, und das Travertinhaus am Hang baut sich Balken für Balken selbst, samt Turmdrehkran. Dann öffnet sich die Tür zum Hof, und Sie gehen hinein bis an den Pool. | [Code](https://github.com/seofessionals-3js/threejs-demo-5) |
| 6 | **[three.js Demo 6](https://seofessionals-3js.github.io/threejs-demo-6/)** | Kartonmodell | Ein weißes Kartonmodell nachts auf dem Tisch. Tauchen Sie hinab zur Maßstabsfigur, und der Karton wird zum echten Haus. | [Code](https://github.com/seofessionals-3js/threejs-demo-6) |
| 7 | **[three.js Demo 7](https://seofessionals-3js.github.io/threejs-demo-7/a-one-door/)** | Sonnige Ansicht | Eine Vorderansicht, deren Schraffur der echte Schatten ist. Ein Scan macht daraus Backstein, die Sonne wandert, die Tür öffnet sich. | [Code](https://github.com/seofessionals-3js/threejs-demo-7) |

## Eine durchgehende Schau

Die Demos laufen als eine Schau nacheinander. Wenn eine Demo oder eine ihrer Varianten zu Ende gespielt ist, schließt ein Übergang das Bild, und die nächste lädt und spielt sich von selbst ab: Demo 1 mit A, B und C, dann Demo 2, Demo 3 mit A und C, Demo 4, Demo 5 mit A, B und C, Demo 6, Demo 7 mit allen drei Seiten und danach wieder Demo 1. Eigenes Scrollen, Tippen oder Klicken übernimmt jederzeit, der Knopf unten in der Mitte gibt die Steuerung zurück. In der Übersicht folgt die Leiste oben der laufenden Demo.

Das steuert [`portfolio.js`](portfolio.js) in diesem Repository. Die Demos 2 bis 7 binden es über `/threejs-demos/portfolio.js` ein, Demo 1 übergibt am Ende selbst an Demo 2. `?autoplay=1` startet eine Demo von selbst, `?noshow` schaltet die Schau für eine Seite ab.

Jede Demo liegt in einem eigenen Repository mit eigener GitHub-Pages-Seite. Die Übersicht lädt sie über relative Pfade (`../threejs-demo-1/` usw.), funktioniert also nur zusammen mit den sieben Demo-Seiten unter derselben Adresse.

## So sind sie gebaut

- three.js von einem CDN, dazu einfaches HTML, CSS und JavaScript. Kein Build-Schritt, nichts zu installieren.
- Keine Bilddateien und keine 3D-Modelle. Jede Wand, jedes Material und jedes Möbelstück entsteht im Code, auch die Holz- und Ziegeloberflächen werden beim Laden auf Canvas gemalt, deshalb ist jede Demo nur etwa 100 bis 190 KB groß.
- In fünf der sieben Demos ist die flache Zeichnung das echte 3D-Modell, gesehen durch ein sehr langes Objektiv, das es flach wirken lässt. Erst das Öffnen des Objektivs macht daraus 3D.

## Lokal starten

Alle acht Repositories nebeneinander in einen Ordner klonen, dann in diesem Ordner:

```bash
python -m http.server 8000
```

und http://localhost:8000/threejs-demos/ öffnen.

## Herkunft und Lizenz

Basiert auf „Flat to 3D“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser und Adressen in den Demos sind erfunden. Die Kontaktdaten in Demo 4 und Demo 5 (Projekt Steininger) sind echt. three.js (MIT) wird von einem CDN geladen. Die Übersicht, Demo 4 und Demo 5 nutzen die Markenfarben Waldgrün, Limette und Papier und die Schriften BBH Bogle und Arimo aus dem Ordner `fonts/` (SIL Open Font License); die übrigen Demos laden Chakra Petch und IBM Plex Mono von Google Fonts.

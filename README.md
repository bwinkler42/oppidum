# Oppidum für zwei · Direktverbindung

## Über GitHub Pages veröffentlichen

1. Entpacke das ZIP. Lade die enthaltenen Dateien und Ordner direkt in das
   Hauptverzeichnis deines öffentlichen GitHub-Repositories. Dort muss
   `index.html` liegen. Falls der Upload die versteckte Datei `.nojekyll`
   auslässt, erstelle sie über **Add file → Create new file**.
2. Wähle unter **Settings → Pages** die Option **Deploy from a branch**.
   Wähle `main` und `/ (root)` und speichere.
3. Teile die veröffentlichte Adresse
   `https://BENUTZER.github.io/REPOSITORY/`.

## Eine Partie starten

1. Schwarz wählt Brettgröße, Zeitmodus und Zeitwerte, gibt den Namen ein
   und erstellt einen Einladungscode. Schwarz sendet den Code privat an Weiß.
2. Weiß öffnet dieselbe Spieladresse, fügt den Einladungscode ein,
   trägt den Namen ein und schickt den erzeugten Antwortcode zurück.
3. Schwarz übernimmt den Antwortcode. Die Partie startet, sobald die
   Browser verbunden sind. Beide lassen ihren Spieltab geöffnet.

Beim Verbindungsaufbau nutzt der Browser einen öffentlichen STUN-Dienst
von Google, um seine erreichbare Adresse zu ermitteln. Dafür ist kein Konto
nötig. Züge werden direkt zwischen den Browsern übertragen. Ein restriktiver
Router oder eine Firewall kann die Verbindung verhindern. Nach einem
Neuladen oder Schließen des Tabs ist die laufende Partie verloren.

## Denkzeit

Standard sind 20 Sekunden pro Zug. Wählbar sind auch Fischer-Zuschlag,
Verzögerung, Gesamtzeit, japanisches Byōyomi und Spiel ohne Uhr.
Die Startwerte lassen sich vor der Einladung einstellen.

Für Zeitablauf gilt die Uhr im Browser von Schwarz. Weiß sieht einen
synchronisierten Schätzwert. Der Zug von Weiß zählt bei Eingang bei Schwarz. Nach Ablauf der sichtbaren
Uhr hat Weiß zwei Sekunden Übertragungsfrist. Diese werden weder vom
Zeitkonto abgezogen noch als Byōyomi-Perioden verbucht.
Netzverzögerung und Hintergrund-Tabs können sich besonders bei Blitzpartien
bemerkbar machen.

## Installation und Updates

Auf iPhone in Safari **Teilen → Zum Home-Bildschirm** verwenden. In Chrome
auf Android **App installieren** oder **Zum Startbildschirm** wählen, falls
angeboten. Nach dem ersten Aufruf kann die Oberfläche aus dem Browsercache
starten. Die Internetpartie benötigt eine Verbindung zwischen beiden Geräten.

Dateiänderungen im GitHub-Repository werden über Pages veröffentlicht.
Bei einem Update die Cache-Version in `sw.js` erhöhen.

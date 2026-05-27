# 🚀 PRE-DEMO CHECKLIST

**Nutze diese Liste 15 Minuten VOR der Präsentation!**

---

## ✅ Tag der Präsentation - 30 Minuten vorher

### Computer & Netzwerk

- [ ] Computer ist vollständig hochgefahren
- [ ] Internet funktioniert (nicht nötig, aber gut zum Überprüfen)
- [ ] Kein VPN aktiv (könnte Localhost blockieren)
- [ ] Alle anderen Programme sind geschlossen (außer Browser)

### Servers starten

- [ ] Terminal öffnen
- [ ] Navigiere zum Projekt-Verzeichnis
- [ ] Führe `START_DEMO.bat` aus (oder starte manuell)
- [ ] Warte 10 Sekunden, bis beide Server laufen
- [ ] Check: Siehst du "Uvicorn running on..." im Backend-Terminal?
- [ ] Check: Siehst du "ready in" im Frontend-Terminal?

### Browser vorbereiten

- [ ] Chrome oder Edge öffnen (nicht Firefox!)
- [ ] Gehe zu [http://localhost:5173](http://localhost:5173)
- [ ] Warte, dass die App vollständig lädt
- [ ] Scroll nach oben und sehe den Eyebrow "Decision Support Project · Apple Scenario"
- [ ] Beispieldaten sind sichtbar (Mia, Jonas, Lea, Lissabon, etc.)

### Browser Setup für Beamer

- [ ] Browser Zoom auf **125%** (Ctrl + Plus)
- [ ] Fullscreen **EIN** (F11)
- [ ] Alle anderen Tabs schließen
- [ ] Beamer/Zweiter Bildschirm anschließen
- [ ] Projekt-Einstellungen: Beamer als Sekundär-Display

### Funktionalität testen (2 Min)

- [ ] Klicke auf Schritt 1 "Setup" - Daten laden
- [ ] Klicke auf Schritt 2 "Bewertung" - Tabelle zeigt
- [ ] Klicke auf "Analyse starten"
- [ ] Warte 3 Sekunden
- [ ] Schritt 3 "Ergebnis" sollte zeigen: "Gewinner: Lissabon"
- [ ] Kein Fehler sichtbar

### Dokumente parat

- [ ] Drucke oder öffne [DEMO_QUICK_REFERENCE.md](DEMO_QUICK_REFERENCE.md)
- [ ] Drucke oder öffne [DEMO_PRESENTATION.md](DEMO_PRESENTATION.md)
- [ ] Falls USB-Stick: USB mit Projekt kopiert

---

## ✅ Während der Präsentation - Starten

### Kurz bevor es losgeht (5 Min)

- [ ] Stehe vor der Klasse
- [ ] "Guten Morgen/Nachmittag zusammen"
- [ ] "Ich zeige euch ein Projekt, das wir gebaut haben"
- [ ] Warte auf Ruhe

### Den Bildschirm zeigen

- [ ] Schiebe den Beamer-Bildschirm nach vorne
- [ ] Überprüfe: Deine App ist sichtbar auf dem Beamer
- [ ] Klicke auf Browser-Fenster (fokussieren)
- [ ] F11 drücken (Fullscreen, wenn nicht bereits an)

---

## ✅ Während der Demo - Checklist pro Schritt

### INTRO (2 Min)

- [ ] Stelle das Problem
- [ ] Erkläre: "Wie entscheiden Gruppen gemeinsam?"
- [ ] Klassische Lösungen sind schlecht

### SCHRITT 1: Setup (2 Min)

- [ ] Zeige auf dem Beamer: Schritt 1 ist aktiv
- [ ] Erkläre die 4 Komponenten:
  - [ ] Entscheidungsfrage
  - [ ] Teilnehmer (3 Namen)
  - [ ] Alternativen (3 Optionen)
  - [ ] Kriterien (mit Gewichtung)
- [ ] Optional: Zeige "Kriterium hinzufügen" Feature

### SCHRITT 2: Bewertung (3 Min)

- [ ] Klick auf "Bewertung" Tab
- [ ] Scrolle durch die Bewertungs-Tabelle
- [ ] Erkläre: "Jeder bewertet alles"
- [ ] Zeige Fortschrittsanzeige: "60/60 bewertet"
- [ ] Optional: Ändere ein Rating um zu zeigen, dass es interaktiv ist

### SCHRITT 3: Ergebnis (3 Min)

- [ ] Klick auf "Analyse starten" Button oben rechts
- [ ] Warte 2-3 Sekunden
- [ ] Klick auf "Ergebnis" Tab
- [ ] **Großes Moment**: "GEWINNER: Lissabon"
- [ ] Erkläre das Ranking und warum diese Reihenfolge Sinn macht
- [ ] Erkläre: "Das ist besser als Abstimmung"

### BONUS: Interaktivität (2 Min) - **Falls Zeit**

- [ ] Zurück zu Schritt 1
- [ ] Ändere Budget-Gewicht von 30 auf 50
- [ ] Klick "Analyse starten"
- [ ] Zeige: Die Ergebnisse haben sich geändert!
- [ ] Erkläre: "Das ist die Kraft der App - Live-Feedback"

### Q&A (5 Min)

- [ ] "Habt ihr Fragen?"
- [ ] Nutze [DEMO_QUICK_REFERENCE.md](DEMO_QUICK_REFERENCE.md) für Antworten
- [ ] Danke für die Fragen
- [ ] Kurzes Fazit: "Das ist Core Delight - Wissenschaft trifft Design"

---

## ✅ Falls etwas schiefgeht

### Backend antwortet nicht

**Symptom:** Fehler beim Klick "Analyse starten"  
**Fix:**

- [ ] Öffne neues Terminal-Fenster
- [ ] `cd backend`
- [ ] `python -m uvicorn app.main:app --reload`
- [ ] Warte 5 Sekunden
- [ ] Aktualisiere Browser (F5)
- [ ] Versuche erneut

### Frontend lädt nicht / ist weiß

**Symptom:** Seite ist leer oder zeigt Fehler  
**Fix:**

- [ ] F5 aktualisieren
- [ ] Ctrl+Shift+Delete (Cache leeren)
- [ ] Schließe alle Fenster
- [ ] Öffne neuen Tab: http://localhost:5173

### Beamer zeigt falsche Auflösung

**Symptom:** App ist zu groß/zu klein/verzerrt  
**Fix:**

- [ ] Windows-Einstellungen: Anzeige
- [ ] Ändere Auflösung auf native Beamer-Auflösung
- [ ] Oder nutze Browser-Zoom (Ctrl +/-)

### Port ist belegt

**Symptom:** "Address already in use"  
**Fix:**

- [ ] Schließe START_DEMO.bat Fenster
- [ ] Starte von neuem
- [ ] Oder: Nutze andere Port: `--port 8001`

---

## 🎯 Notfall-Pläne

### Plan B: Falls Backend-Server nicht starten will

- [ ] Öffne [http://localhost:8000/docs](http://localhost:8000/docs)
- [ ] Wenn das antwortet: Backend läuft, nur Frontend-Fehler
- [ ] Wenn das nicht antwortet: Backend ist wirklich weg
- [ ] "Moment Leute, mein Server braucht einen Neustart..."
- [ ] Starten Sie den Computer neu (15 Sekunden)

### Plan C: Wenn alles fehlgeschlagen ist

- [ ] Zeige die Datei [README.md](README.md) im Browser
- [ ] Erkläre die Architektur anhand des Text-Beschreibung
- [ ] Zeige den Code in VS Code (algorithm.py)
- [ ] Sage: "Das Fehler ist nur wegen der Demo-Umgebung, der Code funktioniert"

### Plan D: Handy-Demo (Letzte Rettung!)

- [ ] Falls Beamer völlig weg: App auf eigenem Handy/Tablet nutzen
- [ ] Halte vor Klasse
- [ ] Erkläre anhand des Handy-Bildschirms
- [ ] Sagt: "Die App ist responsive designed, funktioniert überall"

---

## 📝 Während der Präsentation - Notizen

**Sprechen Sie laut und deutlich**

- Klasse sollte dich von hinten verstehen
- Pause nach Sätzen (nicht zu schnell reden)

**Zeigen Sie auf dem Beamer**

- Mit Maus auf Elemente zeigen
- "Hier links sehen wir die Entscheidungsfrage..."

**Engagement einbauen**

- "Wer würde lieber nach Lissabon fahren? (Hände hoch)"
- Dann zeige die App-Analyse: "Die App sagt auch Lissabon!"

**Zeit managen**

- DEMO max 10 Minuten
- Dann 5 Min Q&A
- Nicht zu lange reden

**Fehlertoleranz**

- Wenn etwas nicht funktioniert: "Cool, das sehen sie, auch wenn etwas schief geht!"
- Bleibt ruhig, das ist normal bei Demos

---

## ✅ Nach der Präsentation

- [ ] Bedanke dich bei der Klasse
- [ ] "Danke für die Aufmerksamkeit!"
- [ ] "Weitere Fragen gerne nach der Präsentation"
- [ ] Server später ausschalten (Ctrl+C in beiden Terminals)

---

## 🎉 FERTIG!

Du hast es geschafft! Gratuliere dir selbst! 🚀

Die Präsentation ist vorbei, du warst großartig!

---

**Druckversion dieser Checklist:**

```
DEMO-TAG CHECKLIST:
☐ Servers laufen
☐ Frontend lädt
☐ Beispieldaten sichtbar
☐ Beamer angeschlossen
☐ Browser gezoomt & fullscreen
☐ QUICK_REFERENCE bei dir
☐ Alle Schritte mental durchgegangen
☐ Fallback-Pläne gelesen

GO TIME! 💪
```

---

**Viel Erfolg! Du wirst hervorragend! 🌟**

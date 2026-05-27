# Core Delight - Quick Reference Card

**Laminate this or keep it on your desk during the presentation!**

---

## 🎯 3 Kernbotschaften (memorize!)

1. **"Wissenschaftliche Methode für Gruppen-Entscheidungen"**
   - CMCAA Algorithmus
   - Fair, nicht nur Mehrheit

2. **"Einfach und schnell"**
   - 3 Schritte: Setup → Bewertung → Ergebnis
   - 15-30 Minuten statt Stunden Diskussion

3. **"Für Familien und kleine Teams"**
   - Apple's Core Delight: Ease of Use
   - Intuitiv, responsive, sofort einsatzbereit

---

## ⏱️ Zeitplan (20 Min Präsentation)

| Zeit      | Was                                          | Notizen                              |
| --------- | -------------------------------------------- | ------------------------------------ |
| 0-2 Min   | **Intro**: Das Problem                       | "Wie entscheiden Gruppen gemeinsam?" |
| 2-5 Min   | **Lösung**: Unser Ansatz                     | 3 Kernideen                          |
| 5-10 Min  | **Demo Schritt 1**: Setup                    | Daten sind schon geladen             |
| 10-13 Min | **Demo Schritt 2**: Bewertung                | Fortschrittsanzeige zeigen           |
| 13-16 Min | **Demo Schritt 3**: Ergebnis                 | "Lissabon gewinnt!"                  |
| 16-18 Min | **Interaktivität**: Ändern & Neu-Analysieren | Budget-Gewicht erhöhen               |
| 18-20 Min | **Q&A**: Fragen beantworten                  | -                                    |

---

## 🎬 Demo Quick-Links

**Frontend:** http://localhost:5173  
**Backend API:** http://localhost:8000/docs

---

## 💬 Wichtige Zitate (use in presentation)

### Das Problem:

> "Wenn eine Gruppe gemeinsam entscheiden muss, ist Abstimmung zu simpel und Diskussion zu aufwendig."

### Unsere Lösung:

> "Core Delight nutzt den CMCAA-Algorithmus - eine wissenschaftliche Methode, um die beste Entscheidung für die ganze Gruppe zu finden."

### Der Vorteil:

> "Nicht nur 'wer gewinnt' (Mehrheit), sondern 'mit welcher Lösung alle leben können' (Konsens)."

### Die Nutzung:

> "3 einfache Schritte: Entscheidung definieren, jeder bewertet, Ergebnis analysieren."

---

## 🎮 Demo Ablauf Checklist

### Vor der Demo:

- [ ] START_DEMO.bat ausgeführt oder Server laufen
- [ ] Frontend [http://localhost:5173](http://localhost:5173) ist offen
- [ ] Beispieldaten sind geladen
- [ ] Browser ist gezoomt auf 125-150%
- [ ] Fullscreen (F11) ist an

### Während der Demo:

**Schritt 1 (Setup):**

- [ ] Zeige Entscheidungsfrage
- [ ] Zeige Teilnehmer (Mia, Jonas, Lea)
- [ ] Zeige Alternativen (3 Städte)
- [ ] Zeige Kriterien (Budget 30, Wetter 25, etc.)
- [ ] Optional: Neues Kriterium hinzufügen

**Schritt 2 (Bewertung):**

- [ ] Wechsel zu "Bewertung"
- [ ] Zeige Fortschrittsanzeige (60/60)
- [ ] Erklär die Skala 1-5
- [ ] Optional: Ein Rating ändern

**Schritt 3 (Ergebnis):**

- [ ] Klick "Analyse starten"
- [ ] Zeige GEWINNER
- [ ] Zeige Ranking
- [ ] Erklär warum diese Reihenfolge Sinn macht

**Bonus (Interaktivität):**

- [ ] Zurück zu Setup
- [ ] Ändere "Budget" Gewicht auf 50
- [ ] Klick "Analyse starten" erneut
- [ ] Zeige: Ergebnisse haben sich geändert!

---

## ❓ Häufige Fragen (Antworten)

| Frage                  | Antwort                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| Warum nicht abstimmen? | Zu simpel - 1 Person verliert alles. CMCAA findet Kompromisse.               |
| Wie lange dauert es?   | 15-30 Min. Setup (2min) + Bewerten (10-20min) + Analyse (1sec)               |
| Handy-Nutzer?          | Ja! Responsive Design. Alle parallel auf Handys = schneller                  |
| Was ist CMCAA?         | Combinatorial Multi-Criteria Acceptability Analysis (Forschungs-Algorithmus) |
| Wer nutzt das?         | McKinsey, Airbus, BMW, andere Consulting-Firmen                              |
| Wo ist das Limit?      | Nicht für sehr emotionale Entscheidungen oder wenn jemand dominieren will    |

---

## 🎨 Talking Points

**Bei Setup-Schritt:**

> "Die Entscheidung muss kurz und präzise sein. Und die Gewichte zeigen: Was ist wichtiger - Budget oder Wetter?"

**Bei Bewertungs-Schritt:**

> "Hier macht die App ihren Job: Alle Meinungen sammeln, strukturiert und fair."

**Bei Ergebnis-Schritt:**

> "Der Algorithmus hat alle Bewertungen analysiert. Lissabon ist nicht 'die beste' für eine Person, sondern 'am besten für die ganze Gruppe'."

---

## 🚨 Fallback-Pläne

**Falls Backend nicht antwortet:**

- Öffne [http://localhost:8000/docs](http://localhost:8000/docs)
- Wenn schwarz: "Geben Sie mir 10 Sekunden, mein Server startet gerade..."
- Öffne Terminal, starte Backend neu

**Falls Frontend nicht lädt:**

- F5 aktualisieren
- Clear Cache (Ctrl+Shift+Delete)
- Starte Frontend neu: `cd frontend && npm run dev`

**Falls Port belegt ist:**

- "Moment, mein System braucht einen Moment..."
- Terminal schließen, 5 Sekunden warten, erneut starten

---

## 📱 Beamer/Präsentation Tipps

- **Schriftgröße:** Zoom auf 125% (Ctrl + oder Cmd +)
- **Vollbild:** F11
- **Presenter Mode:** Beamer-Software nutzen
- **Backup-Browser:** Chrome oder Edge öffnen (Firefox hat Beamer-Probleme)
- **Internetverbindung:** Nicht nötig - alles local!
- **Tastatur:** Nicht tippen wenn nicht nötig - Maus-Demo ist einfacher

---

## 🎁 Bonus Features (falls Zeit)

- **API Dokumentation zeigen:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Response JSON zeigen:** Swing ein POST ab und zeig das Ergebnis
- **Backend-Code kurz zeigen:** algorithm.py - "Hier passiert die Magie"
- **Frontend Responsiveness:** Browser verkleinern, auf Handy-Größe zoomen

---

## 📊 Präsentation Notizen

**Sprechen Sie deutlich und langsam.**

**Schauen Sie in die Klasse, nicht auf den Beamer.**

**Pausieren Sie nach wichtigen Punkten - geben Sie Zeit zum Verstehen.**

**Wenn jemand eine Frage stellt:**

- "Gute Frage!" (macht die Person happy)
- Antworte kurz
- "Noch mehr Fragen?" (nach Abschluss fragen)

**Wenn Sie nicht sicher sind:**

- "Das ist eine gute Frage, aber da bin ich mir nicht 100% sicher..."
- "Das können wir nach der Präsentation diskutieren"

---

## 💪 Selbstvertrauen-Mantra (für dich)

> "Ich habe das gebaut. Ich verstehe es besser als jeder andere hier. Ich bin der Experte. Lass mich zeigen, wie cool das ist."

---

**Viel Erfolg! Du wirst großartig! 🚀**

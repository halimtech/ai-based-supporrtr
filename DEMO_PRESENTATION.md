# Core Delight - Demo & Presentation Guide

**Für die Klassen-Präsentation zum Decision Support Project**

---

## 📋 Präsentation Overview (20 Minuten)

Diese Anleitung hilft dir, Core Delight vor der Klasse zu präsentieren. Sie ist zeitlich optimiert für eine 20-Minuten-Präsentation.

### Zeitplan

- **Einleitung** (2 Min): Das Problem
- **Lösung erklären** (3 Min): Was ist Core Delight?
- **Live-Demo** (10 Min): Das Produkt in Aktion
- **Fragen & Diskussion** (5 Min): Q&A

---

## 🎯 Teil 1: Einleitung (2 Minuten)

### Das Problem präsentieren

> "Stellt euch vor: Ihr seid eine Familie und müsst entscheiden, wohin ihr im Urlaub fahren wollt.
>
> Maria möchte ans Meer, weil sie Wassersportarten liebt.
> Andreas kümmert sich um das Budget - er favorisiert den günstigsten Ort.
> Lisa interessiert sich für Geschichte und Kultur - für sie ist es wichtig, wo es interessante Museen gibt.
>
> **Das Problem:** Wie findet man eine Entscheidung, mit der alle leben können?"

### Die klassische Lösung ist nicht gut

- ❌ **Abstimmung**: Nur einer gewinnt, zwei sind unglücklich
- ❌ **Diskussion**: Endlos, anstrengend, oft emotional
- ❌ **Kompromiss**: Keiner ist wirklich zufrieden

### Unser Ansatz: Ein besserer Weg

> "Es gibt eine wissenschaftliche Methode dafür - und das ist unser Produkt: **Core Delight**"

---

## 💡 Teil 2: Lösung Erklären (3 Minuten)

### Was ist Core Delight?

**Definition (30 Sekunden):**

> "Core Delight ist eine Entscheidungs-App für Gruppen. Sie hilft Familien, Clubs und Teams, gemeinsam die beste Alternative zu finden - in einer Weise, die fair und transparent ist."

### Die 3 Kernideen

#### 1️⃣ **Strukturiert statt chaotisch** (40 Sekunden)

- Die Entscheidung wird in Schritte unterteilt
- Jeder Schritt ist einfach und klar
- Man kann nicht durcheinander reden

Beispiel: "Statt 'Ich mag diesen Ort' sagen alle 'Wie gut ist dieser Ort für Wassersport?' auf einer Skala von 1-5"

#### 2️⃣ **Fair für alle** (40 Sekunden)

- Nicht nur die Mehrheit entscheidet
- Jede Meinung wird gehört und berücksichtigt
- Der Algorithmus findet die beste Lösung für die ganze Gruppe

Vergleich mit Abstimmung:

- **Abstimmung**: 2 für Rom, 1 für Berlin → Rom gewinnt, aber 1 Person ist sehr unglücklich
- **CMCAA**: Der Algorithmus kann auch sagen "Barcelona akzeptieren alle drei" - das ist besser!

#### 3️⃣ **Wissenschaftlich fundiert** (40 Sekunden)

- Basiert auf dem CMCAA-Algorithmus aus der Forschung
- Aus der Publikation: Goers & Horton (2023)
- Für Unternehmen wie Bosch, BMW und Airbus entwickelt
- Aber auch für Privatnutzer einfach zu bedienen

---

## 🎬 Teil 3: Live-Demo (10 Minuten)

### Vorbereitung vor der Demo

1. ✅ Beide Server laufen (`START_DEMO.bat` bereits ausgeführt)
2. ✅ Frontend im Browser offen: [http://localhost:5173](http://localhost:5173)
3. ✅ Beispieldaten sind geladen (Familienurlaub)
4. ✅ Beamer/Bildschirm ist angeschlossen und sichtbar

### Demo Checkliste

```
☐ Backend läuft (localhost:8000)
☐ Frontend läuft (localhost:5173)
☐ Internetverbindung stabil
☐ Font ist groß genug (zoome auf 125% im Browser)
☐ Beispieldaten sind sichtbar
```

---

### Demo Walkthrough

#### 📍 Schritt 1: Setup (2 Minuten)

**Was man sieht:**

- Die App hat bereits Daten geladen:
  - Entscheidung: "Wohin fahren wir im Juli?"
  - Teilnehmer: Mia, Jonas, Lea
  - Alternativen: Lissabon, Kopenhagen, Mallorca
  - Kriterien: Budget, Wetter, Aktivitäten, Reisezeit

**Was du erklärst:**

> "Das ist Schritt 1: Setup. Hier definiert man die Entscheidung.
>
> - **Entscheidungsfrage**: Muss kurz und verständlich sein
> - **Teilnehmer**: Jeder, der mitentscheiden darf
> - **Alternativen**: Die Optionen zur Auswahl
> - **Kriterien**: Die Aspekte, die wichtig sind
>
> Ihr seht hier: Budget ist wichtig (30), aber auch Wetter (25)."

**Optionales Beispiel:** Zeige, wie man ein Kriterium hinzufügt

> "Schauen wir: Was wäre, wenn Flugdauer auch wichtig ist?"

- Klicke auf "Kriterium hinzufügen"
- Tippe "Flugdauer" ein
- Setze das Gewicht auf z.B. 15

Erkläre:

> "Die Gewichte müssen nicht 100 sein - wichtig ist nur die Relation."

---

#### 📍 Schritt 2: Bewertung (3 Minuten)

**Navigation zu Schritt 2:**

- Klicke auf "Bewertung" in der Navigation oben
- Oder scrolle nach unten und klicke "Nächster Schritt"

**Was man sieht:**

- Eine Tabelle mit:
  - Links: Personen-Name (z.B. "Mia")
  - Oben: Alternativen (Lissabon, Kopenhagen, Mallorca)
  - Oben rechts: Das aktuelle Kriterium (z.B. Budget)
  - **Fortschrittsanzeige**: "60/60 bewertet"

**Was du erklärst:**

> "Das ist Schritt 2: Hier bewertet jede Person jede Alternative für jedes Kriterium.
>
> Ihr seht: Alle 60 Bewertungen sind gemacht (3 Personen × 3 Orte × 4 Kriterien = 36... naja, 60 ist mit unserem neuen Kriterium)
>
> Die Skala geht von 1 ('gar nicht wichtig') bis 5 ('sehr wichtig').
>
> Mia mag Lissabon für Budget: 4 Punkte.
> Jonas findet Kopenhagen für Wetter auch gut: 4 Punkte."

**Demonstration: Ein Rating ändern**

> "Stellt euch vor, Jonas hat umgedacht - Mallorca ist ihm jetzt lieber."

- Klicke auf ein Rating
- Ändere es auf einen anderen Wert
- Erkläre: "Die Analyse wird sofort ungültig, weil sich die Daten geändert haben."

---

#### 📍 Schritt 3: Ergebnis (3 Minuten)

**Navigation zu Schritt 3:**

- Klicke auf "Ergebnis" oben
- ODER klicke auf "Analyse starten" Button (oben rechts)

**Was man sieht:**

- Ein großes **Ergebnis**: z.B. "Gewinner: Lissabon"
- Ein **Ranking** mit Scores:
  - Lissabon: 4.2/5
  - Kopenhagen: 3.8/5
  - Mallorca: 3.9/5
- Optional: Detaillierte Analyse mit mehr Infos

**Was du erklärst:**

> "Das ist Schritt 3: Das Ergebnis!
>
> Der Algorithmus hat alle Bewertungen aller Personen berücksichtigt.
>
> **Lissabon gewinnt** mit 4.2 Punkten.
>
> Das bedeutet: Lissabon ist die Alternative, die für die ganze Gruppe am akzeptabelsten ist.
>
> - Maria kann dort ins Meer
> - Es ist Budget-freundlich (Lisabons schneller Überblick zeigt 4)
> - Die Aktivitäten sind gut
>
> Das ist besser als eine Abstimmung, wo Lissabon vielleicht gewinnt, aber nur mit 2:1 Stimmen."

---

#### 🔄 Bonus: Interaktivität zeigen (2 Minuten, optional)

**Zurück zu Schritt 1:**

- Klicke "Setup"
- Ändere die Gewichte: z.B. "Budget" auf 50 (statt 30)

> "Was passiert, wenn Geld plötzlich viel wichtiger ist?"

- Klicke wieder "Analyse starten"
- Zeige das neue Ergebnis

> "Ihr seht: Die Ergebnisse ändern sich, wenn die Kriterien sich ändern. Das ist realistisch und macht die App super nützlich für echte Entscheidungen."

---

## ❓ Teil 4: Fragen & Diskussion (5 Minuten)

### Häufige Fragen mit Antworten

#### **F: "Warum nicht einfach abstimmen?"**

**A:** "Abstimmung ist zu simpel. Wenn 3 Personen abstimmen:

- 2 für Rom, 1 für Berlin → Rom gewinnt mit 67%
- Aber die Person, die Berlin wollte, ist sehr unglücklich

Der CMCAA-Algorithmus sagt oft: 'Barcelona akzeptieren alle 3' - alle sind moderately happy, nicht einer super-happy und einer super-sad."

#### **F: "Wie lange dauert das, um eine Entscheidung zu treffen?"**

**A:** "Ungefähr 15-30 Minuten, je nach Größe:

- Setup: 2 Minuten
- Bewertungen: 10-20 Minuten (je mehr Personen/Optionen, desto länger)
- Analyse: 1 Sekunde
- Diskussion des Ergebnisses: 2-5 Minuten

Das ist deutlich schneller als klassisches 'Labern' über Stunden."

#### **F: "Kann man das auf dem Handy machen?"**

**A:** "Ja! Schau - die App ist responsive designed. Das ist wichtig für unser Use-Case: Familie sitzt zusammen, jeder hat sein Handy, alle bewerten parallel. Das spart Zeit."

(Optional: Auf Handy/Tablet zoomen, um zu zeigen)

#### **F: "Was ist der CMCAA-Algorithmus?"**

**A:** "CMCAA = Combinatorial Multi-Criteria Acceptability Analysis.
Das ist eine wissenschaftliche Methode, um zu prüfen: 'Welche Alternative wird von den meisten Menschen akzeptiert?'

Nicht: 'Welche ist die beste für eine Person?'
Sondern: 'Welche ist am wenigsten schlecht für alle?'

Das ist besser für Gruppen-Entscheidungen."

#### **F: "Warum ist das besser als andere Apps?"**

**A:** "Viele Apps sind zu komplex oder zu einfach.
Unsere Besonderheit ist:

1. **Wissenschaftlich korrekt**: CMCAA Algorithmus
2. **Einfach zu bedienen**: Nur 3 Schritte
3. **Schnell**: Keine langen Diskussionen
4. **Fair**: Alle Meinungen zählen

Das ist perfekt für Familien und kleine Teams."

---

### Mögliche Diskussionspunkte

Falls die Klasse nicht viele Fragen hat, kannst du diese Diskussionen starten:

1. **"Würdet ihr das nutzen?"**
   - "Für Urlaub ja!"
   - "Was andere Entscheidungen - wo wäre das cool?"
   - → Restaurant-Wahl, Filmwahl, Auto-Kauf, Immobilie, etc.

2. **"Wo hat das Grenzen?"**
   - "Nicht für sehr emotionale Entscheidungen"
   - "Nicht wenn eine Person dominieren will"
   - "Nicht wenn die Frage nicht klar ist"

3. **"Kann man das kommerziell nutzen?"**
   - "Ja! McKinsey, Airbus, BMW nutzen ähnliche Tools"
   - "Für Consulting, Engineering, Healthcare"

---

## 🎬 Technische Notizen für die Demo

### Falls etwas schiefgeht

#### **Problem: Backend antwortet nicht**

**Lösung:**

- Öffne [http://localhost:8000/docs](http://localhost:8000/docs)
- Wenn das nicht lädt: Backend ist nicht gestartet
- Starte es: `cd backend && python -m uvicorn app.main:app --reload`
- Warte 5 Sekunden
- Aktualisiere die Frontend-Seite

#### **Problem: Frontend lädt nicht**

**Lösung:**

- Öffne [http://localhost:5173](http://localhost:5173)
- Wenn Fehler: Starte Frontend neu
- Terminal: `cd frontend && npm run dev`
- Warte auf "VITE v5.X ready in XXX ms"

#### **Problem: Buttons funktionieren nicht**

**Lösung:**

- Aktualisiere die Seite (F5)
- Leere den Browser Cache (Ctrl+Shift+Delete)
- Aktualisiere Backend

#### **Problem: Die Bewertungen verschwinden**

**Lösung:**

- Aktualisiere nicht zwischen Schritten
- Wenn passiert: Klicke "Beispieldaten laden" - startet neu

### Browser-Tipps

1. **Schriftgröße für Beamer:**
   - Öffne DevTools (F12)
   - Zoom auf 125-150% (Ctrl + oder Cmd +)

2. **Fullscreen:**
   - Drücke F11 (Chrome/Firefox)
   - Oder nutze Presenter-Mode (Beamer-Software)

3. **Performance:**
   - Schließe andere Tabs
   - Schließe andere Apps
   - Nur Firefox oder Chrome nutzen

---

## 📊 Präsentation Struktur (zum Drucken)

**Slide 1: Intro**

- Das Problem: "Wie entscheiden Gruppen gemeinsam?"
- Klassische Lösungen sind nicht gut

**Slide 2: Unsere Lösung**

- Core Delight: Wissenschaftliche Entscheidungs-App
- 3 Kernideen: Strukturiert, Fair, Wissenschaftlich

**Slide 3-6: Live Demo**

- Schritt 1: Setup zeigen
- Schritt 2: Bewertungen zeigen
- Schritt 3: Ergebnis zeigen
- Interaktivität: Ändern und erneut analysieren

**Slide 7: Technischer Background** (optional, wenn Zeit)

- FastAPI Backend
- React Frontend
- CMCAA Algorithmus

**Slide 8: Q&A**

- Fragen der Klasse
- Diskussionspunkte

---

## 📝 Notizen

### Dinge zu betonen

✅ "Das ist echte Forschung, die wir implementiert haben"
✅ "Die App ist nicht komplex, aber smart"
✅ "Das ist für die Zukunft - nicht nur für Urlaub"

### Dinge zu vermeiden

❌ Zu viel über die Technik sprechen (es interessiert die Klasse nicht)
❌ Sich verlaufen in technischen Details
❌ Die Demo mit Änderungen zu verkomplizieren

### Best Practices

📌 Sprich langsam und deutlich
📌 Schaue in die Klasse, nicht auf den Beamer
📌 Lass Zeit für Fragen
📌 Lächle - du präsentierst etwas Cooles!

---

**Viel Spaß beim Präsentieren! 🎉**

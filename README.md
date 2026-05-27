# Core Delight - Dynamic Group Decision Support

Eine intuitive Gruppenentscheidungs-App für Familien, Vereine und kleine Teams.
Jetzt mit **Login, Räumen, Chat und Live-Voting**.

## 📋 Projektübersicht

**Core Delight** ist ein Softwareprototyp für das **Decision Support Project (SoSe 2026)** und adressiert das **Apple-Szenario** mit Fokus auf **Ease of Use**.

### 🎯 Kernmerkmale

- **Login & Registrierung**: Jeder Nutzer hat ein eigenes Konto
- **Dynamische Räume**: Erstelle einen Raum für eine Entscheidung und lade per Code ein
- **Gruppenchat**: Diskutiert live im Raum, bevor ihr votet
- **Per-Person Weights**: Jeder setzt seine eigenen Kriterien-Gewichte (1–9)
- **Per-Person Ratings**: Jeder bewertet jede Alternative auf jedes Kriterium (1–9)
- **Monte-Carlo SAW Algorithmus**: Basierend auf dem Discord-Algorithmus mit Entropie-Konsens-Prüfung und Abweichungsanalyse
- **Live-Analyse**: Sofortige Berechnung der Gruppenergebnisse mit Top-Deviator-Erkennung

## 🚀 Schnellstart

### Voraussetzungen

- **Python 3.10+** (für Backend)
- **Node.js 18+** (für Frontend)
- **pip** und **npm**

### Automatischer Start (Windows)

```bash
START_DEMO.bat
```

Das Skript startet:
1. Backend (Port 8000)
2. Frontend (Port 5173)

### Manueller Start

**Terminal 1 – Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host localhost --port 8000
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🎮 Bedienung

### 1. Registrieren / Einloggen

- Öffne [http://localhost:5173](http://localhost:5173)
- Lege einen Account an oder logge dich ein

### 2. Raum erstellen oder beitreten

- **Erstellen**: Gib einen Namen, die Entscheidungsfrage, Alternativen und Kriterien ein.
- **Beitreten**: Gib den 6-stelligen Raum-Code ein, den der Ersteller dir geschickt hat.

### 3. Chat & Votings

- Im Raum gibt es drei Tabs:
  - **Chat**: Diskutiert über die Entscheidung
  - **Vote**: Jeder setzt seine persönlichen Kriterien-Gewichte (1–9) und bewertet jede Alternative (1–9)
  - **Results**: Sobald alle (oder genug) votet haben, klickt auf **Run Analysis**

### 4. Ergebnis verstehen

Die Analyse zeigt:
- **Empfohlene Option** mit Gruppen-Score und Acceptability
- **Ranking** aller Alternativen
- **Konsens-Status**: Ob die Gruppe übereinstimmt oder nicht
- **Top Deviator**: Wer am meisten vom Gruppenkonsens abweicht (falls kein Konsens)
- **Nächste Schritte**: Vorschläge für die Moderation

## 📐 Projekt-Architektur

```
hamada/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # API Endpoints (Auth, Rooms, Chat, Voting)
│   │   ├── algorithm.py       # Monte-Carlo SAW + Entropie-Konsens
│   │   ├── models.py          # Pydantic Models
│   │   ├── db.py              # SQLite (Users, Rooms, Messages, Ratings, Weights)
│   │   └── sample_data.py     # Beispieldaten
│   └── requirements.txt
│
├── frontend/                   # React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx            # Login, Dashboard, Room (Chat/Vote/Results)
│   │   ├── main.jsx
│   │   └── styles.css         # Apple-inspirierte Styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── discordnew/                 # Referenz-Algorithmus (Discord Bot)
│   ├── backend.py             # Original Monte-Carlo SAW
│   └── ...
│
└── START_DEMO.bat             # Automatischer Starter (Windows)
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` — Registrierung
- `POST /api/auth/login` — Login
- `GET /api/me` — Aktueller Nutzer

### Rooms
- `POST /api/rooms` — Raum erstellen
- `POST /api/rooms/join` — Raum beitreten (per Code)
- `GET /api/rooms` — Meine Räume
- `GET /api/rooms/{id}` — Raum-Details (inkl. Mitglieder, Messages, Ratings, Weights)

### Chat
- `POST /api/rooms/{id}/messages` — Nachricht senden
- `GET /api/rooms/{id}/messages` — Nachrichten abrufen

### Voting
- `POST /api/rooms/{id}/weights` — Gewicht speichern (1–9)
- `GET /api/rooms/{id}/weights` — Gewichte abrufen
- `POST /api/rooms/{id}/ratings` — Rating speichern (1–9)
- `GET /api/rooms/{id}/ratings` — Ratings abrufen

### Analyse
- `POST /api/rooms/{id}/analyze` — Monte-Carlo SAW Analyse für den Raum

### Legacy
- `POST /api/decision/analyze` — Direkte Analyse (ohne Raum)
- `GET /api/sample-session` — Beispieldaten

## 🧪 Testing

```bash
cd backend
python -m unittest discover -s tests -v
```

## 🛠️ Technischer Stack

### Backend
- **Framework**: FastAPI
- **Datenbank**: SQLite (eingebaut, kein Setup nötig)
- **Algorithmus**: Monte-Carlo SAW mit Soft-Consensus / Entropie (aus `discordnew/backend.py`)
- **Libs**: numpy, pandas

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS3 (Apple-inspiriert)
- **API**: Fetch API

## 📝 Notizen zur Implementierung

### Algorithmus

Der Algorithmus stammt aus `discordnew/backend.py` und implementiert:
- **Aggregierte Urteile**: Sammelt alle unique Ratings/Weights pro Person
- **Monte-Carlo-Simulation**: 10.000 Läufe mit zufälliger Ziehung aus den aggregierten Werten
- **SAW-Berechnung**: Score = Bewertungsmatrix × Gewichtsvektor
- **Acceptability-Indizes**: Häufigkeiten der Rang-1-Platzierungen
- **Entropie-Matrix**: Misst die Unsicherheit der Urteile
- **Soft-Consensus**: Vergleicht max. Entropie mit `0.5 × log2(Alternativen)`
- **Abweichungsanalyse**: Findet den Top-Deviator bei fehlendem Konsens

### Ease of Use Fokus

- Klare 3-Schritt-Navigation pro Raum (Chat → Vote → Results)
- One participant at a time during rating
- Kurze Ergebniserklärung mit klaren nächsten Schritten
- Responsives Design

## 📄 Lizenz

Dieses Projekt ist Teil des Decision Support Project Kurses.

---

**Version**: 0.2.0  
**Datum**: Mai 2026  
**Team**: Decision Support Project - Apple Scenario

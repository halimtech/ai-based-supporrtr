# Core Delight - Windows Setup Guide

Schritt-für-Schritt Anleitung zum Einrichten von Core Delight auf Windows.

## ✅ Voraussetzungen überprüfen

### 1. Python installieren

```cmd
python --version
```

Falls nicht installiert:
1. Gehe zu https://www.python.org/downloads/
2. Lade **Python 3.10 oder neuer** herunter
3. Führe den Installer aus
4. ⚠️ **WICHTIG**: Markiere "Add Python to PATH"

### 2. Node.js installieren

```cmd
node --version
npm --version
```

Falls nicht installiert:
1. Gehe zu https://nodejs.org/
2. Lade **LTS Version** herunter
3. Führe den Installer aus

---

## 🚀 Automatischer Start (empfohlen)

Navigiere zu dem Ordner, wo `Core Delight` liegt, und führe aus:

```cmd
START_DEMO.bat
```

Das Skript wird:
✅ Alle Abhängigkeiten prüfen/installieren (inkl. numpy & pandas)
✅ Backend starten (Port 8000)
✅ Frontend starten (Port 5173)

Zwei neue Fenster sollten sich öffnen.

---

## 🔧 Manueller Start

### PowerShell-Variante

```powershell
.\START_DEMO.ps1
```

Falls Fehler "Ausführen von Skripts ist auf diesem System deaktiviert":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Schritt-für-Schritt Terminal-Methode

**Terminal 1 – Backend:**

```cmd
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host localhost --port 8000
```

**Terminal 2 – Frontend (neues Fenster):**

```cmd
cd frontend
npm install
npm run dev
```

---

## 🌐 Im Browser öffnen

Wenn alles läuft, öffne:

```
http://localhost:5173
```

Die App startet auf der Login-Seite.

---

## 🛠️ Häufige Probleme

### "Python: Befehl nicht gefunden"

Python neu installieren und "Add Python to PATH" aktivieren.

### "npm: Befehl nicht gefunden"

Node.js neu installieren.

### "Port 8000 / 5173 bereits in Verwendung"

```cmd
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Oder anderen Port verwenden:
```cmd
cd frontend
npm run dev -- --port 5174
```

### "Module not found" in Backend

```cmd
cd backend
pip install -r requirements.txt
```

### "npm ERR! 404"

```cmd
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## 🔍 Überprüfung: Läuft alles?

- **Frontend:** [http://localhost:5173](http://localhost:5173) → Login-Seite ✅
- **Backend API:** [http://localhost:8000/api/health](http://localhost:8000/api/health) → `{"status":"ok"}` ✅
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) → Swagger UI ✅

---

## 🎮 Erste Schritte in der App

1. **Registriere dich** auf der Startseite
2. **Erstelle einen Raum** (z.B. "Sommerurlaub 2025")
3. **Füge Alternativen und Kriterien** hinzu
4. **Teile den Raum-Code** mit deinen Freunden
5. **Chatet** und **votet** gemeinsam
6. **Startet die Analyse** im Vote-Tab

---

## 🧹 Aufräumen / Neustarten

```cmd
cd backend
rmdir /s /q data

cd ../frontend
rmdir /s /q node_modules
del package-lock.json
```

Dann `START_DEMO.bat` erneut ausführen.

---

## 💡 Tipps für die Demo

1. Öffne Chrome/Edge
2. Zoom auf **125%** oder **150%** (Ctrl + Plus)
3. Vollbild (F11)

---

**Version**: 2.0  
**Datum**: Mai 2026  
**OS**: Windows 10/11

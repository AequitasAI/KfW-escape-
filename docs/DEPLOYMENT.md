# Deployment – Debian + Docker Compose (+ optional Cloudflare Tunnel)

Zielbild: ein Keller-Server im internen Netz betreibt das Spiel, der Zugriff läuft optional über
einen Cloudflare Tunnel, damit keine eingehenden Router-Ports geöffnet werden müssen.

---

## 1. Voraussetzungen auf dem Debian-Host

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
# Docker Engine + Compose Plugin (offizielles Repository)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # danach einmal neu anmelden
docker compose version            # muss v2.x melden
```

Getestet mit Debian 12 (bookworm), Docker Engine 24+ und Node 22 im Image.

## 2. Repository holen und konfigurieren

```bash
git clone https://github.com/AequitasAI/KfW-Escape.git
cd KfW-Escape
cp .env.example .env
```

In `.env` mindestens setzen:

| Variable | Bedeutung |
|---|---|
| `PUBLIC_BASE_URL` | Die URL, unter der **die Spielenden** die App erreichen. Landet im QR-Code und im Join-Link. Bei Tunnel: die Tunnel-Hostname-URL, z. B. `https://escape.example.com`. |
| `PORT` | Host-Port, auf den 3001 des Containers gemappt wird. Default 3001. |
| `COOKIE_SECURE` | `1`, sobald über HTTPS ausgeliefert wird (mit Tunnel: immer `1`). |
| `LOG_LEVEL` | `info` im Normalbetrieb, `debug` nur zur Fehlersuche. |

`PUBLIC_BASE_URL` ist der häufigste Fehler beim ersten Aufsetzen: steht dort `localhost`,
zeigt der QR-Code auf das Gerät der Spielleitung statt auf den Server.

## 3. Starten

```bash
docker compose up --build -d
docker compose ps          # STATUS muss "healthy" zeigen
curl -s localhost:3001/api/health
```

Erwartete Antwort:

```json
{"ok":true,"service":"kfw-escape","title":"Die Brücke zur Zwei-Programme-Welt", ...}
```

Der Container liefert die gebaute SPA **und** die WebSocket-Verbindung über denselben Port aus –
es wird kein zweiter Webserver benötigt.

## 4. Cloudflare Tunnel (optional, empfohlen für Remote-Teilnahme)

```bash
# cloudflared installieren (einmalig)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

cloudflared tunnel login
cloudflared tunnel create kfw-escape
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: escape.example.com
    service: http://localhost:3001
    originRequest:
      # Socket.IO braucht dauerhafte Verbindungen
      noTLSVerify: false
      connectTimeout: 30s
  - service: http_status:404
```

```bash
cloudflared tunnel route dns kfw-escape escape.example.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Danach in `.env` setzen und neu starten:

```bash
PUBLIC_BASE_URL=https://escape.example.com
COOKIE_SECURE=1
```

```bash
docker compose up -d
```

WebSockets funktionieren über Cloudflare Tunnel ohne Zusatzkonfiguration. Falls eine Zwischenstelle
WebSockets blockiert, fällt Socket.IO automatisch auf HTTP-Long-Polling zurück; das Spiel bleibt
spielbar, nur die Latenz steigt.

## 5. Ablauf am Spieltag

1. Spielleitung öffnet `https://<host>/host` und erstellt eine Session.
   Die Kennung der Spielleitung liegt **nur im Browser dieses Geräts** – dieses Gerät nicht wechseln.
2. `https://<host>/display/<CODE>` auf dem Beamer bzw. im Teams-Screenshare öffnen (Vollbild, F11).
3. Teilnehmende scannen den QR-Code oder tippen den Sessioncode auf `https://<host>/`.
4. Wenn die Runde vollständig ist: **Abenteuer beginnen**.
5. Bei Problemen die Failsafes nutzen: Pausieren, Gefährten neu ziehen, Prüfung überspringen.

Empfehlung: 10 Minuten vor dem Termin einmal eine Testsession anlegen, mit dem eigenen Handy
beitreten und wieder zurücksetzen.

## 5b. Generalprobe (einmal, spätestens am Vortag)

Die Reihenfolge ist so gewählt, dass jeder Schritt genau eine Fehlerquelle ausschliesst.

```bash
# 1. Läuft der Container und ist er gesund?
docker compose ps                      # STATUS muss "healthy" sein
curl -s localhost:3001/api/health      # {"ok":true,...}

# 2. Kommt man von aussen durch den Tunnel?
curl -sI https://<eure-domain>/api/health | head -1     # HTTP/2 200

# 3. Zeigt der QR-Code nach draussen und nicht auf localhost?
curl -s https://<eure-domain>/api/sessions -X POST | grep joinUrl
```

Der dritte Punkt ist der mit Abstand häufigste Fehler: steht `PUBLIC_BASE_URL` falsch, führt der
QR-Code die Teilnehmenden auf ihr eigenes Gerät statt auf den Server. Das merkt man sonst erst,
wenn dreissig Leute gleichzeitig scannen.

Danach einmal mit dem Handy im Mobilfunknetz – nicht im WLAN – beitreten, damit auch der Weg
von aussen wirklich geprüft ist. Anschliessend `Session zurücksetzen`.

**Am Spieltag beachten:** Die Kennung der Spielleitung liegt nur im `localStorage` des Browsers,
in dem die Session erstellt wurde. Wer die Session auf dem Laptop anlegt, muss sie auch von dort
steuern – ein anderes Gerät kann die Grossbildansicht öffnen, aber nicht steuern. Das ist Absicht:
so kann niemand die Session übernehmen, der nur den Code kennt.

## 6. Betrieb

```bash
docker compose logs -f app        # strukturierte JSON-Logs
docker compose restart app        # laufende Sessions werden pausiert wiederhergestellt
docker compose down               # Volume bleibt erhalten
docker compose down -v            # löscht auch alle Sessiondaten
```

**Neustartverhalten:** Läuft gerade eine Session, wird sie beim Start des Servers aus SQLite
wiederhergestellt und in den Status `PAUSED` gesetzt. Kein Zeitverlust – die Spielleitung drückt
einmal *Fortsetzen*, alle Clients verbinden sich von selbst neu.

**Aufräumen:** Beendete Sessions werden nach einer Stunde aus dem Speicher entfernt, Daten älter
als 12 Stunden aus der Datenbank gelöscht. Für eine vollständige Löschung genügt `docker compose down -v`.

## 7. Update

```bash
git pull
docker compose up --build -d
```

## 8. Kapazität

Ausgelegt und getestet für 30 gleichzeitige Clients (Lasttest: `npm run test:e2e`, plus
`npm test -- load` für den 30-Client-Smoke-Test). Ein einzelner Node-Prozess genügt dafür deutlich;
CPU und RAM bleiben im niedrigen zweistelligen MB-Bereich.

Der Server ist bewusst **ein Prozess ohne horizontale Skalierung**: Der Spielzustand liegt im
Speicher und wird nach SQLite gespiegelt. Mehrere Instanzen hinter einem Loadbalancer wären ohne
gemeinsamen Adapter falsch – das ist für ein internes Teamevent auch nicht nötig.

## 9. Datenschutz

Gespeichert werden ausschließlich Anzeigename, eine servergenerierte opake Player-ID und der
Spielfortschritt. Keine Mailadresse, kein Passwort, kein Mitarbeiterkennzeichen, keine dauerhafte
IP-Speicherung (IP-Adressen werden nur flüchtig im Arbeitsspeicher für Rate-Limits genutzt).
Alle Daten einer Veranstaltung verschwinden mit `docker compose down -v`.

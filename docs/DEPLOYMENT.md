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
# Achtung auf den Namen: kleines "escape", Bindestrich am Ende.
# Das Repository liegt unter der Organisation AequitasAI, nicht unter einem
# persönlichen Konto - unter "meine Repositories" taucht es deshalb nicht auf.
git clone -b claude/mvp-build https://github.com/AequitasAI/KfW-escape-
cd KfW-escape-
cp .env.example .env
```

Der Stand liegt auf dem Branch `claude/mvp-build`; `main` ist noch der Ausgangszustand.

In `.env` mindestens setzen:

| Variable | Bedeutung |
|---|---|
| `PUBLIC_BASE_URL` | Die URL, unter der **die Spielenden** die App erreichen. Landet im QR-Code und im Join-Link. Bei Tunnel: die Tunnel-Hostname-URL, z. B. `https://escape.example.com`. |
| `PORT` | Host-Port, auf den 3001 des Containers gemappt wird. Default 3001. |
| `COOKIE_SECURE` | `1`, sobald über HTTPS ausgeliefert wird (mit Tunnel: immer `1`). |
| `HOST_PASSWORD` | Passwort der Spielleitung. Siehe Abschnitt 2b – ohne diesen Wert lässt sich das Spiel **nur** von dem Browser aus steuern, der die Session erstellt hat. |
| `LOG_LEVEL` | `info` im Normalbetrieb, `debug` nur zur Fehlersuche. |

`PUBLIC_BASE_URL` ist der häufigste Fehler beim ersten Aufsetzen: steht dort `localhost`,
zeigt der QR-Code auf das Gerät der Spielleitung statt auf den Server.

## 2b. Login der Spielleitung

Ohne `HOST_PASSWORD` liegt die Kennung der Spielleitung ausschliesslich im `localStorage` des
Browsers, der die Session erstellt hat. Für ein Event, bei dem die Spielleitung von einem anderen
Rechner aus startet – etwa vom Arbeitsplatz im Firmen-VPN – reicht das nicht.

Mit gesetztem Passwort gilt:

- `https://<host>/host` fragt zuerst nach dem Passwort.
- Nach der Anmeldung erscheint eine Liste **aller laufenden Sessions**; ein Klick übernimmt die
  Steuerung, unabhängig davon, auf welchem Gerät die Session angelegt wurde.
- **Session anlegen setzt die Anmeldung ebenfalls voraus.** Wer nur die URL kennt, kann auf dem
  Server keine Sessions mehr erzeugen.
- Die Anmeldung gilt 12 Stunden und übersteht einen Container-Neustart: der Signaturschlüssel liegt
  in der Datenbank, nicht im Arbeitsspeicher.

**Für die Teilnehmenden ändert sich nichts.** Sie treten weiterhin nur mit einem Anzeigenamen bei –
kein Konto, kein Passwort, keine Mailadresse.

```bash
# ein zufälliges Passwort erzeugen und in .env eintragen
echo "HOST_PASSWORD=$(head -c 18 /dev/urandom | base64 | tr -d '/+=')" >> .env
docker compose up -d
```

Prüfen, ob der Login aktiv ist:

```bash
curl -s https://<eure-domain>/api/health | grep -o '"hostLogin":[a-z]*'   # "hostLogin":true
```

Das Passwort steht im Klartext in `.env` und in der Prozessumgebung des Containers. Es schützt die
Spielsteuerung eines Teamevents, nicht mehr – ein bereits andernorts benutztes Passwort gehört hier
nicht hinein. Ein Ändern des Werts und `docker compose up -d` setzt es sofort neu.

Zehn **Fehlversuche** pro fünf Minuten und Quell-IP sperren den Login (`HOST_LOGIN_RATE_LIMIT`).
Erfolgreiche Anmeldungen zählen bewusst nicht mit: hinter dem Firmen-NAT teilen sich alle eine
IP, und niemand soll sich selbst aussperren, weil er sich auf einem zweiten Gerät anmeldet.

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

**Voraussetzung: die DNS-Zone des Hostnamens muss bei Cloudflare liegen.** Ein Tunnel wird über
einen CNAME auf `<TUNNEL-ID>.cfargotunnel.com` erreicht, und dieser Name existiert ausschliesslich
innerhalb von Cloudflares DNS. Ein entsprechender Eintrag bei einem anderen Anbieter (Strato, IONOS,
GoDaddy …) löst nirgends auf – das ist keine Konfigurationsfrage, sondern nicht vorgesehen.

Liegt die Domain woanders, muss sie zuerst als Site in Cloudflare angelegt und die Nameserver beim
Registrar umgestellt werden (Free-Plan genügt, die Domain bleibt beim Registrar). Zwei Punkte dabei:

- Ab dem Umschalten beantwortet Cloudflare die **komplette Zone**. Läuft auf der Domain E-Mail,
  müssen `MX` und die zugehörigen `TXT`-Einträge (SPF, DKIM, DMARC) vollständig übernommen sein.
  Cloudflares Import erwischt meist alles, aber ein fehlender MX-Eintrag heisst: ab sofort keine
  Mails mehr. Die importierte Liste vor dem Bestätigen gegen den Registrar prüfen.
- Der Wechsel dauert typischerweise ein bis zwei Stunden, im Extremfall 24. Nicht am Morgen des
  Termins beginnen.

Für einen schnellen Test ohne eigene Domain genügt `cloudflared tunnel --url http://localhost:3001`;
das liefert sofort eine zufällige `*.trycloudflare.com`-Adresse, die nur läuft, solange der Befehl
läuft. Für den echten Termin ist sie nicht gedacht.

Danach zwei Wege, die sich **gegenseitig ausschliessen**. Wer den Tunnel im Dashboard angelegt hat, nimmt
Variante B und legt *kein* `config.yml` an – Cloudflare verwaltet die Ingress-Regeln dann remote,
eine lokale Datei würde nur zu widersprüchlichen Konfigurationen führen.

### Variante A – alles über die Kommandozeile

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

### Variante B – Tunnel im Cloudflare-Dashboard angelegt

1. **DNS ist bereits erledigt.** Mit der Route hat Cloudflare den Eintrag selbst erzeugt: ein
   proxied CNAME vom gewählten Hostnamen auf `<TUNNEL-ID>.cfargotunnel.com`. Unter *DNS → Records*
   ist er sichtbar. Von Hand nichts anlegen – eigene A-/CNAME-Einträge auf denselben Namen kollidieren
   mit dem Tunnel.
2. **Ziel der Route prüfen:** die Published application muss auf `HTTP` / `localhost:3001` zeigen.
   Sonst verbindet der Tunnel korrekt und findet trotzdem nichts.
3. **Connector auf dem Host starten.** Solange das fehlt, steht der Tunnel im Dashboard auf
   `Inactive` mit 0 Replicas – das ist der Normalzustand vor diesem Schritt, kein Fehler.

```bash
# cloudflared installieren (wie in Variante A), dann mit dem Token aus dem
# Dashboard verbinden - der fertige Befehl steht dort unter
# "Install cloudflared connector"
sudo cloudflared service install <TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager | head -5
```

Im Dashboard wechselt der Status danach auf *Healthy*, Active replicas auf 1.

Anschliessend in `.env` denselben Hostnamen eintragen wie in der Route:

```bash
PUBLIC_BASE_URL=https://<hostname-aus-der-route>
COOKIE_SECURE=1
```

```bash
docker compose up -d
```

### Für beide Varianten

WebSockets funktionieren über Cloudflare Tunnel ohne Zusatzkonfiguration. Falls eine Zwischenstelle
WebSockets blockiert, fällt Socket.IO automatisch auf HTTP-Long-Polling zurück; das Spiel bleibt
spielbar, nur die Latenz steigt.

## 5. Ablauf am Spieltag

1. Spielleitung öffnet `https://<host>/host`, meldet sich an und erstellt eine Session.
   Ohne eingerichteten Login (`HOST_PASSWORD` leer) liegt die Kennung **nur im Browser dieses
   Geräts** – dann darf das Gerät nicht gewechselt werden.
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

**Am Spieltag beachten:** Mit gesetztem `HOST_PASSWORD` ist das Gerät egal – anmelden, Session aus
der Liste wählen, weiterspielen. Ohne Passwort liegt die Kennung nur im `localStorage` des Browsers,
in dem die Session erstellt wurde; ein anderes Gerät kann dann zwar die Grossbildansicht öffnen,
aber nicht steuern.

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

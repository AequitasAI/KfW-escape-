/**
 * Der Join-Link und die Adresse, unter der gerade gespielt wird.
 *
 * Der Server baut den Join-Link aus `PUBLIC_BASE_URL`; ist die Variable leer,
 * nimmt er den Host der Anfrage. Genau daraus entsteht die gefährlichste
 * Fehlkonfiguration dieses Spiels: Läuft die App später unter einer anderen
 * Adresse - anderer Tunnel, anderer Hostname - und `PUBLIC_BASE_URL` zeigt noch
 * auf die alte, dann scannen dreissig Leute einen QR-Code, der ins Leere führt,
 * und zwar genau in dem Moment, in dem alle im Raum stehen.
 *
 * Deshalb wird verglichen, was verglichen werden kann: Zeigt der Join-Link
 * woandershin als die Seite, auf der die Spielleitung gerade steht, ist das
 * praktisch immer ein Konfigurationsfehler.
 */
export function joinLinkOrigin(joinUrl: string): string | null {
  try {
    return new URL(joinUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Null heisst: alles in Ordnung oder nicht beurteilbar. Sonst die fremde
 * Herkunft, auf die der Join-Link zeigt.
 */
export function joinLinkMismatch(joinUrl: string, currentOrigin: string): string | null {
  if (!joinUrl || !currentOrigin) return null;
  const linkOrigin = joinLinkOrigin(joinUrl);
  if (!linkOrigin) return null;
  return linkOrigin === currentOrigin ? null : linkOrigin;
}

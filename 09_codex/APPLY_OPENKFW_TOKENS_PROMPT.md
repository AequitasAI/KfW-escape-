# APPLY OPENKFW TOKENS – Codex Prompt

Lies:
- `07_branding/OPENKFW_DESIGN_TOKENS.md`
- `07_branding/BRANDING_README.md`
- aktuellen README der Source https://github.com/openkfw/design-tokens

Dann:
1. Ermittle die aktuell maintained Bereitstellungsform der KfW Design Tokens.
2. Wenn das alte npm-Paket deprecated/EOL ist, verwende NICHT blind dieses Paket; folge dem aktuellen Maintainer-Hinweis bzw. nutze den maintained Source-Build.
3. Integriere die Light-Mode/Funktions-Tokens zentral.
4. Mappe unsere UI auf funktionale KfW-Tokens.
5. Erzeuge nur für Game-Semantik eine kleine Alias-Schicht `--game-*`.
6. Entferne ad-hoc Raw-Hex-Werte aus Corporate-UI-Komponenten.
7. Asset-/Font-/Logo-Dateien nicht ungeprüft übernehmen.
8. Prüfe Host, Join, Lobby, Game, Display und Endscreens.
9. Prüfe WCAG-Kontraste und mobile Darstellung.
10. Tests ausführen, `HANDOFF_STATUS.md` aktualisieren und committen.

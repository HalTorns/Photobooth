# Composants tiers

Photobooth est distribué sous GPL-3.0-or-later ; voir `LICENSE`. Aucun composant de Photobooth-App ou digiCamControl n’est embarqué. digiCamControl est un logiciel externe optionnel installé séparément.

- React / React DOM — MIT — https://github.com/facebook/react
- Electron — MIT, et notices Chromium/Node incluses dans sa distribution — https://github.com/electron/electron
- Lucide React — ISC — https://github.com/lucide-icons/lucide
- node-qrcode — MIT — https://github.com/soldair/node-qrcode
- Zod — MIT — https://github.com/colinhacks/zod
- ffmpeg-static — GPL-3.0-or-later — https://github.com/eugeneware/ffmpeg-static
- FFmpeg Windows x64 6.1.1 essentials (Gyan) — GPL v3 — exécutable distinct utilisé pour GIF et MP4. Son fichier `ffmpeg.exe.LICENSE` et son README de compilation sont inclus avec le binaire dans `app.asar.unpacked/node_modules/ffmpeg-static`.

Le verrouillage exact des paquets est dans `pnpm-lock.yaml`. Le build produit également `licenses/dependencies.json`, issu des paquets réellement installés, et les licences d’Electron/Chromium sont incluses dans la distribution Electron.

## Sources de FFmpeg

Binaire exact téléchargé : https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1

Source FFmpeg indiquée par le fournisseur du binaire : https://github.com/FFmpeg/FFmpeg/commit/e38092ef93

Fournisseur / configuration de compilation : https://www.gyan.dev/ffmpeg/builds/ et `ffmpeg.exe.README` fourni avec le binaire. Les bibliothèques statiquement liées ont leurs propres notices. Les sources de ce dépôt et la référence du binaire sont fournies pour la version de test ; avant une redistribution publique de l’installateur, préparer et héberger les sources correspondantes complètes, scripts de compilation et licences de toutes les bibliothèques de ce binaire. Le dépôt reste privé à ce stade.

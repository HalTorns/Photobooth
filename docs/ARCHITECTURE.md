# Architecture V0.3

## Décisions de réalisation

Le cahier des charges V0.6 est conservé dans `docs/CAHIER_DES_CHARGES_V0.6.txt`. Cette première implémentation utilise React + TypeScript, Electron et FFmpeg local, sans serveur hébergé. Aucun code de Photobooth-App n’est repris. Electron remplace le couple Tauri/Python envisagé, encore conditionnel dans le cadrage : un seul environnement JavaScript, accès aux webcams par Chromium et encodeur inclus dans le paquet Windows. Les performances restent à mesurer sur le PC cible.

L’application ne charge aucune police, image ou dépendance depuis Internet au lancement. Les seules requêtes métier sont celles du pilote digiCamControl à `127.0.0.1:5513`. La synchronisation appartient à l’application kDrive extérieure au photobooth. Le QR code encode le lien HTTPS configuré, sans appel à kDrive.

## Frontières

- `src/useCamera.ts` : sources caméra, webcam, simulation, aperçu digiCamControl, reconnexion.
- `src/imaging.ts` : filtres, composition PNG, recadrage des rendus, montages.
- `src/App.tsx` : prise de vue, organisateur, album et état des cadres.
- `src/GuestView.tsx` : interface invités épurée et commandes du kiosque.
- `src/useStickers.ts` : bibliothèque autorisée, images partagées et exemplaires à positions normalisées ; `src/StickerLayer.tsx` : manipulation par Pointer Events et corbeille. Voir `docs/STICKERS.md`.
- `assets/layouts.json` : dimensions des modèles et des six fenêtres du photomaton ; voir `docs/CADRES.md`.
- `electron/digicam.cjs` : protocole HTTP digiCamControl. Testé avec un serveur simulant le protocole, pas avec un appareil réel.
- `electron/main.cjs` : autorisations, PIN, fichiers, sessions, dialogues natifs, kiosque.
- `electron/config.cjs` : schéma versionné, validation, stockage atomique, hachage du PIN.
- `electron/media.cjs` : processus FFmpeg sans shell, GIF avec palette, MP4 H.264/AAC.
- `electron/preload.cjs` : liste explicite de commandes IPC, sans accès Node dans la page.

## Pilotes et capacités

| Source | Aperçu | Photo / série | GIF / boomerang | Vidéo | Validation |
| --- | --- | --- | --- | --- | --- |
| Simulation | Oui | Oui | Oui | Oui, microphone optionnel | Tests logiciels |
| Webcam Windows | getUserMedia | Oui | Oui | Oui, microphone optionnel | À tester sur périphérique |
| digiCamControl | liveview.jpg | capture + téléchargement JPEG | Désactivés | Désactivée | Protocole simulé uniquement |
| GoPro, iPhone, Sony | — | — | — | — | Pilotes spécifiques futurs ; webcam possible si le périphérique expose ce mode |

La sélection « automatique » prend la première webcam disponible, sinon le premier appareil listé par digiCamControl. Elle ne bascule pas vers la simulation si la caméra physique manque. La source reste unique ; la simulation est toujours explicitement affichée. Les réglages d’exposition restent ceux de la caméra / de digiCamControl pour cette version.

## Captures et reprise

Le processus principal ouvre une session avant le décompte. Chaque original est écrit et synchronisé sur disque avant la suite du traitement ; les rendus intermédiaires et le manifeste sont également conservés. La vidéo utilise une séquence JPEG à cadence cible de 10 images/s en économie ou 15 images/s en qualité standard, puis un assemblage FFmpeg en WebM original et MP4 traité. La cadence effective dépend du PC et du disque, avec un rééchantillonnage régulier à la lecture. Les segments du microphone sont écrits par blocs d’environ 500 ms. Une coupure peut faire perdre le bloc en cours ; un WebM audio incomplet peut nécessiter une réparation externe. Les images déjà enregistrées restent disponibles indépendamment de l’encodeur.

Les fichiers JSON et JPEG sont écrits dans un fichier temporaire unique puis renommés. Les exports vidéo et GIF deviennent visibles sous leur nom final après encodage. Des fichiers temporaires peuvent rester après un arrêt brutal ; ils ne sont pas supprimés au redémarrage. Un manifeste laissé en `capturing` ou `processing` apparaît comme « interrompu » dans l’album ; ses originaux restent récupérables. Il n’y a pas de reprise automatique d’un encodage interrompu dans cette version.

Une capture exclusive est autorisée. Les paramètres ne peuvent pas changer pendant une session. L’application bloque sa fermeture normale pendant capture/encodage. Un manque d’espace détecté avant la capture ou une erreur d’écriture produit un message ; le programme conserve les fichiers déjà écrits.

## Stockage

```text
Dossier choisi/
  evenement-<UUID>/
    originaux/<session UUID>/
      0000.jpg ... ou video.webm
      traitement/ ... rendus intermédiaires
    public/
      photos/
      montages/
      gifs/
      boomerangs/
      videos/
    sessions/
      <session UUID>.json
      <session UUID>.jpg  (miniature)
```

Le nom de dossier dépend de l’UUID : renommer l’événement ne sépare pas son historique. Modifier le dossier de stockage ne déplace aucun fichier existant. Les données applicatives et le PIN se trouvent dans `%APPDATA%/Photobooth` (nom déterminé par Electron). Les exportations de configuration ne contiennent ni PIN ni chemin de stockage ; elles incluent les PNG. Les imports reçoivent un nouvel UUID et utilisent le dossier parent actif. Ces exports constituent aussi les modèles réutilisables.

Par défaut, seul le sous-dossier `public` est destiné au partage invité. C’est un choix réversible de cette implémentation ; les originaux peuvent être synchronisés tout en restant en dehors de la galerie publique.

## Limites du kiosque

PIN de 4 ou 6 chiffres, scrypt avec sel aléatoire, cinq échecs entraînant un délai de 30 s. Aucun PIN par défaut. Les commandes organisateur sont contrôlées dans le processus principal, pas seulement dans l’interface. Le kiosque Electron et l’interception de fermeture protègent le parcours applicatif. L’accès administrateur Windows, Alt+Tab, Ctrl+Alt+Suppr ou un arrêt du processus ne sont pas empêchés. Il ne s’agit pas d’un verrouillage système Windows.

## Validation avant événement réel

Voir `docs/TESTS_MATERIEL.md`. La V0.1 est une version de développement testable en simulation, pas une certification Nikon / Canon. Les performances, autonomie USB, autofocus, Live View, stabilité longue durée et délais kDrive doivent être mesurés sur le matériel final.

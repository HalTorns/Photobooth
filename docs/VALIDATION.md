# Validation de développement — 22 octobre 2026

Windows x64. Les essais logiciels ne remplacent pas la recette sur le Nikon D3200 et le PC cible.

## V0.2 — interface invités et cadres

- Interface limitée au nom de l’événement, aperçu caméra et commandes latérales ; QR sans texte décoratif.
- Compilation TypeScript/Vite et huit tests du moteur réussis, dont une simulation de verrouillage temporaire Windows pour vérifier la reprise des écritures sans effacement du fichier existant.
- Suite Electron des cinq modes, puis webcam et microphone simulés par Chromium : réussies.
- Migration de V0.1 testée avec conservation du PIN, du dossier, de l’identifiant d’événement et sauvegarde exacte de l’ancienne configuration.
- Téléchargements des modèles et repères via les boutons organisateur : dimensions et transparence contrôlées. Un PNG de mauvaise taille est refusé pour le photomaton.
- Case Cadre manipulée dans le kiosque pour les quatre modes classiques. JPEG exportés avec et sans cadre contrôlés pixel par pixel.
- Photomaton : six originaux, export 1800 × 2400, six fenêtres en 2 × 3, marges blanches, bas personnalisé quand coché et blanc quand décoché. Vérification que le cadre photo classique ne se répète pas dans les cellules.
- Les tests correspondants sont dans `scripts/frames-test.cjs`. Captures : `test-results/guest-minimal.png` et `photomaton-custom.png`.
- Installateur local : `release/Photobooth Setup 0.2.0.exe`. SHA-256 : `1AEE0C94409E8C7F8A5648218659E89E93EE07A7E311D0B917313648C621CD4F`.
- Les suites complètes des cinq modes et des nouveaux cadres ont également réussi contre l’exécutable Windows empaqueté `release/win-unpacked/Photobooth.exe`, y compris les téléchargements des PNG embarqués, la migration et le photomaton en kiosque.

## Historique V0.1

## Résultats exécutés

- Compilation TypeScript et Vite : réussie.
- Démarrage en développement Vite / React : réussi, sans erreur du préambule React.
- Sept tests du moteur : réussis. Schéma des configurations, isolation des dossiers, PIN salé, écritures atomiques, rejet de médias invalides, protocole digiCamControl simulé, véritables encodages/décodages FFmpeg (GIF, MP4, séquences vidéo avec piste audio).
- Tests dans Electron : création du PIN, persistance après redémarrage, refus des écritures organisateur lorsque verrouillé et refus d’un mauvais PIN.
- Cinq captures par l’interface : photo, série de trois photos, GIF, boomerang GIF + MP4, vidéo MP4. Existence et contenu non vide des originaux et rendus vérifiés sur disque.
- Album local, session laissée ouverte puis arrêt forcé via `app.exit`, reconnaissance de la session interrompue après redémarrage et conservation des sessions terminées.
- Entrée en kiosque, refus de sortie sans déverrouillage, puis sortie après PIN.
- Webcam et microphone **simulés par Chromium**, sans périphérique physique : photo, vidéo sonore, cadre PNG, filtre noir et blanc, QR code. La couleur du cadre est contrôlée dans le JPEG final.
- Export/import via dialogues simulés : PNG inclus, PIN et dossier local exclus de l’export, nouvel UUID à l’import.
- Affichage 1024 × 768 et 1024 × 720 : bouton de capture visible sans défilement ; QR contrôlé à 1024 × 720.

Les captures de contrôle locales sont enregistrées dans `test-results/photobooth.png`, `series.png` et `compact.png`. Les événements des tests sont isolés sous `.test-data/`, ignoré par Git.

## Paquet Windows

L’installateur NSIS `Photobooth Setup 0.1.0.exe` a été généré. La suite Electron complète a aussi été exécutée contre `release/win-unpacked/Photobooth.exe` : cinq modes, FFmpeg embarqué, persistance, album, interruption et kiosque réussis. L’installation/désinstallation sur un PC vierge reste à valider.

SHA-256 de l’installateur local : `DAD74A95A282D6C2A3160992B89ED3A5B292A31DC7CCEC1D525228E85E2F8EFB`.

## À valider sur le matériel final

Détection et commandes réelles du Nikon/Canon, autofocus, Live View et reprise, reconnexion USB, microphone réel, stabilité longue durée, performances et cadence vidéo sur PC peu puissant, lisibilité sur smartphones et synchronisation kDrive. Les pilotes spécifiques Sony, GoPro et iPhone et la galerie web personnalisée constituent des extensions futures.

## Choix appliqués pendant le développement

Electron / React / TypeScript, moteur local JavaScript + FFmpeg, licence GPL-3.0-or-later, galerie V1 par lien public kDrive. Seules les créations du dossier `public` sont destinées aux invités ; les originaux sont conservés séparément. Aucune publication du dépôt ou de l’installateur au grand public n’est réalisée.

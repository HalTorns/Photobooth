# Photobooth

Application tactile Windows, utilisable hors ligne, pour créer photos, séries, GIF, boomerangs et vidéos pendant un événement.

**État : V0.3 de développement.** Les parcours logiciels sont exécutables avec une caméra simulée. Les webcams et le pilote digiCamControl nécessitent une recette sur les périphériques réels. La compatibilité Nikon D3200 reste à valider.

## Utiliser la version Windows

L’installateur est généré dans `release/Photobooth Setup 0.3.0.exe`. Le premier lancement demande de créer un PIN de 4 ou 6 chiffres ; aucun code n’est prédéfini. Choisir le dossier de stockage et la caméra dans l’espace organisateur, puis revenir aux invités. L’engrenage ouvre les réglages protégés par PIN.

Le mode **simulation** fonctionne sans appareil. Les images simulées sont identifiées comme telles. Le microphone n’est demandé que pour une vidéo dont le son a été activé par l’organisateur.

## Fonctionnalités

- Interface React/TypeScript en français, adaptée aux écrans paysage tactiles.
- Décompte configurable, photo avec original conservé, filtres et cadres PNG.
- Bibliothèque de stickers visuelle, ajouts multiples, déplacement tactile/souris, corbeille et remise à zéro après capture.
- Photomaton vertical de six photos (2 × 3), zone blanche basse personnalisable, autres formats disponibles.
- Interface invités épurée et case Cadre dans le kiosque ; modèles PNG et repères téléchargeables.
- GIF et boomerang, avec double export GIF/MP4 pour le boomerang.
- Vidéo MP4 H.264 avec microphone optionnel ; original WebM conservé.
- Événements multiples, sauvegarde automatique, import/export avec PNG intégrés et modèles réutilisables par import.
- PIN haché, plein écran kiosque, diagnostic PC, album local et signalement des interruptions.
- Dossiers distincts pour originaux et rendus publics. Aucun effacement automatique des médias.
- Lien public kDrive et QR par événement ; synchronisation confiée au client kDrive.
- Installateur Windows x64 avec FFmpeg inclus, sans démarrage automatique.

## Développer

Installer Node.js 22.12+ et pnpm 11.25.0 :

```powershell
pnpm install
pnpm dev
```

La première installation télécharge Electron et FFmpeg. Internet est nécessaire pour installer les dépendances et construire le paquet, pas pour utiliser le logiciel installé.

```powershell
pnpm build       # TypeScript, interface de production, inventaire des licences
pnpm test        # configuration, PIN, fichiers, protocole caméra simulé, encodage réel
pnpm test:e2e    # application Electron : cinq modes, persistance, PIN, reprise
pnpm test:integration # webcam/micro simulés par Chromium, PNG, QR et modèles
pnpm test:frames      # migration, téléchargement PNG, kiosque et montage 2 × 3
pnpm test:stickers    # gestes souris/tactiles, bibliothèque et stickers dans les cinq modes
pnpm dist        # installateur NSIS Windows x64 dans release/
```

Les tests Electron lancent une fenêtre masquée et écrivent sous `.test-data/`, sans modifier les événements personnels. Les captures de contrôle sont dans `test-results/`. FFmpeg est exécuté sans shell. Vite utilise `127.0.0.1:5173` en développement ; `pnpm start` charge la dernière compilation locale.

## Caméras et kDrive

Les webcams utilisent le pilote Windows/Chromium. Le pilote Nikon/Canon optionnel parle au serveur local de digiCamControl sur le port 5513. Photo et série uniquement avant les essais matériels ; les autres modes sont désactivés. digiCamControl est installé séparément.

Synchroniser le dossier choisi avec le client kDrive, partager le sous-dossier `public` de l’événement et coller son lien HTTPS dans Stockage & partage. Les originaux peuvent être synchronisés sans être publiés. L’application n’affiche pas d’état d’envoi cloud. Une galerie web personnalisée constitue une V2 distincte.

## Documents

- [Cahier des charges fourni V0.6](docs/CAHIER_DES_CHARGES_V0.6.txt)
- [Stickers interactifs et album local](docs/STICKERS.md)
- [Cadres, modèles PNG et photomaton 6 photos](docs/CADRES.md)
- [Architecture et décisions](docs/ARCHITECTURE.md)
- [Recette sur le matériel cible](docs/TESTS_MATERIEL.md)
- [Composants et licences](THIRD_PARTY_NOTICES.md)

Le PIN verrouille l’application, pas Windows. Les performances sur le PC peu puissant, le Live View Nikon, la reconnexion USB et les délais kDrive restent à tester sur le matériel cible. Les limites de récupération vidéo sont détaillées dans l’architecture.

## Licence

GPL-3.0-or-later pour le projet, avec les notices des composants tiers. Le dépôt et les builds restent privés pour le développement ; aucune publication publique n’est effectuée automatiquement.

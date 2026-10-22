# Photobooth — reprise sur un autre PC

Application Windows tactile et hors ligne pour les événements : photo, photomaton, GIF, boomerang et vidéo. Ce guide permet d’installer l’application, préparer les essais matériels, transférer les données et reprendre le développement sans l’historique de la conversation.

**Version : 0.3.0 — documentation du 22 octobre 2026.** Dépôt privé : [HalTorns/Photobooth](https://github.com/HalTorns/Photobooth), branche `main`.

## Sommaire

1. [État du projet](#1-état-du-projet)
2. [Archive de transfert](#2-archive-de-transfert)
3. [Installation sur le PC cible](#3-installation-sur-le-pc-cible)
4. [Transférer les réglages et les photos](#4-transférer-les-réglages-et-les-photos)
5. [Caméras](#5-caméras)
6. [Cadres et stickers](#6-cadres-et-stickers)
7. [Stockage et partage](#7-stockage-et-partage)
8. [Tests sur le matériel](#8-tests-sur-le-matériel)
9. [Reprendre le développement](#9-reprendre-le-développement)
10. [Tests logiciels et installateur](#10-tests-logiciels-et-installateur)
11. [Architecture et décisions](#11-architecture-et-décisions)
12. [Dépannage](#12-dépannage)
13. [Reprendre avec Codex](#13-reprendre-avec-codex)
14. [Documents et licence](#14-documents-et-licence)

## 1. État du projet

Le logiciel est développé et utilisable. La webcam du premier PC a été testée avec succès par l’utilisateur. **Le PC définitif et le Nikon n’ont pas encore été testés.** Le pilote digiCamControl reste expérimental : son protocole est testé avec un serveur simulé, sans boîtier réel.

| Fonction | Comportement actuel |
| --- | --- |
| Invités | Nom de l’événement, grand aperçu, commandes latérales et engrenage organisateur |
| Photo | JPEG traité et original conservé séparément |
| Photomaton 6 photos | Montage vertical 1800 × 2400, deux colonnes, trois rangées, zone blanche inférieure personnalisable |
| GIF | Animation avec filtre, cadre et stickers |
| Boomerang | Exports GIF et MP4 |
| Vidéo | MP4 H.264, microphone optionnel, original WebM conservé |
| Cadres | Case Cadre côté invité, cadres classique et photomaton indépendants, modèles PNG téléchargeables |
| Stickers | Bibliothèque défilante, ajouts multiples au centre, déplacement souris/tactile et corbeille |
| Après capture | Stickers présents dans le rendu, puis effacés de l’aperçu après succès ; conservés si erreur |
| Album | Bouton « Voir les photos précédentes » au-dessus du déclencheur |
| Organisation | Événements multiples, sauvegarde automatique, modèles importables avec PNG inclus |
| Protection | PIN de 4 ou 6 chiffres, kiosque plein écran et diagnostic du PC |
| Partage | QR vers un lien HTTPS ; synchronisation par le client kDrive séparé |

Les cinq modes, les cadres et les stickers ont passé les tests logiciels, y compris sur l’exécutable Windows empaqueté. Le tactile a été simulé ; l’écran tactile physique reste à essayer. Voir [VALIDATION.md](docs/VALIDATION.md).

Les pilotes spécifiques GoPro, Sony et iPhone, la vidéo par digiCamControl et la galerie web personnalisée ne sont pas implémentés. Un appareil exposé comme webcam Windows peut être essayé comme webcam.

## 2. Archive de transfert

Le kit local **`release/Photobooth-Reprise-V0.3.zip`** contient :

```text
Photobooth-Reprise-V0.3/
  LIRE-MOI.txt                    démarrage rapide
  README.md                      ce guide
  SHA256SUMS.txt                  empreintes des fichiers livrés
  installateur/
    Photobooth Setup 0.3.0.exe
  sources/                       code, documentation et modèles PNG
  Photobooth.git.bundle           historique Git exploitable hors ligne
```

**Pour tester seulement :** copier le ZIP sur le PC cible, l’extraire entièrement, puis lancer l’installateur dans `installateur/`. Node.js, Git et pnpm ne sont pas nécessaires pour utiliser l’application installée.

**Pour développer :** cloner GitHub ou le bundle selon la section 9. `sources/` permet aussi de consulter et modifier directement le code ; ce dossier ne contient pas de `.git`.

L’archive ne contient ni photos personnelles, ni PIN, ni réglages locaux, ni authentification GitHub. Les dépendances de développement ne sont pas incluses : leur première installation demande Internet. Les modèles PNG fournis avec le projet sont inclus.

**GitHub contient les sources, pas ce ZIP ni l’installateur local.** `release/` est ignoré par Git. Copier le kit par clé USB ou stockage privé. Le workflow GitHub peut aussi produire un installateur dans les artefacts d’une exécution réussie, avec accès au dépôt privé ; l’état d’une exécution distante doit être vérifié séparément.

Le kit est un instantané. Pour les changements ultérieurs, récupérer GitHub ou préparer une nouvelle archive.

Emplacements sur le PC d’origine, à titre de repère :

```text
Dépôt : C:\Users\KévinGuillas\OneDrive - IP TEK\Documents\ChatGPT\Photobooth
Installateur : <dépôt>\release\Photobooth Setup 0.3.0.exe
Archive : <dépôt>\release\Photobooth-Reprise-V0.3.zip
```

Ces chemins ne sont pas imposés sur le nouveau PC.

## 3. Installation sur le PC cible

1. Utiliser le PC Windows x64 cible. La recette prévue est sous Windows 11 ; les performances minimales restent à établir.
2. Extraire le kit, exécuter `Photobooth Setup 0.3.0.exe`, choisir le dossier d’installation et démarrer Photobooth.
3. Au premier lancement, créer et conserver un PIN de 4 ou 6 chiffres. Aucun PIN par défaut n’existe.
4. Ouvrir l’engrenage pour entrer dans l’espace organisateur.
5. Dans **Événements**, nommer l’événement ou importer son modèle.
6. Dans **Stockage & partage**, choisir un dossier parent accessible avec assez d’espace, par exemple `C:\Photobooth\Captures`.
7. Dans **Caméra & capture**, commencer par **Caméra simulée**, puis sélectionner la vraie caméra après un premier essai.
8. Régler les modes, décompte, qualité, durée et microphone. Choisir **Photomaton 6 photos · vertical 2 × 3** pour le montage demandé.
9. Dans **Cadres & effets**, importer et activer les PNG souhaités. Les stickers personnels ne sont pas fournis automatiquement.
10. Attendre l’état **Enregistré** après modification. **À corriger** signifie que le réglage n’a pas été enregistré.
11. Revenir aux invités, prendre une photo, ouvrir l’album, puis contrôler les fichiers via **Stockage & partage → Ouvrir les fichiers**.
12. Dans **Application**, relever le diagnostic du PC et essayer le mode kiosque après les premiers contrôles.

L’application installée fonctionne hors ligne pour la capture. Le partage sur téléphone demande des fichiers synchronisés et un lien accessible.

Pour une mise à jour sur le même PC : fermer Photobooth, sauvegarder configuration et médias, puis installer la nouvelle version. Le même profil utilisateur conserve normalement le PIN et les réglages. Un autre PC démarre avec son propre profil tant que celui-ci n’a pas été transféré.

## 4. Transférer les réglages et les photos

**Le code, la configuration et les médias sont trois éléments indépendants.** GitHub ne transporte que le code et les documents suivis dans le dépôt.

### A — Reprendre un événement sans ancien historique

C’est le parcours le plus simple pour préparer les essais sur le nouveau PC.

1. Sur l’ancien PC : espace organisateur, sélectionner l’événement, **Exporter / créer un modèle** et enregistrer le JSON. Répéter pour chaque événement souhaité.
2. Copier les JSON avec le kit de transfert.
3. Sur le nouveau PC : installer, créer son PIN et choisir le dossier de stockage.
4. Utiliser **Importer un modèle** pour chaque JSON.
5. Rechercher et sélectionner la caméra du nouveau PC ; vérifier le partage.

L’export inclut les réglages et PNG, **pas le PIN, le chemin de stockage ni les photos**. Chaque import crée un nouvel UUID et utilise le dossier parent de l’événement actif. Il ne rattache pas l’ancien historique. Les identifiants de webcam peuvent changer entre les PC.

### B — Conserver exactement les événements et leur historique

1. Fermer Photobooth sur les deux PC avant la copie.
2. Sur l’ancien PC, relever **Application → diagnostic → `dataDirectory`**. Par défaut : `%APPDATA%\Photobooth` ; ce chemin peut être différent avec un profil de test.
3. Sauvegarder ce dossier, notamment **`settings.json`** : il contient les événements, UUID, PNG intégrés et PIN haché.
4. Copier aussi tous les dossiers `evenement-<UUID>` des événements souhaités, **avec `originaux`, `public` et `sessions`**, depuis leurs dossiers de stockage respectifs.
5. Sur le PC cible, après un premier lancement puis fermeture, sauvegarder l’éventuel profil existant. Restaurer le `settings.json` source dans le dossier de données cible. Cela remplace ses réglages et son PIN par ceux du PC source.
6. Placer les dossiers `evenement-<UUID>` sous le dossier parent choisi sur le PC cible, en conservant leurs noms.
7. Relancer avec le PIN source et choisir le bon **Dossier parent** dans Stockage & partage pour chaque événement. Ne pas remplacer cette restauration par l’import d’un modèle, qui changerait l’UUID.
8. Sélectionner les nouvelles caméras, vérifier l’album et faire une capture de contrôle.

Les chemins enregistrés sont absolus. S’ils ne correspondent plus au nouveau PC, les choisir de nouveau dans l’application. **Changer le dossier dans les réglages ne déplace pas les captures existantes.** Vérifier l’emplacement avant de prendre de nouvelles photos.

Les photos ne sont pas nécessairement dans le dépôt : leur emplacement est le dossier choisi dans l’application. Garder une sauvegarde indépendante avant toute restauration.

## 5. Caméras

### Webcam Windows

1. Brancher la webcam et vérifier son fonctionnement dans Windows.
2. Fermer les autres applications susceptibles de l’occuper.
3. Autoriser caméra et, si nécessaire, microphone pour les applications de bureau dans les paramètres de confidentialité Windows.
4. Dans **Caméra & capture → Rechercher**, sélectionner la webcam par son nom.
5. Tester les cinq modes puis la reconnexion USB.

La détection automatique choisit la première webcam, sinon le premier boîtier digiCamControl. Elle ne remplace pas silencieusement une caméra manquante par la simulation. L’aperçu miroir est configurable ; les fichiers caméra gardent leur sens naturel. Vérifier cadrage et placement des stickers sur les exports réels, notamment avec une source qui n’est pas en 4:3.

### Nikon / Canon via digiCamControl

1. Installer digiCamControl séparément et les prérequis nécessaires au boîtier.
2. Brancher en USB, prévoir l’alimentation pour les essais longs et choisir le JPEG.
3. Obtenir une photo et un Live View directement dans digiCamControl avant de tester Photobooth.
4. Activer le serveur web local sur **`127.0.0.1:5513`**, avec les interactions nécessaires.
5. Dans Photobooth : **Caméra & capture → Rechercher**, sélectionner le boîtier digiCamControl.
6. Tester une photo : nouveau JPEG original, rendu correct, reprise de l’aperçu.
7. Tester les six prises puis le débranchement/rebranchement USB.

Le pilote utilise HTTP local, le Single Command System et `liveview.jpg`. Il ne lance pas `CameraControlCmd.exe`. **Photo et photomaton uniquement** pour cette source ; GIF, boomerang et vidéo restent désactivés. Pas de développement RAW : l’original conservé est le JPEG transféré.

Le Nikon D3200 reste à valider sur le vrai matériel. Les commandes de capture ou Live View pourront demander une adaptation dans `electron/digicam.cjs`. Voir [TESTS_MATERIEL.md](docs/TESTS_MATERIEL.md).

## 6. Cadres et stickers

### Cadres

| Usage | Modèle | Application |
| --- | --- | --- |
| Photo classique | 1800 × 1350, transparence | Photo, GIF, boomerang, vidéo |
| Photomaton | Exactement 1800 × 2400 | Une fois sur le montage complet, six fenêtres et zone basse |

Dans **Cadres & effets**, télécharger **Modèle PNG** et **Repères PNG** du bon format. Les repères sont un calque de travail à masquer avant l’export final. Garder les fenêtres transparentes ; un fond opaque masque la photo. Importer dans la bonne catégorie et activer le cadre. La case **Cadre** côté invité est indépendante pour les captures classiques et le photomaton.

Coordonnées des fenêtres et de la zone basse : [CADRES.md](docs/CADRES.md). Référence géométrique : `assets/layouts.json`. Les PNG sont aussi dans `assets/templates/`.

### Stickers

Importer des PNG via **Cadres & effets → Importer un sticker** et les activer. La bibliothèque apparaît sous les commandes invités et défile au doigt ou à la molette. Un clic ajoute un exemplaire au centre ; le même sticker peut être ajouté plusieurs fois. Déplacer au doigt ou à la souris, glisser vers la corbeille pour supprimer.

La composition est bloquée pendant la capture. Les stickers sont intégrés aux cinq modes, aux mêmes positions dans chacune des six prises du photomaton. Après succès, les exemplaires disparaissent de l’aperçu ; la bibliothèque reste disponible. Une capture en échec conserve les exemplaires. Les originaux restent sans stickers. Les positions ne sont pas sauvegardées entre lancements. Le redimensionnement et la rotation par l’invité ne sont pas implémentés.

Il n’y a pas de plafond logiciel au nombre d’exemplaires placés, mais les performances dépendent du PC. Limites des fichiers importés : **30 éléments par événement**, cadres et stickers confondus ; PNG de **8 Mo maximum** à l’import ; limite cumulée de **24 millions de caractères** pour les données PNG encodées. L’encodage augmente la taille par rapport au fichier brut. Voir [STICKERS.md](docs/STICKERS.md).

## 7. Stockage et partage

Le dossier parent initial est le dossier Images Windows suivi de `Photobooth`. Windows/OneDrive peut rediriger Images : se fier au chemin affiché dans les réglages.

```text
Dossier parent choisi/
  evenement-<UUID>/
    originaux/<session UUID>/
      0000.jpg ... ou video.webm
      traitement/                 images intermédiaires
    public/
      photos/
      montages/
      gifs/
      boomerangs/
      videos/
    sessions/
      <session UUID>.json         manifeste et état
      <session UUID>.jpg          miniature
```

Le dossier dépend de l’UUID, pas du nom affiché : renommer l’événement conserve l’historique. Ne pas renommer les dossiers UUID ni déplacer uniquement les JPEG si l’on veut préserver l’album.

Aucun effacement automatique des médias. Sauvegarder **le profil de configuration et les dossiers de médias complets** sur un autre support. Le dépôt Git et `release/` ne constituent pas une sauvegarde des photos.

Pour kDrive : configurer son client, synchroniser le dossier de stockage, partager le sous-dossier **`public`** de l’événement, coller son lien HTTPS dans Stockage & partage et activer le QR. Vérifier depuis un téléphone. Photobooth n’envoie pas lui-même les fichiers, ne crée pas de partage et n’indique pas l’état de synchronisation. Les originaux restent en dehors du dossier public.

Une session laissée en capture/traitement après arrêt brutal est signalée interrompue dans l’album. Les fichiers déjà écrits sont conservés. L’encodage n’est pas repris automatiquement ; un audio/vidéo incomplet peut demander une réparation externe. Garder tout le dossier en cas d’incident.

## 8. Tests sur le matériel

Créer un événement **TEST PC PHOTOBOOTH**. Noter version, modèle du PC, RAM, caméra, résolution écran et qualité choisie.

| Ordre | Essai | Attendu |
| --- | --- | --- |
| 1 | Simulation puis redémarrage | Interface disponible et réglages conservés |
| 2 | Webcam, photo avec/sans cadre | Original et rendu lisibles, case Cadre respectée |
| 3 | Photomaton | Six originaux et montage vertical 2 × 3, zone basse correcte |
| 4 | Cadre personnalisé | Transparence et fenêtres au bon endroit |
| 5 | Stickers multiples, doublons | Ajout au centre, déplacement souris/tactile, suppression |
| 6 | Capture avec stickers | Position correcte dans le fichier, aperçu vidé après succès |
| 7 | Photos précédentes | Album du bon événement et retour à la capture |
| 8 | GIF et boomerang | Lecture correcte ; GIF et MP4 pour le boomerang |
| 9 | Vidéo sans/avec microphone | MP4 lisible sur téléphone et son conforme au réglage |
| 10 | Changement d’événement | Bon nom, PNG, album et dossier |
| 11 | PIN et kiosque | Réglages et sortie normale protégés |
| 12 | Capture sans Internet | Fichiers enregistrés localement |

Essais prioritaires complémentaires :

- **Boîtier :** photo et Live View dans digiCamControl, détection Photobooth, JPEG frais à chaque prise, autofocus, photomaton.
- **USB :** débrancher avant capture puis dans une session d’essai ; vérifier erreur, reconnexion et conservation des fichiers.
- **Écran :** résolution réelle, boutons visibles, bibliothèque défilante et gestes jusqu’à la corbeille.
- **Cadence :** comparer Automatique et Économique ; mesurer durée réelle et temps de traitement.
- **Endurance :** 100 captures variées, RAM/CPU/température, disque et alimentation caméra/USB.
- **Reprise :** arrêter brutalement une session de test, relancer et vérifier état interrompu et originaux.
- **Partage :** synchronisation réelle, QR téléphone, rendus accessibles et originaux non exposés.

Compléter [TESTS_MATERIEL.md](docs/TESTS_MATERIEL.md). Une réussite en simulation ne valide pas le boîtier. Avant un événement réel, terminer un cycle complet sur la configuration finale avec ses câbles et alimentations.

## 9. Reprendre le développement

### Préparer les outils

Installer **Git, Node.js et pnpm 11.25.0**. Les validations locales ont utilisé **Node 24.19.0** ; le workflow du dépôt configure Node 22. Utiliser Node 24 pour reproduire l’environnement local. Aucun Python ni FFmpeg système n’est nécessaire.

Dans PowerShell :

```powershell
node --version
npm --version
git --version
npm install --global pnpm@11.25.0
pnpm --version
```

Rouvrir le terminal après installation si les programmes sont introuvables. Si PowerShell bloque les lanceurs `.ps1`, utiliser `npm.cmd` et `pnpm.cmd`.

### Depuis GitHub

Utiliser un compte autorisé sur le dépôt privé, par exemple via Git Credential Manager lorsque Git demande une connexion. Les droits et connexions de l’ancien PC ne sont pas transférés automatiquement.

Depuis le dossier où créer le projet :

```powershell
git clone https://github.com/HalTorns/Photobooth.git
Set-Location Photobooth
git status -sb
git remote -v
pnpm install --frozen-lockfile
pnpm dev
```

Ne pas copier de token dans le code ou les documents. Un dépôt privé introuvable peut indiquer un mauvais compte ou des droits manquants.

### Depuis le kit, avec historique hors ligne

Depuis la racine du kit extrait, avec Git installé :

```powershell
git clone .\Photobooth.git.bundle .\Photobooth-dev
Set-Location .\Photobooth-dev
git remote set-url origin https://github.com/HalTorns/Photobooth.git
git status -sb
pnpm install --frozen-lockfile
pnpm dev
```

Le clone du bundle fonctionne hors ligne. **La première installation des dépendances demande Internet.** Une fois GitHub connecté, `git fetch origin` permet de comparer cet instantané avec le dépôt distant.

Sans Git, ouvrir `sources/`, puis y lancer `pnpm install --frozen-lockfile` et `pnpm dev`. Ce dossier n’a pas d’historique local : préférer un clone pour suivre et pousser les changements.

### Lancer et isoler les essais

`pnpm dev` démarre Vite sur **127.0.0.1:5173**, puis Electron. Utiliser la fenêtre Electron : le navigateur seul ne fournit pas les commandes natives. Le port doit être libre. Arrêter avec Ctrl+C dans le terminal, puis fermer l’application si nécessaire.

Fermer la version installée avant le développement : une seule instance est autorisée pour un même profil. Sans isolation, développement et installation utilisent le profil habituel. Pour séparer les réglages et le PIN des essais :

```powershell
$env:PHOTOBOOTH_DATA = Join-Path (Get-Location) '.test-data\manuel'
pnpm dev
# Après arrêt du développement :
Remove-Item Env:PHOTOBOOTH_DATA
```

Choisir aussi un **dossier de médias de test** dans l’application : cette variable ne redirige pas à elle seule les captures.

### Travailler entre les deux PC

Avant de changer de PC : enregistrer, vérifier `git status`, faire le commit et le push des changements souhaités. Sur l’autre PC, vérifier l’absence de modifications locales non enregistrées, puis :

```powershell
git status -sb
git pull --ff-only
pnpm install --frozen-lockfile
```

Après une modification validée :

```powershell
git diff
git add <fichiers-modifies>
git commit -m "Description du changement"
git push origin main
```

Remplacer `<fichiers-modifies>` par les chemins concernés. Configurer `git config user.name` et `git config user.email` avec son identité si nécessaire. En cas de conflit ou divergence, conserver les modifications et résoudre avant de pousser ; ne pas forcer le push pour contourner le problème.

## 10. Tests logiciels et installateur

Après l’installation des dépendances, depuis la racine du dépôt :

```powershell
pnpm build
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm test:frames
pnpm test:stickers
```

| Commande | Contrôle |
| --- | --- |
| `pnpm build` | TypeScript, interface de production et inventaire des licences |
| `pnpm test` | Configuration, PIN, fichiers, verrous Windows, caméra simulée et FFmpeg réel |
| `pnpm test:e2e` | Cinq modes, persistance, album, interruption et kiosque |
| `pnpm test:integration` | Webcam/micro simulés Chromium, PNG, QR, import/export et affichage compact |
| `pnpm test:frames` | Migration, modèles téléchargeables, case Cadre et montage 2 × 3 |
| `pnpm test:stickers` | Bibliothèque, 35 doublons, souris/tactile simulé, corbeille, album et cinq exports |

Les tests Electron utilisent des profils isolés dans `.test-data/`, une fenêtre masquée et des captures dans `test-results/`. Ils peuvent durer plusieurs minutes. Ils ne valident pas les périphériques physiques. Ne pas les lancer simultanément avec un empaquetage remplaçant leur exécutable.

Pour démarrer la dernière compilation locale sans serveur Vite :

```powershell
pnpm build
pnpm start
```

Pour produire l’installateur Windows x64 :

```powershell
pnpm dist
```

Résultats : `release/Photobooth Setup 0.3.0.exe` et `release/win-unpacked/Photobooth.exe`. FFmpeg est inclus. Le premier empaquetage peut télécharger des outils ; prévoir Internet. Le paquet de développement n’a pas de certificat éditeur de confiance. Ne pas modifier/recompiler `dist/` pendant l’empaquetage.

La commande d’empaquetage utilise explicitement `--publish never` : elle construit l’installateur sans tenter de créer une release GitHub ni demander de jeton de publication. Dans GitHub Actions, le fichier est ensuite conservé comme artefact privé du workflow.

Pour les tests stickers contre l’exécutable empaqueté :

```powershell
$env:PHOTOBOOTH_EXE_PATH = Join-Path (Get-Location) 'release\win-unpacked\Photobooth.exe'
pnpm test:stickers
Remove-Item Env:PHOTOBOOTH_EXE_PATH
```

Le même mécanisme existe pour `test:e2e` et `test:frames`. Le workflow `.github/workflows/windows.yml` configure compilation et tests Windows sur push de `main`, pull request et lancement manuel. Les artefacts du workflow sont distincts du kit local.

## 11. Architecture et décisions

| Fichier / dossier | Rôle |
| --- | --- |
| `src/App.tsx` | Capture, organisateur, PIN, album et états |
| `src/GuestView.tsx`, `src/style.css` | Interface invités |
| `src/useCamera.ts` | Simulation, webcam, aperçu digiCamControl et reconnexion |
| `src/useStickers.ts`, `src/StickerLayer.tsx` | Bibliothèque, exemplaires, positions et gestes |
| `src/imaging.ts` | Filtres, cadres, stickers et montages |
| `src/types.ts` | Contrats TypeScript et libellés |
| `electron/main.cjs` | Sessions, autorisations, PIN, fichiers, dialogues et kiosque |
| `electron/config.cjs` | Schéma, valeurs initiales et écritures atomiques |
| `electron/digicam.cjs` | Adaptateur digiCamControl, premier point à examiner pour le boîtier |
| `electron/media.cjs` | Encodage FFmpeg |
| `electron/preload.cjs` | Liste des commandes natives autorisées |
| `assets/layouts.json`, `assets/templates/` | Géométrie et modèles PNG |
| `scripts/`, `tests/` | Développement, licences et validations |
| `docs/CAHIER_DES_CHARGES_V0.6.txt` | Cadrage d’origine |

Stack : **Electron / React / TypeScript / Vite / FFmpeg local**. Electron remplace la piste Tauri/Python envisagée au cadrage. Pas de serveur hébergé pour la capture. Les communications du pilote boîtier passent par digiCamControl local ; kDrive reste indépendant.

Configuration : **schéma version 2**, distinct de la version applicative 0.3.0. La migration depuis le schéma 1 sauvegarde `settings.json.v1.backup`, conserve les identifiants et adapte l’ancienne grille par défaut de six photos au photomaton. Toute future modification de schéma doit prévoir les configurations existantes.

Les originaux sont écrits avant les traitements, avec manifestes et écritures atomiques. Le kiosque protège les actions de l’application ; il ne bloque pas tous les raccourcis ou accès administrateur Windows.

## 12. Dépannage

| Symptôme | Vérifier / agir |
| --- | --- |
| Rien ne semble se lancer | Fermer une autre instance ; distinguer version installée, développement et tests |
| Caméra absente | Pilote Windows, USB, permissions, autre application ; Rechercher puis sélectionner |
| Ancienne webcam après transfert | Sélectionner la webcam du nouveau PC, dont l’identifiant peut différer |
| Nikon non détecté | Capture directe digiCamControl puis serveur local port 5513 |
| GIF/vidéo indisponibles avec Nikon | Limitation actuelle du pilote digiCamControl |
| Aucun sticker | Importer et activer un PNG sur le bon événement ; faire défiler la bibliothèque |
| Cadre opaque | Vérifier transparence et retrait du calque de repères |
| Cadre photomaton refusé | Dimensions exactes 1800 × 2400 et limite de taille |
| Réglages perdus | Vérifier profil `dataDirectory`, import de modèle ou restauration de configuration |
| Album vide après transfert | UUID, bon dossier parent, copie de `sessions/` et des médias ; l’import crée un nouvel UUID |
| QR sans photos récentes | Bon dossier public, lien, réseau et synchronisation kDrive |
| Capture lente | Essayer Économique, réduire durée/cadence, vérifier disque et charge du PC |
| Configuration illisible | Conserver le fichier puis restaurer un `settings.json` valide après fermeture |
| PIN oublié | Aucun code de secours ; conserver le profil et demander une intervention avant remplacement |
| Port 5173 occupé | Identifier et arrêter l’ancien serveur de développement avant de relancer |
| `pnpm` inconnu ou bloqué | Rouvrir le terminal, vérifier Node/PATH, essayer `pnpm.cmd` |
| Dépôt privé introuvable | Compte GitHub et droits sur HalTorns/Photobooth |

En cas d’erreur, relever le message exact. Pour un incident disque ou une capture interrompue, conserver l’événement complet et ses intermédiaires avant toute tentative de récupération.

## 13. Reprendre avec Codex

Ouvrir dans Codex **le dossier du clone Git** sur le nouveau PC. La connexion Codex et l’accès GitHub se configurent sur ce PC ; ils ne sont pas dans l’archive.

Message de reprise possible :

> Nous reprenons Photobooth, application Windows Electron/React/TypeScript, dépôt privé HalTorns/Photobooth, branche main, version 0.3.0. Lis README.md, docs/ARCHITECTURE.md, docs/VALIDATION.md et docs/TESTS_MATERIEL.md avant de modifier. La webcam a déjà fonctionné sur le premier PC. Nous testons maintenant le PC cible et le Nikon ; digiCamControl reste expérimental, photo et photomaton uniquement. Préserve les réglages, UUID et médias existants. Vérifie l’état Git avant de travailler. Voici le matériel et le problème observé : …

Pour signaler un problème :

```text
Date et version Photobooth :
Commit si développement (git rev-parse --short HEAD) :
PC / Windows / RAM / résolution écran :
Caméra / USB / version digiCamControl si utilisée :
Mode / qualité / durée / audio / miroir :
Étapes exactes :
Résultat attendu :
Résultat observé et message exact :
Fréquence du problème :
Fichiers créés / état dans l’album :
Capture d’écran ou court enregistrement :
```

Préciser application installée ou `pnpm dev`. Conserver le manifeste et les médias de test concernés sans les ajouter au dépôt s’ils contiennent des données privées. Ne pas partager de token ou de PIN dans un rapport.

## 14. Documents et licence

- [Cahier des charges V0.6](docs/CAHIER_DES_CHARGES_V0.6.txt)
- [Architecture et décisions](docs/ARCHITECTURE.md)
- [Validation et empreintes des installateurs](docs/VALIDATION.md)
- [Recette matérielle](docs/TESTS_MATERIEL.md)
- [Cadres](docs/CADRES.md)
- [Stickers et album](docs/STICKERS.md)
- [Composants et licences](THIRD_PARTY_NOTICES.md)
- [Licence GPL-3.0-or-later](LICENSE)

`node_modules/`, `dist/`, `release/`, `.test-data/`, `test-results/` et les `.log` sont ignorés par Git. Les réglages et médias personnels restent hors du dépôt.

Le dépôt et les paquets restent privés pendant le développement. Aucune publication publique automatique n’est effectuée.

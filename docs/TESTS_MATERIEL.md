# Recette sur le PC Windows 11 cible

## Premier lancement

1. Installer le `.exe` de test et démarrer Photobooth.
2. Choisir un PIN de 4 ou 6 chiffres. Il n’existe pas de PIN par défaut.
3. Renseigner l’événement, le dossier de stockage et les modes autorisés.
4. Tester d’abord la simulation et vérifier les fichiers avec « Ouvrir les fichiers ».
5. Dans Application, relever le diagnostic du PC : CPU, RAM, espace libre et version.

## Nikon / Canon via digiCamControl

1. Installer séparément digiCamControl depuis son site officiel.
2. Brancher l’appareil USB, sélectionner un mode JPEG et vérifier une capture directement dans digiCamControl. L’original sauvegardé par Photobooth sera le JPEG transféré, sans développement RAW.
3. Activer son serveur web local sur le port 5513 et autoriser les interactions. Ne pas l’exposer sur le réseau public.
4. Lancer le Live View dans digiCamControl pour vérifier la capacité réelle du boîtier.
5. Dans Photobooth, Caméra & capture → Rechercher → sélectionner le boîtier.
6. Tester une photo, la récupération de son JPEG original et la reprise de l’aperçu.
7. Tester une série de six photos ; mesurer le délai réel, autofocus compris.
8. Débrancher puis rebrancher l’USB. Vérifier la reconnexion et l’erreur affichée en cas d’échec.

Le pilote suit [l’interface web officielle](https://digicamcontrol.com/doc/userguide/web) et le [Single Command System](https://digicamcontrol.com/doc/userguide/singlecmd). Il ne dépend pas de CameraControlCmd.exe et ne doit pas lancer ce dernier en parallèle. Certains boîtiers peuvent nécessiter une commande LiveView_Capture spécifique : ce point reste à adapter lors des essais. Aucun support vidéo Nikon/Canon n’est promis dans cette version.

## Tableau de recette

| Vérification | Attendu | Résultat matériel |
| --- | --- | --- |
| Démarrage sans réseau | Interface et capture disponibles | À relever |
| Détection boîtier | Nom ou numéro de série dans la sélection | À relever |
| Aperçu + photo | Pas d’image précédente réutilisée, aperçu repris | À relever |
| Série x6 | Six originaux et montage lisible | À relever |
| USB débranché avant / pendant capture | Erreur lisible, fichiers existants conservés | À relever |
| Webcam | Aperçu, cinq modes, reconnexion | À relever |
| GIF / boomerang | Lecture correcte ; MP4 et GIF pour boomerang | À relever |
| Vidéo avec / sans son | MP4 lisible sur smartphones, son conforme au réglage | À relever |
| Cadre / sticker | Correspondance aperçu et export ; fichier non miroir | À relever |
| PIN / plein écran | Réglages et sortie normale demandent le PIN | À relever |
| Coupure de l’application | Sessions interrompues visibles, originaux récupérables | À relever |
| Disque presque plein | Capture refusée / erreur, pas d’effacement | À relever |
| Dossier kDrive | Originaux et créations synchronisés par kDrive | À relever |
| QR sur téléphone | Ouvre `public`, sans exposer les originaux | À relever |
| Charge prolongée | 100 captures, RAM/CPU et température acceptables | À relever |

La galerie personnalisée constitue une V2 distincte. Le lien public kDrive est la galerie de cette version. Le partage public des seuls rendus est le comportement retenu en attendant une éventuelle autre préférence.

# Personnaliser les cadres — V0.2

Ouvrir l’espace organisateur avec le PIN, puis **Cadres & effets**. Chaque format propose deux téléchargements : **Modèle PNG** à personnaliser, et **Repères PNG**, un guide séparé à ne pas importer comme cadre final. Les fichiers sont aussi dans `assets/templates/` du dépôt.

## Photo classique

Dimensions : **1800 × 1350 pixels**, ratio 4:3. La fenêtre transparente mesure 1680 × 1260 pixels, à x = 60, y = 45. Les zones opaques masquent la photo, les zones transparentes la laissent visible.

Importer le PNG personnalisé avec **Importer un cadre**. Il est applicable aux photos, GIF, boomerangs et vidéos. L’invité coche ou décoche **Cadre** dans le kiosque et choisit parmi les cadres autorisés. Un cadre blanc simple est fourni.

## Photomaton 6 photos

Le format par défaut est un montage vertical de **1800 × 2400 pixels**, avec deux colonnes et trois rangées de photos, puis un espace blanc en bas. Le bas reste vide sans personnalisation : aucun texte ou nom d’événement n’y est ajouté automatiquement.

| Photo | X | Y | Largeur | Hauteur |
| --- | ---: | ---: | ---: | ---: |
| 1 | 60 | 60 | 820 | 615 |
| 2 | 920 | 60 | 820 | 615 |
| 3 | 60 | 715 | 820 | 615 |
| 4 | 920 | 715 | 820 | 615 |
| 5 | 60 | 1370 | 820 | 615 |
| 6 | 920 | 1370 | 820 | 615 |

Zone basse de personnalisation conseillée : x = 60, y = 2025, largeur = 1680, hauteur = 315 pixels. Les marges peuvent aussi être décorées. La référence unique est `assets/layouts.json`.

Importer avec **Importer un cadre photomaton**. Les dimensions exactes de 1800 × 2400 pixels sont vérifiées. Le cadre est superposé **une seule fois au montage complet** ; le cadre photo classique n’est pas répété sur les six prises. Les filtres et stickers restent appliqués aux prises de vue.

Dans le kiosque, l’option s’appelle **Photomaton 6 photos**. Sa case **Cadre** est indépendante de celle des captures classiques. Le petit aperçu latéral montre les six fenêtres et le cadre choisi.

Les anciens formats grille, bande et carré restent proposés dans les réglages. Le modèle photomaton correspond uniquement au format vertical 2 × 3. Ce format fixe le nombre de photos à six ; les autres conservent le nombre configurable.

## Exporter votre création

Conserver les dimensions et exporter en **PNG RGBA avec transparence**. Ne pas aplatir les fenêtres photo sur un fond blanc. Le fichier de repères peut servir de calque de travail, à masquer avant l’export final. Les photos originales sont toujours conservées séparément.

## Mise à jour depuis V0.1

Le PIN, les caméras, les médias et le partage sont conservés. L’ancienne grille par défaut à six photos devient le photomaton vertical ; les autres formats configurés sont conservés. Les cadres existants restent des cadres photo. Des cadres blancs sont ajoutés lorsque la catégorie n’en contient pas, sous réserve des limites de taille et de nombre d’éléments. La configuration précédente est sauvegardée dans `settings.json.v1.backup` avant migration.

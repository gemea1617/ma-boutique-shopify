# Charte GEMEA appliquée au thème Balance

Copie de référence des fichiers déposés dans le thème **Balance**
(`gid://shopify/OnlineStoreTheme/201993748820`, non publié) de gemeajewels.com.

| Fichier | Rôle |
| --- | --- |
| `assets/gemea-charte.css` | Ajouté. Polices, palette, angles droits de la charte. |
| `snippets/stylesheets.liquid` | Modifié : 5 lignes ajoutées à la fin pour charger Google Fonts et la feuille ci-dessus. Les 2 lignes d'origine sont intactes. |

## Pourquoi une surcouche plutôt qu'une réécriture

Balance est un thème de la génération Horizon : blocs de thème, composants web,
variables CSS générées par `snippets/theme-styles-variables.liquid` et
`snippets/color-schemes.liquid`. Sa fiche produit est déjà complète et déjà
personnalisée pour GEMEA (fil d'Ariane, accroche, guide des tailles, barre
d'achat mobile). Y déverser un thème écrit à la main aurait détruit ce travail.

La charte est donc appliquée par-dessus, sans rien écraser :

- les deux blocs `{% style %}` du thème sont rendus **après** cette feuille,
  donc l'ordre de cascade ne suffirait pas ;
- les sélecteurs sont doublés (`:root:root`, `.color-scheme-1.color-scheme-1`)
  pour l'emporter par la **spécificité**, indépendamment de leur position.

## Revenir en arrière

Supprimer `assets/gemea-charte.css` et retirer les lignes ajoutées à
`snippets/stylesheets.liquid` rend à Balance son apparence d'origine.

## Limite connue

Les sélecteurs de police et de couleur de l'éditeur de thème affichent toujours
les valeurs d'origine de Balance (Merriweather Sans / Assistant, bleu pétrole) :
la charte est appliquée par la feuille de style, pas par les réglages du thème.
Pour la rendre « officielle » dans l'éditeur, il faudrait reporter la palette
dans *Personnaliser › Couleurs* et choisir Tenor Sans et Jost dans
*Typographie*, si Shopify les propose dans sa bibliothèque.

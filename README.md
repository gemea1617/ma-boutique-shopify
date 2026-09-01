# GEMEA — thème Shopify

Thème sur mesure pour [gemeajewels.com](https://gemeajewels.com), construit
directement à partir de la charte graphique GEMEA. Aucune dépendance, aucun
framework : du Liquid, une feuille de style et un fichier JavaScript.

## La charte, traduite en code

| Charte | Dans le thème |
| --- | --- |
| Tenor Sans (titres) · Jost (texte) | `assets/base.css` → `--titre`, `--texte` |
| Noir, gris foncé, gris, gris clair, ivoire, blanc | `assets/base.css` → variables `:root` |
| Ivoire dominant, noir en accent | fond de page ivoire, noir réservé au logo, aux titres et aux boutons |
| Anneaux entrelacés | `snippets/logo.liquid` + les cinq `.svg` de `assets/` |
| Trait plus épais quand le logo rétrécit | `snippets/logo.liquid` choisit `stroke-width` selon la largeur demandée |
| Surtitres espacés en 10 px | classe `.eyebrow` |
| Boutons 11 px, interlettrage 0.18em, majuscules | classe `.btn` |

Les couleurs et les polices ne sont **pas** exposées dans l'éditeur de thème :
la charte les fixe, les rendre réglables reviendrait à inviter à en sortir.

## Structure

```
assets/      base.css, theme.js, les 5 fichiers de logo
layout/      theme.liquid, password.liquid
sections/    en-tête, pied de page, blocs de page d'accueil, pages produit/collection/panier…
snippets/    logo, carte produit, prix, icônes, pagination, méta-données
templates/   les gabarits JSON (page d'accueil, produit, collection…) et les pages client
locales/     fr.default.json — tous les textes de l'interface
config/      réglages du thème
```

### Sections disponibles dans l'éditeur

Bannière · Promesses · Collection en vedette · Liste de collections ·
Image et texte · Avis clients · FAQ · Texte · Newsletter · Produits associés.

## Installation

Avec la [CLI Shopify](https://shopify.dev/docs/api/shopify-cli) :

```bash
shopify theme dev --store gemeajewels.myshopify.com    # aperçu en local
shopify theme push --unpublished                       # envoyer sans publier
```

Sans la CLI : compresser le dossier en `.zip` et l'importer depuis
*Boutique en ligne › Thèmes › Ajouter un thème › Importer*.

## À faire côté administration Shopify

Le thème s'appuie sur des contenus qui se créent dans l'admin :

1. **Menus** (*Navigation*) : `main-menu` et `footer`.
2. **Pages** : « Notre histoire », « Livraison et retours », « FAQ », et une
   page « Contact » à laquelle assigner le gabarit `page.contact`.
3. **Collections** à rattacher aux sections « Collection en vedette » et
   « Liste de collections ».
4. **Favicon** : charger `assets/gemea-pastille-noire.svg` dans
   *Thème › Personnaliser › Marque*, ou le convertir en PNG 512 px.
5. **Logo d'en-tête** : `assets/gemea-logo-horizontal.svg`. Laissé vide, le
   thème compose le logo à partir de l'emblème et du nom de la boutique.

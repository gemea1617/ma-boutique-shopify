#!/usr/bin/env python3
"""Prépare la structure GEMEA pour l'installer dans un thème Dawn.

Dawn emploie plusieurs des mêmes noms de classes que nous — drawer,
card__media, page-width, banner, field, rte, pagination. Charger notre
feuille telle quelle repeindrait le panier et la recherche de Dawn.

On produit donc :
  1. une feuille dont chaque sélecteur est préfixé par `.gemea`, la classe
     posée sur <body> ; nos règles ne peuvent alors plus déborder ;
  2. des fichiers préfixés `gemea-`, pour ne écraser aucun fichier de Dawn.

Les gabarits que nous fournissons (accueil, collection, produit) et les
deux groupes d'en-tête et de pied de page sont les seuls fichiers de Dawn
réellement remplacés.
"""
import pathlib, re, shutil

RACINE = pathlib.Path('.')
SORTIE = pathlib.Path('dawn')

# --------------------------------------------------------------- CSS scopé

# Les at-règles dont le contenu n'est PAS une liste de règles : on n'y touche pas.
AT_SANS_REGLES = ('@keyframes', '@font-face', '@page', '@counter-style', '@property')

# Ces sélecteurs restent globaux : variables, remise à zéro, et le body qui
# porte lui-même la classe de scope.
GLOBAUX = ('*', '*::before', '*::after', 'html')


def prefixer_selecteur(sel: str) -> str:
    parties = []
    for part in sel.split(','):
        p = part.strip()
        if not p:
            continue
        if p.startswith(':root'):
            parties.append(p)
        elif p == 'body':
            parties.append('body.gemea')
        elif p in GLOBAUX:
            parties.append(p)
        else:
            parties.append('.gemea ' + p)
    return ', '.join(parties)


def scoper(css: str) -> str:
    """Préfixe chaque sélecteur par `.gemea`.

    Une pile dit à tout moment dans quel type de bloc on se trouve : au
    premier niveau et à l'intérieur d'un @media, les sélecteurs sont
    préfixés ; à l'intérieur d'une règle ou d'un @keyframes, non.
    """
    sortie, tampon, pile = [], '', []

    for c in css:
        if c == '{':
            # Les commentaires ont été mis de côté : il faut les ignorer pour
            # reconnaître une at-règle, sinon @media passe pour un sélecteur.
            brut = re.sub(r'\u0000\d+\u0000', '', tampon).strip()
            dans_regles = not pile or pile[-1] == 'at-regles'

            if brut.startswith('@'):
                genre = 'at-plat' if brut.startswith(AT_SANS_REGLES) else 'at-regles'
                sortie.append(tampon + '{')
                pile.append(genre)
            elif dans_regles:
                # Un commentaire mis de côté précède souvent le sélecteur :
                # on le laisse où il est et on ne préfixe que ce qui suit.
                coupe = tampon.rfind('\u0000')
                avant, reste = (tampon[:coupe + 1], tampon[coupe + 1:]) if coupe != -1 else ('', tampon)
                blanc = reste[:len(reste) - len(reste.lstrip())]
                sortie.append(avant + blanc + prefixer_selecteur(reste) + '{')
                pile.append('regle')
            else:
                sortie.append(tampon + '{')
                pile.append('regle')

            tampon = ''
        elif c == '}':
            sortie.append(tampon + '}')
            tampon = ''
            if pile:
                pile.pop()
        else:
            tampon += c

    sortie.append(tampon)
    return ''.join(sortie)


def scoper_avec_commentaires(css: str) -> str:
    """Les commentaires sont mis de côté le temps de la transformation :
    sans cela le préfixeur les prend pour des sélecteurs."""
    gardes = []

    def retirer(m):
        gardes.append(m.group(0))
        return '\u0000%d\u0000' % (len(gardes) - 1)

    sans = re.sub(r'/\*.*?\*/', retirer, css, flags=re.S)
    scope = scoper(sans)
    return re.sub(r'\u0000(\d+)\u0000', lambda m: gardes[int(m.group(1))], scope)


css = (RACINE / 'assets/base.css').read_text()
scope = scoper_avec_commentaires(css)
(SORTIE / 'assets/gemea.css').write_text(scope)

# ------------------------------------------------- Fichiers préfixés

SNIPPETS = ['logo', 'icon', 'price', 'product-card', 'pagination', 'menu-drawer']
SECTIONS = [
    'header', 'footer', 'announcement-bar',
    'main-product', 'main-collection',
    'hero', 'promesses', 'featured-collection', 'image-with-text',
    'image-banner', 'testimonials', 'product-recommendations', 'icon-features',
]

# ------------------------------------------------ Traductions résolues
#
# Dawn ne connaît pas nos clés : laissées telles quelles, elles
# s'afficheraient en « translation missing ». Plutôt que de fusionner nos
# entrées dans les fichiers de langue de Dawn — volumineux et qu'il
# faudrait tenir à jour — on résout les libellés en français à la
# construction. Le thème GEMEA d'origine, lui, garde ses clés.

import json

LANGUE = json.loads((RACINE / 'locales/fr.default.json').read_text())


def valeur(cle: str):
    noeud = LANGUE
    for part in cle.split('.'):
        if not isinstance(noeud, dict) or part not in noeud:
            return None
        noeud = noeud[part]
    return noeud


APPEL = re.compile(r"\{\{-?\s*'([a-z0-9_.]+)'\s*\|\s*t(?::\s*([a-z_]+):\s*(.+?))?\s*-?\}\}")


def resoudre(txt: str) -> str:
    def remplacer(m):
        cle, param, expr = m.group(1), m.group(2), m.group(3)
        v = valeur(cle)
        if v is None:
            return m.group(0)

        if isinstance(v, dict):
            # Clé au pluriel : on rend la variante en Liquid plutôt que de
            # choisir arbitrairement l'une des deux.
            un = v.get('one', '').replace('{{ %s }}' % param, '{{ %s }}' % expr)
            autre = v.get('other', '').replace('{{ %s }}' % param, '{{ %s }}' % expr)
            return ('{%% if %s == 1 %%}%s{%% else %%}%s{%% endif %%}' % (expr, un, autre))

        if param:
            return v.replace('{{ %s }}' % param, '{{ %s }}' % expr)
        return v

    return APPEL.sub(remplacer, txt)


def reecrire(txt: str) -> str:
    for nom in SNIPPETS:
        txt = txt.replace("render '%s'" % nom, "render 'gemea-%s'" % nom)
    txt = txt.replace("'base.css' | asset_url", "'gemea.css' | asset_url")
    txt = txt.replace("'theme.js' | asset_url", "'gemea.js' | asset_url")
    return resoudre(txt)

for nom in SNIPPETS:
    src = RACINE / f'snippets/{nom}.liquid'
    (SORTIE / f'snippets/gemea-{nom}.liquid').write_text(reecrire(src.read_text()))

for nom in SECTIONS:
    src = RACINE / f'sections/{nom}.liquid'
    (SORTIE / f'sections/gemea-{nom}.liquid').write_text(reecrire(src.read_text()))

shutil.copy(RACINE / 'assets/theme.js', SORTIE / 'assets/gemea.js')

print('feuille scopée :', len(scope), 'octets')
print('sections :', len(SECTIONS), '· snippets :', len(SNIPPETS))

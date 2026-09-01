#!/usr/bin/env python3
"""Vérifie la cohérence interne du thème avant tout envoi à Shopify.

Contrôle : JSON valide, schémas de section, types de section et de bloc
référencés par les gabarits, snippets et assets rendus, clés de traduction,
icônes demandées, et équilibre des balises Liquid.

Le dossier balance/ est une copie de référence du thème Balance de la
boutique : il n'appartient pas à ce thème et n'est pas contrôlé ici.
"""
import json, re, pathlib, sys

SKIP = {'.git', 'balance'}

def walk(pattern):
    for path in sorted(pathlib.Path('.').rglob(pattern)):
        if SKIP.isdisjoint(path.parts):
            yield path

fail = 0
def problem(*args):
    global fail
    fail += 1
    print(*args)

sections = {p.stem for p in pathlib.Path('sections').glob('*.liquid')}
snippets = {p.stem for p in pathlib.Path('snippets').glob('*.liquid')}
assets   = {p.name for p in pathlib.Path('assets').iterdir()}

for p in walk('*.json'):
    try:
        json.loads(p.read_text())
    except Exception as e:
        problem('JSON INVALIDE', p, e)

schemas = {}
for p in sorted(pathlib.Path('sections').glob('*.liquid')):
    m = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', p.read_text(), re.S)
    if not m:
        problem('SCHEMA MANQUANT', p)
        continue
    try:
        schemas[p.stem] = sc = json.loads(m.group(1))
    except Exception as e:
        problem('SCHEMA INVALIDE', p, e)
        continue
    if 'presets' in sc and not isinstance(sc['presets'], list):
        problem('PRESETS NON LISTE', p)

group_and_templates = list(pathlib.Path('templates').rglob('*.json')) + \
                      list(pathlib.Path('sections').glob('*.json'))

for p in group_and_templates:
    for _, sec in json.loads(p.read_text()).get('sections', {}).items():
        kind = sec.get('type')
        if kind not in sections:
            problem('SECTION INTROUVABLE', p, kind)
            continue
        declared = {b['type'] for b in schemas.get(kind, {}).get('blocks', [])}
        for _, block in (sec.get('blocks') or {}).items():
            if block['type'] not in declared and block['type'] != '@app':
                problem('BLOC NON DÉCLARÉ', p, kind, block['type'])

for p in walk('*.liquid'):
    txt = p.read_text()
    for name in re.findall(r"{%-?\s*render\s+'([^']+)'", txt):
        if name not in snippets:
            problem('SNIPPET INTROUVABLE', p, name)
    for name in re.findall(r"'([\w.-]+\.(?:css|js|svg))'\s*\|\s*asset_url", txt):
        if name not in assets:
            problem('ASSET INTROUVABLE', p, name)

loc = json.loads(pathlib.Path('locales/fr.default.json').read_text())
def has(key):
    node = loc
    for part in key.split('.'):
        if not isinstance(node, dict) or part not in node:
            return False
        node = node[part]
    return True

for p in walk('*.liquid'):
    for key in re.findall(r"'([a-z0-9_.]+)'\s*\|\s*t[\s:}]", p.read_text()):
        if not has(key):
            problem('TRADUCTION MANQUANTE', p, key)

defined_icons = set(re.findall(r"\{%-?\s*when\s+'([\w-]+)'",
                               pathlib.Path('snippets/icon.liquid').read_text()))
for p in walk('*.liquid'):
    txt = p.read_text()
    for name in re.findall(r"render 'icon', name: '([\w-]+)'", txt):
        if name not in defined_icons:
            problem('ICÔNE INTROUVABLE', p, name)
    # Icônes proposées dans un réglage select : elles doivent exister aussi.
    for m in re.finditer(r'"id": "icon(?:_\d)?".*?"options": \[(.*?)\]', txt, re.S):
        for value in re.findall(r'"value": "([\w-]+)"', m.group(1)):
            if value not in defined_icons:
                problem('ICÔNE DE RÉGLAGE INTROUVABLE', p, value)

PAIRS = ['if', 'unless', 'for', 'case', 'form', 'paginate', 'comment', 'capture',
         'schema', 'tablerow']
for p in walk('*.liquid'):
    stack = []
    for tag in re.findall(r'\{%-?\s*(\w+)', p.read_text()):
        if tag in PAIRS:
            stack.append(tag)
        elif tag.startswith('end'):
            if not stack or stack[-1] != tag[3:]:
                problem('DÉSÉQUILIBRE', p, tag, stack[-3:])
                break
            stack.pop()
    else:
        if stack:
            problem('NON FERMÉ', p, stack)

print('OK' if not fail else f'{fail} problème(s)')
sys.exit(1 if fail else 0)

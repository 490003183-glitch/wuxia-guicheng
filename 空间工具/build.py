#!/usr/bin/env python3
"""Build two offline spatial viewers using Python's standard library.

Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0.
See LICENSE-TOOLS at the repository root. Example data: CC BY-NC-SA 4.0.
"""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'

def encoded(data):
    return json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')

def render(template, values):
    for key, value in values.items():
        if key not in template:
            raise ValueError('Missing template slot: ' + key)
        template = template.replace(key, value)
    return template

def main():
    global_path = ROOT / 'data/global.json'
    local_path = ROOT / 'data/ep31.json'
    global_data = json.loads(global_path.read_text(encoding='utf-8'))
    local_data = json.loads(local_path.read_text(encoding='utf-8'))
    if local_data['globalVersion'] != global_data['version']:
        raise ValueError('Global and episode versions do not match')
    packet = {'local': local_data, 'global': global_data, 'expected': {
        'local': local_data['version'], 'global': global_data['version'],
        'global_sha256': hashlib.sha256(global_path.read_bytes()).hexdigest(),
        'local_sha256': hashlib.sha256(local_path.read_bytes()).hexdigest()}}
    global_page = render((SRC/'global.html.in').read_text(encoding='utf-8'), {
        '__GLOBAL_DATA__': encoded(global_data), '__GLOBAL_APP__': (SRC/'global.js').read_text(encoding='utf-8')})
    app = (SRC/'view.js').read_text(encoding='utf-8')
    for name in ['model', 'reference', 'profile', 'review', 'capture']:
        app = render(app, {'/*__' + name.upper() + '__*/': (SRC/(name+'.js')).read_text(encoding='utf-8')})
    local_page = render((SRC/'page.html.in').read_text(encoding='utf-8'), {
        '__STYLES__': (SRC/'style.css').read_text(encoding='utf-8'),
        '__PACKET__': encoded(packet), '__LOGIC__': (SRC/'logic.js').read_text(encoding='utf-8'),
        '__APP__': app,
        '__NOVEL_URL__': '../小说/033_第三十一章_先别管了.md',
        '__FALLBACK_URL__': 'index.html', '__TEXT_URL__': 'README.md'})
    (ROOT/'index.html').write_text(global_page, encoding='utf-8')
    (ROOT/'ep31.html').write_text(local_page, encoding='utf-8')
    print('Built index.html and ep31.html')

if __name__ == '__main__':
    main()

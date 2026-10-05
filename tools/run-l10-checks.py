#!/usr/bin/env python3
"""books#314: local 16 mandatory CI equivalents + one supplemental group.

Uses existing registered tools; not an Actions run, checkout or dependency install.
Usage: python3 tools/run-l10-checks.py --engine <exact checkout> --evidence <new dir>
Exit: 0 all passed, 1 failed assertion/command, 2 setup or evidence-directory error.
Both source knives restore original bytes in finally. Rebuild after knives before
browser verification: restoration can change source mtimes.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import sys
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--engine', required=True)
parser.add_argument('--evidence', required=True)
args = parser.parse_args()
books = Path(__file__).resolve().parent.parent
engine = Path(args.engine).resolve()
out = Path(args.evidence).resolve()
started = time.monotonic()
rows = []

def require(value, message):
    if not value:
        raise RuntimeError(message)

try:
    require(engine.is_dir(), 'engine checkout directory is missing')
    out.mkdir(parents=True, exist_ok=False)
    pin = json.loads((books / '.github/engine-ref.json').read_text())['ref']
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=books, text=True).strip()
    base = subprocess.check_output(['git', 'rev-parse', 'origin/main'], cwd=books, text=True).strip()
    engine_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=engine, text=True).strip()
    node = subprocess.check_output(['node', '--version'], text=True).strip()
except Exception as exc:
    print(f'Setup error: {exc}', file=sys.stderr)
    sys.exit(2)

version = 'v0.0.1·' + pin[:8]
product = books / 'stories/babel/babel-trial.html'
build = ['python3', str(engine / 'build.py'), str(books / 'stories/babel'),
         '--out', 'babel-trial.html', '--version', version]

def save():
    result = {'environment': f'Local {node} / Python {sys.version.split()[0]}',
              'scope': '16 mandatory semantic equivalents + one supplemental group; NOT Actions or balance acceptance',
              'head': head, 'base': base, 'engine': engine_head, 'rows': rows,
              'passed': sum(row['passed'] for row in rows), 'total': 17,
              'skipped': 17 - len(rows), 'seconds': round(time.monotonic() - started, 3)}
    (out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

def command(argv, cwd=books, expected=0):
    proc = subprocess.run(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    with (out / f'{len(rows) + 1:02}.log').open('a') as log:
        log.write('$ ' + repr(argv) + '\n' + proc.stdout + f'\nrc={proc.returncode}\n')
    require(proc.returncode == expected, f'{argv}: rc={proc.returncode}, expected={expected}')
    return proc.stdout

def step(name, commands=(), check=None):
    try:
        for argv in commands:
            command(argv)
        if check:
            check()
    except Exception as exc:
        rows.append({'name': name, 'passed': False, 'error': str(exc)})
        save()
        raise
    rows.append({'name': name, 'passed': True})
    print(f'{len(rows):02}: PASS {name}', flush=True)

def pin_shape():
    require(re.fullmatch('[0-9a-f]{40}', pin), 'pin must be a complete lowercase SHA')
    (out / '01.log').write_text('Complete pin SHA: ' + pin + '\n')

def build_check():
    command(build)
    text = product.read_text()
    require(not re.search(r'(src|href)="(https?:|//|[^#][^"]*\.(js|css|png|jpg|svg))"', text), 'external asset reference')
    require(text.count('buildVersion to "' + version + '"') == 1, 'version injection must occur exactly once')
    (out / 'first-build-sha256.txt').write_text(hashlib.sha256(product.read_bytes()).hexdigest() + '\n')

def repeat_check():
    before = product.read_bytes()
    command(build)
    require(product.read_bytes() == before, 'same-parameter builds differ')

def refs_knife():
    source = books / 'stories/babel/scenarios/scenarios.json'
    before = source.read_bytes()
    data = json.loads(before)
    data['场景'][0]['备注'] += '　`src/core/70-ui.js:69`'
    try:
        source.write_text(json.dumps(data, ensure_ascii=False))
        output = command(['node', 'tools/check-refs.mjs', '--engine', str(engine), '--require-symbols'], expected=1)
        require('src/core/70-ui.js:69' in output, 'missing-symbol knife did not identify its target')
    finally:
        source.write_bytes(before)
    require(source.read_bytes() == before, 'reference fixture not restored byte-for-byte')

def exit_knife():
    source = books / 'stories/babel/verify.mjs'
    before = source.read_bytes()
    require(before.count(b'\nprintSummary();') == 1, 'summary call must be unique')
    try:
        source.write_bytes(before.replace(b'\nprintSummary();', b'\n// printSummary();'))
        output = command(['node', 'stories/babel/verify.mjs', '--engine', str(engine)], expected=1)
        require('恒绿门' in output, 'exit knife did not identify the summary guard')
    finally:
        source.write_bytes(before)
    require(source.read_bytes() == before, 'verify source not restored byte-for-byte')

def clean_check():
    output = command(['git', 'status', '--porcelain', '--', 'src', 'tests/unit/framework', 'stories'], cwd=engine)
    require(not output.strip(), 'engine source checkout was modified')

try:
    step('complete pin SHA', check=pin_shape)
    step('checkout equals pin', [['node', 'tools/check-engine-pin.mjs', '--engine', str(engine)]])
    step('build, embedded assets, unique version', check=build_check)
    step('repeat build byte equality', check=repeat_check)
    step('scenario chains and manifest selftest', [['node', 'tests/scenario/run.mjs', '--engine', str(engine)]])
    step('references require-symbols', [['node', 'tools/check-refs.mjs', '--engine', str(engine), '--require-symbols']])
    step('content inventory', [['node', 'tools/check-content-inventory.mjs']])
    step('content inventory selftest', [['node', 'tools/check-content-inventory.mjs', '--selftest']])
    step('missing-symbol reference knife', check=refs_knife)
    step('pack manifest', [['node', 'tests/gates/pack-manifest.mjs', '--engine', str(engine)]])
    step('pack manifest selftest', [['node', 'tests/gates/pack-manifest.mjs', '--engine', str(engine), '--selftest']])
    step('workflow steps', [['node', 'tests/gates/workflow-steps.mjs']])
    step('workflow steps selftest', [['node', 'tests/gates/workflow-steps.selftest.mjs']])
    step('story assembly verify', [['node', 'stories/babel/verify.mjs', '--engine', str(engine)]])
    step('verify summary exit knife', check=exit_knife)
    step('engine source clean', check=clean_check)
    step('supplemental baseline and independent reference recount', [
        ['node', 'tools/check-baseline.mjs'],
        ['node', 'tools/check-refs-recheck.mjs', '--engine', str(engine), '--compare']])
except Exception as exc:
    print(f'Failed: {exc}; logs: {out}', file=sys.stderr)
    sys.exit(1)
save()
print((out / 'result.json').read_text())

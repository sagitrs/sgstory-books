#!/usr/bin/env python3
"""★真·演练（`#79` dev-10 NIT-4 落仓）：
用法：ENGINE=<引擎检出> python3 tools/rehearse-workflow.py [WF=<工作流文件>]

★真·演练：把 `babel-tests.yml` 里**每一步的 run 块**原样抽出、在**同样的 shell flags**（-euo pipefail）
下逐条执行（✗ 手抄命令 —— 手抄会把 `-e` 这类差异抄没，本会话的假绿正是这么来的）。"""
import os, re, subprocess, sys, pathlib

BOOKS = os.environ.get('BOOKS') or str(pathlib.Path(__file__).resolve().parent.parent)
# ★ENGINE 必给（✗ 不回落任何绝对路径 —— `#79` tester-4 RC 同族）：缺了要**具名报错**，✗ 抛裸 KeyError
if not os.environ.get('ENGINE'):
	sys.stderr.write('✗ 缺 ENGINE：用法 `ENGINE=<引擎检出@pin> python3 tools/rehearse-workflow.py`\n')
	sys.exit(2)
ENGINE = os.environ['ENGINE']
wf = pathlib.Path(os.environ.get('WF') or pathlib.Path(BOOKS, '.github/workflows/babel-tests.yml')).read_text(encoding='utf-8')

# 逐 step 切分（按 `      - ` 缩进层级）
steps, cur = [], None
for line in wf.split('\n'):
    m = re.match(r'^      - (name|uses): (.*)$', line)
    if m:
        if cur: steps.append(cur)
        cur = {'kind': m.group(1), 'name': m.group(2).strip('"\''), 'lines': []}
    elif cur is not None:
        cur['lines'].append(line)
if cur: steps.append(cur)

def run_block(step):
    body, inrun = [], False
    for l in step['lines']:
        m1 = re.match(r'^        run: (?!\|)(.+)$', l)          # 单行形（如「装配自检」）
        if m1: return m1.group(1).strip()
        if re.match(r'^        run: \|\s*$', l): inrun = True; continue
        if inrun:
            if l.strip() == '' : body.append(''); continue
            if re.match(r'^          ', l): body.append(l[10:]); continue
            break
    return '\n'.join(body).rstrip('\n') if inrun else None

env = dict(os.environ)
env['GITHUB_WORKSPACE'] = os.environ.get('GITHUB_WORKSPACE', '/tmp/gws')   # ${GITHUB_WORKSPACE}/books → BOOKS，/engine → ENGINE
env['GITHUB_OUTPUT'] = '/tmp/gh_output.txt'
open('/tmp/gh_output.txt','w').close()
npass = nfail = 0
for step in steps:
    body = run_block(step)
    if not body:
        print(f"  [skip] {step['kind']}: {step['name']}"); continue
    # ★必须兑现 `working-directory:`（否则演练跑在错的目录 ⇒ 假红/假绿 —— 本会话已踩）
    wd = BOOKS
    for l in step['lines']:
        m = re.match(r'^        working-directory: (\S+)\s*$', l)
        if m: wd = {'books': BOOKS, 'engine': ENGINE}.get(m.group(1), BOOKS)
    script = (body.replace('$GITHUB_WORKSPACE/books', BOOKS)
                  .replace('"$GITHUB_WORKSPACE/engine/"', f'"{ENGINE}/"')
                  .replace('$GITHUB_WORKSPACE/engine', ENGINE))
    # 工作流用 working-directory: books ⇒ 本排练也在 books 下跑
    open('/tmp/step.sh','w').write('set -euo pipefail\n' + script + '\n')
    r = subprocess.run(['bash','/tmp/step.sh'], capture_output=True, text=True, cwd=wd, env=env)
    tag = '✓' if r.returncode == 0 else '✗'
    print(f"  {tag} {step['name']}  (rc={r.returncode})")
    if r.returncode:
        nfail += 1
        print('    ' + '\n    '.join((r.stdout + r.stderr).strip().split('\n')[-6:]))
    else:
        npass += 1
print(f"  ── 工作流 run 块逐条演练：通过 {npass}｜失败 {nfail}")
sys.exit(1 if nfail else 0)

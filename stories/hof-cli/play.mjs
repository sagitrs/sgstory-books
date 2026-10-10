#!/usr/bin/env node
// Runtime bootstrap: the existing pin gate is the only authority for the ref.
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), options = {};
try {
  if (args.length === 1 && args[0] === '--help') {
    console.log('用法：node stories/hof-cli/play.mjs --engine <固定SHA引擎检出> [--seed 整数] [--save-dir 目录]\n游戏规则及两阶段检出见 stories/hof-cli/README.md。');
  } else {
    for (let i = 0; i < args.length; i += 2) {
      if (!['--engine', '--seed', '--save-dir'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) throw new Error('参数缺失、重复或未知');
      options[args[i]] = args[i + 1];
    }
    if (!options['--engine']) throw new Error('必须指定已固定的引擎检出');
    const engine = path.resolve(options['--engine']);
    const checked = spawnSync(process.execPath, [path.join(root, 'tools/check-engine-pin.mjs'), '--ref-file', 'stories/hof-cli/engine-ref.json', '--engine', engine, '--quiet'], { cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 65536 });
    if (checked.error || checked.status !== 0) throw new Error(`独立pin核失败；${checked.error?.message || checked.stdout + checked.stderr}`);
    const pin = JSON.parse(fs.readFileSync(path.join(root, 'stories/hof-cli/engine-ref.json'), 'utf8'));
    const { CLI_INTERFACE_VERSION } = await import(pathToFileURL(path.join(engine, 'src/cli/session.mjs')).href);
    if (pin.interfaceVersion !== 1 || CLI_INTERFACE_VERSION !== pin.interfaceVersion) throw new Error('游戏只支持CLI接口1；不回退网页引擎');
    const main = path.join(engine, 'src/cli/main.mjs');
    process.argv = [process.execPath, main, '--game', path.join(root, 'stories/hof-cli/game.mjs')];
    for (const flag of ['--seed', '--save-dir']) if (options[flag] !== undefined) process.argv.push(flag, options[flag]);
    await import(pathToFileURL(main).href);
  }
} catch (error) { console.error(`APPARATUS HOF_BOOT: ${error.message}`); process.exitCode = 2; }

import test from 'node:test';
import assert from 'node:assert/strict';
import { debugStderrOnly } from '../../../tools/cli/player.mjs';
// 交付树做不出 > 64 KiB 的页（hof-cli 全部内容表序列化＝2950 字节，见 #608 的「引擎/工具连带面」第 3 面）
// ⇒ 截断形没法走 e2e，只能直打这个谓词；e2e 仍覆盖正常 debug 面（单行 JSON ⇒ quit() 通过）。
const notice = '[DEBUG_TRUNCATED] 诊断数据 196619 字节超过 65536 字节，已截断输出；会话未改变。\n';
const dump = '{"coins":2,"food":2}\n';
test('HOF-U65 debug stderr accepts json dumps and truncated notices', () => {
  assert.equal(debugStderrOnly(''), true);
  assert.equal(debugStderrOnly(dump), true);
  // 谓词按「行」判：合法的 JSON 行恒放行，所以两行 JSON 仍算调试输出（#610 的既有语义，本次未改）。
  assert.equal(debugStderrOnly(dump + dump), true);
  assert.equal(debugStderrOnly(notice + '{"note":"粮食规则"'), true);
});
test('HOF-U66 debug stderr rejects a non-json line after the cut body', () => {
  // 「只放行紧接提示行的一行」：第三行若是被切断的残片，必须判红，不得继续吞。
  assert.equal(debugStderrOnly(notice + '{"note":"粮食规则"\n还剩下的字\n'), false);
});
test('HOF-U67 debug stderr rejects bare non-json lines', () => {
  assert.equal(debugStderrOnly('Error: boom\n'), false);
  assert.equal(debugStderrOnly(dump + 'plain text\n'), false);
});
test('HOF-U68 debug stderr rejects apparatus or product errors mixed with debug lines', () => {
  assert.equal(debugStderrOnly('APPARATUS CLI spawn ENOENT\n'), false);
  assert.equal(debugStderrOnly(dump + 'APPARATUS READONLY dirty: engine\n'), false);
  // 已定的边界：提示行之后那一行**不解析**（被切断的正文本来就不是合法 JSON）⇒
  // 该行无论是残片还是别的文本都放行。本格因此不用「提示行 ＋ 错误行」当反例。
  assert.equal(debugStderrOnly('倒木后的鼠群：有效反击1次，损失2生命。\n'), false);
});

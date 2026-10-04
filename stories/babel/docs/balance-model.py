#!/usr/bin/env python3
"""平衡模型（`books#201` 乙笔）—— **校准过的**期望模型，与跑分器互为对账。

用法：  python3 balance-model.py <跑分器 --dump-tracks 的轨迹档>

它做什么（方法论律一：模型必须先复现已知读数，才对数值有发言权）：
  1. 从轨迹档取**实测原语**（每场出手次数、命中率、**每次命中的伤害样本**）；
  2. 用这些原语跑蒙特卡洛（**自助抽样**伤害样本 ⇒ ✗ 不用 `1..max` 均匀，那会把均伤抬高一倍）；
  3. 与实跑胜率并列打印 ⇒ 两端落同一区间才算校准成立。

三处**结构**修正（都是校准中被实跑逼出来的，✗ 不是数值调整）：
  · **夹具初始状态**（血／非致命）必须按夹具读 —— 不修它，「不温泉」那格模型给 35%，实跑 0.5%；
  · **伤害抽样**用**实测分布**（自助），✗ 不用区间均匀；
  · **回合预算取「回合上限」（8）**，✗ **不**取实测「每场出手次数」—— ⚠ 这一条是校准里最反直觉的一处：
    「出手/场」是**结果**而不是参数（输的人早死、出手少；赢的人打满）⇒ 把它当参数会**系统性低估赢家**
    （乙树实测：取实测均值 ⇒ 模型 36.5%、实跑 78.5%；改成回合上限 ⇒ 两端同区间）。死亡截断由模拟负责。

对照树（无乙·N=200）实测对账：
  满装 4.0% vs 模型 2.8%｜温泉 9.0% vs 6.3%｜不温泉 0.5% vs 0.1%
  ⇒ 同区间；模型整体**偏保守约 1–3pp**（该偏差写在票面，✗ 不抹掉）。
"""
import re, sys, random, collections

初始 = {'满装→L9 头目': (20, 0), '温泉→L9 头目': (20, 0), '不温泉→L9 头目': (6, 2)}

def 读轨迹(路径):
    夹具 = None; D = collections.OrderedDict()
    for l in open(路径, encoding='utf-8'):
        m = re.search(r'── 逐回合轨迹（([^｜]+)｜样本 (\d+)）', l)
        if m:
            夹具 = m.group(1).strip(); D.setdefault(夹具, []); continue
        m = re.match(r'\s*样本 (\d+)｜.*战果 (\S+)｜回合 (\d+)', l)
        if m and 夹具:
            D[夹具].append(dict(战果=m.group(2), 己=0, 己中=0, 己伤=[], 敌=0, 敌中=0, 敌伤=[])); continue
        a = re.match(r'\s*#\d+ (己方|敌方)\S*｜动作=([^｜（]+)', l)
        if a and 夹具:
            r = D[夹具][-1]; 侧 = '己' if a.group(1) == '己方' else '敌'; r[侧] += 1
            d = re.search(r'−(\d+) ⇒', l)
            if d: r[侧 + '中'] += 1; r[侧 + '伤'].append(int(d.group(1)))
    return D

def 原语(S):
    n = len(S)
    def g(k):
        A = sum(v[k] for v in S); H = sum(v[k + '中'] for v in S)
        X = [x for v in S for x in v[k + '伤']]
        return H / max(1, A), X, A / n
    j = g('己'); e = g('敌')
    return dict(己率=j[0], 己伤=j[1], 敌率=e[0], 敌伤=e[1], 出手=j[2],
                真=sum(1 for v in S if v['战果'] == 'victory') / n)

def 模型(u, 先手='玩家', 血=20, 非=0, 上限=4, trials=30000, seed=7):
    random.seed(seed); 胜 = 0
    for _ in range(trials):
        bhp, php = 26, 血 - 非
        for _r in range(上限):
            for 谁 in (['己', '敌'] if 先手 == '玩家' else ['敌', '己']):
                if random.random() < u[谁 + '率']:
                    d = random.choice(u[谁 + '伤'])
                    if 谁 == '己':
                        bhp -= d
                        if bhp <= 0: 胜 += 1; break
                    else:
                        php -= d
                        if php <= 0: break
                if bhp <= 0 or php <= 0: break
            if bhp <= 0 or php <= 0: break
    return 胜 / trials

if __name__ == '__main__':
    D = 读轨迹(sys.argv[1])
    print(f"{'夹具':<16}{'实跑':>7}{'模型·玩家先':>13}{'模型·头目先':>13}{'己命中':>8}{'敌命中':>8}")
    for k, S in D.items():
        u = 原语(S); 血, 非 = 初始.get(k, (20, 0)); 上限 = 8   # ★回合上限＝参数；「出手/场」是结果，✗ 不当预算
        a = 模型(u, '玩家', 血, 非, 上限); b = 模型(u, '头目', 血, 非, 上限)
        print(f"{k:<16}{u['真']*100:>6.1f}%{a*100:>12.1f}%{b*100:>12.1f}%{u['己率']*100:>7.0f}%{u['敌率']*100:>7.0f}%")

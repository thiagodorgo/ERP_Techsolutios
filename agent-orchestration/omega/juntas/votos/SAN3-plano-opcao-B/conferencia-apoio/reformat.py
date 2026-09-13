import re, sys, difflib, collections
S = sys.argv[1]
A = open(S+'/pend_042.md', encoding='utf-8').read().split('\n')
B = open(S+'/pend_new.md', encoding='utf-8').read().split('\n')
sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
print('042e689e -> bb3f5925:', dict(collections.Counter(op for op,*_ in sm.get_opcodes())))
OLD = re.compile(r'^- \*\*dono \(plano SAN3, §4\.1 item (\d+) — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13\)(, emenda sobre `[^`]+`)?:\*\* (.*)$')
NEW = re.compile(r'^- \*\*dono:\*\* `(B-[A-Za-z0-9-]+)` \(plano SAN3, §4\.1 item (\d+) — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13\)(, emenda sobre `[^`]+`)?(.*)$')
ok = bad = 0; add = []
for op,i1,i2,j1,j2 in sm.get_opcodes():
    if op == 'replace':
        for o,nw in zip(A[i1:i2], B[j1:j2]):
            mo, mn = OLD.match(o), NEW.match(nw)
            if not (mo and mn): bad += 1; print('  NAO-FORMATO', i1+1, o[:90], '||', nw[:90]); continue
            item_o, sob_o, rest_o = mo.group(1), mo.group(2) or '', mo.group(3)
            blk_o = re.match(r'`(B-[A-Za-z0-9-]+)`', rest_o)
            blk_o = blk_o.group(1) if blk_o else re.findall(r'dono `(B-[A-Za-z0-9-]+)`', rest_o)[-1]
            rest_o2 = re.sub(r'^`B-[A-Za-z0-9-]+`\.?', '', rest_o).strip()
            rest_n = mn.group(4).lstrip(':').strip().lstrip('.').strip()
            same = (blk_o == mn.group(1) and item_o == mn.group(2) and sob_o == (mn.group(3) or '') and (rest_o2.rstrip('.') == rest_n.rstrip('.') or rest_o2 == ''))
            ok += same; bad += (not same)
            if not same: print('  DIFERE', i1+1, '|', o[:140], '\n      ->', nw[:140])
        if (i2-i1) != (j2-j1): print('  replace desigual', i1, i2, j1, j2)
    elif op == 'insert': add += [(j+1, B[j][:150]) for j in range(j1,j2)]
    elif op == 'delete': print('  DELETE', A[i1:i2])
print('reformatadas iguais em bloco/item/alvo/corpo:', ok, '| diferentes ou fora do formato:', bad)
print('acrescentadas:', len(add))
for x in add: print('  +', x)
nf = [(ln+1, l) for ln,l in enumerate(B) if NEW.match(l)]
print('\nemendas de dono no formato novo (bb3f5925):', len(nf))

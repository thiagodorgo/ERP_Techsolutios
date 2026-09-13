# Verificador PROPRIO: le do plano (042e689e) a coluna Dep. do §5, as travas do §6 e a tabela publicada do §6,
# e confere se a tabela publicada respeita toda aresta (fim do antecessor <= inicio do sucessor) e se nenhuma frente se sobrepoe.
import re, sys
S = sys.argv[1]
L = open(S + '/plano.md', encoding='utf-8').read().split('\n')
SHORT = {'04a':'B-O6R-04a','03a':'B-O6R-03a','07c':'B-O6R-07c','11':'B-O6R-11','04b':'B-O6R-04b','03b':'B-O6R-03b','AV-REAL':'B-AV-REAL'}
def norm(t):
    t = t.strip()
    if t in SHORT: return SHORT[t]
    if t.startswith('B-'): return t
    if re.match(r'SAN3-\d+[ab]?$', t): return 'B-' + t
    return None
# tabela do §6
i6 = L.index('## 6. Dependências e a agenda do melhor caso'); i7 = L.index('## 7. Registro e governança')
sec6 = L[i6:i7]
win = {}; fr = {}
for l in sec6:
    m = re.match(r'^\| (\d|fecho)[^|]*\| (.*)\|$', l)
    if not m: continue
    for mm in re.finditer(r'`([^`]+)` ([\d,]+)–([\d,]+)', m.group(2)):
        b = norm(mm.group(1)); a = float(mm.group(2).replace(',', '.')); e = float(mm.group(3).replace(',', '.'))
        win[b] = (a, e); fr.setdefault(m.group(1), []).append(b)
print('blocos na tabela do §6:', len(win))
# Dep. do §5
dep = {}
for l in L:
    if not l.startswith('| `B-'): continue
    cols = [c.strip() for c in l.strip().strip('|').split('|')]
    b = re.match(r'`(B-[A-Za-z0-9-]+)`', cols[0]).group(1)
    depcol = cols[-2]
    toks = [norm(t) for t in re.findall(r'`([^`]+)`', depcol)]
    toks = [t for t in toks if t and t in win and t != b]
    if 'todos os blocos do §5.1–5.4' in depcol: toks = [x for x in win if x != b]
    if 'todos os blocos de `frontend/`' in depcol: toks += ['__FRONT__']
    dep[b] = toks
print('blocos no §5:', len(dep), '| no §6 e nao no §5:', set(win) - set(dep), '| no §5 e nao no §6:', set(dep) - set(win))
# travas do §6
ti = next(i for i, l in enumerate(sec6) if l.startswith('**Travas de mesmo arquivo'))
te = next(j for j in range(ti, len(sec6)) if sec6[j].strip() == ''); tt = ' '.join(sec6[ti:te])
edges = []
for grp in re.findall(r'\(([^()]*→[^()]*)\)', tt):
    for chain in re.split(r';|, (?=`)', grp):
        ns = [norm(x) for x in re.findall(r'`([^`]+)`', chain)]
        ns = [x for x in ns if x]
        edges += [(a, b) for a, b in zip(ns, ns[1:])]
print('arestas de trava:', len(edges))
for a, b in edges:
    if a in ('B-O6R-07c',) and b == 'B-SAN3-26' or (a, b) in (('B-SAN3-11', 'B-O6R-12'), ('B-SAN3-07', 'B-SAN3-18'), ('B-SAN3-04a', 'B-SAN3-07')):
        print('   trava nova/estendida presente:', a, '->', b)
viol = []
for b, ds in dep.items():
    for d in ds:
        if d == '__FRONT__': continue
        if win[d][1] > win[b][0]: viol.append(('Dep', d, b, win[d], win[b]))
for a, b in edges:
    if a in win and b in win and win[a][1] > win[b][0]: viol.append(('trava', a, b, win[a], win[b]))
# frente sem sobreposicao
for f, bs in fr.items():
    for x, y in zip(bs, bs[1:]):
        if win[x][1] > win[y][0]: viol.append(('frente', f, x, y))
# SAN3-21 depois de todos os blocos de frontend (fronteira com frontend/)
front = [b for l in L if l.startswith('| `B-') for b in [re.match(r'\| `(B-[A-Za-z0-9-]+)`', l).group(1)] if 'frontend/' in l.split('|')[4 if l.count('|') > 9 else 3] and b != 'B-SAN3-21']
for d in front:
    if d in win and win[d][1] > win['B-SAN3-21'][0]: viol.append(('frontend->SAN3-21', d, win[d]))
print('blocos com frontend/ na fronteira (devem terminar antes do SAN3-21):', len(front))
# arestas de trava que nao estao na coluna Dep.
fora = [(a, b) for a, b in edges if b in dep and a not in dep[b] and b != 'B-SAN3-10']
print('arestas de trava que NAO estao na coluna Dep. do sucessor:', fora)
print('VIOLACOES (tabela publicada do §6):', len(viol))
for v in viol: print('  ', v)
for b in ('B-SAN3-26', 'B-O6R-12', 'B-SAN3-18', 'B-SAN3-25'): print(f'  Dep. {b}: {dep[b]}')

# Esf. e realista recalculado por mim (ordem da frente = a publicada no §6; inicio = max(fim do anterior na frente, fim de toda Dep. e antecessor de trava))
esf = {}
for l in L:
    if l.startswith('| `B-'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; esf[re.match(r'`(B-[A-Za-z0-9-]+)`', c[0]).group(1)] = c[-1]
import collections; print('Esf.:', dict(collections.Counter(esf.values())))
pre = {b: set(d for d in dep[b] if d != '__FRONT__') for b in dep}
for a, b in edges:
    if a in win and b in win: pre[b].add(a)
for d in front: pre['B-SAN3-21'].add(d)
def sched(D):
    en = {}; st = {}
    for _ in range(200):
        ch = False
        for f, bs in fr.items():
            prev = 0
            for b in bs:
                if any(x not in en for x in pre[b]) or prev is None: prev = None; continue
                s0 = max([prev] + [en[x] for x in pre[b]]); e0 = s0 + D[esf[b]]
                if en.get(b) != e0: en[b] = e0; st[b] = s0; ch = True
                prev = e0
        if not ch: break
    return st, en
for nome, D in (('melhor', {'G':13,'M':5,'P':1.5}), ('realista', {'G':57,'M':10,'P':2})):
    st, en = sched(D)
    fims = {f: max(en[b] for b in bs) for f, bs in fr.items()}
    v = [(a, b) for b in pre for a in pre[b] if en[a] > st[b]]
    print(nome, 'fim por frente:', fims, '| violacoes:', len(v))
    if nome == 'melhor':
        dif = [(b, win[b], (st[b], en[b])) for b in win if (st[b], en[b]) != win[b]]
        print('  tabela publicada x recalculo:', dif if dif else 'IDENTICAS')

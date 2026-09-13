# Ferramenta PROPRIA: regra do sujeito (forma estrita do planejador). Sujeito = entrada cujo CABECALHO traz o ID
# (P-: token exato; Ω6R: forma longa ou curta); na falta, bullet/emenda "sobre `ID`" numa hospedeira.
# Dono atual = ULTIMA linha de dono relevante ao ID no sujeito (sem "(antes: ...)" nem "Valor anterior, preservado").
import re, sys, collections
S = sys.argv[1]
P = open(S+'/plano.md', encoding='utf-8').read().split('\n')
N = open(S+'/pend_new.md', encoding='utf-8').read().split('\n')
IDR = r'(?:P-[A-Za-z0-9ΩΔ_-]*[A-Za-z0-9ΩΔ]|Ω6R-[A-Z]+-\d+)'
a = P.index('### 4.1 Bloqueantes — 56 itens'); b = next(i for i,l in enumerate(P) if l.startswith('### 4.2'))
items = {}
for l in P[a:b]:
    if re.match(r'^\| \d+ \|', l):
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        items[int(c[0])] = (re.findall(r'`('+IDR+r')`', c[1]), re.search(r'`(B-[A-Za-z0-9-]+)`', c[4]).group(1))
GATE = {x for ids,_ in items.values() for x in ids}
H = [(i, re.match(r'## (P-[A-Za-z0-9ΩΔ_-]+)', l).group(1)) for i,l in enumerate(N) if re.match(r'## P-[A-Za-z0-9ΩΔ_-]+', l)]
AH = [i for i,l in enumerate(N) if l.startswith('## ')] + [len(N)]
E = [(p, i, next(x for x in AH if x > i)) for i,p in H]
own = lambda ln: next((p for p,i,e in E if i <= ln < e), None)
def R(x):
    if x.startswith('Ω6R-'): return re.compile(r'(?:Ω6R-|(?<![A-Za-z0-9-]))'+re.escape(x[4:])+r'(?!\d)')
    return re.compile(r'(?<![A-Za-z0-9ΩΔ_-])'+re.escape(x)+r'(?![A-Za-z0-9ΩΔ_-])')
T = lambda b: re.compile(re.escape(b)+r'(?![A-Za-z0-9-])')
clean = lambda l: re.sub(r'\(antes: .*|Valor anterior, preservado.*', '', l)
isd = lambda l: bool(re.search(r'\bdono\b', clean(l), re.I)) and bool(re.search(r'\bB-[A-Z0-9]+-[A-Za-z0-9-]+', clean(l)))
res = []; extra = []
for n,(ids,blk) in sorted(items.items()):
    for x in ids:
        rx = R(x)
        subs = [(p,i,e,'cab') for p,i,e in E if rx.search(N[i])]
        if not subs:
            hl = sorted({own(ln) for ln,l in enumerate(N) if re.search(r'sobre `'+re.escape(x)+'`', l) or re.match(r'^- \*\*`?'+re.escape(x)+r'`?\*\*', l)} - {None})
            subs = [(p,i,e,'hosp') for p,i,e in E if p in hl]
        if not subs: res.append((n,x,blk,'SEM-SUJEITO',None)); continue
        for p,i,e,kind in subs:
            if p != x: extra.append((n,x,p,kind))
            dl = [ln for ln in range(i,e) if isd(N[ln])]
            rel = [ln for ln in dl if rx.search(N[ln])] if p != x else dl
            if p != x and not rel:
                rel = [ln for ln in dl if not any(R(g).search(N[ln]) for g in GATE if g != p)]
            if not rel: res.append((n,x,blk,'SEM-DONO',(p,kind))); continue
            last = rel[-1]; L = clean(N[last])
            nb = re.findall(r'\bB-[A-Z0-9]+-[A-Za-z0-9-]+', L)
            its = [int(m) for m in re.findall(r'§4\.1,? item (\d+)', L)]
            ok = T(blk).search(L) and all(k == n for k in its)
            res.append((n,x,blk,'OK' if ok else 'FALHA',(p,kind,last+1,sorted(set(nb)),its)))
by = collections.defaultdict(list)
for r in res: by[r[0]].append(r)
itok = [n for n in by if all(r[3]=='OK' for r in by[n]) and any(r[3]=='OK' for r in by[n])]
print('pares (item, ID, sujeito) avaliados:', len(res), dict(collections.Counter(r[3] for r in res)))
print('itens com TODO sujeito OK:', len(itok), '/ 56')
for r in res:
    if r[3] != 'OK': print('  NAO-OK', r)
print('\nsujeitos que nao sao a propria entrada do ID (hospedeira ou cabecalho de outra entrada):')
for t in extra:
    rr = next(r for r in res if r[0]==t[0] and r[1]==t[1] and r[4] and r[4][0]==t[2])
    print('  item', t[0], t[1], '->', t[2], f'({t[3]})', rr[3], rr[4][2:] if rr[4] else '')
# ponteiros, forma estrita, com "sobre" em qualquer ponto da linha
I = collections.defaultdict(set)
for n,(ids,_) in items.items():
    for x in ids: I[x].add(n)
st = []
for ln,l in enumerate(N):
    for m in re.finditer(r'plano SAN3(?: v5)?,? (?:§4\.1,? )?item (\d+)', l):
        so = re.findall(r'sobre `('+IDR+r')`', l); s = so[0] if so else own(ln)
        pos_antes = l.find('(antes: '); vivo = pos_antes < 0 or m.start() < pos_antes
        st.append((ln+1, s, int(m.group(1)), vivo))
dv = [x for x in st if x[3] and x[2] not in I.get(x[1], set())]
print('\nponteiros forma estrita:', len(st), '| vivos:', sum(x[3] for x in st), '| vivos divergentes:', dv)

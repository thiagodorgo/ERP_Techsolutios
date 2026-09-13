import re, sys, collections
S = sys.argv[1]
P = open(S+'/plano.md', encoding='utf-8').read().split('\n')
N = open(S+'/pend_new.md', encoding='utf-8').read().split('\n')
IDR = r'(?:P-[A-Za-z0-9ΩΔ_-]*[A-Za-z0-9ΩΔ]|Ω6R-[A-Z]+-\d+)'
a = P.index('### 4.1 Bloqueantes — 56 itens'); b = next(i for i,l in enumerate(P) if l.startswith('### 4.2'))
items = {}
for l in P[a:b]:
    if not re.match(r'^\| \d+ \|', l): continue
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    items[int(c[0])] = (re.findall(r'`('+IDR+r')`', c[1]), re.search(r'`(B-[A-Za-z0-9-]+)`', c[4]).group(1))
print('4.1:', len(items), 'itens; 1..56:', sorted(items) == list(range(1,57)))
for n in (16, 55, 56): print('  item', n, items[n])
I = collections.defaultdict(set)
for n,(ids,_) in items.items():
    for x in ids: I[x].add(n)
H = [(i, re.match(r'## (P-[A-Za-z0-9ΩΔ_-]+)', l).group(1)) for i,l in enumerate(N) if re.match(r'## P-[A-Za-z0-9ΩΔ_-]+', l)]
AH = [i for i,l in enumerate(N) if l.startswith('## ')] + [len(N)]
E = [(p, i, next(x for x in AH if x > i)) for i,p in H]
def own(ln): return next((p for p,i,e in E if i <= ln < e), None)
print('\n== PONTEIROS ==')
pt = []
for ln,l in enumerate(N):
    for m in re.finditer(r'\bitens? (\d+(?:(?:, | e |–)\d+)*)', l):
        if not re.search(r'plano SAN3|§4\.1', l[max(0,m.start()-160):m.start()]): continue
        s = own(ln); es = re.findall(r'emenda sobre `('+IDR+r')`', l[:m.start()]); s = es[-1] if es else s
        ns = [int(x) for x in re.findall(r'\d+', m.group(1))]
        pt.append((ln+1, s, ns, l[max(0,m.start()-90):m.end()+30]))
dv = [x for x in pt if not set(x[2]) <= I.get(x[1], set())]
print('ocorrencias:', len(pt), '| fora do item do sujeito:', len(dv))
for x in dv: print(f'  l.{x[0]} {x[1]} (itens {sorted(I.get(x[1],[]))}) cita {x[2]}: «{x[3]}»')
st = [(ln+1, own(ln), int(m.group(1)), re.findall(r'emenda sobre `('+IDR+r')`', l[:m.start()])) for ln,l in enumerate(N) for m in re.finditer(r'plano SAN3(?: v5)?,? (?:§4\.1,? )?item (\d+)', l)]
sd = [x for x in st if x[2] not in I.get(x[3][-1] if x[3] else x[1], set())]
print('forma estrita "plano SAN3[ v5][,] [§4.1[,] ]item N":', len(st), '| divergentes:', sd)
print('quebrados em 2 linhas:', [ln+1 for ln in range(len(N)-1) if re.search(r'plano SAN3[^()]*$', N[ln]) and re.match(r'^\s*(?:§4\.1,? )?itens? \d', N[ln+1])])
print('\n== DONO PELA PROPRIEDADE ==')
T = lambda b: re.compile(re.escape(b)+r'(?![A-Za-z0-9-])')
out = []
for n,(ids,blk) in sorted(items.items()):
    for pid in ids:
        if pid.startswith('Ω6R-'):
            out.append((n,pid,blk,'O6R', [N[i][:60] for p,i,e in E if pid in N[i]])); continue
        sp = [(i,e) for p,i,e in E if p == pid]; host = None
        if not sp:
            hl = [ln for ln,l in enumerate(N) if f'emenda sobre `{pid}`' in l]
            host = own(hl[0]) if hl else None; sp = [(i,e) for p,i,e in E if p == host]
        if not sp: out.append((n,pid,blk,'SEM-ENTRADA',None)); continue
        ok, bad, last = [], [], None
        for i,e in sp:
            for ln in range(i,e):
                l = N[ln]
                if host and f'`{pid}`' not in l: continue
                if re.search(r'dono', l, re.I) and T(blk).search(l):
                    ok.append(ln+1); bad += [(ln+1,int(m.group(1))) for m in re.finditer(r'§4\.1,? item (\d+)', l) if int(m.group(1)) != n]
                v = re.sub(r'\(antes: .*|Valor anterior, preservado.*', '', l)
                if re.search(r'\bdono\b', v, re.I) and re.search(r'`B-[A-Za-z0-9-]+`', v): last = (ln+1, re.findall(r'`(B-[A-Za-z0-9-]+)`', v))
        stt = 'OK' if ok and not bad else ('ITEM-ERRADO' if bad else 'BLOCO-AUSENTE')
        if last and blk not in last[1]: stt += ' ULTIMO-DONO-DIFERE'
        out.append((n,pid,blk,stt,(ok[:3],host,bad,last)))
print('avaliados:', len(out), dict(collections.Counter(o[3] for o in out)))
for o in out:
    if o[3] != 'OK': print('  ', o)

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
        items[int(c[0])] = (re.findall(r'`('+IDR+r')`', c[1]), c[5])
chk = sorted(n for n,(i,r) in items.items() if '✓' in r)
s87 = next(l for l in P if 'As reclassificações `✓` do §4.1' in l)
j = P.index(s87); txt = ' '.join(P[j:j+2]); lst = txt[txt.index('(itens')+6:txt.index('):')]
exp = []
for t in re.findall(r'\d+(?:–\d+)?', lst):
    x = t.split('–'); exp += list(range(int(x[0]), int(x[-1])+1))
print('✓ na coluna:', len(chk), '| lista do §8.7:', len(exp), '| iguais:', chk == sorted(exp))
I = collections.defaultdict(set)
for n,(ids,_) in items.items():
    for x in ids: I[x].add(n)
H = [(i, re.match(r'## (P-[A-Za-z0-9ΩΔ_-]+)', l).group(1)) for i,l in enumerate(N) if re.match(r'## P-[A-Za-z0-9ΩΔ_-]+', l)]
AH = [i for i,l in enumerate(N) if l.startswith('## ')] + [len(N)]
E = [(p, i, next(x for x in AH if x > i)) for i,p in H]
own = lambda ln: next((p for p,i,e in E if i <= ln < e), None)
# busca ampla, sem \b e sem janela: toda linha que cita "plano SAN3" e tem "item(s) N"
rx = re.compile(r'(?<![A-Za-z])ite(?:m|ns) ([0-9]+(?:(?:, | e |–)[0-9]+)*)')
amp = []
for ln,l in enumerate(N):
    if 'plano SAN3' not in l and '§4.1' not in l: continue
    for m in rx.finditer(l):
        s = own(ln)
        es = re.findall(r'emenda sobre `('+IDR+r')`', l)
        if es: s = es[-1]
        ns = [int(x) for x in re.findall(r'\d+', m.group(1))]
        amp.append((ln+1, s, ns, l[max(0,m.start()-110):m.end()+25]))
print('\nbusca ampla: linhas com "plano SAN3"/"§4.1" e "item(s) N":', len(amp))
dv = [x for x in amp if not set(x[2]) <= I.get(x[1], set())]
print('fora do item do sujeito:', len(dv))
for x in dv: print(f'  l.{x[0]} {x[1]} itens={sorted(I.get(x[1],[]))} cita={x[2]}\n     «{x[3]}»')
for ln in (406, 1382, 9250): print(f'\nL.{ln} [{own(ln-1)}]: {N[ln-1][:420]}')

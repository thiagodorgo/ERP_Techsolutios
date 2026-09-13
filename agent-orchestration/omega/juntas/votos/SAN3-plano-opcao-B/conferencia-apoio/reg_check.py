# Ferramenta PROPRIA da cadeira de conferencia (nao reutiliza scripts do aplicador).
import re, sys, difflib, collections
S = sys.argv[1]
plano = open(S+'/plano.md', encoding='utf-8').read().split('\n')
new = open(S+'/pend_new.md', encoding='utf-8').read().split('\n')
old = open(S+'/pend_old.md', encoding='utf-8').read().split('\n')
IDRX = r'(?:P-[A-Za-z0-9ΩΔ_-]*[A-Za-z0-9ΩΔ]|Ω6R-[A-Z]+-\d+)'
# ---------- 4.1 ----------
a = plano.index('### 4.1 Bloqueantes — 56 itens'); b = next(i for i,l in enumerate(plano) if l.startswith('### 4.2'))
items = {}
for l in plano[a:b]:
    m = re.match(r'^\| (\d+) \| (.*)\|\s*$', l)
    if not m: continue
    cols = [c.strip() for c in l.strip().strip('|').split('|')]
    n = int(cols[0]); itemcol = cols[1]; bloco = re.search(r'`(B-[A-Za-z0-9-]+)`', cols[4]).group(1)
    ids = re.findall(r'`('+IDRX+r')`', itemcol.split(' — ')[0]) + [x for x in re.findall(r'`('+IDRX+r')`', itemcol) if x not in re.findall(r'`('+IDRX+r')`', itemcol.split(' — ')[0])]
    items[n] = dict(ids=ids, bloco=bloco, check=cols[5])
print('4.1: itens', len(items), 'numeros 1..56 completos:', sorted(items)==list(range(1,57)))
id2items = collections.defaultdict(set)
for n,d in items.items():
    for i in d['ids']: id2items[i].add(n)
print('IDs distintos na coluna Item:', len(id2items))
for n in (16,55,56,7): print(f'  item {n}: ids={items[n]["ids"]} bloco={items[n]["bloco"]} reclass={items[n]["check"]!r}')
chk = sorted(n for n,d in items.items() if '✓' in d['check'])
print('✓:', len(chk), chk)
ohm = [n for n,d in items.items() if any(i.startswith('Ω6R-') for i in d['ids'])]
print('itens com achado Ω6R na coluna Item:', len(ohm), ohm, '-> fora da auditoria =', 56-len(ohm))
# ---------- entradas do registro ----------
def entries(lines):
    hs = [(i, re.match(r'## ('+r'P-[A-Za-z0-9ΩΔ_-]+'+r')', l).group(1)) for i,l in enumerate(lines) if l.startswith('## ') and re.match(r'## P-[A-Za-z0-9ΩΔ_-]+', l)]
    allh = [i for i,l in enumerate(lines) if l.startswith('## ')] + [len(lines)]
    out = []
    for i,pid in hs:
        end = next(x for x in allh if x > i)
        out.append((pid, i, end))
    return out
E = entries(new)
byid = collections.defaultdict(list)
for pid,i,e in E: byid[pid].append((i,e))
def owner(ln):
    for pid,i,e in E:
        if i <= ln < e: return pid
    return None
# ---------- ponteiros: todo "item(s) N" em trecho que cita "plano SAN3" ou "§4.1" ----------
print('\n=== PONTEIROS (ferramenta propria) ===')
ptr = []
for ln,l in enumerate(new):
    for m in re.finditer(r'\bitens? ((?:\d+)(?:(?:, | e |–|-)\d+)*)', l):
        ctx = l[max(0,m.start()-160):m.start()]
        if not re.search(r'plano SAN3|§4\.1', ctx): continue
        nums = [int(x) for x in re.findall(r'\d+', m.group(1))]
        subj = owner(ln)
        es = re.findall(r'emenda sobre `('+IDRX+r')`', l[:m.start()])
        if es: subj = es[-1]
        ptr.append((ln+1, subj, nums, l[max(0,m.start()-100):m.end()+40]))
div = [p for p in ptr if not set(p[2]) <= id2items.get(p[1], set())]
print('ocorrencias "item N" em contexto plano SAN3/§4.1:', len(ptr), '| fora do item do sujeito:', len(div))
for ln,subj,nums,ctx in div:
    print(f'  l.{ln} sujeito={subj} itens-do-sujeito={sorted(id2items.get(subj,[]))} cita={nums}\n      «{ctx}»')
# forma estrita: "plano SAN3 ... item N" dentro do mesmo parentese/frase curta
strict = []
for ln,l in enumerate(new):
    for m in re.finditer(r'plano SAN3(?: v5)?,? (?:§4\.1,? )?item (\d+)', l):
        subj = owner(ln); es = re.findall(r'emenda sobre `('+IDRX+r')`', l[:m.start()])
        if es: subj = es[-1]
        strict.append((ln+1, subj, int(m.group(1))))
sdiv = [s for s in strict if s[2] not in id2items.get(s[1], set())]
print('forma estrita "plano SAN3[ v5][,] [§4.1[,] ]item N":', len(strict), '| divergentes:', len(sdiv), sdiv)
# ponteiros quebrados em duas linhas
wrap = []
for ln in range(len(new)-1):
    if re.search(r'plano SAN3[^()]*$', new[ln]) and re.match(r'^\s*(?:§4\.1,? )?itens? \d+', new[ln+1]):
        wrap.append(ln+1)
print('ponteiros quebrados em duas linhas:', wrap)
# ---------- dono pela propriedade ----------
print('\n=== DONO PELA PROPRIEDADE (56 itens) ===')
def tok(b): return re.compile(re.escape(b)+r'(?![A-Za-z0-9-])')
hosted = {}
res = []
for n in sorted(items):
    d = items[n]
    for pid in d['ids']:
        if pid.startswith('Ω6R-'):
            hdr = [x for x in E if pid in new[x[1]]]
            res.append((n,pid,d['bloco'],'ACHADO-O6R', f'cabecalhos que o citam: {[(new[i][:70]) for _,i,_ in hdr]}'))
            continue
        spans = byid.get(pid)
        host = None
        if not spans:
            # bullet hospedado: procura "emenda sobre `pid`"
            hs = [ln for ln,l in enumerate(new) if f'emenda sobre `{pid}`' in l]
            host = owner(hs[0]) if hs else None
            spans = [(i,e) for (p,i,e) in E if p == host] if host else []
            if not spans:
                res.append((n,pid,d['bloco'],'SEM ENTRADA','')); continue
        ok = []; bad = []
        for i,e in spans:
            for ln in range(i,e):
                l = new[ln]
                if host and f'`{pid}`' not in l: continue
                if re.search(r'dono', l, re.I) and tok(d['bloco']).search(l):
                    ok.append(ln+1)
                    for m in re.finditer(r'§4\.1,? item (\d+)', l):
                        if int(m.group(1)) != n: bad.append((ln+1, int(m.group(1))))
        # ultimo "dono" com bloco B- nomeado, na entrada (exceto dentro de "(antes: ...)")
        last = None
        for i,e in spans:
            for ln in range(i,e):
                l = re.sub(r'\(antes: .*', '', new[ln]); l = re.sub(r'Valor anterior, preservado.*', '', l)
                if host and f'`{pid}`' not in new[ln]: continue
                if re.search(r'\bdono\b', l, re.I) and re.search(r'`B-[A-Za-z0-9-]+`', l):
                    last = (ln+1, re.findall(r'`(B-[A-Za-z0-9-]+)`', l))
        st = 'OK' if ok and not bad else ('NUMERO-ERRADO' if bad else 'BLOCO-AUSENTE')
        tail = '' if not last or d['bloco'] in last[1] else f' ULTIMO-DONO-DIFERE l.{last[0]} {last[1]}'
        res.append((n,pid,d['bloco'],st+tail, f'linhas={ok[:4]} host={host} bad={bad}'))
cnt = collections.Counter(r[3].split()[0] for r in res)
print('avaliados:', len(res), dict(cnt))
for r in res:
    if not r[3].startswith('OK') or 'DIFERE' in r[3]: print('  ', r)
print('itens sem nenhum ID com entrada no registro:', [n for n in items if all(x[3] in ('ACHADO-O6R','SEM ENTRADA') for x in res if x[0]==n)])
# ---------- linhas reescritas ----------
print(

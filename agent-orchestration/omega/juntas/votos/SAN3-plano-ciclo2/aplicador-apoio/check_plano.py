# Conferência do PLANO_SAN3.md v5 por script: contagens (§4.1, §5), item↔bloco↔Fecha, ✓ × §8.7, Dep. × agenda,
# e o laço de caminhos entre crases contra `git ls-tree -r --name-only HEAD`.
# Uso (da raiz do worktree): python check_plano.py <agenda-ciclo2.out.json>
import json, re, subprocess, sys, fnmatch
P = 'docs/revisoes/SAN3/PLANO_SAN3.md'
t = open(P, encoding='utf-8').read()
L = t.split('\n')
out = json.load(open(sys.argv[1], encoding='utf-8'))
def cells(row):
    return [c.strip() for c in row.strip().strip('|').split('|')]
def sec(start, end):
    i = next(k for k, l in enumerate(L) if l.startswith(start))
    j = next(k for k in range(i + 1, len(L)) if L[k].startswith(end))
    return L[i:j]
# ---------- §4.1
S41 = sec('### 4.1 ', '### 4.2 ')
items = {}
for l in S41:
    m = re.match(r'^\| (\d+) \|', l)
    if not m: continue
    c = cells(l)
    assert len(c) == 6, ('colunas', m.group(1), len(c))
    n = int(c[0]); assert n not in items, ('duplicado', n)
    items[n] = {'crit': c[2], 'bloco': re.findall(r'`(B-[A-Za-z0-9-]+)`', c[4]), 'reclass': c[5] == '✓'}
print('§4.1: itens =', len(items), '| números 1..54 completos:', sorted(items) == list(range(1, 55)))
print('§4.1: cabeçalho diz:', next(l for l in S41 if l.startswith('### 4.1')))
chk = sorted(n for n, v in items.items() if v['reclass'])
print('§4.1: ✓ =', len(chk), chk)
# §2: lista do critério 13 × tabela; §8.1: "N dos 54" × itens com achado Ω6R na coluna Item
c13 = sorted(n for n, v in items.items() if 13 in [int(x) for x in re.findall(r'\d+', v['crit'])])
m2 = re.search(r'tela inventada \(itens ([^)]*)\)', t)
l2 = set()
for part in re.split(r',\s*|\s+e\s+', m2.group(1)):
    a = re.match(r'(\d+)[–-](\d+)$', part.strip())
    l2 |= set(range(int(a.group(1)), int(a.group(2)) + 1)) if a else {int(part)}
print('§2 critério 13: tabela', c13, '| texto', sorted(l2), '| bate:', set(c13) == l2)
aud = []
for l in S41:
    mm = re.match(r'^\| (\d+) \|', l)
    if mm and re.search(r'Ω6R-(?:SEC|TEN|DIN|DAT|QUA|ARQ|PERF)-\d{3}', [x.strip() for x in l.strip().strip('|').split('|')][1]): aud.append(int(mm.group(1)))
m81 = re.search(r'\*\*(\d+) dos (\d+) bloqueantes\*\* vêm de fora da auditoria', t)
print('§8.1: itens com achado Ω6R =', len(aud), aud, '| texto diz', m81.group(1), 'dos', m81.group(2), '| bate:', int(m81.group(1)) == len(items) - len(aud) and int(m81.group(2)) == len(items))
# ---------- §5
def norm(b):
    b = b.strip('`')
    b = {'B-O6R-04a':'04a','B-O6R-03a':'03a','B-O6R-07c':'07c','B-O6R-11':'11','B-O6R-04b':'04b','B-O6R-03b':'03b','B-AV-REAL':'AV-REAL'}.get(b, b)
    return b[2:] if b.startswith('B-SAN3-') else b
S5 = sec('## 5. Os blocos', '## 6. ')
blocos = {}
for l in S5:
    if not l.startswith('| `B-'): continue
    c = cells(l)
    bid = norm(re.match(r'`(B-[A-Za-z0-9-]+)`', c[0]).group(1))
    assert bid not in blocos, ('bloco duplicado', bid)
    fecha = [int(x) for x in re.findall(r'\d+', c[1])]
    blocos[bid] = {'esf': c[-1], 'fecha': fecha, 'dep': c[-2], 'ncol': len(c)}
cnt = {}
for v in blocos.values(): cnt[v['esf']] = cnt.get(v['esf'], 0) + 1
print('\n§5: blocos =', len(blocos), '| Esf.:', cnt, '| colunas por linha:', sorted({v['ncol'] for v in blocos.values()}))
print('§5 × script: mesmos blocos:', set(blocos) == set(out['ESF']), '| mesmo Esf.:', all(blocos[k]['esf'] == out['ESF'][k] for k in blocos))
# item -> bloco -> Fecha
erros = []
for n, v in items.items():
    for b in v['bloco']:
        nb = norm(b)
        if nb not in blocos: erros.append(f'item {n}: bloco {b} ausente do §5')
        elif n not in blocos[nb]['fecha']: erros.append(f'item {n}: {b} não lista {n} em Fecha')
for k, v in blocos.items():
    for n in v['fecha']:
        if n not in items: erros.append(f'{k}: Fecha {n} não é item')
        elif k not in [norm(b) for b in items[n]['bloco']]: erros.append(f'{k}: Fecha {n}, mas o item {n} aponta {items[n]["bloco"]}')
sem_bloco = [n for n, v in items.items() if not v['bloco']]
print('item↔bloco↔Fecha: erros =', len(erros), erros, '| itens sem bloco:', sem_bloco)
# ✓ × §8.7
m = re.search(r'\*\*As reclassificações `✓` do §4\.1\*\* \(itens ([^)]*)\)', t, re.S)
lst = set()
for part in re.split(r',\s*', ' '.join(m.group(1).split())):
    a = re.match(r'(\d+)[–-](\d+)$', part)
    if a: lst |= set(range(int(a.group(1)), int(a.group(2)) + 1))
    else: lst.add(int(part))
print('✓ do §4.1 == lista do §8.7:', set(chk) == lst, '| só na tabela:', sorted(set(chk) - lst), '| só no §8.7:', sorted(lst - set(chk)))
# Dep. × script
def deps_da_celula(s):
    toks = re.findall(r'`([^`]+)`', s)
    r = set()
    for x in toks:
        x = norm(x)
        if x in out['ESF']: r.add(x)
    return r
dif = []
for k, v in blocos.items():
    if k in ('SAN3-21', 'SAN3-10'): continue
    a = deps_da_celula(v['dep']); b = set(out['DEP'].get(k, []))
    if a != b: dif.append(f'{k}: plano {sorted(a)} × script {sorted(b)}')
print('Dep. do §5 × DEP do script: diferenças =', len(dif), dif)
# ---------- laço de caminhos
tree = subprocess.run(['git', 'ls-tree', '-r', '--name-only', 'HEAD'], capture_output=True, text=True, encoding='utf-8').stdout.split('\n')
tree = [x for x in tree if x]
tset = set(tree)
head = subprocess.run(['git', 'show', 'HEAD:' + P], capture_output=True, text=True, encoding='utf-8').stdout
EXT = r'\.(ts|tsx|dart|md|json|ya?ml|toml|sql|prisma|mjs|js|py|xml|txt|html|spec\.ts)$'
def tokens(txt):
    res = []
    for mm in re.finditer(r'`([^`\n]+)`', txt):
        tok = mm.group(1)
        depois = txt[mm.end():mm.end() + 30]
        res.append((tok, '(novo' in depois or 'novo)' in depois))
    return res
def e_caminho(tok):
    base = re.sub(r':[\d,\- e]+$', '', tok)
    return ('/' in base or re.search(EXT, base)) and not re.search(r'\s', base.strip())
def resolve(tok):
    base = re.sub(r':[\d,\- e]+$', '', tok)
    m = re.match(r'^(.*)\{([^}]*)\}(.*)$', base)
    alts = [m.group(1) + a + m.group(3) for a in m.group(2).split(',')] if m else [base]
    kinds = []
    for a in alts:
        if a in tset: kinds.append('exato'); continue
        if a.endswith('/**') or a.endswith('/'):
            pre = a[:-2] if a.endswith('/**') else a
            kinds.append('dir' if any(x.startswith(pre) for x in tree) else None); continue
        if '*' in a:
            kinds.append('glob' if any(fnmatch.fnmatch(x, a) for x in tree) else None); continue
        if '/' not in a:
            hits = [x for x in tree if x.endswith('/' + a) or x == a]
            kinds.append('basename' if hits else None); continue
        kinds.append(None)
    return None if None in kinds else '+'.join(sorted(set(kinds)))
def classe(tok):
    s = tok.strip()
    if re.match(r'^(GET|POST|PATCH|PUT|DELETE) ', s) or s.startswith('/'): return 'rota HTTP'
    if re.match(r'^(fix|feat|test|chore)/', s): return 'branch'
    return 'caminho'
novos_v5 = {x for x, _ in tokens(t)} - {x for x, _ in tokens(head)}
nao, basen = {}, {}
for tok, marcado in tokens(t):
    if not e_caminho(tok): continue
    cl = classe(tok)
    r = resolve(tok) if cl == 'caminho' else None
    if r is None:
        key = (tok, cl)
        nao.setdefault(key, [False, tok in novos_v5])
        nao[key][0] |= marcado
    elif 'basename' in r:
        basen.setdefault(tok, tok in novos_v5)
print('\n== laço de caminhos: tokens entre crases com forma de caminho que NÃO existem em `git ls-tree HEAD`:')
for (tok, cl), (marcado, novo) in sorted(nao.items(), key=lambda x: (x[0][1], x[0][0])):
    print(f'  [{cl}] {tok}' + ('  — marcado "novo"' if marcado else '') + ('  — ESCRITO NA v5' if novo else '  — já estava na v4'))
print('== tokens que só resolvem por NOME DE ARQUIVO (sem diretório):')
for tok, novo in sorted(basen.items()):
    print(f'  {tok}' + ('  — ESCRITO NA v5' if novo else '  — já estava na v4'))

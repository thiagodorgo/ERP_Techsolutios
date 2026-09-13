import re, sys, difflib, collections
S = sys.argv[1]
O = open(S+'/pend_old.md', encoding='utf-8').read().split('\n')
N = open(S+'/pend_new.md', encoding='utf-8').read().split('\n')
def ents(L):
    H = [(i, re.match(r'## (P-[A-Za-z0-9ΩΔ_-]+)', l).group(1)) for i,l in enumerate(L) if re.match(r'## P-[A-Za-z0-9ΩΔ_-]+', l)]
    AH = [i for i,l in enumerate(L) if l.startswith('## ')] + [len(L)]
    return [(p, i, next(x for x in AH if x > i)) for i,p in H]
EO, EN = ents(O), ents(N)
own = lambda E, ln: next((p for p,i,e in E if i <= ln < e), None)
print('linhas', len(O), '->', len(N))
sm = difflib.SequenceMatcher(None, O, N, autojunk=False)
oc = collections.Counter(op for op,*_ in sm.get_opcodes()); print('opcodes:', dict(oc))
ins = sum(j2-j1 for op,i1,i2,j1,j2 in sm.get_opcodes() if op == 'insert')
print('\n== REESCRITAS (replace/delete) ==')
K = collections.Counter()
for op,i1,i2,j1,j2 in sm.get_opcodes():
    if op not in ('replace','delete'): continue
    nw = N[j1:j2]
    for k,o in enumerate(O[i1:i2]):
        kind, pair = 'OUTRO', None
        for x in nw:
            if o != x and re.sub(r'item \d+', 'item #', o) == re.sub(r'item \d+', 'item #', x): kind, pair = 'PONTEIRO', x; break
        if kind == 'OUTRO':
            ov = re.sub(r'^\s*- \*\*dono:\*\*\s*', '', o).strip()
            for x in nw:
                if x.lstrip().startswith('- **dono:**') and ('(antes: ' + ov) in x: kind, pair = 'DONO-ANTES', x; break
        K[kind] += 1
        tag = own(EO, i1+k)
        if kind == 'PONTEIRO': print(f'  PONTEIRO   l.{i1+k+1} {tag}: {re.findall(r"item (\d+)", o)} -> {re.findall(r"item (\d+)", pair)}')
        elif kind == 'DONO-ANTES': print(f'  DONO-ANTES l.{i1+k+1} {tag}: «{pair[:120]}»')
        else: print(f'  OUTRO      l.{i1+k+1} {tag}: «{o[:200]}»')
    extra = (j2-j1) - (i2-i1)
    if extra > 0: ins += extra
print('classes:', dict(K), '| linhas antigas tocadas:', sum(K.values()), '| linhas so acrescentadas:', ins)
print('\n== EMENDAS DA DECISAO ==')
em = [(ln+1, own(EN, ln)) for ln,l in enumerate(N) if 'emenda (decisão do dono D-SAN3-PLANO-OPCAO-B, 2026-09-13)' in l]
print(len(em), em)
D2 = ['P-WEB-FATURAR-OS-SEM-TELA','P-Ω3a','P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS','P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU','P-WEB-GATE-MODULO-INCOMPLETO','P-O6R-SUBRECURSO-OBJECT-SCOPE','P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO','P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS','P-KPI-ROADMAP-CONGELADO','P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA']
got = [o for _,o in em]
print('§D.2 faltando:', [x for x in D2 if x not in got], '| extras:', [x for x in got if x not in D2])
for ln,p in em:
    e = next(e for q,i,e in EN if q == p); rest = [l for l in N[ln:e] if l.strip()]
    nao = [l[:70] for l in rest if not re.match(r'^- \*\*(emenda|dono \(plano SAN3)', l) and not l.startswith('  ')]
    print(f'  {p}: l.{ln}, fim da entrada l.{e}; depois dela: {len(rest)} linhas nao-vazias; nao-emenda: {nao[:2]}')
print('\n== DONO-EMENDAS (plano SAN3, §4.1 item N — D-SAN3-PLANO-OPCAO-B) ==')
dn = [(ln+1, own(EN, ln), l) for ln,l in enumerate(N) if re.match(r'^- \*\*dono \(plano SAN3, §4\.1 item \d+ — `D-SAN3-PLANO-OPCAO-B`', l)]
print(len(dn))
print('\n== ENTRADA NOVA ==')
for p,i,e in EN:
    if p == 'P-WEB-CONCILIACAO-SEM-TELA':
        print(f'  l.{i+1}..{e}; ja existia em ec4f34a8? {any(q == p for q,_,_ in EO)}')
        for l in N[max(0,i-4):e]: print('  |', l[:330])
print('\n== HEADERS novos x ec4f34a8 ==', sorted(set(p for p,_,_ in EN) - set(p for p,_,_ in EO)), '| removidos:', sorted(set(p for p,_,_ in EO) - set(p for p,_,_ in EN)))

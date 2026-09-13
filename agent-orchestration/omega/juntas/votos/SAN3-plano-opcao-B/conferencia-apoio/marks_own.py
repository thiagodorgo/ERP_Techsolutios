# Verificador PROPRIO das marcas CE no §5: CE-n = bloco nomeado no rotulo da condicao;
# CE-G1 = celula de teste que cita guard/censo; CE-G2 = celula que cita um papel (lista propria, depois leitura humana).
import re, sys
S = sys.argv[1]
L = open(S + '/plano.md', encoding='utf-8').read().split('\n')
i56 = L.index('### 5.6 Condições de entrada — decisão do dono (opção B, 2026-09-13)')
ce_txt = {}; ce_blk = {}
for l in L[i56:i56 + 14]:
    m = re.match(r'^- \*\*(CE-[G0-9]+) — (.*?)\*\*(.*)$', l)
    if m:
        ce_txt[m.group(1)] = m.group(2) + m.group(3)
        ce_blk[m.group(1)] = re.findall(r'`(B-[A-Za-z0-9-]+)`', m.group(2))
print('rotulos das CE -> blocos:', {k: v for k, v in ce_blk.items() if v})
ROLE = re.compile(r'\b(platform_admin|tenant_admin|manager|operator|finance|inventory|field_technician|auditor|support|Financeiro|Estoque|Gestor|Auditor|Operador|operador|persona|técnico|Técnico|admin|Admin)\b')
rows = [l for l in L[:i56] if l.startswith('| `B-')]
print('linhas de bloco no §5:', len(rows))
tot = 0
for l in rows:
    cols = [c.strip() for c in l.strip().strip('|').split('|')]
    b = re.match(r'`(B-[A-Za-z0-9-]+)`', cols[0]).group(1)
    test = cols[4] if len(cols) == 9 else cols[3]
    m = re.search(r' \+ ((?:CE-[G0-9]+(?:, )?)+) \(§5\.6\)$', test)
    marks = m.group(1).split(', ') if m else []
    cell = test[:m.start()] if m else test
    exp_n = sorted(k for k, v in ce_blk.items() if b in v)
    got_n = sorted(x for x in marks if not x.startswith('CE-G'))
    ext = cell + ' ' + ' '.join(ce_txt[k] for k in exp_n)
    g1_cell = bool(re.search(r'guard|censo', cell, re.I)); g1_ext = bool(re.search(r'guard|censo', ext, re.I))
    roles_cell = sorted(set(ROLE.findall(cell))); roles_ext = sorted(set(ROLE.findall(ext)))
    flag = []
    if exp_n != got_n: flag.append(f'CE-n esperado {exp_n} x escrito {got_n}')
    if g1_cell and 'CE-G1' not in marks: flag.append('cita guard/censo na celula e NAO tem CE-G1')
    if roles_cell and 'CE-G2' not in marks: flag.append(f'cita papel {roles_cell} na celula e NAO tem CE-G2')
    if 'CE-G1' in marks and not g1_ext: flag.append('CE-G1 sem guard/censo nem na celula nem na CE-n')
    if 'CE-G2' in marks and not roles_ext: flag.append('CE-G2 sem papel nem na celula nem na CE-n')
    if marks: tot += 1
    if marks or flag:
        print(f'{b:12s} marcas={marks} | G1 celula={g1_cell} G1 c/CE={g1_ext} | papeis celula={roles_cell} papeis c/CE={roles_ext}' + (f'  <<< {flag}' if flag else ''))
print('blocos com marca:', tot)

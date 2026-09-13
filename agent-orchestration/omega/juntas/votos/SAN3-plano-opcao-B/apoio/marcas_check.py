# Recalcula, a partir do PRÓPRIO plano (células de teste do §5 + texto das CE-n do §5.6), as marcas " + … (§5.6)" de
# cada bloco e compara com as marcas escritas. Com --apply, reescreve só as células divergentes.
# Regra (plano de aplicação §B): CE-n = bloco nomeado no rótulo da condição; CE-G1 = célula de teste (com o texto das
# CE-n anexadas) cita "guard"/"censo"; CE-G2 = cita um papel. Vocabulário de papel: os 9 papéis canônicos do
# RBAC_MATRIX.md + rótulos de UI (Financeiro, Estoque, técnico, Gestor, Auditor, Operador) + "persona".
# Correção de 2026-09-13: "técnico" logo depois de "papel " é adjetivo ("nenhum papel técnico cru", B-SAN3-19), não o
# papel de campo — excluído por lookbehind. (O genérico "papel" também fica fora: no B-SAN3-05 é papel de BANCO.)
# Uso (na raiz do worktree): python marcas_check.py [--apply]
import re, sys

P = "docs/revisoes/SAN3/PLANO_SAN3.md"
t = open(P, encoding="utf-8").read()
L = t.split("\n")
s56 = next(i for i, l in enumerate(L) if l.startswith("### 5.6 "))
s6 = next(i for i, l in enumerate(L) if l.startswith("## 6. "))
s5 = next(i for i, l in enumerate(L) if l.startswith("## 5. Os blocos"))
ce_text, ce_of = {}, {}
for l in L[s56:s6]:
    m = re.match(r"^- \*\*(CE-[G0-9]+) ", l)
    if not m:
        continue
    k = m.group(1)
    ce_text[k] = l
    if not k.startswith("CE-G"):
        for b in re.findall(r"`(B-[A-Za-z0-9-]+)`", l.split("(", 1)[0]):
            ce_of.setdefault(b, []).append(k)
G1 = re.compile(r"(?i)\bguard|\bcenso")
G2 = re.compile(r"\b(?:platform_admin|tenant_admin|manager|operator|finance|inventory|field_technician|auditor|support|"
                r"Financeiro|Estoque|Gestor|Auditor|Operador|persona)\b|(?<!papel )\b[Tt]écnico\b")
SUF = re.compile(r" \+ ((?:CE-[G0-9]+)(?:, CE-[G0-9]+)*) \(§5\.6\)$")


def cells(row):
    return [c.strip() for c in row.strip().strip("|").split("|")]


ti = None
div, rows = [], []
for i in range(s5, s56):
    l = L[i]
    if l.startswith("| Bloco · branch |"):
        ti = next(j for j, c in enumerate(cells(l)) if c.startswith("Teste de encerramento"))
        continue
    if not l.startswith("| `B-"):
        continue
    c = cells(l)
    bid = re.match(r"`(B-[A-Za-z0-9-]+)`", c[0]).group(1)
    cell = c[ti]
    m = SUF.search(cell)
    base = cell[:m.start()] if m else cell
    atual = m.group(1).split(", ") if m else []
    ces = ce_of.get(bid, [])
    ctx = base + " " + " ".join(ce_text[k] for k in ces)
    calc = (["CE-G1"] if G1.search(ctx) else []) + (["CE-G2"] if G2.search(ctx) else []) + ces
    rows.append((bid, calc))
    if calc != atual:
        div.append((bid, atual, calc))
        if "--apply" in sys.argv:
            novo = base + ((" + " + ", ".join(calc) + " (§5.6)") if calc else "")
            assert l.count("| " + cell + " |") == 1
            L[i] = l.replace("| " + cell + " |", "| " + novo + " |")
print("CE -> bloco (do §5.6):", ce_of)
print("blocos com marca calculada:", sum(1 for _, c in rows if c), "de", len(rows))
for bid, calc in rows:
    if calc:
        print("  ", bid, calc)
print("divergências marca escrita x calculada:", len(div))
for d in div:
    print("   %s: escrita %s -> calculada %s" % d)
if "--apply" in sys.argv and div:
    open(P, "w", encoding="utf-8", newline="").write("\n".join(L))
    print("reescrito.")

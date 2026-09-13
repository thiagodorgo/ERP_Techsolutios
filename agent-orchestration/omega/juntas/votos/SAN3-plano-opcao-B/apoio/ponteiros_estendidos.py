# Estende o conferir_ponteiros.py a OUTRAS grafias de ponteiro para item do plano (§D.3 do plano de aplicação):
#   (a) qualquer "item N" / "itens N" numa linha que cite "plano SAN3" ou "§4.1";
#   (b) qualquer "item N" numa linha "dono:" de entrada cujo cabeçalho foi escrito por este PR (diff 15ef3fbe..worktree).
# Gera as instâncias das duas fontes (plano §4.1 e registro) — sem lista curada — e marca cada uma:
#   OK      = N é item cujo ID de coluna é o sujeito da linha (a entrada, ou o "emenda sobre `X`");
#   CONFERIR = N não é item do sujeito: pode ser referência legítima a OUTRO item (ex.: "pré-requisito do item 9")
#              ou ponteiro errado — classificação manual, publicada no relatório.
# Os casos já cobertos pelo conferir_ponteiros.py (regex "plano SAN3 ... §4.1 item N") saem marcados [P1].
# Uso (na raiz do worktree): python ponteiros_estendidos.py
import re, subprocess

plano = open("docs/revisoes/SAN3/PLANO_SAN3.md", encoding="utf-8").read().splitlines()
pend = open("agent-orchestration/controle/pendencias.md", encoding="utf-8").read().splitlines()

start = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
end = next(i for i in range(start + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))
item_of, ids_of = {}, {}
for l in plano[start:end]:
    m = re.match(r"^\| (\d+) \| (.*?) \|", l)
    if not m:
        continue
    n = int(m.group(1))
    ids = re.findall(r"`((?:P|Ω6R)-[^`]+)`", m.group(2))
    ids_of[n] = ids
    for id_ in ids:
        item_of.setdefault(id_, set()).add(n)

# linhas acrescentadas por este PR (lado novo do diff contra a base 15ef3fbe)
diff = subprocess.run(["git", "diff", "-U0", "15ef3fbe", "--", "agent-orchestration/controle/pendencias.md"],
                      capture_output=True, text=True, encoding="utf-8").stdout
added = set()
ln = None
for d in diff.splitlines():
    h = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", d)
    if h:
        ln = int(h.group(1)); continue
    if ln is None:
        continue
    if d.startswith("+") and not d.startswith("+++"):
        added.add(ln); ln += 1
    elif d.startswith("-") and not d.startswith("---"):
        pass
    else:
        ln += 1

P1 = re.compile(r"plano SAN3[^§\n]{0,24}§4\.1[, ]*item (\d+)")
ITEM = re.compile(r"\b(?:item|itens) (\d+)(?:\s*[–-]\s*(\d+))?")
cur, cur_line = None, None
hdr_added = set()
rows = []
for i, l in enumerate(pend, 1):
    h = re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", l)
    if h:
        cur, cur_line = h.group(1), i
        if i in added:
            hdr_added.add(cur)
    cita_plano = ("plano SAN3" in l) or ("§4.1" in l)
    linha_dono = bool(re.match(r"^- \*\*dono:\*\*", l)) and cur in hdr_added
    if not (cita_plano or linha_dono):
        continue
    p1_nums = {int(m.group(1)) for m in P1.finditer(l)}
    sub = re.search(r"emenda sobre `([^`]+)`", l)
    subj = sub.group(1) if sub else cur
    for m in ITEM.finditer(l):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        for n in range(a, b + 1):
            ok = n in item_of.get(subj, set())
            ctx = l[max(0, m.start() - 70): m.end() + 40].replace("\r", "")
            rows.append((i, subj, n, "OK" if ok else "CONFERIR", "[P1]" if n in p1_nums else "", "PR" if i in added else "base", ctx))

print("itens do §4.1:", len(ids_of), "| IDs mapeados:", len(item_of), "| linhas do registro acrescentadas pelo PR:", len(added))
print("ocorrências de 'item N' em linha que cita o plano/§4.1 ou em linha de dono de entrada do PR:", len(rows))
for r in rows:
    if r[3] == "CONFERIR":
        print(" l.%d %s -> item %d  %s %s [%s]  …%s…" % r)
print("-- OK (N é item do próprio sujeito):", sum(1 for r in rows if r[3] == "OK"))
for r in rows:
    if r[3] == "OK":
        print(" l.%d %s -> item %d  %s %s [%s]" % r[:6])

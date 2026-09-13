# Confere TODO ponteiro "plano SAN3 ... §4.1 item N" do registro contra o item que o §4.1 do plano atribui ao ID
# da entrada (ou ao ID de "emenda sobre `X`", quando a linha e emenda de outra pendencia). Propriedade, nao amostra:
# gera as instancias a partir das duas fontes, sem lista curada. Uso (na raiz do worktree): python conferir_ponteiros.py
import re

plano = open("docs/revisoes/SAN3/PLANO_SAN3.md", encoding="utf-8").read().splitlines()
pend = open("agent-orchestration/controle/pendencias.md", encoding="utf-8").read().splitlines()

start = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
end = next(i for i in range(start + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))
item_of = {}
for l in plano[start:end]:
    m = re.match(r"^\| (\d+) \| (.*?) \|", l)
    if not m:
        continue
    n = int(m.group(1))
    for id_ in re.findall(r"`((?:P|Ω6R)-[^`]+)`", m.group(2)):
        item_of.setdefault(id_, set()).add(n)

ptr = re.compile(r"plano SAN3[^§\n]{0,24}§4\.1[, ]*item (\d+)")
cur, total, bad = None, 0, []
for i, l in enumerate(pend, 1):
    h = re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", l)
    if h:
        cur = h.group(1)
    for m in ptr.finditer(l):
        total += 1
        n = int(m.group(1))
        sub = re.search(r"emenda sobre `([^`]+)`", l)
        subj = sub.group(1) if sub else cur
        ok = item_of.get(subj)
        if ok is None:
            bad.append((i, subj, n, "ID fora da coluna de IDs do §4.1"))
        elif n not in ok:
            bad.append((i, subj, n, "§4.1 diz " + ",".join(str(x) for x in sorted(ok))))

itens = sorted({x for s in item_of.values() for x in s})
print("itens do §4.1 com ID:", len(itens), "(de", min(itens), "a", max(itens), ") | IDs mapeados:", len(item_of))
print("ponteiros no registro:", total, "| divergentes:", len(bad))
for b in bad:
    print(" l.%d %s -> item %d; %s" % b)

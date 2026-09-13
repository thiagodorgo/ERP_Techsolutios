# Segunda passada, item 6 (D14 + D6) — PELA PROPRIEDADE: para CADA item do §4.1, as entradas do registro nomeadas na
# coluna de IDs dele; confere se o campo `dono:` de cada entrada nomeia o bloco que o §4.1 atribui ao item (e, se o
# campo cita "item N", se N é esse item). Gera as instâncias das duas fontes — nenhuma lista curada.
# Modo relatório (padrão): imprime tudo. Com --apply EXCLUIR=ID1,ID2 : reescreve a linha "- **dono:**" das entradas
# inconsistentes de um item só (menos as excluídas) para
#   - **dono:** `<bloco>` (plano SAN3, §4.1 item N) (antes: <valor antigo>)
# preservando CRLF. Nunca toca linha de status, "Dono nomeado" em parágrafo, nem entrada que hospeda >1 item.
# Uso (na raiz do worktree): python dono_check.py [--apply EXCLUIR=...]
import re, sys

PL = "docs/revisoes/SAN3/PLANO_SAN3.md"
PN = "agent-orchestration/controle/pendencias.md"
plano = open(PL, encoding="utf-8").read().split("\n")
s = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
e = next(i for i in range(s + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))


def cells(r):
    return [c.strip() for c in r.strip().strip("|").split("|")]


items = {}
for l in plano[s:e]:
    if not re.match(r"^\| \d+ \|", l):
        continue
    c = cells(l)
    items[int(c[0])] = {"ids": re.findall(r"`((?:P|Ω6R)-[^`]+)`", c[1]), "blocos": re.findall(r"`(B-[A-Za-z0-9-]+)`", c[4])}
item_of = {}
for n, v in items.items():
    for i in v["ids"]:
        item_of.setdefault(i, set()).add(n)

raw = open(PN, "rb").read()
assert raw.count(b"\r\n") == raw.count(b"\n")
L = raw.decode("utf-8").split("\r\n")
assert L[-1] == ""
L = L[:-1]
H = [(i, re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", l).group(1)) for i, l in enumerate(L) if re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", l)]
allh = [i for i, l in enumerate(L) if l.startswith("## ")]
hdr = {}
for i, id_ in H:
    end = next((k for k in allh if k > i), len(L))
    hdr.setdefault(id_, []).append((i, end))

DONO_LINE = re.compile(r"^- (?:\*\*)?dono(?:\*\*)?:(?:\*\*)?\s*(.*)$", re.I)


def dono_of(a, b):
    """(tipo, índice da linha, texto) do campo dono da entrada L[a:b]."""
    for k in range(a + 1, b):
        m = DONO_LINE.match(L[k])
        if m:
            txt, j = m.group(1), k + 1
            while j < b and L[j].startswith("  ") and not L[j].lstrip().startswith("-"):
                txt += " " + L[j].strip(); j += 1
            return ("linha dono", k, txt, j - k)
    for k in range(a + 1, b):
        if re.search(r"\*\*dono:\*\*", L[k], re.I) or re.search(r"· \*\*dono\*\*:", L[k]):
            txt = L[k].split("dono:**", 1)[-1].strip()
            if not txt and k + 1 < b:
                txt = L[k + 1].strip()
            return ("dono na linha de status" if re.match(r"^- (?:\*\*)?status", L[k]) else "dono em outra linha", k, txt, 1)
    for k in range(a + 1, b):
        if re.search(r"\*\*Dono nomead[oa]:?\s*", L[k]):
            return ("Dono nomeado (parágrafo)", k, L[k].strip(), 1)
    return ("sem campo dono", None, "", 0)


rows, apply_ = [], []
for n in sorted(items):
    v = items[n]
    blocos = v["blocos"]
    for id_ in v["ids"]:
        if id_ not in hdr:
            host = None
            for k, l in enumerate(L):
                if re.match(r"^- (?:\*\*)?" + re.escape(id_) + r"\b", l) or ("**" + id_ + ":**") in l:
                    host = next((h for i, h in reversed(H) if i < k), None)
                    break
            rows.append((n, id_, None, "sem cabeçalho próprio" + (f" (bullet dentro de `{host}`)" if host else ""), "", None, blocos))
            continue
        for (a, b) in hdr[id_]:
            tipo, k, txt, nl = dono_of(a, b)
            nomeia = all(bl in txt for bl in blocos) if blocos else False
            ptrs = [int(x) for x in re.findall(r"\bitem (\d+)", txt)]
            ok = nomeia and (not ptrs or n in ptrs)
            multi = len(item_of.get(id_, ())) > 1
            dup = len(hdr[id_]) > 1
            rows.append((n, id_, a + 1, tipo + (" · ID em >1 item" if multi else "") + (" · cabeçalho duplicado" if dup else ""),
                         txt, ok, blocos, k, nl))

print("itens:", len(items), "| IDs na coluna Item:", sum(len(v["ids"]) for v in items.values()),
      "| entradas com cabeçalho:", sum(1 for r in rows if r[2]))
inc = [r for r in rows if r[5] is False]
print("\n== CONSISTENTES (o dono nomeia o bloco do §4.1):", sum(1 for r in rows if r[5]))
for r in rows:
    if r[5]:
        print(f"  item {r[0]:>2} {r[1]} l.{r[2]} [{r[3]}] bloco {r[6]}")
print("\n== SEM CABEÇALHO / ACHADO Ω6R (fora do alcance do campo dono):")
for r in rows:
    if r[5] is None:
        print(f"  item {r[0]:>2} {r[1]} — {r[3]}")
print("\n== INCONSISTENTES:", len(inc))
for r in inc:
    print(f"  item {r[0]:>2} {r[1]} cab. l.{r[2]} [{r[3]}] bloco do §4.1 {r[6]} | campo (l.{(r[7] or -1) + 1}): {r[4][:230]}")

if "--apply" in sys.argv:
    excl = set()
    for a in sys.argv:
        if a.startswith("EXCLUIR="):
            excl = {x for x in a.split("=", 1)[1].split(",") if x}
    done = []
    for r in sorted(inc, key=lambda r: -(r[7] or 0)):
        n, id_, _, tipo, txt, ok, blocos, k, nl = r
        if id_ in excl or not tipo.startswith("linha dono") or "·" in tipo or len(blocos) != 1:
            continue
        old = txt.rstrip()
        L[k:k + nl] = [f"- **dono:** `{blocos[0]}` (plano SAN3, §4.1 item {n}) (antes: {old})"]
        done.append((k + 1, id_, old, blocos[0], n, nl))
    open(PN, "wb").write(("\r\n".join(L) + "\r\n").encode("utf-8"))
    print("\n== REESCRITAS:", len(done))
    for d in sorted(done):
        print("  l.%d %s: \"%s\" -> `%s` (plano SAN3, §4.1 item %d) [linhas substituídas: %d]" % d)

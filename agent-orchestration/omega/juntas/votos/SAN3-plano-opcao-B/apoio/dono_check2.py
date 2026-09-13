# Terceira passada (N2) — dono_check estendido. PELA PROPRIEDADE: para cada item do §4.1, as entradas do registro
# nomeadas na coluna de IDs; o "dono vigente" de cada entrada, na ordem:
#   1. a emenda de dono da opção B:  - **dono (plano SAN3, §4.1 item N — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13):** …
#      (numa hospedeira, com ", emenda sobre `ID`" — a convenção que o registro já usa para bullet hospedado, e que o
#       conferir_ponteiros.py lê para saber de quem é o ponteiro);
#   2. a linha "- **dono:**";
#   3. o dono dentro da 1ª linha de status — só o trecho ANTES de "Valor anterior, preservado" (o valor antigo
#      preservado não é o campo vigente); aceita "**dono:** X" e "dono `B-…`"/"dono B-…";
#   4. outra linha com "**dono:**"; 5. "Dono nomeado" em parágrafo; 6. nenhum.
# Consistente = o dono vigente nomeia o bloco do §4.1 e, se cita "item N", N é o item.
# --emendar: acrescenta a emenda 1 no fim de cada entrada inconsistente e, para ID sem cabeçalho próprio (bullet numa
# hospedeira), na hospedeira. Só-apensar: nenhuma linha existente muda. CRLF preservado. Aborta se já houver emenda 1.
# Uso (na raiz do worktree): python dono_check2.py [--emendar]
import re, sys

PL, PN = "docs/revisoes/SAN3/PLANO_SAN3.md", "agent-orchestration/controle/pendencias.md"
plano = open(PL, encoding="utf-8").read().split("\n")
s = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
e = next(i for i in range(s + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))


def cells(r):
    return [c.strip() for c in r.strip().strip("|").split("|")]


items = {}
for l in plano[s:e]:
    if re.match(r"^\| \d+ \|", l):
        c = cells(l)
        items[int(c[0])] = {"ids": re.findall(r"`((?:P|Ω6R)-[^`]+)`", c[1]), "blocos": re.findall(r"`(B-[A-Za-z0-9-]+)`", c[4])}
todos_blocos = set(re.findall(r"^\| `(B-[A-Za-z0-9-]+)` · ", "\n".join(plano), re.M))

raw = open(PN, "rb").read()
assert raw.count(b"\r\n") == raw.count(b"\n")
L = raw.decode("utf-8").split("\r\n")
assert L[-1] == ""
L = L[:-1]
HRE = re.compile(r"^## ((?:P|Ω6R)-[^\s(]+)")
H = [(i, HRE.match(l).group(1)) for i, l in enumerate(L) if HRE.match(l)]
allh = [i for i, l in enumerate(L) if l.startswith("## ")]
hdr = {}
for i, id_ in H:
    hdr.setdefault(id_, []).append((i, next((k for k in allh if k > i), len(L))))
EMD = re.compile(r"^- \*\*dono \(plano SAN3, §4\.1 item (\d+) — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13\)(?:, emenda sobre `([^`]+)`)?:\*\* (.*)$")
DONO_LINE = re.compile(r"^- (?:\*\*)?dono(?:\*\*)?:(?:\*\*)?\s*(.*)$", re.I)
if "--emendar" in sys.argv:
    assert not any(EMD.match(l) for l in L), "já há emenda de dono da opção B: não reaplico"


def dono_of(a, b, sobre=None):
    for k in range(a + 1, b):
        m = EMD.match(L[k])
        if m and (m.group(2) or None) == sobre:
            return ("emenda de dono (opção B)", k, m.group(3) + f" [item {m.group(1)}]")
    if sobre:
        return ("sem emenda de dono para o bullet", None, "")
    for k in range(a + 1, b):
        m = DONO_LINE.match(L[k])
        if m:
            return ("linha dono", k, m.group(1))
    for k in range(a + 1, b):
        if re.match(r"^- (?:\*\*)?status", L[k]) and re.search(r"(?i)\bdono\b", L[k]):
            vig = L[k].split("Valor anterior, preservado", 1)[0]
            m = re.search(r"\*\*dono:\*\*\s*(.*)", vig) or re.search(r"\bdono (`?B-[A-Za-z0-9-]+`?[^)·]*)", vig)
            if m:
                return ("dono na linha de status (trecho vigente)", k, m.group(1))
    for k in range(a + 1, b):
        if "**dono:**" in L[k]:
            return ("dono em outra linha", k, L[k].split("**dono:**", 1)[1].strip() or (L[k + 1].strip() if k + 1 < b else ""))
    for k in range(a + 1, b):
        if re.search(r"\*\*Dono nomead[oa]", L[k]):
            return ("Dono nomeado (parágrafo)", k, L[k].strip())
    return ("sem campo dono", None, "")


def consistente(txt, n, blocos):
    ptrs = [int(x) for x in re.findall(r"\bitem (\d+)", txt)]
    return bool(blocos) and all(b in txt for b in blocos) and (not ptrs or n in ptrs)


rows, fora = [], []
for n in sorted(items):
    blocos = items[n]["blocos"]
    for id_ in items[n]["ids"]:
        if id_ in hdr:
            for (a, b) in hdr[id_]:
                tipo, k, txt = dono_of(a, b)
                rows.append(dict(n=n, id=id_, a=a, b=b, host=None, tipo=tipo, k=k, txt=txt, bl=blocos,
                                 ok=consistente(txt, n, blocos)))
            continue
        host = None
        for k, l in enumerate(L):
            if re.match(r"^- (?:\*\*)?" + re.escape(id_) + r"\b", l) or ("**" + id_ + ":**") in l:
                host = next(((i, h) for i, h in reversed(H) if i < k), None)
                break
        if host is None:
            fora.append((n, id_, "sem entrada no registro (achado Ω6R: vive em `docs/revisoes/O6R/achados.jsonl`)"
                         if id_.startswith("Ω6R-") else "sem cabeçalho e sem hospedeira achada"))
            continue
        a, h = host
        b = next((k for k in allh if k > a), len(L))
        tipo, k, txt = dono_of(a, b, sobre=id_)
        rows.append(dict(n=n, id=id_, a=a, b=b, host=h, tipo=tipo, k=k, txt=txt, bl=blocos, ok=consistente(txt, n, blocos)))

ins = []
if "--emendar" in sys.argv:
    for r in rows:
        if r["ok"] or len(r["bl"]) != 1:
            continue
        bl, n = r["bl"][0], r["n"]
        ent = "\n".join(L[r["a"]:r["b"]])
        antigos = sorted({x for x in re.findall(r"`(B-[A-Za-z0-9-]+)`", ent) if bl.startswith(x) and x != bl})
        nota = ""
        for x in antigos:
            filhos = sorted(y[len("B-O6R-"):] if y.startswith("B-O6R-") else y for y in todos_blocos if y.startswith(x) and y != x)
            nota += f" (a entrada nomeia `{x}`, nome anterior à divisão em " + "/".join(f"`{f}`" for f in filhos) + ")"
        if r["host"]:
            linha = (f"- **dono (plano SAN3, §4.1 item {n} — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13), emenda sobre `{r['id']}`:** "
                     f"o bullet `{r['id']}` (item {n}) tem dono `{bl}`.")
        else:
            linha = f"- **dono (plano SAN3, §4.1 item {n} — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13):** `{bl}`{nota}."
        k = r["b"] - 1
        while k > r["a"] and L[k].strip() in ("", "---"):
            k -= 1
        blk = [linha] if (L[k].startswith("- ") or L[k].startswith("  ")) else ["", linha]
        ins.append((k + 1, r["id"], r["host"], blk))
    for pos, _, _, blk in sorted(ins, key=lambda x: -x[0]):
        L[pos:pos] = blk
    open(PN, "wb").write(("\r\n".join(L) + "\r\n").encode("utf-8"))
    print("emendas de dono acrescentadas:", len(ins), "| em hospedeira:", sum(1 for x in ins if x[2]))
    for pos, id_, host, blk in sorted(ins):
        print(f"   após l.{pos} (orig.) {id_}" + (f" [na hospedeira {host}]" if host else "") + f": {blk[-1][:150]}")
else:
    print("itens:", len(items), "| IDs na coluna Item:", sum(len(v["ids"]) for v in items.values()),
          "| entradas/bullets do registro avaliados:", len(rows), "| fora do alcance:", len(fora))
    ok = [r for r in rows if r["ok"]]
    print("\n== CONSISTENTES:", len(ok))
    for r in ok:
        print(f"  item {r['n']:>2} {r['id']}" + (f" (bullet em {r['host']})" if r["host"] else "") + f" [{r['tipo']}] {r['bl']}")
    print("\n== INCONSISTENTES:", len(rows) - len(ok))
    for r in rows:
        if not r["ok"]:
            print(f"  item {r['n']:>2} {r['id']}" + (f" (bullet em {r['host']})" if r["host"] else "") +
                  f" [{r['tipo']}] bloco {r['bl']} | {r['txt'][:160]}")
    print("\n== FORA DO ALCANCE DO CAMPO DONO:", len(fora))
    for f in fora:
        print(f"  item {f[0]:>2} {f[1]} — {f[2]}")

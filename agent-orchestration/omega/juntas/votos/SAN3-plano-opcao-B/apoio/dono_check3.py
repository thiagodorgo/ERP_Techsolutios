# Quarta passada (CONF-01 / CONF-02, com a emenda do planejador: a regra do SUJEITO).
# SUJEITO de um item = entrada cujo CABEÇALHO traz um ID da coluna Item (P-* ou achado Ω6R-*, forma longa ou curta);
# na falta de cabeçalho, a hospedeira com bullet "- **`ID" ou "emenda sobre `ID`". Entradas que só CITAM o ID no corpo
# (catálogos) NÃO contam. (Mesma detecção de sujeito da ferramenta do orquestrador, conferir_donos_pela_fonte.py.)
# Diferença deliberada, para as duas ferramentas não serem a mesma: aqui "nomeia o bloco" = o DONO VIGENTE do sujeito
# para aquele item nomeia o bloco (e, se cita item, o N) — a ferramenta do orquestrador aceita o bloco em qualquer
# ponto do texto. Dono vigente (em ordem): emenda de dono desta aplicação ("- **dono (plano SAN3, …):**" antigo ou
# "- **dono:** `B-…` (plano SAN3, §4.1 item N — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13)…" novo), casada por
# "emenda sobre `ID`" quando o sujeito é hospedeira do ID; linha "- **dono:**" sem "emenda sobre"; 1ª linha de status
# (trecho antes de "Valor anterior, preservado"); outra "**dono:**"; "**Dono:**"/"Dono nomeado".
# Estado do item: OK (todo sujeito nomeia) · PARCIAL (algum) · FALHA (nenhum).
#
# --aplicar (na mesma leitura; CRLF; aborta se o formato novo já existe):
#   F2 — toda emenda de dono no formato antigo passa ao que o gerador lê (`**dono:**`), sem perder texto;
#   F1 — para cada achado Ω6R da coluna Item e cada hospedeira cujo CABEÇALHO o traz: se o texto dela (antes do F1) não
#        nomeia o bloco do §4.1, uma emenda por achado no fim da hospedeira (regra do texto, a do critério de fim).
# Uso (na raiz do worktree): python dono_check3.py [--aplicar] [--json <arquivo>]
import re, sys, json

PL, PN = "docs/revisoes/SAN3/PLANO_SAN3.md", "agent-orchestration/controle/pendencias.md"
plano = open(PL, encoding="utf-8").read().split("\n")
s = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
e = next(i for i in range(s + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))
items = {}
for l in plano[s:e]:
    if re.match(r"^\| \d+ \|", l):
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        items[int(c[0])] = {"ids": re.findall(r"`((?:P|Ω6R)-[^`]+)`", c[1]), "blocos": re.findall(r"`(B-[A-Za-z0-9-]+)`", c[4])}

raw = open(PN, "rb").read()
assert raw.count(b"\r\n") == raw.count(b"\n")
L = raw.decode("utf-8").split("\r\n")
assert L[-1] == ""
L = L[:-1]
TAG = "`D-SAN3-PLANO-OPCAO-B`, 2026-09-13"
EMD_OLD = re.compile(r"^- \*\*dono \(plano SAN3, §4\.1 item (\d+) — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13\)(?:, emenda sobre `([^`]+)`)?:\*\* (.*)$")
EMD_NEW = re.compile(r"^- \*\*dono:\*\* `(B-[A-Za-z0-9-]+)` \(plano SAN3, §4\.1 item (\d+) — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13\)(?:, emenda sobre `([^`]+)`)?(.*)$")
DONO_LINE = re.compile(r"^- (?:\*\*)?dono(?:\*\*)?:(?:\*\*)?\s*(.*)$", re.I)
formas = lambda i: [i, i[len("Ω6R-"):]] if i.startswith("Ω6R-") else [i]
tem = lambda t, f: bool(re.search(r"(?<![A-Za-z0-9-])" + re.escape(f) + r"(?![A-Za-z0-9])", t))


def entradas():
    allh = [i for i, l in enumerate(L) if l.startswith("## ")]
    return [(a, (allh[j + 1] if j + 1 < len(allh) else len(L))) for j, a in enumerate(allh)]


def emd(l):
    m = EMD_NEW.match(l)
    if m:
        return {"bloco": m.group(1), "item": int(m.group(2)), "sobre": m.group(3), "fmt": "novo"}
    m = EMD_OLD.match(l)
    if m:
        b = re.search(r"`(B-[A-Za-z0-9-]+)`", m.group(3))
        return {"bloco": b.group(1) if b else "", "item": int(m.group(1)), "sobre": m.group(2), "fmt": "antigo"}
    return None


def dono_of(a, b, sobre=None):
    for k in range(a + 1, b):
        d = emd(L[k])
        if d and d["sobre"] == sobre:
            return ("emenda de dono (" + d["fmt"] + ")", k, f"`{d['bloco']}` [item {d['item']}]", d["item"])
    if sobre:
        return None
    for k in range(a + 1, b):
        m = DONO_LINE.match(L[k])
        if m and "emenda sobre `" not in L[k]:
            return ("linha dono", k, m.group(1), None)
    for k in range(a + 1, b):
        if re.match(r"^- (?:\*\*)?status", L[k]) and re.search(r"(?i)\bdono\b", L[k]):
            vig = L[k].split("Valor anterior, preservado", 1)[0]
            m = re.search(r"\*\*dono:\*\*\s*(.*)", vig) or re.search(r"\bdono (`?B-[A-Za-z0-9-]+`?[^)·]*)", vig)
            if m:
                return ("dono na linha de status (trecho vigente)", k, m.group(1), None)
    for k in range(a + 1, b):
        if "**dono:**" in L[k] and "emenda sobre `" not in L[k]:
            return ("dono em outra linha", k, L[k].split("**dono:**", 1)[1].strip() or (L[k + 1].strip() if k + 1 < b else ""), None)
    for k in range(a + 1, b):
        m = re.search(r"\*\*Dono:?\*\*\s*([^·]*)|\*\*Dono nomead[oa]:?\s*([^*]*)", L[k])
        if m:
            return ("Dono (formato O6R)", k, (m.group(1) or m.group(2) or "").strip(), None)
    return ("sem campo dono", None, "", None)


def ok_dono(txt, ptr, n, bl):
    if not bl or not all(x in txt for x in bl):
        return False
    ptrs = [ptr] if ptr else [int(x) for x in re.findall(r"\bitem (\d+)", txt)]
    return not ptrs or n in ptrs


def sujeitos(n):
    ids, E = items[n]["ids"], entradas()
    out = [(a, b, "cabeçalho") for (a, b) in E if any(tem(L[a], f) for i in ids for f in formas(i))]
    if not out:
        for (a, b) in E:
            if any(re.search(r"^- \*\*`?" + re.escape(f) + r"`?|emenda sobre `" + re.escape(f) + r"`", L[k])
                   for k in range(a + 1, b) for i in ids for f in formas(i)):
                out.append((a, b, "hospedeira"))
    return out


def avalia(n):
    ids, bl, res = items[n]["ids"], items[n]["blocos"], []
    for (a, b, via) in sujeitos(n):
        hid = re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", L[a])
        hid = hid.group(1) if hid else L[a][3:40]
        d = None
        if hid not in ids:                       # hospedeira de um ID do item: vale a emenda "sobre" aquele ID
            for i in ids:
                d = dono_of(a, b, sobre=i)
                if d:
                    break
        if d is None:
            d = dono_of(a, b)
        tipo, k, txt, ptr = d
        res.append({"entrada": hid, "via": via, "tipo": tipo, "txt": txt, "ok": ok_dono(txt, ptr, n, bl)})
    est = "OK" if res and all(r["ok"] for r in res) else ("PARCIAL" if any(r["ok"] for r in res) else "FALHA")
    return est, res


if "--aplicar" in sys.argv:
    assert not any(EMD_NEW.match(l) for l in L), "o formato novo já existe: não reaplico"
    f2 = []
    for k, l in enumerate(L):
        m = EMD_OLD.match(l)
        if not m:
            continue
        n, sobre, rest = int(m.group(1)), m.group(2), m.group(3)
        if sobre:
            bl = re.search(r"tem dono `(B-[A-Za-z0-9-]+)`", rest).group(1)
            new = f"- **dono:** `{bl}` (plano SAN3, §4.1 item {n} — {TAG}), emenda sobre `{sobre}`: {rest}"
        else:
            mb = re.match(r"^(`B-[A-Za-z0-9-]+`)(.*)$", rest)
            assert mb, rest
            new = f"- **dono:** {mb.group(1)} (plano SAN3, §4.1 item {n} — {TAG}){mb.group(2)}"
        f2.append((k + 1, l, new))
        L[k] = new
    print("F2 — emendas de dono reescritas para o formato do gerador:", len(f2))
    add = {}
    for n in sorted(items):
        bl = items[n]["blocos"]
        for a_ in [x for x in items[n]["ids"] if x.startswith("Ω6R-")]:
            for (a, b) in entradas():
                if not any(tem(L[a], f) for f in formas(a_)):
                    continue
                texto = "\n".join(L[a:b])
                if len(bl) == 1 and tem(texto, bl[0]):
                    continue
                assert len(bl) == 1, (n, bl)
                h = re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", L[a]).group(1)
                txt = (f"- **dono:** `{bl[0]}` (plano SAN3, §4.1 item {n} — {TAG}), emenda sobre `{a_}`: o achado `{a_}` "
                       f"(item {n}) tem dono `{bl[0]}`.")
                mdono = re.search(r"\*\*Dono:\*\*\s*([^·*]+)", texto)
                partes = []
                if mdono and bl[0] not in mdono.group(1):
                    partes.append('o "Dono: ' + " ".join(mdono.group(1).split()[:2]) + '…"')
                if "sem bloco até hoje" in L[a]:
                    partes.append('o "sem bloco até hoje" do cabeçalho')
                if partes:
                    txt += f" O dono deste achado passa a ser `{bl[0]}` (item {n}); " + " e ".join(partes) + " ficam como histórico."
                add.setdefault((a, b, h), []).append((n, txt))
    for (a, b, h) in sorted(add, key=lambda x: -x[0]):
        k = b - 1
        while k > a and L[k].strip() in ("", "---"):
            k -= 1
        linhas = [t for _, t in sorted(add[(a, b, h)])]
        blk = linhas if (L[k].startswith("- ") or L[k].startswith("  ")) else [""] + linhas
        L[k + 1:k + 1] = blk
    open(PN, "wb").write(("\r\n".join(L) + "\r\n").encode("utf-8"))
    print("F1 — emendas de dono por achado:", sum(len(v) for v in add.values()), "em", len(add), "hospedeiras")
    for (a, b, h), v in sorted(add.items()):
        for n, t in sorted(v):
            print(f"   {h} (cab. l.{a + 1}) item {n}: {t}")
    print("F2 — detalhe (linha, antes → depois):")
    for ln, o, nw in f2:
        print(f"   l.{ln}: {o[:90]}…  =>  {nw[:90]}…")
else:
    tab = {n: avalia(n) for n in sorted(items)}
    nok = [n for n, (est, _) in tab.items() if est != "OK"]
    print(f"itens do gate: {len(tab)} | OK (todo sujeito com o bloco como DONO vigente): {len(tab) - len(nok)} | não OK: {len(nok)}")
    for n, (est, res) in tab.items():
        if est != "OK" or any(r["via"] != "cabeçalho" or r["entrada"] not in items[n]["ids"] for r in res):
            print(f"  item {n:>2} {est:<7} {items[n]['blocos']}")
            for r in res:
                print(f"     {'✓' if r['ok'] else '·'} {r['entrada']} ({r['via']}) [{r['tipo']}] {r['txt'][:100]}")
    print("não OK:", nok)
    # avisos, no sentido desta ferramenta: sujeito com dono vigente que NÃO nomeia o bloco (o dono afirmado é outro)
    avisos = [(n, r["entrada"], r["txt"]) for n, (est, res) in tab.items() for r in res if not r["ok"] and r["tipo"] != "sem campo dono"]
    print("avisos (sujeito com dono vigente que não nomeia o bloco):", len(avisos))
    for a_ in avisos:
        print("   aviso item %d: %s — %s" % (a_[0], a_[1], a_[2][:100]))
    import subprocess
    orq_out = subprocess.run(["python", r"C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/conferir_donos_pela_fonte.py"],
                             capture_output=True, text=True, encoding="utf-8").stdout
    orq = {int(m.group(1)) for m in re.finditer(r"^item\s+(\d+) (?:FALHA|PARCIAL)", orq_out, re.M)}
    mo = re.search(r"não OK \(FALHA ou PARCIAL\): (\d+) \| avisos de dono divergente: (\d+)", orq_out)
    diverg = sorted(set(nok) ^ orq)
    print(f"orquestrador: não OK {mo.group(1)}, avisos {mo.group(2)} | concordância item a item: "
          f"{len(items) - len(diverg)}/{len(items)} | divergem: {diverg}")
    if "--json" in sys.argv:
        json.dump({str(n): {"blocos": items[n]["blocos"], "estado": est, "entradas": [r["entrada"] for r in res]}
                   for n, (est, res) in tab.items()}, open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

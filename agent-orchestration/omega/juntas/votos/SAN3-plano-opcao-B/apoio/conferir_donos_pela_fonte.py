# Confere, pela FONTE, a propriedade "todo item do gate tem o bloco do §4.1 nomeado nas entradas do registro que o têm
# como SUJEITO". Sujeito = o ID (pendência P-* ou achado Ω6R-*, forma longa ou curta) está no CABEÇALHO da entrada; na
# falta de cabeçalho, um bullet ou emenda "sobre" o ID dentro de uma hospedeira. Entradas que só CITAM o ID no corpo
# (catálogos como a P-O6R-BACKLOG, que lista os 29 achados com bloco ao lado) não contam — contá-las faz a verificação
# passar por construção (calibração de 2026-09-13: a versão anterior deixava passar o item 24).
# Também avisa quando uma entrada-sujeito afirma um dono ("Dono:"/"dono:") sem nomear o bloco e sem emenda que o nomeie.
# Ferramenta do orquestrador, independente da do aplicador. Uso (na raiz do worktree): python conferir_donos_pela_fonte.py
import re

plano = open("docs/revisoes/SAN3/PLANO_SAN3.md", encoding="utf-8").read().splitlines()
pend = open("agent-orchestration/controle/pendencias.md", encoding="utf-8").read().splitlines()

start = next(i for i, l in enumerate(plano) if l.startswith("### 4.1"))
end = next(i for i in range(start + 1, len(plano)) if plano[i].startswith("### ") or plano[i].startswith("## "))
itens = []
for l in plano[start:end]:
    if not re.match(r"^\| \d+ \|", l):
        continue
    cols = [c.strip() for c in l.split("|")]
    ids = re.findall(r"`((?:P|Ω6R)-[^`]+)`", cols[2])
    blocos = sorted(set(re.findall(r"B-(?:O6R|SAN3|AV)-[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*", cols[5])))
    itens.append((int(cols[1]), ids, blocos))

entradas, cur, buf = [], None, []
for l in pend:
    if l.startswith("## "):
        if cur is not None:
            entradas.append((cur, buf))
        cur, buf = l, []
    elif cur is not None:
        buf.append(l)
if cur is not None:
    entradas.append((cur, buf))


def formas(id_):
    return [id_, id_[len("Ω6R-"):]] if id_.startswith("Ω6R-") else [id_]


def tem(texto, forma):
    return bool(re.search(r"(?<![A-Za-z0-9-])" + re.escape(forma) + r"(?![A-Za-z0-9])", texto))


def nomeia(texto, bloco):
    return bool(re.search(r"(?<![A-Za-z0-9-])" + re.escape(bloco) + r"(?![A-Za-z0-9])", texto))


falhas, avisos = 0, 0
for n, ids, blocos in itens:
    sujeitos = []
    for h, corpo in entradas:
        if any(tem(h, f) for i in ids for f in formas(i)):
            sujeitos.append((h, corpo, "cabeçalho"))
    if not sujeitos:
        for h, corpo in entradas:
            for l in corpo:
                if any(re.search(r"^- \*\*`?" + re.escape(f) + r"`?|emenda sobre `" + re.escape(f) + r"`", l) for i in ids for f in formas(i)):
                    sujeitos.append((h, corpo, "hospedeira"))
                    break
    nomeiam = [h for h, corpo, _ in sujeitos if any(nomeia(h + "\n" + "\n".join(corpo), b) for b in blocos)]
    estado = "OK" if nomeiam and len(nomeiam) == len(sujeitos) else ("PARCIAL" if nomeiam else "FALHA")
    if estado != "OK":
        falhas += 1
    for h, corpo, _ in sujeitos:
        texto = "\n".join(corpo)
        for l in corpo:
            if re.search(r"\*\*Dono:?\*\*|\*\*dono:\*\*|^- dono:", l) and not any(nomeia(l, b) for b in blocos) and not any(nomeia(texto, b) for b in blocos):
                avisos += 1
                print("  AVISO item %d: %s afirma dono sem o bloco %s: %s" % (n, h[:60], blocos, l.strip()[:120]))
                break
    if estado != "OK":
        print("item %2d %-7s ids=%s blocos=%s sujeitos=%d nomeiam=%d" % (n, estado, ids, blocos, len(sujeitos), len(nomeiam)))
        for h, _, via in sujeitos:
            print("      %s (%s)" % (h[:110], via))
print("itens do gate:", len(itens), "| não OK (FALHA ou PARCIAL):", falhas, "| avisos de dono divergente:", avisos)

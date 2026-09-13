# Para a conferência: linhas do pendencias.md REESCRITAS (não acrescentadas) em relação ao HEAD ec4f34a8, geradas do
# `git diff -U0`. Em cada hunk, cada linha removida é pareada com a linha acrescentada mais parecida do mesmo hunk
# (difflib) e classificada:
#   ponteiro  — a nova é a antiga com só o número do "item N" trocado;
#   dono      — a nova é "- **dono:** `B-…` (plano SAN3, §4.1 item N) (antes: <valor antigo>)", com o valor antigo inteiro;
#   OUTRO     — qualquer outra coisa (não deveria existir).
# ID = cabeçalho da entrada da linha antiga no blob do HEAD. Uso (na raiz do worktree): python reescritas.py
import re, subprocess, difflib
BASE, P = "ec4f34a8", "agent-orchestration/controle/pendencias.md"
old = subprocess.run(["git", "show", f"{BASE}:{P}"], capture_output=True, text=True, encoding="utf-8").stdout.split("\n")
d = subprocess.run(["git", "diff", "-U0", BASE, "--", P], capture_output=True, text=True, encoding="utf-8").stdout
hunks, cur = [], None
for l in d.splitlines():
    m = re.match(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", l)
    if m:
        cur = {"o": int(m.group(1)), "n": int(m.group(3)), "rem": [], "add": []}
        hunks.append(cur); continue
    if cur is None or l.startswith("---") or l.startswith("+++"):
        continue
    if l.startswith("-"):
        cur["rem"].append((cur["o"] + len(cur["rem"]), l[1:]))
    elif l.startswith("+"):
        cur["add"].append((cur["n"] + len(cur["add"]), l[1:]))


def id_at(no):
    for k in range(no - 1, -1, -1):
        m = re.match(r"^## ((?:P|Ω6R)-[^\s(]+)", old[k])
        if m:
            return m.group(1)
    return "?"


tot_add = sum(len(h["add"]) for h in hunks)
rows = []
for h in hunks:
    livres = list(h["add"])
    for (ono, otxt) in h["rem"]:
        best = max(livres, key=lambda a: difflib.SequenceMatcher(None, otxt, a[1]).ratio()) if livres else None
        if best is None:
            rows.append((ono, None, id_at(ono), "SEM PAR (apagada!)", otxt[:80])); continue
        livres.remove(best)
        nno, ntxt = best
        if re.sub(r"\bitem \d+", "item #", otxt) == re.sub(r"\bitem \d+", "item #", ntxt) and otxt != ntxt:
            a = re.findall(r"\bitem (\d+)", otxt); b = re.findall(r"\bitem (\d+)", ntxt)
            dif = [f"{x} → {y}" for x, y in zip(a, b) if x != y]
            rows.append((ono, nno, id_at(ono), "ponteiro", ", ".join(dif)))
        else:
            m = re.match(r"^- \*\*dono:\*\* (`B-[A-Za-z0-9-]+` \(plano SAN3, §4\.1 item \d+\)) \(antes: (.*)\)$", ntxt)
            ov = re.match(r"^- \*\*dono:\*\* (.*)$", otxt)
            if m and ov and m.group(2) == ov.group(1).rstrip():
                rows.append((ono, nno, id_at(ono), "dono (antes: …)", f"{m.group(1)}; valor antigo preservado inteiro"))
            else:
                rows.append((ono, nno, id_at(ono), "OUTRO", f"{otxt[:60]} → {ntxt[:60]}"))
print(f"hunks: {len(hunks)} | linhas removidas (reescritas): {sum(len(h['rem']) for h in hunks)} | linhas acrescentadas: {tot_add}")
from collections import Counter
print("por classe:", dict(Counter(r[3] for r in rows)))
print("| linha no HEAD → linha agora | ID | classe | o que mudou |")
print("|---|---|---|---|")
for r in rows:
    print(f"| {r[0]} → {r[1]} | `{r[2]}` | {r[3]} | {r[4]} |")

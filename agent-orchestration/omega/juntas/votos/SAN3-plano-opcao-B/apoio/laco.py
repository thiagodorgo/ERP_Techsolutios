# Laço de caminhos do §F: todo token entre crases com forma de caminho, em LINHA ACRESCENTADA por esta aplicação
# (git diff -U0 HEAD, arquivos do §A escritos à mão — o índice e o app.js são gerados), resolvido contra
# `git ls-tree -r --name-only HEAD` (exato, diretório, glob, {a,b}) e, se não estiver no HEAD, contra o disco.
# Uso (na raiz do worktree): python laco.py
import re, subprocess, os, fnmatch
FILES = ["docs/revisoes/SAN3/PLANO_SAN3.md", "agent-orchestration/controle/pendencias.md", "Kpis/kpis-latest.json",
         "agent-orchestration/docs/status-geral.md", "agent-orchestration/codex/log-execucao.md"]
tree = [x for x in subprocess.run(["git", "ls-tree", "-r", "--name-only", "HEAD"], capture_output=True, text=True,
                                  encoding="utf-8").stdout.split("\n") if x]
tset = set(tree)
EXT = r"\.(ts|tsx|dart|md|json|ya?ml|toml|sql|prisma|mjs|js|py|xml|txt|html)$"


def base_of(tok):
    return re.sub(r":[\d,\- e]+$", "", tok.strip())


def is_path(tok):
    b = base_of(tok)
    return ("/" in b or re.search(EXT, b)) and not re.search(r"\s", b)


def kind(tok):
    s = tok.strip()
    if re.match(r"^(GET|POST|PATCH|PUT|DELETE) ", s) or s.startswith("/"):
        return "rota"
    if re.match(r"^(fix|feat|test|chore)/", s):
        return "branch"
    return "caminho"


def resolve(tok):
    b = base_of(tok)
    m = re.match(r"^(.*)\{([^}]*)\}(.*)$", b)
    alts = [m.group(1) + a + m.group(3) for a in m.group(2).split(",")] if m else [b]
    res = []
    for a in alts:
        if a in tset:
            res.append("exato"); continue
        pre = a[:-3] if a.endswith("/**") else a.rstrip("/")
        if any(x.startswith(pre + "/") for x in tree):
            res.append("diretório"); continue
        if "*" in a and any(fnmatch.fnmatch(x, a) for x in tree):
            res.append("glob"); continue
        if "/" not in a and [x for x in tree if x.endswith("/" + a) or x == a]:
            res.append("nome"); continue
        if os.path.exists(a):
            res.append("disco (não rastreado)"); continue
        res.append(None)
    return None if None in res else "+".join(sorted(set(res)))


tot, bad, info = 0, [], []
for f in FILES:
    head_txt = subprocess.run(["git", "show", "HEAD:" + f], capture_output=True, text=True, encoding="utf-8").stdout
    d = subprocess.run(["git", "diff", "-U0", "HEAD", "--", f], capture_output=True, text=True, encoding="utf-8").stdout
    for l in d.splitlines():
        if not l.startswith("+") or l.startswith("+++"):
            continue
        for tok in re.findall(r"`([^`\n]+)`", l):
            if not is_path(tok):
                continue
            k = kind(tok)
            if k != "caminho":
                info.append((f, k, tok)); continue
            tot += 1
            r = resolve(tok)
            if r is None:
                bad.append((f, tok, "já no HEAD deste arquivo (linha tocada)" if ("`" + tok + "`") in head_txt else "NOVO"))
            elif r not in ("exato",):
                info.append((f, r, tok))
print("tokens de caminho em linhas novas:", tot, "| NÃO resolvidos:", len(bad))
for x in bad:
    print("  NÃO RESOLVE:", x)
print("resolvidos por forma diferente de 'exato' (e rotas/branches, só informativo):")
for x in sorted(set(info)):
    print("  ", x)

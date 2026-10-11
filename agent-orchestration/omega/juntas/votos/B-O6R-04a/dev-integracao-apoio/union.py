"""Uniao de UM bloco de conflito: lado da main intacto e na posicao dele; lado do ramo (HEAD) depois.

Uso: python union.py <arquivo>
Falha (ec 2) se houver != 1 bloco de conflito ou marcador aninhado.
"""
import sys

path = sys.argv[1]
data = open(path, "rb").read()
lines = data.splitlines(keepends=True)

starts = [i for i, l in enumerate(lines) if l.startswith(b"<<<<<<< ")]
mids = [i for i, l in enumerate(lines) if l.rstrip(b"\r\n") == b"======="]
ends = [i for i, l in enumerate(lines) if l.startswith(b">>>>>>> ")]
if not (len(starts) == len(mids) == len(ends) == 1 and starts[0] < mids[0] < ends[0]):
    print(f"ERRO: blocos de conflito = {len(starts)}/{len(mids)}/{len(ends)}", file=sys.stderr)
    sys.exit(2)

s, m, e = starts[0], mids[0], ends[0]
pre, head, main, post = lines[:s], lines[s + 1:m], lines[m + 1:e], lines[e + 1:]

eol = b"\r\n" if lines[0].endswith(b"\r\n") else b"\n"


def blank(l):
    return l.strip(b"\r\n \t") == b""


sep = []
if main and head and not blank(main[-1]) and not blank(head[0]):
    sep = [eol]
if main and not main[-1].endswith(b"\n"):
    main[-1] = main[-1] + eol

out = b"".join(pre + main + sep + head + post)
open(path, "wb").write(out)
print(f"{path}: pre={len(pre)} main={len(main)} sep={len(sep)} head={len(head)} post={len(post)}")

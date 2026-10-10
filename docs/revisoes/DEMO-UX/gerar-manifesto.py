#!/usr/bin/env python3
"""Gera docs/revisoes/DEMO-UX/manifesto.tsv — o produto de demo/UX do ramo demo/investidor que NAO esta na main,
arquivo a arquivo, com a trilha (livre | espera) e o que bloqueia cada um. Decisao D-DEMO-UX-NUVEM (2026-09-30).

Nunca escreva o manifesto a mao: rode este script.

Uso (na raiz do repositorio, depois de `git fetch origin`):
    python docs/revisoes/DEMO-UX/gerar-manifesto.py [--demo origin/demo/investidor] [--main origin/main] \
        [--pr 388 --pr 389 --pr 393] > docs/revisoes/DEMO-UX/manifesto.tsv
Os PRs em voo sao lidos por `gh pr view <n> --json headRefOid`; sem `gh`, passe `--pr-head <sha>` no lugar.

Colunas: trilha · tema · arquivo · main_mudou_depois · pr_em_voo · blocos_planejados · commits_demo
- main_mudou_depois: o blob do arquivo na main difere do blob na base comum (a main mexeu depois da divergencia).
- pr_em_voo: PRs abertos cujo diff (desde a base deles com a main) contem o MESMO arquivo.
- blocos_planejados: blocos do PLANO_SAN3 §5 cujo caminho declarado cobre o arquivo; sufixo `*` = cobertura
  NOMINAL (o bloco declara um diretorio amplo, <= 2 segmentos, ex. `scripts/`, `frontend/src/`).
- `--concluido B-X`: bloco ja mergeado nao bloqueia; se ele mexeu no arquivo, isso aparece em main_mudou_depois.
- trilha: `livre` se nao ha PR em voo, nem bloco planejado, nem mudanca da main depois; senao `espera`.
"""
import argparse, io, re, subprocess, sys

PREFIXOS_PRODUTO = ('src/', 'frontend/', 'mobile/', 'scripts/seed-demo', 'scripts/demo-seed/', 'docs/demo-fluxos/')
FORA = ('scripts/sync-agent-agents.mjs',)


def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True, encoding='utf-8').stdout


def blob(ref, f):
    return git('rev-parse', '-q', '--verify', f'{ref}:{f}').strip()


def tema(f):
    if f.startswith(('scripts/seed-demo', 'scripts/demo-seed')): return 'T1-seeds-da-demo'
    if f.startswith(('docs/demo-fluxos', 'frontend/public')): return 'T2-videos-e-assets-da-demo'
    if f.startswith('mobile/'): return 'T8-app-de-campo'
    if f.startswith('src/'): return 'T4-precos-backend'
    if 'price-table' in f or 'registry/price' in f: return 'T4-precos-web'
    if '/patios/' in f: return 'T3-patios-e-dossie'
    if 'clickable-row' in f or 'row-actions' in f: return 'T6-clique-na-linha'
    return 'T5-web-visual-e-listas'


def blocos_do_plano(main):
    txt = git('show', f'{main}:docs/revisoes/SAN3/PLANO_SAN3.md').split('\n')
    ini = next(i for i, l in enumerate(txt) if l.startswith('### 5.1'))
    fim = next(i for i, l in enumerate(txt) if l.startswith('### 5.5'))
    out = []
    for l in txt[ini:fim]:
        m = re.match(r'^\| `(B-[A-Za-z0-9-]+)`', l)
        if not m: continue
        cols = l.split('|')
        ps = []
        for p in re.findall(r'`([^`]+)`', cols[4] if len(cols) > 4 else ''):
            if '/' not in p: continue
            p = p.split(' ')[0]
            p = re.sub(r'\{[^}]*\}.*$', '', p); p = re.sub(r'\*\*.*$', '', p); p = re.sub(r'\(.*$', '', p).rstrip(':.,')
            if p: ps.append(p)
        out.append((m.group(1), ps))
    return out


def main_():
    ap = argparse.ArgumentParser()
    ap.add_argument('--demo', default='origin/demo/investidor')
    ap.add_argument('--main', default='origin/main')
    ap.add_argument('--pr', action='append', default=[])
    ap.add_argument('--pr-head', action='append', default=[])
    ap.add_argument('--concluido', action='append', default=[],
                    help='bloco do PLANO_SAN3 ja mergeado: nao bloqueia (a colisao real aparece em main_mudou_depois)')
    a = ap.parse_args()
    base = git('merge-base', a.main, a.demo).strip()
    heads = []
    for n in a.pr:
        h = subprocess.run(['gh', 'pr', 'view', n, '--json', 'headRefOid', '--jq', '.headRefOid'],
                           capture_output=True, text=True).stdout.strip()
        if not h: sys.exit(f'ABORTA: nao resolvi o head do PR {n}')
        heads.append((f'#{n}', h))
    heads += [(h[:8], h) for h in a.pr_head]
    pr_arqs = {rot: set(git('diff', '--name-only', git('merge-base', a.main, h).strip(), h).split()) for rot, h in heads}
    blocos = blocos_do_plano(a.main)
    linhas = []
    for l in git('diff', '--name-status', base, a.demo).splitlines():
        partes = l.split('\t'); f = partes[-1]
        if not f.startswith(PREFIXOS_PRODUTO) or f in FORA: continue
        hd, hm, hb = blob(a.demo, f), blob(a.main, f), blob(base, f)
        if not hd or hd == hm: continue          # apagado no demo, ou ja igual na main
        main_mudou = 'main-mudou' if hb != hm else '-'
        voo = ' '.join(r for r, s in pr_arqs.items() if f in s) or '-'
        bl = []
        for b, ps in blocos:
            if b in a.concluido: continue
            for p in ps:
                pp = p.rstrip('/')
                if f == pp or f.startswith(pp + '/'):
                    bl.append(b + ('*' if len(pp.split('/')) <= 2 else '')); break
        bl = ','.join(sorted(set(bl))) or '-'
        trilha = 'livre' if (voo == '-' and bl == '-' and main_mudou == '-') else 'espera'
        commits = ','.join(git('log', '--format=%h', f'{base}..{a.demo}', '--', f).split())
        linhas.append((trilha, tema(f), f, main_mudou, voo, bl, commits))
    out = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    out.write('trilha\ttema\tarquivo\tmain_mudou_depois\tpr_em_voo\tblocos_planejados\tcommits_demo\n')
    for r in sorted(linhas): out.write('\t'.join(r) + '\n')
    out.flush()


if __name__ == '__main__':
    main_()

# VOTO-394-C1 — jurado-semteto-c1-fidelidade-transcricao

papel: C1 — fidelidade da transcrição · modelo: Opus 5.5 (claude-opus-5-5; corpo pede `opus`) · md5 EOL-neutro do corpo aplicado: 7a676a2fb44be53999d23471a4abd23c (medido em C:/Users/AMP/w-teto/.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md; md5 bruto = EOL-neutro, 0 CR)

Leitura de outras cadeiras: NÃO li VOTO-394-C2.md, VOTO-394-C3.md nem nenhum c2-*/c3-* antes de gravar este voto.
Escrita: nenhuma no repositório. Único arquivo persistente = este. Cópias de mutação em $SCRATCH/c1-jst/ (descartadas no fim).
Desvios do corpo, por ordem do orquestrador (que prevalece sobre o corpo nestes 2 pontos, e declaro): worktree `C:/Users/AMP/w-jst1` (não `w-stc1`); evidência+voto neste arquivo do scratchpad (não em agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/).

## Esqueleto (P2) — itens
- Item 1 (citação): EM APURAÇÃO
- Item 2 (nem mais): EM APURAÇÃO
- Item 3 (nem menos): EM APURAÇÃO

## Terreno
- `gh pr view 394 --json headRefOid` = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046; `git ls-remote origin refs/heads/docs/sem-teto-auditoria-no-3` = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046 (coincidem). Objeto do inspetor `7ad08690` → `git rev-parse 7ad08690^{commit}` = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046. **Head NÃO andou: objeto == head.** Logo o diff objeto→head é vazio por identidade (não por pathspec) — o controle de pathspec do corpo é inaplicável e declaro isso em vez de fingir que rodou.
- `git fetch origin` ec=0; `origin/main` = fc3363e38aabd77f54e6b53034128182f8000571 = `git merge-base origin/main 7ad08690` (base = merge-base).
- Commits no ramo: 3e92b2b8 (texto D-SEM-TETO) · 43b37e4d (plano, briefing, corpos) · dd79c96f (emenda T-21..T-25) · 7ad08690 (KPI).
- Worktree próprio: `git worktree add --detach C:/Users/AMP/w-jst1 7ad08690…` ec=0; `test -f C:/Users/AMP/w-jst1/.git` OK; HEAD = 7ad08690…; `status --short` vazio.
- Blobs lidos por `git show <commit>:<path>` para CLAUDE.md, AGENTS.md, decisoes.md (objeto e merge-base), plano e briefing (objeto). Contagem de CR (python 'rb'): 0 em todos → âncoras de mutação em LF são válidas.
- Worktrees alheios presentes (não tocados, só reportados): w-devs2, w-devs393, w-devt393, w-e4, w-mandato, w-teto.

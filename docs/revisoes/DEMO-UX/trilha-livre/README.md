# Trilha livre — pode ser planejada e desenvolvida na nuvem já

Os arquivos com `trilha = livre` no [`../manifesto.tsv`](../manifesto.tsv): **nenhum** PR em voo toca o mesmo arquivo,
**nenhum** bloco planejado do `PLANO_SAN3` §5 o declara, e a `main` não mexeu nele desde a base comum. Em 30/09:
156 arquivos — T2 vídeos e assets (81), T4 preços (6), T5 visual (1) e T8 app de campo (68).

**Como a nuvem trabalha aqui:**
1. **Um bloco por tema** (ex.: `B-DEMO-UX-T2`, `B-DEMO-UX-T4`), com plano (`planejador-mestre`), crítico,
   desenvolvimento, junta e porteiro — as mesmas regras de qualquer bloco (`CLAUDE.md`).
2. O plano parte do comportamento dos commits do `demo/investidor` citados no [`../README.md`](../README.md), lidos com
   `git show origin/demo/investidor:<arquivo>`. O código é **reportado sobre a `main` de hoje**; divergência
   entre o demo e a `main` é medida no §0 do plano, não resolvida em silêncio.
3. Ramo do bloco: `feat/demo-ux-<tema>`. Push assim que houver commit que doa perder (`D-DURABILIDADE-BRANCHES-LOCAIS`).
   Nunca `main`, nunca `--force`. **Merge só pela sessão local**, depois de junta e CI.
4. T8 (app de campo) só é desenvolvido na nuvem se ela provar o **Flutter 3.47.5** do CI
   (`agent-orchestration/docs/conhecimento-de-terreno.md` §1.1); se não, o plano vai para a nuvem e o
   desenvolvimento fica na máquina do dono.
5. Antes de começar, regenere o manifesto (a `main` anda; um arquivo livre hoje pode estar em espera amanhã).

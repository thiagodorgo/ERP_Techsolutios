# Evidência — `insp-san320-argon` · executor=Antigravity (`agy`) · modelo=gemini-4-argon (esforço medium, nível menor declarado, §C7.6; divergência declarada frente a `model: opus` no frontmatter de `.claude/agents/inspetor-de-terreno-da-junta.md` sob `D-IAS-EXTERNAS-PRIMEIRO`) · objeto=a0f5aabca6b86aba21051baffd40c245b5ef1a05 (PR #456, ramo `fix/cheque-x-baixa`) · mandato_md5=ac2a7df266ee03b7b5ffcaabe3e8d901 · corpo_carregado_vs_objeto=IDENTICO

- **Identidade:** `insp-san320-argon` (identidade nova e distinta de `fab-red-san320-argon` e `jurado-san320-c3-argon`; não vota nem julga mérito — julga exclusivamente a limpeza e legalidade do tabuleiro da junta de DINHEIRO do `B-SAN3-20`, ciclo 1, §C7.1-bis).
- **Régua da junta liberada/inspecionada:** bloco `B-SAN3-20` = junta de **DINHEIRO**, inspetor + 3 cadeiras com poder de veto (`jurado-san320-c1-opus`, `jurado-san320-c2-pro`, `jurado-san320-c3-argon`), **unanimidade de 3** (§C7 item 8(1)), teto de 2 ciclos (item 8(2)), **ciclo 1** (todo achado `bloqueia` com escopo `dentro-do-bloco` reprova), `escopo` + `gravidade` por achado (§C7.1-ter(a)), `arquivos_medidos` em todo voto (§C7 item 9(0)).

## Item 1 de 3 — Objeto, CI, pré-voo dos 4 mandatos, corpos, espelho S0 e baseline `npm run check`

- **Comando:**
  ```bash
  cd C:/Users/AMP/w-san320
  git -C C:/Users/AMP/w-san320 ls-remote origin refs/heads/fix/cheque-x-baixa
  gh pr view 456 --json headRefOid,mergeable,state,isDraft,baseRefName,headRefName
  git rev-parse HEAD && git rev-parse --short HEAD && git status --short -uno | wc -l && git status --short
  for f in src/modules/cheques/cheque.service.ts src/modules/cheques/cheque-prisma.repository.ts src/modules/financial-titles/financial-title.service.ts src/modules/financial-titles/financial-title-prisma.repository.ts src/modules/financial-entries/financial-entry.service.ts src/modules/financial-entries/financial-entry-undo-owners.ts prisma/schema.prisma prisma/migrations/20260881000000_cheque_title_link/migration.sql; do
    hb=$(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$f" | tr -d '\r' | md5sum | awk '{print $1}')
    hd=$(tr -d '\r' < "$f" | md5sum | awk '{print $1}')
    echo "$f: $([ "$hb" = "$hd" ] && echo "IDENTICO ($hb)" || echo "DIVERGE ($hb vs $hd)")"
  done
  gh api repos/thiagodorgo/ERP_Techsolutios/commits/a0f5aabca6b86aba21051baffd40c245b5ef1a05/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | "\(.name):\(.status)/\(.conclusion)"] | sort | join(", "))'
  for b in mandato-preflight.sh mandato-refs.sh; do cmp -s "C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/$b" "C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/$b" && echo "$b IDENTICO"; done
  for m in inspetor-san320.md cadeira-c1.md cadeira-c2.md cadeira-c3.md; do MANDATO_REFS="C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh" bash "C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh" "C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/$m" 456; echo "ec_$m=$?"; done
  for c in c1-dinheiro c2-banco-migracao c3-regressao; do p1=".claude/agents/especialistas/jurado-san320-$c.md"; p2=".agents/agents/especialistas/jurado-san320-$c.md"; diff <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$p1" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$p2" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO espelho $c"; done
  node C:/Users/AMP/w-san320/scripts/sync-agent-agents.mjs --check; echo "ec_sync=$?"
  npm.cmd run check; echo "ec=$LASTEXITCODE"
  ```
- **Saída resumida:**
  - `a0f5aabca6b86aba21051baffd40c245b5ef1a05 refs/heads/fix/cheque-x-baixa` · `{"baseRefName":"main","headRefName":"fix/cheque-x-baixa","headRefOid":"a0f5aabca6b86aba21051baffd40c245b5ef1a05","isDraft":false,"mergeable":"MERGEABLE","state":"OPEN"}` · `HEAD = a0f5aabca6b86aba21051baffd40c245b5ef1a05` (`a0f5aabc`).
  - `git status --short -uno | wc -l` = `0`; único item não rastreado = `?? agent-orchestration/omega/juntas/votos/B-SAN3-20/`; 8/8 arquivos centrais conferidos por md5 EOL-neutro contra o blob do head = `IDENTICO`.
  - Check-runs: `total_count = 14`, não-verdes/pendentes = `0`: `authority-portal:completed/success` (x2), `backend-postgres:completed/success` (x2), `backend:completed/success` (x2), `docker:completed/success` (x2), `flutter:completed/success` (x2), `frontend:completed/success` (x2), `owner-portal:completed/success` (x2).
  - Ferramentas: `mandato-preflight.sh IDENTICO`, `mandato-refs.sh IDENTICO`.
  - Pré-voo dos 4 mandatos:
    - `PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/inspetor-san320.md` (`ec=0`)
    - `PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c1.md` (`ec=0`)
    - `PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c2.md` (`ec=0`)
    - `PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c3.md` (`ec=0`)
  - Corpos e S0: `IDENTICO espelho c1-dinheiro`, `IDENTICO espelho c2-banco-migracao`, `IDENTICO espelho c3-regressao`; disco de `w-san320` vs blob de `a0f5aabc` = `IDENTICO` para C1 (`dfd669112ffe57d49a0f844b45c5106b`), C2 (`f3ef198a1d55919f5060e7dac11a249e`), C3 (`153c347fc1973138c2fbc3436d14b6aa`) e inspetor (`cbbed45074c7098081a9c51d47f3e373`); `[agents-sync] OK — 79 agentes, espelho consistente.` (`ec_sync=0`).
  - Baseline `npm run check`: `> tsc -p tsconfig.json --noEmit` → `ec=0`.
- **Veredito parcial (Item 1):** VERDE (aprovado sem bloqueio).

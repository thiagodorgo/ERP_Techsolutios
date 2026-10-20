# Mandato — Inspetor — B-DASH-PERFIL ciclo 1

## MEDIDO

Estado do PR 446 no instante da redação, pela ferramenta copiada de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash-cdx`, medido por: `bash <scratch-do-redator>/mandato-refs.sh 446`
```
# refs do PR #446 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-19T04:32Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dash-perfil
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      849bf840f2bdecae87b82a17b26adf505d8a2a8e
merge-base:      3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #446
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os quatro insumos versionados existem no objeto: `docs/revisoes/TELAS/B-DASH-PERFIL-plano.md`, `docs/revisoes/TELAS/B-DASH-PERFIL-critica.md`, `docs/revisoes/TELAS/B-DASH-PERFIL-dev.md` e `docs/revisoes/TELAS/B-DASH-PERFIL-emenda-dev.md`; o cabeçalho do plano nomeia `plan-b-dash-perfil-cdx` e o da crítica nomeia `critico-adversarial`, medido por: `O=<head colado acima>; for p in docs/revisoes/TELAS/B-DASH-PERFIL-plano.md docs/revisoes/TELAS/B-DASH-PERFIL-critica.md docs/revisoes/TELAS/B-DASH-PERFIL-dev.md docs/revisoes/TELAS/B-DASH-PERFIL-emenda-dev.md; do git cat-file -e "${O}:$p" && echo "PRESENTE $p"; done; git show "${O}:docs/revisoes/TELAS/B-DASH-PERFIL-plano.md" | head -4; git show "${O}:docs/revisoes/TELAS/B-DASH-PERFIL-critica.md" | head -4`

A emenda externa existe fora do repositório em `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md`; seu MD5 é `efdf-a8e6-dc88-95aa-d4be-0303-9aed-21da`, medido por: `Get-FileHash -Algorithm MD5 -LiteralPath C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md`

Os três corpos pertencem ao objeto nos dois espelhos. C1: `.claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md`, blob `e146-0c56-47f3-8ab9-3b82-d410-85b3-2e29-4eba-86b4`, MD5 EOL-neutro `1af9-3b3d-f464-a644-2c8d-c97c-f31b-b22e`; `.agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md`, blob `81c1-1c21-d67c-927f-bef2-66e9-614e-d784-d638-d0f0`, MD5 `10f7-3b16-3cba-5f61-f586-6bca-f3d7-764d`. C2: `.claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md`, blob `bcf6-18d4-f68e-4c0e-1c12-ae92-920d-9cd8-c70c-7a20`, MD5 `afee-3f7f-17f4-5301-dde1-0ad9-a597-0c78`; `.agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md`, blob `f066-23cc-df44-9283-b720-c47c-653d-64ef-6597-3213`, MD5 `5198-368e-4830-5248-c114-d996-0e78-b5b9`. C3: `.claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md`, blob `8b83-3d3a-d854-f825-4bb6-354d-d73e-2ff0-e188-65b6`, MD5 `f707-a03b-8995-f5ff-8a34-872e-e785-02fc`; `.agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md`, blob `f55f-0b67-f820-de65-6a5c-ecbb-88fc-f369-fe63-399b`, MD5 `24b0-e3dd-0824-1144-6919-6e4b-3990-cffa`, medido por: `O=<head colado acima>; for p in <os-seis-caminhos-versionados-desta-unidade>; do git cat-file -e "$O:$p"; git rev-parse "$O:$p"; git show "$O:$p" | tr -d '\r' | md5sum; done`

O S0 do objeto está verde em worktree descartável exatamente no head do PR: `[agents-sync] OK — 58 agentes, espelho consistente.` e `ec=0`, medido por: `git worktree add --detach C:/Users/AMP/w-dash-s0 <head colado acima>; node C:/Users/AMP/w-dash-s0/scripts/sync-agent-agents.mjs --check; git worktree remove --force C:/Users/AMP/w-dash-s0`

## HIPOTESE

Você é `inspetor-dash-cdx`, identidade nova, executor Codex GPT-5.6 Sol, esforço médio, nível menor. Declare executor efetivo, modelo, nível, objeto e `mandato_md5` na primeira linha da evidência. Você não vota nem julga mérito. O objeto só é liberável se continuar sendo o head do PR 446 com 14 de 14 check-runs concluídos e verdes. Plano, crítica, emenda externa e relatórios de dev são **A RE-VERIFICAR**, nunca prova herdada. Régua: PERMISSÃO, unanimidade de 3 com veto, ciclo 1, derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/insp-dash-evidencia.md | grep -i -E 'Codex|GPT-5.6|mandato_md5|objeto'`

Item 1 de 3: resolva o objeto por `git ls-remote` e `gh pr view 446`; confira os check-runs concluídos; rode o pré-voo dos quatro mandatos; confira por blob do objeto e MD5 EOL-neutro os seis corpos; reexecute S0 no objeto. Divergência posterior ou ausência de CI bloqueia o início, derruba com: `grep -i -E 'Item 1|14/14|seis corpos|S0|pré-voo|LIBERADO|BLOQUEADO' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/insp-dash-parecer.md`

Item 2 de 3: confira inelegibilidade por nome de `dev-b-dash-perfil-opus`, `dev-dash-emenda-cdx`, `planejador-dash-emenda-gemini`, `fabrica-dash-gemini`, `plan-b-dash-perfil-cdx` e `critico-adversarial`; confira também as identidades de dev nomeadas nos relatórios como pertencentes ao PR. Nomeie C1 em Codex, C2 em Gemini 3.1 Pro e C3 na primeira IA externa livre; Claude Opus é somente reserva declarada. Coincidência de identidade bloqueia, derruba com: `grep -i -E 'ineleg|dev-b-dash-perfil-opus|dev-dash-emenda-cdx|planejador-dash-emenda-gemini|fabrica-dash-gemini|plan-b-dash-perfil-cdx|critico-adversarial|C1|C2|C3|reserva' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/insp-dash-parecer.md`

Item 3 de 3: confira árvore sem mutação viva, admitindo somente os ` M` EOL-neutros em `.agents/` e os cinco outputs desta redação; exija worktree e cluster próprios por cadeira com prefixos `jdash-c1-`, `jdash-c2-` e `jdash-c3-`, `npm ci` próprio e nunca junction de `node_modules`. Antes de Docker, conte trabalhos alheios excluindo `erp-*`; máximo 2 trabalhos na máquina incluindo o atual. Base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas. Declare baseline honesto, plano de perda e máximo de dois jurados paralelos, derruba com: `grep -i -E 'Item 3|jdash-c1-|jdash-c2-|jdash-c3-|junction|5432|6379|3000|5173|5050|8899|P3|P6' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/insp-dash-parecer.md`

P1: evidência incremental após cada item. P2: parecer nasce esqueleto e fecha antes da mensagem final de uma linha. P3: sucessor de identidade nova reexecuta comandos registrados. P4: exatamente três itens. P5: até dois jurados em paralelo; duas quedas em trinta minutos impõem pausa. P6: queda vai imediatamente a `00-quedas.md`. P7: PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos, então para. Únicos outputs: `insp-dash-evidencia.md` e `insp-dash-parecer.md`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/insp-dash-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash-cdx`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-dash`, medido por: `MANDATO_REFS=<scratch-do-redator>/mandato-refs.sh bash <scratch-do-redator>/mandato-preflight.sh <este-mandato> 446; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #446 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/00-mandatos/inspetor-dash.md
ec=0
```

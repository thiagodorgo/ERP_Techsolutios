# Mandato — Cadeira C2 — B-DASH-PERFIL ciclo 1

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

Plano, crítica e dois relatórios do dev existem no objeto; a emenda externa existe em `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md` com MD5 `efdf-a8e6-dc88-95aa-d4be-0303-9aed-21da`, medido por: `O=<head colado acima>; for p in docs/revisoes/TELAS/B-DASH-PERFIL-plano.md docs/revisoes/TELAS/B-DASH-PERFIL-critica.md docs/revisoes/TELAS/B-DASH-PERFIL-dev.md docs/revisoes/TELAS/B-DASH-PERFIL-emenda-dev.md; do git cat-file -e "$O:$p"; done; Get-FileHash -Algorithm MD5 -LiteralPath C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md`

Os seis corpos no objeto têm estes blobs e MD5 EOL-neutros: C1 `.claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md` = `e146-0c56-47f3-8ab9-3b82-d410-85b3-2e29-4eba-86b4` / `1af9-3b3d-f464-a644-2c8d-c97c-f31b-b22e`; C1 `.agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md` = `81c1-1c21-d67c-927f-bef2-66e9-614e-d784-d638-d0f0` / `10f7-3b16-3cba-5f61-f586-6bca-f3d7-764d`; C2 `.claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md` = `bcf6-18d4-f68e-4c0e-1c12-ae92-920d-9cd8-c70c-7a20` / `afee-3f7f-17f4-5301-dde1-0ad9-a597-0c78`; C2 `.agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md` = `f066-23cc-df44-9283-b720-c47c-653d-64ef-6597-3213` / `5198-368e-4830-5248-c114-d996-0e78-b5b9`; C3 `.claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md` = `8b83-3d3a-d854-f825-4bb6-354d-d73e-2ff0-e188-65b6` / `f707-a03b-8995-f5ff-8a34-872e-e785-02fc`; C3 `.agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md` = `f55f-0b67-f820-de65-6a5c-ecbb-88fc-f369-fe63-399b` / `24b0-e3dd-0824-1144-6919-6e4b-3990-cffa`, medido por: `O=<head colado acima>; for p in <os-seis-caminhos-versionados-desta-unidade>; do git rev-parse "$O:$p"; git show "$O:$p" | tr -d '\r' | md5sum; done`

O S0 executado no objeto devolveu `[agents-sync] OK — 58 agentes, espelho consistente.` e `ec=0`; `D-IAS-EXTERNAS-PRIMEIRO` existe no objeto, medido por: `git worktree add --detach C:/Users/AMP/w-dash-s0 <head colado acima>; node C:/Users/AMP/w-dash-s0/scripts/sync-agent-agents.mjs --check; git -C C:/Users/AMP/w-dash-s0 show HEAD:agent-orchestration/controle/decisoes.md | grep -n -i -m1 'D-IAS-EXTERNAS-PRIMEIRO'; git worktree remove --force C:/Users/AMP/w-dash-s0`

## HIPOTESE

Você é `jurado-dash-c2-gemini`, identidade nova, executor Gemini 3.1 Pro, nível menor declarado. Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5`, blob do corpo e MD5 EOL-neutro dos dois espelhos. Seu corpo canônico é `.claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md`; confira-o antes do mérito. Claude Opus é somente reserva declarada. Plano, crítica, emenda e relatórios são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-evidencia.md | grep -i -E 'executor|Gemini 3.1 Pro|mandato_md5|blob|md5'`

A legalidade vem antes do mérito: parecer do inspetor LIBERADO ou LIBERADO COM RESSALVA nomeando identidade, executor, worktree e cluster; objeto ainda é o head com CI concluída. Régua PERMISSÃO, unanimidade de 3 com veto; achado declara gravidade, classe, escopo, N e forma; não consigo medir item meu é REPROVADO; não proponha correção e não leia votos alheios, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jdash-c2-`, `npm ci` próprio e zero junction; cluster e rede próprios `jdash-c2-*`, nenhuma porta publicada. No máximo 2 trabalhos Docker incluindo o seu e excluindo `erp-*`. Nunca use base viva nem portas 5432, 6379, 3000, 5173, 5050 e 8899. Mutações só em cópia descartável, com restauro por hash e teardown, derruba com: `grep -i -E 'jdash-c2-|junction|5432|6379|3000|5173|5050|8899|teardown' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-evidencia.md`

Item 1 de 3: prove por execução que trocar de organização substitui integralmente as permissões antigas pelas novas, sem união ou vazamento. Mute o frontend para preservar permissões antigas, exija falha, restaure e prove hashes, derruba com: `grep -i -E 'Item 1|organização|permissões antigas|vazamento|vermelho|restaur' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-evidencia.md`

Item 2 de 3: prove que a sessão restaurada do armazenamento preserva exatamente as permissões do tenant ativo e não recompõe capacidades por mapa estático. Injete mapa hardcoded, exija divergência vermelha, restaure e prove hashes, derruba com: `grep -i -E 'Item 2|restaur|tenant ativo|mapa estático|vermelho' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-evidencia.md`

Item 3 de 3: prove que a seleção da organização usa `landing-route` calculada pelas capacidades efetivas, sem dedução por papel, crash ou loop. Force `/dashboard` incondicional para quem só acessa estoque, exija falha, restaure e prove hashes, derruba com: `grep -i -E 'Item 3|landing-route|capacidades efetivas|estoque|dashboard|vermelho|restaur' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-evidencia.md`

P1: evidência incremental após cada item. P2: `c2-voto.json` nasce esqueleto com três itens EM APURAÇÃO e fecha antes da mensagem final. P3: sucessor novo reexecuta tudo. P4: três itens exatos. P5: máximo dois jurados paralelos. P6: queda em `00-quedas.md`. P7: PAUSA grava estado e para. Únicos outputs: `c2-evidencia.md` e `c2-voto.json`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/c2-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash-cdx`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-dash`, medido por: `MANDATO_REFS=<scratch-do-redator>/mandato-refs.sh bash <scratch-do-redator>/mandato-preflight.sh <este-mandato> 446; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #446 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL/00-mandatos/cadeira-c2.md
ec=0
```

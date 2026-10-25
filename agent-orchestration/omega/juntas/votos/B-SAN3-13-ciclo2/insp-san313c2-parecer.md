# Parecer — inspetor-san313c2-opus — B-SAN3-13 ciclo 2 (junta de DADO, PR #460)

Papel: `inspetor-de-terreno-da-junta` · executor: subagente Claude Code genérico · modelo: Claude Opus 5.5, nível menor DECLARADO · objeto: cbf2db292f0643b9647017005c361a2e11da61c7

## Item 1 de 3 — objeto, CI, delta, mandatos, corpos, S0
**VERDE.** Medido (comandos na evidência, Item 1):
- Objeto por duas fontes: `git ls-remote` = `gh pr view 460` = cbf2db292f0643b9647017005c361a2e11da61c7 (OPEN, não rascunho, MERGEABLE); árvore w-san313 no objeto.
- check-runs: 14 no SHA, 7 jobs × 2 gatilhos (`pull_request` e `push`), todos `completed success`; 0 queued/cancelled/ausente.
- Objeto do ciclo 1 = `<objeto>~6` (ed4e229e…), ancestral; delta do conserto = 9 caminhos, por caminho completo todos dentro da lista do §F (l.543 do plano) e fora do PROIBIDO do §C; `src`/`tests` = 0; `.claude`/`.agents` = 0 (o ciclo 2 não mexeu em corpo).
- PRE-VOO: `PRE-VOO OK` (ec 0) nos 4 mandatos, com as ferramentas de `redator-san313c2/`; toda unidade de MEDIDO tem saída colada (c1 15/15, c2b 16/16, c3 16/16, inspetor 21/21); dos 72 caminhos absolutos citados, só faltam os arquivos de saída ainda não criados.
- Corpos: os 3 corpos jurado-san313-* no blob = disco do worktree (EOL-neutro) e espelho .claude × .agents IDENTICO. **Ressalva informativa R1:** os 3 corpos NÃO existem no diretório da sessão (ERP_Techsolutios na `main`), logo cada cadeira tem de rodar como subagente genérico com o corpo lido do blob do objeto (os mandatos já o mandam) — nunca por tipo de agente da sessão.
- S0: worktree descartável meu `C:/Users/AMP/j13c2-insp-s0` no objeto → `[agents-sync] OK — 85 agentes, espelho consistente.` ec 0; removido.

## Item 2 de 3 — identidades, papéis, cadeira vermelha, composição, briefing
**VERDE, com ressalva R2.** Medido (Item 2 da evidência):
- **Inelegíveis** regenerados por comando meu (registro P8 `agentes-vivos.tsv` + atas/plano/R; o do mandato é piso): planejador-mestre/planejador-san313-fable, planejador-san313-c2-fable, crit-san313-{opus,opus-r2,argon,pro-r2}, med-san313-argon, dev-san313-opus, dev-san313-c2-opus, fab-san313-opus, redator-san313-opus, redator-san313c2-opus, inspetor-san313-opus, insp2-san313-pro (acrescido por mim: re-inspeção Gemini caída do ciclo 1), jurado-san313-c2-opus, jurado-san313-{c1,c2,c3}-sol, orquestrador. Nenhum coincide com `inspetor-san313c2-opus`, `jurado-san313-c1-opus`, `jurado-san313-c2b-opus`, `jurado-san313-c3-opus`; os 4 são distintos; obituário e `git grep` no objeto = 0 para os 4. `jurado-san313-c1-opus`/`-c3-opus` só aparecem no ciclo 1 como nome PROPOSTO nos mandatos; o registro P8 não tem lançamento deles → nunca votaram, não são inelegíveis (3.1).
- **§C7.4-bis por nome:** achou `jurado-san313-c2-opus` ≠ auditou e planejou `planejador-san313-c2-fable` (topo, Fable) ≠ desenvolveu `dev-san313-c2-opus` (Opus cobrindo o Codex Sol, declarado no relatório do dev) ≠ julgam os 4 acima.
- **Cadeira vermelha (§C7 item 9):** no ciclo 1 só há voto da C2 (vermelha) → REFEITA por `jurado-san313-c2b-opus`; C1 e C3 não têm voto → **votam pela primeira vez** sobre o objeto; nada carregado, nada revalidado. Para a ata: C1 = primeira, C2 = refeita, C3 = primeira (comando: `ls votos/B-SAN3-13 | grep -E '^c[13]-'` → vazio).
- **Monocultura (R2):** as 4 identidades rodam em Claude Opus, o mesmo modelo do achador e do dev do ciclo 2. O §9 do plano ("pelo menos uma cadeira não-Gemini", "nunca três cadeiras Gemini") é cumprido (0 Gemini). Mas o §9 l.336 previa Opus só na C2 "se Codex faltar (declarado na ata)": C1 e C3 em Opus decorrem da ordem do dono em `votos/B-SAN3-13/00-quedas.md` — **a ata tem de declarar isso e a monocultura**.
- **Donos:** CA-1..CA-25 = 25/25 com dono único (c1 11, c2b 12, c3 2); C2-01..C2-04 na C2b (itens 1–3); desvios 1–4 do dev na C2b (itens 1–2) e conferidos como registro na C3 (item 3). Nada sem dono.
- **Briefing:** presentes nos 3 mandatos a seção do ciclo 2 do plano, o relatório do dev (ciclo 2), o registro da reprovação, o voto da C2 do ciclo 1; a evidência e as sondas `j13-c2/` da C2 do ciclo 1 como roteiro P3 da C2b; as divergências registradas; tudo marcado A RE-VERIFICAR; `arquivos_medidos` exigido (C3 com `**`).

## Item 3 de 3 — terreno
**VERDE, com ressalva R3.** Medido (Item 3 da evidência):
- **Árvore** `C:/Users/AMP/w-san313` no objeto, 0 modificados; não rastreados só os 3 admitidos. Zero junction (`node_modules` e `.dart_tool` são diretórios reais).
- **Isolamento declarado nos mandatos (1.2):** worktree próprio por cadeira (`C:/Users/AMP/j13c2-c1-wt`, `C:/Users/AMP/j13c2-c2-wt`, `C:/Users/AMP/j13c2-c3-wt`) com `npm ci`/`flutter pub get` próprios; Postgres e Redis descartáveis para C1 (`j13c2-c1-pg`, `j13c2-c1-redis`, 47613/47614) e C3 (`j13c2-c3-pg`, `j13c2-c3-redis`, 47633/47634), só em 127.0.0.1; a C2b não sobe banco (Drift em memória, SQLite na pasta dela). Base viva (`erp-*`) e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55313 proibidas. As 4 portas candidatas estão fora das 23 faixas reservadas do Windows e livres.
- **Resíduo:** 0 container `j13*`/`san313`/`jur-`/`crit-`; 0 caminho `C:/Users/AMP/j13*`; 0 worktree além do objeto. `erp-pausa-2026-10-03/j13-c2` e `j13-plan-c2` são o roteiro P3 (inertes, ficam, só leitura).
- **Orçamento P8 (c) agora:** memória de commit livre 13,71 GB (≥ 4 GB); 0 trabalhos Docker fora de `erp-*` (teto 2); disco C: 9,9 GB (piso 7 GB).
- **Baseline honesto:** `npm run check` no objeto, ec=0; Flutter verde pelo check-run `flutter` do objeto (os 2 gatilhos).
- **Perda de jurado:** P3 (sucessor de identidade nova re-executa os comandos registrados e mede a cauda), queda em `00-quedas.md` deste ciclo (P6, orquestrador), P7 na PAUSA; Opus esgotado = PARA (§C7.6-bis). Nos 3 mandatos.
- **Ordem — uma cadeira por vez (ordem do dono, mais estreita que a P5):** a proposta do redator, **C2b → C1 → C3**, está APROVADA. A C2b é a vermelha e não sobe Docker (o resultado decisivo sai mais cedo e mais barato); a C1 mede o backend, que o ciclo 2 não tocou; a C3 mede as suítes inteiras e o registro por último, com tudo assentado.
- **R3 (disco):** a margem até o piso é de 2,9 GB, e C1 e C3 fazem `npm ci` e sobem Postgres e Redis. **Cada cadeira derruba os containers DELA e remove o worktree DELA (`git worktree remove --force`, depois de processos = 0) antes de a seguinte começar.** O orquestrador mede `df` antes de cada disparo e PARA abaixo de 7 GB.

## Veredito
**LIBERADO COM RESSALVA** — a junta do ciclo 2 pode começar, uma cadeira por vez, na ordem C2b → C1 → C3.

Ressalvas para o briefing, em destaque:
- **R1:** os corpos `jurado-san313-*` não existem no diretório da sessão (a `main`). Cada cadeira roda como subagente genérico e lê o corpo do blob do objeto, como os mandatos já mandam. Nunca carregar por tipo de agente da sessão.
- **R2:** monocultura. As 4 identidades rodam em Claude Opus, o mesmo modelo do achador e do dev do ciclo 2. O §9 do plano é cumprido (nenhuma cadeira Gemini). C1 e C3 em Opus vêm da ordem do dono em `votos/B-SAN3-13/00-quedas.md`, e a ata tem de declarar isso. Pela regra da cadeira vermelha, a ata registra: C2 refeita, C1 e C3 votando pela primeira vez.
- **R3:** margem de disco de 2,9 GB. Antes da cadeira seguinte, a anterior derruba os containers e remove o worktree dela. Abaixo de 7 GB, PARA.
- **Nota:** no `agentes-vivos.tsv`, o planejador do ciclo 2 está rotulado "planejador ciclo 2 B-SAN3-13", sem o nome `planejador-san313-c2-fable`, que está no plano (l.459). É só higiene do registro P8 e não bloqueia.

Itens do corpo sem aplicação: 2.2 (ciclo < 4) e 6.1/6.2 (nenhum voto carregado).

Limpeza: o worktree `C:/Users/AMP/j13c2-insp-s0` foi criado e removido (`git worktree list` sem `j13c2`). Os temporários `/tmp/{cr,paths,pv-*,m-*,ca-*,i1,i2,i3,v,base-check}.txt` foram apagados. Nenhum container foi criado, e nada rastreado foi tocado.

Papel `inspetor-de-terreno-da-junta` · identidade `inspetor-san313c2-opus` · modelo Claude Opus 5.5, nível menor DECLARADO · objeto cbf2db292f0643b9647017005c361a2e11da61c7.

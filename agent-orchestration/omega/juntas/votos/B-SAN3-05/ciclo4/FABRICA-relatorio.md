# FABRICA — corpos das três cadeiras da junta 4 do B-SAN3-05 (ciclo 4)

- **Papel:** `agente-fabrica` · **modelo:** Claude Opus 5.5 (`claude-opus-5-5`) — **substituição declarada (§C7.6-bis):** o B-SAN3-05
  não toca dinheiro e o Fable fica reservado a bloco de dinheiro (`D-FABLE-ASTRA-SO-DINHEIRO`, decisão do dono de 2026-10-08,
  `agent-orchestration/controle/decisoes.md` l.2982 no disco). O frontmatter dos três corpos continua `model: fable`: o fallback é de
  quem lança.
- **Quando e onde li:** 2026-10-09, depois das 18:32Z, no disco de `C:/Users/AMP/w-o05`. Ref local e de rastreio de
  `fix/runtime-role-sem-bypass` = `737e8cf37b0eefec40e794bf716d48844b763048` (lidas nos arquivos de ref; reflog: "chore(junta): fecho do
  relatório do dev do ciclo 4 …"); head do disparo do dev `7c63f920` (reflog: "docs(plano): ciclo 4 …"). O dev já tinha fechado (relatório
  com teardown às 18:31Z). Não executei nada: a fábrica não tem `Bash`. Os md5 dos corpos **não** foram medidos por mim.
- **Fontes:** plano `docs/revisoes/SAN3/B-SAN3-05-plano.md`, seção "## Ciclo 4" (C4.1–C4.6, l.2167-2355 no disco); `decisoes.md`
  (`D-405-PROIBIR-VIEWS` l.3013-3020; leitura R3/R4 l.3003-3011, copiada verbatim nos três corpos); `ciclo4/DEV-relatorio.md` (roteiro);
  molde `jurado-san305-c3-trava-de-views.md` e os outros dois corpos do ciclo 3; código do disco (trava, script, arquivo de guarda,
  bootstrap, `server.ts`) só para nomear funções e linhas, sempre como hipótese a conferir no blob.
- **Escrevi só quatro arquivos** (LF, 0 CR, 0 espaço no fim de linha nos três corpos, conferido por busca):
  - `.claude/agents/especialistas/jurado-san305-c4-catalogo-de-views.md` (C1)
  - `.claude/agents/especialistas/jurado-san305-c4-credencial-arnes-escopo.md` (C2)
  - `.claude/agents/especialistas/jurado-san305-c4-boot-e-suite.md` (C3)
  - este relatório.
  **Espelho Codex não escrito:** `.agents/agents/especialistas/` é do orquestrador (`node scripts/sync-agent-agents.mjs`, `git add -f`
  nos **dois** espelhos, commit no ramo julgado **antes** do inspetor — C4.6, l.2333).

## De onde veio cada item (C4.6, l.2324-2326)

| cadeira | identidade | itens (exatos do C4.6) |
|---|---|---|
| C1 | `jurado-san305-c4-catalogo-de-views` | (1) um banco por caso, no head: COL, COM sem grant, MAT, cadeia, CTL — trava REAL, boot real e MODO 6 — e ≥ 1 forma própria dentro da decisão; (2) M4a/b/c × (t)/(s) pelo caso, T8f 1 + 2, `view_escape` ausente; (3) sem falso positivo: banco migrado → 0 no `view_force`, T5/T15 verdes, catálogo do sistema não dispara |
| C2 | `jurado-san305-c4-credencial-arnes-escopo` | (1) B1: sentinela 0 em `server.log`/terminal/argv sob `log_statement=all`, no sucesso e no MODO 6 do caso COL, `SCRAM-SHA-256$`; (2) B2: `guard-db` + `leituras` N=3 (12/13), 0 `XX000`/`23505`/`40P01`, resíduo 0, T14c intacto; (3) escopo ⊆ PERMITIDO do C4.4, `Kpis/` sem diff, guarda de catálogo só a entrada e 5/5, `100755`/`eol=lf`, `diff --check` |
| C3 | `jurado-san305-c4-boot-e-suite` | (1) boot real (`enforce`) recusa com view de dono comum sem grant e aceita sem ela, log sem host/porta/senha/banco (T9/T15); (2) `npm test` (fail 0, skipped ≤ 2, N executado) + build; bootstrap 12, acessos 35 (T13), leituras 13; (3) texto diz a regra — só nota |

Comum aos três: unanimidade de 3 com veto; ciclo 4 só grave com R3/R4; objeto por `ls-remote` = `gh pr view`, check-runs concluídos,
HC = H0; P1–P7 (P7 com a seção `## PAUSA`); ≤ 3 itens; uma cadeira por vez no Claude; worktree `C:/Users/AMP/w-j05c4cN`; containers
`j05c4-cN-` sem porta, imagem `erp-junta-node20-pg16:local`, receita `C:/Users/AMP/erp-terreno/receita-pg16.sh`; base viva e
5432/6379/55432 nunca; `docker rm -f -v` só dos seus; inelegíveis por nome (C4.6 + fábrica, orquestrador, as outras duas cadeiras, o
inspetor da junta 4); a **reprovação por construção do C4.6 (l.2335-2342) copiada verbatim**, com a não-convergência; todo achado com
gravidade × escopo × classe; não propõe correção; evidência e voto em `ciclo4/C{N}-evidencia.md` e `C{N}-voto.json`; sem `tail -f`;
tudo sob `timeout`; saída colada sem espaço no fim de linha (`grep -cE '[[:space:]]+$'` = 0 antes da mensagem final).

## Divergências e leituras da fábrica (registradas, não resolvidas — §A2)

1. **R4 aplicada item a item (leitura da fábrica).** Não medido **reprova**: C1 item 1; C2 itens 1 e 2 e a classificação de arquivos do
   item 3; C3 itens 1 e 2. Não medido vira **pendência**: C1 itens 2 e 3 (desde que o item 1 tenha sido medido); C2 item 3(c)-(e); C3
   item 3 (sempre nota). O orquestrador pode fixar outra leitura antes do disparo.
2. **Forma não recusada sem escape medido.** A regra do dono é "qualquer view"; a R3 chama de grave o "escape medido". Os corpos mandam
   o jurado medir a variante explorável da mesma forma (dono superusuário + privilégio ao leitor) para graduar: se ela vaza, grave e
   não-convergência; se a forma por construção não lê nem grava dado, `ajuste`/não grave.
3. **Falso positivo no banco de hoje.** Pelo contrato é não grave (fail-closed), mas falsifica a premissa do dono ("hoje há 0 views;
   nenhuma funcionalidade quebra"). Acrescentei o campo `sinal_ao_dono` ao voto da C1 e da C3 (não existia nos moldes).
4. **"Cadeia" da C1.** O T8e/T14d do head não têm caso de cadeia (ela vive no T8d, com as duas views de dono `postgres`). O corpo define
   a cadeia como V (dono comum) → W (dono `postgres`) → T e manda o jurado escrever o resultado esperado antes de medir.
5. **"Boot real" tem dois sentidos.** Na C1 é a função `assertRuntimeDatabaseRoleIfEnforced({ enforce: true, loadClient })`, como o
   planejador mediu no C4.1; na C3 é o processo `src/server.ts` em produção, com e sem a variável — o caso que o T15 nunca exerceu.
6. **Formas próprias candidatas (C1, item 1(c)), não executadas.** Entre elas, uma regra `INSTEAD` **em view** que grava na tabela FORCE
   (dentro, pela leitura da fábrica: é a árvore da view em `pg_rewrite`; o jurado tem de justificar) e uma view `TEMP` de outra sessão.
   Escape que existe também sem view (herança/partição lida direto, tabela estrangeira em laço) fica fora do ponto.
7. **B7 só com `log_statement=all`.** O C4.6 nomeia só essa configuração; o ciclo 3 usava duas. O corpo segue o C4.6.
8. **Divergências declaradas pelo dev** (comentário-cabeçalho da linha final do script; título do T8c; comentário da trava em l.1-12 e não
   l.1-11; prefixo `dev05c4-`) e o commit `a10fc267` ("esqueleto do relatório do dev", entre o disparo e o primeiro commit de código):
   postos para a C2 classificar no item 3, sem juízo prévio.
9. **Modelo no Codex.** Os corpos do ciclo 3 admitiam GPT-6 Astra (pelo C3.5). Pela `D-FABLE-ASTRA-SO-DINHEIRO`, fora de dinheiro o
   Codex roda `gpt-5.6-sol`; os corpos do ciclo 4 aceitam Sol, declarado, se o invocador usar o Codex (o C4.6 prevê Claude).
10. **Trilha ainda não escrita no disco lido:** a ata `J-B-SAN3-05.md` só vai até o ciclo 2 e não há `R-B-SAN3-05-3.md`. Os corpos citam
    a ata e os `R-B-SAN3-05-*.md` de forma genérica.
11. **Objeto do dev × objeto da junta.** Os corpos commitados depois do `737e8cf3` mudam o head. Os corpos mandam publicar
    `git diff --name-only <objeto do dev> <objeto>` (só registro do orquestrador).

## Próximo passo (do orquestrador, não da fábrica)

Medir o md5 EOL-neutro dos três corpos; `node scripts/sync-agent-agents.mjs`; `git add -f` nos dois espelhos; commit e push no ramo
**depois** do `737e8cf3`; esperar os check-runs do head novo; mandatos forma A com pré-voo (HC = H0); inspetor de terreno da junta 4
(instância nova) antes da primeira cadeira; decidir, se quiser, as leituras 1–3 antes do disparo; registrar os três agentes criados no
relatório da PR #405.

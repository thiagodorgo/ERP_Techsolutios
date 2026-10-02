# J-B-GOV-PAUSA (PR #397) — ciclo 1

- **Objeto julgado:** `67c2c280612cb644f246af0b5410cab59afe028d`, resolvido **independentemente pelas três
  cadeiras** (`git rev-parse` cruzado com `gh pr view 397 --json headRefOid`, no início e no fim de cada voto).
  Nenhuma viu o head andar.
- **approved_head:** `67c2c280612cb644f246af0b5410cab59afe028d`
- **Base:** `origin/main` em `5b6e1036` (#396), igual ao merge-base do objeto. **CI no objeto:** 14/14 `success`,
  0 não-verdes, 0 pendentes — medido pelo orquestrador às 13:39 local, pelo inspetor e pela C3.
- **Quórum:** maioria de 3, sem veto, sem crítico (§C7.1-ter(b): o bloco não toca dinheiro, segurança, permissão
  nem perda de dado — diff em `src prisma frontend mobile .github tests scripts infra` = 0, conferido pelo inspetor).
- **Inspetor de terreno (§C7.1-bis):** `LIBERADO COM RESSALVA` — 0 bloqueios, 4 ressalvas: R1 o diretório de
  agentes da sessão não registra os corpos das cadeiras → cada cadeira rodou como `general-purpose` lendo o corpo do
  objeto, com md5 conferido e obediência às `tools` do corpo; R2 resíduo alheio inerte, reportado e não varrido; R3
  (para a C1) `w-devt4` com porcelain 0; R4 a colagem do `refs` dos 4 mandatos da junta nomeia `ed61f998`, o commit
  que os versiona é o objeto. Parecer em Fable 5.1, corpo de `origin/main` (`de80b2a9…`), mandato `d264e3ec…`.

## VEREDITO: **APROVADO — 3 × 0**

| cadeira | identidade | md5 EOL-neutro do corpo | mandato_md5 | modelo | voto | achados |
|---|---|---|---|---|---|---|
| C1 — fidelidade da transcrição | `jurado-pausa-c1-fidelidade-transcricao` | `5107a493df8cc8e0582d95127521809a` | `75c80a58…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 2 ajuste · 2 nota |
| C2 — consistência normativa e espelho | `jurado-pausa-c2-consistencia-normativa-espelho` | `facd19fd5c1a6ab892d08fb61c4dfc23` | `becd53d8…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 4 nota |
| C3 — escopo, registro e KPI | `jurado-pausa-c3-escopo-registro-kpi` | `06172f527763ae5c71e1e2d56a5fd8a8` | `6bb2ccfd…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 1 nota |

Disparo pelo P5 (no máximo 2 jurados em paralelo): C1 e C2 juntas às 15:30 local; C3 quando a C2 concluiu. Cada
cadeira em worktree próprio de caminho curto (`w-jur-pz1/2/3`, removidos por elas), sem ler os votos umas das outras
(as três declaram). **Primeira junta sob P7:** nenhuma PAUSA foi recebida. **Quedas:** nenhuma na junta
(`votos/B-GOV-PAUSA/00-quedas.md` vazio). Nenhuma substituição de modelo.

Evidência completa em `agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/` — `C{1,2,3}-evidencia.md`,
`C{1,2,3}-voto.json`, `00-inspetor-terreno.md`, `00-quedas.md` e os mandatos de cada papel em `00-mandatos/`.

**Exceção declarada ao `git diff --check` (precedente #395):** `C2-evidencia.md` l.106, 107 e 109 terminam em espaço
(linhas de saída de ferramenta coladas pela cadeira) e `C3-evidencia.md` tem uma linha em branco no fim. Ficam, porque a
evidência entra byte a byte; nenhuma outra violação no commit (conferido filtrando a saída do `--check`).

## O que cada cadeira mediu (resumo, com o número)

- **C1:** as quatro versões das palavras do dono (`decisoes.md`, corpo, plano, briefing) iguais em conteúdo; **307**
  proposições geradas do diff (247 sem o espelho), cobrindo 205 das 206 linhas acrescentadas (a 206ª é linha em
  branco); nenhuma muda o que o dono decidiu; T-01…T-17 e T-18…T-24 (a emenda E2, só o commit `f8b787de`)
  casadas com proposição; os cinco vermelhos-controle acusaram.
- **C2:** espelho `CLAUDE.md` × `AGENTS.md` por hunks e pelo item 7 inteiro com borda provada; modelo de mandato
  idêntico nos três lugares; lista própria de lugares vivos cruzada com o plano nos dois sentidos; destino de cada
  sujeito de P7 na ref; "pare" fora dos exemplos de pausa.
- **C3:** 28 arquivos do diff dentro das 23 entradas do §7 do plano, nada na lista proibida; 6 corpos no objeto,
  `sync --check` 29; KPI: `blocks_completed` 169 = `origin/main` 168 + 1, `pr 397`, `merge_commit`/`approved_head`
  `null` na autoria, history append puro (164→165), `kpi-freeze --check` e `node --check` ec=0, guards 17/6/6;
  pendências pelo gerador (hash-object = blob); `decisoes.md` +84 −0; `diff --check` ec=0; precedente medido na
  `main`: 10 de 12 PRs que mexeram no `CLAUDE.md` tocaram `Kpis/`, e os 4 PRs de governança recentes com junta
  contaram bloco.

## Os ajustes (não reprovam; viram pendência com dono)

Os dois são da C1 e atingem o texto **que o orquestrador escreveu** (E1). Quem escreveu não emenda (§C7.4-bis): ficam
como pendência com dono, no precedente do #394 (os ajustes C1-A1/C1-A2/C2-3-1/C3-A1 daquela junta foram para o
`B-GOV-CICLOS-RESIDUAIS`).

- **C1-A1 (ajuste, dentro-do-bloco):** 61 elaborações de E1 (27 acréscimos, 34 derivações) aparecem sob o rótulo
  "Decisão." da entrada `D-PAUSA-GRAVA-E-PARA`, sem marca de que são do transcritor — o contrato proíbe apresentar
  derivação como declaração (§C7.6-bis, `CLAUDE.md:520`). A emenda E2 declarou as suas (T-18…T-24); as de E1, não.
  → `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR`, dono `B-GOV-CICLOS-RESIDUAIS` (mesma classe do #394).
- **C1-A3 (ajuste, dentro-do-bloco):** o caso do Dev-T4 é chamado de "medido" em `decisoes.md:2845` e
  `PROTOCOLO-JUNTA-RESILIENTE.md:106`, mas nenhum arquivo rastreado narra o evento, e ele aparece com dois números
  (~20–40 min e ~30 min). O traço físico (`w-devt4` sujo) não é mais mensurável (porcelain 0 desde a retomada).
  → `P-GOV-PAUSA-CASO-SEM-FONTE`, dono: o PR de registro que versiona o porteiro do #397 (rastreia o caso pela trilha
  da sessão ou rebaixa a palavra "medido").

## Notas (7 no total; as que têm consequência)

- **C1-A2:** `PROTOCOLO:84` põe entre aspas uma paráfrase da ordem do dono. **C1-A4:** a exclusão de jobs sem modelo
  aparece sem a qualificação "de uma pausa de tokens" em `terreno:94–95` e `decisoes.md:2851`.
- **C3:** o campo escopo da `P-GOV-PAUSA-ESCADA-C76BIS` não usa o vocabulário da casa (`dentro-do-bloco` /
  `pre-existente`).
- **C2 (4 notas):** sem consequência de mérito; detalhe no voto.
- **Informativo (C3):** o #397 conflita com o #393 em 7 arquivos (os 4 de `Kpis/`, `pendencias.md`,
  `pendencias-indice.md`, `status-geral.md`); os dois publicam `blocks_completed` 169 — quem mergear segundo
  **reconta** para 170. **Informativo (C1/C2):** o texto usa "para" também no sentido de interrupção feita pelo
  orquestrador (`CLAUDE.md:576`, `602`); a tensão do §C3.1 com `Kpis/index.html` é anterior ao bloco.

## §C7.4-bis — quem ocupou cada papel

| papel | identidade | modelo |
|---|---|---|
| autor do texto (E1) | o orquestrador | Opus 5.5 (a sessão) |
| plano e briefing | `planejador-b-gov-pausa` | Fable 5.1 |
| emenda E2/E2c/E3/E4 | `dev-pausa-emenda` | Opus 5.5 |
| corpos das cadeiras | `agente-fabrica` | (frontmatter) |
| inspetor de terreno | `inspetor-de-terreno-da-junta` (instância nova; `general-purpose` com o corpo de `origin/main`) | Fable 5.1 |
| C1, C2, C3 | as três identidades acima | Opus 5.5 |

(a) A composição cobre a competência dos achados (fidelidade · norma/espelho/mecanismo · escopo/registro/KPI). (b)
Quem achou não consertou: o autor do texto não emendou nem votou; os ajustes da C1 vão para dono que não é a C1 nem o
autor. (c) Dado podre: nenhuma cadeira herdou número do plano, do briefing ou do PR como fato (as três declaram).

## O que o orquestrador faz com os ajustes

Abre `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` e `P-GOV-PAUSA-CASO-SEM-FONTE` no PR de registro seguinte ao merge (o que
versiona o parecer do porteiro e paga o backfill de `merge_commit`/`approved_head` deste PR) — não neste PR, para que o
objeto aprovado e o mergeado difiram só pelo registro da própria junta (esta ata, os votos e o parecer do inspetor).

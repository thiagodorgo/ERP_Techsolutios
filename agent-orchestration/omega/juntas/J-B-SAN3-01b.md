# J-B-SAN3-01b (PR #402) — ciclo 1

- **Objeto julgado:** `cdf370dcb4c817e1c4292aed1204140951616971`, resolvido **independentemente pelas três cadeiras**
  (`git` cruzado com `gh pr view 402 --json headRefOid`). A C2 conferiu o objeto também no fim do voto: não andou.
- **approved_head:** `cdf370dcb4c817e1c4292aed1204140951616971`
- **Base:** `origin/main` em `4ab9d232` (#399), igual ao merge-base do objeto (conferido pela C2). **CI no objeto:**
  14/14 `success`, medido pelo orquestrador às 21:22 UTC antes do disparo.
- **Código do bloco:** termina em `b02745b7`, o fechamento do dev de nuvem. Os commits depois dele são só registro da
  junta (conferido pelo inspetor na segunda passada e pelas três cadeiras).
- **Quórum:** unanimidade de 3 (§C7.1-ter(b): o bloco toca permissão e protege contra perda de dado). Sem crítico.
- **Inspetor de terreno (§C7.1-bis):**
  - **1ª passada: `BLOQUEADO`**, por um único item, o 3.1. O `coordenador-de-acessos` achou o C2-05 (o botão "Nova OS"
    sem gate) na junta do `B-SAN3-04a`, e este bloco fecha essa pendência. Remédio nomeado pelo plano (seção 10):
    identidade nova pela `agente-fabrica`.
  - **2ª passada: `LIBERADO COM RESSALVA`**, pela mesma instância, depois do remédio. A ressalva forte P2-R1 foi a forma
    de disparo da C2 (agente geral com o corpo do objeto, md5 conferido na 1ª linha da evidência), cumprida. P2-R2 a
    P2-R7 entraram no briefing. Pareceres em Fable 5.1, corpo de `origin/main` (`de80b2a9…`).

## VEREDITO: **APROVADO — 3 × 0**

| cadeira | identidade | md5 EOL-neutro do corpo | mandato_md5 | modelo | voto | achados |
|---|---|---|---|---|---|---|
| C1 — enumeração e mutação | `guardiao-fail-closed` | `5b0f7f5d31df366b69ac2cc8c113e963` | `bc98b2d0…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 1 ajuste · 1 nota |
| C2 — cadeia de acesso | `jurado-san3-01b-c2-cadeia-de-acesso` | `14a07abc81f8e0f37db1b584129c588c` | `5bbd674c…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 3 nota |
| C3 — tela e linguagem | `cognicao-visual` | `59632cb92550e620320a2ec896188e3d` | `3ca69077…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 1 nota |

O voto da C1 está gravado como `A FAVOR`; a ata o lê como `APROVADO`. Disparo pelo P5: C1 e C2 juntas às 21:23 UTC; C3
quando a C2 concluiu. Cada cadeira em worktree próprio (`w-j01bc1/2/3`), sem ler os votos umas das outras. **Quedas:**
nenhuma cadeira caiu; o inspetor caiu duas vezes por limite de sessão da conta e foi retomado como a mesma instância
(`votos/B-SAN3-01b/00-quedas.md`). Nenhuma substituição de modelo nos gates.

Evidência completa em `agent-orchestration/omega/juntas/votos/B-SAN3-01b/`: `C{1,2,3}-evidencia.md`,
`C{1,2,3}-voto.json`, os dois pareceres do inspetor, `00-quedas.md`, o relatório da fábrica e os mandatos em
`00-mandatos/`.

**Exceção declarada ao `git diff --check` (precedentes #395 e #397):** `C2-evidencia.md` tem nove linhas que terminam em
espaço (saídas coladas pela cadeira). Ficam, porque a evidência entra byte a byte; nenhuma outra violação no commit.

## Divergências declaradas (§A2), registradas aqui de novo

- **O corpo da C2 nova está no diff do PR** (`.claude/` e `.agents/`), que o §6 do plano proíbe ao dev. É ato de
  registro do orquestrador, com precedente no `B-SAN3-04a` (`aadaa6d5`). A C1 julgou o A16 sobre o diff do
  desenvolvimento.
- **O corpo da C2 fixa `model: opus`**, como os seis jurados de identidade nova da `main`.
- **O método da C2 troca o login real do `coordenador-de-acessos`** pelo do plano (catálogo executado mais leitura do
  blob), porque o bloco não tem premissa de banco.

## Ajustes e notas (viram pendência no registro pós-merge, não reprovam)

- **A-C1-01 (ajuste, dentro do bloco):** `release.pr` e a entrada nova do `kpis-history.json` ficaram `pr: null` com o
  PR #402 já criado. Não altera número; o §C3.5 manda o backfill pós-merge preencher `pr`, `merge_commit` e
  `approved_head`.
- **N-C1-01 (nota, pré-existente desde `83a3c68c`, 2026-09-19, `B-SAN3-01`):** a origem de mock é decidida por convenção de
  nome; um módulo de dado de demonstração fora da convenção nasce classificado como real.
- **C2, nota dentro do bloco:** a prova do gate é extensional sobre o catálogo de hoje. A propriedade "régua = inclusão
  estrita" está provada por parse e por sonda, não pelo catálogo.
- **C2, nota pré-existente (classe `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`, dono `B-SAN3-06a`):** depois da
  troca de organização, o conjunto de permissões comparado na página não é o da organização ativa.
- **C2, nota pré-existente (dono `B-SAN3-06c`):** outro botão "Nova OS" sem gate existe em `DashboardPage.tsx`, fora da
  página do bloco.
- **C3-N1 (nota, pré-existente desde 2026-08-04, PRs #331 e #332):** o cabeçalho da lista de OS diverge da referência
  visual e do protótipo.

## §C7.4-bis — quem ocupou cada papel

| papel | quem |
|---|---|
| quem achou os defeitos que o bloco fecha | `jurado-san3-01c2-fail-closed-web` (A-01 a A-03), `master-teste-telas-rotas` (C2-N5), `coordenador-de-acessos` (C2-05) |
| quem planejou | `planejador-mestre`, instância 2 (Opus, fallback declarado no plano) e instância 3 (Fable) |
| quem desenvolveu | `dev-b-san3-01b`, sessão de nuvem (Fable 5.1, declarado no `DEV-relatorio.md`) |
| fábrica | `agente-fabrica`, instância nova (Opus): o corpo da C2 |
| inspetor | `inspetor-de-terreno-da-junta` (Fable 5.1), duas passadas pela mesma instância |
| cadeiras | C1, C2 e C3 da tabela acima |
| orquestrador | registro, mandatos, briefing, versionamento do corpo; **não escreveu código do bloco** |

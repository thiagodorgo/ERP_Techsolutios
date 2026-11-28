# Ata da junta J-649 — B-EVIDENCIA-DURAVEL (PR #649)

Redigida pelo orquestrador em 27/11, às 21:45 (São Paulo). Vai ao repositório no PR de registro do dia.

## Objeto e nível
- **Objeto julgado:** `4bd71f45c` (ramo `fix/evidencia-duravel`). O CI dele estava verde nas duas rodadas, `46078573540` e `46078817479`.
- **Conserto único:** `035a15121`, CONFERIDO pelo `conf-649-qw`, com CI verde nas rodadas `46085003544` e `46085008182`.
- **Junção da main:** o merge `170865a76` (o #648 entrou antes), verificado pelo orquestrador em `ver-649-main-cl.md`.
- **Nível:** junta completa. O bloco muda o armazenamento de evidência (perda de dado) e a trava de boot de produção. O quórum é unanimidade de 3, com veto (§C7 item 10).
- **Cruzamento (§C7 item 11):** o código é do Claude (`dev-evidencia-cl`, Opus). Nenhuma cadeira é Claude (`base-jevidencia.md:14`).

## Votos
| Papel | Identidade | Modelo | Veredito | Achados |
|---|---|---|---|---|
| Pré-revisão | `prerev-evidencia-cx5` | Codex GPT-5.6 Sol (conta 5) | SEGUE | 1 baixa dentro do bloco, 1 média pré-existente |
| Inspetor | `insp-evidencia-dp` | DeepSeek v4 Pro | LIBERADO COM RESSALVA (2 ressalvas nomeadas, nenhuma bloqueante) | — |
| C1: armazenamento, falha, blob do app e contrato B-107/B-108 | `jc1-evidencia-qw` | Qwen 4 Max | APROVA | C1-01 e C1-03 não graves, dentro do bloco; C1-02 não grave, pré-existente |
| C2: a trava de boot | `jc2-evidencia-cx` (conta 3), continuado pelo `jc2-evidencia-cx-c2-r1` (conta 2), por P3 | Codex GPT-5.6 Sol | APROVA | C2-01 a C2-03 não graves (desvios literais) |
| C3: regressão, escopo, censo e registro | `jc3-evidencia-gm` | Gemini 4 Argon | APROVA; CONFERIDO pelo orquestrador às 20:36:35 (amostragem) | 0 |

**Resultado: 3 a 0, APROVA** (20:48). Os votos e a evidência de cada cadeira ficam em `votos/`.

## Triagem (fluxo rápido, §C7 item 10(3))
- **Consertar na mesma leva:**
  - C1-01: o teste do segmento vazio, com a mutação MC2;
  - C1-03: o evento `evidence.upload.storage_failed` na documentação.
- **Pendência:** C1-02, pré-existente: o saneador da trilha sem `key`, `prefix`, `fileurl`, `endpoint` e `arn`.
- **Só registro:** C2-01 a C2-03 e PR-01.

## Conserto e conferência
- **Conserto único:** `dev-evidencia-cl` (Claude Opus), que não achou. O head ficou em `035a15121`, com 4 arquivos: o teste, o documento, as pendências e o índice. O `git diff -- src` ficou vazio.
- **Conferência:** `conf-649-qw` (Qwen 4 Max), que não consertou, deu **CONFERIDO** às 21:29. O E19 está verde e fica vermelho com a MC2 literal. O evento está na documentação. O CI foi lido job a job.

## A junção da main
- **Quem juntou:** `dev-649-main-qw` (Qwen 4 Max).
- **Quem verificou:** o orquestrador (Claude), de outra casa. O merge não tem conteúdo próprio fora dos 3 arquivos de registro. Nenhuma linha some, e o índice é a saída do gerador.

## Papéis (§C7.4-bis)
- **Quem achou:** a C1 (`jc1-evidencia-qw`).
- **Quem planejou:** `plan-evidencia-duravel` (Claude Fable), com a Emenda 1. A triagem foi do orquestrador.
- **Quem consertou:** `dev-evidencia-cl`.
- **Quem conferiu:** `conf-649-qw`.

O ciclo não está contaminado: quem achou não consertou.

## Quedas
- `jc2-evidencia-cx`: a conta 3 bateu o limite depois de um `apply_patch` que falhou. A medição estava completa, e o voto, no esqueleto. A continuação na conta 2 reexecutou por amostragem (P3: as 3 amostras deram iguais) e gravou o voto. Custo do redo: a continuação rodou de 20:44 a 20:48:51 (o registro de lançamento e o `fim` do status), cerca de 5 min.

## Merge
Squash, com `--match-head-commit` no head final, pela autonomia de junta (§C7 item 1), com o CI do head verde em todos os jobs. Depois vêm o porteiro e a limpeza pós-merge (o worktree `w-evid` sai ANTES do merge, por causa da lição do #648).

---

**Nota do PR de registro #654, acrescentada no conserto (`reg-2711b-fix-qw`) pelo achado H1 da revisão `rev-654-cl` — NÃO é texto da ata:** a ata acima foi transcrita para o repositório sem mudança de texto. As fontes que ela cita em forma RELATIVA ficam **FORA do repositório**, no diretório de revisões do orquestrador, em `~/erp-pausa-2026-10-03/revisoes/mobile/junta-evidencia/`: os votos e a evidência de cada cadeira (`votos/`); a base do cruzamento citada na seção "Objeto e nível" (`base-jevidencia.md`, inclusive a linha 14, que é de onde vem o "nenhuma cadeira é Claude"); a verificação da junção da `main` (`ver-649-main-cl.md`); a conferência do conserto (`conf-649-qw.md`); a pré-revisão (`prerev-evidencia-cx5.md`); os mandatos (`mandato-inspetor.md`, `mandato-prerev.md`, `mandato-C1.md`, `mandato-C2.md`, `mandato-C3.md`) e as sondas (`sondas-insp/`, `sondas-prerev/`, `sondas-c1/`, `sondas-c2/`, `sondas-c3/`). A pasta `agent-orchestration/omega/juntas/votos/` do repositório guarda votos de OUTRAS juntas: medida no head `41abc1320`, ela tem **0** entrada desta junta, então o `votos/` citado acima não é o do repositório.

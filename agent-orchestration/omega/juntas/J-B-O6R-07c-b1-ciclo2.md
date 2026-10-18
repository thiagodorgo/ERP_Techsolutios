# J-B-O6R-07c-b1 — junta do ciclo 2 (2026-10-18) · PR #440, o despacho grava a atribuição com uma trava única por OS (último P0, `Ω6R-SEC-002`)

- **Objeto:** `7ff1e0039c07b22b84acf8007eef6835560e823a`. É o head do PR com o conserto do ciclo 2 (`fd04b594`), a `main` integrada (`b14478ab`) e os corpos das 3 cadeiras nos dois espelhos. CI 14/14 concluída e verde.
- **Régua:** bloco de PERMISSÃO, junta completa, unanimidade de 3 com veto. **Ciclo 2: o último em que `bloqueia` não grave reprova** (§C7 item 8(2)).
- **Plano do ciclo 2:** `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md`, de `planejador-07cb1-ciclo2` (Fable, auditoria de topo da reprovação do ciclo 1).
- **Inspetor de terreno:** `inspetor-07cb1c2-cdx` (Codex GPT-5.6 Sol, nível menor, troca de executor declarada), **LIBERADO** (`votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-parecer.md`).
- **Mandatos:** forma A, pré-voo OK 4/4 (`votos/B-O6R-07c-b1-ciclo2/00-mandatos/`), redigidos por `redator-07cb1c2-cdx` (Codex). Toda conclusão do ciclo 1 está marcada como A RE-VERIFICAR (§C7.1-bis).
- **Corpos das cadeiras:** vêm do blob do objeto. O md5 EOL-neutro foi conferido pelo inspetor e por cada cadeira. S0: `sync-agent-agents.mjs --check` OK, 61 agentes.

## VEREDITO: APROVADO (3 × 0)

| cadeira | identidade que votou | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 trava única e RBAC | `jurado-07cb1c2-c1-cdx` | Codex, GPT-5.6 Sol médio | **APROVADO** | — |
| C2 transação e compensação | `jurado-07cb1c2-c2-opus` (sucessor P3 de `jurado-07cb1c2-c2-cdx`) | Claude Code, Claude Opus 5.5 | **APROVADO** | — |
| C3 censo, escopo e regressão | `jurado-07cb1c2-c3-opus` | Claude Code, Claude Opus 5.5 (reserva declarada, `D-IAS-EXTERNAS-PRIMEIRO`) | **APROVADO** | — |

**O que as cadeiras mediram por execução:**
- **C1, grade própria no app real em memória:** 5 estados × 8 vias × 3 papéis = 120 células, mais 8 controles positivos, 2 composições e 5 células de alocação: 135/135. O censo achou 2 portas autoritativas de escrita e nenhum escritor fora de `WorkOrderService.assertTechnicianChangeAllowed`.
  - O objeto do ciclo 1 falha 70 testes da fatia da trava, inclusive web e lote.
  - Mutações: MT1 a MT5 dão 37, 16, 12, 31 e 8 falhas; MT6 e MT7 dão 1 falha cada, a da MT7 exatamente em `operator`.
  - Conclusão: a trava "No local" (`D-INICIO-ATENDIMENTO-CONFIRMADO`) recusa toda troca de técnico antes de escrever, preserva o no-op e cobre a via web, o lote e o despacho.
- **C2, transação e compensação (no Postgres, 6 caminhos de atribuição × 2 pontos de falha):**
  - Nenhum caminho deixa escrita parcial. A compensação do despacho é completa, e o evento `work_order_assigned` grava na mesma transação.
  - O objeto do ciclo 1 e a MT9 deixam a OS atribuída sem evento, e as sondas acusam. A MT8 e a MT10 são acusadas.
  - Sob papel sem bypass, o RLS envolve os dois métodos e o isolamento entre as organizações A e B se mantém.
  - Evidência sem OS: para tenant_admin e manager, uma OS de outra organização é indistinguível de uma OS inexistente.
  - O roteiro do Codex caído foi re-executado e confere: 13/13, ciclo 1 8/5, MT9 9/4.
- **C3, censo, CI e escopo:**
  - O censo é byte-idêntico ao que o gerador produz, e o T14/T11 tem vermelho provado.
  - CI 14/14. Nenhum teste sumiu da suíte. O `-db` roda com banco.
  - O diff do ciclo 2 está dentro do PERMITIDO, com 3 arquivos extras declarados pelo dev antes da junta. Esses 3 mantêm as mesmas asserções (24/37/56); nenhuma foi removida.
  - O PROIBIDO está intacto, e os espelhos estão consistentes.

**Ajustes (não reprovam; o dono é o orquestrador):**
- **C3c2-A1:** o corpo do PR citava a migração `20260874…` (a do objeto é `20260877000000_…`), números do ciclo 1 (39/39, 7/7, "3397 testes, 2 falhas") e a pergunta 1 em `on_route`, já superada por `D-INICIO-ATENDIMENTO-CONFIRMADO`. Também não descrevia o ciclo 2. **Tratado antes do merge:** o corpo foi reescrito com os números do head.
- **C3c2-A2:** K2, `RESIDUAL-BACKFILL` e as 6 pendências da §1.5/§2.5 do plano ainda não estão em `controle/pendencias.md`. Entram por APPEND no PR de registro.

**Notas:**
- **C2:** o `-db` roda como superusuário. Sem o wrapper `withTenantRls` em `assign`, ele fica verde 13/13; é o único critério incapaz de falhar. A omissão é acusada pelo ratchet `san3-05-acessos-de-plataforma-guard` (ec 1, que nomeia a chave), e esse ratchet roda no job `backend` da CI. Escopo pré-existente.
- **C3:**
  - O relatório do dev foi gravado como seção de `B-O6R-07c-b1-dev.md`, e não no nome do plano.
  - Com o T14 novo, a M25 do ciclo 1 acende o T11 e também o T14, o que é coerente.

**Pendências aceitas, com dono `B-O6R-07c-b2` e já registradas:**
- `P-07CB1-CANCELAR-EM-NO-LOCAL`;
- `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO`;
- K2 depois de reinício;
- CA6/CA7, o superior autoriza a troca.

## Terreno, quedas e substituições (P6, `votos/B-O6R-07c-b1-ciclo2/00-quedas.md`)
- **C2:** o Codex (`jurado-07cb1c2-c2-cdx`) caiu no limite de uso às 19:41Z, com 13 linhas de evidência e o voto "EM APURAÇÃO". O orquestrador removeu o container `j07cb1c2-c2-pg` pelo nome. O sucessor Opus, com identidade nova, re-executou o roteiro registrado com saída igual e mediu a cauda.
- No Docker, nunca houve mais de 2 trabalhos ao mesmo tempo. A base viva `erp-*` não foi tocada.
- `git diff --check` acusa espaço no fim da linha do AVISO do pré-voo nos 4 mandatos e uma linha em branco no fim de `c1-evidencia.md`. Os arquivos foram commitados byte a byte, sem retoque, porque o md5 que o inspetor e as cadeiras conferiram é o dos arquivos como estão. A CI não cobra `diff --check`.
- Teardown das 3 cadeiras: mutações restauradas por hash, `git status` vazio, containers `j07cb1c2-*` e worktrees removidos.

## Separação de papéis (§C7.4-bis)
- **Quem achou no ciclo 1:** C1 e C3.
- **Quem planejou o ciclo 2:** `planejador-07cb1-ciclo2` (Fable).
- **Quem desenvolveu o ciclo 2:** `dev-07cb1-ciclo2-opus`.
- Nenhum deles votou neste ciclo. A inelegibilidade foi conferida por nome pelo inspetor.

**Próximo:** merge do #440 com a CI verde, porteiro pós-merge, P0 = 0, e o marco de KPI pelo loop. O dono é o `B-O6R-07c-b2`, com as 4 pendências acima.

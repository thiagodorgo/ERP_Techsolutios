# R-B-TRC-01 — ciclo 2 (2026-10-18)

**Entrega:** B-TRC-01, PR #426 — o Traccar em dev com ingestão privada e quarentena.
**Junta (segurança, completa):** inspetor de terreno · guardião de banco (migração `20260876`, APROVA) · 3 cadeiras, unanimidade com veto. Ata: `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo2.md` (objeto `2043c584`).

## Veredito do ciclo 2: REPROVADO (2 × 1)
- **(a′) RLS, banco e CI** (`jurado-trc01c2-a-cdx`, Codex) → **APROVADO**, com 1 ajuste: o comentário do `ci.yml` diz 363 e o job executa 389.
- **(b′) escopo, superfície e trava** (`jurado-trc01c2-b-opus`, 4º ocupante, sucessor P3) → **APROVADO**, com 5 notas.
- **(c′) viatura no tempo** (`jurado-trc01c2-c-opus`) → **REPROVADO**, 1 bloqueio dentro do bloco, não grave: **P1**, a OS que tinha a viatura no instante do fix e depois a perdeu sai da janela, e o caso ambíguo grava 204 no trajeto do outro técnico em vez de ir à quarentena.

## Auditoria de topo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`)
`planejador-trc01-ciclo3` (Fable):
- o P1 é **defeito real**, classe **não grave confirmada**: mesma organização, sem permissão, sem dinheiro; é uma atribuição errada recuperável;
- o **dado podre** estava no plano do ciclo 2, que enunciou a janela só pelo lado de quem ganha a viatura;
- a classe repetiu, com informação nova.

Plano: `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md`, com o conserto mínimo e sem migração.

## Ordem do dono para o ciclo 3
*"ataque so a c"* (18/10): o ciclo 3 conserta SÓ o (c′)-P1. As notas da (a′) e da (b′) viram 12 pendências com dono (§4 do plano do ciclo 3), que o orquestrador registra no PR de registro.

## Separação de papéis (§C7.4-bis)
- **Quem achou:** a (c′).
- **Quem planejou o ciclo 3:** `planejador-trc01-ciclo3` (Fable).
- **Quem desenvolveu o ciclo 3:** `dev-trc01-c3-opus`, que não é nenhuma das cadeiras e cobriu porque as IAs externas estavam ocupadas ou sem limite (`D-IAS-EXTERNAS-PRIMEIRO`).

## Ação
Ciclo 3 com 3 cadeiras de identidade NOVA. **No ciclo 3 só defeito de produto GRAVE reprova** (§C7 item 8(2)); o resto vira pendência e o bloco mergeia.

# J-B-SAN3-05 — junta do B-SAN3-05 (PR #405), o papel de runtime não contorna o RLS

## Ciclo 1 — junta 1 (2026-10-04)

- **Objeto julgado:** o head do PR 405 resolvido por cada cadeira (`5ab037a3` no fim; o delta desde `6f53d11b` é só registro);
  7/7 check-runs verdes, inclusive `docker`.
- **Inspetor:** primeiro **BLOQUEADO** (B1: sem `psql` 16 no PATH dos jurados; T14a/b falhavam com "psql: ausente"); o
  orquestrador proveu o terreno (imagem local `erp-junta-node20-pg16:local` com o `psql` 16.14 real e a receita
  `receita-pg16.sh`, em `C:/Users/AMP/erp-terreno/`, provada 19/19 com controle 17/19 sem `psql`); na reavaliação,
  **LIBERADO COM RESSALVA** (R1–R8; R7: o teste da trava intermitente, 2/6). Parecer: `votos/B-SAN3-05/00-inspetor-terreno.md`.
- **Quórum:** unanimidade de 3 com veto (segurança e permissão); §C7 item 8 (`D-GOV-PROPORCIONAL`): teto de 2 ciclos; KPI
  congelado e não cobrado.

## VEREDITO: REPROVADO (3 × 0)

| cadeira | identidade | modelo | voto | bloqueia | ajustes |
|---|---|---|---|---|---|
| C1 | `agente-dba-guardiao` | Opus 5.5 | **REPROVADO** | **A2** — o teste T14 dá vermelho em 2 de 9 rodadas porque o script grava no catálogo fora do `withRoleCatalogLock` (mecanismo reproduzido em 14/30 contra 0/30 sem escritor concorrente); **A4** — o MODO 0 não cobre `log_transaction_sample_rate` nem `log_min_duration_sample`, e a senha nova vai para o `server.log` | A1 (a troca do T8d por `pg_create_physical_replication_slot`), A3 (view aninhada) |
| C2 | `agente-secops` | Opus 5.5 | **REPROVADO** | **F-C2-01** — a mesma falha do MODO 0, medida 3 vezes: com amostragem de log ligada, a senha nova vai em claro ao log do servidor | F-C2-02 a F-C2-04 (T15 sem o caso de produção sem a variável; T15 sem `exitCode` e com `kill` fora de `finally`; guarda de host literal no T9) |
| C3 | `guardiao-fail-closed` | Opus 5.5 | **REPROVADO** | **C3-F1, C3-F1b, C3-F2** — o ratchet do gerador novo trata o acesso que não reconhece como ausente (inclusive relação aninhada, que o plano não declara residual) — pela regra F2 do plano, defeito do gerador; **C3-F3** — a superfície T11 do bloco | — (o 3º item da linha C3 aprovado) |

Evidências e votos em `votos/B-SAN3-05/C{1,2,3}-evidencia.md` e `C{1,2,3}-voto.json`. Cadeiras uma por vez no Claude em Opus.

**Defeito de segurança real, achado por duas cadeiras independentes:** a senha do papel de runtime pode ir em claro para o log do
servidor quando a amostragem de log está ligada (A4 = F-C2-01).

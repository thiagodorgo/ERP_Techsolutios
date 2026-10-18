# B-TRC-01 ciclo 2 — parecer R-DBA

- Instância: `dba-trc01-c2-cdx`
- Papel: Guardião de Banco, pré-requisito da junta; não vota e não conserta
- Modelo: `Codex GPT-5.6 Sol`
- Esforço: `médio`
- Nível: `menor (§C7.6)`
- PR: `#426`
- Objeto julgado: `2043c5840c8f60fe91538840aaefb3420a11cfe3`

## Veredito

## APROVA

Atuo como a identidade nova `dba-trc01-c2-cdx`, Guardião de Banco do ciclo 2 do bloco `B-TRC-01`, PR `#426`,
modelo declarado **Codex GPT-5.6 Sol**, esforço **médio**, nível **menor (§C7.6)**. Este é o parecer **R-DBA**,
pré-requisito da junta; **não voto na junta e não conserto**.

## Objeto e autorização

O objeto julgado foi exclusivamente `2043c5840c8f60fe91538840aaefb3420a11cfe3`, em worktree próprio detached. A
migration avaliada foi
`prisma/migrations/20260876000000_work_orders_vehicle_assigned_at/migration.sql`, nominalmente autorizada pelo dono
em `origin/main:agent-orchestration/controle/decisoes.md`, decisão `D-TRC01-VEHICLE-ASSIGNED-AT`, opção (i). O
parecer do ciclo 1 foi lido apenas como contexto e cobria as migrations 74 e 75; nenhuma conclusão dele substituiu
execução própria sobre a 76.

## Resultado das medições

1. **Up e rollback — conforme.** Em PostgreSQL `16.15` descartável próprio, o primeiro `prisma migrate deploy`
   aplicou a migration 76 e o segundo respondeu `No pending migrations to apply`. O rollback comentado foi executado
   literalmente e concluiu os três passos. Dumps `--schema-only` antes do up e depois do rollback, ambos com a mesma
   `--restrict-key` determinística, tiveram SHA-256 idêntico
   `f57b7a086f6cf8cd32b58a8dd2dcb2da699c39f86e9c367456d3a588ee326a48`; `diff -u` vazio, exit `0`.
2. **Aditividade e segurança — conforme.** O up contém apenas `ADD COLUMN`, `CREATE FUNCTION` e `CREATE TRIGGER`;
   nenhum `DROP` nem `ALTER` destrutivo. A função tem `prosecdef=false` (`SECURITY INVOKER`), há zero RULE e um
   trigger. `work_orders` permaneceu com `ENABLE` e `FORCE ROW LEVEL SECURITY`; a única policy, seu texto e o digest
   `801677c6527388407a204f6700c8bcac` ficaram idênticos. As duas linhas anteriores ao up ficaram com
   `vehicle_assigned_at IS NULL`, conforme a opção (i).
3. **Comportamento e integridade — conforme.** Sob role exclusiva `NOSUPERUSER NOBYPASSRLS`, mudar a viatura e
   enviar simultaneamente o timestamp arbitrário `2000-01-01` produziu horário do gatilho próximo de `now()`; nova
   tentativa `1999-01-01` sem mudar a viatura preservou o valor do gatilho; numa OS sem viatura, a tentativa
   `1998-01-01` permaneceu `NULL`. O MD5 ordenado das duas linhas semeadas antes/depois do up, removendo apenas a
   coluna nova da representação, foi idêntico: `c9a2f2b22198ee518e88657e620b8abc`.

## Achados e risco residual

Nenhum defeito confirmado e nenhum achado bloqueante dentro do bloco. A primeira comparação bruta de dumps expôs
somente as sentinelas aleatórias `\restrict`/`\unrestrict` do `pg_dump 16.15`; ela não foi usada para aprovar. A prova
foi repetida integralmente em banco novo com `--restrict-key` válida e determinística, produzindo o diff vazio exigido.

## Terreno e limpeza

Havia um único grupo Docker alheio `tl179228797429743-*`, portanto o cluster próprio foi o segundo trabalho. Não se
usaram as bases `erp-postgres`/`erp-redis` nem portas proibidas. O container `dba-trc01c2-pg16` e o worktree
`C:/Users/AMP/w-dba-trc01c2` foram removidos no fim; nenhum recurso alheio foi alterado. Evidência completa e
incremental: `dba-guardiao-c2-evidencia.md` neste diretório.

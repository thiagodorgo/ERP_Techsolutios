# B-O6R-02 ciclo 5 — auditoria própria S2

> Executor: Codex. Registro descritivo de medições; não é voto, ata ou veredito de junta.

## 1. Item (a) — bateria barata D29

Já executado no §7.2; não repetido, conforme §7.3(a).

- comando por rodada: `node scripts/run-backend-tests.mjs tests/audit-security.test.ts tests/auth-identity-backfill-db.test.ts tests/auth-identity-links-db.test.ts tests/rls-tenant-isolation.test.ts tests/vehicle-identity-schema.test.ts tests/impound-process-checklist-link-schema.test.ts`
- ambiente/forma: head `84bb90b6e3520cbc6d8c9f84057cae506751d853`; Node `v20.19.5`; 105 migrations; PostgreSQL 16 + Redis 7 descartáveis próprios; `DATABASE_URL`/`REDIS_URL` exclusivos; `CORE_SAAS_PERSISTENCE` não exportada; 13 rodadas sequenciais; lista nominal de 6 arquivos.
- saída: 13/13 verdes; em todas `(6 arquivos, 37 testes)`, pass 37, fail 0, skipped 0, `XX000` 0; denominador constante.
- parcial: OK. O detalhe e a ressalva de comparabilidade estão em `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md`.

## 2. Item (e) — sondas FK (v) e (vii)

Medição executada antes de qualquer código do F4.

- comando/forma: PostgreSQL 16 descartável próprio `codex-o6r-c5-s2-fk-ef6923c91725`, porta efêmera `32771`; head `84bb90b6e3520cbc6d8c9f84057cae506751d853`; Node `v20.19.5`; `prisma migrate deploy`; 105 migrations; N=1; duas famílias/p pares próprios, em tenant exclusivo da sonda; SQL cru via `psql`; nenhum serviço vivo consultado.
- catálogo inicial, sem FK: `pg_constraint=4` para `financial_entries`.
- sonda (v), sem FK: `DELETE` físico do original com estorno vivo foi **aceito**, `DELETE 1`, `ec=0`.
- sonda (vii), sem FK: rename da PK do original com estorno vivo foi **aceito**, `UPDATE 1`, `ec=0`.
- consequência medida sem FK: 2 contrapartidas ficaram com `reversal_of` sem original correspondente.
- comando FK temporária: `ADD CONSTRAINT probe_reversal_fk FOREIGN KEY (tenant_id, reversal_of) REFERENCES financial_entries (tenant_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID`; depois `VALIDATE CONSTRAINT`.
- saída FK: ADD `ec=0`; VALIDATE `ec=0`; duração observada `217 ms`; `pg_constraint=5`.
- sonda (v), com FK: recusada com SQLSTATE `23503`, `ec=1`, constraint `probe_reversal_fk`.
- sonda (vii), com FK: recusada com SQLSTATE `23503`, `ec=1`, constraint `probe_reversal_fk`.
- integridade após as recusas: 2 contrapartidas, 2 originais preservados e 0 PK renomeada.
- teardown: `DELETE` escopado ao tenant da sonda em um statement removeu o par inteiro (`DELETE 4`); conta e tenant próprios removidos; FK temporária derrubada; catálogo voltou a `pg_constraint=4`; container removido via `--rm`.
- parcial: OK — o vermelho-controle do D35 reproduz: sem FK ambas as portas são aceitas; com a FK proposta ambas são recusadas por construção.

## 3. Contradições do plano (§4.3)

As duas contradições permanecem abertas e são devolvidas ao planejador; não foram consolidadas silenciosamente:

1. **§12 linha 254 × EMENDA item 1** — o §12 manda fechar neste PR `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (C7), enquanto a EMENDA item 1 removeu o piso de denominador do runner deste bloco e o destinou ao `B-O6R-ARNES`. O comando registra ainda que a pendência está aberta na main e que o bloco de arnês entregou/provou a correção sob uma divergência de histórico.
2. **§6 linhas 137–149 e §5 linha 131 × EMENDA item 1** — os pisos P10 (catálogo/ratchet), P11 (runner-guard) e P12 (teardown/sweep), além dos cinco arquivos de C6/C7/C8 ainda listados no §5, pertencem à matéria de arnês que a EMENDA item 1 retirou deste bloco.

Parcial: DIVERGE documentalmente; requer pronunciamento do planejador antes de F1/F4.

## 4. Itens (b), (c), (d) e (f)

- **(b) sonda de pares P1/P4/P3:** não executada. É matéria de ACL/arnês removida deste bloco pela EMENDA item 1.
- **(c) fixture D26b:** não executada. É matéria do runner/arnês removida deste bloco pela EMENDA item 1.
- **(d) `--check` via `git archive`+`tar`:** não executado. A EMENDA item 5 o tornou NO-OP; a forma é proibida por fabricar CR sob `core.autocrlf=true`; e um `--check` verde não provaria os especialistas.
- **(f) atribuição do vazamento linear:** não executada. É matéria de teardown/arnês removida deste bloco pela EMENDA item 1.

Parcial: NÃO MEDIDO por determinação expressa do §7.3, não por falha de execução.

## 5. Consequência operacional para F1–F3

A leitura operacional do comando é que F1 (C6+C8), F2 (C7) e F3 (C8-identidades) são **NO-OP**, pois a EMENDA item 1 os transferiu ao `B-O6R-ARNES`, já mergeado no PR #359. Essa leitura não autoriza avançar: fica pendente de confirmação do planejador no CP-3. F4 não começou.

## 6. Não medido

Não foram medidos nesta auditoria, de forma consciente e nomeada:

- item (b), sonda de pares P1/P4/P3;
- item (c), fixture D26b;
- item (d), check de espelho na forma proibida;
- item (f), atribuição por execução do vazamento linear;
- qualquer implementação ou drill pós-implementação F1–F6, inclusive a migration definitiva/D35 `up → down → re-up`, o caso RLS real/D34, o censo permanente A6, o texto de contrato/D36 e as baterias finais.

Não há outro resultado presumido. O item (a) foi medido no §7.2 e citado aqui; o item (e) foi executado diretamente neste S2.

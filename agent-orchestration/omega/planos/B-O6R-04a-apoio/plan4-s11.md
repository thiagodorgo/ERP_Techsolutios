## 11. Riscos · rollback

| # | risco | mitigação / prova |
|---|---|---|
| R1 | o lock do item serializa todas as custódias do mesmo item | tx curtas; v2 `[10-V1]` 20 saídas em 127–152 ms; A1 publica o tempo |
| R2 | perdedor esperando o lock estoura o timeout (`P2028`) | timeout global intacto (emenda 2-h); unidades ≈ 20–30 ms em N=10 000 `[10]`; A1/B1 asserem 0 × `P2028`; quando ocorrer, **503** com nada gravado (A14) |
| R3 | o censo da migração ABORTA o deploy e **trava a fila até `migrate resolve`** (M-02) | fail-closed por desenho; a exceção nomeia o comando; roteiro §4.3 com a sequência provada `[08]`; ato do dono antes do deploy; aviso do gatilho do staging |
| R4 | `FOR UPDATE` bloqueia `updateItem`/`applyAbcClasses`/`open` do mesmo item por instantes | aceito; `[07]` LO: B bloqueia e conclui após o commit |
| R5 | deadlock V6 × V1–V5 / open / abc / V6 × V6 / open × open | I7 v3 (§3.2); `[07]` LO 0 × `40P01`, controle `40P01`; `[04]` PRE: lock do tenant × KEY SHARE não conflita; B8/B9/B9b/A12 |
| R6 | fechamento grande demora e o cliente HTTP desiste | `fechando` retomável (v2 `[10-CRASH]`); `close` de novo continua; o total do 200 é sempre da sessão inteira (S-02) |
| **R7 (v3)** | sessão em `fechando` por 409 recorrente | **não existe mais o beco**: 0 carimbos → `aberta` (`abortClose`); com carimbos → recontar as pendentes (aceito em `fechando`) e retomar; `cancel` recusado só quando há ajuste aplicado, com mensagem que nomeia a saída — `[04]` STUCK_v3, STUCK_partial_v3 |
| R8 | `fechando`/códigos novos chegam ao frontend | adapter mapeia desconhecido → "Aberta" e trata 422 genericamente (v2 `[15]`); 409 `items_in_open_session` no `open` cai no tratamento de erro da tela; pendência §13-3 |
| R9 | o dublê em memória da porta não prova atomicidade | declarado; a prova é T-B; memória só garante contrato (67 → 67) |
| R10 | sessões `aberta` com ajustes parciais gravados ANTES do bloco (P-021) | reaproveitamento sob o lock (v2 `[10-LEGACY]`); B7; **o total inclui o reaproveitado** (S-02) |
| R11 | `25P02` reaparece noutra via | D6 + A10 + C7/C8 (agora com o escritor que alcança o `23505`) |
| R12 | `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE` para papel de menor privilégio futuro | `B-O6R-12` (nota §13-5) |
| R13 | colisão de timestamp de migração | conferir `gh pr list` no dia do PR; renomear é aditivo |
| R14 | `assertApplicationNamePropagated` falhar para o cliente do papel | `[04]` PRE: tag `plan4-A`/`plan4-B` em `pg_stat_activity` |
| R15 | `mapTransientDbFailure` engolir erro determinístico | detecta só por código (lista fechada); A14 cobre os 3 formatos |
| **R16 (v3)** | o lock `NO KEY UPDATE` na linha do tenant serializa `open`s e conflita com `UPDATE tenants` (NO KEY UPDATE) | `open` é raro e curto (uma tx de ~100 ms); `UPDATE tenants` (configurações) é raro; **nunca `FOR UPDATE`** na linha do tenant (conflitaria com todo INSERT do tenant via KEY SHARE — D8 reprova) — `[04]` PRE 70 ms |
| **R17 (v3)** | recontagem em `fechando` muda a variância de uma entry que a unidade concorrente está aplicando | serializado pela linha da sessão (`FOR SHARE` × `FOR UPDATE`) e pelo predicado `adjustment_movement_id IS NULL` na própria linha; `[07]` E34: `coerente: true` |
| **R18 (v3)** | `abortClose` falha (banco caiu) depois de a unidade falhar | o erro original propaga; a sessão fica `fechando` com 0 carimbos, de onde `cancel` (0 carimbos), `recordEntry` e `close` continuam possíveis (I11 sem exceção); B17 |
| **R19 (v3)** | sessões sobrepostas que JÁ existam no deploy (defeito pré-existente `528e3601`) | o `open` novo recusa novas; as antigas fecham como hoje (cada uma aplica a própria variância); a ata registra a consulta de sobreposição para o dono rodar junto com o censo (§13-1) |
| R20 | duração do `CREATE DATABASE` + `migrate deploy` no drill (T-C′) | ~16 s `[02]`; uma vez por execução da suíte; na CI o usuário é `postgres` |

**Rollback:** código = revert do squash (nenhuma outra árvore toca esses arquivos até `03a`); migração = os dois `DROP INDEX IF EXISTS` do rodapé (não destrutivo, `[09]` 2→0→2); nenhuma
coluna/dado alterado; sessões em `fechando` no momento do revert: o código antigo as trata como "não aberta" (422 em tudo — v2 `[10-CRASH]`, `[f7]` do crítico); condição de rollback: concluir
os `fechando` pendentes ANTES (1 `close` por sessão) ou aceitar 422 até o re-deploy — anotado na ata.

# B-TRC-01: decisão do orquestrador sobre o ratchet T13 (2026-10-11, ~20:45Z; o "~21:10Z" do relatório do dev está adiantado)

**Origem:** a PARADA do dev antes da fatia 7 (`B-TRC-01-dev.md`, seção "PARADA"). O plano não previa o ratchet
`tests/san3-05-acessos-de-plataforma-guard.test.ts`, do B-SAN3-05. O desenho de §4.2–§4.5 cria entradas novas nele: o
gerador acusou 5 com um mutante virtual, e o controle não acusou nenhuma. O arquivo do ratchet está fora do PERMITIDO de §8.3.

**Decisão: opção (i).** Fica autorizado, nominalmente, acrescentar ao PERMITIDO do B-TRC-01 **só o mapa `NOVAS`** de
`tests/san3-05-acessos-de-plataforma-guard.test.ts`, com UMA linha de motivo por chave nova, escrita pelo dev a partir da
saída do gerador depois do código. O desenho do plano se mantém.

**Por que (i), e não (ii) nem (iii):**
- **(i)** é o mecanismo para o qual o ratchet existe ("o ato consciente que o ratchet existe para exigir"). A lista de
  envoltórios confiados (`WRAPPERS`) não muda, e cada chave nova fica explícita para a junta de segurança julgar uma a uma.
- **(ii)** amplia a lista de envoltórios confiados (`findFirstTenantRls`, `withTenantRlsBudget`). É uma decisão de
  segurança maior sobre a própria trava, e cabe num bloco próprio se as chaves se acumularem.
- **(iii)** é replanejar, com custo de tempo, sem ganho de segurança sobre (i).

**Condições:**
1. **Gerador e lista intocados.** O gerador `scripts/san3-05-acessos-de-plataforma.mjs` e a `WRAPPERS` NÃO mudam.
   Mudar = fora do escopo.
2. **Motivos por chave.** Cada chave no `NOVAS` tem motivo próprio, com o arquivo e a linha do acesso e a regra que o
   protege:
   - a quarentena sem organização: transação própria, sem GUC, sem dado de organização;
   - o `tx` vindo de `findFirstTenantRls` ou `withTenantRlsBudget`: o corpo do helper estabelece o contexto antes do
     callback, e o dev cita a linha.
3. **Chaves só do bloco.** O número final de chaves sai do gerador e vai para o relatório. Nenhuma chave de fora do
   B-TRC-01 entra.
4. **Julgamento pela junta.** A cadeira (a) da junta de segurança (§8.10: RLS, unicidade e banco) julga cada chave nova
   e pode recusar qualquer uma.

**Dois achados de terreno do dev, que valem como errata do §8.4:**
- **Porta do banco.** A 55432 cai numa faixa que o Windows reserva. O `trc01-pg` usa a `127.0.0.1:47432`.
- **Limpeza.** `docker compose down -v` sem `--profile` deixa de pé os serviços com perfil (`traccar-capture`,
  `traccar-sim`). A limpeza precisa passar os perfis.

Quem decidiu: o orquestrador. O dono pode vetar.

## Adendo (2026-10-11, ~23:00Z): o literal L0 do T13

Depois das fatias 7–12, o único vermelho do bloco era o subteste "L0 exato" do T13
(`tests/san3-05-acessos-de-plataforma-guard.test.ts`, l.241). Ele crava
`tabelas ENABLE=109 FORCE=109 · acessores Prisma em FORCE=109`, e a migração `20260874000000_traccar_ingestion_foundation`
cria **2 tabelas tenant-scoped com FORCE RLS**: `vehicle_tracking_bindings` (l.76) e `traccar_ingress_receipts` (l.121).
A `traccar_quarantine_items` fica sem FORCE por desenho, porque é a quarentena SEM organização.

**Decisão:** é a mesma natureza da opção (i), um ato consciente no arquivo do ratchet. O orquestrador trocou o literal
para **111** nos três números. Medido: `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` → `# tests 35 ·
# pass 35 · # fail 0`.

A cadeira (a) da junta confere que o delta de +2 é EXATAMENTE essas duas tabelas e os dois modelos Prisma delas.

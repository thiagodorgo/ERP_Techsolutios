-- B-O6R-02 ciclo 5 · C9 (P13, A1) — O PAR NÃO SE SEPARA NEM POR ESCRITOR CRU: FK composta em reversal_of.
--
-- Aditiva pura: UMA constraint, nenhuma coluna, nenhum índice novo (o alvo único
-- financial_entries_tenant_id_id_key (tenant_id, id) JÁ EXISTE — migration 20260812000000, conferido
-- em pg_indexes; custo provado no §0.d do plano do ciclo 5: VALIDATE ec=0). prisma/schema.prisma NÃO
-- muda — precedente da casa: o índice parcial (add_financial_invariants) e os triggers de guarda
-- (add_reversal_pair_atomicity) também vivem só na migration.
--
-- O QUE ESTA FK FECHA, e por que os triggers vizinhos NÃO bastavam:
-- os triggers da 20260870000000 guardam o SOFT-delete (transição deleted_at) e o INSERT/UPDATE de
-- estorno. Ficaram DUAS portas cruas abertas, medidas por execução no §0.d (sonda em cluster
-- descartável, ambas ACEITAS sem FK):
--   (v)   DELETE físico do original com estorno vivo  -> a contrapartida aponta linha inexistente;
--   (vii) UPDATE do id (rename da PK) do original     -> idem, o par se separa por debaixo.
-- A FK composta (tenant_id, reversal_of) -> (tenant_id, id) com ON DELETE RESTRICT ON UPDATE RESTRICT
-- fecha as duas POR CONSTRUÇÃO (SQLSTATE 23503), no catálogo, para qualquer escritor — serviço, SQL
-- cru, bug futuro. reversal_of NULL (lançamento que não é estorno) passa livre: MATCH SIMPLE ignora a
-- referência quando qualquer coluna do par é NULL.
--
-- LIMITE QUE RESTA (nomeado, não escondido — o contrato C9 o repete): a FK amarra a EXISTÊNCIA do
-- original, não o seu conteúdo. Edições cruas fora da classe do par — UPDATE amount/account_id,
-- DELETE físico da CONTRAPARTIDA — continuam possíveis para superuser/SQL cru e não têm desenho de
-- par que as feche (medido pelo ataque do ciclo 4). O texto vivo é o API_CONTRACTS.md.
--
-- FALHA = fail-closed: o censo abaixo ABORTA a migração (zero mutação) se houver referência
-- pendurada de legado; higiene de dado é decisão humana (§C7.5), nunca deste script. A mensagem
-- publica só a CONTAGEM — nunca tenant_id (allowlist §6).

-- Censo PRÉVIO de referências penduradas: estorno (qualquer estado de deleted_at — a FK não conhece
-- soft-delete) cujo (tenant_id, reversal_of) não encontra linha física (tenant_id, id). >0 -> ABORTA
-- nomeando P-O6R-B02-ORFAOS-LEGADOS, e o VALIDATE nem chega a rodar com erro críptico.
DO $censo_fk$
DECLARE
  penduradas bigint;
BEGIN
  SELECT count(*) INTO penduradas
  FROM financial_entries r
  WHERE r.reversal_of IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM financial_entries o
      WHERE o.tenant_id = r.tenant_id
        AND o.id = r.reversal_of
    );
  IF penduradas > 0 THEN
    RAISE EXCEPTION 'financial_entries: % referencia(s) de estorno PENDURADA(S) de legado (reversal_of sem linha fisica correspondente). A FK do par nao pode ser validada sobre dado inconsistente; NADA foi mutado. Higiene de legado e decisao humana — abrir/consultar P-O6R-B02-ORFAOS-LEGADOS.', penduradas
      USING ERRCODE = 'raise_exception';
  END IF;
END $censo_fk$;

-- NOT VALID: a constraint nasce valendo para escritas NOVAS sem varrer a tabela sob lock forte...
ALTER TABLE "financial_entries"
  ADD CONSTRAINT "financial_entries_reversal_pair_fk"
  FOREIGN KEY (tenant_id, reversal_of)
  REFERENCES "financial_entries" (tenant_id, id)
  ON DELETE RESTRICT
  ON UPDATE RESTRICT
  NOT VALID;

-- ...e o VALIDATE varre com lock fraco (SHARE UPDATE EXCLUSIVE), com o censo acima já garantindo
-- que ele não estoura. Duração medida na sonda §0.d/P6.8: 217 ms.
ALTER TABLE "financial_entries" VALIDATE CONSTRAINT "financial_entries_reversal_pair_fk";

-- down (provado no D35: up -> down -> re-up em banco descartável, pg_constraint 5 -> 4 -> 5):
--   ALTER TABLE "financial_entries" DROP CONSTRAINT IF EXISTS "financial_entries_reversal_pair_fk";

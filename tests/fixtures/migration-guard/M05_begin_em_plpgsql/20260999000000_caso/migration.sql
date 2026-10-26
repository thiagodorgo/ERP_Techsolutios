-- M05 (A4): o BEGIN dentro do corpo $$ ... $$ não é controle de transação; sem BEGIN de topo -> G2.
CREATE FUNCTION "caso_fn"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."a" := 'x; y';
  RETURN NEW;
END
$$;
ALTER TABLE "caso" ADD COLUMN "a" TEXT;

-- M05v (A4, verde): o mesmo corpo plpgsql, agora com BEGIN;/COMMIT; de topo -> verde.
BEGIN;
CREATE FUNCTION "caso_fn"() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW."a" := 'x; y';
  RETURN NEW;
END
$fn$;
ALTER TABLE "caso" ADD COLUMN "a" TEXT;
COMMIT;

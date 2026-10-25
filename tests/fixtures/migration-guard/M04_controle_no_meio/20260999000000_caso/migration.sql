-- M04 (A3): controle de transação no MEIO (duas transações no arquivo) -> G2.
BEGIN;
ALTER TABLE "caso" ADD COLUMN "a" TEXT;
COMMIT;
BEGIN;
ALTER TABLE "caso" ADD COLUMN "b" TEXT;
COMMIT;

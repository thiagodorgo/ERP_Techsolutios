-- M07 (A5): BEGIN e COMMIT só em comentário não contam -> G2.
-- BEGIN;
ALTER TABLE "caso" ADD COLUMN "a" TEXT;
ALTER TABLE "caso" ADD COLUMN "b" TEXT;
/* COMMIT; */

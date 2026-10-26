-- M17 (A14): nova multi-sentença com BEGIN/COMMIT; sem drill que cite o nome -> G6; com drill -> verde.
BEGIN;
ALTER TABLE "caso" ADD COLUMN "a" TEXT;
ALTER TABLE "caso" ADD COLUMN "b" TEXT;
COMMIT;

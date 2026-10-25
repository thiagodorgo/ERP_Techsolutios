-- M06 (A5, verde): o ';' dentro de string e de comentário não divide a sentença; n = 2.
BEGIN;
COMMENT ON COLUMN "caso"."a" IS 'a; b; ''c;''';
/* um comentário de bloco; com ponto e vírgula /* aninhado; */ ainda comentário; */
ALTER TABLE "caso" ADD COLUMN "b" TEXT; -- comentário de linha; com ponto e vírgula
COMMIT;

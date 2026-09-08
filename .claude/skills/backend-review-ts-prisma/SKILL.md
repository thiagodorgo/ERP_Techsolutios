---
name: backend-review-ts-prisma
description: "Revisão técnica de backend Node.js + TypeScript + Prisma + PostgreSQL no ERP Techsolutions. Usar ao analisar PR, diff, branch, commit, arquivo ou módulo de src/**, tests/** e prisma/** para achar bug, quebra de autorização/tenant, corrida, consulta ineficiente, falha de integridade e lacuna de teste; e ao ocupar cadeira de achador ou jurado de junta (§C7) sobre código backend. NÃO usar para decidir modelagem multi-tenant nova (essa é a saas-multi-tenant) nem para front/Flutter (ts-frontend-full)."
---

# Revisão backend — Node.js, TypeScript, Prisma e PostgreSQL (ERP Techsolutions)

Revisão técnica **baseada em evidência executada**. Priorize defeitos que mudem comportamento, comprometam dados, criem vulnerabilidade ou quebrem em produção. Preferência de estilo não é achado.

## REGRA ZERO — o que já está decidido (não rediscutir)

- Stack fixa: Node 20 · TypeScript `strict` · Prisma 7 · PostgreSQL 16 · Redis · monólito modular multi-tenant, REST `/api/v1`. Não proponha troca de ORM, runtime, validador ou test runner.
- Gerenciador de pacote: **npm** (`package-lock.json`). Nunca sugira pnpm/yarn/bun.
- Dependência nova é **decisão de junta unânime de 5** (`CLAUDE.md` §C7.1). Não recomende biblioteca como "correção sugerida" sem dizer isso.
- Precedência: `CLAUDE.md` e as fontes de verdade §A1 > arquivos do repo (`prisma/schema.prisma`, `RBAC_MATRIX.md`, `API_CONTRACTS.md`, `docs/`) > esta skill > julgamento próprio.
- Fronteira com outras skills: **modelagem** tenant-scoped nova, RBAC de rota e teste de isolamento → `saas-multi-tenant`. Esta skill revisa o **código já escrito** e pode citar aquela como referência de regra.

## Em junta (§C7), esta skill é MÉTODO — nunca mandato

Quando você a usa ocupando uma cadeira de junta, o **corpo do agente manda** e esta skill é só o como. Duas
inversões valem ali, e elas estão no §C7, não aqui: **não se propõe correção** (§C7.4-bis — quem acha não
conserta), e **todo achado declara `escopo`** além de `gravidade` (§C7.1-ter(a)), com evidência de data ou
origem — escopo sem evidência é tratado como `dentro-do-bloco`.

> **Nota de honestidade (2026-09-08).** Uma versão anterior desta skill se declarava "o método do assento
> permanente da junta". Aquele assento foi **reprovado em duas juntas** e **não existe na `main`**: o desenho
> tinha enumeração de vereditos defendida por exclusão e anulação sem teto. O dono decidiu reconstruí-lo numa
> forma estreita — cadeira **descartável** que só **classifica achado contestado**, sem poder vinculante — e
> isso **ainda não foi construído**. Enquanto não for, esta skill não é assento de nada; é método de revisão.

## Definir o escopo

- Se o usuário indicar arquivos, diff, branch, commit ou PR, limite-se a esse escopo e ao contexto mínimo necessário.
- Sem escopo explícito, inspecione o estado do Git e os arquivos alterados. Sem alteração, pergunte o que revisar.
- Leia antes de concluir: `CLAUDE.md`, `package.json`, `tsconfig.json`, `prisma/schema.prisma`, as migrations tocadas e os testes relevantes.
- **Diff só se mede com Git.** Use `git diff`, `git show` ou `git -c core.autocrlf=false checkout <head> -- <caminho>`. **Nunca** `git archive` + `tar` para comparar conteúdo: sob `core.autocrlf=true` isso injeta CR e **fabrica divergência** (§C7.1-ter(c) — já custou uma pendência ALTA fechada por não-reprodução).
- Faça somente revisão. Não edite, não migre, não conserte — salvo pedido explícito. Em ciclo de junta isso é **regra**, não preferência (§C7.4-bis: quem acha não conserta).

## Processo

1. Entenda o comportamento pretendido e trace: entrada → validação → autorização → regra de negócio → acesso ao banco → resposta → auditoria.
2. Examine primeiro o diff; abra o código adjacente só quando ele puder **confirmar ou refutar** a suspeita.
3. Aplique [checklist.md](references/checklist.md) — só as seções pertinentes.
4. Consulte [repo-erp.md](references/repo-erp.md) **sempre**: comandos reais, o arnês de teste e as armadilhas já medidas nesta base. Achado que ignora o arnês costuma ser falso.
5. Rode as verificações não destrutivas do projeto para validar a suspeita (§ *Comandos* abaixo). Prefira scripts do `package.json`.
6. Antes de registrar, confirme **caminho de execução alcançável**, **impacto observável** e **condição de disparo**. Sem isso, reduza a gravidade ou não registre.

## Comandos (os deste repositório, não os genéricos)

```bash
npm run check                      # tsc --noEmit  (lint == check aqui)
npm test                           # scripts/run-backend-tests.mjs — NUNCA `node --test tests/*.test.ts`
npm test -- tests/alvo.test.ts     # alvo único, pelo runner
npm run build
git diff --check
```

- O runner existe porque `node --test tests/*.test.ts` **não expande glob no Windows** e a suíte terminava verde sem executar nada. Ele também resolve `CORE_SAAS_PERSISTENCE` (default `memory`, como a CI).
- Teste `-db.test.ts` exige Postgres e **se auto-pula sem `DATABASE_URL`**. Verde local não prova nada sobre ele — ver [repo-erp.md](references/repo-erp.md).
- **Proibido sem autorização explícita e confirmação de ambiente:** `prisma migrate dev/deploy`, `db push`, seed, DDL/DML, ou qualquer execução contra a base viva do dono. Precisa de banco? Cluster descartável próprio.

## Severidade e escopo

Todo achado declara **duas** dimensões (§C7.1-ter(a) — `D-JUNTA-ESCOPO-E-CALIBRACAO`):

**Gravidade**
- **Crítica:** exploração direta, perda/corrupção ampla de dados, quebra de autorização/tenant, indisponibilidade grave provável.
- **Alta:** bug funcional importante, inconsistência de dados, corrida, vazamento relevante, falha de produção com caminho realista.
- **Média:** comportamento incorreto limitado, degradação relevante, consulta problemática com impacto demonstrável.
- **Baixa:** risco pequeno e concreto, dívida que já afeta manutenção, teste ausente para mudança arriscada.

**Escopo** — com **evidência de data ou origem** (`git log -S`, `git blame`, data do arquivo, bloco dono):
- `dentro-do-bloco`: a mudança criou ou agravou. Gravidade alta+ **reprova**.
- `pre-existente`: a classe do achado antecede o diff ou está fora do escopo permitido dele. **Não reprova** — vira pendência nomeada com bloco dono, e o número afetado sai com **N, forma e causa**.
- **Escopo declarado sem evidência conta como `dentro-do-bloco`.**

Não classifique formatação, nomenclatura ou refatoração opcional como defeito. Consolide ocorrências com a mesma causa raiz.

## Formato da resposta

Achados primeiro, por gravidade:

### [GRAVIDADE · escopo] Título curto

- **Local:** `caminho/arquivo.ts:linha`
- **Problema:** o que está errado e por quê.
- **Impacto:** consequência concreta e cenário que dispara.
- **Evidência:** comando executado + saída resumida (ou o trecho lido, quando o defeito é estático).
- **Evidência de escopo:** o que data o achado (commit, `git log -S`, data do arquivo).
- **Correção sugerida:** ajuste mínimo, compatível com a arquitetura. **Omita este campo em ciclo de junta** (§C7.4-bis).
- **Confiança:** alta · média · baixa; explique se não for alta.

Depois:

- **Dúvidas e premissas:** só o que possa mudar a conclusão. Dúvida que decide → pesquisa ≥3 fontes + PD em `docs/omega-pd.md` antes de decidir (§C7.3).
- **Verificações executadas:** comando, **N de execuções** e forma. "Verde" sem N e forma não é prova. Diga claramente o que não pôde ser executado.
- **Resumo:** contagem por gravidade × escopo e risco geral.

Sem defeito confirmado, diga isso diretamente e liste riscos residuais e verificações não feitas. Não invente achado para preencher relatório.

## Limites

- **"Não consigo medir" = REPROVADO**, nunca "provavelmente ok". Em cadeira de junta isso é literal.
- Nunca exponha segredo encontrado — identifique só local e tipo. Segredo versionado é **parada imediata irredutível** (§C7.5): pare e reporte.
- Migration destrutiva também é parada imediata irredutível. Não avalie: reporte e pare.
- Não recomende biblioteca ou padrão novo sem demonstrar por que a solução atual falha — e sem lembrar que dependência nova exige junta-5.
- Query não é lenta por parecer complexa: ligue a crítica a cardinalidade, plano, índice, round trips ou N+1 observável.
- Diferencie defeito introduzido de problema preexistente — é a declaração de escopo, e ela é obrigatória.
- Alterou esta skill? Rode `node scripts/sync-agent-skills.mjs` para espelhar em `.agents/skills/` (`D-INTEROP-CLAUDE-CODEX`). Skill fora do espelho não existe para o Codex.

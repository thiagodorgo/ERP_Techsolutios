# J-581: ata da junta completa do PR #581 (B-SAN3-10b-SEED-CONSENT, item 44)

**Orquestrador:** Claude Opus 5.5. A ata foi escrita em 16/11 12:39 SP.
**Objeto:** `9bdc953d1429caa2c0f8312cfe0c32ddc7d85194`.
**Fluxo:** rápido (§C7 10(3)). Por ordem do dono (`D-DONO-1611-CADEIRAS-EM-PARALELO`), o inspetor e as 3 cadeiras nasceram juntos às 12:05, e a junta correu em paralelo com a pré-revisão.

## Terreno
- **O inspetor** (`insp-581-cl`, Claude) deu **LIBERADO COM RESSALVA**, com R1 a R10 em `insp-581-parecer.md`.
- **O ADENDO 2** do `BRIEFING.md` passou as ressalvas às cadeiras.
- **A R8 foi ratificada:** 3 pilhas ao mesmo tempo.
- **A R9 foi cumprida:** o monitor de recursos foi relançado.

## Pré-revisão (etapa 1, em paralelo)
`dp-prerev-581` (DeepSeek, com cruzamento): **REPROVADO** por 1 achado, o **DP-581-01**. A M-DP2 sobrevive: tirar `consent_revoked` da régua da trilha deixa a suíte verde. O código está certo, e a lacuna é de teste.

## Cadeiras e votos (3 de 3 APROVA)
| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C-LGPD | `j581-lgpd-dp` | DeepSeek Pro (cruzamento) | **APROVA** | 0 próprios. Confirmou o DP-581-01 por execução e o classificou como "grave" no sentido da mutação, deixando a classe com a C-DADO (evidência §8) |
| C-DADO | `j581-dado-cl` | Claude Opus 5.5 (sem cruzamento, declarado) | **APROVA** | N1 = DP-581-01, reproduzido com o cenário "aceite 503 → titular revoga → religa sem a linha"; N2, o id determinístico sem teste; N3, a auditoria best-effort, pré-existente (`a09f6a4a`, 08/06) |
| C-ROT | `j581-rot-cl` | Claude Opus 5.5 (sem cruzamento, declarado) | **APROVA** | ROT-01, o id determinístico sem teste (= N2); ROT-02, as leituras da trilha pela sessão do gestor sem teste. O PRE-1.2-d foi medido por execução própria (`ok=57 falta=0`) |

**Medido verde pelas cadeiras:**
- V2 com ET6 +2, V3 com reinício e `criados=0`, e V8 com `falta=0` nas 2 pilhas;
- o controle negativo com rc 5, sem religar;
- a retomada provada por trava de linha real;
- o gestor com 0 eventos de perfil e de consentimento;
- 0 termo privado no repositório;
- todas as mutações da lei mortas.

## Triagem (§C7 10(3) passo 3), pelo orquestrador
- **DP-581-01 / N1.** O que falta é o teste do cenário "aceite falhou → titular revoga → motor não religa". O código do objeto está certo, e a pilha real provou isso nas 3 execuções independentes (pré-revisão, C-DADO e C-LGPD).
  - **Gravidade: não grave**, pela definição do briefing: nada liga o consentimento sem o ato da titular no objeto.
  - **Leitura do orquestrador, declarada (§A6):** é a regra que protege o consentimento LGPD, e o conserto é simples. Por isso **conserta agora, na mesma leva**, e o teste tem de ficar vermelho sob a M-DP2.
- **N2 = ROT-01** (o `client_action_id` determinístico sem teste): não grave e simples → **conserta na mesma leva**. O teste fica vermelho com um id aleatório (a MP-ROT1).
- **ROT-02** (as leituras da trilha e do perfil pela sessão do admin sem teste): não grave e simples → **conserta na mesma leva**. O teste fica vermelho sob a MP-ROT3.
- **N3** (a auditoria best-effort, que a régua lê sem saber de escrita falha): não grave, **pré-existente** → vira a pendência `P-SEED-REGUA-AUDITORIA-BEST-EFFORT`, que não segura o bloco. **Dono:** a varredura de segurança final (§C7 10(6)).

## O conserto (§C7 10(3) passo 4)
- **O dev:** `dev-seed-consent-cl` (Claude), que NÃO achou nenhum dos 4.
- **O escopo:** só `tests/demo-isolado-motor.test.ts`, mais `scripts/demo-isolado/semear.mjs` se um teste exigir um ponto de injeção. Nenhuma regra de consentimento muda. Por isso nenhuma cadeira se refaz (§C7 10(4)).
- **A conferência** (passo 5): pela outra casa, o DeepSeek, que não consertou. Roda a M-DP2, a MP-ROT1 e a MP-ROT3 sobre o objeto novo (todas vermelhas), os 52 testes ou mais, a pilha V8 com a matriz `628f9ea3` e o CI inteiro.
- **Depois:** o merge com as travas → a F9 v13 → a porteira (o item 44).

## Quem ocupou cada papel (§C7.4-bis)
- **Quem achou:** `dp-prerev-581`, `j581-dado-cl` e `j581-rot-cl`.
- **Quem planeja o conserto:** o orquestrador, nesta triagem; o escopo é só de testes.
- **Quem desenvolve:** `dev-seed-consent-cl`.
- **Quem confere:** `dp-conf-581`.
- **(a)** A composição cobre a competência: LGPD, dado e roteiro, cada um com execução na pilha real.
- **(b)** Quem achou não conserta.
- **(c)** Sem dado podre: a premissa errada do briefing (a do docker, que contava contêineres) foi corrigida pelo inspetor na R8.

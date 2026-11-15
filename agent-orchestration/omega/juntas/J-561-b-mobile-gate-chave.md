# Ata da J-561: junta completa do PR #561 (B-MOBILE-GATE-CHAVE, item 66: as chaves de acesso do app; PERMISSÃO)

**Orquestrador:** Claude Opus 5.5. Ata escrita em 14/11 às 06:39 SP (medido).
- A composição é só Claude, sem cruzamento, por ordem do dono de 13/11 (§C7 11(2)).
- O fluxo é o rápido (§C7 10(3)).
- Quórum: unanimidade de 4, com as cadeiras em paralelo.

## Objeto e terreno
- **Objeto:** `0034618e`, que é o merge da `main` `729718fe` sobre `0f730eeb`, sem conteúdo próprio.
- **CI:** 16 de 16 verdes, nas rodadas push `43570158425` e PR `43570162046`.
- **Inspetor:** `insp-561-cl` deu LIBERADO COM RESSALVA (`insp-561-parecer.md`).
  - R1: falta o plano de perda de cadeira. Não aconteceu nenhuma queda.
  - R2: os insumos vêm de heads anteriores, e as cadeiras mediram no objeto.
  - R3: a máquina estava carregada.
- **Pré-revisão:** `prerev-561-cl` deu APROVADO, com 39 de 39 mutações.

## Votos
| Cadeira | Identidade | Corpo | Voto | Achados |
|---|---|---|---|---|
| C1 acessos | `j561-c1-cl` | coordenador-de-acessos | APROVA | C1-01 e C1-02, os dois não-graves e pré-existentes |
| C2a testes e mutações | `j561-c2a-cl` | agente-ci-doutor | APROVA | C2A-01, não-grave e pré-existente |
| C2b guarda e anti-vacuidade | `j561-c2b-cl` | guardiao-fail-closed | **REPROVA** | C2B-01 a C2B-04, todos não-graves e dentro do bloco |
| C3 forma real | `j561-c3-cl` | agente-ci-doutor | APROVA | C3-01, não-grave e dentro do bloco; C3-02, não-grave e pré-existente |

**Resultado:** reprovado pela C2b, sem nenhum defeito grave. Pelo §C7 10(5), não há auditoria de topo. Pela triagem abaixo, o bloco segue com um conserto só.

## Triagem (§C7 10(3) passo 3, feita pelo orquestrador)
**Conserta agora** (não-grave e simples, dentro do bloco). Um conserto só, feito por `fix-561-cl`, que não achou nada, e cada item com teste que fica vermelho sem o conserto:
- **C2B-01:** o conjunto fechado do T4.1 enumera os gates pela PROPRIEDADE: todo construtor `MobileGate(` em `mobile/flutter_app/lib/**`, em linha única ou em várias, em qualquer arquivo. Controles: as 3 formas da C2b (uma linha, várias linhas, outro arquivo) ficam vermelhas.
- **C2B-02:** o `MobileGate.permite` falha fechado com lista vazia. Chave vazia nega, e módulo vazio nega, salvo marca explícita de núcleo, se o desenho a tiver. O teste da sonda da C2b (gate com listas vazias e sessão vazia) passa a esperar recusa.
- **C2B-03:** o T4.2 reconhece `PermissionSet.contains(`, `perms.permissions.contains(` e `PermissionSet` tipado (`<String>{…}`). As 3 mutações da C2b ficam vermelhas.
- **C2B-04:** o T5 também monta `const HomeScreen()` pelo ramo do provider. A mutação `modoDev: true` nesse ramo fica vermelha.
- **C3-01:** o setup do `platform_admin` da prova com perfil real entra no repositório como a E2.2 pede, num script em `tests/helpers/` ou no arnês do T2. A evidência versionada passa a apontar para ele.
- **Merge da `origin/main` atual** (`521f0bcb` ou mais nova), num commit próprio, por união e com o índice regenerado.

**Vira pendência com dono** (pré-existente; entra no registro por acréscimo):
| Achado | Pendência proposta | Gravidade | Dono |
|---|---|---|---|
| C1-01 | `P-MOBILE-CHECKLIST-PELA-OS-SEM-GATE`: o cartão de checklist da OS abre o formulário da vistoria para quem tem G1b falso. O servidor recusa cada resposta | MÉDIA | o próximo bloco que tocar `work_order_detail_screen.dart` ou `checklist_run_screen.dart` |
| C1-02 | `P-MOBILE-ESTOQUE-SEM-ENTRADA-NA-NAVEGACAO`: `/inventory` só abre por link | BAIXA | `B-O6R-04b` (item 31) |
| C2A-01 | `P-TESTE-VAULT-ROUTES-FILHO-ORFAO`: `ass-05-vault-routes` não mata o filho no timeout | BAIXA | `B-FERR-AGENTES` |
| C3-02 | o JWT local sem `tenant_role`: só registro, porque a evidência já o declara (`perfil-real-antes.md:24`) | BAIXA | auth (o contrato do §2.4) |

## §C7 10(4): refazer cadeira?
Não, por padrão. O C2B-02 muda a decisão só no caso de lista vazia, que é exatamente o que o achado aponta, e nenhum gate de hoje tem lista vazia. Refaz-se a **C2b** se o conserto mudar a regra de algum dos 5 gates, ou se algum controle da C2b não ficar vermelho na conferência.

## Separação de papéis (§C7.4-bis)
| Papel | Quem |
|---|---|
| Achou | as 4 cadeiras |
| Triou | o orquestrador |
| Conserta | `fix-561-cl` |
| Confere | `ver-561-cl` |

---

## Pós-junta (completado no PR de registro de 14/11 tarde, `reg-1411b-cl`, por acréscimo)

A ata acima é a da triagem (06:39 SP) e fica como estava. O que segue vem das evidências fora do repositório (`revisoes/j561/`: o diário do conserto, a evidência da conferência e o parecer do porteiro), sem caminho de máquina. Horas em SP, como cada evidência as mediu.

### O conserto único (`fix-561-cl`, 06:41–09:25)
- **Quem:** `fix-561-cl`, Claude Opus 5.5, identidade nova, declarada; sem cruzamento (§C7 11(2)), declarado. Não foi cadeira, inspetor, pré-revisor, dev nem planejador do item 66.
- **Os commits, em ordem:**
  - `2a6702fd`, o merge da `origin/main` `521f0bcb`, por união e com o índice do gerador, sem conteúdo próprio;
  - `22a0471d`, C2B-01 e C2B-03 (o T4 enumera os gates pela propriedade e reconhece as 3 formas de `contains`);
  - `bd2d3d80`, C2B-02 e C2B-04 (o `MobileGate.permite` falha fechado com lista vazia; o T5 monta a home pelo provider);
  - `213dc9e6`, C3-01 (o arnês do `platform_admin` em `tests/helpers/`, o caso E2.2 do T2 e os ponteiros da evidência);
  - `35dfe894`, o registro (as 4 pendências da triagem, o índice e esta ata);
  - `c0a3dab1`, o merge da `main` `14b693e4` (#554), que tinha andado depois do 1º push; conflito só no índice, refeito pelo gerador;
  - `8fd50887`, o arnês passa a nascer da fábrica de conexão do #554 (`createPrismaClient`), depois da trava.
- **Cada item com teste que fica vermelho sem o conserto,** e 0 asserções removidas nos 5 commits do conserto. A contagem literal dá 9, todas vindas da `main` pela 1ª absorção.
- **A bateria no head final `8fd50887`:**
  - `dart format` com o Flutter da CI (3.47.5): `Formatted 273 files (0 changed)`;
  - `flutter analyze`: sem achados;
  - o arquivo do bloco: `+126`; a suíte Flutter inteira: `+1367`;
  - `npm run check`: exit 0;
  - o `npm test` em memória, sem banco e sem Redis: 18 falhas, todas de ambiente ou de carga, com os 11 casos do bloco `ok`.
- **A CI do head final:** as rodadas push `43593106952` e pull_request `43593110310` deram `success`, com 16 de 16 check-runs verdes. O backend deu 5731 testes, 5729 passam e 0 falham.

### A conferência (`ver-561-cl`, 09:27–10:34): CONFERIDO COM RESSALVA
- **Quem:** `ver-561-cl`, Claude Opus 5.5, identidade nova, declarada. Sem cruzamento, pela ordem do dono de 13/11 (§C7 11(2)), declarado: o reforço com outras casas só veio às 07:55, e os braços externos estavam ocupados.
- **Objeto:** o head `8fd50887`, medido por `git ls-remote` às 09:28.
- **Os 5 achados:** nenhum dos 5 comandos reproduz mais no head, e cada teste novo fica vermelho quando o conserto é desfeito.
  - C2B-01: as 3 formas da C2b são acusadas, mais 5 formas da conferência;
  - C2B-02: o gate com listas vazias nega;
  - C2B-03: as 3 mutações ficam vermelhas, mais 2 formas da conferência;
  - C2B-04: `modoDev: true` no ramo do provider fica vermelho, inclusive na suíte inteira;
  - C3-01: o arnês sai do repositório, sobe sobre um banco descartável e cria um `platform_admin` que faz login real; o T2 fica vermelho sem ele.
- **Nada além:** as regras dos 5 gates não mudaram (só o `permite` com lista vazia), e a matriz bate com a fixture (52 e 45). Os 2 merges são união pura, e o índice é o do gerador.
- **A CI do head:** as 2 rodadas foram lidas pelo log de cada job; a árvore do merge da PR é igual à do head.
- **Ressalvas (não graves; nenhuma é controle da C2b):**
  - **O1:** a varredura de todo o `lib/` em `lerRegras` não tem canário. Virou a `P-GATE-CHAVE-T4-VARREDURA-SEM-CANARIO` (BAIXA);
  - **O2:** a trava do arnês aceita `?port=5432` ou `&host=` na query da URL, que o `pg-connection-string` 2.13.0 aplica. Virou a `P-GATE-CHAVE-ARNES-ACEITA-PORTA-NA-QUERY` (MÉDIA).
- **§C7 10(4): refazer cadeira?** Nenhuma. Nenhuma regra dos 5 gates mudou, e todos os controles da C2b ficaram vermelhos no head.

### O incidente da duplicata, depois da PAUSA (P6), declarado
- **O que houve:** às 10:16 SP o dono pediu a pausa de tudo (`D-DONO-1411-PAUSA-TATICA`). A conferência rodava dentro de um workflow. O orquestrador mandou a PAUSA por mensagem direta ao agente, e isso abriu uma 2ª continuação dele. A original seguiu viva dentro do workflow, que não foi parado.
- **O que a cópia fez:** login (200) e mutações do C3-01, sem evidência própria.
- **O efeito:** a cópia só tocou o cluster da conferência. O cluster recebeu um `fast shutdown` que não veio da instância original, e um processo dela morreu com 137. A instância original detectou isso, restaurou e refez os passos, com md5 conferido, e deixou o worktree limpo.
- **O veredito que vale** é o da instância do workflow, que terminou às 10:34. A conferência nova `ver-561b-cl`, prevista às 10:28, não foi necessária.
- **O porteiro conferiu a evidência** e achou o comando e a saída de cada item (catálogos de 27, 8, 8 e 4 itens). Ficaram 4 inconsistências de redação, que não afetam o mergeado, porque a conferência foi só leitura e a árvore do squash é a do head:
  - (a) as 2 cópias se atribuem o `fast shutdown` e a API de formas que se contradizem;
  - (b) a seção `## PAUSA` continua dizendo "cluster não apagado" e "nenhum voto escrito";
  - (c) o `exit 137` das 10:27 ficou sem causa;
  - (d) a re-verificação da O2 pelo `createPrismaClient` ficou aberta, e o porteiro a fechou.
- **Lição:** para pausar um agente de workflow, para-se o workflow.

### O merge
- **Quando e como:** o PR #561 foi mergeado às 10:40 SP, na sessão nova, depois do reinício da máquina, por squash em `e6f3c425`. A árvore do squash é igual à do head conferido `8fd50887` (`8359aeec…`).
- **Base:** fluxo rápido (§C7 10(3)): uma junta, triagem, um conserto, a conferência com ressalva não grave e nenhuma cadeira a refazer.
- **A CI da `main` no merge:** a rodada `43600960034` (push) deu `success` às 11:02, com 8 de 8 jobs. O backend deu 5729 passam e 0 falham, o `backend-postgres` 621/621 e o Flutter `+1367`.

### O porteiro (`porteiro-561-cl`, 10:47–11:23): LIBERADO COM RESSALVA
- O parecer está ao lado desta ata: `porteiro-561-parecer.md`.
- Os números foram reexecutados no merge: o check, os 11 casos do bloco, o arquivo Flutter `+126`, a suíte `+1367` e o analyze.
- A `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` FECHADA é verdade, conferida no código por amostragem.
- **O que viajou para este registro, e onde entrou:**
  - O1 e O2 → as 2 pendências acima;
  - a linha 66 do `PLANO_SAN3.md` → FECHADA no #561;
  - a nota "9 classes" da pendência fechada → 11, por acréscimo;
  - o corpo do PR #561 ficou no estado de antes da junta: a mensagem do squash é o registro fiel.
- **O próximo start:** não foi negado.

| Papel (pós-junta) | Quem |
|---|---|
| Consertou | `fix-561-cl` |
| Conferiu | `ver-561-cl` (CONFERIDO COM RESSALVA) |
| Mergeou | o orquestrador (`e6f3c425`) |
| Porteiro | `porteiro-561-cl` (LIBERADO COM RESSALVA) |
| Completou a ata | `reg-1411b-cl` |

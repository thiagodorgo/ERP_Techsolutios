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

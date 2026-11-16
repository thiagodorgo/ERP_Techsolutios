# Ata da J-567: junta completa do PR #567 (B-ASS-10b, a tela de custo e margem da plataforma, com as 3 aparências; item 61)

**Orquestrador:** Claude Opus 5.5. A ata foi escrita em 15/11, por volta das 01:30 SP, com a hora medida.
**Fluxo:** o rápido (§C7 10(3)), com uma votação só.
**Objeto:** `48e88133`. O remoto não andou: cada cadeira conferiu pelo `ls-remote`.
**Quórum:** unanimidade de 3 mais o `cognicao-visual`. **Resultado: unânime, APROVA 4/4.**

## Terreno
- O inspetor `insp-567-cl` (Claude Opus) deu **LIBERADO COM RESSALVA**, com as ressalvas R1 a R10 (ver `insp-567-parecer.md`).
- O inspetor foi pausado (P7) às 23:20 para o reinício da máquina e retomado às 23:37, pelo id.
- O ADENDO entrou no briefing antes do disparo. Ele trouxe a trava `votos/smoke.lock`, que impede rodar dois `test:smoke` juntos.
- As cadeiras saíram em duas levas: C1 e C2 primeiro; C3 e `cognicao-visual` depois da C1 (ressalva R2 do inspetor).
- **Insumo do orquestrador à C3:** os 2 fatos que o planejador da Emenda 1.2 do #573 mediu, marcados "re-verificar, não herdar". A C3 os reproduziu e os registrou como achados próprios: C3-04 e C3-05.

## Cadeiras e votos
| Cadeira | Identidade | Modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · dinheiro | `j567-c1-cl` | Claude Opus 5.5, declarado | **APROVA** | 0 | J567-C1-01, J567-C1-02 |
| C2 · escritas e permissão | `j567-c2-cl` (`coordenador-de-acessos`) | Claude Opus 5.5, declarado | **APROVA** | 0 | C2-1, C2-3 (no bloco); C2-2 (pré-existente) |
| C3 · contrato e forma real | `j567-c3-cl` (`validador-mestre`) | Claude Opus 5.5, declarado | **APROVA** | 0 | J567-C3-01 a 05 |
| `cognicao-visual` | `j567-cv-cl` | Claude Opus 5.5, declarado | **APROVA** | 0 | CV-1 a CV-10 e CV-12 a CV-14 (no bloco); CV-11 (pré-existente) |

**Cruzamento:** não houve, por ordem do dono de 13/11 ("só Claude", §C7 11(2)). Não houve queda.

**Papéis (§C7.4-bis):**
- acharam: as cadeiras;
- triou: o orquestrador;
- conserta: `dev-10b-a-cl`, que não achou;
- confere: as 3 aparências pelo orquestrador (`feedback-conferencia-tres-aparencias`), e o código por um verificador que não consertou.

## Triagem (§C7 10(3)), feita pelo orquestrador
**Nenhum grave.** Nada perde dado, nada vaza entre organizações, nada quebra permissão e nada erra dinheiro na tela de hoje. A C1 provou o dinheiro contra a API real, a C2 provou as escritas e a C3 provou o contrato e o aceite.

O dono pede produto premium, sem gambiarra. Por isso os desvios de fidelidade à referência aprovada são consertados agora, e não deixados como pendência.

### A. Conserta agora, na mesma leva
Cada achado tem o comando de reprodução no voto da cadeira. Cada teste novo fica **vermelho sob a mutação que a cadeira provou sobreviver**.

| Grupo | Ids | O que fazer |
|---|---|---|
| **Testes que faltam na série** | J567-C1-02 = J567-C3-03; J567-C3-01; J567-C3-02 | (1) A série por organização, no detalhe aberto: a P13 no custo, e o mês vazio nunca vira zero. (2) A ORDEM da série de 6 meses: do mais velho ao mais novo, nas 3 aparências. (3) O mês SEM DADO NENHUM: sem barras, "—" e o texto acessível "sem dados" (§6.5.1, linha 3), com uma fixture que tenha esse mês. |
| **Guardas** | C2-1; C2-3; J567-C3-04 | (1) O T44 recolhe também o `export default` anônimo (função sem nome e arrow) de `modules/platform/cloud-billing/**`. (2) Um teste-dono da releitura do grupo antes de gravar, e da edição simultânea no **Mudar de grupo** (`MoveGroupDialog.tsx:61-74`, v2 §6.4.2 (2) e (3)). (3) O T-CTR-1 passa a derivar os enums do arquivo do servidor (`overview/overview.types.ts`), não de cópia. Um motivo novo no servidor sem espelho na tela fica VERMELHO. É o mesmo desenho que a Emenda 1.2 do #573 propõe; adotá-lo aqui protege as 2 ordens de merge. |
| **Texto falso** | J567-C3-05 | O detalhe de um MEMBRO DE GRUPO com `plan_without_price` não pode dizer "filial; quem assina…" nem "A matriz assina pelo grupo". O texto segue o motivo real ("plano sem preço cadastrado"). Confira o `groupText`, a `note` do `TenantDetail` e as dicas dos blocos. Teste-dono. |
| **Fidelidade à referência aprovada** (`platform-cloud-billing-3opcoes.reference.html`) | CV-1 a CV-10, CV-12 a CV-14 | Cada um como a visual descreveu, nas 3 aparências e nas larguras da lei. Em resumo: o `viewBox` do gráfico da A (CV-1); o estilo dos `<h4>` do detalhe (CV-2); o mini-gráfico vira a linha de tendência 200×30 sem texto (CV-3); o dinheiro não se parte, com `nowrap` (CV-4); a ação "Ver demonstrativo de outubro" (CV-5, ver a nota abaixo); o sinal de menos U+2212 (CV-6); a hierarquia da "Margem global" (CV-7); as dicas em `nowrap` com reticências (CV-8); o "Fechamento" da C, com ícone, cor e texto (CV-9); o contador das abas usa o equivalente da biblioteca, sem paleta nova (CV-10, `D-TELAS-SEGUEM-O-PADRAO`); o aviso de rateio em processamento só diz "em branco" quando estiver em branco (CV-12); o mês em minúscula no meio da frase (CV-13); os nomes da AWS traduzidos ("Banco de dados", "Processamento"…) e "dólar" no lugar de "USD" (CV-14). |
| **O limite da trava, declarado** | J567-C1-01 | O §6.2 do documento do bloco passa a declarar o escape novo que a C1 achou: a desmarcação por template (`${money}`) e por parâmetro `string` de função do próprio módulo. Endurecer a trava vira pendência (B). |

**Nota CV-5.** Se já existir rota ou tela de demonstrativo da organização que a ação possa abrir, ela entra agora. Se não existir, a ação NÃO é inventada: vira pendência e o dev registra. Isso evita o botão morto, que é proibido.

**Junto do conserto:** se a `main` andar, absorva por UNIÃO e meça o `check`.

**Coordenação com o #573:** a Emenda 1.2 do #573 lista os textos da tela pelo `48e88133`. Depois deste conserto, o dev do #573 mede de novo antes de aplicar o script dele.

### B. Vira pendência com dono
| Id | Pendência | Dono | Critério |
|---|---|---|---|
| **C2-2** (pré-existente) | `P-567-GUARDA-FRONT-NAO-ESTREITA`: na cadeia real (`PlatformLayout` → `PlatformGuard` → os 2 `PermissionGuard`), todo perfil que chega à rota é Admin Plataforma, e `hasAny`/`can` devolvem `true` para ele. Os 2 guardas aninhados não estreitam nada no front. O backend é a autoridade e recusa (provado pela C2). | o próximo bloco que tocar o `PermissionProvider` | os guardas do front estreitam por permissão real, com teste do T-GRD-1 na cadeia real |
| **CV-11** (pré-existente) | `P-PAT-OS-TAB-SEM-HOVER`: a aba inativa da `.pat-os-tab` (biblioteca, `app.css:3673`) não muda no hover; a referência pede `#0f172a`. | o próximo bloco que tocar a biblioteca de abas | o hover está na classe da biblioteca, valendo para toda tela |
| **J567-C1-01** | `P-567-TRAVA-DINHEIRO-TEMPLATE`: a T-DIN-P não pega a desmarcação do dinheiro sem `as` (por template ou por parâmetro `string`). Com a conta no `aria-label` do gráfico de 6 meses, nenhum teste pega. O objeto não usa esse caminho. | o próximo bloco de tela de dinheiro | a trava recusa os 2 caminhos, provado por mutação |

## O que vem depois
1. O conserto da leva A, pelo `dev-10b-a-cl`.
2. A conferência:
   - as 3 aparências, pelo orquestrador, recapturadas nas larguras da lei contra a referência;
   - o código, por um verificador que não consertou: ele roda o comando de cada achado da leva A, confere o vermelho sob a mutação e lê o TAP do CI inteiro nas 2 rodadas.
3. O merge com as travas, que **fecha o item 61**.
4. A porteira.

Nenhuma cadeira se refaz (§C7 10(4)): o conserto não muda regra de dinheiro, permissão nem isolamento.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Conserto da leva A:** `dev-10b-a-cl`. A conferência visual do orquestrador deu CONFERIDO, com os 13 desvios fechados (15/11 03:15); pendência nova `P-567-DETALHE-A-SERVICO-CORTADO`.
- **Conferência do código:** `ver-567-cl` (Claude, sem cruzamento, declarado) deu VOLTA por 1 não grave, o VER567-1. Pelo §C7 10(4), virou pendência, e o bloco seguiu: `P-567-SERIE-TRACO-SEM-TESTE`, `P-567-BIBLIOTECA-MODOS-NAO-REGISTRADOS` (VER567-2) e `P-567-DIARIO-MUTACAO-APARENCIAS` (VER567-3).
- **Merge:** squash `fa23e97a` (15/11 03:48), do head `b2184a5d`; CI do merge `43687126319`.
- **Porteira:** `porteiro-567`, LIBERADO COM RESSALVA (15/11 04:14). **O item 61 FECHA:** 0 rota de markup (as 9 dão 404), 1 rateio por importação e período, as 3 visões e as 3 aparências aprovadas; os 4 blocos donos na `main` (#498, #542, #566, #567); servidor 87/87.

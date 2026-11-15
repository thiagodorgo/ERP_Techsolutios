# B-SAN3-15b — diário do dev (resumo)

- **Dev:** `dev-15b-cl`, Claude Opus 5.5, dev declarado. Identidade nova: não é autor do plano nem das Emendas 5 a 5.3, nem
  crítico. Sem cruzamento entre casas (§C7 11(2)), por ordem do dono de 13/11.
- **Lei:** `plano-B-SAN3-15-v2.md` (Emendas 1 a 4) e as Emendas 5 (abertura), 5.1, 5.2 e 5.3, com as conferências delas
  (APROVADO COM AJUSTES nas três primeiras; 5.3 APROVADA).
- **Terreno:** worktree próprio no ramo `feat/mobile-prestador-15b`, criado da `origin/main` `d2737339` (o ramo não existia no
  remoto); `npm ci` e `flutter pub get` próprios; nenhum banco, nenhuma 5432, 6379 nem `.env`.
- **Diário completo** (cada comando, saída e veredito parcial): `erp-pausa-2026-10-03/revisoes/b-san3-15b/dev-15b-cl.md`.
  Toda hora é de São Paulo, medida por `date`.

## Linha de base (CI da `main` `d2737339`, rodada 43549057754)

`backend` 5554 testes, 2 pulos, 0 falha · `flutter` +1241 · `backend-postgres` 621, 0 pulo. O RC8 do bloco C
(`tests/b-material-custodia.test.ts`) 7/7 na `main` do dia.

## Fatias e commits

| Fatia | Commit | O que entrou |
|---|---|---|
| F-maq | `64e6dd41` | a maquete aprovada em `screen-refs/prestador-atendimento-3opcoes.reference.html` (o verificador 17/17; o blob igual à origem) e a linha do índice |
| F0b | `02e40402` | os vermelhos-controle: T-K1/T-K1d, T-K2/T-K2b, S-K(a) 14 e S-K(b) 3 verdes, T-P1–T-P4/T-P2c, T-D1–T-D6, T-H1–T-H6, T-U1–T-U5/T-U7, T-M2/T-M2b; a I5a reexecutada (1 instância 20 de 20; 2 instâncias 10 de 20); a ordem de travas lida; o `kind` da execução do prestador (`collection`); o registro das decisões de 13/11 |
| F3 | `5f567756`, `142bedcf` | `serviceKind` na lista e no detalhe (o mapa só leva os tipos conhecidos); o parser do app |
| F6 | `bdd79f90`, `8fe8b5b3` | peça e fila numa transação; o arnês do T-U3 corrigido para a M-U2 morrer |
| F5a | `caeb06b2` | notas por usuário no banco v18, a mensagem da conclusão e a purga nos dois caminhos |
| F5b | `bbfa1bbe` | as portas do prestador |
| F5c | `8bb52663` | a conclusão honesta |
| F5d | `40e30067` | o estoque na opção A, a `MobileExpandableRow` e os testes K1 a K4 |
| F9b | (este) | os controles finais e o registro |

## Mutações (cada uma sozinha, com âncora de contagem 1, só o teste-dono, revertida)

Todas vermelhas por asserção: M-K1, M-K2, M-K2d, M-K3, M-P1, M-P1b, M-P1c, M-P2, M-P3, M-D1 a M-D4, M-H1, M-H2, M-H2b,
M-H4, M-H5, M-H6, M-U1, M-U2 (5 de 5), M-U3, M-U4 (10 de 10, com o teste 21 do `bo6r11_fila_serializada_test.dart`), M-U5,
M-A19, M-A21, M-E1, M-E1c, M-E2, M-E2b, M-E3, MA26, MA29 (K1, K2 e T-E2), MA-DUP, MA-DUP2, MA-K4a, MA-K4b e MA-K4c. Os
controles das sondas batem com as emendas: MC-SK1 `+12 -2`, MC-SK2 `+8 -6`, MC-SK3 `+0 -14`, MC-SK4 `+12 -2`, MC-SKb1 e
MC-SKb2 `+2 -1`.

## Achados do dev, registrados

1. **A M-K2 sobreviveria** com a F3 como estava (o mapa levava toda OS, e o padrão `unknown` do DTO era código morto).
   Conserto em `142bedcf`: o mapa só leva `tow` e `provider`.
2. **A M-U2 sobrevivia** ao T-U3 da F0b (o atraso do store lento vinha antes da leitura, e a trava de transação do Drift
   serializava sozinha). Ajuste do arnês em `8fe8b5b3`, sem mudar asserção: o atraso vem depois da leitura.
3. **A tela de estoque da `main` quebra com o tema do app** (achado da Emenda 5.2, reproduzido aqui na F0b: os 8 casos do T-E
   caíram por exceção de layout). A F5d consertou por construção; a classe vai como apenso da
   `P-APP-DETALHE-OS-LARGURA-INFINITA`.

## Leituras do dev, declaradas (§A6), que o orquestrador desfaz numa linha

1. As notas passam pelo `PrestadorRepository`, para a conclusão não tocar no banco quando o teste não o sobrepõe (`b120`,
   caso 9, intocado).
2. A purga das notas é um helper chamado nos dois caminhos (a âncora da M-D3 com contagem 1).
3. O arnês do T-D usa a fiação de produção (sem sobrepor o repositório do prestador); provado que ainda mede: sem a F5a na
   `lib/`, os mesmos vermelhos da F0b.
4. O getter `@visibleForTesting materialUnit` do `PrestadorRepository`, para os testes conferirem o tipo da unidade.
5. "Corte em 2.000 caracteres, com '…'" = a mensagem inteira com no máximo 2.000 caracteres.
6. Os textos sem acento da tela de Atendimento ficam (o `b119:288` assere um deles); vão como apenso da
   `P-MOBILE-TITULOS-SEM-ACENTO`.
7. O fundo da linha aberta da `MobileExpandableRow` vem da pílula de informação da biblioteca (o tema não tem token
   `#EFF6FF`).
8. Observação BAIXA da conferência da 5.3, só registrada: com escala de texto 2,0, o título curto corta e o meta fica com o
   espaço.

## Registro deste PR

- `decisoes.md`: `D-DONO-1311-RECOMENDACOES`, parte do B-SAN3-15b (F0b).
- `pendencias.md` (o índice pelo gerador): fecham `P-MOBILE-PRESTADOR-SEM-PORTA`, `P-MOBILE-CONCLUSAO-SEM-PORTA`,
  `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS` e `P-OS-TIPO-GUINCHO-PRESTADOR`; apensos em `P-MOBILE-TITULOS-SEM-ACENTO` e
  `P-APP-DETALHE-OS-LARGURA-INFINITA`; abrem `P-SAN3-15-CONCLUSAO-VEICULO-COM-CODIGO`,
  `P-SAN3-15-TIPO-NULO-EM-FALHA-DO-CATALOGO`, `P-MOBILE-UNIFICAR-CHIPS-DE-FILTRO`, `P-SAN3-15-ACHADOS-DA-MAQUETE-FORA-DO-BLOCO`,
  `P-SAN3-15-ASSINATURA-CLIENTE-PRESTADOR` e `P-MOBILE-CLEARALL-SEM-FILHAS`.
- `PLANO_SAN3.md`: itens 35 e 36 fechados pelo bloco; a linha do bloco com o ramo de 14/11.
- `API_CONTRACTS.md`: o `serviceKind` (F3). `COMPONENT_LIBRARY.md`: a `MobileExpandableRow` (F5d).
- Fica com o orquestrador: a pergunta ao dono "linha do app com 48 ou 44" (Emenda 5.2 §8.1) e as notas para o plano do 17.

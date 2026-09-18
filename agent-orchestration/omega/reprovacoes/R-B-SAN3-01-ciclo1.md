# R-B-SAN3-01-ciclo1 — reprovação do ciclo 1 (a web deixa de fabricar dado quando o backend recusa)

> Objeto julgado: `bb540fb3` (PR #387; head na junta `74f3f7c9` = objeto + 10 arquivos de registro). Junta de 4 cadeiras,
> unanimidade de 4 (bloco de perda de dado + a 4ª cadeira pela R1 do inspetor). Votos em `votos/B-SAN3-01/`. Teto de dois
> ciclos (`D-TETO-DOIS-CICLOS`): **este é o ciclo 1; o ciclo 2 é o último** — se reprovar, para e vai dossiê ao dono.

## Veredito: REPROVADO 2 × 2

| Cadeira | Identidade | Voto | bloqueia (dentro) | ajuste | nota |
|---|---|---|---|---|---|
| C1 diff × plano, bateria, KPI, registro | `validador-mestre` (2ª instância; a 1ª caiu por 429) | APROVADO | 0 | 1 | 5 |
| C2 telas e rotas ponta a ponta | `master-teste-telas-rotas` (3ª instância dentro do workflow; ver quedas) | APROVADO | 0 | 0 | 7 |
| C3 fidelidade dos estados | `cognicao-visual` | REPROVADO | 1 (C3-B1) + 1 pré-existente (C3-P1, não reprova) | 4 dentro + 1 pré | 4 |
| C4 fail-closed | `guardiao-fail-closed` (2ª instância; a 1ª caiu por 429) | REPROVADO | 3 (C4-01, C4-02, C4-03) | 2 dentro + 1 pré | 3 |

## Os bloqueios dentro do bloco (quem achou → o quê)

- **C3-B1 (`cognicao-visual`).** Os painéis novos de erro e de sem permissão da lista de OS não recriam os estados do protótipo
  (`ERP Web.dc.html:370-382`): sem a borda `#FECACA`, sem os ícones (alerta vermelho × escudo cinza), título 14/700 `#0F172A` no
  lugar de 16/800 `#334155`, detalhe `#64748B` no lugar de `#94A3B8`, padding lateral 18 contra 32, retry como link no lugar do
  botão cheio. Erro e sem permissão só se distinguem pelo texto.
- **C4-01 (`guardiao-fail-closed`).** A mutação do reducer que transforma 403 em "vazio" (ou 403 em "não encontrada" no detalhe)
  passa com 47/47 e 1173/1173. A verdade "sem permissão" vive em dois campos (`source×forbidden` no service, `status×forbidden`
  no estado) sem teste que os amarre; quando divergem, vence o lado benigno.
- **C4-02 (`guardiao-fail-closed`).** O guard G1 é léxico: `?? getMock…` no `else` de `if (isMockMode()) {}`, numa linha com
  comentário citando `isMockMode()`, num service NOVO de OS, ou com constante `mock…` sem o prefixo `getMock` — todos passam
  verdes. O fechamento da `P-008` ("guard estrutural G1, provado por mutação") afirma o que a mutação desmente.
- **C4-03 (`guardiao-fail-closed`).** Um status novo na lista (ex.: `unavailable` no 5xx) cai no painel vazio com KPIs 0: o
  `degraded` reconhece só dois status de falha e o último ramo do `WorkOrdersLoadState` é o vazio. O detalhe, no mesmo PR, cai
  no erro por padrão — a assimetria está no código novo da lista.

## Ajustes dentro do bloco (entram na correção — o ciclo 2 é o último)

C1: A-C1-01 (a prosa de KPI do próprio PR ficou no estado dos commits C/D). C3: A1 (detalhe: sem permissão × não encontrada não
se distinguem a olho), A2 (botões novos do detalhe sem hover nem o foco do padrão), A3 (ícone verde de "sob controle" com valor
"—"), A4 (a `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` cobre só parte do defeito medido e tem dono sem o arquivo no escopo).
C4: 04 (a regra "desatualizado mantém os dados" não vigia a fiação dos hooks), 06 ("nada disso alcança um usuário" é falso:
`/logistics` serve `mocks/work-orders/` em modo real).

## Pré-existentes (não reprovam; viram pendência nomeada com dono)

C3-P1 (Dashboard: selo "Despachos: Fallback local" e "Nenhum despacho ativo" quando a consulta falha), C3-P2, C4-05 (fechamento
de contagem cíclica fabricado, fora da fronteira e sem pendência), C4-08, C4-09, A-C1-03, C2-N2, C2-N3, C2-N5 e as notas.

## As três perguntas do §C7.4-bis

- **(a) A composição cobre a competência que os achados exigem?** Sim. A 4ª cadeira, acrescentada pela R1 do inspetor, é a que
  achou os três bloqueios de fail-closed; a C3 é a dona da fidelidade. Para o ciclo 2, **identidade nova nas duas cadeiras que
  reprovaram** (`D-TETO-DOIS-CICLOS` item 2): C3 → `frontend-pixel-master`; C4 → `coordenador-de-acessos` (o C4-01 é a cadeia
  403 → estado "sem permissão"; o mandato de mutação e enumeração vai por extenso no briefing). C1 e C2 revotam o objeto novo.
- **(b) Quem achou é quem conserta?** Não. Acharam `cognicao-visual` e `guardiao-fail-closed`; planeja o `planejador-mestre`
  (Fable, obrigatório no replanejamento — §C7.6); desenvolve um agente `general-purpose` NOVO (nenhuma das instâncias
  anteriores do desenvolvedor, nenhuma cadeira).
- **(c) O planejador usou dado podre?** Em parte. O plano declarou o G1 "provado por mutação" medindo só as formas do mandato
  (G1a–c), sem atacar a regra léxica; e registrou como morta uma origem de OS fabricada que tem rota viva (`/logistics`), sem
  medir. A correção enuncia cada garantia como **propriedade** e a prova por mutação contra a propriedade (lição
  `feedback-correcao-por-instancia-nao-propriedade`), e nenhuma premissa entra sem comando que a meça.

## Quedas (P6)

Ver `votos/B-SAN3-01/00-quedas.md`: C1 e C4 caíram uma vez por 429 antes de medir; a C2 teve duas quedas dentro do workflow, e a
3ª instância sobrescreveu sem cópia o parcial da 2ª (o voto final é da 3ª, completo).

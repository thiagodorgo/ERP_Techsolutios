# R-B-GOV-MANDATO-4 — ciclo 4 reprovado (§C7.4)

- **Entrega:** `B-GOV-MANDATO` (PR #393) — o mandato do orquestrador passa a ser verificável por máquina.
- **Objeto reprovado:** `371b09b26cf51ee28996074c81e2f91dca585cc3`. **Ata:** `J-B-GOV-MANDATO.md`, seção "Ciclo 4",
  **REPROVADO 2 × 1** (C1⁗ e C2⁗ contra, C3⁗ a favor). Evidências e votos em `votos/B-GOV-MANDATO-ciclo4/C1..C3-evidencia.md`.
- **Ciclo:** 4. **Teto:** não há (`D-SEM-TETO-AUDITORIA-NO-3`). A auditoria da máquina feita no ciclo 3
  (`R-B-GOV-MANDATO-ciclo3-auditoria.md`, atestação `CONSERTO VERIFICADO`) **serve aos ciclos seguintes**: o ciclo 5
  abre sem auditoria nova, com os papéis recompostos.

## Os dois `bloqueia`, como as cadeiras os escreveram

- **C1d-01** (`dentro-do-bloco`): no pré-voo do head, um SHA fabricado escrito colado depois de `:` (`head:<SHA>`,
  `merge:<7 hex>`, `HEAD:<SHA>`) sai **PRE-VOO OK**, enquanto a gêmea com espaço depois do `:` é rejeitada. A
  propriedade do §15.2 (*"`:` não esconde um SHA"*) a cobre; o conserto S4a do ciclo 4 não a alcançou; nenhuma
  fronteira declarada (P-GOV-MANDATO-2, P-GOV-MANDATO-3) a absolve.
- **C2d-02** (`dentro-do-bloco`): o guard do pré-voo **não exige** a rejeição de SHA abreviado (7 a 39 hex) em prosa
  fora da proveniência — a mutação que restringe a emissão a 40 hex troca REJEITADO por PRE-VOO OK e o guard fica verde.

## A classe se repetiu? — o relato que o §C7.4 manda fazer

**Sim, pela quarta vez, com informação nova.** A família é a mesma desde o ciclo 1 — *o pré-voo reconhece a FORMA de
um SHA em vez de enunciar a propriedade "todo SHA citado vem da colagem"* —, e cada ciclo achou formas novas do outro
lado da última correção: ciclo 3 achou o SHA colado a um caminho por `:` (C1c-02); o ciclo 4 consertou um lado da
partição em `:` e a C1⁗ achou o outro (C1d-01); e a C2⁗ mostrou que o guard não amarra a emissão ao comprimento (C2d-02).
A informação nova é real (formas novas, medidas por mutação), mas a **classe** não converge. É o sinal de
não-convergência que o §C7.4 manda o orquestrador relatar — e é a pergunta que o plano do orquestrador de 28/09 (§6.6)
deixou para o dono: *"o mandato devia ser prosa?"* Um mandato com campos declarados tornaria a dependência de forma
impossível por construção; um linter de prosa continuará reconhecendo formas. **A decisão é do dono**; o ciclo 5 abre
pelo protocolo enquanto ela não vem.

## Separação de papéis (§C7.4-bis), respondida por escrito

- **(a) A composição cobre a competência?** Sim: os dois `bloqueia` vieram das cadeiras de forma/morte interna (C1⁗) e
  de cobertura por mutação (C2⁗), as competências que o achado exige. O ciclo 5 mantém as duas competências, com
  identidades novas.
- **(b) Quem achou é quem conserta?** Não pode ser: C1⁗ e C2⁗ (e o inspetor da junta 4) ficam inelegíveis para planejar
  e desenvolver o ciclo 5. O planejador do ciclo 5 é identidade nova (`planejador-ciclo5-b-gov-mandato`); os devs também.
- **(c) O planejador usa dado podre?** Risco nomeado: a C2⁗ foi retomada em outra plataforma (Codex) depois de uma PAUSA
  e re-executou o que usou; o planejador do ciclo 5 trata os dois achados como relato com evidência e **re-mede** cada
  um no head antes de escrever o plano (o vermelho-controle de cada `bloqueia` reproduzido por ele mesmo).

## Modelo e onde roda

Fable e GPT-6 Astra estão **suspensos pelo dono até o reset semanal** (2026-10-03). O ciclo 5 roda no **Codex, GPT-5.6
Sol**, com a substituição declarada em cada artefato — inclusive o `planejador-mestre`, cuja obrigação de Fable no
retorno ao planejador (§C7.6) fica suspensa pela decisão do dono (fonte §A1.1).

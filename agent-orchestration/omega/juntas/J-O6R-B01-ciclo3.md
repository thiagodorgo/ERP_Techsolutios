# J-O6R-B01 · junta do ciclo 3 — **APROVADO COM CORREÇÕES, 5×0, sem veto**

- **Data:** 2026-08-19 · **Objeto:** o código do ciclo 3 (`f5a8e9a`).
- **Composição (5):** `inspetor-de-arnes-concorrente` · `guardiao-fail-closed` (criadas no ciclo 1, §C7.4) ·
  `critico-adversarial` · `agente-secops` · `agente-dba-guardiao`.
- **Placar: 5 × APROVADO_COM_CORREÇÕES · nenhum veto.** É o primeiro ciclo dos três sem veto.

## Papéis (`D-JUNTA-SEPARACAO-DE-PAPEIS`) — a ata é inválida sem isto

| Papel | Quem |
|---|---|
| **Acharam** | `critico-adversarial` (reabriu a premissa, PD de 9 fontes) + orquestrador |
| **Planejou** | `planejador-mestre` (Fable) — não achou nada, não implementou |
| **Desenvolveu** | agente dedicado ao ciclo 3 — **não** é o do ciclo 1 nem o do 2 |
| **Votaram** | as 5 cadeiras acima |

**O desenvolvedor escalou em vez de remendar:** achou que o produtor residual de órfãs era uma suíte **nascida
neste bloco**, o que **contraria a premissa do plano** (que assumia suíte irmã pré-existente e prescrevia
transferência). Registrou a evidência nas duas pendências e **deixou a escolha para a junta**.

## Unanimidade nas cinco perguntas

| Pergunta | 5×0 |
|---|---|
| O residual das órfãs bloqueia? | **NÃO** |
| A leitura do orquestrador (órfã só alcançável em banco de teste) se sustenta? | **SIM** |
| A escolha escopada do P2, com a perda declarada? | **ACEITA** |
| O ratchet satisfaz o P3 (mecanismo, não convenção)? | **SIM** |
| O desvio da meta M ≥ 2N? | **RATIFICADO** |

**Confirmação independente da leitura do residual** — e o `dba` a reforçou por um caminho **mais forte** que o
grep do orquestrador: `auth_identity_links` tem FK para `tenants`, e **não existe rota `DELETE` de organização
ou de usuário** em `core-saas/` nem em `platform/`. Órfã na trilha é **estruturalmente inalcançável em
produção**; ela só nasce onde o teardown de teste apaga o tenant.

## O que a junta mediu a favor

- **`C1` provado independentemente** (crítico): 3 execuções de `auth-identity-backfill-db`, **18/18 verde e
  zero linhas órfãs novas**. E o `dba` quantificou por `EXPLAIN`: o statement verbatim varria a base; o
  escopado não.
- **Os dois lados do ratchet executados** (inspetor): arquivo novo com literais **fica vermelho e é nomeado**;
  o mesmo conteúdo dentro de arquivo da allowlist com a contagem certa passa — como declarado.
- **`C4` confirmado no cluster** (crítico): **zero** roles `o6r_*` vivas — as 5 órfãs legadas foram recolhidas.
- **A allowlist do ratchet é honesta** (dba): recontagem independente das 6 regexes deu **exatamente** os
  números congelados.
- **Higiene estritamente melhor que a herdada** (dba): as famílias deste bloco são as **únicas** do banco com
  varredor.
- **`incrementFailedAttempts` grava `locked_until` num UPDATE atômico** (secops, a favor).

## A OITAVA e a NONA instâncias da classe — corrigidas antes do merge

Ambas nasceram **dentro de correções**, o padrão que esta trilha já viu sete vezes:

1. **`db-catalog-write-guard.test.ts`** afirmava *"nenhum escritor novo entra despercebido"*. O crítico e o
   `guardiao-fail-closed` executaram **três escapes**: `create role` minúsculo e SQL por concatenação passam
   verdes · a varredura só enxerga `.ts` · a trava é de contagem **total** por arquivo, então trocar um
   `GRANT` por um `CREATE ROLE` no mesmo arquivo preserva o total. O header passou a declarar os três, e a
   garantia foi reescrita para o que ela entrega: *"nenhum escritor novo entra despercebido **pela grafia que
   este repositório usa hoje**"*.
2. **O comentário do sweep** dizia que a role de `SIGKILL` é recolhida *"pela PRÓXIMA execução"*. Medido: uma
   role com LOGIN e escrita em 115 tabelas **sobreviveu a duas rodadas completas** — o recolhimento depende do
   corte de 60 min, não da próxima execução. Reescrito.

## Correção ao registro do orquestrador

O crítico corrigiu uma afirmação minha: *"sob carga MAIOR que a do job"* **não é margem provada**. E mediu o
teto — a ~2× a contenção, o arranjo reprova em 35–41 s contra orçamento de 30 s e o denominador cai para 134.
**Registro corrigido:** as medições são conservadoras, não uma prova de folga.

E uma inversão que muda o peso de tudo: **o runner da CI tem 2 vCPU, logo `availableParallelism()-1` = 1
worker.** Todas as medições desta trilha usaram **7**. A serialização é exercida onde o lote é mais denso e
**não** é exercida na CI — o que torna as medições conservadoras, e reforça o `P1` (paralelismo declarado),
que segue no bloco irmão.

## Correções vinculantes — 27, enunciadas como PROPRIEDADE

Registradas em `pendencias.md`. As de maior peso:

- **Três ALTAs do `secops` na superfície deste bloco:** o caminho anônimo **não arma o lockout e não deixa
  rastro** (12 tentativas medidas) → `P-O6R-B01-ANONIMO-SEM-LOCKOUT`, dono natural `B-O6R-07` · a religação
  **não tem via de saída** para o titular da conta provada → `P-O6R-B01-RELIGACAO-SEM-REMEDIO` · `logError` é
  **código morto** → `P-O6R-B01-LOGERROR-MORTO`.
- **A autoridade de papel não é única em toda superfície** (`guardiao-fail-closed`, mutação N2: 125/125 verde
  com `navigation.service.ts` mais permissivo). **Não bloqueia**: aquele `Set` monta **menu**, não autoriza —
  §3 do contrato diz que a UI só molda e o backend é a autoridade. Segue em `P-O6R-B01-ROLE-LITERAIS`.
- **`P-O6R-B01-ROUTE-ERROR-LEAK` emendada:** o escopo citava só o `DELETE`; o `GET` da mesma rota devolve a
  mensagem crua do Postgres.
- **`P-O6R-ARNES-ISOLAMENTO` emendada** com quatro medições: o paralelismo do runner é **1** · o aborto deixa
  **26 organizações órfãs** sem caminho de remoção · o **denominador não é asserido** em lugar nenhum
  (medido 60 × 65 no mesmo comando) · a fila do lock tem **teto medido**.
- **`C-1` do `dba`, exigível antes da junta de PROMOÇÃO e não deste merge:** drill de restore sobre dump
  tirado **depois** da migração.

## O que esta junta NÃO decidiu

- **Não liberou deploy.** O bloqueio da J-6R segue integral: fechar este bloco leva os críticos a **4 de 15**.
- **Não reclassificou achado** nem mexeu em severidade.
- **Não decidiu o destino do produtor residual** (`core-saas-role-authority-db`) — o crítico **recomendou** a
  opção (a) (o teardown adota o idioma escopado do arnês), porque a (b) transferiria ao bloco irmão um
  produtor que **este** bloco criou. Fica registrado como recomendação de cadeira, não decisão.

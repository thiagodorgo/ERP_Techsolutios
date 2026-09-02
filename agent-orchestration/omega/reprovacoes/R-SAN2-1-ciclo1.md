# R-SAN2-1 ciclo 1 — REPROVADO pela cadeira de triagem (2026-08-29)

**Achador:** `jurado-san2-1-triagem` (identidade nova, com veto). **Head julgado:** `3ef2173`.
**Veredito: REPROVADO** — 1 `bloqueia`, 4 `ajuste`, 1 `nota`. Voto verbatim em `votos/SAN2-1/02-*.json`.

## A causa-raiz, medida pelo orquestrador depois do voto

O classificador de `gerar-indice-pendencias.py` (e o script de triagem que o precedeu) decidia "fechada" com
`re.search(r'\bRESOLVID|\bFECHAD|\bDESCARTAD|\bSUPERAD|\bDECIDIDA', cabecalho)`. **Duas classes de erro**,
ambas reproduzidas em bancada:

1. **Vocabulário de DOMÍNIO confundido com vocabulário de STATUS.**
   `P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período **fechado**` → casou `\bFECHAD`. "Fechado" ali
   qualifica o **período contábil**, não a pendência. Uma palavra do negócio virou um veredito de estado.
2. **Resolução PARCIAL lida como resolução.**
   `P-Ω3F6-COMISSAO — … **RESOLVIDO PARCIAL**` → casou `\bRESOLVID` e **ignorou o qualificador**. O corpo da
   entrada diz, textualmente, *"Residuais BAIXA abertos:"* e lista quatro — `CANCEL-RACE`, `LEGACY-NULL`,
   `CANCEL-IDEM`, `MOBILE-DEADLETTER` — que **não têm cabeçalho próprio em lugar nenhum do arquivo**.

## Por que isto é `bloqueia` e não `ajuste`

Fechar `P-Ω3F6` **some com quatro pendências abertas** da resposta do índice a *"o que está aberto?"*. É a
**mesma classe** do defeito que originou esta rodada — `P-O6R-B04` figurando como fechado enquanto carregava
2 P0 — reencenada pelo bloco que existia para exterminá-la. E o boilerplate que o próprio bloco colou embaixo
diz *"não fechei o que não verifiquei"*, tornando a entrada autocontraditória na mesma tela.

## Os seis achados

| id | gravidade | o quê |
|---|---|---|
| **A-1** | **bloqueia** | `P-Ω3F6` fechada carregando 4 residuais que ela declara abertos e que não existem como entrada |
| A-2 | ajuste | `P-Ω4-7-CLEAR-RETRO` fechada sem se declarar resolvida em linha nenhuma |
| A-3 | ajuste | o boilerplate mente em **14 entradas**: `status: FECHADA` com nota dizendo "Marcada ABERTA por padrão conservador" |
| A-4 | ajuste | **"zero entradas sem status" é falso**: 5 sem linha de status (2 pela régua da própria linha de base) |
| A-5 | ajuste | balde C tem ≥2 não-cosméticas em 6 amostradas — `P-Ω4-7-CLEAR-ATOMIC` (espelho declarado de um item do balde **A**) e `P-Ω4-3-REFATURAR-DELTA` (receita executada que o produto não fatura) |
| A-6 | nota | regra frágil: agendamento **vence** severidade na escolha de balde; severidade sai de varredura no corpo inteiro; placar conta **cabeçalhos** (228) como se fossem pendências (220 IDs) |

## O que o jurado NÃO conseguiu invalidar, e vale registrar

O índice é **idempotente e byte-idêntico ao commitado** — ele reexecutou o gerador a partir de cópia no
scratchpad e o `diff` saiu **vazio**. A correção do `DIFERIDO-LEVE` (de status para agendamento) **basta no
registro**: zero `status: DIFERIDO-LEVE`, as 81 seguem `ABERTA`, todas com marcador de agendamento. E a
`D-GOLIVE-MAPS-ROTACAO-DISPENSADA` está registrada **com os dois limites escritos por extenso**.

## Separação de papéis (§C7.4-bis)

**Quem achou:** `jurado-san2-1-triagem` — reportou defeito + evidência executada + motivo, e **não propôs
correção**. **Quem corrige:** o orquestrador, que é o **autor** do diff — não o achador. A contaminação a
vigiar aqui é de autoria, não de achado: quem escreveu o classificador vai reescrevê-lo. Por isso o **ciclo 2
vai à junta com cadeira de triagem de identidade NOVA**, e a correção tem de ser provada **por mutação**, não
por releitura.

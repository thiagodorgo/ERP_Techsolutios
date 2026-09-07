# J-<BLOCO> — ata da junta do bloco `<BLOCO>`<, ciclo N>

> Molde. Copie para `J-<BLOCO>.md` e preencha. Seção vazia = seção não cumprida — não apague,
> escreva o que faltou e por quê. Ata sem §2 (papéis) = **ciclo inválido**; ata sem §P (assento
> permanente) = **merge inválido** (§C7.1-quater).

> **Quórum:** <maioria de 3 | unanimidade de 3 (bloco toca dinheiro/segurança/permissão/perda de dado) |
> unanimidade de 5 (produção, dependência nova, serviço externo pago)> — §C7.1-ter(b).
> **Head julgado:** `<hash>` · **Base do bloco:** `<hash>` · **Branch:** `<branch>` · **Worktree:** `<path>`
> **Terreno:** `<LIBERADO | LIBERADO COM RESSALVA | BLOQUEADO>` (passada <n>).

---

## §1 · VEREDITO

**<APROVADO | REPROVADO> — <N>×<M><, unânime>.**

| Cadeira | Corpo | Voto | Achados |
|---|---|---|---|
| **C1** `<agente>` | `<hash>` | | |
| **C2** `<agente>` | `<hash>` | | |
| **C3** `<agente>` | `<hash>` | | |

Votos integrais em `votos/<BLOCO>/`.

---

## §2 · §C7.4-bis — QUEM OCUPOU CADA PAPEL (sem isto, ciclo inválido)

| Papel | Quem | Observação |
|---|---|---|
| **Quem ACHOU** | | não propôs correção |
| **Quem PLANEJOU** | | inelegível para votar |
| **Quem DESENVOLVEU** | | não julgou a validade do achado |
| **Quem JULGOU** | C1, C2, C3 — identidades novas | nenhuma escrita ou instruída pelo executor |
| **Quem HOMOLOGOU** | `cadeira-permanente-backend-review` | assento permanente — §P |

### As três perguntas obrigatórias, respondidas por escrito

**(a) A composição cobre a competência que os achados exigem?**

**(b) Quem achou é quem consertou?**

**(c) O planejador está usando dado podre?**

---

## §3 · O QUE CADA CADEIRA PROVOU, POR EXECUÇÃO

### C1 — <competência>
### C2 — <competência>
### C3 — <competência>

---

## §P · ASSENTO PERMANENTE — HOMOLOGAÇÃO DO VOTO (§C7.1-quater)

> Roda **depois** das cadeiras de mérito e **antes** do merge. Parecer integral em
> `votos/<BLOCO>/99-cadeira-permanente.md`.

**P.1 · Cada voto foi GANHO?**

| Cadeira | Executou? | `N` e forma? | `escopo` com evidência? | Veredito |
|---|---|---|---|---|
| C1 | | | | `GANHO` / `NÃO GANHO` — motivo |
| C2 | | | | |
| C3 | | | | |

**P.2 · Cada veto foi LEGÍTIMO?** *(só quando houver reprovação)*

| Achado | `dentro-do-bloco`? | No escopo do plano? | Evidência executada? | Veredito |
|---|---|---|---|---|
| | | | | `LEGÍTIMO` / `ILEGÍTIMO` — motivo |

**P.3 · Quórum:** exigido pelo risco = <> · aplicado = <> · <bate / não bate>.

**P.4 · Série entre juntas:** <padrão novo, com ata e nome | nenhum padrão novo>.

**P.5 · Série da própria cadeira:** <X> homologadas · <Y> anuladas (acumulado).

**P.6 · Pendências abertas por ela:** <defeito de produto visto e devolvido ao bloco dono; falha de processo>.

**P.7 · Verificações executadas:** <comando · N · forma · resultado>. Não executado: <o quê e por quê>.

**VEREDITO DO ASSENTO:**
`<HOMOLOGADO | HOMOLOGADO COM RESSALVA | ANULADO POR APROVAÇÃO NÃO GANHA | ANULADO POR VETO ILEGÍTIMO>: <…>`

---

## §4 · PENDÊNCIAS E O QUE SEGUE ABERTO

## §5 · CONSEQUÊNCIA

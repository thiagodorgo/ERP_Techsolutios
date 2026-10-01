# B-SAN3-05 — PLANO v3 — o papel de runtime não escapa de RLS (itens 9 e 10 do §4.1) — ciclo 1, replanejado após a crítica r2 (última rodada do crítico)
> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-san3-05-v3` (nova; não planejou v1/v2, não criticou, não desenvolve — §C7.4-bis) · **modelo:** **Fable 5.1** (`claude-fable-5-1`, o fixado no frontmatter; **sem substituição**) · **mandato_md5:** `068dbc0ee9bc5f1b0d3a80fd41ab3e69` (`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md | md5sum`)
> **Mandato:** `agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md` (63 linhas; mandato_md5 `068dbc0ee9bc5f1b0d3a80fd41ab3e69`) · **corpo do papel:** `git show HEAD:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum` → `4c912f69a93f07b14d8fd1c49539c778` · **relatório de evidência (P1):** `agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md` · **responde a** `docs/revisoes/SAN3/B-SAN3-05-critica-r2.md` (crítico `critico-b-san3-05`, Opus 5.5 declarado, head `c727156`) · **v2 recuperável em** `c727156`, **v1 em** `c3f57e9`.

> **MEDIDO (onde este plano foi medido).** Sessão de **nuvem**: `uname -a` = `Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 GNU/Linux`; `PATH=/opt/node20/bin:$PATH node -v` = `v20.20.0` (o Node do CI, `ci.yml` `node-version: 20` em 5 jobs; o v22 da imagem não foi usado para número nenhum); `git --version` = 2.43.0. Ramo `docs/plano-b-san3-05` (base `5b6e1036` = merge-base com `origin/main`; `origin/main` = `5bcdcc58`, 2 commits de registro/governança depois). **As árvores `src`, `tests`, `scripts`, `prisma` são IDÊNTICAS** entre `5b6e1036`, `3b1fe0f9` (base da v2) e `origin/main` (`git rev-parse <ref>:<dir>` → `21e1c4f2…`, `2854a3ec…`, `6445f8bc…`, `e906ac2e…` nas três) — logo toda medição de código deste plano vale para `origin/main`; o ramo só toca `docs/` e `agent-orchestration/` (`git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l` → 0). Postgres **16.14** descartável próprio em `127.0.0.1:54371` (porta provada pela conexão; `ss` não existe na imagem), banco `erp_v3` com as migrações do head (115 tabelas, 106 FORCE, 0 views), defaults de log do PG16 (`log_min_error_statement=error`, `log_statement=none`). Sem Docker. Nenhum SHA digitado; nenhum número herdado da v2 nem das críticas — cada um foi re-executado (relatório §0–§6).
>
> **HIPÓTESE (o que não foi medido aqui), com o comando que derruba:** só o que depende de Docker (compose local-prod, H1), do ambiente do Fly (H2/H3/H5) e do runner (H7 — agora com a imagem medida) — §0.6.
>
> **Onde mora a propriedade — a pergunta respondida duas vezes e derrubada duas vezes (F2 na r1 e na r2) — mora no §2 desta v3.** A v1 respondeu "o guard enuncia a propriedade" (16/17 formas verdes); a v2 respondeu "default negar por forma + T11 de uma rota" (9 formas verdes; T11 cobre o sítio 1). A v3 responde de outro jeito: **a propriedade do item 10 não é enunciável por análise estática** — toda análise estática enumera formas e uma forma nova escapa; o que se pode fazer estaticamente é um ratchet **semântico** (tipo e símbolo, não nome e texto), com residual **declarado por construção** e provado contra as 26 formas que já derrubaram v1 e v2 — **e a propriedade se enuncia dinamicamente, sobre uma superfície FECHADA e enumerada da fonte** (as rotas de plataforma e os dois jobs que tocam tabela FORCE), com o diferencial superusuário × papel sem bypass em cada uma (§2.3, T11a–T11d). O que fica fora dessa superfície (um sítio cru num módulo de organização) não é vazamento de plataforma: é regressão funcional daquele módulo sob papel sem bypass, e só a suíte `-db` inteira sob papel real a vê (`B-ARNES-2`, §13).

---

## Resposta à crítica r2 — achado por achado (medido de novo no head por este planejador; nunca herdado)

EM APURAÇÃO — tabela dos 15 achados (3 `bloqueia`, 6 ajustes, 6 notas) com: mudança no plano (seção) · critério de aceite · mutação que o deixa vermelho · evidência (relatório §).

## §0 — Terreno e linha de base (v3)

EM APURAÇÃO

## §1 — Objetivo · ator · fluxo · contrato

EM APURAÇÃO

## §2 — Onde mora a propriedade — respondido pela terceira vez, de outro jeito

EM APURAÇÃO

## §3 — Entregas

EM APURAÇÃO

## §4 — Modelagem: o papel (script v3), a trava (v3) e o compose

EM APURAÇÃO

## §5 — Arquivos tocados e regra do espelho

EM APURAÇÃO

## §6 — Escopo (§C4): PERMITIDO e PROIBIDO

EM APURAÇÃO

## §7 — Critérios de aceite A1–A24, cada um com a mutação que o deixa vermelho

EM APURAÇÃO

## §8 — Testes: baseline N, meta M ≥ 2N, T1–T16 e a bateria

EM APURAÇÃO

## §9 — KPI (§C3)

EM APURAÇÃO

## §10 — Junta (§C7): quórum, cadeiras, o C3(1) reescrito, papéis

EM APURAÇÃO

## §11 — Atos do dono (seis modos de falha nomeados)

EM APURAÇÃO

## §12 — Riscos e rollback

EM APURAÇÃO

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

EM APURAÇÃO

## §14 — Comando do bloco

EM APURAÇÃO

## §15 — Próximo papel depois desta v3

EM APURAÇÃO

## Apêndices

EM APURAÇÃO — A (gerador v3 verbatim + inventário congelado do head, 53 chaves) · B (medição sob papel real: referência ao blob da v2 + re-execução) · C (`scripts/db-runtime-role.sh` v3 verbatim) · D (fixtures: as 17 da r1 por referência ao blob da v2 + as 9 da r2 verbatim) · E (trava v3, idêntica ao §2.2).

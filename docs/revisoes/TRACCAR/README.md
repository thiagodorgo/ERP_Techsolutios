# Trilha do Traccar: ordem de leitura

O plano é a v2.1 (`PLANO_TRACCAR.md`, inalterado desde `9cb441bd`), emendada pela v2.2 e pela v2.3. Leia nesta
ordem. Onde os documentos divergirem, vale a emenda mais nova e, acima dela, `agent-orchestration/controle/decisoes.md`.

1. `PLANO_TRACCAR.md` — o plano v2.1. As emendas citam as linhas deste arquivo. Por isso ele não é editado: correção
   entra como emenda nova.
2. `CRITICA-r1.md` e `CRITICA-r2.md` — as duas rodadas de crítica que levaram à v2.1.
3. `G-TRC-PD-pesquisa.md` — a pesquisa da PD: Traccar 6.16.0 por digest, licença, CVEs e o forward conferido no
   código-fonte da tag.
4. `PLANO_TRACCAR-EMENDA-v2.2.md` — aplica as decisões do dono de 2026-10-11 (D1–D6) e a pesquisa da PD.
5. `PLANO_TRACCAR-EMENDA-v2.3.md` — aplica a arquitetura do dono. No fim do arquivo estão as respostas F-1 a F-9.

**O que mudou no gate §8.0 do plano:**
- A **linha 4** (G-TRC-PD) deixou de exigir junta 5/5 e a ata `J-TRC-PD.md`. Vale a aprovação escrita do dono:
  `D-TRC-PD-APROVADA-2026-10-11`.
- A arquitetura e as respostas Q1–Q11 e F-1 a F-9 estão em `D-TRC-ARQUITETURA-2026-10-11`.
- As pendências da trilha estão em `agent-orchestration/controle/pendencias.md`, com o prefixo `P-TRC-`.

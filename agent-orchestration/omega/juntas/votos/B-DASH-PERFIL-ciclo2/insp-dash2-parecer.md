# Parecer — inspetor de terreno — B-DASH-PERFIL ciclo 2

- **Papel:** inspetor-de-terreno-da-junta · **identidade:** inspetor-dash2b-opus (sucessor P3 de inspetor-dash2-opus, caído por erro de rede no esqueleto) · **modelo que rodou:** Claude Opus (claude-opus-5-5), nível menor, declarado
- **Objeto:** faad24ce7c00ab4d7610d0784c0beab8a479ddb0 (PR 446, ramo fix/dash-perfil)
- **Mandato:** 00-mandatos/inspetor-dash2.md · md5 930e1c69a508ed379dec8a5d67a76419
- **Evidência:** insp-dash2-evidencia.md

## Item 1 de 3 — objeto, CI, mandatos, corpos, S0 — VERDE
- Objeto por duas fontes (ls-remote, gh pr view 446) e worktree: faad24ce7c00ab4d7610d0784c0beab8a479ddb0; head não andou desde a redação; PR OPEN/MERGEABLE.
- check-runs: 14/14 completed success (0 pendentes, 0 cancelados).
- PRE-VOO OK nos 4 mandatos (inspetor-dash2, cadeira-c1, cadeira-c2, cadeira-c3), ec=0, ferramentas da mesma fonte (origin/chore/mandato-refs-e-preflight @4af61a41) com a mesma única adaptação RAIZ; AVISO approved_head NAO DETERMINAVEL esperado e declarado.
- seis corpos das cadeiras presentes no objeto e IDÊNTICOS (EOL-neutro) aos do ciclo 1 nos dois espelhos; ausentes no diretório da sessão (ver ressalva R1).
- S0: sync-agent-agents.mjs --check em worktree descartável no objeto → OK, 73 agentes, ec=0; worktree removido.

## Item 2 de 3 — identidades, papéis e briefing — VERDE (ressalvas R2, R3)
- Obituário (fonte primeira): nenhuma linha DASH. Universo de inelegíveis GERADO no objeto: 20 identidades (as 12 do mandato + dev-b-dash-perfil-codex/codex2/gemini/gemini2/gemini3, jurado-dash-c3-cdx-b, plan-b-dash-perfil-cdx, fabrica-dash-gemini); crítico do plano sem nome próprio.
- Cadeiras nomeadas: C1 = jurado-dash2-c1-opus (Claude Code, Claude Opus), C2 = jurado-dash2-c2-opus (Claude Code, Claude Opus), C3 = jurado-dash2-c3-cdx (Codex GPT-5.6 Sol, médio). 0 ocorrência no objeto e na main; 0 coincidência com as 20 inelegíveis; distintas entre si.
- §C7.4-bis no ciclo 2: achou = jurado-dash-c1-cdx, jurado-dash-c3-opus; planejou = planejador-dash-ciclo2-fable; desenvolveu = dev-dash-ciclo2-opus — disjuntos, nenhum vota.
- briefing: plano do ciclo 2 (R-B-DASH-PERFIL-1) e ata do ciclo 1 nos 3 mandatos como A RE-VERIFICAR; no mandato de C1, reclassificação de C1-01 como pre-existente, não grave, dona P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI, com os comandos da Parte 1.1.
- Se o orquestrador trocar uma cadeira Opus pelo Argon (Gemini via API), a identidade nova tem de ser conferida contra a mesma lista de 20 e declarada na 1ª linha da evidência; não está nos mandatos atuais.

## Item 3 de 3 — terreno — VERDE (ressalva forte R4)
- Árvore C:/Users/AMP/w-dash no objeto faad24ce sem mutação viva: só os 55 ` M` fantasmas de EOL em .agents/ e .claude/ (0 divergentes EOL-neutro) e o ?? deste diretório (4 mandatos + 2 outputs).
- Sem resíduo: nenhum w-jdash*, w-dash-mut, w-dash-s0 no disco nem na lista de worktrees; 0 sonda; node_modules do w-dash real, zero junction.
- Isolamento exigido de cada cadeira (declarado nos 3 mandatos; cada cadeira prova na 1ª medição): C1 = jurado-dash2-c1-opus, Claude Code / Claude Opus, worktree C:/Users/AMP/w-jdash2-c1-*, cluster e rede jdash2-c1-* só se precisar (itens sem banco); C2 = jurado-dash2-c2-opus, Claude Code / Claude Opus, worktree C:/Users/AMP/w-jdash2-c2-*, cluster e rede jdash2-c2-* só se precisar (sem banco; navegador em porta livre fora da lista); C3 = jurado-dash2-c3-cdx, Codex / GPT-5.6 Sol médio, worktree C:/Users/AMP/w-jdash2-c3-*, cluster e rede jdash2-c3-* (ou o tl* do teste-linux.sh, declarado e removido), sem porta publicada. npm ci próprio, zero junction de node_modules em todas.
- Docker às 22:23Z: base viva erp-postgres/erp-redis (intocável) + 2 trabalhos alheios excluindo erp-*: tl17924485782852 (w-fix302d, Codex B-SAN3-02) e dtrc02-17924485852887 (dev B-TRC-02), sem porta publicada. 2 = teto.
- Proibidos a todas as cadeiras: base viva (erp-postgres, erp-redis) e as portas 5432, 6379, 3000, 5173, 5050 e 8899.
- Baseline honesto no objeto: npm run check ec=0; npm --prefix frontend run check ec=0.
- Perda de jurado (P3): sucessor de identidade NOVA, re-executa os comandos registrados e mede a cauda; queda em 00-quedas.md (P6). Paralelismo (P5): no máximo 2 jurados em paralelo. Os dois declarados nos 3 mandatos.

## Veredito: LIBERADO COM RESSALVA

A junta do ciclo 2 do B-DASH-PERFIL pode começar sobre o objeto faad24ce7c00ab4d7610d0784c0beab8a479ddb0 (14/14 check-runs success). Ressalvas a pôr EM DESTAQUE no disparo das cadeiras:

- **R1 — o corpo vem do objeto, não da sessão.** Os 6 corpos jurado-dash-c{1,2,3}-* NÃO existem no diretório da sessão (main 684e9afd); cada cadeira lê o seu com git show faad24ce:<caminho> (os mandatos já mandam). Não disparar como subagent_type da sessão.
- **R2 — ferramenta do redator sumiu.** <scratch-do-redator>/redator-dash2/ não existe mais nesta máquina; o mandato de C1 (l.65) manda rodar mandato-refs.sh 25 de lá. Usar a mesma ferramenta de origin/chore/mandato-refs-e-preflight:scripts/mandato-refs.sh (@4af61a41) e declarar o caminho; o pré-voo dos 4 mandatos passou com essa cópia.
- **R3 — o inspetor foi substituído (P3).** Os 3 mandatos exigem parecer de inspetor-dash2-opus; quem o emite é o sucessor inspetor-dash2b-opus (o caído deixou só esqueleto, sem comando). O orquestrador declara a substituição no disparo de cada cadeira, para a checagem de legalidade não reprovar por nome.
- **R4 (forte) — Docker no teto.** 2 trabalhos alheios vivos (B-SAN3-02 e B-TRC-02). Nenhuma cadeira sobe contêiner sem recontar; C3 (Prisma só em contêiner, ≥3 GB de commit livre) espera vaga. Ordem natural sob P5: C1 e C2 primeiro (sem banco), C3 quando houver vaga.
- **R5 — trocar uma cadeira Opus pelo Argon** não está nos mandatos. Se acontecer: identidade nova conferida contra os 20 inelegíveis, mandato reemitido com pré-voo novo (o md5 muda) e executor declarado na 1ª linha da evidência.

Limpeza: worktree C:/Users/AMP/w-insp2b-s0 criado e removido; nenhum contêiner, rede ou porta criados; ferramentas e logs só no scratch próprio (insp-dash2b/).

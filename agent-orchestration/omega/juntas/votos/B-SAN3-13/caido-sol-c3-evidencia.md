papel: cadeira C3 | identidade: jurado-san313-c3-sol | executor: Codex CLI | corpo: jurado-san313-c3-regressao-escopo-registro | modelo: GPT-5.6 Sol, esforço medium (nível menor; substituição: três cadeiras passaram de Claude para Codex Sol por decisão do dono em 25/10) | objeto: ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d | mandato_md5: 2e579ef70ec2130d9e5d144bb0c59c6a (declarado: não publicado no mandato) | corpo_md5: c2e6b7390f18f8963cab49f5f89d91a0 (blob `.agents` EOL-neutro; recebido: o mesmo blob) | corpo carregado × blob: IDENTICO

# Evidência incremental — C3 — B-SAN3-13, ciclo 1

## Legalidade e terreno inicial

- Comando: `git ls-remote origin refs/heads/fix/mobile-minhas-os`; `gh pr view 460 --json headRefOid,state,isDraft,mergeable`; `gh run list --commit <objeto>`; hashes MD5 com CR removido; comparação do corpo útil `.claude` × `.agents` sem frontmatter/adaptação Codex; memória, disco e `docker ps`.
- Saída resumida: ramo remoto e PR apontam para `ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d`; PR OPEN, não rascunho, MERGEABLE; runs `40193298559` (pull_request) e `40193294436` (push), ambos `ci completed success`; mandato MD5 `2e579ef70ec2130d9e5d144bb0c59c6a`; blob `.agents` MD5 EOL-neutro `c2e6b7390f18f8963cab49f5f89d91a0`; corpos úteis `.claude`/`.agents` MD5 `8764850c30d678ad9d237b3b604d67b5`, IDENTICOS; commit livre 12,16 GB; disco C: 10,50 GB; só `erp-postgres` e `erp-redis` vivos, portanto 0 trabalho Docker fora de `erp-*`.
- Veredito parcial: legalidade apta sob `LIBERADO COM RESSALVA`; identidade `jurado-san313-c3-sol` não coincide com inelegíveis do parecer, inclusive o acréscimo `planejador-san313-fable`. R1 cumprida; R2 superada pela composição posterior de três Codex Sol; R3 atribuída a esta cadeira; R4–R6 respeitadas no lançamento. Nenhum voto/evidência c1/c2 foi lido.

## Item 1 — EM APURAÇÃO

## Item 2 — EM APURAÇÃO

## Item 3 — EM APURAÇÃO

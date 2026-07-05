# KPIs Mobile — ERP Techsolutions

Esta pasta contem o dashboard local de KPIs do app Flutter.

## Como abrir

Abra diretamente:

`mobile/flutter_app/Kpis/index.html`

O dashboard possui fallback embutido e deve funcionar por **duplo clique**, sem
servidor. Ao abrir via `file://`, alguns navegadores bloqueiam `fetch()` de JSON
local — nesse caso o dashboard usa o snapshot embutido em `app.js` e mostra um
aviso discreto no topo.

## Dados

Arquivos oficiais versionados (fonte da verdade):

- `kpis-latest.json` — snapshot atual
- `kpis-history.json` — historico de snapshots
- `kpis-history.md` — historico legivel por humanos

O snapshot embutido em `app.js` espelha esses arquivos e deve ser atualizado junto.

## Servidor local opcional

Servidor local e **opcional**, nao obrigatorio. Use apenas se quiser carregar os
JSONs externos diretamente:

```bash
cd mobile/flutter_app/Kpis
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Estrutura

```
mobile/flutter_app/Kpis/
  index.html         — Dashboard (12 secoes)
  styles.css         — Visual claro, navy, sem dependencias
  app.js             — Render + fetch com fallback embutido
  kpis-latest.json   — Snapshot atual (oficial)
  kpis-history.json  — Historico (oficial)
  kpis-history.md    — Historico legivel
  README.md          — Este arquivo
```

## Política permanente de KPIs pós-avaliação humana

1. PRs de feature nao devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatorio final.
3. KPIs so devem ser atualizados apos avaliacao humana aprovando a entrega.
4. KPIs so devem ser publicados apos merge e gate confirmando sucesso.
5. A publicacao de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar tambem o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o proximo bloco.

## Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geracao de artefatos deve limpar os artefatos temporarios ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## Regra de atualizacao

### Politica de KPIs duplos

Existem dois conjuntos de KPIs:

- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.
- `Kpis/`: KPIs gerais/raiz do projeto.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

No pos-B-124 (web-only), os valores mobile refletidos na raiz sao: Flutter
764/764, Backend 15/15, contratos mobile 18/18, contratos mobile + Core SaaS
21/21, modulos Flutter 17/17, MVP demo 96%, MVP vendavel 78% e 49 blocos
entregues. Frontend smoke web avancou de 33/33 para 44/44 na PR #125. B-124 e
web-only: nenhum arquivo mobile alterado — as metricas Flutter/mobile ficam
inalteradas e os percentuais mvp permanecem oficiais (sem decisao humana para
altera-los no B-124). `version`/`release.block` deste conjunto mobile foram
travados em B-124 apenas para manter `(version, block, status)` identicos
entre `Kpis/` e `mobile/flutter_app/Kpis/` (politica de KPIs duplos +
teste-guarda).

### B-124 publicado

- PR #125 mergeada em `dcfa25063111532f8cc1c77d7af8ec4519406bb0`
  (approved head `6605b13630e3f29f98670aabf9ee32e274f40d47`).
- Status `published_after_human_approval` (publicacao B-124K).
- Web-only: Dashboard web enriquecido com `GET /operations/dispatches` +
  `GET /field-locations/latest` (+ `GET /approvals/pending`), mantendo
  work-orders + notifications. 8 KPIs derivados, fila critica combinada,
  despachos ativos, status de campo real (stale 15 min) e eventos das listas.
- frontend check/build OK; test:smoke 44/44 (33 -> 44). Nenhum arquivo mobile
  ou backend alterado; percentuais mvp mantidos (sem decisao humana).

### B-123 publicado

- PR #123 mergeada em `2537558f3f078425c13119a60445e960aac26bb2`
  (approved head `24d439072778438ed3de837fc66a4ef6bce31944`).
- Status `published_after_human_approval` (publicacao B-123K).
- 7 telas/areas do fluxo de OS alinhadas ao prototipo aprovado (visual-only,
  um commit por tela): lista de OS, detalhe/check-in, execucao, checklists da
  OS, execucao de checklist, evidencias e sincronizacao/fila offline.
- Estados semanticos por tokens centrais (pills/faixas do mobile_kit); sem
  dado tecnico cru na UI; nenhum repository/service/contrato/sync/model/
  provider alterado; nenhuma dependencia nova.
- Dois testes realinhados com aprovacao humana previa (b114 'Sync pendente';
  b116 header 'Atendimento').
- flutter test 764/764 apos cada tela; flutter analyze lib sem issues; dart
  format limpo.

### B-122 publicado

- PR #121 mergeada em `fc7e17810940edf933b5e4a2071f8f456e05d4e9`
  (approved head `f151b4fb6e53200204846aed5abb0699c0308d94`).
- Status `published_after_human_approval`.
- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png` — hero
  com papel PT-BR e organizacao, secoes Conta e organizacao, Aparencia,
  Seguranca e sessao e Sair.
- Sem dados tecnicos crus na UI: token, modo de autenticacao, permissoes,
  modulos, tenants e IDs sairam do Perfil (Diagnostico dev-only e o lugar de
  suporte).
- Testes b091 realinhados (rotulo PT-BR obrigatorio; claim tecnica proibida);
  flutter analyze limpo; flutter test 764/764.

### B-121 publicado

- PR #117 mergeada em `38facb24a3bc8592cc3ccd6c11d4e428420532ed`.
- PR #118 mergeada em `f05566828a2b05d9c4400112d66be490477f0a17`.
- PR #119 mergeada em `e851fd35e141545401abfc0fac774f62e1c2f615`
  (approved head `72d6ccc6476be752ccf8d368a5252c8c97fac522`).
- Status `published_after_human_approval` (publicacao B-121K).
- Timeline real no detalhe/check-in (GET /work-orders/:id/timeline) com
  fallback local seguro; timeline vazia nao quebra.
- Auto-sync montado no app root com ordem segura preservada; sem sessao valida
  o sync e ignorado.
- Adapter de checklist tolera `fields` e `components` (orderIndex -> order,
  type/componentKey -> type); tipo desconhecido mostra "Componente nao
  suportado nesta versao do app.".
- Base URL configuravel por `--dart-define=API_BASE_URL` (default localhost do
  emulador para dev/test).
- Flutter test 764/764 com 10 testes novos em
  `test/features/b121_mobile_hardening_test.dart`.

### B-108 publicado

- PR #104 mergeada em `468fcf16c6b42865aecbd45b05f4c37ced0c3068`.
- Approved head `4b221cfdfe3acad9c65214ac5fc7e7892a050331`.
- Status `published_after_human_approval` apos gate B-108G.
- Upload multipart mobile preservado.
- Resposta sem path, bucket, storage key, URL publica, token, base64 ou binario.
- Provider local protegido implementado para dev/test.
- Referencia opaca `evfile_*`.
- `EvidenceScanner` testavel implementado com Noop/Fake scanner.
- Auditoria segura implementada para accepted/rejected/scan_failed/stored.
- Estados `stored`, `rejected`, `scan_failed` e `pending_review` tratados no mobile.
- Evidencia local preservada em erro, rejected, scan_failed, pending_review, rede e timeout.
- Pendentes: S3/presigned real, DB/Redis receipt, antivirus real, download protegido final e retencao definitiva.

### B-107 publicado

- PR #102 mergeada em `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`.
- Approved head `b3da11d1605af9edb68e5e8f587881fc22115f3f`.
- Status `published_after_human_approval` apos gate B-107G.
- `work_order.create` suportado no sync mobile.
- `localId -> serverId` implementado.
- `already_applied` reaproveita ID remoto.
- `rejected` mantem OS local com falha segura.
- `conflicts` marcam resolucao manual.
- `statusUpdate` local-only bloqueado antes de `serverId` e elegivel apos o mapeamento.
- UI/servico de resolucao manual implementados.

Toda entrega mobile relevante deve atualizar:

- `kpis-latest.json`
- `kpis-history.json`
- `kpis-history.md`
- o snapshot embutido em `app.js` (espelho de `kpis-latest.json`/`kpis-history.json`)

E, quando necessario: `index.html`, `styles.css`, `app.js`.

Commitar com `docs(kpis): update dashboard for B-XXX`.

## Seguranca

Nao incluir secrets, tokens, credenciais, dados reais de clientes ou informacoes
sensiveis nos arquivos do dashboard.

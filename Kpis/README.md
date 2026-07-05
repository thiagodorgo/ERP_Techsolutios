# KPIs raiz — ERP Techsolutions

Esta pasta contem os KPIs gerais do projeto. Desde B-152F, ela tambem reflete
os percentuais mobile quando uma entrega mexe em Flutter/mobile.

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

## Politica de KPIs duplos

Existem dois conjuntos de KPIs:

- `Kpis/`: KPIs gerais/raiz do projeto.
- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

## B-121 refletido na raiz

- B-121 — MVP integrado Web/Mobile (publicacao B-121K pos-avaliacao humana).
- Web MVP ligado aos endpoints reais: lista/detalhe de OS com timeline, Dashboard
  composto de work-orders + notifications, Aprovacao operacional no detalhe
  (motivo obrigatorio na reprovacao, RBAC) e nav MVP-only via `GET /navigation/menu`.
- Matriz tela x endpoint x status das 27 telas MVP em `docs/api-screen-endpoints.md`.
- Hardening mobile: timeline real no detalhe/check-in com fallback local seguro,
  auto-sync no app root com ordem segura, adapter de checklist tolerando `fields`
  e `components` e base URL por `--dart-define=API_BASE_URL`.
- Consolida os blocos B-109 a B-120 mergeados desde a ultima publicacao (B-108).
- Flutter tests: 764/764.
- Frontend smoke tests: 33/33.
- Backend tests: 15/15 (backend nao alterado no B-121).
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 96% (ultimo valor documentado na rodada B-113 a B-120; estimado).
- MVP vendavel: 78% (ultimo valor documentado na rodada B-113 a B-120; estimado).
- Blocos entregues: 46.

Metadados: PR #117 (merge `38facb24a3bc8592cc3ccd6c11d4e428420532ed`, head
`73a50e905b5a7a3c4665910e705f168d239a8dd9`), PR #118 (merge
`f05566828a2b05d9c4400112d66be490477f0a17`, head
`474e5ec49e562a39ddcb1eec15253816ff11f520`), PR #119 (merge
`e851fd35e141545401abfc0fac774f62e1c2f615`, head
`72d6ccc6476be752ccf8d368a5252c8c97fac522`), status
`published_after_human_approval`.

Limitacoes mantidas: S3/presigned real, DB/Redis receipt, antivirus real,
download protegido final, retencao definitiva, Dashboard web sem
dispatches/field-locations, Settings web sem backend dedicado e piloto Android
real em dispositivo fisico pendente.

## B-108 refletido na raiz

- B-108 — Hardening de evidências/storage.
- `EvidenceStorageProvider` e `LocalProtectedEvidenceStorageProvider` publicados para dev/test.
- `EvidenceScanner` testavel com `NoopEvidenceScanner` e fake de teste.
- Referencia opaca `evfile_*` publicada na resposta.
- MIME validation JPEG/PNG.
- Size validation 10 MB.
- Checksum SHA-256 obrigatorio.
- Auditoria segura `accepted`/`rejected`/`scan_failed`/`stored`.
- Upload multipart mobile preservado.
- Resposta publica sem path, bucket, storage key, URL publica, token, base64 ou binario.
- Flutter tests: 662/662.
- Backend tests: 15/15.
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 93%.
- MVP vendavel: 76%.
- Blocos entregues: 38.

Metadados: PR #104, merge commit `468fcf16c6b42865aecbd45b05f4c37ced0c3068`,
approved head `4b221cfdfe3acad9c65214ac5fc7e7892a050331`, status
`published_after_human_approval`.

Limitacoes mantidas: S3/presigned real, DB/Redis receipt, antivirus real,
download protegido final e retencao definitiva seguem pendentes.

## B-107 refletido na raiz

- B-107 — Criação remota de OS/local-only mapping + resolução manual de conflitos.
- `work_order.create` suportado no sync mobile existente.
- `localId -> serverId` implementado para `accepted` e `already_applied`.
- `rejected` mantém OS local com falha segura.
- `conflicts` entram em resolução manual inicial.
- `statusUpdate` local-only fica bloqueado antes de `serverId` e elegível após o mapeamento.
- Flutter tests: 654/654.
- Backend tests: 15/15.
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 92%.
- MVP vendavel: 72%.
- Blocos entregues: 37.

Metadados: PR #102, merge commit `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`,
approved head `b3da11d1605af9edb68e5e8f587881fc22115f3f`, status
`published_after_human_approval`.

Limitacoes mantidas: Approval real pendente, evidence attach real pendente,
merge avancado campo a campo de conflitos pendente, hardening final de
evidencias/storage pendente e piloto Android real ainda precisa validacao em
dispositivo fisico.

## B-106 refletido na raiz

- B-106 — Adapter GPS nativo real + permissões Android/iOS.
- Field Location e DeviceLocationProvider com adapter geolocator real.
- Flutter tests: 633/633.
- Backend tests: 15/15.
- Backend contract tests focados: 47/47.
- Flutter modules: 17/17.
- MVP demo: 90%.
- MVP vendavel: 68%.
- Blocos entregues: 36.

Limitacoes mantidas: Sem background tracking, Sem stream continuo, Sem timer, Sem envio silencioso, Geofencing pendente, Roteirizacao pendente, Provider externo de mapa pendente, se aprovado, Approval real pendente, Conflitos manuais avancados pendentes, Hardening final de evidencias/storage pendente, Piloto Android real ainda precisa validacao em dispositivo fisico.

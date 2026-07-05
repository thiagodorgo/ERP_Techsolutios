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

## B-124 refletido na raiz

- B-124 — Dashboard web enriquecido com despachos e localizacoes (publicacao
  B-124K pos-avaliacao humana). **Web-only**: nenhum arquivo mobile/backend
  alterado.
- O Dashboard web (`/dashboard`) passou a compor 4 fontes reais em paralelo:
  `GET /work-orders` + `GET /operations/dispatches` +
  `GET /field-locations/latest` + `GET /notifications/unread-count`
  (+ `GET /approvals/pending`, com `work_order_id` opcional no backend).
- 8 KPIs derivados dos dados (nunca fixos); fila critica combinada com
  ordenacao por criticidade (SLA vencido &gt; prioridade &gt; operador sem
  sinal &gt; aprovacao pendente &gt; OS sem operador) e acao contextual por
  item; status de campo real (regra stale de 15 min reutilizada do
  `operations-map.adapter`); despachos ativos com status desconhecido
  tolerado; alertas acionaveis; eventos derivados das listas (sem timeline por
  OS). Fallback por fonte com rotulos Dados demonstrativos/Fallback local.
- Flutter tests: 764/764 (inalterado; B-124 e web-only). Backend: inalterado.
- Frontend smoke: **44/44** (era 33/33; +10 unit do `dashboard.adapter` + 1
  render do dashboard na PR #125); frontend check e build OK.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais publicados
  (sem decisao humana explicita para alterar no B-124; B-123 fechou fidelidade
  mobile de OS e B-124 fechou o dashboard web, mas os percentuais seguem
  oficiais ate revisao).
- Blocos entregues: 49 (regra de contagem: 48 ate B-123 + B-124).

Metadados: PR #125 (merge `dcfa25063111532f8cc1c77d7af8ec4519406bb0`, head
`6605b13630e3f29f98670aabf9ee32e274f40d47`), status
`published_after_human_approval`.

## B-123 refletido na raiz

- B-123 — Fidelidade visual do fluxo de OS mobile (publicacao B-123K).
- 7 telas/areas alinhadas ao prototipo aprovado (visual-only): lista de OS,
  detalhe/check-in, execucao, checklists da OS, execucao de checklist,
  evidencias e sincronizacao/fila offline.
- Estados semanticos por tokens centrais (pills/faixas do mobile_kit); sem
  dado tecnico cru na UI; nenhum repository/service/contrato/sync/model/
  provider alterado; nenhuma dependencia nova.
- Flutter tests: 764/764 (revalidado apos cada tela na PR #123; analyze sem
  issues; dart format limpo).
- Frontend smoke: 33/33 (frontend nao alterado). Backend: inalterado.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais
  publicados (sem decisao humana para alterar no B-123).
- Blocos entregues: 48 (regra de contagem: 47 ate B-122 + B-123).

Metadados: PR #123 (merge `2537558f3f078425c13119a60445e960aac26bb2`, head
`24d439072778438ed3de837fc66a4ef6bce31944`), status
`published_after_human_approval`.

## B-122 refletido na raiz

- B-122 — Alinhamento visual ao prototipo aprovado (publicado junto ao B-121K).
- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png`: hero com
  avatar/nome/e-mail e "Papel · Organizacao" (rotulo PT-BR), secoes Conta e
  organizacao, Aparencia, Seguranca e sessao e botao Sair.
- Removidos da UI: modo de autenticacao, expiracao de token, permissoes cruas,
  modulos, tenants e IDs internos (suporte tecnico no Diagnostico dev-only).
- Auditoria: 11 telas web MVP + shell conformes; web sem rota de Perfil
  (lacuna documentada); fluxo de OS mobile em Material stock (lacuna).
- Flutter tests: 764/764 (revalidado na PR #121). Frontend smoke: 33/33
  (frontend nao alterado no B-122). Backend: inalterado.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais publicados
  no B-121K (sem novos percentuais propostos).
- Blocos entregues: 47 (regra de contagem: 46 ate B-121 + B-122).

Metadados: PR #121 (merge `fc7e17810940edf933b5e4a2071f8f456e05d4e9`, head
`f151b4fb6e53200204846aed5abb0699c0308d94`), status
`published_after_human_approval`.

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

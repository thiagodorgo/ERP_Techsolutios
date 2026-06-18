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

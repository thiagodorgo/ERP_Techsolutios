# Prompt — B-O6R-11 Contratos OS e durabilidade multi-SKU

Corrija Ω6R-QUA-004 e Ω6R-QUA-005. Normalize envelope `{data}` e DTO camelCase no DioWorkOrderRemoteApi; envie payload assign canônico. Troque `forEach` assíncrono por `enqueueAll` transacional ou sequência aguardada.

Done-when: list/detail/status/timeline/assign passam contra fixtures reais do backend, sem fallback silencioso mascarar erro. Três SKUs retornam apenas após commit e sobrevivem restart; falha não deixa sucesso falso. Testes MockAdapter+Dio e Drift reaberto.

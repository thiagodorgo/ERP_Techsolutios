# Prompt — B-O6R-10 Contenção de carga nos clientes/portal

Corrija Ω6R-PERF-002 e Ω6R-PERF-003. Cliente web usa timeout AbortController, single-flight/generation guard e descarta resposta obsoleta. Pipeline Jimp sai do processo ERP para worker/processo com memória/deadline e teto menor justificado.

Done-when: request >2 intervalos mantém uma chamada ativa e resposta velha não vence; três imagens-limite não rompem SLO/RSS e timeout mata trabalho real. Portal pode ser implantado separado; preserve resposta genérica e guards antiabuso.

# Folha de cola da demonstração ao sócio (modelo)

> AC-10 do plano DEMO-SOCIO. **Este arquivo NÃO tem senha e nunca terá.** As senhas ficam só no papel impresso e nas
> variáveis `DEMO_*_PASSWORD` do terminal. Imprima, preencha à mão os campos `____` e deixe ao lado do teclado.
> Os dados são fictícios e vêm de `scripts/demo-socio-seed.mjs`.

## 1. Endereços

| O quê | Endereço |
|---|---|
| Web (navegador, à esquerda) | `http://127.0.0.1:18080` |
| API (só conferência) | `http://127.0.0.1:3102/api/v1/health/ready` |
| App no emulador (`API_BASE_URL`) | `http://10.0.2.2:3102`, **sem** `/api/v1` no final |

## 2. Logins (senha: só no papel)

| Quem | Perfil | E-mail | Senha |
|---|---|---|---|
| Gestor (conduz a web) | Gestor | `gestor@guincho-exemplo.demo.invalid` | (no papel) |
| Administrador (checklist) | Administrador da organização | `admin@guincho-exemplo.demo.invalid` | (no papel) |
| Guincheiro (celular) | Técnico de Campo | `guincheiro@guincho-exemplo.demo.invalid` | (no papel) |
| Despachante | Operação de Campo | `despacho@guincho-exemplo.demo.invalid` | (no papel) |

Organização: **Guincho Exemplo**.

## 3. A OS da cena 3

| Campo | Valor |
|---|---|
| Título | Remoção de veículo – pane elétrica |
| Cliente | Seguradora Horizonte (demo) |
| Serviço | Remoção / Guincho |
| Viatura | `GEX1A23 - Guincho 01` (**tem de ser o Guincho 01**) |
| Origem | Av. Paulista, 2000 – Bela Vista · Lat `-23.5690` · Lon `-46.6494` |
| Destino | Pátio Central, Rua Guaicurus, 1000 – Lapa · Lat `-23.5275` · Lon `-46.6780` |
| Veículo rebocado | Placa `FIC9D87` · VW Gol 2015 · Prata |
| Prioridade | Alta |
| **Código da OS criada** | `__________` → 2 últimos caracteres (pedidos no "Cheguei"): `____` |
| Código da OS reserva | `__________` → 2 últimos caracteres: `____` (só se a criação ao vivo falhar) |

## 4. Coordenadas

| Ponto | Lat | Lon |
|---|---|---|
| Posição inicial do guincheiro (`--posicao`) | `-23.5609` | `-46.6566` |
| GPS do emulador (perto, NÃO igual): `adb emu geo fix <lon> <lat>` | `-23.5600` | `-46.6575` |
| Início do trajeto do rastreador | `-23.5614` | `-46.6559` |
| Fim do trajeto (= origem da OS) | `-23.5690` | `-46.6494` |

## 5. Comandos (terminal Git Bash, fora da vista)

| Quando | Comando |
|---|---|
| 1 h antes | `bash scripts/demo-socio-status.sh` (tem de dar `VERDE`) |
| 15 min antes | `DEMO_TECH_PASSWORD=… node scripts/demo-socio-seed.mjs --posicao` |
| Cena 7 (já digitado, esperando Enter) | `node scripts/demo-socio-trajeto.mjs` |
| Depois da demo | `bash scripts/demo-socio-down.sh --confirmo` |

**Proibido no dia:** `docker compose` de qualquer tipo, rodar de novo `scripts/traccar-dev-demo.mjs`, limpeza profunda
(`DEEP_CLEAN=1`). O `up` troca o segredo do Traccar e o script da pilha apaga tudo (`down -v`).

## 6. Ordem das cenas

| # | Cena | Min | Opcional |
|---|---|---|---|
| 1 | Abertura: o problema do negócio | 1 | |
| 2 | Painel da operação | 2 | |
| 3 | Criar a OS | 3 | |
| 4 | Despachar ao guincheiro (F5 no mapa antes) | 2 | |
| 5 | O guincheiro recebe no celular (puxar a lista) | 2 | |
| 6 | Aceita e sai | 2 | |
| 7 | Localização: celular e rastreador (Enter no trajeto) | 4 | |
| 8 | Chegada, vistoria e foto | 4 | |
| 9 | Sem sinal no meio do atendimento | 3 | sim |
| 10 | Conclusão e o veículo no pátio | 3 | |
| 11 | O atendimento documentado na web | 3 | |
| 12 | Pátios: dossiê e aparência | 3,5 | |
| 13 | Frota | 2 | sai na versão curta |
| 14 | Checklist sob medida | 2 | |
| 15 | Usuários, perfis e auditoria | 2 | |
| 16 | Financeiro: só o resumo | 1,5 | sim |
| 17 | As próximas telas (maquetes) | 2 | sai na versão curta |
| 18 | Fechamento: próximos passos | 2 | |

Não tocar: aba Mobile da OS, "Novo usuário", filtro "Hoje" da Auditoria, tela Sincronização do app, cartões
Checklists/Notificações/Sincronizar da Home do app, "Enviar localização agora" durante o trajeto.

## 7. Se o PC reiniciou

1. **Nunca** subir pelo script nem pelo compose.
2. `docker start demo-socio-postgres-1 demo-socio-redis-1 demo-socio-api-1 demo-socio-traccar-1 demo-socio-web-1`
   (nesta ordem).
3. `bash scripts/demo-socio-status.sh` até dar `VERDE`.
4. `DEMO_TECH_PASSWORD=… node scripts/demo-socio-seed.mjs --posicao` (a posição antiga passou de 15 min).
5. Entrar de novo na web como gestor.

Se não voltar: vídeo do ensaio, cena a cena, avisando que é gravação.

# Diretriz de limpeza de disco

> **Por que este documento existe.** Em 2026-08-12 o disco desta máquina chegou a **100% de uso (2,1 GB
> livres de 238 GB)** no meio de uma rodada de desenvolvimento. A investigação mostrou que o alvo
> tradicional da limpeza — os build artifacts do repositório — era quase irrelevante: **quem enche o disco
> são os caches de ferramenta e o disco virtual do Docker**, que crescem em silêncio e nunca encolhem
> sozinhos. Aplicando esta diretriz de ponta a ponta, o livre foi de **2,1 GB para 28 GB** sem perder um
> byte de dado de trabalho.
>
> Companheira operacional: `scripts/post-merge-cleanup.sh` (os níveis 1 e 2 são ele). Regra-mãe:
> `CLAUDE.md`/`AGENTS.md` §C5.

---

## O mapa do problema — onde o espaço realmente vai

Medição real desta máquina no dia do incidente:

| O que | Tamanho medido | Cresce quando | Encolhe sozinho? |
|---|---|---|---|
| **Disco virtual do Docker** (`%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx`) | **21,7 GB** | toda imagem baixada/buildada, todo volume | **NUNCA** — nem depois do `docker image prune` (ver armadilha abaixo) |
| **Android SDK** (`%LOCALAPPDATA%\Android\Sdk`) | 7,1 GB | instalação de plataformas/emuladores | não (mas é ferramenta, não lixo) |
| **Gradle** (`~/.gradle/caches`) | 4,0 GB | todo build Android/Flutter | não |
| **Flutter SDK** (`~/flutter`) | 3,0 GB | upgrade do SDK | não (ferramenta) |
| **npm cache** (`%LOCALAPPDATA%\npm-cache`) | 0,6 GB | todo `npm ci`/`install` | não |
| **Temp do usuário** (`%LOCALAPPDATA%\Temp`) | 0,9 GB | tudo | não |
| Build artifacts do repo (`frontend/dist`, `mobile/flutter_app/build`, `coverage`, `*.tsbuildinfo`) | ~0,5–1,5 GB | builds locais | não |

Conclusão prática: **limpar só o repositório resolve menos de 5% do problema.**

---

## Os três níveis de limpeza

### Nível 1 — pós-merge (automático, todo merge)

```bash
bash scripts/post-merge-cleanup.sh
```

- Remove: `frontend/dist`, `dist`, `coverage`, `mobile/flutter_app/build`, `*.tsbuildinfo`.
- Apaga branches locais já mergeadas na `main` e referências remotas mortas (`git remote prune`).
- **Obrigatório por contrato** (§C5) ao concluir cada merge. Reportado em 1 linha no fechamento do bloco.

### Nível 2 — profundo (a cada poucos merges, ou livre < ~10 GB)

```bash
DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh
```

- Tudo do nível 1, mais:
  - `~/.gradle/caches` e `~/.gradle/.tmp` — **preserva** `wrapper/` e `jdks/` (removê-los obrigaria o
    próximo build a refazer o setup inteiro, não só re-baixar dependência);
  - `npm cache clean --force`;
  - `docker image prune -af` (imagens órfãs) e `docker volume prune -f` (volumes sem dono) — **não**
    derruba container em execução.
- Tudo aqui é **regenerável**: volta sozinho no próximo build, ao custo de um download.
- Resultado medido na primeira execução: **+4,85 GB**.

### Nível 3 — compactação do disco do Docker (manual, decisão do dono na hora)

**A armadilha que motiva este nível:** no Windows, o Docker Desktop roda numa VM WSL2 cujo disco é um
arquivo (`docker_data.vhdx`) que **só cresce**. O `docker image prune` libera espaço **dentro** da VM, mas
o arquivo no disco do Windows **não encolhe um byte** — medimos 7,5 GB "reclamados" pelo prune com o `df`
parado no mesmo lugar. A única forma de devolver o espaço ao Windows é compactar o arquivo, e isso exige
**parar o Docker** (derruba PostgreSQL/Redis do ambiente de trabalho por alguns minutos). Por isso este
nível **nunca roda automático**.

Roteiro completo (o que foi executado em 2026-08-12, com resultado **21,67 → 6,37 GB, +15,3 GB**):

```powershell
# 1. Parar os serviços com cuidado (dados vivem em volume/bind — sobrevivem)
docker compose stop

# 2. Encerrar o Docker Desktop (senão ele religa a VM no meio da compactação)
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
wsl --shutdown
# conferir: wsl -l -v  →  docker-desktop deve estar "Stopped"

# 3. Compactar (método preferido; exige módulo Hyper-V)
Optimize-VHD -Path "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx" -Mode Full

# 3b. Fallback sem Hyper-V (diskpart, como admin):
#   select vdisk file="C:\Users\<user>\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
#   attach vdisk readonly
#   compact vdisk
#   detach vdisk

# 4. Religar e verificar
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# aguardar `docker info` responder, então:
docker compose up -d
docker exec erp-postgres psql -U postgres -d erp_techsolutions -tc "select count(*) from tenants;"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health   # esperado: 200
```

**Ordem importa:** rodar o nível 2 ANTES do nível 3 — o prune esvazia a VM por dentro, a compactação
devolve o espaço por fora. Compactar sem antes fazer o prune devolve quase nada.

---

## O que NUNCA se apaga (em nenhum nível)

- **Arquivo rastreado pelo git.** O script grita se encontrar rastreado apagado na árvore — mas a guarda
  vale nos dois sentidos: *"Não reverta por reflexo — pode ser decisão de quem apagou."* (Lição real: uma
  restauração automática de 7 arquivos desfez uma remoção deliberada do dono.)
- **`node_modules` / `.pnpm-store`** — reinstalar custa caro (e o npm cache que os regenera rápido acabou
  de ser limpo).
- **`.env` real** e qualquer credencial.
- **Untracked explicitamente permitidos** (ex.: os 3 PNGs de marca).
- **`~/.gradle/wrapper` e `~/.gradle/jdks`** — setup, não cache.
- **Android SDK e Flutter SDK** — ferramenta instalada, não lixo (se um dia precisar de espaço aí, o
  caminho é desinstalar plataformas/emuladores não usados pelo SDK Manager, decisão do dono).
- **Volumes do compose em uso** (o banco de trabalho vive neles). O `volume prune` só remove volume
  **sem dono**.

## Em dúvida, medir antes de apagar

```powershell
# os suspeitos de sempre, em GB
foreach ($a in "$env:USERPROFILE\.gradle","$env:LOCALAPPDATA\Android","$env:LOCALAPPDATA\Docker",
               "$env:LOCALAPPDATA\npm-cache","$env:LOCALAPPDATA\Temp") {
  if (Test-Path $a) { "{0,8:N2} GB  {1}" -f ((Get-ChildItem $a -Recurse -File -EA SilentlyContinue |
    Measure-Object Length -Sum).Sum/1GB), $a }
}
docker system df    # o que o Docker acha que ocupa (dentro da VM)
```

E no repositório: `git clean -nxd` (dry-run) **antes** de qualquer `git clean` de verdade.

---

## Histórico de execuções

| Data | Nível | Resultado |
|---|---|---|
| 2026-08-12 | 2 (primeira execução) | +4,85 GB (2,1 → 6,96 GB livres) |
| 2026-08-12 | 3 (primeira compactação) | +15,3 GB no vhdx (21,67 → 6,37 GB); livre total 2,1 → **28 GB** no dia |

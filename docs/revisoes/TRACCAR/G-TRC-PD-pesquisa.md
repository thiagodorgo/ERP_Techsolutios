> Pesquisador da G-TRC-PD (`agente-pesquisador-web`, instância nova) — roda em **Claude Opus 5.5**, no nível menor, como **cobertura do Codex**, fora pelo limite até 18:14Z de 2026-10-11. Entra pela decisão do dono de 2026-10-11 (agente Claude entra com o Codex fora e a tarefa no caminho crítico). Pesquisa na web, ≥3 fontes por fato quando houver, código-fonte da tag como fonte primária. Nenhum código de produto.

# G-TRC-PD — pesquisa para a aprovação do dono

Data de acesso de todas as fontes: 2026-10-11 (UTC), salvo nota.
Plano de referência: `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` no ramo `docs/plano-traccar` @ `9cb441bd` (§2.2 e §7.1).

## Para o dono aprovar

1. **Versão:** Traccar **6.16.0** — release oficial de 2026-09-27, a mais recente estável hoje; tag `v6.16.0` →
   commit `cfab560c79ee9c9eaa41c79c6df351e820d6284b`. Não use 6.15.x: só a 6.16.0 impede o token do `forward.header`
   de ir para uma URL de dispositivo (commit `acd55bd0`, a premissa P-04 do plano).
2. **Imagem:** `traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`
   (índice amd64+arm64, base Alpine 3.24.2 + Java 25). É a mesma que o plano mediu em 2026-10-10. O próprio CI do
   projeto a constrói a partir da tag (atestação SLSA). É a imagem oficial do projeto, mas **não** é "Docker Official
   Image", **não é assinada** e roda como root.
3. **Licença:** Apache 2.0 (servidor e web). SaaS comercial é permitido, sem royalty. Rodar não gera obrigação;
   obrigações só se a imagem for entregue a terceiros.
4. **Riscos:** duas CVEs médias publicadas **hoje**, ainda sem correção (CVE-2026-108737, token de reset vale como
   sessão; CVE-2026-108738, CSRF de login OIDC). São neutralizadas se o Traccar ficar sem SMTP, sem OIDC, sem usuário
   além da conta de serviço do ERP e sem porta pública. Todas as CVEs anteriores estão corrigidas no código da tag.
   Revisar esta PD quando sair a 6.16.1.
5. **Condições de configuração que a pesquisa confirmou no código** (precisam valer em todo ambiente):
   `forward.type=json` (o padrão é `url`), `geocoder.enable=false` (o padrão chama LocationIQ),
   `protocols.enable=osmand` (o padrão sobe os 266 protocolos com porta default), `database.registerUnknown=false` fora de dev. `forward.url`
   também pode ser trocado **por grupo**, não só por dispositivo.

> Frase pronta para o dono:
>
> **Aprovo a PD do Traccar 6.16.0 (`sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`)**

Para conferir em 1 minuto: o digest aparece igual em
`https://hub.docker.com/v2/repositories/traccar/traccar/tags/6.16.0` (campo `digest`) e no cabeçalho
`docker-content-digest` de `https://registry-1.docker.io/v2/traccar/traccar/manifests/6.16.0` (o registro pede um
token anônimo de `https://auth.docker.io/token?service=registry.docker.io&scope=repository:traccar/traccar:pull`).

## 1. Versão

**Veredito: 6.16.0 existe como release oficial, é a mais recente estável em 2026-10-11 e é a recomendada.** Não há
release mais nova; há motivo de segurança para preferi-la às 6.15.x (abaixo).

| Fato | Status | Fontes (acesso 2026-10-11) |
|---|---|---|
| `v6.16.0` é release oficial, não pré-release nem rascunho, publicada em 2026-09-27T00:20:15Z por `github-actions[bot]`, com 4 pacotes (linux-64, linux-arm, other, windows-64) | CONFIRMADO | (a) API `https://api.github.com/repos/traccar/traccar/releases?per_page=15` (`prerelease=false`, `draft=false`); (b) `https://github.com/traccar/traccar/releases/tag/v6.16.0`; (c) `https://www.traccar.org/download/` ("current official release is 6.16.0", links para os zips da v6.16.0); (d) post `https://www.traccar.org/blog/traccar-6-16/` datado de 2026-09-26 |
| É a mais recente: `GET /releases/latest` devolve `v6.16.0`; a anterior é `v6.15.3` (2026-08-26) | CONFIRMADO | (a) API `https://api.github.com/repos/traccar/traccar/releases/latest`; (b) API `.../tags?per_page=8` (topo: `v6.16.0` → commit `cfab560c79ee9c9eaa41c79c6df351e820d6284b`); (c) `https://www.traccar.org/blog/` (último post: "Traccar 6.16 — September 26, 2026") |
| A tag `v6.16.0` aponta para o commit `cfab560c79ee9c9eaa41c79c6df351e820d6284b`; a árvore desse commit é a que o item 5 lê | CONFIRMADO | API `.../git/trees/v6.16.0?recursive=1` (`sha` do commit, `truncated=false`); API `.../tags` |
| SHA-256 dos pacotes da release (não usamos zip, só registro): linux-64 `377802780847894bf40dce2eec3f02313844960028324994c17ba9420a19ec89` | registro | API `.../releases/latest`, campo `assets[].digest` |
| Notas da 6.16 (oficiais): evento "geofence crossed", relatórios de combustível, MCP ampliado, correções no web app, refatoração GL200/Queclink, nome de usuário no relatório de auditoria. **O post não fala de segurança.** O corpo da release no GitHub é vazio (`body: null`) | CONFIRMADO | `https://www.traccar.org/blog/traccar-6-16/`; API `.../releases/latest` |

**Por que 6.16.0 e não 6.15.x (motivo de segurança, medido no histórico de commits).** `compare v6.15.3...v6.16.0`
(`status: ahead`, 96 commits, 0 atrás — a 6.16.0 contém toda a 6.15.3) traz, entre outros, quatro commits de
endurecimento que o post não anuncia (filtrados por palavra-chave na lista de 96; um quinto que o filtro pegou,
`3c9420c6e1`, é funcional):

- `acd55bd0feebd9189213af362bbccbd01da62d29` (2026-09-23) **"Limit forwarding headers to configured URL"** — até a
  6.15.3, o `forward.header` (onde mora o token do ERP) ia para **qualquer** URL de forward, inclusive a URL por
  dispositivo; na 6.16.0 só vai para a URL global (`url.equals(this.url)`). **É exatamente a premissa P-04 do plano;
  em 6.15.x ela é falsa** — um atributo `forward.url` de dispositivo vazaria o token. Isso, sozinho, proíbe < 6.16.0.
- `51051d3057c04dae06d153d128ddaad758700202` (2026-09-04) "Limit HTTP payload size" (Flespi e JimiPhoto deixam de
  agregar `Integer.MAX_VALUE`).
- `d65c5f1a76c8f23b04c70a7781f0f5d079fb7e2e` "Set content security policy for media responses";
  `a42b1190a08d0742d031485a76f9c91336d7dc8b` "Use secure random for OIDC".
- (funcional, não segurança: `3c9420c6e1` "Fix speed limit command", encoder KHD.)

Fonte: API `https://api.github.com/repos/traccar/traccar/compare/v6.15.3...v6.16.0` e
`https://api.github.com/repos/traccar/traccar/commits/acd55bd0feebd9189213af362bbccbd01da62d29` (patch lido), acesso
2026-10-11. O post da 6.15 também diz "A number of security fixes" sem detalhar
(`https://www.traccar.org/blog/traccar-6-15/`).

**O que existe depois da 6.16.0 e ainda não foi lançado** (`compare v6.16.0...master`: 33 commits, 2026-09-27 a
2026-10-11, 300 arquivos). Em forward, `ProcessingHandler`, `Keys`, `Position` e OsmAnd, as mudanças são só de estilo
(ordem de `import`, indentação — patches lidos), exceto `Keys.GEOCODER_KEY`, que perde a chave LocationIQ padrão
(`fad03d4b84`). Os de cara de segurança:
`728cf06d84` "Limit group hierarchy traversal" (`DeviceUtil`, `CacheGraph`, `TaskDeviceInactivityCheck`),
`3430d751d2` "Prevent decoder infinite loop" (Atrack, HuaSheng, PacificTrack, Retranslator), `c1693c1193` "Fix GL200
infinite loop", `a2df68a265` "Limit buffer size" (FleetGuide), `4c26a87021` (OwnTracks), `3bcdb658d9` (Share). Todos em
decodificadores de protocolo que o plano desliga com `protocols.enable` ou em funções de grupo/compartilhamento de
usuário que o ERP não expõe. **Não justificam esperar uma 6.16.1**, mas a próxima release deve ser avaliada quando sair
(ver "o que não consegui verificar"). Fonte: API `.../compare/v6.16.0...master` e `.../commits/<sha>` (arquivos
tocados), acesso 2026-10-11.

## 2. Imagem Docker e digest

**Veredito: `traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`.
CONFIRMADO por três fontes independentes e igual ao que o plano mediu em 2026-10-10 (§8.4 passo 4, §11 M-20).**

| Fato | Status | Fontes (acesso 2026-10-11) |
|---|---|---|
| Digest do **índice multi-plataforma** (OCI image index) da tag `6.16.0`: `sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda` | CONFIRMADO | (a) API do Docker Hub `https://hub.docker.com/v2/repositories/traccar/traccar/tags/6.16.0` (`digest`); (b) registro `https://registry-1.docker.io/v2/traccar/traccar/manifests/6.16.0`, cabeçalho `docker-content-digest` (token anônimo de `auth.docker.io`); (c) `sha256sum` dos bytes do índice baixado = o mesmo valor (o digest se auto-verifica); (d) plano §11 M-20 (`docker buildx imagetools inspect`, 2026-10-10) |
| Por plataforma: `linux/amd64` `sha256:a32a4e0a0656a3fc9ba0b23e9e741be2fab76d85c5208b6adfeef7ab473979e8` (212 MB); `linux/arm64` `sha256:444a4676069c9c6793003ac63d43cb610eb536ab204fe5acacc8dede644f18f4`; mais 2 manifestos de atestação | CONFIRMADO | API Docker Hub (campo `images`); índice do registro (`manifests[]`) |
| A tag `6.16.0` é a variante **Alpine**: mesmo índice que `6.16.0-alpine`, `6.16`, `6` e `latest` (hoje). Debian e Ubuntu têm outros digests (`6.16.0-debian` `sha256:6082db9b…444e`; `6.16.0-ubuntu` `sha256:fd903e34…e887`) | CONFIRMADO | API Docker Hub por tag; workflow `release.yml` da tag, linhas 317-320 (tags sem sufixo só com `matrix.os == 'alpine'`); `https://www.traccar.org/docker/` (lista "6.16.0, 6.16, 6, 6.16.0-alpine, …, latest") |
| **Tags são mutáveis** no repositório (`immutable_tags_settings.enabled=false`); `latest`, `6` e `6.16` vão andar. Por isso a fixação tem de ser por digest, como o plano já faz | CONFIRMADO | API `https://hub.docker.com/v2/repositories/traccar/traccar/` |
| **Quem publica:** o namespace `traccar` (dono do projeto); último push da tag por `tananaev` (Anton Tananaev, autor e detentor do copyright, ver item 3) em 2026-09-27T00:21:33Z, 1 min depois da release no GitHub | CONFIRMADO | API Docker Hub (tag: `last_updater_username`; repo: `user`, `namespace`, `date_registered` 2018-04-24, 17,39 M pulls); `LICENSE`/cabeçalhos dos fontes ("Copyright … Anton Tananaev") |
| **Construída pelo CI do próprio projeto, a partir do commit da tag.** A atestação SLSA v1 anexada à imagem amd64 diz: builder `https://github.com/traccar/traccar/actions/runs/36281992275/attempts/1`, revisão `cfab560c79ee9c9eaa41c79c6df351e820d6284b` (= a tag `v6.16.0`), `Dockerfile.alpine`, `VERSION=6.16.0`. A execução existe, é pública: "Build Release", `workflow_dispatch` por `tananaev`, `head_sha` = `cfab560c…`, `conclusion: success` | CONFIRMADO | (a) atestação in-toto `sha256:5d73213cf6c3881efd6a0f110846b7e72821922340448e0a04dcae867a5cb7da` (via manifesto de atestação `sha256:7cc29c05…`); (b) rótulos OCI da config da imagem (`org.opencontainers.image.revision`, `.source`, `.version=6.16.0`, `.licenses=Apache-2.0`); (c) API `https://api.github.com/repos/traccar/traccar/actions/runs/36281992275`; (d) `release.yml` da tag, job `docker` (linhas 277-332) |
| **É a imagem oficial do projeto, mas NÃO é "Docker Official Image".** A documentação do Traccar chama de "official Docker images … on Docker Hub"; no Docker Hub ela é imagem de comunidade do publicador `traccar` (`source: community`, sem selo de Official Image, Verified Publisher ou Sponsored OSS; Official Images vivem no namespace `library/`) | CONFIRMADO | `https://www.traccar.org/docker/`; API `https://hub.docker.com/api/search/v3/catalog/search?query=traccar` (`source: community`, `badge` vazio); README do repositório no Hub ("Official documentation: https://www.traccar.org/docker/") |
| **Base da imagem:** estágio final `FROM alpine` — o histórico da config mostra `alpine-minirootfs-3.24.2-x86_64` (Alpine 3.24.2, resolvido em `alpine@latest` `sha256:294b683c…77e6` na atestação); JRE gerado por `jlink` a partir de `eclipse-temurin:25-alpine` (`sha256:3fd2d245…bd2a`), Java 25 | CONFIRMADO | `docker/Dockerfile.alpine` da tag (linhas 1-15); config da imagem `sha256:519f2d547d02ce39bf2176df5cb3757d7727aa069c53b6c5248df9e85d6fb08f` (`history`); atestação SLSA (`resolvedDependencies`); `release.yml` (`java-version: 25`) |
| **Entrypoint e config:** `ENTRYPOINT ["/opt/traccar/jre/bin/java","-XX:+ExitOnOutOfMemoryError"]`, `CMD ["-jar","tracker-server.jar","conf/traccar.xml"]`, `WORKDIR /opt/traccar` → **o arquivo de config dentro da imagem é `/opt/traccar/conf/traccar.xml`** (fecha uma das hipóteses de §2.2 do plano) | CONFIRMADO | config da imagem; `Dockerfile.alpine` linhas 13-15; `https://www.traccar.org/docker/` (`--volume …/traccar.xml:/opt/traccar/conf/traccar.xml:ro`); `release.yml` linha 33 (`cp setup/traccar.xml out/conf/`) |
| **Roda como root:** nenhum `USER` no Dockerfile nem na config da imagem | CONFIRMADO (risco, ver item 4) | `Dockerfile.alpine`; config da imagem (sem campo `User`) |
| Espelho no GHCR: o workflow também empurra `ghcr.io/traccar/traccar`, mas o pacote **não é público** (token anônimo → 401; página do pacote → 404). Usar só o Docker Hub | CONFIRMADO | `release.yml` linhas 301-312; `https://ghcr.io/token?service=ghcr.io&scope=repository:traccar/traccar:pull`; `https://github.com/traccar/traccar/pkgs/container/traccar` |

Nota para a forma do pull: `docker pull traccar/traccar:6.16.0@sha256:03ebb7ed…1eda` (tag e digest juntos) resolve **pelo
digest**; a tag fica só como leitura humana. O digest do índice cobre amd64 e arm64.

## 3. Licença

**Veredito: Apache License 2.0 (servidor e web app). Uso comercial SaaS é permitido, sem royalty e sem obrigação de
abrir código por rodar como serviço. As obrigações nascem só ao REDISTRIBUIR (entregar a imagem/binário a terceiros),
modificado ou não.**

| Fato | Status | Fontes (acesso 2026-10-11) |
|---|---|---|
| O servidor `traccar/traccar` é Apache-2.0: `LICENSE.txt` na raiz da tag é o texto da Apache License 2.0; cabeçalho dos fontes "Copyright 2022 - 2026 Anton Tananaev … Licensed under the Apache License, Version 2.0"; não há arquivo `NOTICE` na raiz da tag | CONFIRMADO | (a) `https://raw.githubusercontent.com/traccar/traccar/v6.16.0/LICENSE.txt`; (b) API `https://api.github.com/repos/traccar/traccar/license` (`spdx_id: Apache-2.0`); (c) rótulo da imagem `org.opencontainers.image.licenses=Apache-2.0` (item 2); (d) cabeçalho de `forward/PositionForwarderJson.java` na tag; (e) árvore da tag (único arquivo de licença na raiz: `LICENSE.txt`) |
| O web app embutido na imagem (`traccar/traccar-web`, copiado pelo `release.yml` para `out/web`) também é Apache-2.0 | CONFIRMADO | API `https://api.github.com/repos/traccar/traccar-web/license` (`Apache-2.0`); `release.yml` da tag, job `build-web` |
| Apache-2.0 concede uso, cópia, modificação, sublicença e distribuição, "perpetual, worldwide, non-exclusive, no-charge, royalty-free" (§2), e patente (§3). **Uso comercial e privado são permitidos** | CONFIRMADO | (a) `https://www.apache.org/licenses/LICENSE-2.0` §2-§3; (b) `https://choosealicense.com/licenses/apache-2.0/` (permissões: commercial use, distribution, modification, patent use, private use); (c) o próprio `LICENSE.txt` da tag |
| **Rodar não gera obrigação; redistribuir gera.** As condições do §4 (cópia da licença, aviso em arquivos modificados, manter avisos de copyright, repassar NOTICE) se aplicam "when you reproduce or distribute". A Apache-2.0 **não tem cláusula de uso em rede** (diferente da AGPL): operar o Traccar como serviço interno do ERP, mesmo modificado, não obriga a publicar código | CONFIRMADO | (a) `https://www.apache.org/licenses/LICENSE-2.0` §4; (b) `https://choosealicense.com/licenses/apache-2.0/` (sem condição de divulgação por uso em rede; condições: "License and copyright notice", "State changes"); (c) `LICENSE.txt` da tag §4 |
| Se o ERP **modificar** o Traccar e **entregar** essa versão a alguém (ex.: imagem instalada no cliente), precisa: incluir a licença, marcar os arquivos alterados, manter os avisos (§4 a-c). Código próprio que só fala com o Traccar pela API/HTTP é obra separada, fora da definição de "Derivative Works" ("remain separable from, or merely link … to the interfaces") | CONFIRMADO | `https://www.apache.org/licenses/LICENSE-2.0` §1 (definição de Derivative Works) e §4; `https://choosealicense.com/licenses/apache-2.0/` |
| Marca: a licença não dá direito de usar o nome "Traccar" como marca do produto (§6) — o ERP não deve se apresentar como "Traccar" | CONFIRMADO | `https://www.apache.org/licenses/LICENSE-2.0` §6; `https://choosealicense.com/licenses/apache-2.0/` (limitação: trademark use) |
| O mantenedor confirma informalmente: "Traccar software is completely free and open source. You are free to use it for commercial purposes." (Anton Tananaev, fórum, resposta antiga, sem data absoluta na página) | CONFIRMADO (fonte informal, não substitui a licença) | `https://www.traccar.org/forums/topic/traccar-for-commercial-purposes/`; Wikipedia `https://en.wikipedia.org/wiki/Traccar` (licença Apache 2.0) |

**Ressalva de terceiros (só para o caso de redistribuição).** A imagem embute dependências com licenças próprias (o
`build.gradle` da tag lista, entre outras, `com.mysql:mysql-connector-j:26.7.0`, `com.h2database:h2:2.5.252`, Jetty,
Netty, `org.postgresql:postgresql:42.7.13`). Para **rodar como SaaS** isso não muda nada. Se um dia a imagem for
**entregue** a cliente, as licenças de cada dependência (inclusive a do conector MySQL, que pelo meu conhecimento é GPLv2 com
exceção FOSS da Oracle — **não medido nesta pesquisa**) precisam ser revistas — isso não foi verificado dependência a dependência (ver "o que não consegui verificar").
Fonte: `https://raw.githubusercontent.com/traccar/traccar/v6.16.0/build.gradle`, linhas 86-147.

## 4. Segurança (CVEs e avisos)

**Veredito: a 6.16.0 tem DUAS CVEs abertas, publicadas HOJE (2026-10-11), sem correção em release nem na `master`.
Ambas são de severidade média e dependem de recursos que a arquitetura do plano não usa (OIDC; e-mail de
recuperação de senha com o Traccar exposto a usuários). Todas as CVEs anteriores conhecidas estão corrigidas no
código da tag. Não há versão melhor para escolher: a 6.16.0 continua sendo a recomendada, com as mitigações abaixo
como condição de configuração.**

Fontes de varredura (acesso 2026-10-11): NVD `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=traccar`
(22 CVEs, `timestamp` 2026-10-11T14:41:46); GitHub Security Advisories do repositório
`https://api.github.com/repos/traccar/traccar/security-advisories` (17 avisos); CVE.org
`https://cveawg.mitre.org/api/cve/<id>`; OSV `https://api.osv.dev/v1/vulns/<id>`; código-fonte da tag.

### 4.1 Abertas na 6.16.0

| CVE | O que é | Afeta | Status | Fontes (acesso 2026-10-11) | Exposição no desenho do ERP |
|---|---|---|---|---|---|
| **CVE-2026-108737** (CWE-640), CVSS 3.1 6.8 / 4.0 7.6 | Token de recuperação de senha não tem "propósito": o link de reset vale como credencial de sessão (`/api/session?token=`) e para trocar senha (`/api/password/update`) por 7 dias, mesmo depois de a vítima trocar a senha | "through 6.16.0" (CNA: `0 ≤ v ≤ 6.16.0`) | **ABERTA** — sem release corrigida; na `master` após a tag (`compare v6.16.0...master`, 300 arquivos), `TokenManager` e `PasswordResource` não mudam, e `SessionResource`/`OpenIdProvider` só têm reordenação de `import` (patch lido) | (a) NVD `CVE-2026-108737` (publicada 2026-10-11T13:17, `Deferred`); (b) CVE.org (CNA VulnCheck, `PUBLISHED` 2026-10-11T12:19); (c) `https://www.vulncheck.com/advisories/traccar-through-6.16.0-weak-password-recovery-via-tokenmanager-token-purpose-confusion`; (d) `https://hackmd.io/@haind/traccar-token-purpose-confusion` ("needs no special configuration beyond working email"); (e) **código da tag:** `TokenManager.TokenData` só tem `id`, `userId`, `expiration` (`api/signature/TokenManager.java:47-109`), e `PasswordResource.update` aceita qualquer token válido (`api/resource/PasswordResource.java:72-90`) | **Baixa, se** o Traccar não tiver SMTP configurado (sem SMTP o link de reset não é entregue a ninguém), não tiver usuários humanos além da conta de serviço do ERP e a web/API não for pública (o plano já prevê `web.address=127.0.0.1` em §8.3, rede privada em §6 e "interface e REST do Traccar não expostas" no threat model §5). A precondição é um link de reset vazado |
| **CVE-2026-108738** (CWE-352), CVSS 3.1 4.2 | CSRF de login: o callback OIDC (`/api/session/openid/callback`) não valida o `state` | 5.7 a 6.16.0 | **ABERTA** — idem | (a) NVD `CVE-2026-108738`; (b) CVE.org (CNA VulnCheck, `5.7 ≤ v ≤ 6.16.0`); (c) `https://www.vulncheck.com/advisories/traccar-5.7-through-6.16.0-login-csrf-via-openid-connect-callback`; (d) `https://hackmd.io/@haind/traccar-oidc-client-missing-state-login-csrf`; (e) **código da tag:** o `state` é gerado (`database/OpenIdProvider.java:117`, `new State()`) e não há outra ocorrência de `state` no provedor nem em `SessionResource.java` | **Nula, se** o Traccar não for configurado com login OIDC (`openid.*`). O plano não prevê login humano no Traccar |

Nenhuma das duas aparece ainda nos 17 avisos do repositório no GitHub nem no OSV (`Vulnerability not found`), e o
hackmd diz "disclosure pending". **Ou seja: o mantenedor pode publicar uma 6.16.1 nos próximos dias.** Isso é motivo
para registrar a revisão quando sair, **não** para esperar: as duas dependem de recurso que o desenho não liga.

### 4.2 Avisos anteriores — todos corrigidos no código da 6.16.0 (conferido no fonte da tag)

| CVE / GHSA | Faixa afetada declarada | Correção conferida no fonte `v6.16.0` | Fontes |
|---|---|---|---|
| CVE-2026-52851 / GHSA-jx5h-fxhc-cc9w — SQLi autenticada em `DELETE /api/permissions` (7.1) | < 6.14.0 (NVD: "fixed in 6.14.0") | `model/Permission.java:55-57` exige exatamente 2 chaves; `storage/DatabaseStorage.java:230-243` monta o `WHERE` só com `Permission.getKey(<classe>)` e parâmetros | NVD; GHSA (repo); OSV (`fixed: cd0dbaf5…`); fonte da tag |
| CVE-2026-52852 / GHSA-6qh3-234v-r254 — laço infinito por ciclo de grupos (6.5) | < 6.14.0 | `helper/model/AttributeUtil.java:53-54` limita a profundidade (`Storage.MAX_GROUP_DEPTH`) | NVD; GHSA; fonte da tag. (Endurecimento extra pós-tag: `728cf06d84`, item 1) |
| CVE-2026-44314, -27644, -27693, -27694 (upload de imagem, CSV/XML/HTML injection) | < 6.13.0 | fora da faixa (6.16.0 > 6.13.0) | NVD (CPE `<6.13.0`); GHSA (`patched 6.13.0`) |
| CVE-2026-25648 — XSS por SVG em imagem de dispositivo (8.7) | NVD sem limite superior (`≥ 6.11.1`) | `api/resource/DeviceResource.java:192-195` só aceita jpeg/png/gif/webp (SVG removido) e `api/MediaFilter.java:66` põe `Content-Security-Policy: sandbox` em mídia | NVD; GHSA; fonte da tag; commit `d65c5f1a` (item 1) |
| CVE-2025-68930 — WebSocket sem checar `Origin` (7.1) | ≤ 6.11.1 | `api/AsyncSocketServlet.java:71` chama `SessionHelper.isSessionOriginValid` | NVD; GHSA; fonte da tag |
| CVE-2026-23521 — path traversal por `uniqueId` absoluto (6.5) | ≤ 6.11.1 | `database/MediaManager.java:52-57` normaliza e exige `filePath.startsWith(path)` | NVD; GHSA; fonte da tag |
| CVE-2026-25649 — open redirect no provedor OIDC (7.3) | ≤ 6.11.1 | `api/resource/OidcResource.java:87-88` exige `redirect_uri` na lista do cliente | NVD; GHSA; fonte da tag |
| CVE-2025-61666 (LFI no Windows, 6.1-6.8.1), CVE-2024-7746 (credenciais padrão, 2.12-6.0), CVE-2024-31214, CVE-2024-24809, CVE-2023-50729, CVE-2021-21292, CVE-2020-5246, CVE-2019-5748, CVE-2018-1000881 | ≤ 6.8.1 | fora da faixa | NVD (CPE/descrição); GHSA |
| CVE-2026-48745 — **Traccar Client** (app móvel) ≤ 9.7.19 | outro produto | não se aplica ao servidor | NVD; `traccar/traccar-client` GHSA-vm6j-6g39-gj97 |

### 4.3 Riscos de configuração (não são CVE, saem do item 2 e do código)

- **A imagem roda como root** (sem `USER`). Mitigação de implantação: rede interna, sem porta publicada além do
  necessário, sistema de arquivos e volumes mínimos; avaliar `--user` não-root com volumes graváveis (não testado aqui).
- **`forward.url` por dispositivo desvia a posição** daquele dispositivo para outra URL (item 5, P-04). Na 6.16.0 o
  token (`forward.header`) não vai junto, mas a posição vai. Quem puder editar atributos de dispositivo no Traccar pode
  desviar dados: o Traccar não deve ter usuário além da conta de serviço do ERP.
- **`database.registerUnknown`** cria dispositivo para qualquer identificador que chegue (item 5, P-05). Manter
  `false` (o padrão) para não aceitar rastreador desconhecido.
- **Decodificadores de protocolo** são a maior superfície de DoS (ver os commits pós-tag no item 1): `protocols.enable`
  restrito ao(s) protocolo(s) em uso.
- Versões de bibliotecas declaradas na tag (`build.gradle:47-53`): Jetty 12.1.13, Netty 4.2.18.Final, Jersey 4.0.2,
  Guice 7.0.0. **Não fiz varredura de CVE da imagem (SO Alpine 3.24.2 + JRE 25 + jars)** — ver "o que não consegui
  verificar".

## 5. Semântica do forward no código-fonte da tag (P-01 a P-05)

**Método.** Cada arquivo baixado de `https://raw.githubusercontent.com/traccar/traccar/v6.16.0/<caminho>` em
2026-10-11 (14:35-15:10 UTC), tag → commit `cfab560c79ee9c9eaa41c79c6df351e820d6284b` (o mesmo `revision` gravado na
imagem fixada, item 2 — então o código lido é o código que roda). Linhas numeradas por `awk 'NR>=…'` sobre o arquivo
baixado. Caminhos relativos a `src/main/java/org/traccar/`. Segunda e terceira fontes por fato, quando há: a
documentação oficial `https://www.traccar.org/configuration-file/` e `https://www.traccar.org/forward/` (citadas no
plano como T-2/T-3, lidas em 2026-10-11) e o patch do commit `acd55bd0` (item 1).

O que a documentação oficial confirma e o que ela **não** diz (por isso o código é a fonte primária aqui):

- confirma: `forward.type` "Default is "url"" e tem de ser `json` para o corpo JSON; `forward.url` "Can be set globally
  or per device"; `forward.retry.delay` 100, `.count` 10, `.limit` 100; `database.registerUnknown` e `.regex`;
  `protocols.enable` "If not specified, Traccar enables all protocols that have port numbers listed"; `web.address`
  "network interface for the web interface to bind to"; variáveis de ambiente ligadas por
  `CONFIG_USE_ENVIRONMENT_VARIABLES=true`, "take precedence over the XML file", nome por "replace dots with
  underscores and convert the rest to screaming snake case";
- **não diz:** o formato do corpo (`position`/`device`), a ordem forward × gravação, que o header só vai à URL global,
  que o override vale também por **grupo**, nem a chave XML `config.useEnvironmentVariables`. A página `/forward/` diz
  só que o forward acontece "after they have been decoded and enriched", sem falar da gravação.

**Resultado: 11 fatos conferidos — 8 CONFIRMADOS (alguns com precisão), 2 CONFIRMADOS com escopo maior que o plano escreveu (P-02 e P-04a; DIVERGENTE por omissão, sem
mudar a conclusão do plano), 1 DIVERGENTE pontual (ENV: o "só" é falso) — e 3 fatos novos que o plano deve conhecer.**

| # | Fato do plano (§2.2) | Veredito | Arquivo:linha na tag | Trecho |
|---|---|---|---|---|
| P-01 | o forward roda **antes** de gravar a posição — sem `position.id` | **CONFIRMADO** (só na 1ª tentativa — o plano já registra isso em §4.4/A2-10) | `ProcessingHandler.java:101-119`; `handler/PositionForwardingHandler.java:122-131`; `handler/DatabaseHandler.java:39-48`; `forward/PositionForwarderJson.java:75`; `model/BaseModel.java:21-23` | lista de handlers: `… EngineHoursHandler.class, PositionForwardingHandler.class, DatabaseHandler.class)` (L117-119). O forward dispara assíncrono e libera a cadeia na hora: `new AsyncRequestAndCallback(positionData).send(); } callback.processed(false);` (L128-130). A serialização é síncrona dentro de `forward()`: `Entity.entity(objectMapper.writeValueAsString(positionData), mediaType)` (L75) → na 1ª tentativa `id` é o `long` primitivo ainda 0 (serializado como `0`, não ausente: é `long` primitivo, sem `@JsonIgnore` em `BaseModel`, e o `ObjectMapper` do forward — `MainModule.java:153-158` — não tem regra de exclusão). O `DatabaseHandler` depois faz `position.setId(id)` (L42), e cada retry reserializa o **mesmo** objeto → retry pode levar `id > 0` |
| P-02 | corpo `{position, device}`; `device` traz `name`, `phone`, `contact`, `model` | **CONFIRMADO, escopo maior** | `forward/PositionData.java:22-43`; `handler/PositionForwardingHandler.java:125-127`; `model/Device.java:33-158`; `model/GroupedModel.java:21-23`; `model/ExtendedModel.java:31`; `model/BaseModel.java:23` | `@JsonInclude(JsonInclude.Include.NON_NULL) public class PositionData { private Position position; … private Device device;` ; `positionData.setDevice(cacheManager.getObject(Device.class, position.getDeviceId()))`. **O `device` serializa, além de `name` (L44), `phone` (L105), `model` (L115), `contact` (L125): `id`, `uniqueId` (L54), `status` (L73), `lastUpdate` (L84), `positionId` (L95), `category` (L135), `disabled` (L146), `expirationTime` (L158), `calendarId` (L33), `groupId` e o mapa livre `attributes`.** Só os campos `motion*`/`overspeed*` têm `@JsonIgnore` (L171-288). O plano lê só `device.uniqueId` e `device.id` (allowlist) — a conclusão vale; mas o corpo bruto carrega dado pessoal (telefone, contato) e atributos arbitrários: **nunca logar o corpo bruto** (§4.7 do plano) |
| P-03a | `speed` em nós | **CONFIRMADO** | `model/Position.java:267` | `private double speed; // value in knots` |
| P-03b | `outdated` não é serializado | **CONFIRMADO** | `model/Position.java:207-218` | `@JsonIgnore @QueryIgnore public boolean getOutdated()` (L209-211) e `@JsonIgnore` no setter (L215) |
| P-04a | `forward.url` aceita valor por dispositivo | **CONFIRMADO, escopo maior: também por GRUPO** | `config/Keys.java:1102-1108`; `forward/PositionForwarderJson.java:53`; `helper/model/AttributeUtil.java:49-68` | `FORWARD_URL = new StringConfigKey("forward.url", List.of(KeyType.CONFIG, KeyType.DEVICE))`; `String url = AttributeUtil.lookup(cacheManager, Keys.FORWARD_URL, positionData.getDevice().getId());` — e o `lookup` procura no dispositivo, **depois sobe a hierarquia de grupos** (`while (result == null && groupId > 0 && depth-- > 0) { … group.getAttributes().get(key.getKey()) …}`, L54-62), e só então na config (L66-67). Um atributo `forward.url` num **grupo** desvia todos os dispositivos do grupo. A mitigação do plano (Traccar sem usuário além da conta de serviço) cobre os dois |
| P-04b | `forward.header` só vai para a URL global | **CONFIRMADO** (é novidade da 6.16.0) | `forward/PositionForwarderJson.java:47-48,61-72`; `config/Keys.java:1110-1116` | `this.url = config.getString(Keys.FORWARD_URL);` … `if (url.equals(this.url) && header != null && !header.isEmpty()) { for (String line: header.split("\\r?\\n")) {…requestBuilder.header(headerName, headerValue);` — Javadoc: "Global headers are only used when forwarding to the globally configured URL." Introduzido pelo commit `acd55bd0` (2026-09-23); **falso em 6.15.x** (item 1) |
| P-04c | retry desligado por padrão; atraso dobrando a partir de 100 ms; 10 tentativas; 100 pendentes | **CONFIRMADO** (precisão: 10 **re**tentativas além da 1ª, até 11 envios; ~102 s de espera acumulada) | `config/Keys.java:1118-1154`; `config/Config.java:90-98`; `handler/PositionForwardingHandler.java:79-104`; `forward/PositionForwarderJson.java:80-91` | `FORWARD_RETRY_ENABLE = new BooleanConfigKey("forward.retry.enable", …)` sem default → `Objects.requireNonNullElse(defaultValue, false)` (Config L96); `FORWARD_RETRY_DELAY … 100`, `FORWARD_RETRY_COUNT … 10`, `FORWARD_RETRY_LIMIT … 100`; `if (retryEnabled && deliveryPending.get() <= retryLimit && retries < retryCount) { schedule();` (L92); `timer.newTimeout(this, retryDelay * (1L << retries++), TimeUnit.MILLISECONDS)` (L103); toda resposta fora da família 2xx é falha: `if (response.getStatusInfo().getFamily() == Response.Status.Family.SUCCESSFUL) … else … completeExceptionally(new RuntimeException("HTTP code " + code))` (L80-85) |
| P-05 | `database.registerUnknown` com filtro `\w{3,15}` | **CONFIRMADO** (precisão: o filtro é o **default** e é configurável; casamento é da string inteira) | `config/Keys.java:626-649`; `session/ConnectionManager.java:143-150` | `DATABASE_REGISTER_UNKNOWN = new BooleanConfigKey("database.registerUnknown", …)` (default `false`); `DATABASE_REGISTER_UNKNOWN_REGEX = new StringConfigKey("database.registerUnknown.regex", List.of(KeyType.CONFIG), "\\w{3,15}")`; uso: `if (device == null && config.getBoolean(Keys.DATABASE_REGISTER_UNKNOWN)) { if (firstUniqueId.matches(config.getString(Keys.DATABASE_REGISTER_UNKNOWN_REGEX))) { device = addUnknownDevice(firstUniqueId);` — `String.matches` exige casar tudo; `\w` = `[A-Za-z0-9_]`, então `sim-traccar-01` (hífens) não registra e `trcdemo01` registra |
| ENV | variáveis de ambiente só com `CONFIG_USE_ENVIRONMENT_VARIABLES=true`, nome derivado da chave | **CONFIRMADO com uma omissão (DIVERGENTE no "só")**: também liga pela chave XML `config.useEnvironmentVariables=true` | `config/Config.java:48-49,65-67,80-88,140-142` | `useEnvironmentVariables = Boolean.parseBoolean(System.getenv("CONFIG_USE_ENVIRONMENT_VARIABLES")) \|\| Boolean.parseBoolean(properties.getProperty("config.useEnvironmentVariables"));` ; nome: `key.replaceAll("\\.", "_").replaceAll("(\\p{Lu})", "_$1").toUpperCase(Locale.ROOT)` → `forward.url`→`FORWARD_URL`, `forward.header`→`FORWARD_HEADER`, `database.registerUnknown`→`DATABASE_REGISTER_UNKNOWN`. Valor de ambiente **vazio é ignorado** (`if (value != null && !value.isEmpty()) return value;`, L83) e cai no XML. `hasKey` também olha o ambiente (L66) — logo `FORWARD_URL` no ambiente basta para criar o forwarder (`MainModule.java:407`) |
| PROT | `protocols.enable` restringe os protocolos | **CONFIRMADO** (precisão: sem a chave, sobe **todos** os protocolos com porta default — 266 entradas `put(<Protocolo>.class, <porta>)` em `PortConfigSuffix` (contadas por `grep -c`)) | `config/Keys.java:1828-1835`; `ServerManager.java:50-63`; `config/PortConfigSuffix.java:292-295,353,573` | `if (config.hasKey(Keys.PROTOCOLS_ENABLE)) { enabledProtocols = new HashSet<>(Arrays.asList(config.getString(Keys.PROTOCOLS_ENABLE).split("[, ]"))); }` … `if (enabledProtocols == null \|\| enabledProtocols.contains(protocolName)) { if (config.getInteger(Keys.PROTOCOL_PORT.withPrefix(protocolName)) > 0) {` ; default do OsmAnd: `put(OsmAndProtocol.class, 5055);` (L353) |
| WEB | `web.address` liga a interface a um endereço | **CONFIRMADO** | `config/Keys.java:929-935`; `web/WebServer.java:78-84` | `WEB_ADDRESS = new StringConfigKey("web.address", …)` (Javadoc: "By default, the server will bind to all available interfaces"); `if (address == null) { server = new Server(port); } else { server = new Server(new InetSocketAddress(address, port)); }` |

**Fatos novos que o plano deve conhecer (não estão em §2.2):**

1. **`forward.type` default é `"url"`, não `"json"`** (`config/Keys.java:1081-1084`: `FORWARD_TYPE … "url"`), e o
   forwarder só existe se `forward.url` global estiver configurado (`MainModule.java:404-419`:
   `if (config.hasKey(Keys.FORWARD_URL)) { return switch (config.getString(Keys.FORWARD_TYPE)) { case "json" -> new
   PositionForwarderJson(…); … default -> new PositionForwarderUrl(…);`). **Sem `forward.type=json` o corpo
   `{position, device}` não existe.** O plano já põe `forward.type=json` no `traccar.xml` de dev (§8.3, linha 1295);
   isso precisa valer em staging e produção também.
2. **Geocoder ligado por padrão, com LocationIQ e chave embutida** (`config/Keys.java:1937-1940` `GEOCODER_ENABLE …
   true`; `:1945-1948` `GEOCODER_TYPE … "locationiq"`; `:1960-1963` `GEOCODER_KEY … "pk.689d…2b2d"`;
   `MainModule.java:228-240`). A geocodificação automática por posição vem desligada (`geocoder.ignorePositions`
   default `true`, `:1989-1992`), mas relatórios e notificações geocodificam sob demanda (`geocoder.onRequest` default
   `true`, `:2005-2008`) — ou seja, coordenadas sairiam para um terceiro. O plano põe `geocoder.enable=false` em dev;
   **deve valer em todo ambiente** (LGPD e regra de serviço externo). A `master` já tirou a chave padrão
   (`fad03d4b84`, pós-tag).
3. **Timeout do forward = 5 s de conexão e 5 s de leitura** (`config/Keys.java:1064-1076`, `client.connectTimeout` e
   `client.readTimeout`, default 5000; aplicados ao cliente em `MainModule.java:160-166`). Se o ERP demorar mais que
   isso, o Traccar conta falha e reenvia — a idempotência de §4.4 do plano cobre, mas a latência p99 do listener tem
   de ficar bem abaixo de 5 s.

**Hipóteses de §2.2 que o código já esclarece (a fixture ainda confirma):** caminho da config na imagem =
`/opt/traccar/conf/traccar.xml` (item 2); datas como texto ISO-8601, não epoch, porque o `ObjectMapper` do forward
desliga `WRITE_DATES_AS_TIMESTAMPS` (`MainModule.java:153-157`) — o formato exato do fuso é do Jackson e **a fixture
decide**; `position.id` = `0` (presente) na 1ª tentativa e possivelmente `> 0` no retry (P-01 acima).

## 6. Servidores de demonstração e imagem local em dev

**Veredito: a documentação oficial lista 4 servidores públicos de demonstração, sem garantia de serviço, de
histórico nem de dado; o mantenedor diz preferir que ninguém os use em produção e já apagou os dados deles sem aviso.
A regra do dono (nunca usá-los em produção) é compatível com o que o próprio projeto diz, e deve valer também em dev:
o dev roda a imagem fixada localmente.**

| Fato | Status | Fontes (acesso 2026-10-11) |
|---|---|---|
| Existem 4 servidores públicos: `demo.traccar.org` (Reino Unido, "Default server · Usually busier"), `demo2.traccar.org` (Canadá), `demo3.traccar.org` (Alemanha), `demo4.traccar.org` (EUA); porta = a do protocolo; conta criada por auto-registro; "There is no shared demo login or sample data" | CONFIRMADO | `https://www.traccar.org/demo-server/` |
| "Service quality, uptime, and full history are not guaranteed"; garantias só nas "subscription options" pagas | CONFIRMADO | `https://www.traccar.org/demo-server/` |
| Não são para produção: "No. In fact we prefer if people don't use demo servers for any production use cases. The purpose of demo servers is to let people try Traccar without a need to deploy and host their own server." (Anton Tananaev) | CONFIRMADO (fórum oficial; resposta datada "last year" na página) | `https://www.traccar.org/forums/topic/own-server/` |
| Os dados são apagados periodicamente e sem aviso: "We cleared the data on demo servers recently… We do it occasionally when too much data accumulates and servers start to fail"; não avisam porque há "many thousands of users registered on demo servers" | CONFIRMADO (fórum oficial; "4 years ago") | `https://www.traccar.org/forums/topic/devices-disappeared-on-demo3traccarorg/`; resultado de busca apontando também `https://traccar.org/forums/topic/demo-server-has-forgotten-my-registered-device-twice` e `https://traccar.org/forums/topic/no-pw-reset-on-demo-server` (não abertos) |
| Dado enviado a um servidor de demonstração vai para um servidor público de terceiro, com cadastro aberto — para posição de viatura e técnico isso é dado pessoal (LGPD) | inferência minha a partir das fontes acima | — |

**Armadilhas de dev que a documentação oficial cria** (motivo para o teste de topologia do plano proibir esses
hosts):

- os exemplos oficiais do protocolo OsmAnd usam `http://demo.traccar.org:5055/?id=12345&lat=…&lon=…&timestamp=…`
  (`https://www.traccar.org/osmand/`) — copiar o exemplo manda a posição simulada para o servidor público;
- o app Traccar Client "uses demo server 1 by default" (`https://www.traccar.org/demo-server/`);
- o exemplo de `docker run` da documentação usa `traccar/traccar:latest` e publica `80:8082` e `5000-5300` TCP/UDP em
  todas as interfaces (`https://www.traccar.org/docker/`) — no ERP, nada disso: tag+digest e só `127.0.0.1`.

**Como o dev roda a imagem local em dev** (a documentação oficial em `https://www.traccar.org/docker/` + o plano
§8.4/§8.3; nada aqui foi executado nesta pesquisa):

1. Pull **por digest**: `docker pull traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`
   (plano §8.4 passo 4; com até 3 tentativas pelo limite do Docker Hub).
2. Config própria montada **só leitura** em `/opt/traccar/conf/traccar.xml` (caminho da imagem, item 2; a doc
   oficial monta assim: `--volume …/traccar.xml:/opt/traccar/conf/traccar.xml:ro`). O conteúdo mínimo que esta
   pesquisa confirma no código: `protocols.enable=osmand` (senão sobem os 266 protocolos com porta default), `forward.type=json` (senão o
   corpo não é JSON), `forward.url` = o listener do ERP na rede interna, `forward.retry.enable=true`,
   `geocoder.enable=false` (senão LocationIQ sob demanda), `web.address` restrito; `database.registerUnknown=true`
   **só em dev** e com `uniqueId` que case `\w{3,15}` (o plano usa `trcdemo01`). O token do `forward.header` entra por
   ambiente (`CONFIG_USE_ENVIRONMENT_VARIABLES=true` + `FORWARD_HEADER`), nunca no arquivo versionado — como o plano já
   prevê (`${TRC_FORWARD_HEADER:?}`).
3. Rede: porta publicada só em `127.0.0.1` e fora das portas do dono (5432, 6379, 3000, 5173, 5050); OsmAnd em 5055
   dentro do contêiner; rede `internal` para o Traccar não ter saída (o plano faz isso com `traccar_private
   internal: true`, §11). Volumes `data/` e `logs/` descartáveis (a doc sugere `/opt/traccar/data` e
   `/opt/traccar/logs`); H2 local só em dev — a própria doc diz "The default H2 database is not recommended for
   production use".
4. Posição simulada para `http://127.0.0.1:<porta publicada>/?id=trcdemo01&lat=…&lon=…&timestamp=…` (formato da página
   OsmAnd, trocando o host público pelo local; velocidade do OsmAnd em nós por padrão, segundo a mesma página).
5. Ao fim, derrubar pelo nome do projeto compose (plano §8.4), nunca `docker system prune`.

## O que não consegui verificar

1. **Varredura de vulnerabilidades da imagem** (Alpine 3.24.2 + JRE Temurin 25 via `jlink` + os jars de
   `build.gradle`). Não rodei Trivy/Grype/Docker Scout: exigiria baixar a imagem (212 MB) e o mandato não pede
   execução. As CVEs do item 4 são só as do **Traccar**; as do SO e das bibliotecas (Jetty 12.1.13, Netty
   4.2.18.Final, Jersey 4.0.2, H2 2.5.252 etc.) não foram medidas.
2. **Assinatura da imagem.** Não existe: sem tag cosign (`sha256-03eb….sig`/`.att` → 404 no Docker Hub) e sem
   *referrers* OCI (lista vazia). A atestação SLSA anexada é do BuildKit e **não é assinada** — prova a origem só
   enquanto se confia na conta `traccar` do Docker Hub. A defesa é o pin por digest (o digest não muda mesmo que a tag
   mude). Não há como verificar mais que isso com o que o projeto publica.
3. **Correção das duas CVEs de hoje (CVE-2026-108737 e -108738).** Publicadas em 2026-10-11 pela VulnCheck como CNA;
   NVD em `Deferred` (sem análise própria); ainda não estão nos avisos do repositório nem no OSV; o autor diz
   "disclosure pending". Não sei se/quando sai uma 6.16.1, nem se o mantenedor contesta. **Recomendo reabrir esta PD
   quando sair a próxima release** (a revisão é só trocar tag+digest e repetir o item 5 no `diff`).
4. **Formato exato das datas e presença de `position.id` no JSON real.** O código indica ISO-8601 (texto) e `id: 0` na
   1ª tentativa; o fuso/forma exata vem do Jackson e só a fixture do passo 3 de §8.5 do plano fecha.
5. **Licenças das dependências embutidas, uma a uma** (relevante só se a imagem for redistribuída a cliente; ver
   item 3). A observação sobre o conector MySQL é do meu conhecimento, não medida.
6. **Espelho no GHCR** (`ghcr.io/traccar/traccar`): o workflow publica lá, mas o pacote não é público (401/404); não
   consegui comparar o digest. Usar só o Docker Hub.
7. **Comportamento em execução** — nada foi executado: nem pull, nem `docker run`, nem envio OsmAnd. Tudo do item 5 é
   leitura de código da tag; os itens 2 e 6 são metadados de registro e documentação.
8. **Datas das respostas do mantenedor no fórum** são relativas ("last year", "4 years ago"); não há data absoluta
   na página.
9. A política atual de limpeza dos servidores de demonstração não está escrita na página oficial; o que existe são
   respostas antigas no fórum (item 6).

# Roteiro de configuração da AWS pelo CloudShell, por fases

- **Autor:** `doc-aws-cloudshell-fable` (Claude Fable 5.1, topo), identidade nova, 2026-11-17.
- **Pedido do dono, verbatim:** *"ja crie os passos para configuracao da aws, atencao com o dns que pretendo inserir o endereco proprio, ter o meu endereco de ip com o nome do meu site/sistema. elabore detalhado com explicacao e dividido por fase, criar o .md"* e *"tudo tem que ser por linha de comando cloudshel e ser validado antes de ser escrito"*.
- **Base:** `docs/infra/estudo-aws-migracao.md` (desenho, custo e as 4 decisões), `docs/deployment.md` (portões do `env.ts`, papel de runtime, migrações, Runbook B, S3 de anexos, antivírus), `Dockerfile`, `.github/workflows/deploy-production.yml`, `.env.example`, `docs/go-live-readiness.md` §3. Tudo medido na `origin/main` em `89cf79fe`.
- **Validação:** cada comando `aws` deste roteiro passou por `aws <serviço> <operação> help` (saída 0 e toda flag presente no texto do help), os documentos JSON foram conferidos chave a chave contra `--generate-cli-skeleton`, os comandos que só existem na CLI v2 do CloudShell foram conferidos na documentação oficial, e os comandos que não são `aws` (`psql`, `openssl`, `curl`, `dig`, `jq`, `docker`, `git`, `npm`) foram conferidos pelo `--help` local ou pela documentação. **Nenhum comando foi executado contra conta nenhuma da AWS**: a validação é de sintaxe e de contrato. A evidência (1 linha por comando) fica fora do repositório, com o orquestrador. Comando que não passou não está aqui.

---

## 0. Como ler este roteiro

**Onde os comandos rodam.** Em dois lugares, os dois dentro do console da AWS:

| Terminal | O que é | Quando usar |
|---|---|---|
| **CloudShell** (o ícone `>_` no alto do console) | Terminal na nuvem, já autenticado como você, com a AWS CLI v2, `git`, `node`, `npm`, `jq`, `psql` e `openssl` instalados. Tem 1 GB de disco que persiste e sai para a internet. | Tudo que fala com a API da AWS (criar VPC, banco, serviço, DNS). |
| **CloudShell em VPC** (o mesmo CloudShell, mas "dentro" da sua rede privada) | O terminal nasce numa subnet privada da sua VPC e enxerga o banco e o Valkey, que não têm endereço público. **Não guarda arquivo entre sessões**, expira com 20–30 min sem uso, e só tem internet porque a subnet privada sai pelo NAT. | O que precisa tocar o banco: migrações, papel de runtime, provisionamento de RBAC, 1º administrador, drill de restore. |

Confirmado na documentação oficial: o CloudShell existe em `sa-east-1` (São Paulo) e o ambiente em VPC está disponível em todas as regiões; o limite é de 2 ambientes em VPC por usuário.

**O que cada passo traz:** o objetivo em língua de dono · o comando (as variáveis `${…}` são definidas uma vez no começo da fase, sem valor real) · **a conferência** (um comando de leitura e a saída que prova que deu certo) · o que custa por mês (do estudo, em US$) · como desfazer.

**Marcação "só no console (ato do dono)":** o que a AWS (ou o registrador do domínio, ou o GitHub) só permite pela tela. Tudo o mais é linha de comando.

**Convenções:**
- Nomes de recursos começam com `erp-`. Placeholders: `<CONTA>` (número da conta), `<DOMINIO>` (o seu domínio, sem `www`), `<GH_DONO>/<GH_REPO>` (dono e nome do repositório no GitHub), `<EMAIL_ALERTA>`.
- Nenhum segredo entra no histórico do terminal: senha nova sai de `openssl rand`, vai para um arquivo temporário com `umask 077` e o arquivo é destruído com `shred -u` depois do `aws … --secret-string file://…`. Senha digitada entra por `read -rs`.
- No começo de **toda** sessão do CloudShell, cole o bloco de variáveis da fase (as variáveis morrem com a sessão). Guarde os IDs que o roteiro manda anotar num arquivo em `~/erp-ids.env` (no CloudShell normal, que persiste; o CloudShell em VPC não persiste nada).

```bash
# Em toda sessão, antes de tudo:
export AWS_PAGER=""                 # sem paginador (CLI v2: conferido na doc)
export AWS_DEFAULT_REGION=sa-east-1
export REGIAO=sa-east-1
export CONTA="$(aws sts get-caller-identity --query Account --output text)"
export DOMINIO="<DOMINIO>"          # ex.: suaempresa.com.br
export GH_DONO="<GH_DONO>"
export GH_REPO="<GH_REPO>"
```

---

## 1. Mapa das fases, o portão e a etapa 1 (até 18/11)

| Fase | O que entrega | Itens do portão (`PLANO_SAN3.md`) | Custo/mês aproximado |
|---|---|---|---|
| 0 · Pré-requisitos | conta, MFA, administrador, região, CloudShell, domínio em mãos, orçamento com alerta | — | 0 |
| 1 · Fundação | VPC (2 AZ), NAT, grupos de segurança, ECR, segredos, OIDC do GitHub, logs | destrava tudo | ~12–15 |
| 2 · Dados | RDS PostgreSQL 16 (PITR, a recuperação a qualquer minuto dos últimos 7 dias; UTC), papel de runtime sem bypass, Valkey, drill de restore cronometrado | **9** (papel criado; a trava fecha na fase 3) e **10** (conferido na fase 6) | ~72 |
| 3 · API | cluster ECS, task definition, ALB com HTTPS, serviço, smoke | **9** (trava `runtime database role verified` verde) | ~71 |
| 3b · Antivírus | ClamAV privado (Fargate, o serviço da AWS que roda contêineres sem você cuidar de servidor; x86 0,5 vCPU / 3 GB), nome interno `clamav.erp.local`, a API com `EVIDENCE_SCANNER=clamav` | **27** (fecha quando o antivírus responder no ambiente e o upload deixar de dar 503) | ~43 |
| 3c · Traccar | Traccar privado (Fargate x86 0,5 vCPU / 2 GB) + RDS `db.t4g.micro` **dedicado**, ponte privada para a ingestão da API (3200), **nenhuma porta pública** | — (prepara o `B-TRC-06`) | ~66 |
| 3d · Porta dos rastreadores | NLB público só GT06 (5023) e OsmAnd (5055), 2 IPs fixos, logs de fluxo e alarmes — **trava: modelo de ameaças do `G-TRC-NLB` + junta 5/5 antes de executar** | — | ~35 |
| 4 · Frontend | S3 privado + CloudFront, certificado, build apontando para a API | — | ~3 |
| 5 · DNS próprio | zona, NS no registrador, `api.` e `app.`, HTTPS de ponta a ponta, a pergunta do IP fixo | — | ~1 |
| 6 · Go-live | 1º tenant e 1º admin, S3 de anexos, rollback ensaiado, alertas, checklist | **43** (1º admin), **10** (leitura da plataforma sob o papel); o 27 fecha na 3b | ~2 |
| **Total** | produção mínima, **com ClamAV e Traccar** (fases 0–3c e 4–6) | | **~US$ 270–285** |

Por decisão do dono em 17/11 (*"o traccar e antivirus ja entram"*), o mínimo já inclui o antivírus (3b) e o Traccar (3c): **~US$ 270–285/mês**, contra os US$ 255 do estudo com instância NAT. A diferença: o IPv4 público agora é cobrado (US$ 0,005/h por endereço), e a API e o ClamAV começam em x86 (3.6 e 3b: as imagens publicadas hoje são só `amd64`; o estudo contava ARM). Com a porta dos rastreadores aberta (3d, depois da trava), **~US$ 305–320/mês**: ainda abaixo do teto de US$ 350 do orçamento (D-AWS-02), mas perto; ao abrir a 3d, reveja o teto.

**A etapa 1 que o dono se comprometeu a fazer até 18/11 é a Fase 0 inteira mais o começo da Fase 1.** Exatamente isto precisa estar feito até lá, para o resto correr por comando:

1. Conta AWS aberta, cartão cadastrado, **MFA na conta raiz** ligada (Fase 0, passos 0.1–0.3).
2. Usuário administrador criado **com MFA**, e você logado com ele (nunca com a raiz) (0.4).
3. Região `sa-east-1` escolhida e o **CloudShell aberto** uma vez, com `aws sts get-caller-identity` respondendo (0.5).
4. Alias da conta e **AWS Budgets com alerta por e-mail** criados (0.6–0.7).
5. O **domínio** registrado onde quer que esteja, com o login do painel do registrador em mãos (0.8).
6. Um **token do GitHub** (`read:packages`) gerado, para o ECR puxar a imagem do GHCR (0.9).
7. **Fase 1, passos 1.1 a 1.6:** VPC, subnets, gateway de internet, rotas, NAT funcionando e os grupos de segurança. É o chão em que tudo o mais nasce; a partir daí, cada fase é só colar comandos.

---

## 2. Decisões que ficam com o dono (e o padrão se ninguém responder)

| ID | Pergunta | Recomendação | Padrão sem resposta |
|---|---|---|---|
| D-AWS-01 | NAT: instância `t4g.nano` ou NAT gateway? (decisão 2 do estudo) | instância (−US$ 60/mês; um ponto a monitorar) | instância |
| D-AWS-02 | Teto mensal do orçamento (decisão 4 do estudo) | US$ 350 só produção; US$ 450 se houver staging | US$ 350 |
| D-AWS-03 | **IP fixo** para a API? (ver 5.9) | alias no ALB agora; IP fixo só se um parceiro ou cliente exigir lista de permissão | sem IP fixo |
| D-AWS-04 | O domínio "nu" (`<DOMINIO>` sem `api.`/`app.`) aponta para algum lugar? | redirecionar para `https://app.<DOMINIO>` depois, num bloco de frontend | só `api.` e `app.` |
| D-AWS-05 | Valkey com criptografia em trânsito (`rediss://`)? | ligar quando o suporte do app a `rediss://` for medido (pendência P-AWS-VALKEY-TLS) | sem TLS, só rede privada e grupo de segurança |
| D-AWS-06 | `PORTAL_TENANT_ID` antes do 1º tenant existir | valor provisório `pendente-runbook-b`; trocar na fase 6 | provisório |
| D-AWS-07 | Ativar o login sem organização (`B-O6R-01`, `GRANT EXECUTE` em `auth_login_candidates`)? | decisão em ata, como manda o runbook | não ativar |
| D-AWS-08 | API em x86 até o CI publicar imagem `arm64` (pendência P-AWS-IMAGEM-ARM64) | x86 agora (+US$ 6/mês); trocar para ARM no PR do CI | x86 |
| D-AWS-09 | Transferir o domínio para o Route 53 Domains? | `.com.br` **não pode** (a AWS encerrou registro e transferência de `.com.br`); outros TLDs: não precisa, a zona funciona com qualquer registrador | manter no registrador atual |
| D-AWS-10 | RDS Multi-AZ? | não no começo (dobra o custo do banco) | single-AZ, PITR ligado |
| D-AWS-11 | Abrir a porta de protocolo dos rastreadores (GT06 e OsmAnd)? | **decidido pelo dono em 17/11:** *"porta aberta com os devidos cuidados"* → fase 3d, só depois do modelo de ameaças do gate `G-TRC-NLB` e da junta de 5 unânime | (decidido) |
| D-AWS-12 | Banco do Traccar: RDS dedicado ou um banco dentro do RDS do ERP? | **decidido pelo dono em 17/11:** *"banco proprio traccar"* → RDS `db.t4g.micro` dedicado (3c.2), como manda o plano do Traccar | (decidido) |

---

## 3. Fase 0 · Pré-requisitos (atos do dono)

**Pré-requisitos:** nenhum. **Custo:** US$ 0 (Budgets é grátis para os dois primeiros orçamentos; o Cost Explorer cobra US$ 0,01 por chamada à API, passo 0.10).

### 0.1 Abrir a conta — só no console (ato do dono)
`https://portal.aws.amazon.com/billing/signup` → e-mail da raiz, nome da conta, cartão, verificação por telefone, plano de suporte **Basic** (grátis). A conta nasce com a identidade **raiz**, que só se usa para isto e para o MFA.
**Desfazer:** só no console, logado como raiz: nome da conta → **Account** → **Close account** (a AWS guarda a conta fechada por 90 dias).

### 0.2 MFA na raiz — só no console (ato do dono)
Logado como raiz: canto superior direito → nome da conta → **Security credentials** → **Multi-factor authentication (MFA)** → **Assign MFA device** → *Authenticator app* (Google Authenticator, Authy ou similar). Sem isto, nada mais.
**Desfazer:** não se desfaz: a raiz nunca fica sem MFA (trocar de aparelho é **Assign** de um novo e **Remove** do antigo, no mesmo lugar).

### 0.3 Cartão e acesso do administrador ao faturamento — só no console (ato do dono)
Nome da conta → **Account** → seção **IAM user and role access to Billing information** → **Edit** → **Activate**. Sem isto o usuário administrador não consegue criar o orçamento do passo 0.7.
**Desfazer:** o mesmo caminho → **Edit** → desmarcar **Activate** (só no console, como raiz).

### 0.4 Usuário administrador com MFA — só no console (ato do dono)
IAM → **Users** → **Create user** → nome (ex.: `admin-erp`) → marque **Provide user access to the AWS Management Console** → *I want to create an IAM user* → senha própria → **Attach policies directly** → `AdministratorAccess` → **Create user**. Depois: o usuário → **Security credentials** → **Assign MFA device**. Saia da raiz e **entre com este usuário**. A raiz não se usa no dia a dia. (Alternativa mais robusta, para quando houver mais de uma pessoa: IAM Identity Center. Para uma pessoa, o usuário IAM com MFA basta.)
**Desfazer:** só no console: IAM → **Users** → o usuário → **Delete**, e só depois de existir outro administrador (senão a conta fica só com a raiz).

### 0.5 Região e CloudShell
Canto superior direito → região **South America (São Paulo) `sa-east-1`**. Clique no ícone `>_` (CloudShell). Na primeira abertura demora ~1 min. Aí, no terminal:

```bash
aws configure set region sa-east-1
export AWS_PAGER=""
```
**Conferência**
```bash
aws configure get region                                   # sa-east-1
aws sts get-caller-identity --query Arn --output text      # arn:aws:iam::<CONTA>:user/admin-erp  (NÃO pode terminar em ":root")
aws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled' --output text   # 1  (MFA da raiz ligada)
aws iam list-mfa-devices --user-name admin-erp --query 'MFADevices[].SerialNumber' --output text   # 1 linha (MFA do admin)
aws iam list-attached-user-policies --user-name admin-erp --query 'AttachedPolicies[].PolicyName' --output text   # AdministratorAccess
```
**Desfazer:** não se aplica.

### 0.6 Alias da conta
**Objetivo:** a URL de login vira `https://<alias>.signin.aws.amazon.com/console` em vez do número da conta.
```bash
aws iam create-account-alias --account-alias "<alias-da-sua-empresa>"
```
**Conferência:** `aws iam list-account-aliases --query 'AccountAliases[0]' --output text` → o alias.
**Desfazer:** `aws iam delete-account-alias --account-alias <alias>`.

### 0.7 Orçamento com alerta por e-mail (AWS Budgets)
**Objetivo:** a decisão 4 do estudo — um teto mensal e três avisos (50 %, 80 % do gasto real e 100 % da previsão). Teto sugerido: **US$ 350** só produção (D-AWS-02).
```bash
export EMAIL_ALERTA="<EMAIL_ALERTA>"
cat > budget.json <<'EOF'
{
  "BudgetName": "erp-producao-mensal",
  "BudgetLimit": { "Amount": "350", "Unit": "USD" },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF
cat > budget-notificacoes.json <<EOF
[
  { "Notification": { "NotificationType": "ACTUAL",     "ComparisonOperator": "GREATER_THAN", "Threshold": 50,  "ThresholdType": "PERCENTAGE" },
    "Subscribers": [ { "SubscriptionType": "EMAIL", "Address": "${EMAIL_ALERTA}" } ] },
  { "Notification": { "NotificationType": "ACTUAL",     "ComparisonOperator": "GREATER_THAN", "Threshold": 80,  "ThresholdType": "PERCENTAGE" },
    "Subscribers": [ { "SubscriptionType": "EMAIL", "Address": "${EMAIL_ALERTA}" } ] },
  { "Notification": { "NotificationType": "FORECASTED", "ComparisonOperator": "GREATER_THAN", "Threshold": 100, "ThresholdType": "PERCENTAGE" },
    "Subscribers": [ { "SubscriptionType": "EMAIL", "Address": "${EMAIL_ALERTA}" } ] }
]
EOF
aws budgets create-budget --account-id "$CONTA" --budget file://budget.json --notifications-with-subscribers file://budget-notificacoes.json
```
**Conferência:** `aws budgets describe-budget --account-id "$CONTA" --budget-name erp-producao-mensal --query 'Budget.[BudgetName,BudgetLimit.Amount,TimeUnit]' --output text` → `erp-producao-mensal 350 MONTHLY`. (Conta nova: o gasto só aparece depois de ~24 h.)
**Custo:** 0. **Desfazer:** `aws budgets delete-budget --account-id "$CONTA" --budget-name erp-producao-mensal`.

### 0.8 O domínio — ato do dono
Tenha em mãos o login do painel onde o domínio está registrado (registro.br, GoDaddy, Hostinger, Cloudflare…). Na fase 5 você vai **trocar os servidores DNS** do domínio lá. Nada é feito agora. Se for `.com.br`, ele fica no registro.br (D-AWS-09).
**Desfazer:** não se aplica (nada é criado aqui).

### 0.9 Token do GitHub para a imagem — só no console do GitHub (ato do dono)
A imagem da API é publicada pelo CI em `ghcr.io/<GH_DONO>/erp-backend:<sha>` (job `docker` do `ci.yml`). O ECR vai puxá-la direto do GHCR (pull-through cache, passo 1.7), e o GHCR exige credencial: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token** → só o escopo **`read:packages`** → validade 90 dias. Guarde-o; ele entra no Secrets Manager no passo 1.7 e nunca no repositório.
**Desfazer:** no GitHub, o mesmo caminho → o token → **Delete** (o pull-through do 1.6 para de importar imagem nova; as já importadas ficam no ECR).

### 0.10 Leitura de custo pela linha de comando (opcional, US$ 0,01 por chamada)
```bash
aws ce get-cost-and-usage --time-period Start=$(date -u -d '-7 days' +%F),End=$(date -u +%F) --granularity DAILY --metrics UnblendedCost --query 'ResultsByTime[].Total.UnblendedCost.Amount' --output text
```
(O Cost Explorer precisa ser aberto uma vez no console: **Billing and Cost Management → Cost Explorer**; a API responde ~24 h depois.)
**Desfazer:** não se aplica (só leitura).

**Conferência da fase inteira:** os 5 comandos do 0.5 e o `describe-budget` do 0.7 respondem como esperado. **O que pode dar errado:** logar com a raiz por hábito (o `Arn` termina em `:root`: saia e entre com o administrador); cartão recusado (a conta fica "pending"); e-mail de alerta cair no spam.

---

## 4. Fase 1 · Fundação

**Pré-requisitos:** Fase 0. **Terminal:** CloudShell normal. **Custo:** NAT ~US$ 8–12 (instância) ou ~US$ 68 (gateway) · IPv4 público US$ 3,65 por endereço · Secrets Manager US$ 0,40 por segredo · CloudWatch Logs ~US$ 1 · ECR US$ 0,10/GB.

```bash
# Variáveis da fase (além do bloco do §0):
export CIDR_VPC=10.40.0.0/16
export CIDR_PUB_A=10.40.0.0/24  CIDR_PUB_B=10.40.1.0/24
export CIDR_PRIV_A=10.40.10.0/24 CIDR_PRIV_B=10.40.11.0/24
```

### 1.1 VPC
**Objetivo:** a sua rede privada na AWS, com nomes DNS internos ligados (o RDS e o Valkey precisam).
```bash
VPC_ID=$(aws ec2 create-vpc --cidr-block "$CIDR_VPC" --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=erp-prod}]' --query Vpc.VpcId --output text)
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support '{"Value":true}'
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames '{"Value":true}'
echo "VPC_ID=$VPC_ID" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-vpcs --vpc-ids "$VPC_ID" --query 'Vpcs[0].[State,CidrBlock]' --output text` → `available 10.40.0.0/16`.
**Custo:** 0. **Desfazer:** `aws ec2 delete-vpc --vpc-id "$VPC_ID"` (só depois de apagar tudo dentro: subnets, tabelas de rota, gateway desanexado com `aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"` e apagado com `aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID"`).

### 1.2 Duas zonas de disponibilidade e quatro subnets
**Objetivo:** 2 subnets públicas (só o balanceador e o NAT) e 2 privadas (API, banco, Valkey, depois Traccar e ClamAV), em 2 zonas, como manda o estudo.
```bash
read -r AZ_A AZ_B <<< "$(aws ec2 describe-availability-zones --filters Name=state,Values=available --query 'AvailabilityZones[0:2].ZoneName' --output text)"
SUB_PUB_A=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR_PUB_A" --availability-zone "$AZ_A" --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=erp-pub-a}]' --query Subnet.SubnetId --output text)
SUB_PUB_B=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR_PUB_B" --availability-zone "$AZ_B" --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=erp-pub-b}]' --query Subnet.SubnetId --output text)
SUB_PRIV_A=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR_PRIV_A" --availability-zone "$AZ_A" --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=erp-priv-a}]' --query Subnet.SubnetId --output text)
SUB_PRIV_B=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR_PRIV_B" --availability-zone "$AZ_B" --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=erp-priv-b}]' --query Subnet.SubnetId --output text)
aws ec2 modify-subnet-attribute --subnet-id "$SUB_PUB_A" --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id "$SUB_PUB_B" --map-public-ip-on-launch
printf 'AZ_A=%s\nAZ_B=%s\nSUB_PUB_A=%s\nSUB_PUB_B=%s\nSUB_PRIV_A=%s\nSUB_PRIV_B=%s\n' "$AZ_A" "$AZ_B" "$SUB_PUB_A" "$SUB_PUB_B" "$SUB_PRIV_A" "$SUB_PRIV_B" >> ~/erp-ids.env
```
**Conferência** (4 linhas; as `erp-pub-*` com `True`):
```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" --query 'Subnets[].[Tags[?Key==`Name`]|[0].Value,AvailabilityZone,CidrBlock,MapPublicIpOnLaunch]' --output table
```
**Desfazer:** `aws ec2 delete-subnet --subnet-id <id>`.

### 1.3 Gateway de internet e rotas
**Objetivo:** as subnets públicas falam com a internet pelo gateway; as privadas, só pelo NAT (passo 1.4).
```bash
IGW_ID=$(aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=erp-igw}]' --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"
RT_PUB=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=erp-rt-publica}]' --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id "$RT_PUB" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID"
aws ec2 associate-route-table --route-table-id "$RT_PUB" --subnet-id "$SUB_PUB_A"
aws ec2 associate-route-table --route-table-id "$RT_PUB" --subnet-id "$SUB_PUB_B"
RT_PRIV=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=erp-rt-privada}]' --query RouteTable.RouteTableId --output text)
aws ec2 associate-route-table --route-table-id "$RT_PRIV" --subnet-id "$SUB_PRIV_A"
aws ec2 associate-route-table --route-table-id "$RT_PRIV" --subnet-id "$SUB_PRIV_B"
printf 'IGW_ID=%s\nRT_PUB=%s\nRT_PRIV=%s\n' "$IGW_ID" "$RT_PUB" "$RT_PRIV" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-route-tables --route-table-ids "$RT_PUB" --query 'RouteTables[0].Routes[].[DestinationCidrBlock,GatewayId,State]' --output table` → a linha `0.0.0.0/0 igw-… active`.
**Desfazer:** desassociar cada subnet com `aws ec2 disassociate-route-table --association-id <rtbassoc-…>` (os IDs saem do `describe-route-tables`, campo `Associations[].RouteTableAssociationId`) e então `aws ec2 delete-route-table --route-table-id <id>`.

### 1.4 Grupos de segurança
**Objetivo:** o firewall entre as peças. A API roda no **Fargate** (o serviço de contêineres da AWS explicado no mapa do §1). Regra do estudo: ALB recebe 443/80 do mundo; API 3000 só do ALB; RDS 5432 só da API (e do CloudShell em VPC); Valkey 6379 só da API (e do CloudShell em VPC); ClamAV 3310 só da API. `erp-sg-ops` é o grupo do CloudShell em VPC (sem entrada nenhuma). `erp-sg-nat` só existe se você escolher a instância NAT.
```bash
sg() { aws ec2 create-security-group --group-name "$1" --description "$2" --vpc-id "$VPC_ID" --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$1}]" --query GroupId --output text; }
SG_ALB=$(sg erp-sg-alb "ALB publico: 443 e 80 do mundo")
SG_API=$(sg erp-sg-api "API Fargate: 3000 so do ALB")
SG_RDS=$(sg erp-sg-rds "RDS: 5432 so da API e do CloudShell em VPC")
SG_VALKEY=$(sg erp-sg-valkey "Valkey: 6379 so da API e do CloudShell em VPC")
SG_CLAMAV=$(sg erp-sg-clamav "ClamAV: 3310 so da API (B-AV-REAL)")
SG_OPS=$(sg erp-sg-ops "CloudShell em VPC: sem entrada")
SG_NAT=$(sg erp-sg-nat "Instancia NAT: 80 e 443 vindos da VPC")
aws ec2 authorize-security-group-ingress --group-id "$SG_ALB" --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_ALB" --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_API" --protocol tcp --port 3000 --source-group "$SG_ALB"
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS" --protocol tcp --port 5432 --source-group "$SG_API"
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS" --protocol tcp --port 5432 --source-group "$SG_OPS"
aws ec2 authorize-security-group-ingress --group-id "$SG_VALKEY" --protocol tcp --port 6379 --source-group "$SG_API"
aws ec2 authorize-security-group-ingress --group-id "$SG_VALKEY" --protocol tcp --port 6379 --source-group "$SG_OPS"
aws ec2 authorize-security-group-ingress --group-id "$SG_CLAMAV" --protocol tcp --port 3310 --source-group "$SG_API"
aws ec2 authorize-security-group-ingress --group-id "$SG_NAT" --protocol tcp --port 443 --cidr "$CIDR_VPC"
aws ec2 authorize-security-group-ingress --group-id "$SG_NAT" --protocol tcp --port 80  --cidr "$CIDR_VPC"
printf 'SG_ALB=%s\nSG_API=%s\nSG_RDS=%s\nSG_VALKEY=%s\nSG_CLAMAV=%s\nSG_OPS=%s\nSG_NAT=%s\n' "$SG_ALB" "$SG_API" "$SG_RDS" "$SG_VALKEY" "$SG_CLAMAV" "$SG_OPS" "$SG_NAT" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-security-groups --group-ids "$SG_RDS" --query 'SecurityGroups[0].IpPermissions[].[FromPort,UserIdGroupPairs[].GroupId]' --output text` → `5432` com os IDs de `erp-sg-api` e `erp-sg-ops`, e nada de `0.0.0.0/0`.
**Desfazer:** `aws ec2 delete-security-group --group-id <id>`.

### 1.5 Saída para a internet das subnets privadas (NAT) — D-AWS-01
A API, o banco e o Valkey não têm endereço público. Quem precisa sair (a API para o GHCR/Asaas/e-mail, o CloudShell em VPC para o `npm`, depois o `freshclam` do ClamAV) sai por um NAT. **Duas opções; o estudo recomenda a instância.**

**Opção A (recomendada) · instância NAT `t4g.nano` (~US$ 8–12/mês com o IPv4).** Uma máquina pequena na subnet pública fazendo o repasse. Sem SSH aberto: a gestão é pelo Session Manager (papel IAM abaixo). Os comandos de dentro da máquina são os da documentação oficial de instância NAT da AWS (iptables + ip_forward), em `user-data`.
```bash
cat > ec2-trust.json <<'EOF'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "ec2.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }
EOF
aws iam create-role --role-name erp-nat-ssm --assume-role-policy-document file://ec2-trust.json --description "Instancia NAT: acesso pelo Session Manager" --query Role.Arn --output text
aws iam attach-role-policy --role-name erp-nat-ssm --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam create-instance-profile --instance-profile-name erp-nat-perfil
aws iam add-role-to-instance-profile --instance-profile-name erp-nat-perfil --role-name erp-nat-ssm
sleep 15   # o perfil leva alguns segundos para propagar

cat > nat-user-data.sh <<'EOF'
#!/bin/bash
# Documentacao oficial "NAT instances" (AL2023): iptables-services + ip_forward + MASQUERADE
yum install iptables-services -y
systemctl enable iptables
systemctl start iptables
echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/custom-ip-forwarding.conf
sysctl -p /etc/sysctl.d/custom-ip-forwarding.conf
IFACE=$(ip -o -4 route show to default | awk '{print $5}')
/sbin/iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
/sbin/iptables -F FORWARD
service iptables save
EOF
AMI_NAT=$(aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 --query 'Parameters[0].Value' --output text)
NAT_ID=$(aws ec2 run-instances --image-id "$AMI_NAT" --instance-type t4g.nano --subnet-id "$SUB_PUB_A" --security-group-ids "$SG_NAT" --associate-public-ip-address --iam-instance-profile Name=erp-nat-perfil --user-data file://nat-user-data.sh --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=erp-nat}]' --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids "$NAT_ID"
aws ec2 modify-instance-attribute --instance-id "$NAT_ID" --no-source-dest-check
NAT_ENI=$(aws ec2 describe-instances --instance-ids "$NAT_ID" --query 'Reservations[0].Instances[0].NetworkInterfaces[0].NetworkInterfaceId' --output text)
aws ec2 create-route --route-table-id "$RT_PRIV" --destination-cidr-block 0.0.0.0/0 --network-interface-id "$NAT_ENI"
# IP de saída FIXO: reserva um Elastic IP e o prende à instância (sem isto, o IP automático muda a cada parada e partida)
EIP_NAT=$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=erp-nat-eip}]' --query AllocationId --output text)
EIP_NAT_ASSOC=$(aws ec2 associate-address --instance-id "$NAT_ID" --allocation-id "$EIP_NAT" --query AssociationId --output text)
printf 'NAT_ID=%s\nNAT_ENI=%s\nEIP_NAT=%s\nEIP_NAT_ASSOC=%s\n' "$NAT_ID" "$NAT_ENI" "$EIP_NAT" "$EIP_NAT_ASSOC" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-instances --instance-ids "$NAT_ID" --query 'Reservations[0].Instances[0].[State.Name,SourceDestCheck,PublicIpAddress]' --output text` → `running False <ip>`; `aws ec2 describe-addresses --allocation-ids "$EIP_NAT" --query 'Addresses[0].[InstanceId,PublicIp]' --output text` → o `NAT_ID` e o **mesmo** `<ip>` da linha anterior (é esse IP que você passa a um parceiro que pedir o IP de origem); e `aws ec2 describe-route-tables --route-table-ids "$RT_PRIV" --query 'RouteTables[0].Routes[].[DestinationCidrBlock,NetworkInterfaceId,State]' --output table` → `0.0.0.0/0 eni-… active`. A prova final é do CloudShell em VPC (passo 2.1): `curl` a um site externo responde 200.
**Custo do Elastic IP:** US$ 0,005/h (US$ 3,65/mês), o mesmo IPv4 público já contado no custo da opção A: ao prender o Elastic IP, o IP automático da instância é devolvido, e a instância continua com **um** IPv4 público só. Um Elastic IP solto (sem instância) também é cobrado: não o deixe sobrando.
**Desfazer:** `aws ec2 disassociate-address --association-id "$EIP_NAT_ASSOC"` e `aws ec2 release-address --allocation-id "$EIP_NAT"` (o IP volta para a AWS e não se recupera); `aws ec2 delete-route --route-table-id "$RT_PRIV" --destination-cidr-block 0.0.0.0/0` (ou trocar a rota para o gateway, abaixo); `aws ec2 terminate-instances --instance-ids "$NAT_ID"`; o perfil: `aws iam remove-role-from-instance-profile --instance-profile-name erp-nat-perfil --role-name erp-nat-ssm`, `aws iam delete-instance-profile --instance-profile-name erp-nat-perfil`, `aws iam detach-role-policy --role-name erp-nat-ssm --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore` e `aws iam delete-role --role-name erp-nat-ssm`. **Risco assumido:** uma máquina só; se ela cair, a API perde a saída (não a entrada: o ALB continua). Se isso pesar, troque pelo gateway (opção B) a qualquer hora.

**Opção B · NAT gateway (~US$ 68/mês + US$ 0,093/GB).** Sem máquina para cuidar.
```bash
EIP_NAT=$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=erp-nat-eip}]' --query AllocationId --output text)
NATGW_ID=$(aws ec2 create-nat-gateway --subnet-id "$SUB_PUB_A" --allocation-id "$EIP_NAT" --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=erp-natgw}]' --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids "$NATGW_ID"
aws ec2 create-route --route-table-id "$RT_PRIV" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NATGW_ID"
```
**Conferência:** `aws ec2 describe-nat-gateways --nat-gateway-ids "$NATGW_ID" --query 'NatGateways[0].State' --output text` → `available`. **Desfazer:** `aws ec2 delete-nat-gateway --nat-gateway-id "$NATGW_ID"` e depois `aws ec2 release-address --allocation-id "$EIP_NAT"`. Para migrar de A para B depois: `aws ec2 replace-route --route-table-id "$RT_PRIV" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NATGW_ID"`.

### 1.6 Registro de imagens (ECR) — a imagem vem do GHCR
**Objetivo:** o ECS precisa puxar a imagem de um registro da AWS. A imagem **já validada pelo CI** está no GHCR; o ECR a espelha sob demanda (pull-through cache), sem `docker` no CloudShell e sem rebuild — é o mesmo princípio da "promoção por imagem" do `deploy-production.yml`.
```bash
umask 077; TMP=$(mktemp -d)
read -rs -p "Token do GitHub (read:packages): " GH_TOKEN; echo
jq -n --arg u "$GH_DONO" --arg t "$GH_TOKEN" '{username:$u, accessToken:$t}' > "$TMP/ghcr.json"; unset GH_TOKEN
GHCR_SECRET_ARN=$(aws secretsmanager create-secret --name ecr-pullthroughcache/github --description "Credencial do GHCR para o pull-through cache do ECR" --secret-string "file://$TMP/ghcr.json" --query ARN --output text)
shred -u "$TMP/ghcr.json"
aws ecr create-pull-through-cache-rule --ecr-repository-prefix github --upstream-registry-url ghcr.io --credential-arn "$GHCR_SECRET_ARN"
```
O nome do segredo **tem** de começar com `ecr-pullthroughcache/` (regra do ECR). O repositório `github/<GH_DONO>/erp-backend` nasce sozinho na primeira importação:
```bash
SHA="<sha de 40 caracteres de um commit da main já publicado pelo CI>"
aws ecr batch-get-image --repository-name "github/${GH_DONO}/erp-backend" --image-ids imageTag="$SHA" --query 'images[0].imageId.imageDigest' --output text
aws ecr put-lifecycle-policy --repository-name "github/${GH_DONO}/erp-backend" --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"guarda as 20 imagens mais recentes","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":20},"action":{"type":"expire"}}]}'
echo "GHCR_SECRET_ARN=$GHCR_SECRET_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws ecr validate-pull-through-cache-rule --ecr-repository-prefix github` → `"isValid": true`; `aws ecr describe-images --repository-name "github/${GH_DONO}/erp-backend" --image-ids imageTag="$SHA" --query 'imageDetails[0].[imageTags[0],imagePushedAt]' --output text` → a tag e a data.
**Alternativa sem pull-through** (se o `docker --version` responder no CloudShell da sua região — o Docker no CloudShell é limitado por região): `aws ecr create-repository --repository-name erp-backend --image-scanning-configuration scanOnPush=true --image-tag-mutability IMMUTABLE --encryption-configuration encryptionType=AES256 --query repository.repositoryUri --output text`, depois `aws ecr get-login-password --region "$REGIAO" | docker login --username AWS --password-stdin "${CONTA}.dkr.ecr.${REGIAO}.amazonaws.com"`, `docker pull ghcr.io/${GH_DONO}/erp-backend:${SHA}`, `docker tag …`, `docker push …`. O `get-login-password` existe nas duas versões da CLI (conferido na doc). **Custo:** US$ 0,10/GB-mês. **Desfazer:** `aws ecr delete-repository --repository-name <nome> --force` (apaga o repositório e as imagens); a regra do pull-through, `aws ecr delete-pull-through-cache-rule --ecr-repository-prefix github`; e a credencial do GHCR, `aws secretsmanager delete-secret --secret-id ecr-pullthroughcache/github --recovery-window-in-days 7`.

### 1.7 Segredos da API (Secrets Manager)
**Objetivo:** tudo que o `env.ts` exige em produção e é segredo nasce aqui, gerado no terminal, sem passar pelo histórico. Um segredo em JSON (`erp/prod/api`) com uma chave por variável; o ECS lê cada chave com `valueFrom` (fase 3). `DATABASE_URL` e `REDIS_URL` entram como `pendente` e são preenchidas na fase 2 (passo 2.10). `PORTAL_TENANT_ID` fica provisório até a fase 6 (D-AWS-06).
```bash
umask 077; TMP=$(mktemp -d)
gera() { openssl rand -base64 48 | tr -d '\n'; }
jq -n --arg jwt "$(gera)" --arg jwtr "$(gera)" --arg ps "$(gera)" --arg pas "$(gera)" --arg pl "$(gera)" --arg dom "$DOMINIO" \
  '{DATABASE_URL:"pendente", REDIS_URL:"pendente", JWT_SECRET:$jwt, JWT_REFRESH_SECRET:$jwtr,
    PORTAL_SESSION_SECRET:$ps, PORTAL_AUTHORITY_SESSION_SECRET:$pas, PORTAL_LOG_SECRET:$pl,
    PORTAL_TENANT_ID:"pendente-runbook-b", PORTAL_CORS_ORIGIN:("https://app." + $dom)}' > "$TMP/api.json"
SEGREDO_API_ARN=$(aws secretsmanager create-secret --name erp/prod/api --description "Segredos da API do ERP em producao" --secret-string "file://$TMP/api.json" --tags Key=app,Value=erp --query ARN --output text)
shred -u "$TMP/api.json"
echo "SEGREDO_API_ARN=$SEGREDO_API_ARN" >> ~/erp-ids.env
```
**Conferência (imprime só os nomes das chaves, nunca os valores):**
```bash
aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text | jq -r 'keys[]'
# DATABASE_URL JWT_REFRESH_SECRET JWT_SECRET PORTAL_AUTHORITY_SESSION_SECRET PORTAL_CORS_ORIGIN PORTAL_LOG_SECRET PORTAL_SESSION_SECRET PORTAL_TENANT_ID REDIS_URL
aws secretsmanager list-secrets --query 'SecretList[].Name' --output text          # ecr-pullthroughcache/github erp/prod/api
```
**Custo:** US$ 0,40/segredo/mês. **Desfazer:** `aws secretsmanager delete-secret --secret-id erp/prod/api --recovery-window-in-days 7`.

### 1.8 Papel do GitHub Actions (OIDC, sem chave de acesso)
**Objetivo:** o CD futuro (`B-INFRA-AWS-03`, que reescreve `deploy-production.yml` para a AWS) entra na conta com um token de curta duração do GitHub, nunca com chave guardada em secret. O papel nasce agora, restrito ao seu repositório.
```bash
aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 --query OpenIDConnectProviderArn --output text
cat > oidc-trust.json <<EOF
{ "Version": "2012-10-17", "Statement": [ {
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::${CONTA}:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:${GH_DONO}/${GH_REPO}:*" }
  } } ] }
EOF
aws iam create-role --role-name erp-github-deploy --assume-role-policy-document file://oidc-trust.json --description "GitHub Actions (OIDC): deploy do ERP" --query Role.Arn --output text
```
(A IAM valida o emissor do GitHub pela cadeia de certificados raiz; o `--thumbprint-list` é obrigatório na API, e esse é o valor historicamente publicado.) A política do papel (atualizar o serviço ECS, publicar o frontend no S3 e invalidar o CloudFront) entra no passo 4.8, quando o bucket e a distribuição existirem.
**Conferência:** `aws iam list-open-id-connect-providers --query 'OpenIDConnectProviderList[].Arn' --output text` → 1 ARN com `token.actions.githubusercontent.com`; `aws iam get-role --role-name erp-github-deploy --query 'Role.AssumeRolePolicyDocument.Statement[0].Condition' --output json` → o seu `repo:<GH_DONO>/<GH_REPO>:*`.
**Desfazer:** `aws iam delete-role-policy --role-name erp-github-deploy --policy-name erp-deploy` e então `aws iam delete-role --role-name erp-github-deploy`; o provedor OIDC, `aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${CONTA}:oidc-provider/token.actions.githubusercontent.com"`.

### 1.9 Grupo de logs
```bash
aws logs create-log-group --log-group-name /ecs/erp-api --tags app=erp
aws logs put-retention-policy --log-group-name /ecs/erp-api --retention-in-days 30
```
**Conferência:** `aws logs describe-log-groups --log-group-name-prefix /ecs/erp-api --query 'logGroups[0].[logGroupName,retentionInDays]' --output text` → `/ecs/erp-api 30`. **Custo:** ~US$ 1/mês (ingestão US$ 0,50/GB em sa-east-1 + 30 dias). **Desfazer:** `aws logs delete-log-group --log-group-name /ecs/erp-api`.

**Conferência da fase inteira:** `cat ~/erp-ids.env` tem VPC, 4 subnets, IGW, 2 tabelas de rota, 7 grupos de segurança, NAT, 2 segredos. **O que pode dar errado:** `batch-get-image` falhar com `UpstreamAccessDenied` (token do GitHub sem `read:packages`, ou pacote GHCR privado para outra conta); o perfil IAM da instância NAT ainda não propagado no `run-instances` (espere 15 s e repita); o `user-data` não rodar (a instância sobe mas não repassa: a conferência do passo 2.1 falha — veja o log em Session Manager, `/var/log/cloud-init-output.log`).

---

## 5. Fase 2 · Dados

**Pré-requisitos:** Fase 1. **Terminais:** CloudShell normal para a API da AWS; **CloudShell em VPC** para o `psql`, o `prisma` e os scripts. **Custo:** RDS `db.t4g.small` + 20 GB gp3 ~US$ 54 · Valkey `cache.t4g.micro` US$ 17,5 · segredo da senha mestra US$ 0,40 · drill de restore: horas de um `db.t4g.small` enquanto durar (~US$ 0,07/h).

```bash
# Variáveis da fase (além do bloco do §0 e do ~/erp-ids.env):
set -a; . ~/erp-ids.env; set +a
export DB_ID=erp-prod-pg DB_NOME=erp DB_ADMIN=erp_admin
```

### 2.1 Abrir o CloudShell em VPC — ato do dono, na própria tela do CloudShell
No painel do CloudShell: ícone **`+`** → **Create VPC environment** → nome `erp-ops` → VPC `erp-prod` → subnet `erp-priv-a` → grupo de segurança `erp-sg-ops` → **Create**. (A documentação confirma: até 2 ambientes por usuário; sem armazenamento persistente; internet só porque a subnet privada sai pelo NAT.)
**Conferência (dentro do ambiente em VPC):**
```bash
echo "$CLOUDSHELL_PRIVATE_IPV4"                                            # 10.40.10.x
curl -sS -m 10 -o /dev/null -w '%{http_code}\n' https://aws.amazon.com/     # 200  → o NAT da fase 1 funciona
aws sts get-caller-identity --query Account --output text                   # <CONTA>
psql --version; node --version; df -h ~ | tail -1; free -m | head -2        # psql 16+, node 20+, espaço e memória
```
O `~/erp-ids.env` **não existe aqui** (ambiente efêmero): copie o conteúdo do CloudShell normal e cole `cat > ~/erp-ids.env <<'EOF' … EOF` a cada sessão em VPC.
**Desfazer:** na mesma tela do CloudShell, escolha o ambiente `erp-ops` e apague-o (ato do dono; ele não guarda nada, então nada se perde).

### 2.2 Grupo de subnets e grupo de parâmetros (fuso UTC, TLS obrigatório)
**Objetivo:** o banco nasce nas duas subnets privadas e com a sessão em `UTC` (a trava `G-DB-TZ` do app recusa subir fora de UTC) e TLS obrigatório.
```bash
aws rds create-db-subnet-group --db-subnet-group-name erp-db-subnets --db-subnet-group-description "ERP: subnets privadas" --subnet-ids "$SUB_PRIV_A" "$SUB_PRIV_B" --tags Key=app,Value=erp
aws rds create-db-parameter-group --db-parameter-group-name erp-pg16 --db-parameter-group-family postgres16 --description "ERP: timezone UTC e TLS obrigatorio"
aws rds modify-db-parameter-group --db-parameter-group-name erp-pg16 --parameters "ParameterName=timezone,ParameterValue=UTC,ApplyMethod=immediate" "ParameterName=rds.force_ssl,ParameterValue=1,ApplyMethod=immediate"
```
**Conferência:** `aws rds describe-db-parameters --db-parameter-group-name erp-pg16 --query "Parameters[?ParameterName=='timezone'||ParameterName=='rds.force_ssl'].[ParameterName,ParameterValue]" --output text` → `rds.force_ssl 1` e `timezone UTC`.
**Custo:** 0. **Desfazer** (só depois de apagar o banco, 2.3, porque os dois estão em uso por ele): `aws rds delete-db-parameter-group --db-parameter-group-name erp-pg16` e `aws rds delete-db-subnet-group --db-subnet-group-name erp-db-subnets`.

### 2.3 O banco (RDS PostgreSQL 16, `db.t4g.small`, PITR)
**Objetivo:** PostgreSQL 16 gerenciado, 20 GB gp3, backup automático de 7 dias (que é o PITR), criptografado, sem acesso público, com proteção contra exclusão. A senha mestra **nasce no Secrets Manager** (`--manage-master-user-password`): ninguém a digita.
```bash
PG_VERSAO=$(aws rds describe-db-engine-versions --engine postgres --engine-version 16 --query 'DBEngineVersions[-1].EngineVersion' --output text)
aws rds create-db-instance --db-instance-identifier "$DB_ID" --db-instance-class db.t4g.small --engine postgres --engine-version "$PG_VERSAO" \
  --master-username "$DB_ADMIN" --manage-master-user-password --db-name "$DB_NOME" \
  --allocated-storage 20 --storage-type gp3 --storage-encrypted \
  --db-subnet-group-name erp-db-subnets --vpc-security-group-ids "$SG_RDS" --db-parameter-group-name erp-pg16 \
  --backup-retention-period 7 --preferred-backup-window 05:00-06:00 --copy-tags-to-snapshot \
  --no-publicly-accessible --no-multi-az --deletion-protection --auto-minor-version-upgrade \
  --enable-cloudwatch-logs-exports postgresql --ca-certificate-identifier rds-ca-rsa2048-g1 \
  --tags Key=app,Value=erp --query 'DBInstance.DBInstanceStatus' --output text
aws rds wait db-instance-available --db-instance-identifier "$DB_ID"      # 10–15 min
RDS_HOST=$(aws rds describe-db-instances --db-instance-identifier "$DB_ID" --query 'DBInstances[0].Endpoint.Address' --output text)
RDS_SECRET_ARN=$(aws rds describe-db-instances --db-instance-identifier "$DB_ID" --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
printf 'RDS_HOST=%s\nRDS_SECRET_ARN=%s\n' "$RDS_HOST" "$RDS_SECRET_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws rds describe-db-instances --db-instance-identifier "$DB_ID" --query 'DBInstances[0].[DBInstanceStatus,EngineVersion,PubliclyAccessible,DeletionProtection,BackupRetentionPeriod,StorageEncrypted]' --output text` → `available 16.x False True 7 True`.
**Custo:** ~US$ 54/mês. **Desfazer:** `aws rds modify-db-instance --db-instance-identifier "$DB_ID" --no-deletion-protection --apply-immediately` e depois `aws rds delete-db-instance --db-instance-identifier "$DB_ID" --skip-final-snapshot --delete-automated-backups` (**apaga tudo**; em produção, nunca sem snapshot manual, passo 6.4).

### 2.4 Conectar como administrador (CloudShell em VPC)
**Objetivo:** provar que o banco responde e que a sessão está em UTC, antes de qualquer migração. A senha mestra vem do Secrets Manager para uma variável, nunca para o histórico.
```bash
export PGHOST="$RDS_HOST" PGPORT=5432 PGUSER="$DB_ADMIN" PGDATABASE="$DB_NOME" PGSSLMODE=require
export PGPASSWORD="$(aws secretsmanager get-secret-value --secret-id "$RDS_SECRET_ARN" --query SecretString --output text | jq -r .password)"
psql -Atc "select version()"
psql -Atc "show timezone"        # UTC   (docs/deployment.md: fora de UTC, PARE e leve ao dono)
```
**Conferência:** as duas linhas acima são a conferência: `PostgreSQL 16.x …` e `UTC`. **Desfazer:** não se aplica (só leitura); ao sair, `unset PGPASSWORD`.

### 2.5 O repositório no CloudShell em VPC
As migrações e os scripts vivem no repositório; o `prisma` e o `tsx` são dependências de desenvolvimento, e a imagem de runtime **não os carrega** (o `Dockerfile` copia só `dist/`, `prisma/` e as dependências de produção; nem o `prisma.config.ts` vai para o runtime). Por isso a migração roda **daqui**, e não como tarefa ECS com a imagem da API (pendência P-AWS-MIGRADOR, §10).
```bash
git clone --depth 1 --branch main "https://github.com/${GH_DONO}/${GH_REPO}.git" ~/erp
cd ~/erp && git rev-parse HEAD        # anote: é o SHA que você vai implantar na fase 3
npm ci                                # ~420 MB em node_modules; confira antes o df -h ~ do passo 2.1
```
Se o disco não der (o ambiente em VPC é efêmero e pequeno): rode só a migração com `npx --yes prisma@7 migrate deploy` (baixa só a CLI) e deixe o provisionamento de RBAC para o CloudShell normal **não** alcança o banco — nesse caso a saída é a pendência P-AWS-MIGRADOR (uma imagem "migradora" com `prisma` e `tsx`, rodada por `aws ecs run-task`). Declare o que fez.
**Desfazer:** não se aplica: o ambiente em VPC apaga o clone e o `node_modules` sozinho quando expira.

### 2.6 Migrações (forward-only)
```bash
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/${PGDATABASE}?schema=public&sslmode=require"
npx prisma migrate deploy
```
**Conferência:** `npx prisma migrate status` → `Database schema is up to date!`; `psql -Atc "select count(*) from _prisma_migrations where finished_at is not null"` → o número de migrações do repositório (116+). Antes da migração `20260873000000` com dado legado, veja o censo de duplicatas em `docs/deployment.md`; num banco novo não se aplica.
**Desfazer:** migração **não volta** (são só aditivas, `docs/deployment.md`); erro se corrige com uma migração nova, para frente. Num banco recém-criado e ainda sem dado, o desfazer é apagar o banco e recomeçar no 2.3.

### 2.7 Provisionamento de RBAC (papéis e permissões, sem dado de demonstração)
```bash
npm run db:provision-rbac -- --dry-run      # só relata
npm run db:provision-rbac                   # aplica (aditivo, idempotente)
```
**Conferência:** `psql -Atc "select count(*) from roles where key='super_admin' and tenant_id is null"` → `1` (pré-condição do Runbook B).
**Desfazer:** não se desfaz por comando: o provisionamento é aditivo e idempotente (rodar de novo não duplica nada).

### 2.8 Papel de runtime sem superusuário e sem bypass de RLS — item 9 do portão
**Objetivo:** a API **nunca** conecta como `erp_admin`. O script do repositório cria `erp_runtime` (`LOGIN NOSUPERUSER NOBYPASSRLS NOREPLICATION`, só DML) e termina com a mesma propriedade que a trava de boot `G-DB-ROLE` avalia. A senha entra pelo stdin do `psql \password` sob `setsid` (presente no AL2023), nunca em argumento.
```bash
umask 077; TMP=$(mktemp -d)
openssl rand -base64 48 | tr -d '\n' > "$TMP/runtime.pw"
DB_RUNTIME_ROLE=erp_runtime DB_RUNTIME_PASSWORD="$(cat "$TMP/runtime.pw")" bash scripts/db-runtime-role.sh
```
**Saída esperada (uma linha):** `erp_runtime|f|f|f|f|0|0|<n>` (sem superusuário, sem bypass, sem replicação, não escapa, 0 posses, 0 views, `<n>` tabelas com DML). Qualquer `MODO 1–6` na saída: pare e siga a tabela de `docs/deployment.md` ("Papel de banco de runtime").
**Conferência:** `psql -Atc "select rolname, rolsuper, rolbypassrls, rolreplication from pg_roles where rolname='erp_runtime'"` → `erp_runtime|f|f|f`.
**Desfazer** (só com a API parada, porque ela conecta com este papel; 3.8 com `--desired-count 0`): `psql -v ON_ERROR_STOP=1 -c 'DROP OWNED BY erp_runtime' -c 'DROP ROLE erp_runtime'` (o `DROP OWNED` tira as permissões que o papel recebeu, e só então o `DROP ROLE` passa). Para só trocar a senha, rode o script de novo: ele converge.

### 2.9 Valkey (ElastiCache, `cache.t4g.micro`)
**Objetivo:** a fila de jobs e o sinal de vida do worker. Um nó, rede privada, só a API e o CloudShell em VPC alcançam a porta 6379. Sem TLS em trânsito por enquanto (D-AWS-05).
```bash
aws elasticache create-cache-subnet-group --cache-subnet-group-name erp-cache-subnets --cache-subnet-group-description "ERP: subnets privadas" --subnet-ids "$SUB_PRIV_A" "$SUB_PRIV_B"
VALKEY_VERSAO=$(aws elasticache describe-cache-engine-versions --engine valkey --query 'CacheEngineVersions[-1].EngineVersion' --output text)
aws elasticache create-cache-cluster --cache-cluster-id erp-prod-valkey --engine valkey --engine-version "$VALKEY_VERSAO" --cache-node-type cache.t4g.micro --num-cache-nodes 1 --cache-subnet-group-name erp-cache-subnets --security-group-ids "$SG_VALKEY" --tags Key=app,Value=erp --query 'CacheCluster.CacheClusterStatus' --output text
aws elasticache wait cache-cluster-available --cache-cluster-id erp-prod-valkey
VALKEY_HOST=$(aws elasticache describe-cache-clusters --cache-cluster-id erp-prod-valkey --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
echo "VALKEY_HOST=$VALKEY_HOST" >> ~/erp-ids.env
```
**Conferência (CloudShell em VPC, só com o bash):** `exec 3<>"/dev/tcp/${VALKEY_HOST}/6379"; printf 'PING\r\n' >&3; head -c 7 <&3; exec 3>&-` → `+PONG`.
**Custo:** US$ 17,5/mês. **Desfazer:** `aws elasticache delete-cache-cluster --cache-cluster-id erp-prod-valkey` e, depois que ele sumir, `aws elasticache delete-cache-subnet-group --cache-subnet-group-name erp-cache-subnets`.

### 2.10 Preencher `DATABASE_URL` e `REDIS_URL` no segredo da API
**Objetivo:** a API conecta como `erp_runtime` (não como `erp_admin`) e com TLS; o `REDIS_URL` aponta para o Valkey (fora de localhost, como o portão G5 exige). Lê o segredo, troca duas chaves com `jq`, grava de volta; nada no histórico.
```bash
umask 077; TMP=$(mktemp -d)
aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text \
 | jq --arg db "postgresql://erp_runtime:$(cat "$TMP/runtime.pw" 2>/dev/null || cat ~/runtime.pw)@${RDS_HOST}:5432/${DB_NOME}?schema=public&sslmode=require" \
      --arg redis "redis://${VALKEY_HOST}:6379" '.DATABASE_URL=$db | .REDIS_URL=$redis' > "$TMP/api.json"
aws secretsmanager put-secret-value --secret-id erp/prod/api --secret-string "file://$TMP/api.json"
shred -u "$TMP/api.json" "$TMP/runtime.pw"
```
(Se o `runtime.pw` do passo 2.8 já foi destruído, gere outra senha e rode o `db-runtime-role.sh` de novo: ele converge e troca a senha.) **Não** use `options=-c role=…` na URL (a trava julga o login); o `-c TimeZone=UTC` o app põe sozinho.
**Conferência:** `aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text | jq -r '.DATABASE_URL | sub("://[^@]*@"; "://<credencial>@")'` → `postgresql://<credencial>@<host>:5432/erp?schema=public&sslmode=require` (a credencial é mascarada pela própria conferência).
**Desfazer:** o Secrets Manager guarda a versão anterior com o rótulo `AWSPREVIOUS`; para voltar a ela: `umask 077; TMP=$(mktemp -d); aws secretsmanager get-secret-value --secret-id erp/prod/api --version-stage AWSPREVIOUS --query SecretString --output text > "$TMP/api.json"; aws secretsmanager put-secret-value --secret-id erp/prod/api --secret-string "file://$TMP/api.json"; shred -u "$TMP/api.json"`.

### 2.11 Drill de restore cronometrado (R1/R2 do go-live)
**Objetivo:** provar, antes de ter dado real, que o PITR restaura e em quanto tempo. Os dois números que saem daqui: o **RTO** (quanto tempo o sistema leva para voltar depois de um desastre) e o **RPO** (quanto dado se perde, em minutos: a distância entre o último ponto restaurável e agora). Restaura o ponto mais recente para um banco novo, mede, confere e apaga.
```bash
aws rds describe-db-instances --db-instance-identifier "$DB_ID" --query 'DBInstances[0].LatestRestorableTime' --output text   # RPO: deve estar a poucos minutos de agora (date -u)
INICIO=$(date +%s)
aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier "$DB_ID" --target-db-instance-identifier erp-prod-drill --use-latest-restorable-time --db-instance-class db.t4g.small --db-subnet-group-name erp-db-subnets --vpc-security-group-ids "$SG_RDS" --db-parameter-group-name erp-pg16 --no-publicly-accessible --query 'DBInstance.DBInstanceStatus' --output text
aws rds wait db-instance-available --db-instance-identifier erp-prod-drill
FIM=$(date +%s); echo "RTO do restore: $((FIM-INICIO)) s"
DRILL_HOST=$(aws rds describe-db-instances --db-instance-identifier erp-prod-drill --query 'DBInstances[0].Endpoint.Address' --output text)
# CloudShell em VPC: a mesma senha mestra vale no clone
PGHOST="$DRILL_HOST" psql -Atc "select count(*) from roles" ; psql -Atc "select count(*) from roles"      # os dois números iguais
aws rds delete-db-instance --db-instance-identifier erp-prod-drill --skip-final-snapshot --delete-automated-backups
aws rds wait db-instance-deleted --db-instance-identifier erp-prod-drill
```
Anote o RTO medido e o RPO (`LatestRestorableTime` − agora) na ata de go-live (é a evidência que a trava (c) do CD pede). Repita o drill com dado real antes do go-live (fase 6).
**Desfazer:** o próprio passo apaga o clone (as duas últimas linhas). Se a sessão cair no meio, rode só essas duas linhas: o clone esquecido custa como um segundo banco.
**Custo:** só as horas do clone. **O que pode dar errado:** `--use-latest-restorable-time` recusar porque o banco tem menos de ~5 min de vida (espere); o drill ficar de pé esquecido (US$ 54/mês — a conferência da fase é `describe-db-instances` sem `erp-prod-drill`).

**Conferência da fase inteira:** `aws rds describe-db-instances --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceStatus]' --output text` → só `erp-prod-pg available`; `aws elasticache describe-cache-clusters --cache-cluster-id erp-prod-valkey --query 'CacheClusters[0].CacheClusterStatus' --output text` → `available`; a linha `erp_runtime|f|f|f|f|0|0|<n>` guardada; `jq -r 'keys[]'` do segredo sem `pendente` em `DATABASE_URL`/`REDIS_URL`. **Itens do portão:** o 9 fica *criado* aqui e *fechado* quando a trava passar no boot (3.8); o 10 é conferido na 6.3.

---

## 6. Fase 3 · API

**Pré-requisitos:** Fases 1 e 2; o SHA anotado no 2.5 já importado no ECR (1.6). **Terminal:** CloudShell normal. **Custo:** Fargate x86 0,5 vCPU/1 GB ≈ US$ 31 (ARM: 24,8, D-AWS-08) · ALB ~US$ 33 · 2 IPv4 públicos do ALB US$ 7,3 · certificado ACM grátis.

```bash
set -a; . ~/erp-ids.env; set +a
export SHA="<o SHA do 2.5>"
export IMAGEM="${CONTA}.dkr.ecr.${REGIAO}.amazonaws.com/github/${GH_DONO}/erp-backend:${SHA}"
```

### 3.1 Cluster ECS
```bash
aws ecs create-cluster --cluster-name erp-prod --tags key=app,value=erp --query 'cluster.status' --output text   # ACTIVE
```
**Conferência:** `aws ecs describe-clusters --clusters erp-prod --query 'clusters[0].status' --output text` → `ACTIVE`. **Desfazer:** `aws ecs delete-cluster --cluster erp-prod`.

### 3.2 Papéis IAM da tarefa
**Objetivo:** dois papéis. O de **execução** é do agente (puxar a imagem, inclusive importar do GHCR pelo pull-through, ler o segredo, escrever logs). O de **tarefa** é do código (fase 6: S3 de anexos).
```bash
cat > ecs-trust.json <<'EOF'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "ecs-tasks.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }
EOF
EXEC_ROLE_ARN=$(aws iam create-role --role-name erp-ecs-execucao --assume-role-policy-document file://ecs-trust.json --description "ECS: puxar imagem, ler segredos, logs" --query Role.Arn --output text)
aws iam attach-role-policy --role-name erp-ecs-execucao --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
cat > exec-inline.json <<EOF
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "${SEGREDO_API_ARN}" },
  { "Effect": "Allow", "Action": ["ecr:BatchImportUpstreamImage", "ecr:CreateRepository"], "Resource": "*" } ] }
EOF
aws iam put-role-policy --role-name erp-ecs-execucao --policy-name erp-segredos-e-cache --policy-document file://exec-inline.json
TASK_ROLE_ARN=$(aws iam create-role --role-name erp-api-tarefa --assume-role-policy-document file://ecs-trust.json --description "API: permissoes do codigo (S3 de anexos)" --query Role.Arn --output text)
printf 'EXEC_ROLE_ARN=%s\nTASK_ROLE_ARN=%s\n' "$EXEC_ROLE_ARN" "$TASK_ROLE_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws iam list-attached-role-policies --role-name erp-ecs-execucao --query 'AttachedPolicies[].PolicyName' --output text` → `AmazonECSTaskExecutionRolePolicy`.
**Custo:** 0. **Desfazer** (só depois de apagar o serviço, 3.8): `aws iam delete-role-policy --role-name erp-ecs-execucao --policy-name erp-segredos-e-cache`, `aws iam detach-role-policy --role-name erp-ecs-execucao --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy` e `aws iam delete-role --role-name erp-ecs-execucao`; para o papel da tarefa, `aws iam delete-role-policy --role-name erp-api-tarefa --policy-name erp-anexos-s3` (se o 6.1 já rodou) e `aws iam delete-role --role-name erp-api-tarefa`.

### 3.3 Certificado da API (ACM em `sa-east-1`) e a zona DNS, antecipada
**Objetivo:** HTTPS no ALB exige um certificado **validado**, e a validação é um registro CNAME na sua zona. Então a zona do Route 53 nasce **aqui** (é o passo 5.1 antecipado) e os NS vão para o registrador agora (5.2). A explicação completa do DNS está na fase 5.
```bash
CERT_API_ARN=$(aws acm request-certificate --domain-name "api.${DOMINIO}" --validation-method DNS --key-algorithm RSA_2048 --tags Key=app,Value=erp --query CertificateArn --output text)
ZONA_ID=$(aws route53 create-hosted-zone --name "$DOMINIO" --caller-reference "erp-$(date +%s)" --hosted-zone-config Comment="ERP: zona publica" --query 'HostedZone.Id' --output text)
ZONA_ID=${ZONA_ID#/hostedzone/}
aws route53 get-hosted-zone --id "$ZONA_ID" --query 'DelegationSet.NameServers' --output text    # os 4 servidores: cadastre-os no registrador (5.2)
sleep 20   # o ACM leva alguns segundos para publicar o CNAME de validação
read -r ACM_CNAME_NOME ACM_CNAME_VALOR <<< "$(aws acm describe-certificate --certificate-arn "$CERT_API_ARN" --query 'Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]' --output text)"
cat > rr-acm.json <<EOF
{ "Comment": "validacao ACM por CNAME", "Changes": [ { "Action": "UPSERT", "ResourceRecordSet": {
  "Name": "${ACM_CNAME_NOME}", "Type": "CNAME", "TTL": 300, "ResourceRecords": [ { "Value": "${ACM_CNAME_VALOR}" } ] } } ] }
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-acm.json --query 'ChangeInfo.Status' --output text
printf 'CERT_API_ARN=%s\nZONA_ID=%s\n' "$CERT_API_ARN" "$ZONA_ID" >> ~/erp-ids.env
```
**Agora, só no painel do registrador (ato do dono):** troque os servidores DNS do domínio pelos 4 que o `get-hosted-zone` imprimiu (ver 5.2). O ACM só valida depois que o mundo enxergar a sua zona:
```bash
aws acm wait certificate-validated --certificate-arn "$CERT_API_ARN"     # espera até validar (minutos a horas, conforme o registrador)
```
**Conferência:** `aws acm describe-certificate --certificate-arn "$CERT_API_ARN" --query 'Certificate.Status' --output text` → `ISSUED`. **Custo:** certificado grátis; zona US$ 0,50/mês.
**Desfazer** (só depois de apagar o listener 443, 3.4, que usa o certificado): `aws acm delete-certificate --certificate-arn "$CERT_API_ARN"`; o CNAME de validação sai com o mesmo arquivo trocando a ação, `sed 's/"UPSERT"/"DELETE"/' rr-acm.json > rr-acm-del.json` e `aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-acm-del.json` (o `DELETE` precisa do registro idêntico ao criado, e o arquivo garante isso). A zona só se apaga vazia (sobrando só os registros `NS` e `SOA` dela): `aws route53 delete-hosted-zone --id "$ZONA_ID"`, e o registrador volta a apontar para os servidores antigos (5.2). Apagar a zona tira o sistema do ar pelo nome.

### 3.4 Balanceador (ALB), grupo de destino e os dois listeners
**Objetivo:** a porta de entrada pública da API. 443 com o certificado; 80 só devolve `301` para HTTPS (é o `force_https` que a Fly fazia, agora como regra do listener). O health check é o `/api/v1/health/ready` do `Dockerfile`.
```bash
ALB_ARN=$(aws elbv2 create-load-balancer --name erp-alb --subnets "$SUB_PUB_A" "$SUB_PUB_B" --security-groups "$SG_ALB" --scheme internet-facing --type application --ip-address-type ipv4 --tags Key=app,Value=erp --query 'LoadBalancers[0].LoadBalancerArn' --output text)
aws elbv2 modify-load-balancer-attributes --load-balancer-arn "$ALB_ARN" --attributes Key=routing.http.drop_invalid_header_fields.enabled,Value=true
TG_ARN=$(aws elbv2 create-target-group --name erp-api-tg --protocol HTTP --port 3000 --vpc-id "$VPC_ID" --target-type ip --health-check-path /api/v1/health/ready --health-check-interval-seconds 30 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --matcher HttpCode=200 --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" --protocol HTTPS --port 443 --certificates CertificateArn="$CERT_API_ARN" --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 --default-actions Type=forward,TargetGroupArn="$TG_ARN" --query 'Listeners[0].ListenerArn' --output text
aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" --protocol HTTP --port 80 --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' --query 'Listeners[0].ListenerArn' --output text
read -r ALB_DNS ALB_ZONA_ID <<< "$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --query 'LoadBalancers[0].[DNSName,CanonicalHostedZoneId]' --output text)"
printf 'ALB_ARN=%s\nTG_ARN=%s\nALB_DNS=%s\nALB_ZONA_ID=%s\n' "$ALB_ARN" "$TG_ARN" "$ALB_DNS" "$ALB_ZONA_ID" >> ~/erp-ids.env
```
**Conferência:** `aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[].[Port,Protocol,DefaultActions[0].Type]' --output text` → `443 HTTPS forward` e `80 HTTP redirect`.
**Custo:** US$ 0,034/h + LCU (unidade de capacidade do balanceador, cobrada pelo volume de conexões e de tráfego) ≈ US$ 33/mês + 2 IPv4. **Desfazer:** `aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN"`; `aws elbv2 delete-target-group --target-group-arn "$TG_ARN"`.

### 3.5 O registro `api.<DOMINIO>` (passo 5.4 antecipado)
Sem ele o smoke do 3.9 não tem como chamar `https://api.<DOMINIO>`.
```bash
cat > rr-api.json <<EOF
{ "Comment": "api -> ALB (alias)", "Changes": [ { "Action": "UPSERT", "ResourceRecordSet": {
  "Name": "api.${DOMINIO}.", "Type": "A",
  "AliasTarget": { "HostedZoneId": "${ALB_ZONA_ID}", "DNSName": "${ALB_DNS}", "EvaluateTargetHealth": true } } } ] }
EOF
MUDANCA=$(aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-api.json --query 'ChangeInfo.Id' --output text)
aws route53 wait resource-record-sets-changed --id "$MUDANCA"
```
**Conferência:** `aws route53 test-dns-answer --hosted-zone-id "$ZONA_ID" --record-name "api.${DOMINIO}" --record-type A` → `ResponseCode: NOERROR` e os IPs do ALB.
**Custo:** 0 (consulta a alias de ALB é grátis). **Desfazer:** `sed 's/"UPSERT"/"DELETE"/' rr-api.json > rr-api-del.json` e `aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-api-del.json`.

### 3.6 Task definition
**Objetivo:** a receita da tarefa: imagem do ECR, 0,5 vCPU / 1 GB, porta 3000, variáveis não secretas no claro e os segredos por `valueFrom` (uma chave do JSON `erp/prod/api` por variável). **Arquitetura x86**: o job `docker` do `ci.yml` não declara `platforms`, logo a imagem do GHCR é só `amd64`; ARM64 (24,8 em vez de 31 US$/mês) exige o CI publicar `linux/arm64` (P-AWS-IMAGEM-ARM64). Os gates do `env.ts` estão todos atendidos: `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL`, `JOBS_WORKER_ENABLED=true`, `REDIS_URL` fora de localhost, `DATABASE_RUNTIME_ROLE_GUARD=enforce`, `CORS_ORIGIN` https sem curinga, os 5 `PORTAL_*`, `EVIDENCE_SCANNER=unavailable` (até a Fase 3b ligar o antivírus: até lá, todo upload responde 503, item 27).
```bash
cat > taskdef.json <<EOF
{
  "family": "erp-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": { "cpuArchitecture": "X86_64", "operatingSystemFamily": "LINUX" },
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "containerDefinitions": [ {
    "name": "api",
    "image": "${IMAGEM}",
    "essential": true,
    "portMappings": [ { "containerPort": 3000, "protocol": "tcp" } ],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "3000" },
      { "name": "LOG_LEVEL", "value": "info" },
      { "name": "CORE_SAAS_PERSISTENCE", "value": "prisma" },
      { "name": "JOBS_WORKER_ENABLED", "value": "true" },
      { "name": "DATABASE_RUNTIME_ROLE_GUARD", "value": "enforce" },
      { "name": "CORS_ORIGIN", "value": "https://app.${DOMINIO}" },
      { "name": "EVIDENCE_SCANNER", "value": "unavailable" },
      { "name": "GEOCODING_ENABLED", "value": "false" },
      { "name": "CHECKLIST_STORAGE_PROVIDER", "value": "local" }
    ],
    "secrets": [
      { "name": "DATABASE_URL",                    "valueFrom": "${SEGREDO_API_ARN}:DATABASE_URL::" },
      { "name": "REDIS_URL",                       "valueFrom": "${SEGREDO_API_ARN}:REDIS_URL::" },
      { "name": "JWT_SECRET",                      "valueFrom": "${SEGREDO_API_ARN}:JWT_SECRET::" },
      { "name": "JWT_REFRESH_SECRET",              "valueFrom": "${SEGREDO_API_ARN}:JWT_REFRESH_SECRET::" },
      { "name": "PORTAL_SESSION_SECRET",           "valueFrom": "${SEGREDO_API_ARN}:PORTAL_SESSION_SECRET::" },
      { "name": "PORTAL_AUTHORITY_SESSION_SECRET", "valueFrom": "${SEGREDO_API_ARN}:PORTAL_AUTHORITY_SESSION_SECRET::" },
      { "name": "PORTAL_LOG_SECRET",               "valueFrom": "${SEGREDO_API_ARN}:PORTAL_LOG_SECRET::" },
      { "name": "PORTAL_TENANT_ID",                "valueFrom": "${SEGREDO_API_ARN}:PORTAL_TENANT_ID::" },
      { "name": "PORTAL_CORS_ORIGIN",              "valueFrom": "${SEGREDO_API_ARN}:PORTAL_CORS_ORIGIN::" }
    ],
    "logConfiguration": { "logDriver": "awslogs", "options": { "awslogs-group": "/ecs/erp-api", "awslogs-region": "${REGIAO}", "awslogs-stream-prefix": "api" } },
    "healthCheck": {
      "command": ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 60
    }
  } ]
}
EOF
TASKDEF_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "TASKDEF_ARN=$TASKDEF_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws ecs describe-task-definition --task-definition erp-api --query 'taskDefinition.[revision,cpu,memory,runtimePlatform.cpuArchitecture,containerDefinitions[0].image]' --output text` → `1 512 1024 X86_64 <imagem>`.
**Custo:** 0 (a receita não custa; custa a tarefa rodando, 3.8). **Desfazer:** `aws ecs deregister-task-definition --task-definition erp-api:<revisão>` (a revisão fica inativa: nenhum serviço novo a usa, e o rollback do 3.10 não pode mais apontar para ela).

### 3.7 A migração vem ANTES do serviço
Já feita na fase 2 (2.6 e 2.7) a partir do CloudShell em VPC, **no mesmo SHA** da imagem. Em todo deploy futuro a ordem é a mesma do `deploy-production.yml`: `git pull` no CloudShell em VPC → `npx prisma migrate deploy` → `npm run db:provision-rbac` → só então o `update-service` (3.10). A tarefa ECS one-off (`aws ecs run-task`) **não serve** para isso com a imagem atual (sem `prisma` nem `prisma.config.ts` no runtime) — pendência P-AWS-MIGRADOR.
**Conferência:** a do 2.6 (`npx prisma migrate status` → `Database schema is up to date!`), no mesmo SHA da imagem. **Desfazer:** não se aplica (migração só vai para frente, 2.6).

### 3.8 O serviço (1 tarefa) e a trava do papel de runtime — item 9 do portão
```bash
aws ecs create-service --cluster erp-prod --service-name erp-api --task-definition "$TASKDEF_ARN" --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUB_PRIV_A},${SUB_PRIV_B}],securityGroups=[${SG_API}],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=api,containerPort=3000" \
  --health-check-grace-period-seconds 90 --enable-execute-command --tags key=app,value=erp --query 'service.status' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api      # até ~10 min
```
**Conferência (a trava do item 9):**
```bash
aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --query 'TargetHealthDescriptions[].TargetHealth.State' --output text     # healthy
aws logs filter-log-events --log-group-name /ecs/erp-api --filter-pattern '"runtime database role verified"' --start-time $(( ($(date +%s) - 900) * 1000 )) --query 'events[].message' --output text
#   → uma linha com "runtime database role verified" e "escapes":0   (é a evidência que fecha P-INFRA-RLS, item 9)
aws logs tail /ecs/erp-api --since 15m --format short      # (só na CLI v2 do CloudShell; conferido na doc) a leitura corrida do boot
```
Se o serviço não estabilizar: `aws ecs describe-services --cluster erp-prod --services erp-api --query 'services[0].events[0:5].message' --output text` e os logs. `RUNTIME_ROLE_CAN_BYPASS_RLS` no log = a URL do segredo está como `erp_admin` ou o papel escapa (volte ao 2.8/2.10); `Failed to start` nomeando uma variável = gate do `env.ts` (confira o taskdef).
**Desfazer:** `aws ecs update-service --cluster erp-prod --service erp-api --desired-count 0` e `aws ecs delete-service --cluster erp-prod --service erp-api --force`.

### 3.9 Smoke pela internet
```bash
curl -sS "https://api.${DOMINIO}/api/v1/health/ready"                                   # {"status":"ready", … checks pg/redis/worker}
curl -sS "https://api.${DOMINIO}/api/v1/health/worker"                                  # "status":"up"  (lido no corpo; "starting" nos primeiros ~90 s)
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://api.${DOMINIO}/api/v1/health"   # 301 https://api.<DOMINIO>/api/v1/health
```
(O `GET /api/v1/platform/cloud-usage/summary` sob o papel sem bypass — item 10 — exige login de administrador de plataforma: fica para a 6.3.)
**Conferência:** as três saídas acima são a conferência. **Desfazer:** não se aplica (só leitura).

### 3.10 Deploy de uma imagem nova e rollback (o que o CD fará depois)
```bash
# nova revisão: edite IMAGEM no taskdef.json com o SHA novo, registre, e aponte o serviço
aws ecs register-task-definition --cli-input-json file://taskdef.json --query 'taskDefinition.revision' --output text
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
# rollback = apontar para a revisão anterior (N-1)
aws ecs list-task-definitions --family-prefix erp-api --sort DESC --query 'taskDefinitionArns[0:3]' --output text
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api:<N-1> --query 'service.taskDefinition' --output text
```
Reler segredos trocados sem imagem nova: `aws ecs update-service --cluster erp-prod --service erp-api --force-new-deployment`.
**Conferência:** `aws ecs describe-services --cluster erp-prod --services erp-api --query 'services[0].[taskDefinition,runningCount]' --output text` → a revisão esperada e `1`. **Desfazer:** é o próprio rollback acima (apontar para a revisão N−1).

**Conferência da fase inteira:** `healthy` no grupo de destino, `runtime database role verified` com `escapes:0` no log, os 3 `curl` do 3.9. **O que pode dar errado:** `CannotPullContainerError` (o papel de execução sem `ecr:BatchImportUpstreamImage`, ou a tag errada); `ResourceInitializationError … secrets` (o ARN do segredo no `valueFrom` sem a chave `:NOME::`); health check vermelho por `CORS_ORIGIN` ausente (o boot recusa de propósito).

---

## 6b. Fase 3b · Antivírus (ClamAV, item 27)

**Por que agora:** decisão do dono, 17/11 (*"o traccar e antivirus ja entram"*). Até esta fase, a API roda com `EVIDENCE_SCANNER=unavailable` e **todo upload responde 503** (nada é gravado): é o fail-closed do `B-O6R-07b`. Esta fase põe o antivírus de verdade (o `clamd` do ClamAV) numa tarefa privada, e a API passa a mandar cada arquivo para ele antes de gravar (protocolo `INSTREAM`, desenho da `PD-O6R-B07B-CLAMD-INSTREAM` e do `B-AV-REAL`, já na `main`).

**Pré-requisitos:** Fases 1–3 (VPC, NAT, `erp-sg-clamav`, cluster, papel de execução, a API no ar). A ativação no ambiente de produção é contratação de serviço pago: junta de 5 unânime registrada (como toda a conta, §6.7 item 3). **Terminais:** CloudShell normal para a API da AWS; CloudShell em VPC para a conferência do 3b.6. **Custo:** Fargate **x86** 0,5 vCPU / 3 GB ≈ **US$ 42/mês** (0,5 × 0,0696 + 3 × 0,0076 US$/h × 730 h); o estudo previa ARM (US$ 33,7), mas a imagem fixada no `B-AV-REAL` (`clamav/clamav:1.4.6@sha256:982e28f9…`) só tem `amd64` (o índice da imagem lido no registro: `amd64` e um item de atestação), por isso x86 (pendência P-AWS-CLAMAV-ARM64). Mais ~US$ 0,50/mês da zona privada do Cloud Map e ~US$ 1 de logs.

**Como a API acha o antivírus:** pela **descoberta de serviço do ECS** (AWS Cloud Map, um nome DNS privado `clamav.erp.local` que aponta sempre para o IP da tarefa do momento). A documentação do ECS a sustenta em `sa-east-1`, no Fargate, com registro `A` para tarefas `awsvpc`, saúde do registro dada pela própria checagem de saúde do contêiner, e sem custo além da zona privada e das consultas. **Declarado:** a PD do antivírus citava o *Service Connect* (o mesmo Cloud Map, mais um proxy dentro de cada tarefa); aqui fica a descoberta por DNS, sem proxy, porque o cliente da API já tem o próprio tempo-limite de conexão e de varredura (`CLAMAV_CONNECT_TIMEOUT_MS`, `CLAMAV_SCAN_TIMEOUT_MS`) e o proxy só somaria uma peça. Um NLB interno também serviria, mas custa ~US$ 25/mês a mais sem ganho para uma tarefa só.

```bash
set -a; . ~/erp-ids.env; set +a
export IMAGEM_CLAMAV="clamav/clamav@sha256:982e28f90061d0e66eb03276419f589a47c9fa601e985e472fc2f6c64b497ca0"   # a tag 1.4.6, presa pelo digest (o mesmo do docker-compose.clamav.yml)
```

### 3b.1 O espaço de nomes privado (`erp.local`)
**Objetivo:** uma zona DNS só da VPC, onde cada serviço interno ganha um nome (`clamav.erp.local`, depois `traccar.erp.local` e `api.erp.local`).
```bash
OP_ID=$(aws servicediscovery create-private-dns-namespace --name erp.local --vpc "$VPC_ID" --description "ERP: nomes internos da VPC" --query OperationId --output text)
aws servicediscovery get-operation --operation-id "$OP_ID" --query 'Operation.Status' --output text     # repita até SUCCESS
NS_ID=$(aws servicediscovery get-operation --operation-id "$OP_ID" --query 'Operation.Targets.NAMESPACE' --output text)
echo "NS_ID=$NS_ID" >> ~/erp-ids.env
```
**Conferência:** `aws servicediscovery list-namespaces --query "Namespaces[?Name=='erp.local'].[Id,Type]" --output text` → `ns-… DNS_PRIVATE`. **Custo:** ~US$ 0,50/mês (a zona privada do Route 53 que o Cloud Map cria). **Desfazer** (só depois de apagar os serviços de descoberta do 3b.2 e do 3c.4): `aws servicediscovery delete-namespace --id "$NS_ID"`.

### 3b.2 O nome do antivírus e a regra de entrada para a conferência
```bash
SD_CLAMAV_ARN=$(aws servicediscovery create-service --name clamav --namespace-id "$NS_ID" --dns-config 'RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=10}]' --health-check-custom-config FailureThreshold=1 --query Service.Arn --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG_CLAMAV" --protocol tcp --port 3310 --source-group "$SG_OPS"     # só para a conferência do 3b.6, a partir do CloudShell em VPC
aws logs create-log-group --log-group-name /ecs/erp-clamav --tags app=erp
aws logs put-retention-policy --log-group-name /ecs/erp-clamav --retention-in-days 30
echo "SD_CLAMAV_ARN=$SD_CLAMAV_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-security-groups --group-ids "$SG_CLAMAV" --query 'SecurityGroups[0].IpPermissions[].[FromPort,UserIdGroupPairs[].GroupId]' --output text` → `3310` só com `erp-sg-api` e `erp-sg-ops`. **Desfazer:** `aws servicediscovery delete-service --id <id do serviço clamav>` (o ID é o fim do `SD_CLAMAV_ARN`, `srv-…`), `aws ec2 revoke-security-group-ingress --group-id "$SG_CLAMAV" --protocol tcp --port 3310 --source-group "$SG_OPS"` e `aws logs delete-log-group --log-group-name /ecs/erp-clamav`.

### 3b.3 A receita da tarefa do antivírus
**Objetivo:** o contêiner oficial do ClamAV com a **mesma configuração do repositório** (`infra/clamav/clamd.conf`: os limites que, sem `AlertExceedsMax yes`, dariam "limpo" por engano). O Fargate não monta arquivo do repositório; então a receita leva o conteúdo do `clamd.conf` numa variável e, antes de subir, o contêiner o grava em `/etc/clamav/clamd.conf` e chama o mesmo início da imagem (`/init`, lido na configuração da imagem no registro). O `freshclam` (atualização da base de vírus) roda dentro da mesma tarefa, como a imagem faz por padrão, e sai pela internet pelo NAT da fase 1. A checagem de saúde é a da própria imagem (`clamdcheck.sh`); o ECS aceita no máximo 300 s de carência, e a primeira base leva alguns minutos para baixar, por isso 10 tentativas de 30 s depois da carência.
```bash
cd ~/erp 2>/dev/null || git clone --depth 1 --branch main "https://github.com/${GH_DONO}/${GH_REPO}.git" ~/erp
jq -n --rawfile conf ~/erp/infra/clamav/clamd.conf --arg img "$IMAGEM_CLAMAV" --arg exe "$EXEC_ROLE_ARN" --arg reg "$REGIAO" '{
  family: "erp-clamav", networkMode: "awsvpc", requiresCompatibilities: ["FARGATE"], cpu: "512", memory: "3072",
  runtimePlatform: { cpuArchitecture: "X86_64", operatingSystemFamily: "LINUX" },
  executionRoleArn: $exe,
  containerDefinitions: [ {
    name: "clamav", image: $img, essential: true,
    portMappings: [ { containerPort: 3310, protocol: "tcp" } ],
    environment: [ { name: "CLAMD_CONF", value: $conf } ],
    entryPoint: ["/bin/sh", "-c"],
    command: ["printf \"%s\\n\" \"$CLAMD_CONF\" > /etc/clamav/clamd.conf && exec /init"],
    logConfiguration: { logDriver: "awslogs", options: { "awslogs-group": "/ecs/erp-clamav", "awslogs-region": $reg, "awslogs-stream-prefix": "clamav" } },
    healthCheck: { command: ["CMD-SHELL", "clamdcheck.sh"], interval: 30, timeout: 10, retries: 10, startPeriod: 300 }
  } ] }' > clamav-taskdef.json
CLAMAV_TASKDEF_ARN=$(aws ecs register-task-definition --cli-input-json file://clamav-taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "CLAMAV_TASKDEF_ARN=$CLAMAV_TASKDEF_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws ecs describe-task-definition --task-definition erp-clamav --query 'taskDefinition.[cpu,memory,runtimePlatform.cpuArchitecture,containerDefinitions[0].image]' --output text` → `512 3072 X86_64 clamav/clamav@sha256:982e…`. **Custo:** 0 (a receita não custa). **Desfazer:** `aws ecs deregister-task-definition --task-definition erp-clamav:<revisão>`.

### 3b.4 O serviço do antivírus (1 tarefa, privada)
```bash
aws ecs create-service --cluster erp-prod --service-name erp-clamav --task-definition "$CLAMAV_TASKDEF_ARN" --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUB_PRIV_A},${SUB_PRIV_B}],securityGroups=[${SG_CLAMAV}],assignPublicIp=DISABLED}" \
  --service-registries "registryArn=${SD_CLAMAV_ARN}" --tags key=app,value=erp --query 'service.status' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-clamav      # a 1ª base de vírus leva minutos
```
**Conferência:** `aws ecs describe-services --cluster erp-prod --services erp-clamav --query 'services[0].[status,runningCount]' --output text` → `ACTIVE 1`; `aws logs tail /ecs/erp-clamav --since 15m --format short` (só na CLI v2 do CloudShell) mostra a base baixada e o `clamd` escutando. **Custo:** ~US$ 42/mês. **Desfazer:** `aws ecs update-service --cluster erp-prod --service erp-clamav --desired-count 0` e `aws ecs delete-service --cluster erp-prod --service erp-clamav --force` — **antes** volte a API para `EVIDENCE_SCANNER=unavailable` (desfazer do 3b.5), senão todo upload passa a responder 503 por antivírus fora do ar, que é o lado seguro, mas é uma queda.

### 3b.5 A API passa a usar o antivírus
**Objetivo:** os nomes reais do `src/config/env.ts`: `EVIDENCE_SCANNER=clamav`, `CLAMAV_HOST` (obrigatório com `clamav`), `CLAMAV_PORT` (padrão 3310) e `CLAMAV_MAX_DB_AGE_HOURS` (em produção, no mínimo 1; o `docker-compose.clamav.yml` usa 72: base de vírus mais velha que isso faz o upload responder 503).
```bash
jq '(.containerDefinitions[0].environment[] | select(.name=="EVIDENCE_SCANNER") | .value) = "clamav"
    | .containerDefinitions[0].environment += [ {name:"CLAMAV_HOST", value:"clamav.erp.local"}, {name:"CLAMAV_PORT", value:"3310"}, {name:"CLAMAV_MAX_DB_AGE_HOURS", value:"72"} ]' taskdef.json > taskdef.novo.json && mv taskdef.novo.json taskdef.json
aws ecs register-task-definition --cli-input-json file://taskdef.json --query 'taskDefinition.revision' --output text
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
```
**Conferência:** `aws ecs describe-task-definition --task-definition erp-api --query "taskDefinition.containerDefinitions[0].environment[?starts_with(name,'CLAMAV')||name=='EVIDENCE_SCANNER']" --output text` → as 4 variáveis com `clamav`, `clamav.erp.local`, `3310`, `72`. **Desfazer:** a mesma edição com `EVIDENCE_SCANNER=unavailable` (as `CLAMAV_*` podem ficar: sem `clamav` elas não são lidas), nova revisão e `update-service`; ou o rollback do 3.10 para a revisão anterior.

### 3b.6 A prova do item 27: o antivírus responde no ambiente e o upload deixa de dar 503
**Terminal:** CloudShell em VPC (ele alcança a 3310 pela regra do 3b.2).
```bash
getent hosts clamav.erp.local                                                     # 10.40.1x.y   (o nome do Cloud Map resolve)
exec 3<>/dev/tcp/clamav.erp.local/3310; printf 'zPING\0' >&3; head -c 4 <&3; echo; exec 3>&-       # PONG
exec 3<>/dev/tcp/clamav.erp.local/3310; printf 'zVERSION\0' >&3; tr -d '\0' <&3 | head -c 120; echo; exec 3>&-   # ClamAV 1.4.6/<versão da base>/<data da base>
```
Depois, pela API (em qualquer CloudShell), um envio real de anexo de um registro de teste que você tenha criado na console (por exemplo um dano, `entity_type=damage`), com o token de administrador obtido como no 6.3:
```bash
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer ${TOKEN}" -F entity_type=damage -F entity_id=<id do dano de teste> -F "file=@<um PDF ou imagem pequenos e legítimos>" "https://api.${DOMINIO}/api/v1/attachments"   # 201 (ou 2xx), e NÃO 503
```
**Conferência:** `PONG`; a versão com a data da base de hoje ou de ontem; o upload com 2xx em vez de 503. **Esse é o critério do item 27** ("fecha só com o serviço respondendo no ambiente"). Um arquivo de teste de vírus padrão (o EICAR, gerado na hora, nunca guardado no repositório) deve voltar `422` (`scanner_infected`). **Desfazer:** não se aplica (só leitura; apague o anexo de teste pela console). Se quiser fechar a porta da conferência: `aws ec2 revoke-security-group-ingress --group-id "$SG_CLAMAV" --protocol tcp --port 3310 --source-group "$SG_OPS"`.

**Conferência da fase inteira:** `ACTIVE 1` no `erp-clamav`; `PONG` e a versão da base pelo CloudShell em VPC; upload 2xx. **Item do portão:** o **27** fecha aqui, quando o serviço responder no ambiente.

**O que pode dar errado:**
- A tarefa reiniciar por falta de memória na recarga da base: o `clamd` recarrega a base nova ao lado da antiga e, por instantes, usa quase o dobro. Se o log mostrar `OutOfMemory` ou a tarefa cair na hora da atualização, suba para 4 GB (a PD media 4 GB; o estudo fixou 3 GB) — nova revisão com `memory: "4096"` (+US$ 5,5/mês).
- A primeira base não baixar: o `freshclam` precisa de saída pela internet (NAT da fase 1) para `database.clamav.net` na 443; com NAT parado, a tarefa fica sem base e a checagem de saúde a derruba depois de ~10 min. O CDN da ClamAV também limita downloads por IP (o IP do NAT é seu, não compartilhado).
- A imagem vir do Docker Hub, que limita downloads anônimos por IP: o pull é raro (só na troca de tarefa), mas se aparecer `toomanyrequests`, espelhe a imagem no ECR (pull-through do Docker Hub, que exige credencial do Docker Hub no Secrets Manager, como o 1.6 faz para o GHCR).
- O upload continuar 503 com o `clamd` respondendo: a base passou de 72 h (`CLAMAV_MAX_DB_AGE_HOURS`), ou o grupo de segurança não deixa a API chegar à 3310 (`erp-sg-clamav` só aceita `erp-sg-api`, fase 1), ou o nome não resolve (a VPC precisa de DNS ligado, passo 1.1).

---

## 6c. Fase 3c · Traccar (`B-TRC-06`)

**Por que agora:** decisão do dono, 17/11 (*"o traccar e antivirus ja entram"*). O Traccar recebe a posição dos rastreadores e a entrega à API **pela rede privada** (`D-TRACCAR-HTTP-PRIVADO-AWS`: "sem exposição externa da API do Traccar nem dos endpoints de ingestão do ERP"). Esta fase sobe o Traccar **sem nenhuma porta pública**; a porta dos rastreadores é a fase 3d, com trava própria.

**Pré-requisitos:** Fases 1–3 e o 3b.1 (o espaço de nomes `erp.local`); o `B-SAN3-05` (papel de banco sem bypass) na `main`, que é o pré-requisito de ingestão em produção. Pelo plano do Traccar (§7.1), o `B-TRC-06` é decisão crítica: **junta de 5 unânime** antes de provisionar. **Terminais:** CloudShell normal; CloudShell em VPC para o banco (3c.3) e a conferência (3c.7). **Custo:** Traccar em Fargate x86 0,5 vCPU / 2 GB ≈ **US$ 36,5/mês** · RDS PostgreSQL `db.t4g.micro` dedicado + 20 GB ≈ **US$ 28/mês** · 1 segredo US$ 0,40 · logs ~US$ 1. (A imagem `traccar/traccar:6.16.0` também tem `arm64`; o estudo fixou x86, e a troca para ARM economizaria ~US$ 7/mês: pendência P-AWS-TRACCAR-ARM64.)

**Decisões do dono que esta fase cumpre:** D-AWS-12 (banco **dedicado** do Traccar, decidido pelo dono em 17/11) e as regras do Traccar: nunca o `tenant_id` do conteúdo como contexto confiável; dispositivo não mapeado vai para a **quarentena** (já no código, `B-TRC-01`); vínculo ambíguo falha fechado; o token nunca em código, log, endereço, frontend ou corpo de resposta, comparado em tempo constante; nenhuma porta pública sem decisão, modelo de ameaças e junta; nunca os servidores públicos de demonstração do Traccar.

```bash
set -a; . ~/erp-ids.env; set +a
export IMAGEM_TRACCAR="traccar/traccar@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda"   # a tag 6.16.0, presa pelo digest (o mesmo do docker-compose.traccar.yml)
export TRC_DB_ID=erp-prod-traccar-pg TRC_DB_ADMIN=trc_admin
```

### 3c.1 Grupos de segurança do Traccar e do banco dele
**Objetivo:** o Traccar só fala com a API (porta 3200, a ingestão, nunca a 3000 pública) e com o banco dele; ninguém de fora fala com o Traccar. Por enquanto só o CloudShell em VPC alcança a porta OsmAnd (5055), para a conferência. A 8082 (tela e REST do Traccar) **não tem regra de entrada nenhuma**.
```bash
SG_TRACCAR=$(sg erp-sg-traccar "Traccar: sem entrada publica; 5055 so do CloudShell em VPC")
SG_RDS_TRC=$(sg erp-sg-rds-traccar "RDS do Traccar: 5432 so do Traccar e do CloudShell em VPC")
aws ec2 authorize-security-group-ingress --group-id "$SG_API" --protocol tcp --port 3200 --source-group "$SG_TRACCAR"
aws ec2 authorize-security-group-ingress --group-id "$SG_TRACCAR" --protocol tcp --port 5055 --source-group "$SG_OPS"
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS_TRC" --protocol tcp --port 5432 --source-group "$SG_TRACCAR"
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS_TRC" --protocol tcp --port 5432 --source-group "$SG_OPS"
printf 'SG_TRACCAR=%s\nSG_RDS_TRC=%s\n' "$SG_TRACCAR" "$SG_RDS_TRC" >> ~/erp-ids.env
```
(A função `sg` é a do passo 1.4; numa sessão nova, cole-a de novo.)
**Conferência:** `aws ec2 describe-security-groups --group-ids "$SG_TRACCAR" "$SG_API" --query 'SecurityGroups[].[GroupName,IpPermissions[].[FromPort,UserIdGroupPairs[].GroupId,IpRanges[].CidrIp]]' --output json` → `erp-sg-traccar` com só `5055` vinda de `erp-sg-ops`; `erp-sg-api` com `3000` do ALB e `3200` só de `erp-sg-traccar`; nenhum `0.0.0.0/0`. **Custo:** 0. **Desfazer:** `aws ec2 revoke-security-group-ingress --group-id "$SG_API" --protocol tcp --port 3200 --source-group "$SG_TRACCAR"` e `aws ec2 delete-security-group --group-id <id>` para os dois grupos novos (depois de apagar o que os usa: 3c.2 e 3c.6).

### 3c.2 O banco dedicado do Traccar (D-AWS-12)
**Objetivo:** um PostgreSQL só do Traccar, separado do banco do ERP (decisão do dono: banco próprio), nas mesmas subnets privadas e com o mesmo grupo de parâmetros (UTC e TLS obrigatório).
```bash
aws rds create-db-instance --db-instance-identifier "$TRC_DB_ID" --db-instance-class db.t4g.micro --engine postgres --engine-version "$PG_VERSAO" \
  --master-username "$TRC_DB_ADMIN" --manage-master-user-password \
  --allocated-storage 20 --storage-type gp3 --storage-encrypted \
  --db-subnet-group-name erp-db-subnets --vpc-security-group-ids "$SG_RDS_TRC" --db-parameter-group-name erp-pg16 \
  --backup-retention-period 7 --preferred-backup-window 05:00-06:00 --copy-tags-to-snapshot \
  --no-publicly-accessible --no-multi-az --deletion-protection --auto-minor-version-upgrade \
  --tags Key=app,Value=erp-traccar --query 'DBInstance.DBInstanceStatus' --output text
aws rds wait db-instance-available --db-instance-identifier "$TRC_DB_ID"
RDS_TRC_HOST=$(aws rds describe-db-instances --db-instance-identifier "$TRC_DB_ID" --query 'DBInstances[0].Endpoint.Address' --output text)
RDS_TRC_SECRET_ARN=$(aws rds describe-db-instances --db-instance-identifier "$TRC_DB_ID" --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
printf 'RDS_TRC_HOST=%s\nRDS_TRC_SECRET_ARN=%s\n' "$RDS_TRC_HOST" "$RDS_TRC_SECRET_ARN" >> ~/erp-ids.env
```
(`PG_VERSAO` é a do 2.3; numa sessão nova, rode de novo a primeira linha do 2.3.)
**Conferência:** `aws rds describe-db-instances --db-instance-identifier "$TRC_DB_ID" --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass,PubliclyAccessible,DeletionProtection,BackupRetentionPeriod]' --output text` → `available db.t4g.micro False True 7`. **Custo:** ~US$ 28/mês. **Desfazer:** `aws rds modify-db-instance --db-instance-identifier "$TRC_DB_ID" --no-deletion-protection --apply-immediately` e `aws rds delete-db-instance --db-instance-identifier "$TRC_DB_ID" --skip-final-snapshot --delete-automated-backups` (apaga o histórico de posições do Traccar; o que já entrou no ERP fica no ERP).

### 3c.3 O usuário do Traccar no banco e os segredos
**Objetivo:** o Traccar **não** conecta como administrador do banco: ganha um papel `traccar`, dono só do banco `traccar`. A senha nasce no terminal, vai para um segredo e entra no `psql` lida de um arquivo pelo próprio `psql` (o `\set` com o comando entre crases, documentado no `psql` 16), nunca por argumento. O token do encaminhamento (o `X-Traccar-Forward-Token` que a API confere) nasce aqui também, com 64 caracteres (o `env.ts` exige ≥ 32 e recusa os valores de desenvolvimento), e vai para os **dois** segredos: no do Traccar como o cabeçalho inteiro, no da API como o valor.
**Terminal:** CloudShell em VPC (para o `psql`; a parte do Secrets Manager também funciona daqui).
```bash
umask 077; TMP=$(mktemp -d)
openssl rand -base64 48 | tr -d '\n' > "$TMP/trc-db.pw"
openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n' > "$TMP/trc-fwd.tok"
export PGHOST="$RDS_TRC_HOST" PGPORT=5432 PGUSER="$TRC_DB_ADMIN" PGDATABASE=postgres PGSSLMODE=require
export PGPASSWORD="$(aws secretsmanager get-secret-value --secret-id "$RDS_TRC_SECRET_ARN" --query SecretString --output text | jq -r .password)"
export TRC_PW_FILE="$TMP/trc-db.pw"
psql -v ON_ERROR_STOP=1 <<'SQL'
\set senha `cat "$TRC_PW_FILE"`
CREATE ROLE traccar LOGIN PASSWORD :'senha';
GRANT traccar TO CURRENT_USER;
CREATE DATABASE traccar OWNER traccar;
SQL
jq -n --rawfile pw "$TMP/trc-db.pw" --rawfile tok "$TMP/trc-fwd.tok" '{DATABASE_PASSWORD:$pw, FORWARD_HEADER:("X-Traccar-Forward-Token: " + $tok)}' > "$TMP/trc.json"
SEGREDO_TRC_ARN=$(aws secretsmanager create-secret --name erp/prod/traccar --description "Segredos do Traccar em producao" --secret-string "file://$TMP/trc.json" --tags Key=app,Value=erp-traccar --query ARN --output text)
aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text | jq --rawfile tok "$TMP/trc-fwd.tok" '.TRACCAR_FORWARD_SECRET_CURRENT=$tok' > "$TMP/api.json"
aws secretsmanager put-secret-value --secret-id erp/prod/api --secret-string "file://$TMP/api.json"
shred -u "$TMP/trc-db.pw" "$TMP/trc-fwd.tok" "$TMP/trc.json" "$TMP/api.json"; unset PGPASSWORD TRC_PW_FILE
echo "SEGREDO_TRC_ARN=$SEGREDO_TRC_ARN" >> ~/erp-ids.env      # e copie esta linha para o ~/erp-ids.env do CloudShell normal
```
**Conferência:** `PGPASSWORD=… psql -Atc "select rolname, rolsuper, rolcreaterole, rolcreatedb from pg_roles where rolname='traccar'"` → `traccar|f|f|f`; `psql -Atc "select datname, pg_get_userbyid(datdba) from pg_database where datname='traccar'"` → `traccar|traccar`; `aws secretsmanager get-secret-value --secret-id erp/prod/traccar --query SecretString --output text | jq -r 'keys[]'` → `DATABASE_PASSWORD FORWARD_HEADER` (só os nomes); e `… --secret-id erp/prod/api … | jq -r 'has("TRACCAR_FORWARD_SECRET_CURRENT")'` → `true`. **Custo:** US$ 0,40/mês (o segredo novo). **Desfazer:** `psql -v ON_ERROR_STOP=1 -c 'DROP DATABASE traccar' -c 'DROP ROLE traccar'` (com o Traccar parado), `aws secretsmanager delete-secret --secret-id erp/prod/traccar --recovery-window-in-days 7`, e a chave `TRACCAR_FORWARD_SECRET_CURRENT` sai do segredo da API pelo `AWSPREVIOUS` (desfazer do 2.10).

### 3c.4 Os nomes internos do Traccar e da API, e a permissão de ler o segredo
**Objetivo:** o Traccar entrega em `http://api.erp.local:3200`; a API ganha um nome no Cloud Map (só a 3200 interessa a quem vem por ele: o ALB continua sendo a entrada pública da 3000). O papel de execução da tarefa passa a poder ler o segredo do Traccar.
```bash
SD_TRACCAR_ARN=$(aws servicediscovery create-service --name traccar --namespace-id "$NS_ID" --dns-config 'RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=10}]' --health-check-custom-config FailureThreshold=1 --query Service.Arn --output text)
SD_API_ARN=$(aws servicediscovery create-service --name api --namespace-id "$NS_ID" --dns-config 'RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=10}]' --health-check-custom-config FailureThreshold=1 --query Service.Arn --output text)
cat > exec-traccar.json <<EOF
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "${SEGREDO_TRC_ARN}" } ] }
EOF
aws iam put-role-policy --role-name erp-ecs-execucao --policy-name erp-segredos-traccar --policy-document file://exec-traccar.json
aws logs create-log-group --log-group-name /ecs/erp-traccar --tags app=erp-traccar
aws logs put-retention-policy --log-group-name /ecs/erp-traccar --retention-in-days 30
printf 'SD_TRACCAR_ARN=%s\nSD_API_ARN=%s\n' "$SD_TRACCAR_ARN" "$SD_API_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws servicediscovery list-namespaces --query "Namespaces[?Name=='erp.local'].Properties.DnsProperties.HostedZoneId" --output text` → a zona privada; `aws iam get-role-policy --role-name erp-ecs-execucao --policy-name erp-segredos-traccar --query 'PolicyDocument.Statement[0].Resource' --output text` → o ARN do `erp/prod/traccar`. **Custo:** 0 (as consultas internas custam centavos). **Desfazer:** `aws servicediscovery delete-service --id <srv-… do traccar>` e `--id <srv-… da api>` (depois de tirar os serviços ECS deles), `aws iam delete-role-policy --role-name erp-ecs-execucao --policy-name erp-segredos-traccar` e `aws logs delete-log-group --log-group-name /ecs/erp-traccar`.

### 3c.5 A API escuta a ingestão na rede privada
**Objetivo:** os nomes reais do `src/config/env.ts`: `TRACCAR_INGEST_ENABLED=true`, `TRACCAR_INGEST_HOST=0.0.0.0` (a escuta é na interface da tarefa; quem chega é decidido pelo grupo de segurança: só `erp-sg-traccar`, 3c.1), `TRACCAR_INGEST_PORT=3200` (diferente de `PORT`, como o `env.ts` exige), `TRACCAR_INSTANCE_KEY=erp-prod` (casa `^[a-z0-9-]{3,40}$`) e o `TRACCAR_FORWARD_SECRET_CURRENT` pelo segredo. A 3200 **não** entra no grupo de destino do ALB: nenhuma rota pública chega a ela (o app da ingestão é outro app Express, `src/integrations/traccar/traccar-ingest.app.ts`).
```bash
jq --arg seg "$SEGREDO_API_ARN" '.containerDefinitions[0].portMappings += [ {containerPort:3200, protocol:"tcp"} ]
    | .containerDefinitions[0].environment += [ {name:"TRACCAR_INGEST_ENABLED", value:"true"}, {name:"TRACCAR_INGEST_HOST", value:"0.0.0.0"}, {name:"TRACCAR_INGEST_PORT", value:"3200"}, {name:"TRACCAR_INSTANCE_KEY", value:"erp-prod"} ]
    | .containerDefinitions[0].secrets += [ {name:"TRACCAR_FORWARD_SECRET_CURRENT", valueFrom:($seg + ":TRACCAR_FORWARD_SECRET_CURRENT::")} ]' taskdef.json > taskdef.novo.json && mv taskdef.novo.json taskdef.json
aws ecs register-task-definition --cli-input-json file://taskdef.json --query 'taskDefinition.revision' --output text
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api --service-registries "registryArn=${SD_API_ARN}" --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
```
**Conferência:** `aws logs filter-log-events --log-group-name /ecs/erp-api --filter-pattern '"Traccar ingest listener up"' --start-time $(( ($(date +%s) - 900) * 1000 )) --query 'events[].message' --output text` → uma linha com `"port":3200`; e o alvo do ALB continua `healthy` (3.8). **Desfazer:** a mesma edição ao contrário (tirar a porta 3200, as 4 variáveis e o segredo; ou `TRACCAR_INGEST_ENABLED=false`, que deixa o listener desligado: o log diz `Traccar ingest listener disabled`), nova revisão e `update-service`.

### 3c.6 A receita e o serviço do Traccar (privado, sem porta pública)
**Objetivo:** a imagem oficial **pinada por digest** (a mesma do `docker-compose.traccar.yml` e da `PD-TRC-616`), configurada só por variáveis de ambiente (`CONFIG_USE_ENVIRONMENT_VARIABLES=true`; o Traccar troca `.` por `_` e maiúscula por `_` + letra, regra do `Config.java` da tag `v6.16.0`): banco PostgreSQL dedicado, só os protocolos **OsmAnd (5055)** e **GT06 (5023)** (portas padrão do `PortConfigSuffix.java` da mesma tag), encaminhamento JSON de posição e de evento para a API com o cabeçalho do token, geocodificação desligada. `DATABASE_REGISTER_UNKNOWN=true` só enquanto não há porta pública (a conferência usa um identificador de teste); a fase 3d o desliga antes de abrir a porta. Sem tarefa de papel IAM: o Traccar não chama a AWS.
```bash
jq -n --arg img "$IMAGEM_TRACCAR" --arg exe "$EXEC_ROLE_ARN" --arg reg "$REGIAO" --arg seg "$SEGREDO_TRC_ARN" \
      --arg dburl "jdbc:postgresql://${RDS_TRC_HOST}:5432/traccar?sslmode=require" '{
  family: "erp-traccar", networkMode: "awsvpc", requiresCompatibilities: ["FARGATE"], cpu: "512", memory: "2048",
  runtimePlatform: { cpuArchitecture: "X86_64", operatingSystemFamily: "LINUX" },
  executionRoleArn: $exe,
  containerDefinitions: [ {
    name: "traccar", image: $img, essential: true,
    portMappings: [ { containerPort: 5055, protocol: "tcp" }, { containerPort: 5023, protocol: "tcp" } ],
    environment: [
      { name: "CONFIG_USE_ENVIRONMENT_VARIABLES", value: "true" },
      { name: "DATABASE_DRIVER", value: "org.postgresql.Driver" },
      { name: "DATABASE_URL", value: $dburl },
      { name: "DATABASE_USER", value: "traccar" },
      { name: "DATABASE_REGISTER_UNKNOWN", value: "true" },
      { name: "PROTOCOLS_ENABLE", value: "osmand,gt06" },
      { name: "FORWARD_TYPE", value: "json" },
      { name: "FORWARD_URL", value: "http://api.erp.local:3200/ingest/traccar/v1/positions" },
      { name: "FORWARD_RETRY_ENABLE", value: "true" },
      { name: "EVENT_FORWARD_URL", value: "http://api.erp.local:3200/ingest/traccar/v1/events" },
      { name: "CLIENT_CONNECT_TIMEOUT", value: "5000" },
      { name: "CLIENT_READ_TIMEOUT", value: "5000" },
      { name: "GEOCODER_ENABLE", value: "false" }
    ],
    secrets: [
      { name: "DATABASE_PASSWORD",    valueFrom: ($seg + ":DATABASE_PASSWORD::") },
      { name: "FORWARD_HEADER",       valueFrom: ($seg + ":FORWARD_HEADER::") },
      { name: "EVENT_FORWARD_HEADER", valueFrom: ($seg + ":FORWARD_HEADER::") }
    ],
    logConfiguration: { logDriver: "awslogs", options: { "awslogs-group": "/ecs/erp-traccar", "awslogs-region": $reg, "awslogs-stream-prefix": "traccar" } },
    healthCheck: { command: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:8082/api/server || exit 1"], interval: 30, timeout: 5, retries: 5, startPeriod: 120 }
  } ] }' > traccar-taskdef.json
TRACCAR_TASKDEF_ARN=$(aws ecs register-task-definition --cli-input-json file://traccar-taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
aws ecs create-service --cluster erp-prod --service-name erp-traccar --task-definition "$TRACCAR_TASKDEF_ARN" --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUB_PRIV_A},${SUB_PRIV_B}],securityGroups=[${SG_TRACCAR}],assignPublicIp=DISABLED}" \
  --service-registries "registryArn=${SD_TRACCAR_ARN}" --tags key=app,value=erp-traccar --query 'service.status' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-traccar
echo "TRACCAR_TASKDEF_ARN=$TRACCAR_TASKDEF_ARN" >> ~/erp-ids.env
```
(A checagem de saúde usa o `wget` do BusyBox da imagem, que é Alpine — lido no histórico da imagem no registro — e pergunta à REST do próprio Traccar **dentro do contêiner**; a 8082 continua sem regra de entrada.)
**Conferência:** `aws ecs describe-services --cluster erp-prod --services erp-traccar --query 'services[0].[status,runningCount]' --output text` → `ACTIVE 1`; `aws ecs describe-task-definition --task-definition erp-traccar --query 'taskDefinition.containerDefinitions[0].[image,portMappings[].containerPort]' --output json` → a imagem com `@sha256:03ebb7ed…` e só `5055` e `5023`. **Custo:** ~US$ 36,5/mês. **Desfazer:** `aws ecs update-service --cluster erp-prod --service erp-traccar --desired-count 0`, `aws ecs delete-service --cluster erp-prod --service erp-traccar --force` e `aws ecs deregister-task-definition --task-definition erp-traccar:<revisão>`.

### 3c.7 A prova da ponte privada: rastreador → Traccar → API → quarentena
**Terminal:** CloudShell em VPC. Uma posição OsmAnd com um identificador de teste que **não** está mapeado a viatura nenhuma: o caminho certo é o Traccar aceitar (200), encaminhar para a API pela rede privada e a API pôr a posição em **quarentena** (202 para o Traccar, nada gravado em organização nenhuma).
```bash
getent hosts traccar.erp.local api.erp.local                                            # os dois nomes resolvem para 10.40.1x.y
curl -sS -o /dev/null -w '%{http_code}\n' "http://traccar.erp.local:5055/?id=smoke-$(date +%Y%m%d)&lat=-23.5505&lon=-46.6333&timestamp=$(date +%s)&speed=0"   # 200
timeout 5 bash -c '</dev/tcp/api.erp.local/3200' && echo "ABERTA (errado)" || echo "fechada (certo: a 3200 só aceita o Traccar)"
timeout 5 bash -c '</dev/tcp/traccar.erp.local/8082' && echo "ABERTA (errado)" || echo "fechada (certo: a 8082 não tem entrada)"
```
No banco do ERP (as variáveis `PG*` do 2.4, como administrador):
```bash
psql -Atc "select reason, delivery_count, last_seen_at from traccar_quarantine_items where instance_key='erp-prod' order by last_seen_at desc limit 1"   # a quarentena do identificador de teste
```
**Conferência:** `200`; as duas portas `fechada`; uma linha na `traccar_quarantine_items` com `instance_key='erp-prod'`. **Desfazer:** não se aplica (a quarentena é o lugar certo do teste; resolva o item pela console do ERP). **Não use** servidores públicos de demonstração do Traccar para testar, em ambiente nenhum.

**Conferência da fase inteira:** `ACTIVE 1` no `erp-traccar`; o log `Traccar ingest listener up` na API; a quarentena do teste; as portas 3200 (de fora do Traccar) e 8082 fechadas; nenhum `0.0.0.0/0` em `erp-sg-traccar` nem em `erp-sg-rds-traccar`.

**O que pode dar errado:**
- O Traccar não subir por banco: a URL JDBC, o usuário `traccar` ou a senha do segredo errados (o log mostra a exceção do driver); o TLS é obrigatório pelo `rds.force_ssl=1`, por isso o `sslmode=require` na URL.
- A posição não chegar à quarentena: o grupo `erp-sg-api` sem a 3200 vinda de `erp-sg-traccar`, a API sem a revisão do 3c.5 (`Traccar ingest listener disabled` no log), o nome `api.erp.local` sem registro (a API sem `--service-registries`), ou o token diferente nos dois segredos (a API responde 401 e o Traccar repete; o token nunca aparece no log).
- A checagem de saúde derrubar a tarefa no início: o Traccar cria as tabelas no primeiro boot; se 120 s não bastarem, aumente o `startPeriod` (máximo 300 s).
- Estado online/sem sinal: o `EVENT_STATUS_ENABLE`/`STATUS_TIMEOUT` do ambiente de desenvolvimento ficou de fora; em produção é decisão do `B-TRC-06` (pendência P-TRC02-STATUS-TIMEOUT-PROD).

---

## 6d. Fase 3d · Porta dos rastreadores (D-AWS-11, gate `G-TRC-NLB`)

> **TRAVA — não execute esta fase antes de:** (1) o **modelo de ameaças** do gate `G-TRC-NLB` estar escrito e aprovado; e (2) a **junta de 5, por unanimidade**, aprovar a abertura, com ata registrada. É a regra do próprio dono para o Traccar ("nenhuma porta pública sem decisão, threat model e junta") e a do plano do Traccar (§6.2: NLB público por protocolo só nasce depois de modelo do dispositivo, portas, limite de taxa e de ataque, modelo de ameaças próprio e junta unânime). **A decisão de abrir é do dono** (D-AWS-11, 17/11: *"porta aberta com os devidos cuidados"*); esta fase é o "como", e os cuidados abaixo são a parte dela.

**Objetivo:** os rastreadores reais (na rua, com chip de dados) precisam de um endereço público para mandar posição. Abre-se **só** o que a `PD-TRC-616` aprovou: **GT06 na 5023** e **OsmAnd na 5055**, num **Network Load Balancer (NLB)** público com **2 IPs fixos** (Elastic IP, um por zona: o endereço que você configura em cada rastreador), passando ao Traccar privado. Nada da 8082 (tela e REST do Traccar), nada da 3200 (ingestão da API), nada do banco.

**Pré-requisitos:** a trava acima; a Fase 3c no ar; **os rastreadores reais já cadastrados no Traccar e mapeados a viaturas no ERP** (`B-TRC-03`), porque esta fase desliga o cadastro automático de dispositivo desconhecido. **Terminal:** CloudShell normal (e um computador fora da AWS, ou o próprio CloudShell normal, para a prova de fora). **Custo:** NLB US$ 0,034/h ≈ US$ 24,8 + NLCU (centavos com poucos rastreadores) + 2 IPv4 fixos US$ 7,3 ≈ **US$ 33/mês** (o preço de hora do estudo para `sa-east-1`; a emenda que trouxe esta fase citava US$ 18–20, que é o preço de outra região) + logs de fluxo ~US$ 1–3/mês.

**Os cuidados, e quem cuida de cada um:**

| Cuidado | Onde | Como (comando abaixo) |
|---|---|---|
| Só os 2 protocolos aprovados | NLB + grupo do NLB + grupo do Traccar | 2 listeners TCP (5023, 5055); o grupo do NLB só aceita essas portas; o do Traccar só aceita do NLB nessas portas |
| Rastreador desconhecido não entra | Traccar (`DATABASE_REGISTER_UNKNOWN=false`) e ERP (quarentena) | o Traccar ignora identificador não cadastrado; o que for cadastrado e não mapeado no ERP vai para a quarentena (`B-TRC-01`); `tenant_id` do conteúdo nunca é confiável (regra do dono) |
| Conexão parada não fica aberta | Traccar (`SERVER_TIMEOUT`) | a conexão sem dado cai depois do tempo (o padrão do Traccar é 1800 s; aqui 300 s) |
| Limite de conexões e de taxa | **o NLB não limita** conexões nem taxa por origem e não aceita WAF; o AWS Shield Standard (grátis, automático) cobre ataques de rede volumosos | o limite fica no Traccar (tempo de conexão, filtro de posição) e, depois dele, na ingestão da API (`TRACCAR_INGEST_RATE_PER_SECOND`, `TRACCAR_INGEST_BURST`, `TRACCAR_INGEST_MAX_CONCURRENCY` do `env.ts`, padrões 20/s, 100 e 10) |
| Saber quem bateu | VPC Flow Logs nas interfaces do NLB | logs de fluxo no CloudWatch (aceitos e recusados) |
| Saber de pico | CloudWatch | alarme de fluxos ativos e de fluxos bloqueados pelo grupo do NLB |
| Fechar na hora | NLB | apagar os listeners fecha as portas imediatamente (desfazer) |

```bash
set -a; . ~/erp-ids.env; set +a
```

### 3d.1 O Traccar para de aceitar rastreador desconhecido e corta conexão parada
```bash
jq '(.containerDefinitions[0].environment[] | select(.name=="DATABASE_REGISTER_UNKNOWN") | .value) = "false"
    | .containerDefinitions[0].environment += [ {name:"SERVER_TIMEOUT", value:"300"}, {name:"FILTER_ENABLE", value:"true"}, {name:"FILTER_INVALID", value:"true"}, {name:"FILTER_ZERO", value:"true"}, {name:"FILTER_DUPLICATE", value:"true"} ]' traccar-taskdef.json > traccar-taskdef.novo.json && mv traccar-taskdef.novo.json traccar-taskdef.json
TRACCAR_TASKDEF_ARN=$(aws ecs register-task-definition --cli-input-json file://traccar-taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
aws ecs update-service --cluster erp-prod --service erp-traccar --task-definition "$TRACCAR_TASKDEF_ARN" --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-traccar
```
**Conferência:** `aws ecs describe-task-definition --task-definition erp-traccar --query "taskDefinition.containerDefinitions[0].environment[?name=='DATABASE_REGISTER_UNKNOWN'||name=='SERVER_TIMEOUT']" --output text` → `false` e `300`; repetir a posição de teste do 3c.7 com um identificador novo não cria quarentena nova (o Traccar a ignora). **Desfazer:** a revisão anterior (`update-service --task-definition erp-traccar:<N-1>`).

### 3d.2 Os grupos de segurança: o do NLB e a entrada do Traccar só a partir dele
**Objetivo:** o grupo fica **preso ao NLB desde a criação** (a AWS não deixa pôr grupo num NLB depois); o Traccar aceita 5023/5055 **só** vindo do grupo do NLB, então ninguém fala direto com a tarefa.
```bash
SG_NLB=$(sg erp-sg-nlb-rastreadores "NLB publico: so 5023 (GT06) e 5055 (OsmAnd)")
aws ec2 authorize-security-group-ingress --group-id "$SG_NLB" --protocol tcp --port 5023 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_NLB" --protocol tcp --port 5055 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_TRACCAR" --protocol tcp --port 5023 --source-group "$SG_NLB"
aws ec2 authorize-security-group-ingress --group-id "$SG_TRACCAR" --protocol tcp --port 5055 --source-group "$SG_NLB"
echo "SG_NLB=$SG_NLB" >> ~/erp-ids.env
```
**Conferência:** `aws ec2 describe-security-groups --group-ids "$SG_NLB" --query 'SecurityGroups[0].IpPermissions[].[FromPort,ToPort,IpRanges[].CidrIp]' --output text` → só `5023` e `5055`. **Desfazer:** `aws ec2 revoke-security-group-ingress` das 4 regras (mesmos parâmetros) e `aws ec2 delete-security-group --group-id "$SG_NLB"` (depois de apagar o NLB).

### 3d.3 O NLB com 2 IPs fixos, os grupos de destino e os 2 listeners
```bash
EIP_TRC_A=$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=erp-rastreadores-a}]' --query AllocationId --output text)
EIP_TRC_B=$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=erp-rastreadores-b}]' --query AllocationId --output text)
NLB_ARN=$(aws elbv2 create-load-balancer --name erp-nlb-rastreadores --type network --scheme internet-facing \
  --subnet-mappings "SubnetId=${SUB_PUB_A},AllocationId=${EIP_TRC_A}" "SubnetId=${SUB_PUB_B},AllocationId=${EIP_TRC_B}" \
  --security-groups "$SG_NLB" --tags Key=app,Value=erp-traccar --query 'LoadBalancers[0].LoadBalancerArn' --output text)
TG_GT06_ARN=$(aws elbv2 create-target-group --name erp-trc-gt06 --protocol TCP --port 5023 --vpc-id "$VPC_ID" --target-type ip --health-check-protocol TCP --query 'TargetGroups[0].TargetGroupArn' --output text)
TG_OSMAND_ARN=$(aws elbv2 create-target-group --name erp-trc-osmand --protocol TCP --port 5055 --vpc-id "$VPC_ID" --target-type ip --health-check-protocol TCP --query 'TargetGroups[0].TargetGroupArn' --output text)
LST_GT06_ARN=$(aws elbv2 create-listener --load-balancer-arn "$NLB_ARN" --protocol TCP --port 5023 --default-actions Type=forward,TargetGroupArn="$TG_GT06_ARN" --query 'Listeners[0].ListenerArn' --output text)
LST_OSMAND_ARN=$(aws elbv2 create-listener --load-balancer-arn "$NLB_ARN" --protocol TCP --port 5055 --default-actions Type=forward,TargetGroupArn="$TG_OSMAND_ARN" --query 'Listeners[0].ListenerArn' --output text)
aws ecs update-service --cluster erp-prod --service erp-traccar \
  --load-balancers "targetGroupArn=${TG_GT06_ARN},containerName=traccar,containerPort=5023" "targetGroupArn=${TG_OSMAND_ARN},containerName=traccar,containerPort=5055" \
  --query 'service.loadBalancers[].containerPort' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-traccar
printf 'EIP_TRC_A=%s\nEIP_TRC_B=%s\nNLB_ARN=%s\nTG_GT06_ARN=%s\nTG_OSMAND_ARN=%s\nLST_GT06_ARN=%s\nLST_OSMAND_ARN=%s\n' "$EIP_TRC_A" "$EIP_TRC_B" "$NLB_ARN" "$TG_GT06_ARN" "$TG_OSMAND_ARN" "$LST_GT06_ARN" "$LST_OSMAND_ARN" >> ~/erp-ids.env
aws ec2 describe-addresses --allocation-ids "$EIP_TRC_A" "$EIP_TRC_B" --query 'Addresses[].PublicIp' --output text     # os 2 IPs que vão em cada rastreador
```
(A checagem de saúde do NLB é TCP nas mesmas portas; ela sai do NLB e entra pelo grupo do Traccar, que já aceita o grupo do NLB nessas portas.)
**Conferência:** `aws elbv2 describe-listeners --load-balancer-arn "$NLB_ARN" --query 'Listeners[].[Port,Protocol]' --output text` → **só** `5023 TCP` e `5055 TCP`; `aws elbv2 describe-target-health --target-group-arn "$TG_GT06_ARN" --query 'TargetHealthDescriptions[].TargetHealth.State' --output text` → `healthy` (o mesmo para `$TG_OSMAND_ARN`). **Desfazer:** **fechar na hora:** `aws elbv2 delete-listener --listener-arn "$LST_GT06_ARN"` e `aws elbv2 delete-listener --listener-arn "$LST_OSMAND_ARN"` (as portas param de responder imediatamente); depois tirar os grupos de destino do serviço (`aws ecs update-service --cluster erp-prod --service erp-traccar --load-balancers '[]'`), `aws elbv2 delete-load-balancer --load-balancer-arn "$NLB_ARN"`, `aws elbv2 delete-target-group --target-group-arn` dos dois, e `aws ec2 release-address --allocation-id` dos dois IPs (um IP devolvido não volta: cada rastreador precisaria ser reconfigurado).

### 3d.4 Logs de fluxo da VPC nas interfaces do NLB e o alarme de pico
```bash
cat > flowlogs-trust.json <<'EOF'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "vpc-flow-logs.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }
EOF
cat > flowlogs-policy.json <<'EOF'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"], "Resource": "*" } ] }
EOF
FLOW_ROLE_ARN=$(aws iam create-role --role-name erp-flowlogs --assume-role-policy-document file://flowlogs-trust.json --description "VPC Flow Logs para o CloudWatch" --query Role.Arn --output text)
aws iam put-role-policy --role-name erp-flowlogs --policy-name erp-flowlogs-escrita --policy-document file://flowlogs-policy.json
aws logs create-log-group --log-group-name /vpc/erp-nlb-rastreadores --tags app=erp-traccar
aws logs put-retention-policy --log-group-name /vpc/erp-nlb-rastreadores --retention-in-days 30
NLB_NOME=${NLB_ARN#*:loadbalancer/}
NLB_ENIS=$(aws ec2 describe-network-interfaces --filters "Name=description,Values=ELB ${NLB_NOME}" --query 'NetworkInterfaces[].NetworkInterfaceId' --output text)
aws ec2 create-flow-logs --resource-type NetworkInterface --resource-ids $NLB_ENIS --traffic-type ALL --log-destination-type cloud-watch-logs --log-group-name /vpc/erp-nlb-rastreadores --deliver-logs-permission-arn "$FLOW_ROLE_ARN" --query 'FlowLogIds' --output text
aws cloudwatch put-metric-alarm --alarm-name erp-rastreadores-pico-de-conexoes --namespace AWS/NetworkELB --metric-name ActiveFlowCount --dimensions Name=LoadBalancer,Value="$NLB_NOME" --statistic Maximum --period 300 --evaluation-periods 1 --threshold 500 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching --alarm-actions "$TOPICO_ARN"
aws cloudwatch put-metric-alarm --alarm-name erp-rastreadores-bloqueios --namespace AWS/NetworkELB --metric-name SecurityGroupBlockedFlowCount_Inbound_TCP --dimensions Name=LoadBalancer,Value="$NLB_NOME" --statistic Sum --period 300 --evaluation-periods 1 --threshold 1000 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching --alarm-actions "$TOPICO_ARN"
```
(O `TOPICO_ARN` é o do 6.5; se esta fase vier antes do 6.5, rode primeiro as duas primeiras linhas dele. O limite de 500 conexões ativas é um ponto de partida: ajuste para algumas vezes o número de rastreadores que você tem.)
**Conferência:** `aws ec2 describe-flow-logs --query "FlowLogs[?LogGroupName=='/vpc/erp-nlb-rastreadores'].[FlowLogId,FlowLogStatus]" --output text` → uma linha por interface do NLB, `ACTIVE`; `aws cloudwatch describe-alarms --alarm-names erp-rastreadores-pico-de-conexoes erp-rastreadores-bloqueios --query 'MetricAlarms[].[AlarmName,StateValue]' --output text` → 2 linhas. **Custo:** ~US$ 1–3/mês (ingestão dos logs de fluxo, US$ 0,50/GB, e 30 dias de guarda). **Desfazer:** `aws ec2 delete-flow-logs --flow-log-ids <ids>`, `aws cloudwatch delete-alarms --alarm-names erp-rastreadores-pico-de-conexoes erp-rastreadores-bloqueios`, `aws logs delete-log-group --log-group-name /vpc/erp-nlb-rastreadores`, `aws iam delete-role-policy --role-name erp-flowlogs --policy-name erp-flowlogs-escrita` e `aws iam delete-role --role-name erp-flowlogs`.

### 3d.5 A prova por comando: só aquelas duas portas estão abertas
**De fora da VPC** (CloudShell normal, que sai pela internet, ou qualquer computador):
```bash
read -r IP_TRC_A IP_TRC_B <<< "$(aws ec2 describe-addresses --allocation-ids "$EIP_TRC_A" "$EIP_TRC_B" --query 'Addresses[].PublicIp' --output text)"
for p in 5023 5055; do timeout 5 bash -c "</dev/tcp/${IP_TRC_A}/${p}" && echo "$p aberta (certo)" || echo "$p FECHADA (errado)"; done
for p in 8082 3200 3000 5432 22; do timeout 5 bash -c "</dev/tcp/${IP_TRC_A}/${p}" && echo "$p ABERTA (ERRADO: feche o NLB, desfazer do 3d.3)" || echo "$p fechada (certo)"; done
# com o nc, se preferir (sudo dnf install -y nmap-ncat): nc -vz -w 5 "$IP_TRC_A" 8082   → tem de falhar
```
Repita para o `IP_TRC_B`. **Conferência:** 5023 e 5055 abertas; 8082, 3200, 3000, 5432 e 22 fechadas; `describe-listeners` (3d.3) com só as duas portas; `describe-security-groups` (3d.2) com só as duas portas. Uma posição real de um rastreador **cadastrado e mapeado** aparece no mapa do ERP; a de um não cadastrado não entra. **Desfazer:** não se aplica (só leitura).

**Conferência da fase inteira:** a do 3d.5, os alvos `healthy`, os logs de fluxo `ACTIVE`, os 2 alarmes. **O que pode dar errado:**
- Alvo `unhealthy`: o grupo do Traccar sem a regra vinda do grupo do NLB (3d.2), ou o serviço sem os grupos de destino (3d.3).
- Rastreador conectado e posição não chegando: o rastreador não está cadastrado no Traccar (com `DATABASE_REGISTER_UNKNOWN=false` ele é ignorado) ou não está mapeado a viatura no ERP (vai para a quarentena, e aparece lá).
- Ataque de conexões: o NLB repassa tudo que o grupo deixa; o alarme de pico avisa, o `SERVER_TIMEOUT` derruba conexão parada e o limitador da ingestão protege a API. Se precisar parar já: o desfazer do 3d.3 (apagar os listeners) fecha a porta na hora, sem tocar no resto.
- GT06 e OsmAnd **não têm criptografia** na rede (é o protocolo do aparelho): o que trafega é posição e identificador, e o identificador não dá acesso a nada no ERP sem o mapeamento. Por isso a PD preferiu APN/VPN privada da operadora quando houver; o NLB público é o caminho para chip comum.

---

## 7. Fase 4 · Frontend

**Pré-requisitos:** Fase 3. **Terminal:** CloudShell normal (o build do frontend precisa de internet e de ~200 MB de `node_modules`; cabe no 1 GB). **Custo:** S3 + CloudFront ~US$ 3/mês (1 TB/mês de saída do CloudFront no nível grátis); função do CloudFront grátis até 2 milhões de execuções.

```bash
set -a; . ~/erp-ids.env; set +a
export BUCKET_APP="erp-app-${CONTA}"      # nome global único; o número da conta não é segredo
```

### 4.1 Certificado do app — em `us-east-1`, porque o CloudFront exige
```bash
CERT_APP_ARN=$(aws acm request-certificate --region us-east-1 --domain-name "app.${DOMINIO}" --validation-method DNS --key-algorithm RSA_2048 --tags Key=app,Value=erp --query CertificateArn --output text)
sleep 20
read -r ACM_CNAME_NOME ACM_CNAME_VALOR <<< "$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_APP_ARN" --query 'Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]' --output text)"
cat > rr-acm-app.json <<EOF
{ "Comment": "validacao ACM por CNAME (app)", "Changes": [ { "Action": "UPSERT", "ResourceRecordSet": {
  "Name": "${ACM_CNAME_NOME}", "Type": "CNAME", "TTL": 300, "ResourceRecords": [ { "Value": "${ACM_CNAME_VALOR}" } ] } } ] }
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-acm-app.json --query 'ChangeInfo.Status' --output text
aws acm wait certificate-validated --region us-east-1 --certificate-arn "$CERT_APP_ARN"
echo "CERT_APP_ARN=$CERT_APP_ARN" >> ~/erp-ids.env
```
**Conferência:** `aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_APP_ARN" --query 'Certificate.Status' --output text` → `ISSUED`.
**Custo:** grátis. **Desfazer** (só depois de apagar a distribuição, 4.6): `aws acm delete-certificate --region us-east-1 --certificate-arn "$CERT_APP_ARN"`; o CNAME de validação, `sed 's/"UPSERT"/"DELETE"/' rr-acm-app.json > rr-acm-app-del.json` e `aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-acm-app-del.json`.

### 4.2 Bucket privado do app
```bash
aws s3api create-bucket --bucket "$BUCKET_APP" --region "$REGIAO" --create-bucket-configuration LocationConstraint="$REGIAO"
aws s3api put-public-access-block --bucket "$BUCKET_APP" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET_APP" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
```
**Conferência:** `aws s3api get-public-access-block --bucket "$BUCKET_APP"` → os 4 `true`.
**Desfazer:** esvaziar e apagar: `aws s3 rm "s3://${BUCKET_APP}/" --recursive` e `aws s3api delete-bucket --bucket "$BUCKET_APP"` (o bucket do app não tem versionamento, então esvaziar basta; o app sai do ar).

### 4.3 Acesso do CloudFront ao bucket (OAC, a permissão que deixa só o CloudFront ler o bucket)
**Objetivo:** o bucket fica fechado ao mundo, e só esta distribuição do CloudFront consegue ler os arquivos dele, assinando cada pedido (a política do bucket, no 4.6, diz quem pode).
```bash
OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config '{"Name":"erp-app-oac","Description":"CloudFront -> bucket do app","SigningProtocol":"sigv4","SigningBehavior":"always","OriginAccessControlOriginType":"s3"}' --query 'OriginAccessControl.Id' --output text)
```
**Conferência:** `aws cloudfront get-origin-access-control --id "$OAC_ID" --query 'OriginAccessControl.OriginAccessControlConfig.[Name,SigningBehavior]' --output text` → `erp-app-oac always`.
**Custo:** grátis. **Desfazer** (só depois de apagar a distribuição, 4.6): `aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$(aws cloudfront get-origin-access-control --id "$OAC_ID" --query ETag --output text)"`.

### 4.4 As políticas gerenciadas do CloudFront, pelo nome (sem ID cravado)
```bash
CACHE_OTIMIZADA_ID=$(aws cloudfront list-cache-policies --type managed --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='CachingOptimized'].CachePolicy.Id" --output text)
CACHE_DESLIGADA_ID=$(aws cloudfront list-cache-policies --type managed --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='CachingDisabled'].CachePolicy.Id" --output text)
REPASSA_TUDO_MENOS_HOST_ID=$(aws cloudfront list-origin-request-policies --type managed --query "OriginRequestPolicyList.Items[?OriginRequestPolicy.OriginRequestPolicyConfig.Name=='AllViewerExceptHostHeader'].OriginRequestPolicy.Id" --output text)
CABECALHOS_SEGUROS_ID=$(aws cloudfront list-response-headers-policies --type managed --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='SecurityHeadersPolicy'].ResponseHeadersPolicy.Id" --output text)
echo "$CACHE_OTIMIZADA_ID $CACHE_DESLIGADA_ID $REPASSA_TUDO_MENOS_HOST_ID $CABECALHOS_SEGUROS_ID"     # 4 IDs, nenhum vazio
```
**Conferência:** o `echo` acima (4 IDs, nenhum vazio). **Desfazer:** não se aplica (só leitura de políticas que a AWS mantém).

### 4.5 A função que faz a SPA (app de página única: o navegador baixa o app uma vez e troca as telas sem recarregar) funcionar, sem mascarar erros da API
**Objetivo:** o app é uma SPA: `/work-orders/123` não é arquivo no bucket, é rota do React. Em vez de "página de erro 404 → index.html" (que também reescreveria um 404 **da API** em HTML 200), uma função de viewer-request devolve `/index.html` só para caminhos sem extensão fora de `/api/`.
```bash
cat > spa.js <<'EOF'
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.startsWith('/api/')) { return request; }
  if (uri.endsWith('/')) { request.uri = '/index.html'; return request; }
  var ultimo = uri.split('/').pop();
  if (ultimo.indexOf('.') === -1) { request.uri = '/index.html'; }
  return request;
}
EOF
FUNCAO_SPA_ARN=$(aws cloudfront create-function --name erp-spa-reescrita --function-config Comment="SPA: rota sem extensao vira /index.html",Runtime=cloudfront-js-2.0 --function-code fileb://spa.js --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
ETAG=$(aws cloudfront describe-function --name erp-spa-reescrita --stage DEVELOPMENT --query ETag --output text)
aws cloudfront publish-function --name erp-spa-reescrita --if-match "$ETAG"
```
**Conferência:** `aws cloudfront describe-function --name erp-spa-reescrita --stage LIVE --query 'FunctionSummary.FunctionMetadata.Stage' --output text` → `LIVE`.
**Custo:** grátis até 2 milhões de execuções/mês. **Desfazer** (só depois de tirar a função da distribuição ou de apagar a distribuição, 4.6): `aws cloudfront delete-function --name erp-spa-reescrita --if-match "$(aws cloudfront describe-function --name erp-spa-reescrita --query ETag --output text)"`.

### 4.6 A distribuição do CloudFront
**Objetivo:** duas origens: o bucket (o app) e `api.<DOMINIO>` (o comportamento `/api/*`, sem cache, repassando tudo menos o `Host`). **Por que a segunda origem:** o frontend usa `VITE_API_BASE_URL`, mas há caminhos relativos cravados em 3 arquivos (`frontend/src/modules/platform/platform-health.service.ts:11` chama `/api/v1/health/ready`; `damages.adapter.ts:112` monta `/api/v1/damages/…`; `frontend/src/services/realtime/pollingClient.ts:23` monta o endereço do fluxo de eventos `/api/v1/events/stream`): sem o `/api/*` no CloudFront eles bateriam no bucket. Pendência P-FRONT-API-BASE-URL para tirar os caminhos cravados; até lá o comportamento cobre. `PriceClass_All` porque só ele inclui as bordas da América do Sul.
```bash
cat > cf-dist.json <<EOF
{
  "CallerReference": "erp-app-$(date +%s)",
  "Comment": "ERP - app web (S3 privado) e proxy /api/* para a API",
  "Enabled": true,
  "PriceClass": "PriceClass_All",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "DefaultRootObject": "index.html",
  "Aliases": { "Quantity": 1, "Items": ["app.${DOMINIO}"] },
  "Origins": { "Quantity": 2, "Items": [
    { "Id": "s3-app", "DomainName": "${BUCKET_APP}.s3.${REGIAO}.amazonaws.com", "OriginPath": "",
      "CustomHeaders": { "Quantity": 0 }, "S3OriginConfig": { "OriginAccessIdentity": "" },
      "OriginAccessControlId": "${OAC_ID}", "ConnectionAttempts": 3, "ConnectionTimeout": 10, "OriginShield": { "Enabled": false } },
    { "Id": "api", "DomainName": "api.${DOMINIO}", "OriginPath": "", "CustomHeaders": { "Quantity": 0 },
      "CustomOriginConfig": { "HTTPPort": 80, "HTTPSPort": 443, "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }, "OriginReadTimeout": 60, "OriginKeepaliveTimeout": 5 },
      "ConnectionAttempts": 3, "ConnectionTimeout": 10, "OriginShield": { "Enabled": false } } ] },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-app", "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
    "Compress": true, "CachePolicyId": "${CACHE_OTIMIZADA_ID}", "ResponseHeadersPolicyId": "${CABECALHOS_SEGUROS_ID}",
    "FunctionAssociations": { "Quantity": 1, "Items": [ { "FunctionARN": "${FUNCAO_SPA_ARN}", "EventType": "viewer-request" } ] } },
  "CacheBehaviors": { "Quantity": 1, "Items": [
    { "PathPattern": "/api/*", "TargetOriginId": "api", "ViewerProtocolPolicy": "https-only",
      "AllowedMethods": { "Quantity": 7, "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
      "Compress": false, "CachePolicyId": "${CACHE_DESLIGADA_ID}", "OriginRequestPolicyId": "${REPASSA_TUDO_MENOS_HOST_ID}" } ] },
  "CustomErrorResponses": { "Quantity": 0 },
  "ViewerCertificate": { "ACMCertificateArn": "${CERT_APP_ARN}", "SSLSupportMethod": "sni-only", "MinimumProtocolVersion": "TLSv1.2_2021" }
}
EOF
read -r CF_ID CF_DOMINIO <<< "$(aws cloudfront create-distribution --distribution-config file://cf-dist.json --query 'Distribution.[Id,DomainName]' --output text)"
cat > bucket-app-policy.json <<EOF
{ "Version": "2012-10-17", "Statement": [ { "Sid": "SoCloudFront", "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" }, "Action": "s3:GetObject", "Resource": "arn:aws:s3:::${BUCKET_APP}/*",
  "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::${CONTA}:distribution/${CF_ID}" } } } ] }
EOF
aws s3api put-bucket-policy --bucket "$BUCKET_APP" --policy file://bucket-app-policy.json
aws cloudfront wait distribution-deployed --id "$CF_ID"      # 5–10 min
printf 'BUCKET_APP=%s\nOAC_ID=%s\nCF_ID=%s\nCF_DOMINIO=%s\n' "$BUCKET_APP" "$OAC_ID" "$CF_ID" "$CF_DOMINIO" >> ~/erp-ids.env
```
**Conferência:** `aws cloudfront get-distribution --id "$CF_ID" --query 'Distribution.[Status,DomainName,DistributionConfig.Aliases.Items[0]]' --output text` → `Deployed d….cloudfront.net app.<DOMINIO>`.
**Desfazer:** desabilitar (`get-distribution-config` → `Enabled:false` → `update-distribution --if-match`), esperar `Deployed`, e `aws cloudfront delete-distribution --id "$CF_ID" --if-match <ETag>`.

### 4.7 Build do frontend apontando para a API e publicação no bucket
**Objetivo:** o app chama `https://api.<DOMINIO>/api/v1`; o `CORS_ORIGIN` da API (3.6) é exatamente `https://app.<DOMINIO>`. Arquivos com hash em cache longo; `index.html` sem cache.
```bash
cd ~/erp 2>/dev/null || git clone --depth 1 --branch main "https://github.com/${GH_DONO}/${GH_REPO}.git" ~/erp
cd ~/erp/frontend && npm ci
VITE_API_BASE_URL="https://api.${DOMINIO}/api/v1" VITE_USE_MOCKS=false NODE_OPTIONS=--max-old-space-size=1536 npm run build
aws s3 sync dist/ "s3://${BUCKET_APP}/" --delete --exclude index.html --cache-control 'public,max-age=31536000,immutable'
aws s3 cp dist/index.html "s3://${BUCKET_APP}/index.html" --cache-control 'no-cache' --content-type 'text/html; charset=utf-8'
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths '/*'
```
(O CloudShell tem 2 GiB de RAM; se o `vite build` morrer por memória, o caminho é o CD: o papel `erp-github-deploy` já pode publicar — 4.8.)
**Conferência:** `aws s3 ls "s3://${BUCKET_APP}/"` → `index.html` e `assets/`; `curl -sS -o /dev/null -w '%{http_code}\n' "https://${CF_DOMINIO}/"` → `200` (ainda pelo nome do CloudFront; o `app.<DOMINIO>` é a fase 5).
**Desfazer:** publicar de novo o build de um SHA anterior (os mesmos comandos, com `git checkout <sha>` antes do `npm ci`); para tirar o app do ar, o desfazer do 4.2.

### 4.8 A política do papel do GitHub (agora que o bucket e a distribuição existem)
```bash
cat > deploy-policy.json <<EOF
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": ["ecs:DescribeServices","ecs:DescribeTaskDefinition","ecs:RegisterTaskDefinition","ecs:UpdateService","ecs:DescribeTasks","ecs:ListTasks"], "Resource": "*" },
  { "Effect": "Allow", "Action": "iam:PassRole", "Resource": ["arn:aws:iam::${CONTA}:role/erp-ecs-execucao", "arn:aws:iam::${CONTA}:role/erp-api-tarefa"] },
  { "Effect": "Allow", "Action": ["s3:PutObject","s3:DeleteObject","s3:ListBucket","s3:GetObject"], "Resource": ["arn:aws:s3:::${BUCKET_APP}", "arn:aws:s3:::${BUCKET_APP}/*"] },
  { "Effect": "Allow", "Action": "cloudfront:CreateInvalidation", "Resource": "arn:aws:cloudfront::${CONTA}:distribution/${CF_ID}" } ] }
EOF
aws iam put-role-policy --role-name erp-github-deploy --policy-name erp-deploy --policy-document file://deploy-policy.json
```
**Conferência:** `aws iam get-role-policy --role-name erp-github-deploy --policy-name erp-deploy --query 'PolicyDocument.Statement[].Action' --output json` → as 4 declarações (ECS, `iam:PassRole`, S3, invalidação). **Desfazer:** `aws iam delete-role-policy --role-name erp-github-deploy --policy-name erp-deploy`.

**Conferência da fase inteira:** `Deployed` e `200` do 4.6/4.7. **O que pode dar errado:**
- `AccessDenied` do bucket pelo CloudFront (a política do bucket com o `CF_ID` errado); tela branca em rota profunda (a função 4.5 não publicada ou não associada); `vite build` sem memória.
- **O fluxo de eventos (SSE, a conexão que fica aberta para a API empurrar novidades ao navegador, como no mapa de operações) cair por inatividade.** O ALB corta uma conexão parada há 60 s (o padrão dele), e, quando a conexão passa pelo CloudFront (caminho relativo `/api/*`), ele espera no máximo 60 s entre um pedaço e outro da resposta (`OriginReadTimeout: 60` do 4.6). Hoje isso não deve acontecer: a API manda um sinal de vida a cada 25 s (`src/modules/field-ops-realtime/field-ops-realtime.routes.ts`, `keepAliveIntervalMs = 25_000`), e o mapa reconecta sozinho e mantém a atualização a cada 30 s enquanto isso. Se, mesmo assim, o log ou o usuário mostrar quedas e o cliente não reconectar, suba o tempo do ALB:
  ```bash
  aws elbv2 modify-load-balancer-attributes --load-balancer-arn "$ALB_ARN" --attributes Key=idle_timeout.timeout_seconds,Value=120
  aws elbv2 describe-load-balancer-attributes --load-balancer-arn "$ALB_ARN" --query "Attributes[?Key=='idle_timeout.timeout_seconds'].Value" --output text     # 120
  ```
  (desfazer: o mesmo comando com `Value=60`). No CloudFront, o `OriginReadTimeout` da origem `api` aceita até 120 s sem pedido à AWS (acima disso, só com aumento de cota da conta): o caminho é `aws cloudfront get-distribution-config --id "$CF_ID"` → trocar o `OriginReadTimeout` da origem `api` no JSON → `aws cloudfront update-distribution --id "$CF_ID" --distribution-config file://… --if-match <ETag>`, o mesmo caminho do desfazer do 4.6. A edição do JSON fica descrita, não pronta, até ser medida: pendência P-AWS-SSE-TIMEOUT (§10).

---

## 8. Fase 5 · DNS próprio — "o meu endereço com o nome do meu sistema"

**Pré-requisitos:** Fases 3 e 4 (a zona do Route 53, o certificado da API e o registro `api.<DOMINIO>` nascem antecipados na fase 3; o certificado do app e a distribuição do CloudFront, na fase 4); o login do painel do registrador do domínio em mãos (0.8); `dig` instalado no CloudShell para o 5.7 (`sudo dnf install -y bind-utils`). **Terminal:** CloudShell normal.

### 8.1 Como o seu nome chega ao sistema (em língua de dono)
1. **O domínio** (`<DOMINIO>`) é seu no **registrador** (registro.br, GoDaddy…). O registrador só guarda uma coisa que importa aqui: **quais servidores DNS respondem pelo seu nome**.
2. **A zona hospedada** no Route 53 é "o caderno" onde ficam os registros do seu domínio. Ela nasce com **4 servidores de nome** (NS). Você cadastra esses 4 no registrador (passo 5.2) e, a partir daí, quem perguntar "onde fica `api.<DOMINIO>`?" é respondido pela AWS.
3. **Os registros**: `api.<DOMINIO>` → o balanceador (ALB) e `app.<DOMINIO>` → o CloudFront. Não são IPs: são **alias** — um registro que diz "a resposta é o que o ALB responder agora". É assim que o seu nome acompanha a AWS mesmo quando os IPs dela mudam.
4. **O certificado** (HTTPS) é validado por um CNAME na zona (feito nos passos 3.3 e 4.1). O da API vive em `sa-east-1`; o do app em `us-east-1`, porque o CloudFront só aceita certificado de lá.
5. **HTTPS obrigatório:** quem bater na porta 80 recebe `301` para a 443 (3.4); o CloudFront redireciona também (4.6). É o `force_https` que a Fly fazia.

**Por que o ALB não tem IP fixo.** O ALB é um conjunto de máquinas da AWS que cresce e troca de lugar; os IPs públicos dele **mudam** com o tempo. Apontar `api.<DOMINIO>` para um IP seria quebrar em semanas. O **alias** resolve: o nome aponta para o ALB, e o ALB responde com os IPs do momento. Para o usuário final e para o app, nada muda.

**Quando um IP fixo é mesmo necessário.** Só quando alguém **do outro lado** precisa cadastrar o seu IP numa lista de permissão: o firewall de um cliente que só aceita chamadas de IPs conhecidos, um parceiro (banco, provedor fiscal) que exige "IP de origem" fixo para webhooks ou integrações. Se nenhum parceiro pediu, não há por que pagar por isso. (Nota: o caminho inverso — a API chamando o Asaas ou outros — sai sempre pelo IP público do NAT. Ele só é **fixo** porque o NAT usa um **Elastic IP** (um IP público reservado na sua conta): o NAT gateway (opção B) nasce com um, e a instância NAT (opção A) recebe um no passo 1.5. Sem o Elastic IP, o IP automático da instância **muda a cada parada e partida** dela. Com ele, cobre a lista de permissão de parceiros que olham o IP de **origem**.)

**As duas saídas, se precisar (D-AWS-03):**

| Opção | O que é | Custo adicional/mês | A favor | Contra |
|---|---|---|---|---|
| **NLB com Elastic IP** na frente do ALB | um Network Load Balancer com 1 IP fixo por zona (2 IPs), passando o tráfego ao ALB atual | NLB US$ 0,034/h ≈ 24,8 + 2 IPv4 (7,3) + LCU ≈ **US$ 32–35** | IPs seus para sempre; mantém o ALB (301, regras, health check HTTP) | mais uma peça; o estudo não o previu |
| **Global Accelerator** | 2 IPs anycast (o mesmo IP anunciado em vários pontos do mundo, e o usuário entra pelo mais próximo) globais fixos apontando para o ALB | US$ 0,025/h ≈ **US$ 18,25** + taxa por GB (DT-Premium, a taxa extra por GB que passa pela rede da AWS em vez da internet comum) | 2 IPs fixos, entrada pela borda mais próxima do usuário | taxa por tráfego; o ALB continua existindo (não é substituto) |

**Recomendação:** começar com o **alias no ALB** (custo zero a mais) e só decidir o IP fixo quando um cliente ou parceiro pedir por escrito. **Pergunta ao dono (D-AWS-03):** *"Algum cliente ou parceiro exige IP fixo de entrada para a API? Se sim, NLB+EIP (~US$ 33) ou Global Accelerator (~US$ 18 + tráfego)?"* Padrão sem resposta: sem IP fixo.

Os comandos das duas opções, validados, para quando a decisão vier:
```bash
# NLB com IP fixo por zona (IPs alocados antes; o ALB vira alvo do NLB num target group do tipo alb — bloco próprio)
EIP_A=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text); EIP_B=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws elbv2 create-load-balancer --name erp-nlb --type network --scheme internet-facing --subnet-mappings "SubnetId=${SUB_PUB_A},AllocationId=${EIP_A}" "SubnetId=${SUB_PUB_B},AllocationId=${EIP_B}" --query 'LoadBalancers[0].DNSName' --output text
# Global Accelerator (a API dele vive em us-west-2)
aws globalaccelerator create-accelerator --name erp-api --ip-address-type IPV4 --enabled --region us-west-2 --query 'Accelerator.[AcceleratorArn,IpSets[0].IpAddresses]' --output text
```
**Desfazer:** o NLB, `aws elbv2 delete-load-balancer --load-balancer-arn <arn do erp-nlb>`, e depois os dois IPs, `aws ec2 release-address --allocation-id "$EIP_A"` e `aws ec2 release-address --allocation-id "$EIP_B"` (IP solto também é cobrado, e um IP devolvido não volta: o parceiro teria de cadastrar outro). O Global Accelerator precisa ser desligado antes de apagado: `aws globalaccelerator update-accelerator --accelerator-arn <arn> --no-enabled --region us-west-2` e, depois que o estado sair de `IN_PROGRESS`, `aws globalaccelerator delete-accelerator --accelerator-arn <arn> --region us-west-2`.

### 8.2 Passos

```bash
set -a; . ~/erp-ids.env; set +a
```

**5.1 A zona** — já criada no 3.3. Se estiver começando por aqui: `aws route53 create-hosted-zone --name "$DOMINIO" --caller-reference "erp-$(date +%s)" --hosted-zone-config Comment="ERP: zona publica" --query 'HostedZone.Id' --output text`. Conferência: `aws route53 list-hosted-zones-by-name --dns-name "$DOMINIO" --query 'HostedZones[0].[Id,Name]' --output text`. **Custo:** US$ 0,50/mês + US$ 0,40 por milhão de consultas (consultas a alias de ALB/CloudFront são grátis). **Desfazer:** o do 3.3.

**5.2 Os 4 servidores de nome no registrador — só no console do registrador (ato do dono)**
```bash
aws route53 get-hosted-zone --id "$ZONA_ID" --query 'DelegationSet.NameServers' --output text     # 4 nomes ns-….awsdns-….(com|net|org|co.uk)
```
- **registro.br** (`.com.br`): entre no painel → o domínio → **DNS** → **Alterar servidores DNS** → "Utilizar outros servidores DNS" → cole os 4 → salvar. O registro.br publica em minutos a poucas horas.
- Outros registradores: "Nameservers / Servidores DNS → Custom → os 4 nomes".
- **Desfazer:** no mesmo painel, voltar aos servidores DNS de antes (anote-os antes de trocar). O sistema deixa de responder pelo seu nome quando o mundo enxergar a troca.
- Se o domínio estiver **registrado no Route 53 Domains** (só TLDs que a AWS ainda registra; `.com.br` não): `aws route53domains update-domain-nameservers --region us-east-1 --domain-name "$DOMINIO" --nameservers Name=<ns1> Name=<ns2> Name=<ns3> Name=<ns4>`; conferência `aws route53domains get-domain-detail --region us-east-1 --domain-name "$DOMINIO" --query 'Nameservers[].Name' --output text`; `aws route53domains list-domains --region us-east-1 --query 'Domains[].DomainName' --output text` lista o que você tem lá; `aws route53domains check-domain-availability --region us-east-1 --domain-name <nome>` consulta disponibilidade; `aws route53domains get-operation-detail --region us-east-1 --operation-id <id>` acompanha uma operação.

**5.3 Validação dos certificados** — feita em 3.3 e 4.1 (`ISSUED`).

**5.4 `api.<DOMINIO>`** — feito em 3.5. **5.5 `app.<DOMINIO>` → CloudFront (A e AAAA):**
```bash
cat > rr-app.json <<EOF
{ "Comment": "app -> CloudFront (alias A e AAAA)", "Changes": [
  { "Action": "UPSERT", "ResourceRecordSet": { "Name": "app.${DOMINIO}.", "Type": "A",
    "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "${CF_DOMINIO}", "EvaluateTargetHealth": false } } },
  { "Action": "UPSERT", "ResourceRecordSet": { "Name": "app.${DOMINIO}.", "Type": "AAAA",
    "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "${CF_DOMINIO}", "EvaluateTargetHealth": false } } } ] }
EOF
MUDANCA=$(aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-app.json --query 'ChangeInfo.Id' --output text)
aws route53 wait resource-record-sets-changed --id "$MUDANCA"
aws route53 get-change --id "$MUDANCA" --query 'ChangeInfo.Status' --output text     # INSYNC
```
(`Z2FDTNDATAQYW2` é o ID fixo que a Route 53 define para todo alias de CloudFront; para o ALB, o ID é o `CanonicalHostedZoneId` lido em 3.4.)
**Desfazer:** `sed 's/"UPSERT"/"DELETE"/' rr-app.json > rr-app-del.json` e `aws route53 change-resource-record-sets --hosted-zone-id "$ZONA_ID" --change-batch file://rr-app-del.json` (apaga o A e o AAAA de `app.`).

**5.6 O que a zona responde (visto de dentro da AWS):**
```bash
aws route53 list-resource-record-sets --hosted-zone-id "$ZONA_ID" --query 'ResourceRecordSets[].[Name,Type,AliasTarget.DNSName,ResourceRecords[0].Value]' --output table
aws route53 test-dns-answer --hosted-zone-id "$ZONA_ID" --record-name "api.${DOMINIO}" --record-type A
aws route53 test-dns-answer --hosted-zone-id "$ZONA_ID" --record-name "app.${DOMINIO}" --record-type A
```
**Conferência:** a tabela mostra `api.` e `app.` com o alias, e os dois `test-dns-answer` respondem `NOERROR`. **Desfazer:** não se aplica (só leitura).

**5.7 Propagação e TTL (visto de fora).** `dig` não vem no CloudShell: `sudo dnf install -y bind-utils`.
```bash
dig +short NS "$DOMINIO"                          # os 4 ns-….awsdns-… → o registrador já publicou
dig +short "api.${DOMINIO}" A                      # 2 IPs (os do ALB, mudam com o tempo: é normal)
dig +short "app.${DOMINIO}" A                      # IPs do CloudFront
dig @"$(dig +short NS "$DOMINIO" | head -1)" "api.${DOMINIO}" A +short    # a resposta direto do servidor da zona
dig +trace "api.${DOMINIO}" | tail -5              # o caminho raiz → .br → sua zona
nslookup -type=NS "$DOMINIO"                       # o mesmo, pela ferramenta do Windows/Linux
```
- **TTL** é por quanto tempo cada provedor guarda a resposta. Alias para ALB/CloudFront usa o TTL do alvo (60 s): mudanças aparecem em ~1 min. A troca de **NS no registrador** é a parte lenta: horas, raramente até 48 h, porque o TTL dos NS antigos é longo. Enquanto o `dig +short NS` mostrar os servidores antigos, espere.
- **Desfazer:** não se aplica (só leitura).

**5.8 HTTPS de ponta a ponta:**
```bash
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://api.${DOMINIO}/"      # 301 https://api.<DOMINIO>/
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://app.${DOMINIO}/"      # 301 https://app.<DOMINIO>/
curl -sS "https://api.${DOMINIO}/api/v1/health/ready"                                   # {"status":"ready"...}
curl -sS -o /dev/null -w '%{http_code}\n' "https://app.${DOMINIO}/"                     # 200
curl -sS -o /dev/null -w '%{http_code}\n' "https://app.${DOMINIO}/work-orders"          # 200 (a função da SPA)
curl -sS -o /dev/null -w '%{http_code}\n' "https://app.${DOMINIO}/api/v1/health"        # 200 (o /api/* chega à API pelo CloudFront)
openssl s_client -connect "api.${DOMINIO}:443" -servername "api.${DOMINIO}" </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -enddate
openssl s_client -connect "app.${DOMINIO}:443" -servername "app.${DOMINIO}" </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -enddate
```
`subject=CN=api.<DOMINIO>`, `issuer=…Amazon…`, `notAfter` ~13 meses adiante (o ACM renova sozinho enquanto o CNAME de validação existir — não apague os CNAMEs `_xxxx.api.<DOMINIO>`). **Desfazer:** não se aplica (só leitura).

**5.9 A pergunta do IP fixo** — D-AWS-03, acima.

**Conferência da fase inteira:** 5.7 mostra os NS da AWS; 5.8 tudo 200/301 com certificado da Amazon. **Custo:** ~US$ 1/mês. **O que pode dar errado:** NS antigos ainda em cache (espere); `api.` responde mas `app.` dá `403` do CloudFront (a alias `app.<DOMINIO>` não está em `Aliases` da distribuição ou o certificado não cobre o nome); `curl` para `app./api/v1/health` dá `502` (o CloudFront não alcança `api.<DOMINIO>` em HTTPS: o 3.5 não propagou ainda).

---

## 9. Fase 6 · Go-live

**Pré-requisitos:** Fases 0–5. **Custo:** S3 de anexos ~US$ 1–2 · SNS/alarmes ~0 (10 alarmes grátis) · snapshot manual US$ 0,095/GB-mês.

```bash
set -a; . ~/erp-ids.env; set +a
export BUCKET_ANEXOS="erp-anexos-${CONTA}"
```

### 6.1 S3 de anexos (`CHECKLIST_STORAGE_PROVIDER=s3`)
**Objetivo:** anexos de checklist, evidências e comprovantes vão para um bucket **privado, com SSE e versionamento, só por TLS e sem regra de ciclo de vida** sob o prefixo `checklist-attachments/` (regras de `docs/deployment.md`). A credencial é o **papel da tarefa** (3.2), nunca chave em variável.
```bash
aws s3api create-bucket --bucket "$BUCKET_ANEXOS" --region "$REGIAO" --create-bucket-configuration LocationConstraint="$REGIAO"
aws s3api put-public-access-block --bucket "$BUCKET_ANEXOS" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET_ANEXOS" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-bucket-versioning --bucket "$BUCKET_ANEXOS" --versioning-configuration Status=Enabled
cat > bucket-anexos-policy.json <<EOF
{ "Version": "2012-10-17", "Statement": [ { "Sid": "SoTLS", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
  "Resource": ["arn:aws:s3:::${BUCKET_ANEXOS}", "arn:aws:s3:::${BUCKET_ANEXOS}/*"],
  "Condition": { "Bool": { "aws:SecureTransport": "false" } } } ] }
EOF
aws s3api put-bucket-policy --bucket "$BUCKET_ANEXOS" --policy file://bucket-anexos-policy.json
cat > tarefa-s3.json <<EOF
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:AbortMultipartUpload"], "Resource": "arn:aws:s3:::${BUCKET_ANEXOS}/checklist-attachments/*" },
  { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::${BUCKET_ANEXOS}", "Condition": { "StringLike": { "s3:prefix": "checklist-attachments/*" } } } ] }
EOF
aws iam put-role-policy --role-name erp-api-tarefa --policy-name erp-anexos-s3 --policy-document file://tarefa-s3.json
echo "BUCKET_ANEXOS=$BUCKET_ANEXOS" >> ~/erp-ids.env
```
Agora no `taskdef.json` (3.6) troque `CHECKLIST_STORAGE_PROVIDER` para `s3` e acrescente em `environment`:
`CHECKLIST_STORAGE_S3_BUCKET=<BUCKET_ANEXOS>`, `CHECKLIST_STORAGE_S3_REGION=sa-east-1`, `CHECKLIST_STORAGE_S3_ENDPOINT=https://s3.sa-east-1.amazonaws.com` (explícito, como o portão do comprovante exige), `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE=false`, `CHECKLIST_STORAGE_S3_PREFIX=checklist-attachments`. Registre a revisão e atualize o serviço (3.10).
**Conferência:** `aws s3api get-bucket-versioning --bucket "$BUCKET_ANEXOS"` → `Enabled`; `aws s3api get-bucket-encryption --bucket "$BUCKET_ANEXOS"` → `AES256`; `aws s3api get-bucket-policy --bucket "$BUCKET_ANEXOS" --query Policy --output text | jq .Statement[0].Sid` → `"SoTLS"`. Com o antivírus da Fase 3b no ar (`EVIDENCE_SCANNER=clamav`), o upload grava aqui; sem ele (`unavailable`), todo upload responde 503 e nada é gravado.
**Desfazer:** em produção, **nunca** com anexo dentro (o bucket guarda evidência e comprovante). Antes do 1º anexo real, com o bucket vazio: voltar `CHECKLIST_STORAGE_PROVIDER=local` no `taskdef.json` e atualizar o serviço (3.10), `aws iam delete-role-policy --role-name erp-api-tarefa --policy-name erp-anexos-s3` e `aws s3api delete-bucket --bucket "$BUCKET_ANEXOS"` (com versionamento ligado, ele só apaga se não houver versão nenhuma guardada; se recusar, o bucket não está vazio e o caso vai ao dono).

### 6.2 O 1º administrador de plataforma (Runbook B, `B-SAN3-09`) — item 43 do portão
**Terminal:** CloudShell em VPC, no `~/erp` com `npm ci` (2.5), com as variáveis `PG*` do 2.4 e `PGPASSWORD` do administrador do banco (é o migrador que roda o bootstrap).
```bash
psql -Atc "select count(*) from roles where key='super_admin' and tenant_id is null"      # 1 (pré-condição)
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/${PGDATABASE}?schema=public&sslmode=require"
read -rs -p "Senha do admin de plataforma: " SENHA; echo
printf '%s\n' "$SENHA" | NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 PLATFORM_ADMIN_EMAIL='<e-mail do admin>' npx tsx scripts/bootstrap-platform-admin.ts --password-stdin --dry-run
printf '%s\n' "$SENHA" | NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 PLATFORM_ADMIN_EMAIL='<e-mail do admin>' npx tsx scripts/bootstrap-platform-admin.ts --password-stdin
unset SENHA
```
**Saída esperada:** `CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.` (exit 0). `--reset-password` se perder a senha. **O login pela web sem organização** exige o runbook `B-O6R-01` (`GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime`, decisão em ata — D-AWS-07); sem ele, a tela responde 401 e o login é com `tenantId`.
**O 1º tenant real** (a sua empresa) é criado por esse administrador na console da plataforma (Organizações). Com o ID da organização em mãos, troque o `PORTAL_TENANT_ID` provisório (D-AWS-06):
```bash
umask 077; TMP=$(mktemp -d)
aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text | jq --arg t "<id da organizacao>" '.PORTAL_TENANT_ID=$t' > "$TMP/api.json"
aws secretsmanager put-secret-value --secret-id erp/prod/api --secret-string "file://$TMP/api.json"; shred -u "$TMP/api.json"
aws ecs update-service --cluster erp-prod --service erp-api --force-new-deployment --query 'service.status' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
```
**Conferência:** a saída `CONVERGIDO` acima, e `aws secretsmanager get-secret-value --secret-id erp/prod/api --query SecretString --output text | jq -r .PORTAL_TENANT_ID` → o ID da organização (não `pendente-runbook-b`).
**Desfazer:** o administrador não se apaga por comando (o script só cria ou converge; perdeu a senha, `--reset-password`). O `PORTAL_TENANT_ID` volta à versão anterior pelo `AWSPREVIOUS`, como no desfazer do 2.10, seguido do `--force-new-deployment`.

### 6.3 Leitura da plataforma sob o papel sem bypass — item 10 do portão
A senha nunca aparece no comando nem no histórico: entra por `read -rs`, vai para um arquivo temporário (o `printf` é do próprio bash, não cria processo com a senha no argumento), o `jq` monta o corpo lendo esse arquivo (`--rawfile`) e o `curl` envia o corpo pelo arquivo (`-d @arquivo`). O login responde `{"data":{…,"accessToken":"…"}}`, por isso o caminho é `.data.accessToken`.
```bash
umask 077; TMP=$(mktemp -d)
read -rs -p "Senha do admin de plataforma: " SENHA; echo
printf '%s' "$SENHA" > "$TMP/senha"; unset SENHA
jq -n --arg e '<e-mail do admin>' --arg t '<id da organizacao de sistema>' --rawfile p "$TMP/senha" '{email:$e, password:$p, tenantId:$t}' > "$TMP/login.json"
shred -u "$TMP/senha"
TOKEN=$(curl -sS -X POST "https://api.${DOMINIO}/api/v1/auth/login" -H 'content-type: application/json' -d @"$TMP/login.json" | jq -r .data.accessToken)
shred -u "$TMP/login.json"
test -n "$TOKEN" && test "$TOKEN" != null && echo "login ok"      # se sair nada: senha, e-mail ou tenantId errado (401)
curl -sS -H "Authorization: Bearer ${TOKEN}" "https://api.${DOMINIO}/api/v1/platform/cloud-usage/summary" | jq .
unset TOKEN
```
A resposta soma as organizações (não zera) → fecha `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`. (O formato do corpo de resposta é o do `API_CONTRACTS.md`.)
**Desfazer:** não se aplica (só leitura; o token vence sozinho).

### 6.4 Snapshot manual e o drill de rollback cronometrado (imagem N−1)
```bash
aws rds create-db-snapshot --db-instance-identifier "$DB_ID" --db-snapshot-identifier "erp-prod-pre-golive-$(date -u +%Y%m%d)" --query 'DBSnapshot.Status' --output text
aws rds wait db-snapshot-available --db-snapshot-identifier "erp-prod-pre-golive-$(date -u +%Y%m%d)"
INICIO=$(date +%s)
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api:<N-1> --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
curl -sS "https://api.${DOMINIO}/api/v1/health/ready"                         # ready na imagem anterior
aws ecs update-service --cluster erp-prod --service erp-api --task-definition erp-api:<N> --query 'service.taskDefinition' --output text
aws ecs wait services-stable --cluster erp-prod --services erp-api
echo "rollback + volta: $(( $(date +%s) - INICIO )) s"
```
Anote o tempo na ata de go-live (é a atestação `rollback_rehearsed` da trava (c)). Lembre a restrição vigente de `docs/deployment.md`: entre imagens que já contêm o 03a, rollback só com um escritor por vez; para destino anterior ao 03a, só fix-forward. Migrações **não** voltam: só aditivas.
**Desfazer:** o próprio passo volta à revisão N. O snapshot manual custa enquanto existir; apague-o só quando outro mais novo o substituir: `aws rds delete-db-snapshot --db-snapshot-identifier erp-prod-pre-golive-<data>`.

### 6.5 Alertas (SNS por e-mail + CloudWatch)
```bash
TOPICO_ARN=$(aws sns create-topic --name erp-alertas --query TopicArn --output text)
aws sns subscribe --topic-arn "$TOPICO_ARN" --protocol email --notification-endpoint "<EMAIL_ALERTA>"     # confirme o e-mail que chegar (ato do dono)
ALB_SUFIXO=${ALB_ARN#*:loadbalancer/}; TG_SUFIXO=${TG_ARN#*:}
cat > alarme-5xx.json <<EOF
{ "AlarmName": "erp-api-5xx", "Namespace": "AWS/ApplicationELB", "MetricName": "HTTPCode_Target_5XX_Count",
  "Dimensions": [ { "Name": "LoadBalancer", "Value": "${ALB_SUFIXO}" } ],
  "Statistic": "Sum", "Period": 300, "EvaluationPeriods": 1, "Threshold": 5, "ComparisonOperator": "GreaterThanOrEqualToThreshold",
  "TreatMissingData": "notBreaching", "AlarmActions": [ "${TOPICO_ARN}" ] }
EOF
aws cloudwatch put-metric-alarm --cli-input-json file://alarme-5xx.json
aws cloudwatch put-metric-alarm --alarm-name erp-api-sem-alvo-saudavel --namespace AWS/ApplicationELB --metric-name HealthyHostCount --dimensions Name=TargetGroup,Value="$TG_SUFIXO" Name=LoadBalancer,Value="$ALB_SUFIXO" --statistic Minimum --period 60 --evaluation-periods 3 --threshold 1 --comparison-operator LessThanThreshold --treat-missing-data breaching --alarm-actions "$TOPICO_ARN"
aws cloudwatch put-metric-alarm --alarm-name erp-rds-disco-baixo --namespace AWS/RDS --metric-name FreeStorageSpace --dimensions Name=DBInstanceIdentifier,Value="$DB_ID" --statistic Minimum --period 300 --evaluation-periods 1 --threshold 3000000000 --comparison-operator LessThanThreshold --treat-missing-data notBreaching --alarm-actions "$TOPICO_ARN"
```
**Conferência:** `aws sns list-subscriptions-by-topic --topic-arn "$TOPICO_ARN" --query 'Subscriptions[].SubscriptionArn' --output text` → um ARN (não `PendingConfirmation`); `aws cloudwatch describe-alarms --alarm-names erp-api-5xx erp-api-sem-alvo-saudavel erp-rds-disco-baixo --query 'MetricAlarms[].[AlarmName,StateValue]' --output text` → 3 linhas `OK`/`INSUFFICIENT_DATA`. **Desfazer:** `aws cloudwatch delete-alarms --alarm-names erp-api-5xx erp-api-sem-alvo-saudavel erp-rds-disco-baixo` e `aws sns delete-topic --topic-arn "$TOPICO_ARN"` (apaga também a assinatura do e-mail). O `uptime-check.yml` do repositório continua valendo: `vars.PROD_HEALTH_URL=https://api.<DOMINIO>/api/v1/health` e `PROD_WORKER_HEALTH_URL=https://api.<DOMINIO>/api/v1/health/worker`.

### 6.6 Orçamento e custo conferidos
```bash
aws budgets describe-budget --account-id "$CONTA" --budget-name erp-producao-mensal --query 'Budget.[BudgetLimit.Amount,CalculatedSpend.ActualSpend.Amount,CalculatedSpend.ForecastedSpend.Amount]' --output text
aws ce get-cost-and-usage --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%F) --granularity MONTHLY --metrics UnblendedCost --query 'ResultsByTime[0].Total.UnblendedCost.Amount' --output text
```
**Conferência:** o limite `350`, o gasto do mês e a previsão abaixo do limite; se a previsão passar, o alerta de 100 % da previsão (0.7) já terá chegado. **Desfazer:** não se aplica (só leitura).

### 6.7 O checklist de go-live (`docs/go-live-readiness.md` §3), reescrito para a AWS
1. Chave Google Maps exposta: **revogada/rotacionada** no Google Cloud Console e a nova restrita por referer (item 0 do go-live-readiness; continua pendente até o dono confirmar).
2. R1 ratificado: dado no Brasil → `sa-east-1` (feito pela `D-INFRA-PROVIDER-AWS`).
3. Conta AWS + cartão + MFA + administrador (Fase 0) — contratação de serviço pago: **junta de 5 unânime + PD** registradas antes da primeira cobrança (`D-SAN-AUTONOMIA`, etapa 1 do estudo).
4. Fundação, banco (PITR 7 dias, UTC, TLS), papel de runtime sem bypass, Valkey (Fases 1–2).
4b. Antivírus no ar e o upload sem 503 (Fase 3b, item 27); Traccar privado com a ponte para a ingestão provada pela quarentena do teste (Fase 3c). A porta dos rastreadores (Fase 3d) só com o modelo de ameaças do `G-TRC-NLB` e a junta de 5 unânime.
5. Domínio + DNS: zona, NS no registrador, `api.` e `app.`, certificados ACM, HTTPS (Fases 3–5).
6. Segredos: tudo no Secrets Manager (`erp/prod/api`), nenhum no GitHub Environment além do que o CD futuro precisar (`AWS_ROLE_ARN` do OIDC não é segredo).
7. S3 de anexos privado + SSE + versionamento + TLS-only (6.1); **backup `pg_dump` → S3** do `backup-database.yml`: o runner do GitHub não alcança o RDS privado — até o `B-INFRA-AWS-03` dar o caminho (pendência P-AWS-BACKUP-PGDUMP), a cópia é o PITR + snapshot manual (6.4) e o RPO ≤ 5 min do RDS.
8. Staging: não existe neste roteiro (decisão do estudo: depois); a trava (b) do CD continua vácua até existir.
9. R2: drill de restore cronometrado **com dado real** (repetir 2.11 antes de abrir ao público) — RTO/RPO na ata.
10. Ata de go-live `J-SAN-PROD-GOLIVE-<sha>.md` na `main` → o deploy (3.10) do SHA aprovado.
11. Follow-up: `VALIDATE CONSTRAINT work_orders_cancelled_decision_check` quando houver zero `cancelled+NULL`.
12. `vars.PROD_HEALTH_URL`/`PROD_WORKER_HEALTH_URL` → o `uptime-check` acorda.

### 6.8 O que fica para depois (e já tem lugar reservado)
- **Traccar e ClamAV saíram desta lista** (decisão do dono, 17/11): são as Fases 3b e 3c. A porta pública dos rastreadores é a Fase 3d, que **fica fechada até o gate `G-TRC-NLB`** (modelo de ameaças + junta de 5 unânime).
- **Rastreadores por rede privada da operadora (APN/VPN):** a saída preferida pelo plano do Traccar quando a operadora oferecer; elimina a porta pública da 3d.
- **Imagens ARM do ClamAV e do Traccar** (P-AWS-CLAMAV-ARM64, P-AWS-TRACCAR-ARM64) e a imagem do ClamAV com o `clamd.conf` embutido (P-AWS-CLAMAV-IMAGEM), em vez da configuração por variável do 3b.3.
- **CD GitHub Actions para a AWS (`B-INFRA-AWS-03`):** o papel `erp-github-deploy` e o OIDC já existem; o workflow reescreve `deploy-production.yml` (migração por imagem migradora, `update-service`, build do frontend, `s3 sync`, invalidation, smoke).
- **Staging** (metade do tamanho, desligável): ~US$ 80–120/mês, quando o dono decidir.

**Conferência da fase inteira:** `CONVERGIDO` do bootstrap; `cloud-usage/summary` somando; `Enabled`/`AES256`/`SoTLS` do bucket; 3 alarmes; tempo de rollback anotado; snapshot `available`.

**O que pode dar errado:**
- O bootstrap do 6.2 recusar em produção: falta `ALLOW_PROD_BOOTSTRAP=1` ou `PLATFORM_ADMIN_EMAIL`, ou o `super_admin` de plataforma não existe (rode o 2.7 de novo e confira o `count = 1`). O `--dry-run` mostra o que faria sem gravar: rode-o sempre antes.
- O login do 6.3 devolver 401: senha, e-mail ou `tenantId` errado (o `tenantId` é o da organização de sistema que o bootstrap criou). Sem o runbook `B-O6R-01` (D-AWS-07), o login sem organização não existe: é com `tenantId`.
- O `cloud-usage/summary` voltar zerado com organizações criadas: é o sinal de que a leitura da plataforma não passa sob o papel sem bypass; o item 10 **não** fecha, e o caso vai ao dono com a resposta guardada.
- Depois de trocar o `PORTAL_TENANT_ID` (6.2) ou o `taskdef` (6.1), o serviço não estabilizar: veja os eventos (`describe-services`, 3.8) e o log; `Failed to start` nomeando uma variável é portão do `env.ts`.
- O rollback do 6.4 cruzar a restrição do 03a (`docs/deployment.md`): rollback só com um escritor por vez; para uma imagem anterior ao 03a, só correção para frente. As migrações não voltam.
- A assinatura do SNS ficar `PendingConfirmation`: o e-mail de confirmação caiu no spam ou não foi clicado; sem confirmar, os alarmes disparam e ninguém recebe.
- Todo upload responder 503 (anexos, evidências): o antivírus da Fase 3b está fora do ar, a base de vírus passou de 72 h, ou a API ainda roda com `EVIDENCE_SCANNER=unavailable` (veja "o que pode dar errado" da 3b); não é defeito do bucket.

---

## 10. Pendências que este roteiro abre (para `agent-orchestration/controle/pendencias.md`, no bloco de infra)

| ID | O que | Dono sugerido |
|---|---|---|
| P-AWS-IMAGEM-ARM64 | o job `docker` do `ci.yml` publica só `amd64`; acrescentar `platforms: linux/amd64,linux/arm64` e trocar `cpuArchitecture` para `ARM64` (−US$ 6/mês) | `B-INFRA-AWS-03` |
| P-AWS-MIGRADOR | a imagem de runtime não tem `prisma`, `tsx` nem `prisma.config.ts`; o CD precisa de uma imagem migradora (ou alvo `migrator` no `Dockerfile`) para `aws ecs run-task` rodar `prisma migrate deploy` e `db:provision-rbac` dentro da VPC | `B-INFRA-AWS-03` |
| P-AWS-BACKUP-PGDUMP | `backup-database.yml` roda no runner do GitHub e não alcança o RDS privado; decidir: tarefa ECS agendada (`EventBridge Scheduler` + `run-task`) ou só PITR + snapshots | `B-INFRA-AWS-02` |
| P-AWS-VALKEY-TLS | medir se `REDIS_URL=rediss://` funciona no app (cliente Redis + jobs) e ligar `--transit-encryption-enabled` no Valkey | `B-INFRA-AWS-02` |
| P-FRONT-API-BASE-URL | 3 arquivos usam `/api/v1` relativo em vez de `VITE_API_BASE_URL`: `platform-health.service.ts:11`, `damages.adapter.ts:112` e `services/realtime/pollingClient.ts:23` (fluxo de eventos `/api/v1/events/stream`); até corrigir, o comportamento `/api/*` do CloudFront cobre | frontend |
| P-AWS-SSE-TIMEOUT | o fluxo de eventos (SSE) fica aberto por muito tempo; o ALB corta conexão parada há 60 s e o CloudFront, como está no 4.6, espera no máximo 60 s entre pedaços da resposta (`OriginReadTimeout: 60`; aceita até 120 s, acima disso só com aumento de cota). Hoje a API manda um sinal de vida a cada 25 s e o mapa reconecta; se a medição em produção mostrar quedas, subir o tempo do ALB (o comando está em "o que pode dar errado" da Fase 4) e escrever e validar a edição do `OriginReadTimeout` do CloudFront | `B-INFRA-AWS-03` |
| P-AWS-PORTAL-TENANT | `PORTAL_TENANT_ID` provisório até o 1º tenant; definir o processo (6.2) e o valor do `PORTAL_CORS_ORIGIN` do portal | `B-INFRA-AWS-03` |
| P-AWS-IP-FIXO | a decisão D-AWS-03 e, se vier, o bloco do NLB+EIP ou do Global Accelerator | dono |
| P-AWS-CLAMAV-ARM64 | a imagem `clamav/clamav:1.4.6` fixada no `B-AV-REAL` só tem `amd64`; medir a tag `-debian` (que tem `arm64`) e o digest dela para a 3b rodar em ARM (−US$ 8/mês) | `B-INFRA-AWS-03` |
| P-AWS-CLAMAV-IMAGEM | a 3b.3 entrega o `clamd.conf` por variável e grava o arquivo no início do contêiner; o caminho limpo é uma imagem derivada (`FROM` o digest fixado + `COPY infra/clamav/clamd.conf`) publicada pelo CI | `B-INFRA-AWS-03` |
| P-AWS-TRACCAR-ARM64 | a imagem `traccar/traccar:6.16.0` tem `arm64`; o estudo fixou x86; trocar economiza ~US$ 7/mês, depois de medir em staging | `B-TRC-06` |
| P-TRC02-STATUS-TIMEOUT-PROD | o estado online/sem sinal (`EVENT_STATUS_ENABLE`, `STATUS_TIMEOUT`) ficou fora da receita de produção do 3c.6 | `B-TRC-06` |
| G-TRC-NLB | o modelo de ameaças e a junta de 5 unânime que destravam a Fase 3d (porta dos rastreadores) | dono + junta |

---

## 11. Fontes conferidas (todas em 2026-11-17)
- Repositório (`origin/main` `89cf79fe`): `docs/infra/estudo-aws-migracao.md`, `docs/deployment.md`, `Dockerfile`, `.github/workflows/deploy-production.yml`, `.github/workflows/ci.yml` (job `docker`), `.env.example`, `docs/go-live-readiness.md`, `scripts/db-runtime-role.sh`, `scripts/bootstrap-platform-admin.ts`, `prisma.config.ts`, `frontend/Dockerfile`, `frontend/src/config/env.ts`, `src/config/env.ts`, `docs/revisoes/SAN3/PLANO_SAN3.md` (itens 9, 10, 27, 43).
- AWS CLI v2 (CloudShell): `logs tail`, `ecr get-login-password`, `configure set`, paginação (`AWS_PAGER`, `--no-cli-pager`) — referência oficial da CLI.
- CloudShell: especificações e software pré-instalado (1 vCPU, 2 GiB, 1 GB persistente; `psql`, `node`, `jq`, `docker` por região), limites (VPC: 2 por usuário, sem persistência, 20–30 min), ambientes em VPC (internet só por subnet privada com NAT; disponível em todas as regiões), endpoints por região (`sa-east-1` presente).
- Route 53: valores de alias (`Z2FDTNDATAQYW2` para CloudFront; `CanonicalHostedZoneId` do ALB), lista de TLDs do Route 53 Domains e a página `.com.br` ("não é mais possível registrar nem transferir").
- VPC: instâncias NAT (comandos de `iptables`/`sysctl` para AL2023), preços (IPv4 público US$ 0,005/h).
- AL2023: parâmetros SSM `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-{arm64,x86_64}`.
- ECS: papel de execução (`arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`, `secretsmanager:GetSecretValue`); Systems Manager: `AmazonSSMManagedInstanceCore`.
- ECR: pull-through cache para o GitHub Container Registry (`--upstream-registry-url ghcr.io`, segredo `ecr-pullthroughcache/…`).
- Global Accelerator: US$ 0,025/h por acelerador (US$ 18,25/mês) + DT-Premium.
- `dig` (man page), `jq` (manual), `psql` 16, `openssl`, `curl`, `docker`, `git`, `npm`/`npx prisma` — `--help` locais.
- Fases 3b, 3c e 3d (`origin/main` `de00d1fc`): `src/config/env.ts` (`EVIDENCE_SCANNER`, `CLAMAV_*`, `TRACCAR_*` e as travas de produção), `docker-compose.clamav.yml` (imagem e digest do ClamAV, `CLAMAV_MAX_DB_AGE_HOURS=72`), `infra/clamav/clamd.conf`, `docker-compose.traccar.yml` (imagem e digest do Traccar, URLs do encaminhamento), `src/integrations/traccar/traccar-forward-auth.ts` (cabeçalho `X-Traccar-Forward-Token`), `traccar-ingest.app.ts` (rotas e 202 da quarentena), `prisma/schema.prisma` (`traccar_quarantine_items`), `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` §6.2 e §7.1, `docs/omega-pd.md` (`PD-O6R-B07B-CLAMD-INSTREAM`, `PD-TRC-616`), `agent-orchestration/controle/decisoes.md` (`D-TRACCAR-HTTP-PRIVADO-AWS`). Traccar `v6.16.0` no GitHub: `Config.java` (variáveis de ambiente), `Keys.java` (chaves), `PortConfigSuffix.java` (GT06 5023, OsmAnd 5055). Registro de imagens: índices e configuração das imagens do ClamAV (só `amd64`; `Entrypoint /init`; saúde `clamdcheck.sh`) e do Traccar (`amd64` e `arm64`; Alpine). Documentação da AWS: descoberta de serviço do ECS (Cloud Map), checagem de saúde do contêiner (carência até 300 s), grupos de segurança do NLB (só na criação; referência pelo grupo; e a tabela de métricas do NLB, que publica a métrica de bloqueio por protocolo: `SecurityGroupBlockedFlowCount_Inbound_TCP`, a do alarme do 3d.4; `ActiveFlowCount` com a dimensão `LoadBalancer=net/<nome>/<id>`).
- Revisão do PR #598 (`origin/main` `60c0704a`): `src/modules/auth/routes/auth.routes.ts` (o login responde `data.accessToken`), `frontend/src/services/realtime/pollingClient.ts`, `src/modules/field-ops-realtime/field-ops-realtime.routes.ts` (sinal de vida a cada 25 s), `frontend/src/modules/operations/map/useOperationsMap.ts` (reconexão), `scripts/bootstrap-platform-admin.ts`. Documentação: CloudFront (configurações de origem e cotas: `OriginReadTimeout` de 1 a 120 s), ELB (`idle_timeout.timeout_seconds`, padrão 60 s, no help local), PostgreSQL 16 (`DROP OWNED`, `psql -c` repetido), `jq` 1.7 (`--rawfile`), `curl` (`-d @arquivo`).

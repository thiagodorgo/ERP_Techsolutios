# Fluxo GitHub

## Padrao de branches

- `chore/*`
- `feat/*`
- `fix/*`
- `docs/*`
- `refactor/*`
- `test/*`

## Padrao de commits

Use mensagens curtas, no imperativo e com escopo claro:

```bash
git commit -m "chore: add local development infrastructure"
```

## Fluxo de Pull Request

1. Criar uma branch a partir de `main`.
2. Fazer alteracoes pequenas e focadas.
3. Rodar validacoes locais.
4. Abrir Pull Request para `main`.
5. Corrigir falhas de CI ou revisao.
6. Fazer merge apenas apos validacao.

## Comandos recomendados

```bash
git checkout main
git pull origin main
git checkout -b chore/local-dev-infra
git add .
git commit -m "chore: add local development infrastructure"
git push origin chore/local-dev-infra
```

## Checklist antes do PR

- `npm run check`
- `npm test`
- `npm run build`
- `npm --prefix frontend run test:smoke`
- `npm run test:e2e` quando a mudanca tocar login, RBAC, navegacao, W02A, W03 ou fluxo autenticado.
- O E2E local depende do seed idempotente (`npm run db:seed`) para `admin.demo@example.com` e `platform.admin@erp.local`; as senhas documentadas em `.env.example` sao apenas valores de desenvolvimento.
- Documentacao atualizada.
- Sem `.env` real.
- Sem secrets.
- README coerente com o estado atual.

## Checklist antes do merge

- CI passou.
- Revisao aprovada quando aplicavel.
- Branch sem alteracoes fora do escopo.
- Nenhuma credencial real versionada.
- Documentacao minima suficiente para outro dev reproduzir o ambiente.

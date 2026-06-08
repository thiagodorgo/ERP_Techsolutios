# Storage de anexos

## Escopo

O storage configuravel cobre anexos/evidencias de `tenant_checklist`, incluindo fotos de M10/M11/M12 e arquivos aceitos pelo componente `photo_upload` ou `before_after`.

## Providers

- `local`: padrao de desenvolvimento, grava em `storage/checklist-attachments` ou no diretorio definido em `CHECKLIST_STORAGE_LOCAL_DIR`.
- `s3`: provider S3-compatible via `@aws-sdk/client-s3`, preparado para AWS S3, MinIO, Cloudflare R2 ou endpoint compativel.

O backend escolhe o provider por `CHECKLIST_STORAGE_PROVIDER`. O contrato publico continua usando a rota protegida de download; bucket, storage key, path privado e URLs internas nao sao expostos.

## Variaveis

- `CHECKLIST_STORAGE_PROVIDER=local|s3`
- `CHECKLIST_STORAGE_LOCAL_DIR=storage/checklist-attachments`
- `CHECKLIST_STORAGE_MAX_FILE_SIZE_MB=10`
- `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf`
- `CHECKLIST_STORAGE_S3_BUCKET`
- `CHECKLIST_STORAGE_S3_REGION`
- `CHECKLIST_STORAGE_S3_ENDPOINT`
- `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE=true`
- `CHECKLIST_STORAGE_S3_ACCESS_KEY_ID`
- `CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY`
- `CHECKLIST_STORAGE_S3_PREFIX=checklist-attachments`

Variaveis legadas `CHECKLIST_ATTACHMENT_*` seguem aceitas como aliases para ambientes locais antigos.

## Seguranca

- Nao commitar `.env` nem credenciais reais.
- Nao retornar `storageKey`, bucket, path privado, `local://` ou `s3://` na API.
- Download exige tenant, RBAC e RLS validos.
- Testes S3 usam client mockado; nenhum bucket real e necessario.

## Persistencia

Nesta rodada nao ha migration. Provider, storage key e checksum ficam em `checklist_attachments.metadata` para preservar compatibilidade. Uma migration futura pode promover esses campos para colunas dedicadas se houver necessidade de indice, busca operacional ou lifecycle por provider.

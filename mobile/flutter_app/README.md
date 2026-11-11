# ERP Techsolutions — app de campo

Aplicativo móvel (Flutter) do ERP Techsolutions para quem trabalha em campo: ordens de serviço,
checklists, evidências, mapa operacional, estoque e prestação de contas. O app funciona
offline: o que o usuário registra fica guardado no aparelho e é enviado ao servidor quando há
conexão (tela **Sincronizar**).

Quem decide o que cada perfil pode fazer é sempre o servidor. O app só esconde ou bloqueia na
tela o que a sessão não permite.

## Como rodar

```bash
cd mobile/flutter_app
flutter pub get
flutter run
```

Sem nenhum `--dart-define`, o app abre no **modo de demonstração local**: login local, organização
de demonstração e dados de exemplo, sem chamar o servidor.

## Configuração de build (`--dart-define`)

| Chave | Padrão | O que faz |
|---|---|---|
| `ERP_AUTH_MODE` | `local` | `local` usa o login de demonstração; `remote` usa o login real no servidor. |
| `ERP_ENV` | `production` | `dev` liga as ferramentas de desenvolvimento (tela de diagnóstico, acesso rápido no login). Build de produção nunca usa `dev`. |
| `API_BASE_URL` | `http://10.0.2.2:3000` | Endereço do servidor da API. O padrão é o computador local visto pelo emulador Android. |
| `ERP_APP_VERSION` | `1.0.0` | Versão informada na telemetria. Mantenha igual ao `version:` do `pubspec.yaml`. |

Exemplo de build ligado a um servidor:

```bash
flutter run \
  --dart-define=ERP_AUTH_MODE=remote \
  --dart-define=API_BASE_URL=https://api.exemplo.com.br
```

## Testes e qualidade

```bash
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test --reporter compact
```

O CI usa a versão fixa do Flutter definida em `.github/workflows/ci.yml`. Os testes de cada
bloco ficam em `test/features/` com o nome `b<bloco>_<assunto>_test.dart`.

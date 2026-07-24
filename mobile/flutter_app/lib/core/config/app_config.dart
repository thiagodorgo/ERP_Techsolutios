// Set at build time via --dart-define=ERP_AUTH_MODE=remote
// Defaults to 'local' so dev flow is unchanged without extra flags.
const kAuthMode = String.fromEnvironment(
  'ERP_AUTH_MODE',
  defaultValue: 'local',
);
const kIsRemoteAuth = kAuthMode == 'remote';

// Set via --dart-define=ERP_ENV=dev to enable dev-only features.
// Production builds must NOT include dev features (diagnostics, quick-access, etc).
const kEnvMode = String.fromEnvironment('ERP_ENV', defaultValue: 'production');
const kIsDevMode = kEnvMode == 'dev';

// Versão do app usada no `appVersion` da telemetria (Ω4C PR-13,
// D-Ω4C-TELE-FLUTTER-NODEPS). Zero-dep: NÃO usa `package_info_plus`; precisa ser
// mantida em sincronia MANUAL com o `version:` do pubspec (hoje 1.0.0+1).
const kAppVersion = String.fromEnvironment(
  'ERP_APP_VERSION',
  defaultValue: '1.0.0',
);

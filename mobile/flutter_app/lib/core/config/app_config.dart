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

// Set at build time via --dart-define=ERP_AUTH_MODE=remote
// Defaults to 'local' so dev flow is unchanged without extra flags.
const kAuthMode = String.fromEnvironment(
  'ERP_AUTH_MODE',
  defaultValue: 'local',
);
const kIsRemoteAuth = kAuthMode == 'remote';

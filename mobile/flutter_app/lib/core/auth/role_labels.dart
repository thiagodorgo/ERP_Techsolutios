/// Rótulo de negócio do papel do usuário (B-SAN3-19, item 48).
///
/// Fonte única do app de campo: a UI nunca mostra a chave técnica (`field_technician`, `manager`…). Mapa fechado
/// dos 9 papéis canônicos do RBAC_MATRIX.md, mais `field_dispatcher` (contrato §3) e `tenant_member` (papel
/// genérico quando o token não traz papel, `auth_repository.dart`). Chave fora do mapa vira "Usuário" e nunca
/// aparece crua. Só muda o texto exibido: o valor do papel enviado ou comparado continua o mesmo.
library;

const String _rotuloDesconhecido = 'Usuário';

const Map<String, String> _rotulos = <String, String>{
  'platform_admin': 'Admin Plataforma',
  'tenant_admin': 'Administrador',
  'manager': 'Gestor Operacional',
  'operator': 'Operação',
  'finance': 'Financeiro',
  'inventory': 'Estoque',
  'field_technician': 'Técnico de Campo',
  'auditor': 'Auditor',
  'support': 'Suporte',
  'field_dispatcher': 'Operação de Campo',
  'tenant_member': 'Membro',
};

/// Devolve o rótulo exibido para a chave de papel [key].
String roleLabel(String key) =>
    _rotulos[key.trim().toLowerCase()] ?? _rotuloDesconhecido;

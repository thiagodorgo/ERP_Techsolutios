// B-SAN3-19 — rótulo de perfil sem termo técnico (item 48, plano §3.1/§4).
//
// `roleLabel` é a fonte única do rótulo de papel no app de campo. Mapa fechado dos 9 papéis canônicos do
// RBAC_MATRIX.md, mais `field_dispatcher` e `tenant_member`; chave desconhecida vira "Usuário" e nunca aparece crua.
import 'package:erp_techsolutions_mobile/core/auth/role_labels.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('B-SAN3-19 · roleLabel', () {
    const esperado = <String, String>{
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

    for (final entry in esperado.entries) {
      test('${entry.key} → ${entry.value}', () {
        final rotulo = roleLabel(entry.key);
        expect(rotulo, entry.value);
        expect(rotulo.contains('_'), isFalse);
        expect(rotulo, isNot(entry.key));
      });
    }

    test('caixa e espaço não mudam o rótulo', () {
      expect(roleLabel(' Field_Technician '), 'Técnico de Campo');
    });

    for (final chave in <String>[
      'papel_que_nao_existe',
      'super_admin',
      'technician',
      'viewer',
      '',
      '   ',
    ]) {
      test('chave fora do mapa "$chave" → Usuário, nunca a chave crua', () {
        final rotulo = roleLabel(chave);
        expect(rotulo, 'Usuário');
        expect(rotulo.contains('_'), isFalse);
        expect(rotulo, isNot(chave));
      });
    }
  });
}

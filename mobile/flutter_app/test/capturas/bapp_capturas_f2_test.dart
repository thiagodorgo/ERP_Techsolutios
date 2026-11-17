// B-APP-APARENCIA (F2) — as capturas da execução do guincho nas 3 aparências,
// para a conferência visual do orquestrador (Emenda 2, R2-4). Não é golden:
// grava PNG fora do repositório, na pasta de `ERP_CAPTURAS_DIR`; sem a
// variável, o teste é pulado (o CI e a suíte não gravam nada, e os casos
// pulados não contam).
//
// Nome: `guincho-<aparência>-<estado>-<largura>.png`.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'captura_helper.dart';

const _sizes = [Size(390, 812), Size(360, 740)];

void main() {
  final skip = capturasDir == null
      ? 'sem ERP_CAPTURAS_DIR: captura só sob pedido, fora do repositório'
      : null;

  setUpAll(() async {
    if (skip != null) return;
    await loadRoboto();
    await loadMaterialIcons();
  });

  for (final size in _sizes) {
    final w = size.width.toInt();
    for (final ap in AppAppearance.values) {
      for (final estado in guinchoEstados) {
        final nome = 'guincho-${ap.letter}-$estado-$w';
        testWidgets(nome, skip: skip != null, (t) async {
          fixarTela(t, size);
          await t.pumpWidget(
            await guinchoApp(GuinchoCenario.of(estado), appearance: ap),
          );
          if (estado == 'carregando') {
            // A sessão chega; a OS ainda não (o FutureBuilder sem dado).
            await t.pump();
          } else {
            await t.pumpAndSettle();
          }
          await capturar(t, nome);
        });
      }
    }
  }
}

import 'package:flutter/material.dart';

import 'router.dart';

class ErpMobileApp extends StatelessWidget {
  const ErpMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ERP Techsolutions',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF176B87)),
        useMaterial3: true,
      ),
      routerConfig: appRouter,
    );
  }
}

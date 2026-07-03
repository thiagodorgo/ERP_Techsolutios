import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/theme/erp_mobile_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // O router redirect envia para /login ou / conforme o estado de auth.
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) context.go('/');
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/'),
      child: Scaffold(
        backgroundColor: ErpMobileTheme.navy,
        body: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -0.2),
              radius: 0.9,
              colors: [Color(0xFF16324A), ErpMobileTheme.navy],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 28),
              child: Column(
                children: [
                  const Spacer(),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: const LinearProgressIndicator(
                      minHeight: 4,
                      backgroundColor: Color(0x1AFFFFFF),
                      valueColor: AlwaysStoppedAnimation(Color(0xFF7BE084)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF7BE084),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Restaurando sessão…',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.92),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'TechSolutions ERP · Operação de campo',
                    style: TextStyle(color: Color(0xFF5B7A96), fontSize: 11),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

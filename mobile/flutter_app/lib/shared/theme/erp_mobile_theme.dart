import 'package:flutter/material.dart';

class ErpMobileTheme {
  const ErpMobileTheme._();

  static const primary = Color(0xFF155D7B);
  static const primaryDark = Color(0xFF0D3F57);
  static const accent = Color(0xFF0D8FB3);
  static const surface = Color(0xFFF7FAFC);
  static const success = Color(0xFF127A55);
  static const warning = Color(0xFFA56300);
  static const danger = Color(0xFFB33333);
  static const info = Color(0xFF2867A8);
  static const pending = Color(0xFF6F5A00);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      secondary: accent,
      surface: surface,
      error: danger,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      scaffoldBackgroundColor: surface,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        backgroundColor: surface,
        foregroundColor: primaryDark,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: const EdgeInsets.symmetric(vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFFD8E1E8)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
      textTheme: const TextTheme(
        titleLarge: TextStyle(fontWeight: FontWeight.w800),
        titleMedium: TextStyle(fontWeight: FontWeight.w700),
        titleSmall: TextStyle(fontWeight: FontWeight.w700),
        labelMedium: TextStyle(fontWeight: FontWeight.w700),
      ),
    );
  }
}

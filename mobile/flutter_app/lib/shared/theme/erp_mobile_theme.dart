import 'package:flutter/material.dart';

class ErpMobileTheme {
  const ErpMobileTheme._();

  // Brand palette
  static const primary = Color(0xFF155D7B);
  static const primaryDark = Color(0xFF0D3F57);
  static const accent = Color(0xFF0D8FB3);
  static const surface = Color(0xFFF7FAFC);
  static const success = Color(0xFF127A55);
  static const warning = Color(0xFFA56300);
  static const danger = Color(0xFFB33333);
  static const info = Color(0xFF2867A8);
  static const pending = Color(0xFF6F5A00);

  // Dark palette
  static const _darkBg = Color(0xFF0E1922);
  static const _darkSurface = Color(0xFF182533);
  static const _darkPrimary = Color(0xFF1AADDB);
  static const _darkOnSurface = Color(0xFFD0E8F5);

  // High-contrast palette (WCAG AAA on black)
  static const _hcPrimary = Color(0xFF00E5FF);
  static const _hcError = Color(0xFFFF5252);
  static const _hcSuccess = Color(0xFF69FF47);

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

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: _darkPrimary,
      brightness: Brightness.dark,
      primary: _darkPrimary,
      secondary: accent,
      surface: _darkSurface,
      error: const Color(0xFFE57373),
      onSurface: _darkOnSurface,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: _darkBg,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: _darkBg,
        foregroundColor: _darkOnSurface,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: _darkSurface,
        margin: const EdgeInsets.symmetric(vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFF2A3D50)),
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

  static ThemeData highContrast() {
    const bg = Colors.black;
    const fg = Colors.white;

    final scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: _hcPrimary,
      onPrimary: Colors.black,
      secondary: _hcSuccess,
      onSecondary: Colors.black,
      error: _hcError,
      onError: Colors.black,
      surface: bg,
      onSurface: fg,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        backgroundColor: bg,
        foregroundColor: fg,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: bg,
        margin: const EdgeInsets.symmetric(vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: fg, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _hcPrimary,
          foregroundColor: Colors.black,
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          side: const BorderSide(color: fg),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _hcPrimary,
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          side: const BorderSide(color: _hcPrimary, width: 2),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: fg, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _hcPrimary, width: 2),
        ),
        labelStyle: const TextStyle(color: fg),
      ),
      iconTheme: const IconThemeData(color: fg),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: fg),
        bodyMedium: TextStyle(color: fg),
        bodySmall: TextStyle(color: fg),
        titleLarge: TextStyle(color: fg, fontWeight: FontWeight.w800),
        titleMedium: TextStyle(color: fg, fontWeight: FontWeight.w700),
        titleSmall: TextStyle(color: fg, fontWeight: FontWeight.w700),
        labelMedium: TextStyle(color: fg, fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// Custom theme mode that extends Flutter's ThemeMode with high contrast.
enum AppThemeMode { system, light, dark, highContrast }

extension AppThemeModeLabel on AppThemeMode {
  String get label => switch (this) {
    AppThemeMode.system => 'Sistema',
    AppThemeMode.light => 'Claro',
    AppThemeMode.dark => 'Escuro',
    AppThemeMode.highContrast => 'Alto contraste',
  };

  /// Maps to the Flutter ThemeMode used by MaterialApp.
  /// highContrast uses ThemeMode.light so MaterialApp picks the overridden
  /// `theme` (which we swap to highContrast()) rather than `darkTheme`.
  ThemeMode get flutterMode => switch (this) {
    AppThemeMode.system => ThemeMode.system,
    AppThemeMode.light => ThemeMode.light,
    AppThemeMode.dark => ThemeMode.dark,
    AppThemeMode.highContrast => ThemeMode.light,
  };

  String get storageKey => switch (this) {
    AppThemeMode.system => 'system',
    AppThemeMode.light => 'light',
    AppThemeMode.dark => 'dark',
    AppThemeMode.highContrast => 'highContrast',
  };

  static AppThemeMode fromKey(String? key) => switch (key) {
    'light' => AppThemeMode.light,
    'dark' => AppThemeMode.dark,
    'highContrast' => AppThemeMode.highContrast,
    _ => AppThemeMode.system,
  };
}

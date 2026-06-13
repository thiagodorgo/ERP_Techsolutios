import '../domain/checklist_models.dart';

class VehicleAssetHelper {
  VehicleAssetHelper._();

  static const views = ['left', 'right', 'front', 'back'];

  static const viewLabels = {
    'left': 'Esquerda',
    'right': 'Direita',
    'front': 'Frente',
    'back': 'Traseira',
  };

  // Maps API value → asset folder name.
  // - 'sedan' has its own folder with explicit assets.
  // - 'car' is an alias for sedan (fallback documented here).
  // - 'generic' falls back to sedan.
  // - All others have dedicated asset folders.
  static const _folderMap = {
    'sedan': 'sedan',
    'car': 'sedan',
    'motorcycle': 'motorcycle',
    'truck': 'truck',
    'van': 'van',
    'pickup': 'pickup',
    'bus': 'bus',
    'generic': 'sedan',
  };

  static String assetFolder(String vehicleType) =>
      _folderMap[vehicleType.toLowerCase()] ?? 'sedan';

  static String assetPath(String vehicleType, String view) {
    final folder = assetFolder(vehicleType);
    return 'assets/images/$folder/$folder-$view.png';
  }

  static bool isFallback(String vehicleType) {
    final lower = vehicleType.toLowerCase();
    return lower == 'car' ||
        lower == 'generic' ||
        !_folderMap.containsKey(lower);
  }

  static const defaultOptions = [
    MobileChecklistFieldOption(value: 'sedan', label: 'Sedan'),
    MobileChecklistFieldOption(value: 'pickup', label: 'Picape'),
    MobileChecklistFieldOption(value: 'van', label: 'Van'),
    MobileChecklistFieldOption(value: 'truck', label: 'Caminhao'),
    MobileChecklistFieldOption(value: 'motorcycle', label: 'Motocicleta'),
    MobileChecklistFieldOption(value: 'bus', label: 'Onibus'),
  ];
}

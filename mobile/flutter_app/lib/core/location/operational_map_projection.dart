class OperationalMapPoint {
  const OperationalMapPoint({
    required this.id,
    required this.label,
    required this.latitude,
    required this.longitude,
  });

  final String id;
  final String label;
  final double latitude;
  final double longitude;
}

class ProjectedOperationalMapPoint extends OperationalMapPoint {
  const ProjectedOperationalMapPoint({
    required super.id,
    required super.label,
    required super.latitude,
    required super.longitude,
    required this.x,
    required this.y,
  });

  final double x;
  final double y;
}

class OperationalMapProjection {
  const OperationalMapProjection._();

  static List<ProjectedOperationalMapPoint> project(
    List<OperationalMapPoint> points,
  ) {
    if (points.isEmpty) return const [];
    if (points.length == 1) {
      final point = points.single;
      return [
        ProjectedOperationalMapPoint(
          id: point.id,
          label: point.label,
          latitude: point.latitude,
          longitude: point.longitude,
          x: 0.5,
          y: 0.5,
        ),
      ];
    }

    final minLat = points.map((p) => p.latitude).reduce(_min);
    final maxLat = points.map((p) => p.latitude).reduce(_max);
    final minLng = points.map((p) => p.longitude).reduce(_min);
    final maxLng = points.map((p) => p.longitude).reduce(_max);
    final latSpan = (maxLat - minLat).abs();
    final lngSpan = (maxLng - minLng).abs();

    return points
        .map((point) {
          final normalizedX = lngSpan == 0
              ? 0.5
              : (point.longitude - minLng) / lngSpan;
          final normalizedY = latSpan == 0
              ? 0.5
              : 1 - ((point.latitude - minLat) / latSpan);
          return ProjectedOperationalMapPoint(
            id: point.id,
            label: point.label,
            latitude: point.latitude,
            longitude: point.longitude,
            x: _withPadding(normalizedX),
            y: _withPadding(normalizedY),
          );
        })
        .toList(growable: false);
  }

  static double _withPadding(double value) => 0.12 + (value * 0.76);
}

double _min(double a, double b) => a < b ? a : b;
double _max(double a, double b) => a > b ? a : b;

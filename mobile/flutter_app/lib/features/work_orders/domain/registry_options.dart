import 'package:equatable/equatable.dart';

/// Viatura selecionável (cadastro) para vincular a uma OS.
/// Origem: GET /api/v1/vehicles (envelope `{ data: { items: [...] } }`).
class VehicleOption extends Equatable {
  const VehicleOption({
    required this.id,
    required this.plate,
    required this.model,
  });

  final String id;
  final String plate;
  final String model;

  /// Rótulo denso para o seletor: "ABC-1234 · Ducato".
  String get label {
    final trimmedPlate = plate.trim();
    final trimmedModel = model.trim();
    if (trimmedPlate.isNotEmpty && trimmedModel.isNotEmpty) {
      return '$trimmedPlate · $trimmedModel';
    }
    if (trimmedPlate.isNotEmpty) return trimmedPlate;
    if (trimmedModel.isNotEmpty) return trimmedModel;
    return id;
  }

  @override
  List<Object?> get props => [id, plate, model];
}

/// Equipe selecionável (cadastro) para vincular a uma OS.
/// Origem: GET /api/v1/teams (envelope `{ data: { items: [...] } }`).
class TeamOption extends Equatable {
  const TeamOption({required this.id, required this.name});

  final String id;
  final String name;

  String get label => name.trim().isEmpty ? id : name.trim();

  @override
  List<Object?> get props => [id, name];
}

/// Conjunto de opções de cadastro para a tela de seleção viatura/equipe.
class RegistryOptions extends Equatable {
  const RegistryOptions({required this.vehicles, required this.teams});

  final List<VehicleOption> vehicles;
  final List<TeamOption> teams;

  static const RegistryOptions empty = RegistryOptions(
    vehicles: <VehicleOption>[],
    teams: <TeamOption>[],
  );

  @override
  List<Object?> get props => [vehicles, teams];
}

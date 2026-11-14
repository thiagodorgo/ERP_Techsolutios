import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

/// Versão do texto de consentimento que o titular leu. Vai em toda decisão
/// (`text_version` do contrato `mobile_location_consent@2026-11.b-san3-17`) e
/// obedece ao padrão `^[a-z0-9][a-z0-9._@-]{0,63}$`.
const locationConsentTextVersion = '2026-11.b-san3-17.v1';

/// Quando a localização é capturada (detalhe da linha "quando" da tela).
const locationConsentWhenText =
    'Quando você toca em Enviar localização na OS e, com o app aberto, a cada minuto.';

/// Só em primeiro plano (detalhe da linha "fechado" da tela).
const locationConsentClosedAppText =
    'Só com o app aberto: nada é capturado com o app fechado ou minimizado.';

/// O texto inteiro, para quem mostra as duas frases juntas (o cartão da OS).
const manualLocationConsentText =
    '$locationConsentWhenText $locationConsentClosedAppText';

/// O que acontece com o que já foi registrado depois de revogar (P7 (a)).
const locationConsentHistoryText =
    'Quando a revogação chega à sua organização, o mapa e o despacho param de mostrar a localização enviada pelo app; o que já foi registrado continua guardado para a auditoria das OS, só para quem já pode ver o histórico.';

/// De quem é o consentimento: a pessoa (usuário) numa organização.
class LocationConsentOwner {
  const LocationConsentOwner({required this.tenantId, required this.userId});

  final String tenantId;
  final String userId;

  @override
  bool operator ==(Object other) =>
      other is LocationConsentOwner &&
      other.tenantId == tenantId &&
      other.userId == userId;

  @override
  int get hashCode => Object.hash(tenantId, userId);

  @override
  String toString() => 'LocationConsentOwner($tenantId, $userId)';
}

/// Resolve o dono da sessão NA HORA de cada leitura e escrita. `null` = sem
/// sessão, ou sessão recarregando: o store responde "não".
typedef LocationConsentOwnerResolver = LocationConsentOwner? Function();

/// O que a organização sabe da última decisão do titular.
enum LocationConsentServerState {
  /// Não há decisão.
  none,

  /// A decisão ainda não chegou à organização.
  pending,

  /// A organização registrou a decisão.
  registered,

  /// A organização ainda não tem o cadastro de profissional do titular.
  profileMissing,
}

/// O tipo da última decisão. "Revogado" só para quem disse "sim" neste
/// registro e depois "não"; todo outro "não" é "Não permitido" (E2.6).
enum LocationConsentDecisionKind { granted, revoked, declined }

/// A linha de estado da decisão "não" (E2.6).
String locationConsentDeclineLine(LocationConsentDecisionKind kind) {
  return switch (kind) {
    LocationConsentDecisionKind.revoked => 'Revogado. Nada é capturado.',
    LocationConsentDecisionKind.declined => 'Não permitido. Nada é capturado.',
    LocationConsentDecisionKind.granted => '',
  };
}

/// Uma decisão do titular, como vai à organização.
class LocationConsentDecision {
  const LocationConsentDecision({
    required this.granted,
    required this.decidedAt,
    required this.clientActionId,
    required this.textVersion,
  });

  final bool granted;
  final DateTime decidedAt;
  final String clientActionId;
  final String textVersion;
}

/// O que as telas leem do registro do titular.
class LocationConsentStatus {
  const LocationConsentStatus({
    required this.hasOwner,
    required this.granted,
    required this.needsReconfirm,
    required this.serverState,
    this.kind,
    this.decidedAt,
    this.registeredAt,
  });

  const LocationConsentStatus.withoutOwner()
    : hasOwner = false,
      granted = false,
      needsReconfirm = false,
      serverState = LocationConsentServerState.none,
      kind = null,
      decidedAt = null,
      registeredAt = null;

  final bool hasOwner;
  final bool granted;
  final bool needsReconfirm;
  final LocationConsentServerState serverState;
  final LocationConsentDecisionKind? kind;
  final DateTime? decidedAt;
  final DateTime? registeredAt;

  /// Não decidiu, ou a organização pediu "confirme de novo".
  bool get needsDecision => hasOwner && (kind == null || needsReconfirm);
}

/// O registro local de uma pessoa, guardado em JSON numa chave por
/// (organização, usuário).
class LocationConsentRecord {
  const LocationConsentRecord({
    this.granted,
    this.decidedAt,
    this.clientActionId,
    this.textVersion,
    this.serverAck = false,
    this.serverState = LocationConsentServerState.none,
    this.kind,
    this.needsReconfirm = false,
    this.profileUpdatedAt,
    this.registeredAt,
  });

  factory LocationConsentRecord.undecided() => const LocationConsentRecord();

  /// "Confirme de novo": a organização não registrou a decisão anterior. Guarda
  /// o `profile_updated_at` que ela devolveu, para a nova confirmação ser
  /// posterior a ele (CR17R2-04).
  factory LocationConsentRecord.reconfirmRequired({
    DateTime? profileUpdatedAt,
  }) => LocationConsentRecord(
    needsReconfirm: true,
    profileUpdatedAt: profileUpdatedAt?.toUtc(),
  );

  /// A fábrica única da decisão pendente (aceitar, revogar e "Agora não").
  factory LocationConsentRecord.pendingDecision({
    required bool granted,
    required bool wasGranted,
    required DateTime decidedAt,
    required String clientActionId,
    DateTime? profileUpdatedAt,
  }) {
    // dart format off
    final kind = wasGranted ? LocationConsentDecisionKind.revoked : LocationConsentDecisionKind.declined;
    // dart format on
    return LocationConsentRecord(
      granted: granted,
      decidedAt: decidedAt.toUtc(),
      clientActionId: clientActionId,
      textVersion: locationConsentTextVersion,
      serverAck: false,
      serverState: LocationConsentServerState.pending,
      kind: granted ? LocationConsentDecisionKind.granted : kind,
      profileUpdatedAt: profileUpdatedAt,
    );
  }

  factory LocationConsentRecord.fromJson(Map<String, dynamic> json) {
    final granted = json['granted'];
    final acked = json['server_ack'] == true;
    return LocationConsentRecord(
      granted: granted is bool ? granted : null,
      decidedAt: _date(json['decided_at']),
      clientActionId: json['client_action_id'] as String?,
      textVersion: json['text_version'] as String?,
      serverAck: acked,
      serverState:
          _enumByName(
            LocationConsentServerState.values,
            json['server_state'],
          ) ??
          (acked
              ? LocationConsentServerState.registered
              : (granted is bool
                    ? LocationConsentServerState.pending
                    : LocationConsentServerState.none)),
      kind: _enumByName(LocationConsentDecisionKind.values, json['kind']),
      needsReconfirm: json['needs_reconfirm'] == true,
      profileUpdatedAt: _date(json['profile_updated_at']),
      registeredAt: _date(json['registered_at']),
    );
  }

  /// `null` = não decidiu.
  final bool? granted;
  final DateTime? decidedAt;
  final String? clientActionId;
  final String? textVersion;
  final bool serverAck;
  final LocationConsentServerState serverState;
  final LocationConsentDecisionKind? kind;
  final bool needsReconfirm;
  final DateTime? profileUpdatedAt;
  final DateTime? registeredAt;

  bool get isDecided => granted != null;

  /// O tipo, com a regra da dúvida: registro sem a marca lê "Não permitido".
  LocationConsentDecisionKind? get effectiveKind {
    final value = granted;
    if (value == null) return null;
    if (value) return LocationConsentDecisionKind.granted;
    return kind == LocationConsentDecisionKind.revoked
        ? LocationConsentDecisionKind.revoked
        : LocationConsentDecisionKind.declined;
  }

  LocationConsentDecision? get pendingDecision {
    final value = granted;
    final at = decidedAt;
    final cid = clientActionId;
    if (value == null || serverAck || at == null || cid == null) return null;
    return LocationConsentDecision(
      granted: value,
      decidedAt: at,
      clientActionId: cid,
      textVersion: textVersion ?? locationConsentTextVersion,
    );
  }

  LocationConsentRecord copyWith({
    bool? serverAck,
    LocationConsentServerState? serverState,
    DateTime? registeredAt,
  }) => LocationConsentRecord(
    granted: granted,
    decidedAt: decidedAt,
    clientActionId: clientActionId,
    textVersion: textVersion,
    serverAck: serverAck ?? this.serverAck,
    serverState: serverState ?? this.serverState,
    kind: kind,
    needsReconfirm: needsReconfirm,
    profileUpdatedAt: profileUpdatedAt,
    registeredAt: registeredAt ?? this.registeredAt,
  );

  Map<String, Object?> toJson() => {
    'granted': granted,
    'decided_at': decidedAt?.toIso8601String(),
    'client_action_id': clientActionId,
    'text_version': textVersion,
    'server_ack': serverAck,
    'server_state': serverState.name,
    'kind': kind?.name,
    'needs_reconfirm': needsReconfirm,
    'profile_updated_at': profileUpdatedAt?.toIso8601String(),
    'registered_at': registeredAt?.toIso8601String(),
  };
}

/// O consentimento de localização da PESSOA da sessão (P2).
///
/// `hasAcceptedManualCapture`, `acceptManualCapture` e `clearManualCapture`
/// seguem servindo os chamadores de hoje (o cartão da OS, a tela e o portão do
/// plugin); aceitar e revogar gravam também a decisão pendente, que o
/// `LocationConsentSync` leva à organização antes de qualquer posição (P4).
abstract class LocationConsentStore {
  Future<bool> hasAcceptedManualCapture();
  Future<void> acceptManualCapture();
  Future<void> clearManualCapture();

  /// O estado do registro do dono da sessão, para as telas.
  Future<LocationConsentStatus> status();

  /// A decisão do [owner] que a organização ainda não registrou, ou `null`.
  Future<LocationConsentDecision?> pendingDecisionFor(
    LocationConsentOwner owner,
  );

  /// A organização registrou a decisão [clientActionId] do [owner]. Só
  /// confirma se o `cid` for o da decisão pendente de agora.
  Future<void> markAcknowledged(
    LocationConsentOwner owner,
    String clientActionId, {
    DateTime? registeredAt,
  });

  /// Muda o que se sabe da decisão pendente (ex.: cadastro ausente), sem
  /// confirmá-la.
  Future<void> markServerState(
    LocationConsentOwner owner,
    LocationConsentServerState state,
  );

  /// A organização recusou: o registro volta a "não decidiu" (P8), ou a
  /// "confirme de novo" (P12, P14 e o 400 do aceite).
  Future<void> resetAfterServerRefusal(
    LocationConsentOwner owner, {
    bool needsReconfirm = false,
    DateTime? profileUpdatedAt,
  });
}

/// A lógica do registro por pessoa, sobre um armazenamento de chave e valor.
abstract class _OwnerScopedConsentStore implements LocationConsentStore {
  _OwnerScopedConsentStore({
    required LocationConsentOwnerResolver ownerResolver,
    DateTime Function()? clock,
    String Function()? idFactory,
  }) : _ownerResolver = ownerResolver,
       _clock = clock ?? DateTime.now,
       _idFactory = idFactory ?? const Uuid().v4;

  final LocationConsentOwnerResolver _ownerResolver;
  final DateTime Function() _clock;
  final String Function() _idFactory;

  Future<String?> _readRaw(String key);
  Future<void> _writeRaw(String key, String value);

  /// Antes da primeira leitura (o armazenamento seguro apaga a chave antiga).
  Future<void> _beforeRead() async {}

  String _keyFor(LocationConsentOwner owner) =>
      'erp.location.consent.v2.${owner.tenantId}.${owner.userId}';

  Future<LocationConsentRecord> _read(LocationConsentOwner owner) async {
    await _beforeRead();
    final raw = await _readRaw(_keyFor(owner));
    if (raw == null || raw.isEmpty) return LocationConsentRecord.undecided();
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return LocationConsentRecord.fromJson(decoded);
      }
    } on FormatException {
      // Registro ilegível vale como "não decidiu" (falha fechada).
    }
    return LocationConsentRecord.undecided();
  }

  Future<void> _write(
    LocationConsentOwner owner,
    LocationConsentRecord record,
  ) => _writeRaw(_keyFor(owner), jsonEncode(record.toJson()));

  /// A nova decisão nunca é anterior ao `profile_updated_at` que a organização
  /// devolveu num `superseded` (CR17R2-04): max(agora, profile_updated_at + 1 ms).
  DateTime _decisionTime(LocationConsentRecord current) {
    final now = _clock().toUtc();
    final floor = current.profileUpdatedAt?.add(
      const Duration(milliseconds: 1),
    );
    return floor != null && floor.isAfter(now) ? floor : now;
  }

  Future<void> _decide(bool granted) async {
    final owner = _ownerResolver();
    if (owner == null) return;
    final current = await _read(owner);
    await _write(
      owner,
      LocationConsentRecord.pendingDecision(
        granted: granted,
        wasGranted: current.granted == true,
        decidedAt: _decisionTime(current),
        clientActionId: _idFactory(),
        profileUpdatedAt: current.profileUpdatedAt,
      ),
    );
  }

  @override
  Future<bool> hasAcceptedManualCapture() async {
    final owner = _ownerResolver();
    if (owner == null) return false;
    final record = await _read(owner);
    return record.granted == true;
  }

  @override
  Future<void> acceptManualCapture() => _decide(true);

  @override
  Future<void> clearManualCapture() => _decide(false);

  @override
  Future<LocationConsentStatus> status() async {
    final owner = _ownerResolver();
    if (owner == null) return const LocationConsentStatus.withoutOwner();
    final record = await _read(owner);
    return LocationConsentStatus(
      hasOwner: true,
      granted: record.granted == true,
      needsReconfirm: record.needsReconfirm,
      serverState: record.isDecided
          ? record.serverState
          : LocationConsentServerState.none,
      kind: record.effectiveKind,
      decidedAt: record.decidedAt,
      registeredAt: record.registeredAt,
    );
  }

  @override
  Future<LocationConsentDecision?> pendingDecisionFor(
    LocationConsentOwner owner,
  ) async => (await _read(owner)).pendingDecision;

  @override
  Future<void> markAcknowledged(
    LocationConsentOwner owner,
    String clientActionId, {
    DateTime? registeredAt,
  }) async {
    final record = await _read(owner);
    if (record.serverAck || record.clientActionId != clientActionId) return;
    await _write(
      owner,
      record.copyWith(
        serverAck: true,
        serverState: LocationConsentServerState.registered,
        registeredAt: (registeredAt ?? _clock()).toUtc(),
      ),
    );
  }

  @override
  Future<void> markServerState(
    LocationConsentOwner owner,
    LocationConsentServerState state,
  ) async {
    final record = await _read(owner);
    if (!record.isDecided || record.serverAck) return;
    await _write(owner, record.copyWith(serverState: state));
  }

  @override
  Future<void> resetAfterServerRefusal(
    LocationConsentOwner owner, {
    bool needsReconfirm = false,
    DateTime? profileUpdatedAt,
  }) async {
    if (needsReconfirm) {
      await _write(
        owner,
        LocationConsentRecord.reconfirmRequired(
          profileUpdatedAt: profileUpdatedAt,
        ),
      );
      return;
    }
    await _write(owner, LocationConsentRecord.undecided());
  }
}

/// O registro por pessoa no armazenamento seguro do aparelho.
///
/// A chave antiga do APARELHO (`erp.location.manual_capture_consent`) não vale
/// e é apagada na primeira leitura (P2).
class SecureLocationConsentStore extends _OwnerScopedConsentStore {
  SecureLocationConsentStore(
    this._storage, {
    required super.ownerResolver,
    super.clock,
    super.idFactory,
  });

  static const _legacyKey = 'erp.location.manual_capture_consent';

  final FlutterSecureStorage _storage;
  bool _legacyCleared = false;

  @override
  Future<void> _beforeRead() async {
    if (_legacyCleared) return;
    await _storage.delete(key: _legacyKey);
    _legacyCleared = true;
  }

  @override
  Future<String?> _readRaw(String key) => _storage.read(key: key);

  @override
  Future<void> _writeRaw(String key, String value) =>
      _storage.write(key: key, value: value);
}

/// O registro por pessoa em memória, para os testes. Sem resolvedor, todas as
/// leituras e escritas são de um dono fixo; `accepted: true` começa com o
/// consentimento concedido e registrado.
class InMemoryLocationConsentStore extends _OwnerScopedConsentStore {
  InMemoryLocationConsentStore({
    bool accepted = false,
    LocationConsentOwnerResolver? ownerResolver,
    super.clock,
    super.idFactory,
  }) : super(ownerResolver: ownerResolver ?? _fixedOwner) {
    final owner = (ownerResolver ?? _fixedOwner)();
    if (accepted && owner != null) {
      _values[_keyFor(owner)] = jsonEncode(
        LocationConsentRecord(
          granted: true,
          decidedAt: DateTime.utc(2026, 1, 1),
          clientActionId: 'in-memory-accepted',
          textVersion: locationConsentTextVersion,
          serverAck: true,
          serverState: LocationConsentServerState.registered,
          kind: LocationConsentDecisionKind.granted,
        ).toJson(),
      );
    }
  }

  static LocationConsentOwner? _fixedOwner() =>
      const LocationConsentOwner(tenantId: 'in-memory', userId: 'in-memory');

  final Map<String, String> _values = {};

  @override
  Future<String?> _readRaw(String key) async => _values[key];

  @override
  Future<void> _writeRaw(String key, String value) async {
    _values[key] = value;
  }
}

DateTime? _date(Object? value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toUtc();
}

T? _enumByName<T extends Enum>(List<T> values, Object? name) {
  if (name is! String) return null;
  for (final value in values) {
    if (value.name == name) return value;
  }
  return null;
}

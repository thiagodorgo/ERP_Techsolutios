import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'sync_models.dart';

abstract class SyncActionStore {
  Future<List<SyncAction>> load();
  Future<void> save(List<SyncAction> actions);
}

class InMemorySyncActionStore implements SyncActionStore {
  InMemorySyncActionStore([List<SyncAction> seed = const <SyncAction>[]])
    : _actions = List<SyncAction>.from(seed);

  List<SyncAction> _actions;

  @override
  Future<List<SyncAction>> load() async => List.unmodifiable(_actions);

  @override
  Future<void> save(List<SyncAction> actions) async {
    _actions = List<SyncAction>.from(actions);
  }
}

class JsonFileSyncActionStore implements SyncActionStore {
  JsonFileSyncActionStore.appDocuments({this.fileName = 'sync_actions.json'})
    : _file = null;

  JsonFileSyncActionStore.file(File file) : _file = file, fileName = null;

  final File? _file;
  final String? fileName;

  @override
  Future<List<SyncAction>> load() async {
    final file = await _resolveFile();
    if (!await file.exists()) {
      return const <SyncAction>[];
    }

    final content = await file.readAsString();
    if (content.trim().isEmpty) {
      return const <SyncAction>[];
    }

    final decoded = jsonDecode(content) as List<dynamic>;
    return decoded
        .map((item) => SyncActionCodec.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  @override
  Future<void> save(List<SyncAction> actions) async {
    final file = await _resolveFile();
    await file.parent.create(recursive: true);
    final encoded = actions.map(SyncActionCodec.toJson).toList(growable: false);
    await file.writeAsString(jsonEncode(encoded), flush: true);
  }

  Future<File> _resolveFile() async {
    final fixed = _file;
    if (fixed != null) {
      return fixed;
    }

    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/${fileName ?? 'sync_actions.json'}');
  }
}

class SyncActionCodec {
  const SyncActionCodec._();

  static Map<String, Object?> toJson(SyncAction action) {
    return {
      'client_action_id': action.clientActionId,
      'tenant_id': action.tenantId,
      'type': action.type,
      'payload': action.payload,
      'status': action.status.name,
      'created_at': action.createdAt.toIso8601String(),
      'retry_count': action.retryCount,
      'last_error_code': action.lastErrorCode,
      'last_safe_error': action.lastSafeError,
      'processed_at': action.processedAt?.toIso8601String(),
    };
  }

  static SyncAction fromJson(Map<String, dynamic> json) {
    return SyncAction(
      clientActionId: json['client_action_id'] as String,
      tenantId: json['tenant_id'] as String,
      type: json['type'] as String,
      payload: Map<String, Object?>.from(
        (json['payload'] as Map<dynamic, dynamic>?) ??
            const <String, Object?>{},
      ),
      status: SyncStatus.values.byName(json['status'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      retryCount: (json['retry_count'] as num?)?.toInt() ?? 0,
      lastErrorCode: json['last_error_code'] as String?,
      lastSafeError: json['last_safe_error'] as String?,
      processedAt: json['processed_at'] == null
          ? null
          : DateTime.parse(json['processed_at'] as String),
    );
  }
}

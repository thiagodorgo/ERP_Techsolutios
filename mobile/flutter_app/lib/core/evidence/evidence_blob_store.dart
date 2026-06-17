import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import 'evidence_sync.dart';

abstract class EvidenceBlobStore {
  Future<String> save(Uint8List bytes, {required String contentType});
  Future<Uint8List?> load(String localBlobRef);
  Future<void> delete(String localBlobRef);
}

class FileEvidenceBlobStore implements EvidenceBlobStore {
  FileEvidenceBlobStore({String? rootPath, Uuid? uuid})
    : _rootPath = rootPath,
      _uuid = uuid ?? const Uuid();

  final String? _rootPath;
  final Uuid _uuid;

  @override
  Future<String> save(Uint8List bytes, {required String contentType}) async {
    if (bytes.isEmpty || bytes.length > evidenceMaxFileSizeBytes) {
      throw ArgumentError.value(bytes.length, 'bytes', 'Invalid evidence size');
    }

    final id = _uuid.v4();
    final file = await _fileForRef(_refForId(id));
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes, flush: true);
    return _refForId(id);
  }

  @override
  Future<Uint8List?> load(String localBlobRef) async {
    final file = await _fileForRef(localBlobRef);
    if (!await file.exists()) return null;
    return Uint8List.fromList(await file.readAsBytes());
  }

  @override
  Future<void> delete(String localBlobRef) async {
    final file = await _fileForRef(localBlobRef);
    if (await file.exists()) {
      await file.delete();
    }
  }

  Future<File> _fileForRef(String localBlobRef) async {
    final id = _idFromRef(localBlobRef);
    final rootPath =
        _rootPath ?? (await getApplicationDocumentsDirectory()).path;
    return File('$rootPath/evidence_blobs/$id.bin');
  }
}

class InMemoryEvidenceBlobStore implements EvidenceBlobStore {
  InMemoryEvidenceBlobStore({Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;
  final Map<String, Uint8List> _blobs = {};

  @override
  Future<String> save(Uint8List bytes, {required String contentType}) async {
    if (bytes.isEmpty || bytes.length > evidenceMaxFileSizeBytes) {
      throw ArgumentError.value(bytes.length, 'bytes', 'Invalid evidence size');
    }
    final ref = _refForId(_uuid.v4());
    _blobs[ref] = Uint8List.fromList(bytes);
    return ref;
  }

  @override
  Future<Uint8List?> load(String localBlobRef) async {
    final bytes = _blobs[localBlobRef];
    return bytes == null ? null : Uint8List.fromList(bytes);
  }

  @override
  Future<void> delete(String localBlobRef) async {
    _blobs.remove(localBlobRef);
  }
}

final evidenceBlobStoreProvider = Provider<EvidenceBlobStore>(
  (ref) => FileEvidenceBlobStore(),
);

String _refForId(String id) => 'evidence-blob:$id';

String _idFromRef(String localBlobRef) {
  const prefix = 'evidence-blob:';
  if (!localBlobRef.startsWith(prefix)) {
    throw ArgumentError.value(localBlobRef, 'localBlobRef', 'Invalid blob ref');
  }
  final id = localBlobRef.substring(prefix.length);
  if (!RegExp(r'^[A-Za-z0-9-]{8,80}$').hasMatch(id)) {
    throw ArgumentError.value(localBlobRef, 'localBlobRef', 'Invalid blob ref');
  }
  return id;
}

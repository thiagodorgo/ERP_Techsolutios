import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

enum EvidenceCaptureSource { camera, gallery }

class EvidencePickerResult {
  const EvidencePickerResult({
    required this.fileName,
    required this.mimeType,
    required this.sizeBytes,
    required this.captureSource,
  });

  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final EvidenceCaptureSource captureSource;
}

abstract class EvidencePickerService {
  Future<EvidencePickerResult?> pickImage(EvidenceCaptureSource source);
}

class ImagePickerEvidenceService implements EvidencePickerService {
  const ImagePickerEvidenceService();

  @override
  Future<EvidencePickerResult?> pickImage(EvidenceCaptureSource source) async {
    final picker = ImagePicker();
    final imageSource = source == EvidenceCaptureSource.camera
        ? ImageSource.camera
        : ImageSource.gallery;

    XFile? file;
    try {
      file = await picker.pickImage(
        source: imageSource,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
    } catch (_) {
      return null;
    }
    if (file == null) return null;

    final bytes = await file.readAsBytes();
    final name = file.name.isNotEmpty
        ? file.name
        : 'evidencia-${DateTime.now().millisecondsSinceEpoch}.jpg';

    return EvidencePickerResult(
      fileName: name,
      mimeType: 'image/jpeg',
      sizeBytes: bytes.length,
      captureSource: source,
    );
  }
}

final evidencePickerProvider = Provider<EvidencePickerService>(
  (ref) => const ImagePickerEvidenceService(),
);

Future<EvidenceCaptureSource?> showEvidenceSourcePicker(BuildContext context) =>
    showModalBottomSheet<EvidenceCaptureSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Camera'),
              onTap: () => Navigator.of(ctx).pop(EvidenceCaptureSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Galeria'),
              onTap: () => Navigator.of(ctx).pop(EvidenceCaptureSource.gallery),
            ),
          ],
        ),
      ),
    );

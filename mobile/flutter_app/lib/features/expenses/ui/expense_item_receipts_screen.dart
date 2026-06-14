import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/evidence/evidence_picker.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/expense_repository.dart';
import '../domain/expense_models.dart';

class ExpenseItemReceiptsScreen extends ConsumerStatefulWidget {
  const ExpenseItemReceiptsScreen({
    required this.reportId,
    required this.itemId,
    super.key,
  });

  final String reportId;
  final String itemId;

  @override
  ConsumerState<ExpenseItemReceiptsScreen> createState() =>
      _ExpenseItemReceiptsScreenState();
}

class _ExpenseItemReceiptsScreenState
    extends ConsumerState<ExpenseItemReceiptsScreen> {
  bool _adding = false;

  Future<void> _addReceipt() async {
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    final picker = ref.read(evidencePickerProvider);
    setState(() => _adding = true);
    try {
      final result = await picker.pickImage(source);
      if (result == null || !mounted) return;
      final captureSource = source == EvidenceCaptureSource.camera
          ? ReceiptCaptureSource.camera
          : ReceiptCaptureSource.gallery;
      await ref
          .read(expenseRepositoryProvider)
          .attachReceiptPlaceholder(
            reportLocalId: widget.reportId,
            itemLocalId: widget.itemId,
            fileName: result.fileName,
            mimeType: result.mimeType,
            captureSource: captureSource,
          );
      if (mounted) setState(() {});
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repository = ref.watch(expenseRepositoryProvider);

    return FutureBuilder<void>(
      future: repository.load(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const ErpScaffold(
            title: 'Comprovantes',
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final receipts = repository.receiptsForItem(
          widget.reportId,
          widget.itemId,
        );

        return ErpScaffold(
          title: 'Comprovantes',
          body: receipts.isEmpty
              ? EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: 'Sem comprovantes',
                  message: 'Adicione um comprovante a este item.',
                  action: FilledButton.icon(
                    onPressed: _adding ? null : _addReceipt,
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    label: Text(
                      _adding ? 'Registrando...' : 'Adicionar comprovante',
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final receipt in receipts)
                      _ReceiptCard(receipt: receipt),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _adding ? null : _addReceipt,
                      icon: const Icon(Icons.add_photo_alternate_outlined),
                      label: Text(
                        _adding ? 'Registrando...' : 'Adicionar comprovante',
                      ),
                    ),
                  ],
                ),
        );
      },
    );
  }
}

class _ReceiptCard extends StatelessWidget {
  const _ReceiptCard({required this.receipt});

  final Receipt receipt;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.receipt_long_outlined),
        title: Text(receipt.fileName),
        subtitle: Text(
          '${receipt.mimeType} · ${_formatBytes(receipt.sizeBytes)} · ${_captureLabel(receipt.captureSource)}',
        ),
        trailing: OperationalStatusChip(
          label: _uploadLabel(receipt.uploadStatus),
          status: _uploadTone(receipt.uploadStatus),
        ),
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes == 0) return '0 B';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1048576) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / 1048576).toStringAsFixed(1)} MB';
  }

  String _captureLabel(ReceiptCaptureSource source) {
    return switch (source) {
      ReceiptCaptureSource.camera => 'Camera',
      ReceiptCaptureSource.gallery => 'Galeria',
      ReceiptCaptureSource.file => 'Arquivo',
      ReceiptCaptureSource.manualPlaceholder => 'Placeholder',
    };
  }

  String _uploadLabel(ReceiptUploadStatus status) {
    return switch (status) {
      ReceiptUploadStatus.local => 'Local',
      ReceiptUploadStatus.pending => 'Pendente',
      ReceiptUploadStatus.uploading => 'Enviando',
      ReceiptUploadStatus.uploaded => 'Enviado',
      ReceiptUploadStatus.failed => 'Falhou',
      ReceiptUploadStatus.conflict => 'Conflito',
    };
  }

  String _uploadTone(ReceiptUploadStatus status) {
    return switch (status) {
      ReceiptUploadStatus.local => 'info',
      ReceiptUploadStatus.pending => 'warning',
      ReceiptUploadStatus.uploading => 'info',
      ReceiptUploadStatus.uploaded => 'success',
      ReceiptUploadStatus.failed => 'danger',
      ReceiptUploadStatus.conflict => 'warning',
    };
  }
}

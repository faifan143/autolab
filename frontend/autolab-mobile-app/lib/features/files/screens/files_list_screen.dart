import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:provider/provider.dart';

import '../../../core/models/file_model.dart';
import '../../../core/providers/files_provider.dart';
import '../../../core/providers/labs_provider.dart';
import '../../../core/services/files_service.dart';

class FilesListScreen extends StatefulWidget {
  final String? labId;
  final String? sessionId;
  final String? labName;

  const FilesListScreen({
    super.key,
    this.labId,
    this.sessionId,
    this.labName,
  });

  @override
  State<FilesListScreen> createState() => _FilesListScreenState();
}

class _FilesListScreenState extends State<FilesListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final filesProvider =
          Provider.of<FilesProvider>(context, listen: false);
      final labsProvider = Provider.of<LabsProvider>(context, listen: false);

      if (labsProvider.labs.isEmpty) {
        await labsProvider.loadLabs();
      }

      await filesProvider.loadFiles(
        labId: widget.labId,
        sessionId: widget.sessionId,
      );
    });
  }

  String get _screenTitle {
    if (widget.sessionId != null) {
      return 'files.session.title'.tr;
    }
    if (widget.labName != null && widget.labName!.isNotEmpty) {
      return 'files.lab.title'.trParams({'name': widget.labName!});
    }
    return 'files.title'.tr;
  }

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(withReadStream: false);
    if (result == null || result.files.isEmpty) return;

    final picked = result.files.first;
    final path = picked.path;
    if (path == null) return;

    if (!mounted) return;

    final filesProvider = Provider.of<FilesProvider>(context, listen: false);
    final uploaded = await filesProvider.uploadFile(
      path,
      labId: widget.labId,
      sessionId: widget.sessionId,
    );

    if (!mounted) return;

    if (uploaded != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('files.upload.success'.tr)),
      );
    } else if (filesProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('files.upload.error'.tr)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filesProvider = context.watch<FilesProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(_screenTitle),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: filesProvider.isUploading ? null : _pickAndUpload,
        icon: filesProvider.isUploading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.upload_file),
        label: Text('files.upload'.tr),
      ),
      body: Builder(
        builder: (context) {
          if (filesProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (filesProvider.error != null) {
            return _FilesErrorView(
              message: filesProvider.error!,
              onRetry: () => filesProvider.loadFiles(
                labId: filesProvider.selectedLabId,
                sessionId: filesProvider.selectedSessionId,
                ownerId: filesProvider.ownerId,
              ),
            );
          }

          if (filesProvider.files.isEmpty) {
            return Center(
              child: Text('files.empty'.tr),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filesProvider.files.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final file = filesProvider.files[index];
              return _FileCard(
                file: file,
                onTap: () => _showFileDetails(context, file),
                onOpen: () => _openFile(context, file),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _openFile(BuildContext context, FileModel file) async {
    if (_isImage(file)) {
      await _showImagePreview(context, file);
      return;
    }

    final filesProvider = Provider.of<FilesProvider>(context, listen: false);
    if (filesProvider.isDownloading) return;

    final downloaded = await filesProvider.downloadFile(file);
    if (!context.mounted) return;

    if (downloaded == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('files.open_failed'.tr)),
      );
      return;
    }

    final result = await OpenFilex.open(downloaded.path);
    if (!context.mounted) return;

    if (result.type != ResultType.done) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('files.no_app'.tr)),
      );
    }
  }

  bool _isImage(FileModel file) {
    return FilesService.isImageFile(file.mimeType) ||
        FilesService.isImageFileByName(file.fileName);
  }

  Future<void> _showImagePreview(BuildContext context, FileModel file) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (context) => _ImagePreviewScreen(file: file),
      ),
    );
  }

  void _showFileDetails(BuildContext context, FileModel file) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final formatter = DateFormat('yyyy-MM-dd HH:mm');

    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'files.details.title'.tr,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                file.fileName,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              if (file.description != null && file.description!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    file.description!,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              const SizedBox(height: 4),
              _DetailRow(
                label: 'files.size'.tr,
                value: _formatSize(file.size),
              ),
              _DetailRow(
                label: 'files.createdAt'.tr,
                value: file.createdAt == null
                    ? '—'
                    : formatter.format(file.createdAt!.toLocal()),
              ),
              if (file.labId != null)
                _DetailRow(
                  label: 'files.lab'.tr,
                  value: file.labId!,
                ),
              if (file.sessionId != null)
                _DetailRow(
                  label: 'files.session'.tr,
                  value: file.sessionId!,
                ),
              _DetailRow(
                label: 'files.owner'.tr,
                value: file.owner?.name ?? file.ownerId,
              ),
              const SizedBox(height: 16),
              Consumer<FilesProvider>(
                builder: (context, filesProvider, _) {
                  final isImage = _isImage(file);
                  final isBusy = filesProvider.isDownloading;

                  return SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: isBusy
                          ? null
                          : () async {
                              Navigator.of(context).pop();
                              if (isImage) {
                                await _showImagePreview(context, file);
                              } else {
                                await _openFile(context, file);
                              }
                            },
                      icon: isBusy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(isImage ? Icons.image : Icons.open_in_new),
                      label: Text(
                        isBusy
                            ? 'files.downloading'.tr
                            : isImage
                                ? 'files.view_image'.tr
                                : 'files.download'.tr,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(
                  'close'.tr,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: color.primary,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatSize(int bytes) {
    const int k = 1024;
    if (bytes < k) return '$bytes B';
    final kb = bytes / k;
    if (kb < k) return '${kb.toStringAsFixed(1)} KB';
    final mb = kb / k;
    if (mb < k) return '${mb.toStringAsFixed(1)} MB';
    final gb = mb / k;
    return '${gb.toStringAsFixed(1)} GB';
  }
}

class _FileCard extends StatelessWidget {
  final FileModel file;
  final VoidCallback onTap;
  final VoidCallback onOpen;

  const _FileCard({
    required this.file,
    required this.onTap,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final formatter = DateFormat('yyyy-MM-dd HH:mm');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: color.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.insert_drive_file, color: color.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      file.fileName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      file.createdAt == null
                          ? _formatSize(file.size)
                          : '${_formatSize(file.size)} • ${formatter.format(file.createdAt!.toLocal())}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: color.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'files.download'.tr,
                onPressed: onOpen,
                icon: const Icon(Icons.open_in_new),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatSize(int bytes) {
    const int k = 1024;
    if (bytes < k) return '$bytes B';
    final kb = bytes / k;
    if (kb < k) return '${kb.toStringAsFixed(1)} KB';
    final mb = kb / k;
    if (mb < k) return '${mb.toStringAsFixed(1)} MB';
    final gb = mb / k;
    return '${gb.toStringAsFixed(1)} GB';
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 4),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: theme.textTheme.bodySmall?.copyWith(
              color: color.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodySmall,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _ImagePreviewScreen extends StatefulWidget {
  final FileModel file;

  const _ImagePreviewScreen({required this.file});

  @override
  State<_ImagePreviewScreen> createState() => _ImagePreviewScreenState();
}

class _ImagePreviewScreenState extends State<_ImagePreviewScreen> {
  File? _imageFile;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadImage);
  }

  Future<void> _loadImage() async {
    final provider = Provider.of<FilesProvider>(context, listen: false);
    final downloaded = await provider.downloadFile(widget.file);
    if (!mounted) return;

    setState(() {
      _loading = false;
      if (downloaded != null) {
        _imageFile = downloaded;
      } else {
        _error = provider.error ?? 'files.load_image_failed'.tr;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          widget.file.fileName,
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator(color: Colors.white)
            : _error != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: Colors.white,
                        size: 48,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'files.load_image_failed'.tr,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  )
                : InteractiveViewer(
                    minScale: 0.5,
                    maxScale: 4,
                    child: Image.file(
                      _imageFile!,
                      fit: BoxFit.contain,
                    ),
                  ),
      ),
    );
  }
}

class _FilesErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _FilesErrorView({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 56,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'files.error'.tr,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text('retry'.tr),
            ),
          ],
        ),
      ),
    );
  }
}


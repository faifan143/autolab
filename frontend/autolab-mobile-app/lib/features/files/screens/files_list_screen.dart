import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/models/file_model.dart';
import '../../../core/providers/files_provider.dart';
import '../../../core/providers/labs_provider.dart';

class FilesListScreen extends StatefulWidget {
  final String? labId;
  final String? sessionId;

  const FilesListScreen({super.key, this.labId, this.sessionId});

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

  @override
  Widget build(BuildContext context) {
    final filesProvider = context.watch<FilesProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text('files.title'.tr),
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
                onOpen: () async {
                  final url = await filesProvider.downloadFile(file.id);
                  if (url == null || !context.mounted) return;
                  final uri = Uri.tryParse(url);
                  if (uri != null && await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('files.error'.tr),
                      ),
                    );
                  }
                },
              );
            },
          );
        },
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
                value: formatter.format(file.createdAt.toLocal()),
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
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    final filesProvider =
                        Provider.of<FilesProvider>(context, listen: false);
                    final url = await filesProvider.downloadFile(file.id);
                    if (!context.mounted) return;
                    if (url == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('files.error'.tr)),
                      );
                      return;
                    }
                    final uri = Uri.tryParse(url);
                    if (uri != null && await canLaunchUrl(uri)) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('files.error'.tr)),
                      );
                    }
                  },
                  icon: const Icon(Icons.open_in_new),
                  label: Text('files.download'.tr),
                ),
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
                      '${_formatSize(file.size)} • ${formatter.format(file.createdAt.toLocal())}',
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


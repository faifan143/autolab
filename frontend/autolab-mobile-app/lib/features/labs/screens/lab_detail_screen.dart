import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';

import '../../../core/models/lab_model.dart';
import '../../../core/providers/labs_provider.dart';
import '../../../core/routes/app_routes.dart';

class LabDetailScreen extends StatelessWidget {
  final String labId;
  final String? labName;

  const LabDetailScreen({super.key, required this.labId, this.labName});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(labName ?? 'labs.detail.title'.tr),
      ),
      body: Consumer<LabsProvider>(
        builder: (context, labsProvider, _) {
          LabModel? lab;
          for (final item in labsProvider.labs) {
            if (item.id == labId) {
              lab = item;
              break;
            }
          }

          final name = lab?.name ?? labName ?? labId;
          final studentsCount = lab?.students?.length ?? lab?.studentIds.length ?? 0;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: color.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: color.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(Icons.science_outlined, color: color.primary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${'students'.tr}: $studentsCount',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: color.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.05,
                children: [
                  _LabActionCard(
                    icon: Icons.groups_outlined,
                    title: 'students'.tr,
                    subtitle: 'labs.students.subtitle'.tr,
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRoutes.labStudents,
                      arguments: {'labId': labId, 'labName': name},
                    ),
                  ),
                  _LabActionCard(
                    icon: Icons.event_outlined,
                    title: 'sessions'.tr,
                    subtitle: 'create.track.sessions'.tr,
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRoutes.sessions,
                      arguments: {'labId': labId, 'labName': name},
                    ),
                  ),
                  _LabActionCard(
                    icon: Icons.chat_bubble_outline,
                    title: 'chat'.tr,
                    subtitle: 'labs.chat.subtitle'.tr,
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRoutes.chat,
                      arguments: {
                        'channel': 'lab:$labId',
                        'labId': labId,
                        'title': name,
                      },
                    ),
                  ),
                  _LabActionCard(
                    icon: Icons.folder_open_outlined,
                    title: 'files'.tr,
                    subtitle: 'labs.files.subtitle'.tr,
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRoutes.files,
                      arguments: {'labId': labId, 'labName': name},
                    ),
                  ),
                  _LabActionCard(
                    icon: Icons.grade_outlined,
                    title: 'grading'.tr,
                    subtitle: 'evaluate.publish'.tr,
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRoutes.grades,
                      arguments: {'labId': labId},
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (lab?.isArchived == true)
                _StatusBanner(
                  icon: Icons.archive_outlined,
                  text: 'labs.archive.already'.tr,
                )
              else if (lab?.archiveRequested == true)
                _StatusBanner(
                  icon: Icons.hourglass_top_outlined,
                  text: 'labs.archive.request.pending'.tr,
                )
              else
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: labsProvider.isRequestingArchive
                        ? null
                        : () => _openArchiveRequestSheet(context, labId),
                    icon: labsProvider.isRequestingArchive
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.archive_outlined),
                    label: Text('labs.archive.request'.tr),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  void _openArchiveRequestSheet(BuildContext context, String labId) {
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 8,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'labs.archive.request'.tr,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'labs.archive.request.hint'.tr,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: reasonController,
                  minLines: 3,
                  maxLines: 5,
                  maxLength: 1000,
                  decoration: InputDecoration(
                    hintText: 'labs.archive.request.reason.hint'.tr,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      final provider = context.read<LabsProvider>();
                      final ok = await provider.requestArchiveLab(
                        labId,
                        reason: reasonController.text,
                      );
                      if (!context.mounted) return;
                      if (ok) {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('labs.archive.request.sent'.tr),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content:
                                Text(provider.error ?? 'unknown.error'.tr),
                          ),
                        );
                      }
                    },
                    child: Text('labs.archive.request.submit'.tr),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LabActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _LabActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: color.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color.primary, size: 22),
              ),
              const Spacer(),
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: color.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final IconData icon;
  final String text;

  const _StatusBanner({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color.onSecondaryContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: color.onSecondaryContainer,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

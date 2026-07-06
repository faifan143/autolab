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
                        color: color.primary.withOpacity(0.15),
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
            ],
          );
        },
      ),
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
                  color: color.primary.withOpacity(0.15),
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

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/models/attendance_model.dart';
import '../../../core/models/lab_model.dart';
import '../../../core/models/session_model.dart';
import '../../../core/providers/attendance_provider.dart';
import '../../../core/providers/labs_provider.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AttendanceProvider(),
      child: const _AttendanceContent(),
    );
  }
}

class _AttendanceContent extends StatefulWidget {
  const _AttendanceContent();

  @override
  State<_AttendanceContent> createState() => _AttendanceContentState();
}

class _AttendanceContentState extends State<_AttendanceContent> {
  LabModel? selectedLab;
  String? selectedSession;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final labsProvider = context.read<LabsProvider>();
      if (labsProvider.labs.isEmpty) {
        labsProvider.loadLabs();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final labsProvider = context.watch<LabsProvider>();
    final attendance = context.watch<AttendanceProvider>();

    return Scaffold(
      appBar: AppBar(title: Text('attendance'.tr)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionTitle(text: 'my.labs'.tr),
          const SizedBox(height: 8),
          _LabDropdown(
            labs: labsProvider.labs,
            loading: labsProvider.isLoading,
            selected: selectedLab,
            onChanged: (lab) {
              setState(() {
                selectedLab = lab;
                selectedSession = null;
              });
              if (lab != null) {
                attendance.loadSessions(lab.id);
              }
            },
          ),
          const SizedBox(height: 16),
          _SectionTitle(text: 'sessions'.tr),
          const SizedBox(height: 8),
          _SessionDropdown(
            sessions: attendance.sessions,
            loading: attendance.loadingSessions,
            selected: selectedSession,
            onChanged: (sessionId) {
              setState(() => selectedSession = sessionId);
              if (sessionId != null) {
                attendance.loadAttendance(sessionId);
              }
            },
          ),
          const SizedBox(height: 16),
          if (selectedSession != null) ...[
            _ActionRow(
              onGenerateStart: () => _handleGenerateQr(context, false),
              onGenerateEnd: () => _handleGenerateQr(context, true),
            ),
            const SizedBox(height: 16),
            _AttendanceSummary(attendance: attendance.attendance),
            const SizedBox(height: 16),
            _AttendanceList(attendance: attendance.attendance),
          ] else
            Text(
              'select.session.prompt'.tr,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
        ],
      ),
    );
  }

  Future<void> _handleGenerateQr(BuildContext context, bool isEnd) async {
    final attendance = context.read<AttendanceProvider>();
    if ((isEnd && attendance.endQrToken == null) ||
        (!isEnd && attendance.startQrToken == null)) {
      final ok = await attendance.generateQr();
      if (!ok) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(attendance.error ?? 'unknown.error'.tr)),
          );
        }
        return;
      }
    }
    if (!context.mounted) return;
    final token = isEnd ? attendance.endQrToken : attendance.startQrToken;
    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(attendance.error ?? 'unknown.error'.tr)),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (_) {
        final expires = attendance.qrExpiresAt != null
            ? DateFormat('HH:mm').format(attendance.qrExpiresAt!.toLocal())
            : null;
        return AlertDialog(
          title: Text(isEnd ? 'end.qr'.tr : 'start.qr'.tr),
          content: SizedBox(
            width: 260,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 220,
                  height: 220,
                  child: QrImageView(
                    data: token,
                    version: QrVersions.auto,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                if (expires != null) Text('${'expires.at'.tr} $expires'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('close'.tr),
            ),
          ],
        );
      },
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle({required this.text});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
    );
  }
}

class _LabDropdown extends StatelessWidget {
  final List<LabModel> labs;
  final bool loading;
  final LabModel? selected;
  final ValueChanged<LabModel?> onChanged;

  const _LabDropdown({
    required this.labs,
    required this.loading,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (labs.isEmpty) {
      return Text('no.labs.yet'.tr);
    }
    return DropdownButtonFormField<LabModel>(
      initialValue: selected,
      items: labs
          .map(
            (lab) => DropdownMenuItem(
              value: lab,
              child: Text(lab.name),
            ),
          )
          .toList(),
      onChanged: onChanged,
      decoration: InputDecoration(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _SessionDropdown extends StatelessWidget {
  final List<SessionModel> sessions;
  final bool loading;
  final String? selected;
  final ValueChanged<String?> onChanged;

  const _SessionDropdown({
    required this.sessions,
    required this.loading,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (sessions.isEmpty) {
      return Text('no.sessions'.tr);
    }
    return DropdownButtonFormField<String>(
      initialValue: selected,
      items: sessions
          .map<DropdownMenuItem<String>>(
            (session) => DropdownMenuItem<String>(
              value: session.id,
              child: Text(
                DateFormat('EEE, MMM d • HH:mm')
                    .format(session.startTime.toLocal()),
              ),
            ),
          )
          .toList(),
      onChanged: onChanged,
      decoration: InputDecoration(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final VoidCallback onGenerateStart;
  final VoidCallback onGenerateEnd;
  const _ActionRow({
    required this.onGenerateStart,
    required this.onGenerateEnd,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: onGenerateStart,
            icon: const Icon(Icons.qr_code_2),
            label: Text('start.qr'.tr),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onGenerateEnd,
            icon: const Icon(Icons.qr_code_2_outlined),
            label: Text('end.qr'.tr),
          ),
        ),
      ],
    );
  }
}

class _AttendanceSummary extends StatelessWidget {
  final SessionAttendanceResponse? attendance;
  const _AttendanceSummary({required this.attendance});

  @override
  Widget build(BuildContext context) {
    if (attendance == null) {
      return const SizedBox.shrink();
    }
    final summary = attendance!.summary;
    Widget chip(String label, int value, Color color) {
      return Expanded(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Text(
                '$value',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: color),
              ),
            ],
          ),
        ),
      );
    }

    final scheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        chip('present'.tr, summary.present, scheme.primary),
        const SizedBox(width: 12),
        chip('late'.tr, summary.late, scheme.tertiary),
        const SizedBox(width: 12),
        chip('absent'.tr, summary.absent, scheme.error),
      ],
    );
  }
}

class _AttendanceList extends StatelessWidget {
  final SessionAttendanceResponse? attendance;
  const _AttendanceList({required this.attendance});

  @override
  Widget build(BuildContext context) {
    if (attendance == null || attendance!.attendance.isEmpty) {
      return Text('no.records'.tr);
    }
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        ...attendance!.attendance.map((record) {
          final color = switch (record.status) {
            'present' => scheme.primary,
            'late' => scheme.tertiary,
            _ => scheme.error,
          };
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: color.withOpacity(0.15),
                  child: Text(
                    record.student?.name.substring(0, 1).toUpperCase() ?? '?',
                    style: TextStyle(color: color),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.student?.name ?? '—',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        DateFormat('HH:mm').format(record.timestamp.toLocal()),
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    record.status.tr,
                    style: TextStyle(color: color),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

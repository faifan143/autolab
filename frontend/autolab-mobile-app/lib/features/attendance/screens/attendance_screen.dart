import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/models/attendance_model.dart';
import '../../../core/models/lab_model.dart';
import '../../../core/models/session_model.dart';
import '../../../core/providers/attendance_provider.dart';
import '../../../core/providers/labs_provider.dart';
import 'attendance_scanner_screen.dart';

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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
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
                attendance.loadAttendance(
                  sessionId,
                  totalStudents: selectedLab?.studentIds.length,
                  knownStudents: selectedLab?.students,
                );
              }
            },
          ),
          const SizedBox(height: 16),
          if (selectedSession != null) ...[
            _ScanStudentButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ChangeNotifierProvider.value(
                      value: attendance,
                      child: AttendanceScannerScreen(
                        sessionId: selectedSession!,
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            if (attendance.loadingAttendance)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
            _AttendanceSummary(attendance: attendance.attendance),
            const SizedBox(height: 16),
            _AttendanceList(attendance: attendance.attendance),
            ],
          ] else
            Text(
              'select.session.prompt'.tr,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
        ],
      ),
    );
  }
}

class _ScanStudentButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _ScanStudentButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: const Icon(Icons.qr_code_scanner),
        label: Text('scan.student.qr'.tr),
      ),
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
            color: color.withValues(alpha: 0.12),
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
                  backgroundColor: color.withValues(alpha: 0.15),
                  child: Text(
                    _initialFor(record.student?.name),
                    style: TextStyle(color: color),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.student?.name ??
                            '${'student'.tr} ${record.studentId.substring(0, 6)}',
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
                    color: color.withValues(alpha: 0.15),
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

  String _initialFor(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final trimmed = name.trim();
    return trimmed.substring(0, 1).toUpperCase();
  }
}

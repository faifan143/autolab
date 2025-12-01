import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/models/session_model.dart';
import '../../../core/providers/sessions_provider.dart';

class SessionsListScreen extends StatelessWidget {
  final String? labId;

  const SessionsListScreen({super.key, this.labId});

  @override
  Widget build(BuildContext context) {
    final id = labId;
    if (id == null) {
      return Scaffold(
        appBar: AppBar(title: Text('sessions'.tr)),
        body: Center(child: Text('no.lab.selected'.tr)),
      );
    }

    return ChangeNotifierProvider(
      create: (_) => SessionsProvider()..loadSessions(id),
      builder: (context, _) {
        final provider = Provider.of<SessionsProvider>(context);
        return Scaffold(
          appBar: AppBar(
            title: Text('sessions'.tr),
          ),
          body: _SessionsBody(provider: provider),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _openCreateBottomSheet(context, provider),
            icon: const Icon(Icons.add),
            label: Text('new.session'.tr),
          ),
        );
      },
    );
  }

  void _openCreateBottomSheet(BuildContext context, SessionsProvider provider) {
    final formKey = GlobalKey<FormState>();
    DateTime? start;
    DateTime? end;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            top: 16,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'create.session'.tr,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                _DateField(
                  label: 'start.time'.tr,
                  onPicked: (value) => start = value,
                ),
                const SizedBox(height: 12),
                _DateField(
                  label: 'end.time'.tr,
                  onPicked: (value) => end = value,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (start == null || end == null) return;
                      if (end!.isBefore(start!)) return;
                      final ok = await provider.createSession(
                        startTime: start!,
                        endTime: end!,
                      );
                      if (context.mounted) {
                        if (ok) Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(ok
                                ? 'session.created'.tr
                                : provider.error ?? 'unknown.error'.tr),
                          ),
                        );
                      }
                    },
                    child: Text('save'.tr),
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

class _SessionsBody extends StatelessWidget {
  final SessionsProvider provider;
  const _SessionsBody({required this.provider});

  @override
  Widget build(BuildContext context) {
    if (provider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (provider.error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(provider.error!),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => provider.loadSessions(provider.labId ?? ''),
              child: Text('retry'.tr),
            ),
          ],
        ),
      );
    }
    if (provider.sessions.isEmpty) {
      return Center(child: Text('no.sessions'.tr));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: provider.sessions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final session = provider.sessions[index];
        return _SessionCard(session: session);
      },
    );
  }
}

class _SessionCard extends StatelessWidget {
  final SessionModel session;
  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final formatter = DateFormat('EEE, MMM d • HH:mm');
    final start = formatter.format(session.startTime.toLocal());
    final end = formatter.format(session.endTime.toLocal());

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () {},
      child: Ink(
        decoration: BoxDecoration(
          color: color.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.event_outlined, color: color.primary),
                  const SizedBox(width: 8),
                  Text(
                    start,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${'end.time'.tr}: $end',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: color.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  _chip(
                    context,
                    label: session.isStreaming ? 'streaming'.tr : 'scheduled'.tr,
                    color: session.isStreaming
                        ? color.primary
                        : color.onSurfaceVariant,
                  ),
                  if (session.recordedVideoUrl != null)
                    _chip(
                      context,
                      label: 'recorded'.tr,
                      color: color.secondary,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(BuildContext context,
      {required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _DateField extends StatefulWidget {
  final String label;
  final ValueChanged<DateTime> onPicked;
  const _DateField({required this.label, required this.onPicked});

  @override
  State<_DateField> createState() => _DateFieldState();
}

class _DateFieldState extends State<_DateField> {
  DateTime? value;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('EEE, MMM d • HH:mm');
    return OutlinedButton(
      onPressed: () async {
        final now = DateTime.now();
        final date = await showDatePicker(
          context: context,
          initialDate: value ?? now,
          firstDate: now.subtract(const Duration(days: 1)),
          lastDate: now.add(const Duration(days: 365)),
        );
        if (date == null) return;
        final time = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.fromDateTime(value ?? now),
        );
        if (time == null) return;
        final picked = DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        );
        setState(() => value = picked);
        widget.onPicked(picked);
      },
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          value == null ? widget.label : formatter.format(value!),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}


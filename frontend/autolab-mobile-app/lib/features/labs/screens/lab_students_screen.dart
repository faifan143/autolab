import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';

import '../../../core/models/lab_model.dart';
import '../../../core/models/user_model.dart';
import '../../../core/providers/labs_provider.dart';

class LabStudentsScreen extends StatefulWidget {
  final String labId;
  final String? labName;

  const LabStudentsScreen({super.key, required this.labId, this.labName});

  @override
  State<LabStudentsScreen> createState() => _LabStudentsScreenState();
}

class _LabStudentsScreenState extends State<LabStudentsScreen> {
  List<UserModel> _students = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadStudents);
  }

  Future<void> _loadStudents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final provider = context.read<LabsProvider>();
      if (provider.labs.isEmpty) {
        await provider.loadLabs();
      }
      final students = await provider.resolveLabStudents(widget.labId);
      if (!mounted) return;
      setState(() {
        _students = students;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _removeStudent(UserModel student) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('labs.students.remove.title'.tr),
        content: Text(
          'labs.students.remove.message'.trParams({'name': student.name}),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('cancel'.tr),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('labs.students.remove'.tr),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final provider = context.read<LabsProvider>();
    final ok = await provider.removeStudentFromLab(widget.labId, student.id);
    if (!mounted) return;

    if (ok) {
      setState(() {
        _students = _students.where((s) => s.id != student.id).toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('labs.students.removed'.tr)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'labs.students.error'.tr),
        ),
      );
    }
  }

  void _openAddStudentSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _AddStudentSheet(
        labId: widget.labId,
        enrolledIds: _students.map((s) => s.id).toSet(),
        onAdded: (student) {
          setState(() {
            if (!_students.any((s) => s.id == student.id)) {
              _students = [..._students, student];
            }
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final labsProvider = context.watch<LabsProvider>();
    final LabModel? lab = labsProvider.getLabById(widget.labId);
    final title = lab?.name ?? widget.labName ?? 'students'.tr;

    return Scaffold(
      appBar: AppBar(
        title: Text('labs.students.title'.tr),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: labsProvider.isMutatingStudents ? null : _openAddStudentSheet,
        icon: const Icon(Icons.person_add_outlined),
        label: Text('labs.students.add'.tr),
      ),
      body: _buildBody(title, labsProvider.isMutatingStudents),
    );
  }

  Widget _buildBody(String labTitle, bool mutating) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _loadStudents,
                child: Text('retry'.tr),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadStudents,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
        children: [
          Text(
            labTitle,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'labs.students.count'.trParams({
              'count': '${_students.length}',
            }),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          if (_students.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Column(
                children: [
                  Icon(
                    Icons.groups_outlined,
                    size: 48,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'no.students.in.lab'.tr,
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'labs.students.empty.hint'.tr,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          else
            ..._students.map(
              (student) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _StudentCard(
                  student: student,
                  busy: mutating,
                  onRemove: () => _removeStudent(student),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StudentCard extends StatelessWidget {
  final UserModel student;
  final bool busy;
  final VoidCallback onRemove;

  const _StudentCard({
    required this.student,
    required this.busy,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Ink(
      decoration: BoxDecoration(
        color: color.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.primary.withOpacity(0.15),
              child: Text(
                student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                style: TextStyle(
                  color: color.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (student.email.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      student.email,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: color.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              tooltip: 'labs.students.remove'.tr,
              onPressed: busy ? null : onRemove,
              icon: Icon(Icons.person_remove_outlined, color: color.error),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddStudentSheet extends StatefulWidget {
  final String labId;
  final Set<String> enrolledIds;
  final ValueChanged<UserModel> onAdded;

  const _AddStudentSheet({
    required this.labId,
    required this.enrolledIds,
    required this.onAdded,
  });

  @override
  State<_AddStudentSheet> createState() => _AddStudentSheetState();
}

class _AddStudentSheetState extends State<_AddStudentSheet> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  List<UserModel> _results = [];
  bool _searching = false;
  bool _adding = false;
  String? _error;
  String? _addingId;

  @override
  void initState() {
    super.initState();
    _search('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      _search(value);
    });
  }

  Future<void> _search(String query) async {
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final results = await context.read<LabsProvider>().searchStudents(
            query: query,
          );
      if (!mounted) return;
      setState(() {
        _results = results
            .where((s) => !widget.enrolledIds.contains(s.id))
            .toList();
        _searching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _searching = false;
        _results = [];
      });
    }
  }

  Future<void> _addStudent(UserModel student) async {
    setState(() {
      _adding = true;
      _addingId = student.id;
    });
    final provider = context.read<LabsProvider>();
    final ok = await provider.addStudentToLab(widget.labId, student);
    if (!mounted) return;

    setState(() {
      _adding = false;
      _addingId = null;
    });

    if (ok) {
      widget.onAdded(student);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('labs.students.added'.tr)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'labs.students.error'.tr),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: bottomInset + 16,
        top: 8,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.65,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'labs.students.add'.tr,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              onChanged: _onQueryChanged,
              decoration: InputDecoration(
                hintText: 'labs.students.search.hint'.tr,
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_searching)
              const Expanded(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Expanded(child: Center(child: Text(_error!)))
            else if (_results.isEmpty)
              Expanded(
                child: Center(
                  child: Text(
                    'labs.students.search.empty'.tr,
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  itemCount: _results.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final student = _results[index];
                    final isThis =
                        _adding && _addingId == student.id;
                    return ListTile(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      tileColor: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
                      leading: CircleAvatar(
                        child: Text(
                          student.name.isNotEmpty
                              ? student.name[0].toUpperCase()
                              : '?',
                        ),
                      ),
                      title: Text(student.name),
                      subtitle: student.email.isEmpty
                          ? null
                          : Text(student.email),
                      trailing: isThis
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : IconButton(
                              tooltip: 'labs.students.add'.tr,
                              onPressed:
                                  _adding ? null : () => _addStudent(student),
                              icon: const Icon(Icons.person_add_alt_1),
                            ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

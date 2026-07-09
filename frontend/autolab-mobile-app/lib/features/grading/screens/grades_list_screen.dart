import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/models/grade_model.dart';
import '../../../core/models/lab_model.dart';
import '../../../core/providers/grades_provider.dart';
import '../../../core/providers/labs_provider.dart';

class GradesListScreen extends StatelessWidget {
  final String? labId;

  const GradesListScreen({super.key, this.labId});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => GradesProvider(),
      child: _GradesContent(initialLabId: labId),
    );
  }
}

class _GradesContent extends StatefulWidget {
  final String? initialLabId;
  const _GradesContent({this.initialLabId});

  @override
  State<_GradesContent> createState() => _GradesContentState();
}

class _GradesContentState extends State<_GradesContent> {
  LabModel? selectedLab;
  Map<String, String> _studentNamesById = const {};

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final labsProvider = context.read<LabsProvider>();
      final gradesProvider = context.read<GradesProvider>();
      if (labsProvider.labs.isEmpty) {
        await labsProvider.loadLabs();
      }
      gradesProvider.labs = labsProvider.labs;
      if (gradesProvider.categories.isEmpty && !gradesProvider.loadingCategories) {
        await gradesProvider.loadCategories();
      }
      if (widget.initialLabId != null) {
        selectedLab = labsProvider.labs
            .firstWhereOrNull((lab) => lab.id == widget.initialLabId);
        if (selectedLab != null) {
          gradesProvider.selectedLab = selectedLab;
          await _loadStudentNamesForLab(selectedLab!);
          await gradesProvider.loadGrades(selectedLab!.id);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final gradesProvider = context.watch<GradesProvider>();
    final labsProvider = context.watch<LabsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text('grading'.tr),
      ),
      floatingActionButton: gradesProvider.selectedLab == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openCreateGradeSheet(context),
              icon: const Icon(Icons.add),
              label: Text('add.grade'.tr),
            ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'my.labs'.tr,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<LabModel>(
            initialValue: selectedLab,
            items: labsProvider.labs
                .map(
                  (lab) => DropdownMenuItem(
                    value: lab,
                    child: Text(lab.name),
                  ),
                )
                .toList(),
            onChanged: (lab) {
              setState(() => selectedLab = lab);
              gradesProvider.selectedLab = lab;
              if (lab != null) {
                _loadStudentNamesForLab(lab);
                gradesProvider.loadGrades(lab.id);
              }
            },
            decoration: InputDecoration(
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          if (gradesProvider.loadingGrades)
            const Center(child: CircularProgressIndicator())
          else if (gradesProvider.error != null)
            Center(child: Text(gradesProvider.error!))
          else if (gradesProvider.grades.isEmpty)
            Text('no.grades.yet'.tr)
          else
            ...gradesProvider.grades.map(
              (grade) => _GradeTile(
                grade: grade,
                fallbackStudentName: _studentNamesById[grade.studentId],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _loadStudentNamesForLab(LabModel lab) async {
    final labsProvider = context.read<LabsProvider>();
    final students = await labsProvider.resolveLabStudents(lab.id);
    if (!mounted) return;
    setState(() {
      _studentNamesById = {
        for (final s in students)
          if (s.id.isNotEmpty) s.id: s.name,
      };
    });
  }

  Future<void> _openCreateGradeSheet(BuildContext context) async {
    final provider = context.read<GradesProvider>();
    final selected = provider.selectedLab;
    if (selected == null) return;

    final labsProvider = context.read<LabsProvider>();
    final students = await labsProvider.resolveLabStudents(selected.id);
    if (students.isEmpty) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('no.students.in.lab'.tr)),
      );
      return;
    }

    if (provider.categories.isEmpty && !provider.loadingCategories) {
      await provider.loadCategories();
    }
    if (!context.mounted) return;
    if (provider.loadingCategories) return;
    if (provider.categories.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.categoriesError ?? 'Failed to load categories'),
        ),
      );
      return;
    }

    final formKey = GlobalKey<FormState>();
    String? studentId = students.first.id;
    String? category = provider.categories.first;
    final scoreController = TextEditingController();
    final maxController = TextEditingController();
    final commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) {
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
                Text('add.grade'.tr,
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: studentId,
                  items: students
                      .map(
                        (student) => DropdownMenuItem(
                          value: student.id,
                          child: Text(student.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => studentId = value,
                  decoration: InputDecoration(
                    labelText: 'student'.tr,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  items: provider.categories
                      .map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => category = value,
                  decoration: InputDecoration(
                    labelText: 'category'.tr,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) =>
                      value == null || value.isEmpty ? 'required'.tr : null,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: scoreController,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: InputDecoration(
                          labelText: 'score'.tr,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value == null || value.isEmpty
                            ? 'required'.tr
                            : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: maxController,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: InputDecoration(
                          labelText: 'max.score'.tr,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: commentController,
                  decoration: InputDecoration(
                    labelText: 'comment'.tr,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  minLines: 2,
                  maxLines: 4,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: provider.creatingGrade
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) return;
                            final ok = await provider.createGrade(
                              studentId: studentId ?? students.first.id,
                              category: category ?? provider.categories.first,
                              score: double.parse(scoreController.text),
                              maxScore: maxController.text.isNotEmpty
                                  ? double.tryParse(maxController.text)
                                  : null,
                              comment: commentController.text.trim(),
                            );
                            if (!mounted) return;
                            if (ok) {
                              Navigator.of(context).pop();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      provider.error ?? 'unknown.error'.tr),
                                ),
                              );
                            }
                          },
                    child: provider.creatingGrade
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text('save'.tr),
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

class _GradeTile extends StatelessWidget {
  final GradeModel grade;
  final String? fallbackStudentName;
  const _GradeTile({required this.grade, this.fallbackStudentName});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final studentName = grade.student?.name ?? fallbackStudentName ?? '—';
    final scoreText = grade.maxScore != null
        ? '${grade.score.toStringAsFixed(1)} / ${grade.maxScore!.toStringAsFixed(1)}'
        : grade.score.toStringAsFixed(1);
    final percentText = grade.percentage != null
        ? '${grade.percentage!.toStringAsFixed(0)}%'
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: scheme.primary.withOpacity(0.15),
                child: Text(
                  studentName.isNotEmpty
                      ? studentName.substring(0, 1).toUpperCase()
                      : '?',
                  style: TextStyle(
                    color: scheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      studentName,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      grade.category,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    scoreText,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: scheme.primary,
                        ),
                  ),
                  if (percentText != null)
                    Text(
                      percentText,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                ],
              ),
            ],
          ),
          if (grade.comment != null && grade.comment!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                grade.comment!,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            DateFormat('MMM d, yyyy • HH:mm').format(grade.createdAt.toLocal()),
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: scheme.outline),
          ),
        ],
      ),
    );
  }
}

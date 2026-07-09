import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/grade_model.dart';
import '../models/lab_model.dart';
import '../services/grades_service.dart';
import '../services/labs_service.dart';

class GradesProvider with ChangeNotifier {
  static const List<String> defaultCategories = [
    'exam',
    'quiz',
    'presentation',
    'project',
  ];

  final GradesService _gradesService = GradesService();
  final LabsService _labsService = LabsService();

  bool loadingLabs = false;
  bool loadingGrades = false;
  bool loadingCategories = false;
  bool creatingGrade = false;
  String? error;
  String? categoriesError;

  List<LabModel> labs = [];
  List<GradeModel> grades = [];
  List<String> categories = [];
  LabModel? selectedLab;

  Future<void> loadLabs() async {
    loadingLabs = true;
    error = null;
    notifyListeners();
    try {
      final res = await _labsService.getMyLabs();
      dynamic data = res.data;
      if (data is String) data = jsonDecode(data);
      labs = (data as List)
          .map((e) => LabModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      labs = [];
      error = e.toString();
    } finally {
      loadingLabs = false;
      notifyListeners();
    }
  }

  Future<void> loadGrades(String labId) async {
    loadingGrades = true;
    error = null;
    notifyListeners();
    try {
      final res = await _gradesService.getGradesForLab(labId);
      dynamic data = res.data;
      if (data is String) data = jsonDecode(data);
      grades = (data as List)
          .map((e) => GradeModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      grades = [];
      error = e.toString();
    } finally {
      loadingGrades = false;
      notifyListeners();
    }
  }

  Future<void> loadCategories() async {
    loadingCategories = true;
    categoriesError = null;
    notifyListeners();
    categories = List<String>.from(defaultCategories);
    loadingCategories = false;
    notifyListeners();
  }

  Future<bool> createGrade({
    required String studentId,
    required String category,
    required double score,
    double? maxScore,
    String? comment,
  }) async {
    if (selectedLab == null) return false;
    creatingGrade = true;
    error = null;
    notifyListeners();
    try {
      await _gradesService.createGrade(
        studentId: studentId,
        labId: selectedLab!.id,
        category: category,
        score: score,
        maxScore: maxScore,
        comment: comment,
      );
      await loadGrades(selectedLab!.id);
      creatingGrade = false;
      return true;
    } catch (e) {
      error = e.toString();
      creatingGrade = false;
      notifyListeners();
      return false;
    }
  }
}




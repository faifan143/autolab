import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class GradesService {
  final ApiService _api = ApiService();

  Future<Response> getGradesForLab(String labId) {
    return _api.get(ApiConstants.labGrades(labId));
  }

  Future<List<String>> getGradeCategories() async {
    final endpoints = <String>[
      ApiConstants.gradeCategories,
      'grades/category-enum',
      'grades/meta',
    ];

    for (final endpoint in endpoints) {
      try {
        final res = await _api.get(endpoint);
        final categories = _extractCategoryList(res.data);
        if (categories.isNotEmpty) return categories;
      } catch (_) {
        // Try next known endpoint shape.
      }
    }

    return const [];
  }

  Future<Response> createGrade({
    required String studentId,
    required String labId,
    required String category,
    required double score,
    double? maxScore,
    String? comment,
  }) {
    return _api.post(
      ApiConstants.grades,
      data: {
        'studentId': studentId,
        'labId': labId,
        'category': category,
        'score': score,
        if (maxScore != null) 'maxScore': maxScore,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
  }

  List<String> _extractCategoryList(dynamic data) {
    if (data is List) {
      return data.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
    }

    if (data is Map<String, dynamic>) {
      final candidates = [
        data['categories'],
        data['categoryEnum'],
        data['enum'],
        data['data'],
      ];
      for (final value in candidates) {
        if (value is List) {
          final list = value
              .map((e) => e.toString())
              .where((e) => e.isNotEmpty)
              .toList();
          if (list.isNotEmpty) return list;
        }
      }
    }

    return const [];
  }
}




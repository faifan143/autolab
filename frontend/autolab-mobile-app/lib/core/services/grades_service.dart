import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class GradesService {
  final ApiService _api = ApiService();

  Future<Response> getGradesForLab(String labId) {
    return _api.get(ApiConstants.labGrades(labId));
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
}




import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class LabsService {
  final ApiService _api = ApiService();

  Future<Response> getMyLabs() async {
    return _api.get(ApiConstants.labs);
  }

  /// Replaces the full student roster for a lab (`PATCH labs/:id/students`).
  Future<Response> updateLabStudents({
    required String labId,
    required List<String> studentIds,
  }) async {
    return _api.patch(
      ApiConstants.labStudents(labId),
      data: {'studentIds': studentIds},
    );
  }

  Future<Response> requestArchive({
    required String labId,
    String? reason,
  }) async {
    return _api.post(
      ApiConstants.labArchiveRequest(labId),
      data: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }
}



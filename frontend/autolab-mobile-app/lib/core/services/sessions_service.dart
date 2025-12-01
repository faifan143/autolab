import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class SessionsService {
  final ApiService _api = ApiService();

  Future<Response> getSessionsForLab(String labId) {
    return _api.get(ApiConstants.labSessions(labId));
  }

  Future<Response> createSession({
    required String labId,
    required DateTime startTime,
    required DateTime endTime,
  }) {
    return _api.post(
      ApiConstants.sessions,
      data: {
        'labId': labId,
        'startTime': startTime.toUtc().toIso8601String(),
        'endTime': endTime.toUtc().toIso8601String(),
      },
    );
  }
}




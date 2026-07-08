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

  Future<Response> startStream(String sessionId) {
    return _api.post(ApiConstants.startStream(sessionId));
  }

  Future<void> stopStream(String sessionId) async {
    try {
      await _api.post(ApiConstants.stopStream(sessionId));
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data is Map
          ? (e.response?.data as Map)['message']?.toString()
          : null;
      if (status == 400 &&
          (message?.contains('No active stream') ?? false)) {
        return;
      }
      rethrow;
    }
  }

  Future<void> uploadStreamVideo(
    String sessionId,
    String filePath, {
    ProgressCallback? onSendProgress,
  }) async {
    await _api.uploadFile(
      ApiConstants.uploadStreamVideo(sessionId),
      filePath,
      fileKey: 'video',
      sendTimeout: const Duration(minutes: 15),
      onSendProgress: onSendProgress,
    );
  }
}


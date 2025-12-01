import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class AttendanceService {
  final ApiService _api = ApiService();

  Future<Response> generateQr(String sessionId, {int expiresIn = 15}) {
    return _api.post(
      ApiConstants.generateAttendanceQr(sessionId),
      data: {'expiresInMinutes': expiresIn},
    );
  }

  Future<Response> getSessionAttendance(String sessionId) {
    return _api.get(ApiConstants.sessionAttendance(sessionId));
  }
}




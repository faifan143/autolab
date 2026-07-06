import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class AttendanceService {
  final ApiService _api = ApiService();

  Future<Response> scanStudentQr(
    String sessionId,
    String studentToken,
  ) {
    return _api.post(
      ApiConstants.scanStudentAttendance(sessionId),
      data: {'studentToken': studentToken},
    );
  }

  Future<Response> getSessionAttendance(String sessionId) {
    return _api.get(ApiConstants.sessionAttendance(sessionId));
  }
}

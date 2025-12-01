import '../config/env.dart';

class ApiConstants {
  // Base URLs (resolved from environment via --dart-define)
  static const String baseUrl = Env.apiBaseUrl;
  static const String wsStreamingUrl = Env.wsStreamingUrl;
  static const String wsTeachersUrl = Env.wsTeachersUrl;
  
  // API Endpoints
  static const String login = 'auth/login';
  static const String register = 'auth/register';
  static const String refreshToken = 'auth/refresh';
  
  static const String labs = 'labs';
  static String labById(String id) => 'labs/$id';
  static String labSessions(String labId) => 'labs/$labId/sessions';
  static String labStudents(String labId) => 'labs/$labId/students';
  static String labArchiveRequest(String labId) => 'labs/$labId/archive-request';
  
  static const String sessions = 'sessions';
  static String sessionById(String id) => 'sessions/$id';
  static String startStream(String sessionId) => 'sessions/$sessionId/stream/start';
  static String stopStream(String sessionId) => 'sessions/$sessionId/stream/stop';
  static String uploadStreamVideo(String sessionId) => 'sessions/$sessionId/stream-video';
  
  static String generateAttendanceQr(String sessionId) => 'attendance/$sessionId/qr';
  static String sessionAttendance(String sessionId) => 'attendance/sessions/$sessionId';
  static String studentAttendance(String studentId) => 'attendance/students/$studentId';
  
  static const String grades = 'grades';
  static String labGrades(String labId) => 'grades/labs/$labId';
  static String studentGrades(String studentId) => 'grades/students/$studentId';
  
  static const String files = 'files';
  static String fileById(String id) => 'files/$id';
  static String fileDownloadUrl(String id) => 'files/$id/url';
  
  static const String chatMessages = 'chat/messages';
  
  static const String users = 'users';
  static String userById(String id) => 'users/$id';
}



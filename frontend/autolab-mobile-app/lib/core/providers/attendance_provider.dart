import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/session_model.dart';
import '../models/attendance_model.dart';
import '../services/sessions_service.dart';
import '../services/attendance_service.dart';

class AttendanceProvider with ChangeNotifier {
  final SessionsService _sessionsService = SessionsService();
  final AttendanceService _attendanceService = AttendanceService();

  bool loadingSessions = false;
  bool loadingAttendance = false;
  bool scanningStudent = false;
  String? error;

  List<SessionModel> sessions = [];
  SessionAttendanceResponse? attendance;
  String? currentLabId;
  String? currentSessionId;

  Future<void> loadSessions(String labId) async {
    currentLabId = labId;
    loadingSessions = true;
    error = null;
    notifyListeners();
    try {
      final res = await _sessionsService.getSessionsForLab(labId);
      dynamic data = res.data;
      if (data is String) data = jsonDecode(data);
      sessions = (data as List)
          .map((e) => SessionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      error = e.toString();
      sessions = [];
    } finally {
      loadingSessions = false;
      notifyListeners();
    }
  }

  Future<void> loadAttendance(String sessionId) async {
    currentSessionId = sessionId;
    loadingAttendance = true;
    error = null;
    notifyListeners();
    try {
      final res = await _attendanceService.getSessionAttendance(sessionId);
      dynamic data = res.data;
      if (data is String) data = jsonDecode(data);

      final records = (data as List)
          .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
          .toList();

      final present =
          records.where((record) => record.status == 'present').length;
      final late = records.where((record) => record.status == 'late').length;

      attendance = SessionAttendanceResponse(
        sessionId: sessionId,
        attendance: records,
        summary: AttendanceSummary(
          present: present,
          late: late,
          absent: 0,
          total: records.length,
        ),
      );
    } catch (e) {
      error = e.toString();
      attendance = null;
    } finally {
      loadingAttendance = false;
      notifyListeners();
    }
  }

  Future<bool> scanStudentQr(String studentToken) async {
    if (currentSessionId == null) return false;
    scanningStudent = true;
    error = null;
    notifyListeners();
    try {
      await _attendanceService.scanStudentQr(
        currentSessionId!,
        studentToken,
      );
      await loadAttendance(currentSessionId!);
      scanningStudent = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      scanningStudent = false;
      notifyListeners();
      return false;
    }
  }
}

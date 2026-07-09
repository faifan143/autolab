import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/session_model.dart';
import '../models/attendance_model.dart';
import '../models/user_model.dart';
import '../services/sessions_service.dart';
import '../services/attendance_service.dart';
import '../services/users_service.dart';

class AttendanceProvider with ChangeNotifier {
  final SessionsService _sessionsService = SessionsService();
  final AttendanceService _attendanceService = AttendanceService();
  final UsersService _usersService = UsersService();

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

  Future<void> loadAttendance(
    String sessionId, {
    int? totalStudents,
    List<UserModel>? knownStudents,
  }) async {
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

      final Map<String, UserModel> knownById = {
        for (final user in knownStudents ?? const <UserModel>[]) user.id: user,
      };
      final unresolvedIds = records
          .where((record) =>
              record.student == null && !knownById.containsKey(record.studentId))
          .map((record) => record.studentId)
          .toSet();
      if (unresolvedIds.isNotEmpty) {
        final fetched = await Future.wait(
          unresolvedIds.map((id) async {
            try {
              return await _usersService.getUserById(id);
            } catch (_) {
              return null;
            }
          }),
        );
        for (final user in fetched) {
          if (user != null) knownById[user.id] = user;
        }
      }

      final enrichedRecords = records
          .map((record) => AttendanceModel(
                id: record.id,
                studentId: record.studentId,
                student: record.student ?? knownById[record.studentId],
                sessionId: record.sessionId,
                session: record.session,
                status: record.status,
                timestamp: record.timestamp,
                scannedAt: record.scannedAt,
              ))
          .toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      final present =
          enrichedRecords.where((record) => record.status == 'present').length;
      final late =
          enrichedRecords.where((record) => record.status == 'late').length;
      final total = totalStudents ?? enrichedRecords.length;
      final absent = (total - present - late).clamp(0, total);

      attendance = SessionAttendanceResponse(
        sessionId: sessionId,
        attendance: enrichedRecords,
        summary: AttendanceSummary(
          present: present,
          late: late,
          absent: absent,
          total: total,
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

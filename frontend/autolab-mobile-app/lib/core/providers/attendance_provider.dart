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
  bool generatingQr = false;
  String? error;

  List<SessionModel> sessions = [];
  SessionAttendanceResponse? attendance;
  String? currentLabId;
  String? currentSessionId;
  String? startQrToken;
  String? endQrToken;
  DateTime? qrExpiresAt;

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
      attendance = SessionAttendanceResponse.fromJson(
          data as Map<String, dynamic>);
    } catch (e) {
      error = e.toString();
      attendance = null;
    } finally {
      loadingAttendance = false;
      notifyListeners();
    }
  }

  Future<bool> generateQr({int expiresIn = 5}) async {
    if (currentSessionId == null) return false;
    generatingQr = true;
    error = null;
    notifyListeners();
    try {
      final res = await _attendanceService.generateQr(
        currentSessionId!,
        expiresIn: expiresIn,
      );
      dynamic data = res.data;
      if (data is String) data = jsonDecode(data);
      debugPrint('QR payload: $data');
      if (data is Map<String, dynamic>) {
        startQrToken = (data['startToken'] ?? data['qrToken']) as String?;
        endQrToken = (data['endToken'] ?? data['qrEndToken']) as String?;
        final expires = data['expiresAt'] as String?;
        qrExpiresAt = expires != null ? DateTime.tryParse(expires) : null;
      } else {
        startQrToken = null;
        endQrToken = null;
        qrExpiresAt = null;
      }
      generatingQr = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      generatingQr = false;
      notifyListeners();
      return false;
    }
  }
}



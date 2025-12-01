import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/session_model.dart';
import '../services/sessions_service.dart';

class SessionsProvider with ChangeNotifier {
  final SessionsService _service = SessionsService();

  List<SessionModel> _sessions = [];
  bool _loading = false;
  String? _error;
  String? _labId;

  List<SessionModel> get sessions => _sessions;
  bool get isLoading => _loading;
  String? get error => _error;
  String? get labId => _labId;

  Future<void> loadSessions(String labId) async {
    _labId = labId;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await _service.getSessionsForLab(labId);
      dynamic data = res.data;
      if (data is String) {
        data = jsonDecode(data);
      }
      if (data is List) {
        _sessions =
            data.map((e) => SessionModel.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        _sessions = [];
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createSession({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    if (_labId == null) return false;
    try {
      await _service.createSession(
        labId: _labId!,
        startTime: startTime,
        endTime: endTime,
      );
      await loadSessions(_labId!);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}




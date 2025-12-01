import 'package:flutter/foundation.dart';

import '../services/sessions_service.dart';

class StreamingProvider with ChangeNotifier {
  final SessionsService _sessionsService = SessionsService();

  bool _isStreaming = false;
  bool _isLoading = false;
  String? _error;
  String? _sessionId;

  bool get isStreaming => _isStreaming;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get sessionId => _sessionId;

  Future<void> init(String sessionId, {bool initialStreaming = false}) async {
    _sessionId = sessionId;
    _isStreaming = initialStreaming;
    _error = null;
    notifyListeners();
  }

  Future<void> startStreaming() async {
    if (_sessionId == null || _isStreaming) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _sessionsService.startStream(_sessionId!);
      _isStreaming = true;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> stopStreaming() async {
    if (_sessionId == null || !_isStreaming) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _sessionsService.stopStream(_sessionId!);
      _isStreaming = false;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}



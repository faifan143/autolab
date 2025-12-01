import 'package:flutter/foundation.dart';

import '../models/file_model.dart';
import '../services/files_service.dart';

class FilesProvider with ChangeNotifier {
  final FilesService _service = FilesService();

  List<FileModel> _files = [];
  bool _isLoading = false;
  String? _error;

  String? _selectedLabId;
  String? _selectedSessionId;
  String? _ownerId;

  List<FileModel> get files => _files;
  bool get isLoading => _isLoading;
  String? get error => _error;

  String? get selectedLabId => _selectedLabId;
  String? get selectedSessionId => _selectedSessionId;
  String? get ownerId => _ownerId;

  Future<void> loadFiles({
    String? labId,
    String? sessionId,
    String? ownerId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    _selectedLabId = labId;
    _selectedSessionId = sessionId;
    _ownerId = ownerId;

    try {
      _files = await _service.getFiles(
        labId: labId,
        sessionId: sessionId,
        ownerId: ownerId,
      );
    } catch (e) {
      _files = [];
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> downloadFile(String fileId) async {
    try {
      final url = await _service.getFileDownloadUrl(fileId);
      return url;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }
}



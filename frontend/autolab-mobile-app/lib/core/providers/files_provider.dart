import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../models/file_model.dart';
import '../services/files_service.dart';

class FilesProvider with ChangeNotifier {
  final FilesService _service = FilesService();

  List<FileModel> _files = [];
  bool _isLoading = false;
  bool _isUploading = false;
  bool _isDownloading = false;
  String? _error;

  String? _selectedLabId;
  String? _selectedSessionId;
  String? _ownerId;

  List<FileModel> get files => _files;
  bool get isLoading => _isLoading;
  bool get isUploading => _isUploading;
  bool get isDownloading => _isDownloading;
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

  Future<FileModel?> uploadFile(
    String filePath, {
    String? labId,
    String? sessionId,
    String? description,
    ProgressCallback? onSendProgress,
  }) async {
    _isUploading = true;
    _error = null;
    notifyListeners();

    try {
      final uploaded = await _service.uploadFile(
        filePath,
        labId: labId ?? _selectedLabId,
        sessionId: sessionId ?? _selectedSessionId,
        description: description,
        onSendProgress: onSendProgress,
      );
      await loadFiles(
        labId: labId ?? _selectedLabId,
        sessionId: sessionId ?? _selectedSessionId,
        ownerId: _ownerId,
      );
      return uploaded;
    } catch (e) {
      _error = e.toString();
      return null;
    } finally {
      _isUploading = false;
      notifyListeners();
    }
  }

  Future<String?> getFileDownloadUrl(String fileId) async {
    try {
      return await _service.getFileDownloadUrl(fileId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<File?> downloadFile(
    FileModel file, {
    ProgressCallback? onReceiveProgress,
  }) async {
    _isDownloading = true;
    _error = null;
    notifyListeners();

    try {
      final downloaded = await _service.downloadToDevice(
        file.id,
        file.fileName,
        mimeType: file.mimeType,
        onReceiveProgress: onReceiveProgress,
      );
      return downloaded;
    } catch (e) {
      _error = e.toString();
      return null;
    } finally {
      _isDownloading = false;
      notifyListeners();
    }
  }
}

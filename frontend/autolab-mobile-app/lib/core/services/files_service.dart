import 'dart:convert';

import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../models/file_model.dart';
import 'api_service.dart';

class FilesService {
  final ApiService _api = ApiService();

  Future<List<FileModel>> getFiles({
    String? labId,
    String? sessionId,
    String? ownerId,
  }) async {
    final Map<String, dynamic> query = {};
    if (labId != null) query['labId'] = labId;
    if (sessionId != null) query['sessionId'] = sessionId;
    if (ownerId != null) query['ownerId'] = ownerId;

    final Response response = await _api.get(
      ApiConstants.files,
      queryParameters: query.isEmpty ? null : query,
    );

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    if (data is List) {
      return data
          .map((e) => FileModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    return [];
  }

  Future<FileModel> uploadFile(
    String filePath, {
    String? labId,
    String? sessionId,
    String? description,
    ProgressCallback? onSendProgress,
  }) async {
    final Map<String, dynamic> fields = {};
    if (labId != null) fields['labId'] = labId;
    if (sessionId != null) fields['sessionId'] = sessionId;
    if (description != null && description.isNotEmpty) {
      fields['description'] = description;
    }

    final Response response = await _api.uploadFile(
      ApiConstants.files,
      filePath,
      data: fields.isEmpty ? null : fields,
      onSendProgress: onSendProgress,
    );

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    return FileModel.fromJson(data as Map<String, dynamic>);
  }

  Future<FileModel> getFileById(String id) async {
    final Response response = await _api.get(ApiConstants.fileById(id));

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    return FileModel.fromJson(data as Map<String, dynamic>);
  }

  Future<String> getFileDownloadUrl(String id) async {
    final Response response = await _api.get(ApiConstants.fileDownloadUrl(id));

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    if (data is Map<String, dynamic> && data['url'] is String) {
      return data['url'] as String;
    }

    throw StateError('Invalid response format: missing url field');
  }
}

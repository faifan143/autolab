import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

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
          .map(
            (e) => FileModel.fromJson(
              _normalizeFileJson(e as Map<String, dynamic>),
            ),
          )
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

    return FileModel.fromJson(
      _normalizeFileJson(data as Map<String, dynamic>),
    );
  }

  Future<FileModel> getFileById(String id) async {
    final Response response = await _api.get(ApiConstants.fileById(id));

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    return FileModel.fromJson(
      _normalizeFileJson(data as Map<String, dynamic>),
    );
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

  static bool isImageFile(String mimeType) => mimeType.startsWith('image/');

  static bool isImageFileByName(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
        .contains(extension);
  }

  /// Downloads a file via its presigned URL and saves it to the temp directory.
  Future<File> downloadToDevice(
    String fileId,
    String fileName, {
    String? mimeType,
    ProgressCallback? onReceiveProgress,
  }) async {
    final directory = await getTemporaryDirectory();
    final downloadDir = Directory('${directory.path}/downloads');
    if (!await downloadDir.exists()) {
      await downloadDir.create(recursive: true);
    }

    final safeName = _normalizedFileName(fileName, mimeType);
    final filePath = '${downloadDir.path}/$fileId-$safeName';
    final file = File(filePath);

    final presignedUrl = await getFileDownloadUrl(fileId);

    final dio = Dio();
    final response = await dio.download(
      presignedUrl,
      filePath,
      onReceiveProgress: onReceiveProgress,
      options: Options(
        receiveTimeout: const Duration(minutes: 10),
        followRedirects: true,
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    if (response.statusCode == 200) {
      return _normalizeDownloadedExtension(file, mimeType);
    }

    throw StateError('Failed to download file: ${response.statusCode}');
  }

  String _normalizedFileName(String fileName, String? mimeType) {
    final sanitized = fileName.replaceAll(RegExp(r'[^\w.\-]'), '_');
    if (sanitized.contains('.')) {
      return sanitized;
    }

    final extension = _extensionFromMimeType(mimeType);
    if (extension == null) {
      return sanitized;
    }

    return '$sanitized.$extension';
  }

  Future<File> _normalizeDownloadedExtension(File file, String? mimeType) async {
    final detected = await _detectExtensionFromHeader(file);
    final targetExt = detected ?? _extensionFromMimeType(mimeType);
    if (targetExt == null || targetExt.isEmpty) {
      return file;
    }

    final currentName = file.path.split(RegExp(r'[\\/]')).last;
    final dot = currentName.lastIndexOf('.');
    final currentExt = dot >= 0 ? currentName.substring(dot + 1).toLowerCase() : '';
    if (currentExt == targetExt.toLowerCase()) {
      return file;
    }

    final basePath = dot >= 0 ? file.path.substring(0, file.path.lastIndexOf('.')) : file.path;
    final renamed = File('$basePath.$targetExt');
    return file.rename(renamed.path);
  }

  Future<String?> _detectExtensionFromHeader(File file) async {
    try {
      if (!await file.exists()) return null;
      final bytes = await file.openRead(0, 16).fold<List<int>>(
        <int>[],
        (buffer, chunk) => buffer..addAll(chunk),
      );

      if (bytes.length >= 4 &&
          bytes[0] == 0x1A &&
          bytes[1] == 0x45 &&
          bytes[2] == 0xDF &&
          bytes[3] == 0xA3) {
        return 'webm';
      }

      if (bytes.length >= 12 &&
          bytes[4] == 0x66 &&
          bytes[5] == 0x74 &&
          bytes[6] == 0x79 &&
          bytes[7] == 0x70) {
        final brand = String.fromCharCodes(bytes.sublist(8, 12)).toLowerCase();
        if (brand.startsWith('qt')) return 'mov';
        return 'mp4';
      }
    } catch (_) {}

    return null;
  }

  String? _extensionFromMimeType(String? mimeType) {
    switch (mimeType) {
      case 'video/mp4':
        return 'mp4';
      case 'video/webm':
        return 'webm';
      case 'video/quicktime':
        return 'mov';
      case 'application/pdf':
        return 'pdf';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return null;
    }
  }

  /// Normalizes API payloads so upload and list responses share one shape.
  Map<String, dynamic> _normalizeFileJson(Map<String, dynamic> json) {
    final id = json['id']?.toString();
    return {
      ...json,
      if (id != null) 'id': id,
      'fileName': json['fileName']?.toString() ?? 'file',
      'mimeType': json['mimeType']?.toString() ?? 'application/octet-stream',
      'size': (json['size'] as num?)?.toInt() ?? 0,
      'ownerId': json['ownerId']?.toString() ?? '',
      'labId': json['labId']?.toString(),
      'sessionId': json['sessionId']?.toString(),
      'storageKey': json['storageKey']?.toString() ?? id ?? '',
      'url': json['url']?.toString() ?? json['downloadUrl']?.toString(),
      if (json['version'] != null) 'version': (json['version'] as num).toInt(),
    };
  }
}

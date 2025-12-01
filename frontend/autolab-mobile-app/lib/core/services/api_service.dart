import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import '../config/server_config.dart';
import '../constants/api_constants.dart';
import '../models/auth_response_model.dart';
import '../routes/app_routes.dart';
import 'storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();
  static ApiService get instance => _instance;

  late Dio _dio;
  final Logger _logger = Logger();
  final StorageService _storage = StorageService();

  Dio get dio => _dio;

  Future<void> init() async {
    _dio = Dio(
      BaseOptions(
        baseUrl: ServerConfig.instance.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        sendTimeout: AppConfig.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _logger.i('API BASE URL = ${ServerConfig.instance.apiBaseUrl}');

    // Add interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token to requests
          final token = await _storage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          _logger.d('Request: ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.d(
            'Response: ${response.statusCode} ${response.requestOptions.path}',
          );
          return handler.next(response);
        },
        onError: (error, handler) async {
          _logger.e(
            'Error: ${error.response?.statusCode} ${error.requestOptions.path}',
          );

          final statusCode = error.response?.statusCode;
          final requestOptions = error.requestOptions;
          final isRefreshCall =
              requestOptions.path == ApiConstants.refreshToken;

          // Attempt a single token refresh on 401 for non-refresh calls.
          if (statusCode == 401 &&
              !isRefreshCall &&
              requestOptions.extra['retried'] != true) {
            final refreshed = await _tryRefreshToken();

            if (refreshed) {
              final token = await _storage.getAccessToken();
              if (token != null) {
                requestOptions.headers['Authorization'] = 'Bearer $token';
              }
              requestOptions.extra['retried'] = true;

              try {
                final cloneResponse = await _dio.fetch(requestOptions);
                return handler.resolve(cloneResponse);
              } catch (e) {
                _logger.e('Retry after refresh failed: $e');
              }
            }

            // Refresh failed or retry failed → treat as unauthorized.
            await _handleUnauthorized();
          }

          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _tryRefreshToken() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) {
      _logger.w('No refresh token available.');
      return false;
    }

    try {
      final response = await _dio.post(
        ApiConstants.refreshToken,
        data: {'refreshToken': refreshToken},
      );

      dynamic data = response.data;
      if (data is String) {
        data = jsonDecode(data);
      }

      final authResponse =
          AuthResponseModel.fromJson(data as Map<String, dynamic>);

      await _storage.saveAccessToken(authResponse.accessToken);
      await _storage.saveRefreshToken(authResponse.refreshToken);
      await _storage.saveUser(jsonEncode(authResponse.user.toJson()));

      _logger.i('Token refresh successful.');
      return true;
    } catch (e) {
      _logger.e('Token refresh failed: $e');
      return false;
    }
  }

  Future<void> _handleUnauthorized() async {
    // Clear tokens and user data, then redirect to login.
    await _storage.clearAll();

    final navigatorState = AppRoutes.appNavigatorKey.currentState;
    if (navigatorState != null) {
      navigatorState.pushNamedAndRemoveUntil(
        AppRoutes.login,
        (route) => false,
      );
    }
  }

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.post(path, data: data, queryParameters: queryParameters);
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.put(path, data: data, queryParameters: queryParameters);
  }

  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.patch(path, data: data, queryParameters: queryParameters);
  }

  Future<Response> delete(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.delete(path, queryParameters: queryParameters);
  }

  Future<Response> uploadFile(
    String path,
    String filePath, {
    String fileKey = 'file',
    Map<String, dynamic>? data,
    ProgressCallback? onSendProgress,
  }) async {
    final formData = FormData.fromMap({
      ...?data,
      fileKey: await MultipartFile.fromFile(filePath),
    });

    return _dio.post(
      path,
      data: formData,
      onSendProgress: onSendProgress,
    );
  }
}

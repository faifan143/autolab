import 'dart:convert';

import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class UsersService {
  final ApiService _api = ApiService();

  Future<UserModel> getUserById(String id) async {
    final Response response = await _api.get(ApiConstants.userById(id));

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    return UserModel.fromJson(data as Map<String, dynamic>);
  }

  /// Search students (teachers are restricted to role=student on the backend).
  Future<List<UserModel>> searchStudents({
    String? search,
    int limit = 50,
    int offset = 0,
  }) async {
    final Response response = await _api.get(
      ApiConstants.users,
      queryParameters: {
        'role': 'student',
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        'limit': limit,
        'offset': offset,
      },
    );

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    final List<dynamic> list;
    if (data is Map<String, dynamic>) {
      list = (data['users'] as List<dynamic>?) ?? const [];
    } else if (data is List) {
      list = data;
    } else {
      list = const [];
    }

    return list
        .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

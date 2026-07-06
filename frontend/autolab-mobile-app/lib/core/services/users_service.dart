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
}

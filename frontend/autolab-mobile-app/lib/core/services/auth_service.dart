import 'dart:convert';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final StorageService _storage = StorageService();

  Future<AuthResponseModel> login(String email, String password) async {
    final response = await _apiService.post(
      ApiConstants.login,
      data: {
        'email': email,
        'password': password,
      },
    );

    final authResponse = AuthResponseModel.fromJson(response.data);
    
    // Save tokens and user
    await _storage.saveAccessToken(authResponse.accessToken);
    await _storage.saveRefreshToken(authResponse.refreshToken);
    await _storage.saveUser(jsonEncode(authResponse.user.toJson()));

    return authResponse;
  }

  Future<AuthResponseModel> register({
    required String name,
    required String email,
    required String password,
    String? role,
  }) async {
    final response = await _apiService.post(
      ApiConstants.register,
      data: {
        'name': name,
        'email': email,
        'password': password,
        if (role != null) 'role': role,
      },
    );

    final authResponse = AuthResponseModel.fromJson(response.data);
    
    // Save tokens and user
    await _storage.saveAccessToken(authResponse.accessToken);
    await _storage.saveRefreshToken(authResponse.refreshToken);
    await _storage.saveUser(jsonEncode(authResponse.user.toJson()));

    return authResponse;
  }

  Future<void> logout() async {
    await _storage.clearAll();
  }

  Future<UserModel?> getCurrentUser() async {
    final userJson = await _storage.getUser();
    if (userJson != null) {
      return UserModel.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.getAccessToken();
    return token != null;
  }

  Future<String?> getAccessToken() async {
    return await _storage.getAccessToken();
  }
}



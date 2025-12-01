import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class LabsService {
  final ApiService _api = ApiService();

  Future<Response> getMyLabs() async {
    return _api.get(ApiConstants.labs);
  }
}



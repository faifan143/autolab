import 'env.dart';

class AppConfig {
  static const String appName = 'AutoLab Teacher';
  static const String appVersion = '1.0.0';
  
  // Environment
  static const bool isDevelopment = true; // Change based on build flavor
  
  // API Configuration
  static String get apiBaseUrl => Env.apiBaseUrl;
  static String get wsStreamingUrl => Env.wsStreamingUrl;
  static String get wsTeachersUrl => Env.wsTeachersUrl;
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}


class AppConstants {
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user';
  static const String fcmTokenKey = 'fcm_token';
  
  // Pagination
  static const int defaultLimit = 50;
  static const int maxLimit = 200;
  
  // QR Code
  static const int defaultQrExpiryMinutes = 15;
  
  // File Upload
  static const int maxFileSize = 25 * 1024 * 1024; // 25MB
  static const int maxVideoSize = 500 * 1024 * 1024; // 500MB
  
  // Chat
  static const int maxMessageLength = 4000;
  static const int minMessageLength = 1;
  
  // Date Formats
  static const String dateFormat = 'yyyy-MM-dd';
  static const String timeFormat = 'HH:mm';
  static const String dateTimeFormat = 'yyyy-MM-dd HH:mm';
  static const String isoDateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
}



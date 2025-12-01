class Env {
  // REST API base URL, e.g. https://api.example.com/api or http://10.0.2.2:3000/api
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/',
  );

  // WebSocket for streaming (mediasoup gateway), e.g. wss://api.example.com/ws/streaming
  static const String wsStreamingUrl = String.fromEnvironment(
    'WS_STREAMING_URL',
    defaultValue: 'ws://localhost:3000/ws/streaming/',
  );

  // WebSocket for teachers channel (attendance/chat updates), e.g. wss://api.example.com/ws/teachers
  static const String wsTeachersUrl = String.fromEnvironment(
    'WS_TEACHERS_URL',
    defaultValue: 'ws://localhost:3000/ws/teachers/',
  );
}



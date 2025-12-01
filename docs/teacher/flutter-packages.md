# Recommended Flutter Packages for Teacher App

This document lists recommended Flutter packages for implementing the AutoLab Teacher mobile application.

## Core Dependencies

### HTTP & API Client
```yaml
dependencies:
  dio: ^5.4.0  # Powerful HTTP client with interceptors
  retrofit: ^4.0.0  # Type-safe REST API client generator
  json_annotation: ^4.8.1  # JSON serialization
```

### WebSocket Client
```yaml
dependencies:
  socket_io_client: ^2.0.3+1  # Socket.io client for WebSocket
  # OR
  web_socket_channel: ^2.4.0  # Native WebSocket support
```

### State Management
```yaml
dependencies:
  provider: ^6.1.1  # Simple state management
  # OR
  bloc: ^8.1.3  # BLoC pattern with cubit
  flutter_bloc: ^8.1.3  # BLoC widgets
  # OR
  riverpod: ^2.4.9  # Advanced state management
```

### Authentication & Storage
```yaml
dependencies:
  flutter_secure_storage: ^9.0.0  # Secure token storage
  shared_preferences: ^2.2.2  # Local preferences storage
  jwt_decoder: ^2.0.1  # JWT token decoding
```

## UI & UX

### QR Code Generation
```yaml
dependencies:
  qr_flutter: ^4.1.0  # QR code generation
  qr_code_tools: ^1.0.1  # QR code scanning
  # OR for scanning
  mobile_scanner: ^3.5.1  # Camera-based QR scanning
```

### Video & Streaming
```yaml
dependencies:
  flutter_webrtc: ^0.9.48  # WebRTC support for live streaming
  video_player: ^2.8.2  # Video playback
  chewie: ^1.7.4  # Video player UI controls
```

### File Management
```yaml
dependencies:
  file_picker: ^6.1.1  # File picking (documents, images, videos)
  image_picker: ^1.0.7  # Camera and gallery image/video picking
  permission_handler: ^11.1.0  # Runtime permissions
  path_provider: ^2.1.1  # File system paths
```

### UI Components
```yaml
dependencies:
  flutter_svg: ^2.0.9  # SVG support
  cached_network_image: ^3.3.1  # Network image caching
  shimmer: ^3.0.0  # Loading shimmer effect
  pull_to_refresh: ^2.0.0  # Pull to refresh
  flutter_staggered_grid_view: ^0.7.0  # Staggered grid layouts
```

### Forms & Validation
```yaml
dependencies:
  flutter_form_builder: ^9.1.1  # Advanced form handling
  form_builder_validators: ^9.1.1  # Form validators
  email_validator: ^2.1.17  # Email validation
```

## Real-time Features

### WebSocket & Chat
```yaml
dependencies:
  socket_io_client: ^2.0.3+1  # Socket.io client
  # OR for native WebSocket
  web_socket_channel: ^2.4.0
```

### Push Notifications
```yaml
dependencies:
  firebase_messaging: ^14.7.9  # FCM push notifications
  firebase_core: ^2.24.2  # Firebase core
```

## Utilities

### Date & Time
```yaml
dependencies:
  intl: ^0.19.0  # Date/time formatting
  timeago: ^3.6.1  # Relative time (e.g., "2 hours ago")
```

### Networking
```yaml
dependencies:
  connectivity_plus: ^5.0.2  # Network connectivity checking
  dio: ^5.4.0  # HTTP client (already mentioned)
```

### Error Handling
```yaml
dependencies:
  logger: ^2.0.2+1  # Logging utility
  sentry_flutter: ^7.14.0  # Error tracking (optional)
```

### Localization
```yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0  # Already mentioned
```

## Code Generation
```yaml
dev_dependencies:
  build_runner: ^2.4.7  # Code generation
  json_serializable: ^6.7.1  # JSON serialization codegen
  retrofit_generator: ^8.0.6  # Retrofit code generation
```

## Complete Example `pubspec.yaml`

```yaml
name: autolab_teacher_app
description: AutoLab Teacher Mobile App
version: 1.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  dio: ^5.4.0
  retrofit: ^4.0.0
  json_annotation: ^4.8.1
  
  # WebSocket
  socket_io_client: ^2.0.3+1
  
  # State Management
  provider: ^6.1.1
  
  # Authentication & Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  jwt_decoder: ^2.0.1
  
  # QR Code
  qr_flutter: ^4.1.0
  mobile_scanner: ^3.5.1
  
  # Video & Streaming
  flutter_webrtc: ^0.9.48
  video_player: ^2.8.2
  chewie: ^1.7.4
  
  # File Management
  file_picker: ^6.1.1
  image_picker: ^1.0.7
  permission_handler: ^11.1.0
  path_provider: ^2.1.1
  
  # UI Components
  flutter_svg: ^2.0.9
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  pull_to_refresh: ^2.0.0
  
  # Forms
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.1
  
  # Push Notifications
  firebase_messaging: ^14.7.9
  firebase_core: ^2.24.2
  
  # Utilities
  intl: ^0.19.0
  timeago: ^3.6.1
  connectivity_plus: ^5.0.2
  logger: ^2.0.2+1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
  retrofit_generator: ^8.0.6

flutter:
  uses-material-design: true
```






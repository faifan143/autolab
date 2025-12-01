## Flutter Dependencies Overview

_Status as of 2025-12-01_

### Actively Used Dependencies

- **flutter** / **flutter_localizations**: Core framework and localization support.
- **cupertino_icons**: iOS-style icons.
- **dio**: HTTP client used in `ApiService` and all `*_service.dart` files.
- **json_annotation** / **json_serializable**: Code generation for all models.
- **provider**: State management for domain logic (`AuthProvider`, `LabsProvider`, etc.).
- **get**: Used for `GetMaterialApp`, theme and locale controllers, and translations.
- **get_storage**: Lightweight key-value storage for theme and locale.
- **flutter_secure_storage**: Secure storage for access/refresh tokens.
- **shared_preferences**: Local storage for serialized `UserModel`.
- **qr_flutter**: QR code rendering in `AttendanceScreen`.
- **logger**: Request/response/error logging in `ApiService`.
- **intl**: Date/time formatting via `DateFormat` in several screens.
 - **url_launcher**: Opening file download URLs and external links from the Files module.

### Declared but Currently Unused Dependencies

These packages are present in `pubspec.yaml` but are **not referenced in the Dart codebase** as of 2025-12-01.  
They are kept as **reserved for future features** (streaming, files, chat, notifications, etc.).

- **retrofit**, **retrofit_generator**  
  - Reserved for potential generated HTTP clients instead of manual `ApiService` usage.

- **socket_io_client**  
  - Reserved for realtime chat and presence (e.g., teachers lobby, lab channels).

- **mobile_scanner**  
  - Reserved for camera-based QR scanning (student or teacher-side attendance flows).

- **flutter_webrtc**  
  - Reserved for live video streaming of sessions.

- **video_player**, **chewie**  
  - Reserved for recorded session playback and media consumption.

- **file_picker**, **image_picker**, **permission_handler**, **path_provider**  
  - Reserved for file uploads/downloads, media attachments, and local file access.

- **flutter_svg**, **cached_network_image**, **shimmer**, **pull_to_refresh**  
  - Reserved for richer UI components, vector icons, image caching, skeleton loaders, and custom pull-to-refresh behavior.

- **flutter_form_builder**, **email_validator**  
  - Reserved for more complex and reusable form handling and validation.

- **firebase_core**  
  - Reserved for Firebase-based features (e.g., push notifications).

- **timeago**, **connectivity_plus**, **jwt_decoder**, **equatable**  
  - Reserved for human-readable timestamps, connectivity monitoring, JWT inspection, and value equality in future state classes.

> **Note**  
> None of the above "reserved" dependencies are wired into the current app logic yet.  
> They can be safely removed for footprint reasons if future plans change, but they are intentionally left in place for upcoming features.



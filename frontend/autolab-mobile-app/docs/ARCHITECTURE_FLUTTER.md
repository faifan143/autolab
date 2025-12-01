## AutoLab Teacher App – Flutter Architecture

_Status as of 2025-12-01_

### 1. State Management

- **GetX (global concerns)**
  - `ThemeController` and `LocaleController` manage theme mode and locale.
  - Persisted with `GetStorage`.
  - Bound into `GetMaterialApp` for theme and localization.

- **Provider + ChangeNotifier (domain logic)**
  - `AuthProvider`, `LabsProvider`, `SessionsProvider`, `AttendanceProvider`,
    `GradesProvider`, `FilesProvider`, `ChatProvider`, `StreamingProvider`.
  - Each wraps a dedicated service (`*_service.dart`) and exposes:
    - Async methods for networking.
    - Loading/error flags.
    - In-memory domain models and view state.

- **Local widget state**
  - `StatefulWidget`s handle ephemeral UI state:
    - Form fields, validation, password visibility.
    - Selected dropdowns and date/time pickers.

**Guideline for new features:**  
Use **Provider/ChangeNotifier** for new domain logic and keep **GetX** focused on theme/locale.

---

### 2. Navigation

- Uses **Navigator + named routes** via `AppRoutes`:
  - Route constants: `login`, `home`, `labs`, `sessions`, `sessionDetail`,
    `attendance`, `grades`, `files`, `chat`, `settings`, `sessionStreaming`, etc.
  - `AppRoutes.routes` is passed to `GetMaterialApp.routes`.
  - Arguments are passed as `Map<String, dynamic>` and read with `ModalRoute.of(context)…`.

- **Global navigator key**
  - `AppRoutes.appNavigatorKey` is attached to `GetMaterialApp.navigatorKey`.
  - Used for cross-layer navigation (e.g., redirect to login on 401).

- **GetX navigation**
  - Not used (`Get.to` / `Get.off` are avoided).
  - Navigation should remain consistent through `Navigator` and `AppRoutes`.

---

### 3. Networking & Auth

- **ApiService (Dio singleton)**
  - Configured with base URL and timeouts from `AppConfig` / `Env`.
  - Interceptor adds `Authorization: Bearer <token>` from `StorageService`.
  - On **401** (except `auth/refresh`):
    1. Attempts a **single token refresh** by calling `auth/refresh` with the refresh token.
    2. If successful:
       - Stores new access/refresh tokens and updated user.
       - Retries the original request once.
    3. If refresh or retry fails:
       - Calls `_handleUnauthorized()` which clears storage and navigates to `AppRoutes.login` via the global navigator key.

- **Services**
  - `AuthService`: login/register/logout + user retrieval.
  - `LabsService`, `SessionsService`, `AttendanceService`, `GradesService`,
    `FilesService`, `ChatService`:
    - Wrap specific REST endpoints (labs, sessions, attendance, grades, files, chat).
  - `ChatService`:
    - REST history: `GET ApiConstants.chatMessages`.
    - WebSocket: connects to `Env.wsTeachersUrl` using `socket_io_client` and emits/receives chat events.
  - `StreamingProvider` + `SessionsService`:
    - Use `ApiConstants.startStream` / `stopStream` for a simple start/stop streaming toggle per session.

- **StorageService**
  - Uses `flutter_secure_storage` for tokens.
  - Uses `SharedPreferences` for serialized `UserModel`.

---

### 4. Localization

- `AppTranslations` provides **English** (`en`) and **Arabic** (`ar`) keys.
- Accessed via `.tr` / `.trParams` from `get`.
- `LocaleController` stores the selected locale in `GetStorage` and calls `Get.updateLocale`.

**Rule:**  
All user-facing strings in screens should use translation keys from `AppTranslations`.

---

### 5. Feature Modules (Pattern)

Each feature follows the same pattern:

1. **Model** in `core/models` (e.g., `LabModel`, `SessionModel`, `FileModel`, `ChatMessageModel`).
2. **Service** in `core/services` (e.g., `LabsService`, `FilesService`, `ChatService`).
3. **Provider** in `core/providers` (e.g., `LabsProvider`, `FilesProvider`, `ChatProvider`).
4. **Screen(s)** under `features/<feature>/screens` using:
   - Provider for state.
   - `Navigator` + `AppRoutes` for navigation.
   - `.tr` for text and `Theme.of(context)` + `ColorScheme` for styling.

This structure should be followed for future modules (e.g., richer streaming UI, per-student views) to keep the codebase consistent and predictable.



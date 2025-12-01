import 'package:flutter/material.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/splash/screens/splash_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/labs/screens/labs_list_screen.dart';
import '../../features/labs/screens/lab_detail_screen.dart';
import '../../features/sessions/screens/sessions_list_screen.dart';
import '../../features/sessions/screens/session_detail_screen.dart';
import '../../features/sessions/screens/session_streaming_screen.dart';
import '../../features/attendance/screens/attendance_screen.dart';
import '../../features/grading/screens/grades_list_screen.dart';
import '../../features/files/screens/files_list_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/settings/screens/settings_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';
  static const String labs = '/labs';
  static const String labDetail = '/labs/:id';
  static const String sessions = '/sessions';
  static const String sessionDetail = '/sessions/:id';
  static const String attendance = '/attendance';
  static const String grades = '/grades';
  static const String files = '/files';
  static const String chat = '/chat';
  static const String settings = '/settings';
  static const String sessionStreaming = '/sessions/streaming';

  /// Global navigator key used for app-wide navigation (e.g. 401 handling).
  static final GlobalKey<NavigatorState> appNavigatorKey =
      GlobalKey<NavigatorState>();

  static Map<String, WidgetBuilder> routes = {
    splash: (context) => const SplashScreen(),
    login: (context) => const LoginScreen(),
    register: (context) => const RegisterScreen(),
    home: (context) => const HomeScreen(),
    labs: (context) => const LabsListScreen(),
    labDetail: (context) {
      final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      return LabDetailScreen(labId: args['labId']);
    },
    sessions: (context) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      return SessionsListScreen(labId: args?['labId']);
    },
    sessionDetail: (context) {
      final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      return SessionDetailScreen(sessionId: args['sessionId']);
    },
    sessionStreaming: (context) {
      final args =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      return SessionStreamingScreen(
        sessionId: args['sessionId'] as String,
        initialStreaming: (args['isStreaming'] as bool?) ?? false,
      );
    },
    attendance: (context) => const AttendanceScreen(),
    grades: (context) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      return GradesListScreen(labId: args?['labId']);
    },
    files: (context) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      return FilesListScreen(labId: args?['labId'], sessionId: args?['sessionId']);
    },
    chat: (context) {
      final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      return ChatScreen(
        channel: args['channel'],
        labId: args['labId'],
      );
    },
    settings: (context) => const SettingsScreen(),
  };
}



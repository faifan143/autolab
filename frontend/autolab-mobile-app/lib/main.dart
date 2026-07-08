import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:provider/provider.dart';
import 'core/config/app_config.dart';
import 'core/services/storage_service.dart';
import 'core/services/api_service.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/chat_provider.dart';
import 'core/providers/files_provider.dart';
import 'core/routes/app_routes.dart';
import 'core/theme/app_theme.dart';
import 'core/controllers/theme_controller.dart';
import 'core/controllers/locale_controller.dart';
import 'core/i18n/app_translations.dart';
import 'core/providers/labs_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GetStorage.init();
  
  // Initialize services
  await StorageService().init();
  await ApiService().init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeController = Get.put(ThemeController());
    final localeController = Get.put(LocaleController());

    return Obx(() {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => LabsProvider()),
          ChangeNotifierProvider(create: (_) => FilesProvider()),
          ChangeNotifierProvider(create: (_) => ChatProvider()),
        ],
        child: GetMaterialApp(
          navigatorKey: AppRoutes.appNavigatorKey,
          title: AppConfig.appName,
          debugShowCheckedModeBanner: false,
          builder: (context, child) {
            return SafeArea(
              top: false,
              child: child ?? const SizedBox.shrink(),
            );
          },
          theme: Get.locale?.languageCode == 'ar'
              ? AppTheme.lightTheme.copyWith(
                  textTheme:
                      AppTheme.lightTheme.textTheme.apply(fontFamily: 'Cairo'),
                )
              : AppTheme.lightTheme,
          darkTheme: Get.locale?.languageCode == 'ar'
              ? AppTheme.darkTheme.copyWith(
                  textTheme:
                      AppTheme.darkTheme.textTheme.apply(fontFamily: 'Cairo'),
                )
              : AppTheme.darkTheme,
          themeMode: themeController.themeMode.value,
          translations: AppTranslations(),
          locale: localeController.locale.value,
          fallbackLocale: const Locale('en'),
          initialRoute: AppRoutes.splash,
          routes: AppRoutes.routes,
        ),
      );
    });
  }
}

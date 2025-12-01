import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

class ThemeController extends GetxController {
  static const _key = 'themeMode';
  final _box = GetStorage();

  final Rx<ThemeMode> themeMode = ThemeMode.system.obs;

  @override
  void onInit() {
    final saved = _box.read<String>(_key);
    if (saved == 'light') themeMode.value = ThemeMode.light;
    if (saved == 'dark') themeMode.value = ThemeMode.dark;
    super.onInit();
  }

  void setTheme(ThemeMode mode) {
    themeMode.value = mode;
    _box.write(_key, _encode(mode));
    Get.changeThemeMode(mode);
  }

  String _encode(ThemeMode m) {
    switch (m) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
      default:
        return 'system';
    }
  }
}



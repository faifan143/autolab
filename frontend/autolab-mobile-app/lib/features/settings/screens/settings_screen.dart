import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/controllers/theme_controller.dart';
import '../../../core/controllers/locale_controller.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeCtrl = Get.find<ThemeController>();
    final localeCtrl = Get.find<LocaleController>();
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('settings'.tr),
      ),
      body: ListView(
        children: [
          _SectionHeader(title: 'theme'.tr),
          Obx(() {
            final mode = themeCtrl.themeMode.value;
            return Column(
              children: [
                RadioListTile<ThemeMode>(
                  value: ThemeMode.system,
                  groupValue: mode,
                  title: Text('system'.tr),
                  onChanged: (v) => themeCtrl.setTheme(v!),
                ),
                RadioListTile<ThemeMode>(
                  value: ThemeMode.light,
                  groupValue: mode,
                  title: Text('light'.tr),
                  onChanged: (v) => themeCtrl.setTheme(v!),
                ),
                RadioListTile<ThemeMode>(
                  value: ThemeMode.dark,
                  groupValue: mode,
                  title: Text('dark'.tr),
                  onChanged: (v) => themeCtrl.setTheme(v!),
                ),
              ],
            );
          }),
          const Divider(height: 32),
          _SectionHeader(title: 'language'.tr),
          Obx(() {
            final current = localeCtrl.locale.value.languageCode;
            return Column(
              children: [
                RadioListTile<String>(
                  value: 'en',
                  groupValue: current,
                  title: Text('english'.tr),
                  onChanged: (v) => localeCtrl.setLocale(const Locale('en')),
                ),
                RadioListTile<String>(
                  value: 'ar',
                  groupValue: current,
                  title: Text('arabic'.tr),
                  onChanged: (v) => localeCtrl.setLocale(const Locale('ar')),
                ),
              ],
            );
          }),
       
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}



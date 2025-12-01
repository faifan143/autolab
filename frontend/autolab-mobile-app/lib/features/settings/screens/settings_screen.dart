import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';
import '../../../core/controllers/theme_controller.dart';
import '../../../core/controllers/locale_controller.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/routes/app_routes.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeCtrl = Get.find<ThemeController>();
    final localeCtrl = Get.find<LocaleController>();
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: Text('settings'.tr),
      ),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          _SettingsProfileHeader(
            name: user?.name ?? 'Teacher',
            email: user?.email ?? '',
            onLogout: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Text('settings.logout.title'.tr),
                  content: Text('settings.logout.message'.tr),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: Text('settings.logout.cancel'.tr),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      child: Text('settings.logout.confirm'.tr),
                    ),
                  ],
                ),
              );

              if (confirmed == true) {
                await auth.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed(AppRoutes.login);
                }
              }
            },
          ),
          const Divider(height: 32),
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

class _SettingsProfileHeader extends StatelessWidget {
  final String name;
  final String email;
  final VoidCallback onLogout;

  const _SettingsProfileHeader({
    required this.name,
    required this.email,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final initials = name.isNotEmpty ? name.trim()[0].toUpperCase() : 'T';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [color.primary, color.secondary],
                ),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: color.onPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: color.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Logout',
              onPressed: onLogout,
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
      ),
    );
  }
}



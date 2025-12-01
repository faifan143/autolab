import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

class LocaleController extends GetxController {
  static const _key = 'locale';
  final _box = GetStorage();

  final Rx<Locale> locale = const Locale('en').obs;

  @override
  void onInit() {
    final saved = _box.read<String>(_key);
    if (saved != null) {
      final parts = saved.split('_');
      if (parts.isNotEmpty) {
        locale.value = Locale(parts[0], parts.length > 1 ? parts[1] : null);
      }
    }
    super.onInit();
  }

  void setLocale(Locale l) {
    locale.value = l;
    _box.write(_key, l.toString());
    Get.updateLocale(l);
  }
}



import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/lab_model.dart';
import '../services/labs_service.dart';

class LabsProvider with ChangeNotifier {
  final LabsService _service = LabsService();

  List<LabModel> _labs = [];
  bool _loading = false;
  String? _error;

  List<LabModel> get labs => _labs;
  bool get isLoading => _loading;
  String? get error => _error;

  Future<void> loadLabs() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await _service.getMyLabs();
      if (res.data is List) {
        _labs = (res.data as List)
            .map((e) => LabModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (res.data is String) {
        final parsed = jsonDecode(res.data);
        _labs = (parsed as List)
            .map((e) => LabModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        _labs = [];
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}



import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../models/lab_model.dart';
import '../models/user_model.dart';
import '../services/labs_service.dart';
import '../services/users_service.dart';

class LabsProvider with ChangeNotifier {
  final LabsService _service = LabsService();
  final UsersService _usersService = UsersService();

  List<LabModel> _labs = [];
  bool _loading = false;
  bool _mutatingStudents = false;
  bool _requestingArchive = false;
  String? _error;

  List<LabModel> get labs => _labs;
  bool get isLoading => _loading;
  bool get isMutatingStudents => _mutatingStudents;
  bool get isRequestingArchive => _requestingArchive;
  String? get error => _error;

  LabModel? getLabById(String labId) {
    for (final lab in _labs) {
      if (lab.id == labId) return lab;
    }
    return null;
  }

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
      _error = _friendlyError(e);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Resolves enrolled students for a lab (uses embedded users when present).
  Future<List<UserModel>> resolveLabStudents(String labId) async {
    final lab = getLabById(labId);
    if (lab == null) return [];

    final embedded = lab.students;
    if (embedded != null &&
        embedded.isNotEmpty &&
        embedded.length >= lab.studentIds.length) {
      return List<UserModel>.from(embedded);
    }

    if (lab.studentIds.isEmpty) return [];

    final results = await Future.wait(
      lab.studentIds.map((id) async {
        try {
          return await _usersService.getUserById(id);
        } catch (_) {
          return UserModel(
            id: id,
            name: id,
            email: '',
            role: 'student',
          );
        }
      }),
    );
    return results;
  }

  Future<List<UserModel>> searchStudents({String? query}) {
    return _usersService.searchStudents(search: query);
  }

  Future<bool> addStudentToLab(String labId, UserModel student) async {
    final lab = getLabById(labId);
    if (lab == null) {
      _error = 'Lab not found';
      notifyListeners();
      return false;
    }
    if (lab.studentIds.contains(student.id)) return true;

    final nextIds = [...lab.studentIds, student.id];
    return _assignStudents(
      labId,
      nextIds,
      optimisticStudents: [...?lab.students, student],
    );
  }

  Future<bool> removeStudentFromLab(String labId, String studentId) async {
    final lab = getLabById(labId);
    if (lab == null) {
      _error = 'Lab not found';
      notifyListeners();
      return false;
    }

    final nextIds =
        lab.studentIds.where((id) => id != studentId).toList(growable: false);
    final nextStudents =
        lab.students?.where((s) => s.id != studentId).toList(growable: false);

    return _assignStudents(
      labId,
      nextIds,
      optimisticStudents: nextStudents,
    );
  }

  Future<bool> _assignStudents(
    String labId,
    List<String> studentIds, {
    List<UserModel>? optimisticStudents,
  }) async {
    _mutatingStudents = true;
    _error = null;
    notifyListeners();
    try {
      await _service.updateLabStudents(labId: labId, studentIds: studentIds);

      final index = _labs.indexWhere((lab) => lab.id == labId);
      if (index != -1) {
        final current = _labs[index];
        _labs = List<LabModel>.from(_labs);
        _labs[index] = current.copyWith(
          studentIds: studentIds,
          students: optimisticStudents ??
              current.students
                  ?.where((s) => studentIds.contains(s.id))
                  .toList(),
        );
      } else {
        await loadLabs();
      }
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      return false;
    } finally {
      _mutatingStudents = false;
      notifyListeners();
    }
  }

  Future<bool> requestArchiveLab(String labId, {String? reason}) async {
    _requestingArchive = true;
    _error = null;
    notifyListeners();
    try {
      await _service.requestArchive(labId: labId, reason: reason);
      final index = _labs.indexWhere((lab) => lab.id == labId);
      if (index != -1) {
        final current = _labs[index];
        _labs = List<LabModel>.from(_labs);
        _labs[index] = current.copyWith(
          archiveRequested: true,
          archiveRequestedAt: DateTime.now(),
          archiveRequestReason: reason?.trim().isEmpty ?? true
              ? null
              : reason!.trim(),
        );
      }
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      return false;
    } finally {
      _requestingArchive = false;
      notifyListeners();
    }
  }

  String _friendlyError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        final message = data['message'];
        if (message is List) return message.join(', ');
        return message.toString();
      }
      if (e.message != null && e.message!.isNotEmpty) return e.message!;
    }
    return e.toString();
  }

  void reset() {
    _labs = [];
    _error = null;
    _loading = false;
    _mutatingStudents = false;
    _requestingArchive = false;
    notifyListeners();
  }
}

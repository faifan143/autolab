import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';
import 'session_model.dart';

part 'attendance_model.g.dart';

@JsonSerializable()
class AttendanceModel {
  final String id;
  final String studentId;
  final UserModel? student;
  final String sessionId;
  final SessionModel? session;
  final String status; // 'present', 'late', 'absent'
  final DateTime timestamp;
  final DateTime scannedAt;

  AttendanceModel({
    required this.id,
    required this.studentId,
    this.student,
    required this.sessionId,
    this.session,
    required this.status,
    required this.timestamp,
    required this.scannedAt,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) =>
      _$AttendanceModelFromJson(json);

  Map<String, dynamic> toJson() => _$AttendanceModelToJson(this);
}

@JsonSerializable()
class AttendanceSummary {
  final int present;
  final int late;
  final int absent;
  final int total;

  AttendanceSummary({
    required this.present,
    required this.late,
    required this.absent,
    required this.total,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) =>
      _$AttendanceSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$AttendanceSummaryToJson(this);
}

@JsonSerializable()
class SessionAttendanceResponse {
  final String sessionId;
  final SessionModel? session;
  final List<AttendanceModel> attendance;
  final AttendanceSummary summary;

  SessionAttendanceResponse({
    required this.sessionId,
    this.session,
    required this.attendance,
    required this.summary,
  });

  factory SessionAttendanceResponse.fromJson(Map<String, dynamic> json) =>
      _$SessionAttendanceResponseFromJson(json);

  Map<String, dynamic> toJson() => _$SessionAttendanceResponseToJson(this);
}



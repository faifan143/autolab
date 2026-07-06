// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'attendance_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AttendanceModel _$AttendanceModelFromJson(Map<String, dynamic> json) =>
    AttendanceModel(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      student: json['student'] == null
          ? null
          : UserModel.fromJson(json['student'] as Map<String, dynamic>),
      sessionId: json['sessionId'] as String,
      session: json['session'] == null
          ? null
          : SessionModel.fromJson(json['session'] as Map<String, dynamic>),
      status: json['status'] as String,
      timestamp: DateTime.parse(
        (json['timestamp'] ?? json['scannedAt']) as String,
      ),
      scannedAt: DateTime.parse(json['scannedAt'] as String),
    );

Map<String, dynamic> _$AttendanceModelToJson(AttendanceModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'studentId': instance.studentId,
      'student': instance.student,
      'sessionId': instance.sessionId,
      'session': instance.session,
      'status': instance.status,
      'timestamp': instance.timestamp.toIso8601String(),
      'scannedAt': instance.scannedAt.toIso8601String(),
    };

AttendanceSummary _$AttendanceSummaryFromJson(Map<String, dynamic> json) =>
    AttendanceSummary(
      present: (json['present'] as num).toInt(),
      late: (json['late'] as num).toInt(),
      absent: (json['absent'] as num).toInt(),
      total: (json['total'] as num).toInt(),
    );

Map<String, dynamic> _$AttendanceSummaryToJson(AttendanceSummary instance) =>
    <String, dynamic>{
      'present': instance.present,
      'late': instance.late,
      'absent': instance.absent,
      'total': instance.total,
    };

SessionAttendanceResponse _$SessionAttendanceResponseFromJson(
        Map<String, dynamic> json) =>
    SessionAttendanceResponse(
      sessionId: json['sessionId'] as String,
      session: json['session'] == null
          ? null
          : SessionModel.fromJson(json['session'] as Map<String, dynamic>),
      attendance: (json['attendance'] as List<dynamic>)
          .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      summary:
          AttendanceSummary.fromJson(json['summary'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$SessionAttendanceResponseToJson(
        SessionAttendanceResponse instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'session': instance.session,
      'attendance': instance.attendance,
      'summary': instance.summary,
    };

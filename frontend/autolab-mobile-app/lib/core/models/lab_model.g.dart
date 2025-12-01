// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lab_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LabModel _$LabModelFromJson(Map<String, dynamic> json) => LabModel(
      id: json['id'] as String,
      name: json['name'] as String,
      teacherId: json['teacherId'] as String,
      teacher: json['teacher'] == null
          ? null
          : UserModel.fromJson(json['teacher'] as Map<String, dynamic>),
      studentIds: (json['studentIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      students: (json['students'] as List<dynamic>?)
          ?.map((e) => UserModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      isArchived: json['isArchived'] as bool,
      archivedAt: json['archivedAt'] == null
          ? null
          : DateTime.parse(json['archivedAt'] as String),
      isSuspended: json['isSuspended'] as bool,
      suspendedAt: json['suspendedAt'] == null
          ? null
          : DateTime.parse(json['suspendedAt'] as String),
      suspendReason: json['suspendReason'] as String?,
      archiveRequested: json['archiveRequested'] as bool,
      archiveRequestedAt: json['archiveRequestedAt'] == null
          ? null
          : DateTime.parse(json['archiveRequestedAt'] as String),
      archiveRequestReason: json['archiveRequestReason'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$LabModelToJson(LabModel instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'teacherId': instance.teacherId,
      'teacher': instance.teacher,
      'studentIds': instance.studentIds,
      'students': instance.students,
      'isArchived': instance.isArchived,
      'archivedAt': instance.archivedAt?.toIso8601String(),
      'isSuspended': instance.isSuspended,
      'suspendedAt': instance.suspendedAt?.toIso8601String(),
      'suspendReason': instance.suspendReason,
      'archiveRequested': instance.archiveRequested,
      'archiveRequestedAt': instance.archiveRequestedAt?.toIso8601String(),
      'archiveRequestReason': instance.archiveRequestReason,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

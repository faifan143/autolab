import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'lab_model.g.dart';

@JsonSerializable()
class LabModel {
  final String id;
  final String name;
  final String teacherId;
  final UserModel? teacher;
  final List<String> studentIds;
  final List<UserModel>? students;
  final bool isArchived;
  final DateTime? archivedAt;
  final bool isSuspended;
  final DateTime? suspendedAt;
  final String? suspendReason;
  final bool archiveRequested;
  final DateTime? archiveRequestedAt;
  final String? archiveRequestReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  LabModel({
    required this.id,
    required this.name,
    required this.teacherId,
    this.teacher,
    required this.studentIds,
    this.students,
    required this.isArchived,
    this.archivedAt,
    required this.isSuspended,
    this.suspendedAt,
    this.suspendReason,
    required this.archiveRequested,
    this.archiveRequestedAt,
    this.archiveRequestReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LabModel.fromJson(Map<String, dynamic> json) =>
      _$LabModelFromJson(json);

  Map<String, dynamic> toJson() => _$LabModelToJson(this);

  LabModel copyWith({
    String? id,
    String? name,
    String? teacherId,
    UserModel? teacher,
    List<String>? studentIds,
    List<UserModel>? students,
    bool? isArchived,
    DateTime? archivedAt,
    bool? isSuspended,
    DateTime? suspendedAt,
    String? suspendReason,
    bool? archiveRequested,
    DateTime? archiveRequestedAt,
    String? archiveRequestReason,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LabModel(
      id: id ?? this.id,
      name: name ?? this.name,
      teacherId: teacherId ?? this.teacherId,
      teacher: teacher ?? this.teacher,
      studentIds: studentIds ?? this.studentIds,
      students: students ?? this.students,
      isArchived: isArchived ?? this.isArchived,
      archivedAt: archivedAt ?? this.archivedAt,
      isSuspended: isSuspended ?? this.isSuspended,
      suspendedAt: suspendedAt ?? this.suspendedAt,
      suspendReason: suspendReason ?? this.suspendReason,
      archiveRequested: archiveRequested ?? this.archiveRequested,
      archiveRequestedAt: archiveRequestedAt ?? this.archiveRequestedAt,
      archiveRequestReason: archiveRequestReason ?? this.archiveRequestReason,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}



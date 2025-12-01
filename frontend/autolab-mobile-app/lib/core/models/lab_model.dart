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
}



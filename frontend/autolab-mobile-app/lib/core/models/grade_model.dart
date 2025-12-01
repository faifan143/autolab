import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';
import 'lab_model.dart';

part 'grade_model.g.dart';

@JsonSerializable()
class GradeModel {
  final String id;
  final String studentId;
  final UserModel? student;
  final String labId;
  final LabModel? lab;
  final String category;
  final double score;
  final double? maxScore;
  final double? percentage;
  final String? comment;
  final DateTime createdAt;
  final DateTime updatedAt;

  GradeModel({
    required this.id,
    required this.studentId,
    this.student,
    required this.labId,
    this.lab,
    required this.category,
    required this.score,
    this.maxScore,
    this.percentage,
    this.comment,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GradeModel.fromJson(Map<String, dynamic> json) =>
      _$GradeModelFromJson(json);

  Map<String, dynamic> toJson() => _$GradeModelToJson(this);
}



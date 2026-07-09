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

  factory GradeModel.fromJson(Map<String, dynamic> json) {
    String readId(dynamic value) {
      if (value is String && value.isNotEmpty) return value;
      if (value is Map<String, dynamic>) {
        final nested = value['_id'] ?? value['id'];
        if (nested is String && nested.isNotEmpty) return nested;
      }
      return '';
    }

    final id = readId(json['_id'] ?? json['id']);
    final studentId = readId(json['studentId']);
    final labId = readId(json['labId']);
    final createdAtRaw = (json['createdAt'] ?? '').toString();
    final updatedAtRaw = (json['updatedAt'] ?? '').toString();

    return GradeModel(
      id: id,
      studentId: studentId,
      student: json['student'] is Map<String, dynamic>
          ? UserModel.fromJson(json['student'] as Map<String, dynamic>)
          : null,
      labId: labId,
      lab: json['lab'] is Map<String, dynamic>
          ? LabModel.fromJson(json['lab'] as Map<String, dynamic>)
          : null,
      category: (json['category'] ?? '').toString(),
      score: (json['score'] as num).toDouble(),
      maxScore: (json['maxScore'] as num?)?.toDouble(),
      percentage: (json['percentage'] as num?)?.toDouble(),
      comment: json['comment'] as String?,
      createdAt: createdAtRaw.isNotEmpty ? DateTime.parse(createdAtRaw) : DateTime.now(),
      updatedAt: updatedAtRaw.isNotEmpty ? DateTime.parse(updatedAtRaw) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => _$GradeModelToJson(this);
}



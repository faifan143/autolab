// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'grade_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

GradeModel _$GradeModelFromJson(Map<String, dynamic> json) => GradeModel(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      student: json['student'] == null
          ? null
          : UserModel.fromJson(json['student'] as Map<String, dynamic>),
      labId: json['labId'] as String,
      lab: json['lab'] == null
          ? null
          : LabModel.fromJson(json['lab'] as Map<String, dynamic>),
      category: json['category'] as String,
      score: (json['score'] as num).toDouble(),
      maxScore: (json['maxScore'] as num?)?.toDouble(),
      percentage: (json['percentage'] as num?)?.toDouble(),
      comment: json['comment'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$GradeModelToJson(GradeModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'studentId': instance.studentId,
      'student': instance.student,
      'labId': instance.labId,
      'lab': instance.lab,
      'category': instance.category,
      'score': instance.score,
      'maxScore': instance.maxScore,
      'percentage': instance.percentage,
      'comment': instance.comment,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

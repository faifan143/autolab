// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SessionModel _$SessionModelFromJson(Map<String, dynamic> json) => SessionModel(
      id: json['id'] as String,
      labId: json['labId'] as String,
      lab: json['lab'] == null
          ? null
          : LabModel.fromJson(json['lab'] as Map<String, dynamic>),
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      isStreaming: json['isStreaming'] as bool,
      streamUrl: json['streamUrl'] as String?,
      streamKey: json['streamKey'] as String?,
      streamStartedAt: json['streamStartedAt'] == null
          ? null
          : DateTime.parse(json['streamStartedAt'] as String),
      streamEndedAt: json['streamEndedAt'] == null
          ? null
          : DateTime.parse(json['streamEndedAt'] as String),
      recordedVideoUrl: json['recordedVideoUrl'] as String?,
      qrToken: json['qrToken'] as String?,
      qrTokenExpiresAt: json['qrTokenExpiresAt'] == null
          ? null
          : DateTime.parse(json['qrTokenExpiresAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$SessionModelToJson(SessionModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'labId': instance.labId,
      'lab': instance.lab,
      'startTime': instance.startTime.toIso8601String(),
      'endTime': instance.endTime.toIso8601String(),
      'isStreaming': instance.isStreaming,
      'streamUrl': instance.streamUrl,
      'streamKey': instance.streamKey,
      'streamStartedAt': instance.streamStartedAt?.toIso8601String(),
      'streamEndedAt': instance.streamEndedAt?.toIso8601String(),
      'recordedVideoUrl': instance.recordedVideoUrl,
      'qrToken': instance.qrToken,
      'qrTokenExpiresAt': instance.qrTokenExpiresAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

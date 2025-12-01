import 'package:json_annotation/json_annotation.dart';
import 'lab_model.dart';

part 'session_model.g.dart';

@JsonSerializable()
class SessionModel {
  final String id;
  final String labId;
  final LabModel? lab;
  final DateTime startTime;
  final DateTime endTime;
  final bool isStreaming;
  final String? streamUrl;
  final String? streamKey;
  final DateTime? streamStartedAt;
  final DateTime? streamEndedAt;
  final String? recordedVideoUrl;
  final String? qrToken;
  final DateTime? qrTokenExpiresAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  SessionModel({
    required this.id,
    required this.labId,
    this.lab,
    required this.startTime,
    required this.endTime,
    required this.isStreaming,
    this.streamUrl,
    this.streamKey,
    this.streamStartedAt,
    this.streamEndedAt,
    this.recordedVideoUrl,
    this.qrToken,
    this.qrTokenExpiresAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SessionModel.fromJson(Map<String, dynamic> json) =>
      _$SessionModelFromJson(json);

  Map<String, dynamic> toJson() => _$SessionModelToJson(this);
}



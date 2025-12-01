import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'file_model.g.dart';

@JsonSerializable()
class FileModel {
  final String id;
  final String fileName;
  final String mimeType;
  final int size;
  final String url;
  final String? labId;
  final String? sessionId;
  final String ownerId;
  final UserModel? owner;
  final String? description;
  final DateTime createdAt;

  FileModel({
    required this.id,
    required this.fileName,
    required this.mimeType,
    required this.size,
    required this.url,
    this.labId,
    this.sessionId,
    required this.ownerId,
    this.owner,
    this.description,
    required this.createdAt,
  });

  factory FileModel.fromJson(Map<String, dynamic> json) =>
      _$FileModelFromJson(json);

  Map<String, dynamic> toJson() => _$FileModelToJson(this);
}



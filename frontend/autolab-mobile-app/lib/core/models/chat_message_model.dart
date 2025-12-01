import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'chat_message_model.g.dart';

@JsonSerializable()
class ChatMessageModel {
  final String id;
  final String channel;
  final String? labId;
  final String senderId;
  final UserModel? sender;
  final List<String> recipientIds;
  final List<UserModel>? recipients;
  final String content;
  final DateTime createdAt;

  ChatMessageModel({
    required this.id,
    required this.channel,
    this.labId,
    required this.senderId,
    this.sender,
    required this.recipientIds,
    this.recipients,
    required this.content,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageModelFromJson(json);

  Map<String, dynamic> toJson() => _$ChatMessageModelToJson(this);
}



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

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    String readId(dynamic value) {
      if (value is String && value.isNotEmpty) return value;
      if (value is Map<String, dynamic>) {
        final nested = value['_id'] ?? value['id'];
        if (nested is String && nested.isNotEmpty) return nested;
      }
      return '';
    }

    final createdAtRaw = (json['createdAt'] ?? '').toString();
    final recipientIdsRaw = json['recipientIds'];

    return ChatMessageModel(
      id: readId(json['_id'] ?? json['id']),
      channel: (json['channel'] ?? '').toString(),
      labId: readId(json['labId']).isEmpty ? null : readId(json['labId']),
      senderId: readId(json['senderId']),
      sender: json['sender'] is Map<String, dynamic>
          ? UserModel.fromJson(json['sender'] as Map<String, dynamic>)
          : null,
      recipientIds: recipientIdsRaw is List
          ? recipientIdsRaw.map((e) => readId(e)).where((e) => e.isNotEmpty).toList()
          : const [],
      recipients: json['recipients'] is List
          ? (json['recipients'] as List)
              .whereType<Map<String, dynamic>>()
              .map(UserModel.fromJson)
              .toList()
          : null,
      content: (json['content'] ?? '').toString(),
      createdAt:
          createdAtRaw.isNotEmpty ? DateTime.parse(createdAtRaw) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => _$ChatMessageModelToJson(this);
}



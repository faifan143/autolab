// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_message_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatMessageModel _$ChatMessageModelFromJson(Map<String, dynamic> json) =>
    ChatMessageModel(
      id: json['id'] as String,
      channel: json['channel'] as String,
      labId: json['labId'] as String?,
      senderId: json['senderId'] as String,
      sender: json['sender'] == null
          ? null
          : UserModel.fromJson(json['sender'] as Map<String, dynamic>),
      recipientIds: (json['recipientIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      recipients: (json['recipients'] as List<dynamic>?)
          ?.map((e) => UserModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      content: json['content'] as String,
      fileIds: (json['fileIds'] as List<dynamic>).map((e) => e as String).toList(),
      files: (json['files'] as List<dynamic>)
          .map((e) => FileModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$ChatMessageModelToJson(ChatMessageModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'channel': instance.channel,
      'labId': instance.labId,
      'senderId': instance.senderId,
      'sender': instance.sender,
      'recipientIds': instance.recipientIds,
      'recipients': instance.recipients,
      'content': instance.content,
      'fileIds': instance.fileIds,
      'files': instance.files,
      'createdAt': instance.createdAt.toIso8601String(),
    };

import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/server_config.dart';
import '../constants/api_constants.dart';
import '../models/chat_message_model.dart';
import 'api_service.dart';
import 'storage_service.dart';

class ChatService {
  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();

  io.Socket? _socket;
  final StreamController<ChatMessageModel> _messageController =
      StreamController<ChatMessageModel>.broadcast();

  Stream<ChatMessageModel> get messageStream => _messageController.stream;

  Future<List<ChatMessageModel>> getMessages({
    required String channel,
    String? labId,
    int limit = 50,
  }) async {
    final query = <String, dynamic>{
      'channel': channel,
      'limit': limit,
    };
    if (labId != null) query['labId'] = labId;

    final Response response = await _api.get(
      ApiConstants.chatMessages,
      queryParameters: query,
    );

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    if (data is List) {
      return data
          .map((e) => ChatMessageModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    return [];
  }

  Future<ChatMessageModel> sendMessage(
    String text, {
    required String channel,
    String? labId,
    List<String> fileIds = const [],
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty && fileIds.isEmpty) {
      throw ArgumentError('Message must include text or attachment');
    }

    final Response response = await _api.post(
      ApiConstants.chatMessages,
      data: {
        'channel': channel,
        if (trimmed.isNotEmpty) 'content': trimmed,
        if (labId != null) 'labId': labId,
        if (fileIds.isNotEmpty) 'fileIds': fileIds,
      },
    );

    dynamic data = response.data;
    if (data is String) {
      data = jsonDecode(data);
    }

    return ChatMessageModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    disconnect();

    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('No access token available');
    }

    final cleanToken = token.replaceFirst(RegExp(r'^Bearer\s+'), '');
    final baseUrl =
        ServerConfig.instance.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    final uri = '$baseUrl/ws/teachers';

    _socket = io.io(
      uri,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setAuth({'token': cleanToken})
          .setExtraHeaders({'Authorization': 'Bearer $cleanToken'})
          .setTimeout(10000)
          .build(),
    );

    _socket?.onConnect((_) {});
    _socket?.onDisconnect((_) {});

    _socket?.on('chat:message-created', (data) {
      try {
        final Map<String, dynamic> json;
        if (data is Map<String, dynamic>) {
          json = data;
        } else if (data is String) {
          json = jsonDecode(data) as Map<String, dynamic>;
        } else {
          return;
        }
        _messageController.add(ChatMessageModel.fromJson(json));
      } catch (_) {
        // Ignore malformed messages.
      }
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}

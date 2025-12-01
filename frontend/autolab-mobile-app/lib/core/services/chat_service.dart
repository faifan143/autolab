import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/env.dart';
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

  Future<List<ChatMessageModel>> getMessages({String? labId}) async {
    final Map<String, dynamic> query = {};
    if (labId != null) query['labId'] = labId;

    final Response response = await _api.get(
      ApiConstants.chatMessages,
      queryParameters: query.isEmpty ? null : query,
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

  Future<void> connect() async {
    if (_socket != null) return;

    final token = await _storage.getAccessToken();
    final uri = Env.wsTeachersUrl;

    _socket = io.io(
      uri,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setExtraHeaders(
            token != null ? {'Authorization': 'Bearer $token'} : {},
          )
          .build(),
    );

    _socket?.onConnect((_) {});
    _socket?.onDisconnect((_) {});

    // NOTE: Event names and payload shapes must match the backend.
    // These are scaffolding defaults and may need adjustment.
    _socket?.on('chat:message', (data) {
      try {
        if (data is Map<String, dynamic>) {
          _messageController.add(ChatMessageModel.fromJson(data));
        } else if (data is String) {
          final decoded = jsonDecode(data) as Map<String, dynamic>;
          _messageController.add(ChatMessageModel.fromJson(decoded));
        }
      } catch (_) {
        // Ignore malformed messages.
      }
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void joinChannel(String channel, {String? labId}) {
    if (_socket == null) return;
    final payload = {
      'channel': channel,
      if (labId != null) 'labId': labId,
    };
    _socket?.emit('chat:join', payload);
  }

  Future<void> sendMessage(
    String text, {
    required String channel,
    String? labId,
  }) async {
    if (text.trim().isEmpty) return;
    final payload = {
      'channel': channel,
      'content': text.trim(),
      if (labId != null) 'labId': labId,
    };
    _socket?.emit('chat:send', payload);
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}



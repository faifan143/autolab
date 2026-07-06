import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/chat_message_model.dart';
import '../models/user_model.dart';
import '../services/chat_service.dart';
import '../services/users_service.dart';

class ChatProvider with ChangeNotifier {
  final ChatService _service = ChatService();
  final UsersService _usersService = UsersService();

  final List<ChatMessageModel> _messages = [];
  final Set<String> _messageIds = {};
  final Map<String, UserModel> _senderCache = {};
  bool _isLoading = false;
  bool _isSending = false;
  String? _error;
  String? _currentChannel;
  String? _currentLabId;
  StreamSubscription<ChatMessageModel>? _messageSub;

  List<ChatMessageModel> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  bool get isSending => _isSending;
  String? get error => _error;
  String? get currentChannel => _currentChannel;
  String? get currentLabId => _currentLabId;

  Future<void> init({
    required String channel,
    String? labId,
  }) async {
    await leave();

    _currentChannel = channel;
    _currentLabId = labId;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final history = await _service.getMessages(
        channel: channel,
        labId: labId,
      );
      history.sort((a, b) => a.createdAt.compareTo(b.createdAt));

      final enriched = await _enrichMessages(history);

      _messages
        ..clear()
        ..addAll(enriched);
      _messageIds
        ..clear()
        ..addAll(enriched.map((m) => m.id));

      _messageSub = _service.messageStream.listen(_onIncomingMessage);

      await _service.connect();

      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _onIncomingMessage(ChatMessageModel message) async {
    if (message.channel != _currentChannel) return;
    if (_messageIds.contains(message.id)) return;

    final enriched = await _enrichMessage(message);
    _messageIds.add(enriched.id);
    _messages.add(enriched);
    notifyListeners();
  }

  Future<void> sendMessage(String text) async {
    if (_currentChannel == null || text.trim().isEmpty) return;

    _isSending = true;
    _error = null;
    notifyListeners();

    try {
      final sent = await _service.sendMessage(
        text,
        channel: _currentChannel!,
        labId: _currentLabId,
      );
      if (!_messageIds.contains(sent.id)) {
        final enriched = await _enrichMessage(sent);
        _messageIds.add(enriched.id);
        _messages.add(enriched);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  Future<List<ChatMessageModel>> _enrichMessages(
    List<ChatMessageModel> messages,
  ) async {
    final senderIds = messages
        .where((message) => message.sender == null)
        .map((message) => message.senderId)
        .toSet();

    await _loadSenders(senderIds);

    return messages.map(_withSender).toList();
  }

  Future<ChatMessageModel> _enrichMessage(ChatMessageModel message) async {
    if (message.sender != null) return message;
    await _loadSenders({message.senderId});
    return _withSender(message);
  }

  Future<void> _loadSenders(Set<String> senderIds) async {
    for (final senderId in senderIds) {
      if (_senderCache.containsKey(senderId)) continue;
      try {
        _senderCache[senderId] = await _usersService.getUserById(senderId);
      } catch (_) {
        // Keep going if a sender lookup fails.
      }
    }
  }

  ChatMessageModel _withSender(ChatMessageModel message) {
    if (message.sender != null) return message;

    final sender = _senderCache[message.senderId];
    if (sender == null) return message;

    return ChatMessageModel(
      id: message.id,
      channel: message.channel,
      labId: message.labId,
      senderId: message.senderId,
      sender: sender,
      recipientIds: message.recipientIds,
      recipients: message.recipients,
      content: message.content,
      createdAt: message.createdAt,
    );
  }

  Future<void> leave() async {
    await _messageSub?.cancel();
    _messageSub = null;
    _messages.clear();
    _messageIds.clear();
    _senderCache.clear();
    _currentChannel = null;
    _currentLabId = null;
    _error = null;
    _service.disconnect();
  }

  void reset() {
    leave();
    notifyListeners();
  }

  @override
  void dispose() {
    _messageSub?.cancel();
    _service.dispose();
    super.dispose();
  }
}

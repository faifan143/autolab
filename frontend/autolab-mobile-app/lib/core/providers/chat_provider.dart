import 'package:flutter/foundation.dart';

import '../models/chat_message_model.dart';
import '../services/chat_service.dart';

class ChatProvider with ChangeNotifier {
  final ChatService _service = ChatService();

  final List<ChatMessageModel> _messages = [];
  bool _isLoading = false;
  String? _error;
  String? _currentChannel;
  String? _currentLabId;

  List<ChatMessageModel> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get currentChannel => _currentChannel;
  String? get currentLabId => _currentLabId;

  Future<void> init({
    required String channel,
    String? labId,
  }) async {
    _currentChannel = channel;
    _currentLabId = labId;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final history = await _service.getMessages(labId: labId);
      _messages
        ..clear()
        ..addAll(history);

      await _service.connect();
      _service.joinChannel(channel, labId: labId);

      _service.messageStream.listen((message) {
        _messages.add(message);
        notifyListeners();
      });

      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendMessage(String text) async {
    if (_currentChannel == null) return;
    try {
      await _service.sendMessage(
        text,
        channel: _currentChannel!,
        labId: _currentLabId,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }
}



import 'package:flutter/material.dart';

class ChatScreen extends StatelessWidget {
  final String channel;
  final String? labId;

  const ChatScreen({super.key, required this.channel, this.labId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat: $channel'),
      ),
      body: Center(
        child: Text('Chat for channel: $channel'),
      ),
    );
  }
}



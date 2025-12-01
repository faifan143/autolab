import 'package:flutter/material.dart';

class FilesListScreen extends StatelessWidget {
  final String? labId;
  final String? sessionId;

  const FilesListScreen({super.key, this.labId, this.sessionId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Files'),
      ),
      body: Center(
        child: Text('Files list${labId != null ? ' for lab: $labId' : ''}${sessionId != null ? ' session: $sessionId' : ''}'),
      ),
    );
  }
}



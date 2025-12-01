import 'package:flutter/material.dart';

class AttendanceQrScreen extends StatelessWidget {
  final String sessionId;

  const AttendanceQrScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance QR Code'),
      ),
      body: Center(
        child: Text('QR Code for session: $sessionId'),
      ),
    );
  }
}



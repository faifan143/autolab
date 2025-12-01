import 'package:flutter/material.dart';
import 'package:get/get.dart';

class AttendanceQrScreen extends StatelessWidget {
  final String sessionId;

  const AttendanceQrScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('attendance'.tr),
      ),
      body: Center(
        child: Text(
          'QR Code for session: $sessionId',
        ),
      ),
    );
  }
}



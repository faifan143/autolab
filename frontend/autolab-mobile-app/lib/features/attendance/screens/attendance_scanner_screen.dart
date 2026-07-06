import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../../core/providers/attendance_provider.dart';

class AttendanceScannerScreen extends StatefulWidget {
  final String sessionId;

  const AttendanceScannerScreen({super.key, required this.sessionId});

  @override
  State<AttendanceScannerScreen> createState() =>
      _AttendanceScannerScreenState();
}

class _AttendanceScannerScreenState extends State<AttendanceScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleQrDetected(String studentToken) async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    final attendance = context.read<AttendanceProvider>();
    final success = await attendance.scanStudentQr(studentToken);

    if (!mounted) return;

    setState(() => _isProcessing = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('attendance.scanned'.tr)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(attendance.error ?? 'unknown.error'.tr),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('scan.student.qr'.tr),
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              final barcode = capture.barcodes.firstOrNull;
              final value = barcode?.rawValue;
              if (value != null) {
                _handleQrDetected(value);
              }
            },
          ),
          if (_isProcessing)
            Container(
              color: Colors.black45,
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }
}

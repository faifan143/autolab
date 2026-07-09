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
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    returnImage: false,
  );
  bool _isProcessing = false;
  bool _torchOn = false;
  String? _lastScanPreview;

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

    setState(() {
      _isProcessing = false;
      _lastScanPreview = studentToken.length > 10
          ? '${studentToken.substring(0, 10)}...'
          : studentToken;
    });

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
    final color = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text('scan.student.qr'.tr),
        actions: [
          IconButton(
            tooltip: _torchOn ? 'scanner.torch.off'.tr : 'scanner.torch.on'.tr,
            onPressed: () async {
              await _controller.toggleTorch();
              if (!mounted) return;
              setState(() => _torchOn = !_torchOn);
            },
            icon: Icon(_torchOn ? Icons.flash_off : Icons.flash_on),
          ),
          IconButton(
            tooltip: 'scanner.switch.camera'.tr,
            onPressed: () => _controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch_outlined),
          ),
        ],
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
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white24, width: 1),
                ),
                child: Center(
                  child: Container(
                    width: 230,
                    height: 230,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: color.primary, width: 3),
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'scanner.hint'.tr,
                    style: const TextStyle(color: Colors.white),
                  ),
                  if (_lastScanPreview != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      '${'scanner.last'.tr}: $_lastScanPreview',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ],
              ),
            ),
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

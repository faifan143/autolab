import 'package:flutter/material.dart';
import 'package:get/get.dart';

class LabDetailScreen extends StatelessWidget {
  final String labId;

  const LabDetailScreen({super.key, required this.labId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('labs.detail.title'.tr),
      ),
      body: Center(
        child: Text(
          'labs.detail.placeholder'.trParams({'id': labId}),
        ),
      ),
    );
  }
}



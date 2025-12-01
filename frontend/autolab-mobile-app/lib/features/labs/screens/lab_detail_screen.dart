import 'package:flutter/material.dart';

class LabDetailScreen extends StatelessWidget {
  final String labId;

  const LabDetailScreen({super.key, required this.labId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lab Details'),
      ),
      body: Center(
        child: Text('Lab detail for ID: $labId'),
      ),
    );
  }
}



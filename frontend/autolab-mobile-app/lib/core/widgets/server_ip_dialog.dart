import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/server_config.dart';
import '../providers/auth_provider.dart';
import '../providers/labs_provider.dart';
import '../services/api_service.dart';

class ServerIpDialog extends StatefulWidget {
  const ServerIpDialog({super.key});

  @override
  State<ServerIpDialog> createState() => _ServerIpDialogState();
}

class _ServerIpDialogState extends State<ServerIpDialog> {
  final TextEditingController c1 = TextEditingController();
  final TextEditingController c2 = TextEditingController();
  final TextEditingController c3 = TextEditingController();
  final TextEditingController c4 = TextEditingController();

  @override
  void initState() {
    super.initState();
    final ip = ServerConfig.instance.serverIp;
    if (ip != null && ip.contains('.')) {
      final parts = ip.split('.');
      if (parts.length == 4) {
        c1.text = parts[0];
        c2.text = parts[1];
        c3.text = parts[2];
        c4.text = parts[3];
      }
    }
  }

  @override
  void dispose() {
    c1.dispose();
    c2.dispose();
    c3.dispose();
    c4.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Server IP Configuration'),
      content: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        textDirection: TextDirection.ltr,
        children: [
          _segment(c1),
          const Text('.'),
          _segment(c2),
          const Text('.'),
          _segment(c3),
          const Text('.'),
          _segment(c4),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            final p1 = c1.text.trim();
            final p2 = c2.text.trim();
            final p3 = c3.text.trim();
            final p4 = c4.text.trim();

            bool validPart(String part) {
              final v = int.tryParse(part);
              if (v == null) return false;
              return v >= 0 && v <= 255;
            }

            if (!validPart(p1) ||
                !validPart(p2) ||
                !validPart(p3) ||
                !validPart(p4)) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Invalid IP address')),
              );
              return;
            }

            final ip = '$p1.$p2.$p3.$p4';

            await ServerConfig.instance.setServerIp(ip);
            await ApiService.instance.init();

            if (!context.mounted) return;

            Provider.of<AuthProvider>(context, listen: false).reset();
            Provider.of<LabsProvider>(context, listen: false).reset();

            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Server IP set to $ip')),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }

  Widget _segment(TextEditingController c) {
    return SizedBox(
      width: 60,
      child: TextField(
        controller: c,
        keyboardType: TextInputType.number,
        maxLength: 3,
        decoration: const InputDecoration(counterText: ''),
      ),
    );
  }
}

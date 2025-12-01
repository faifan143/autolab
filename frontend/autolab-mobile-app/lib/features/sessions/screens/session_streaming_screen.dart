import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';

import '../../../core/providers/streaming_provider.dart';

class SessionStreamingScreen extends StatelessWidget {
  final String sessionId;
  final bool initialStreaming;

  const SessionStreamingScreen({
    super.key,
    required this.sessionId,
    this.initialStreaming = false,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          StreamingProvider()..init(sessionId, initialStreaming: initialStreaming),
      child: const _SessionStreamingBody(),
    );
  }
}

class _SessionStreamingBody extends StatelessWidget {
  const _SessionStreamingBody();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<StreamingProvider>();
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('streaming.title'.tr),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'streaming.description'.tr,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              height: 180,
              decoration: BoxDecoration(
                color: color.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Text(
                provider.isStreaming
                    ? 'streaming.preview.live'.tr
                    : 'streaming.preview.idle'.tr,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (provider.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  provider.error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: color.error,
                  ),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: provider.isLoading
                    ? null
                    : () {
                        if (provider.isStreaming) {
                          provider.stopStreaming();
                        } else {
                          provider.startStreaming();
                        }
                      },
                icon: provider.isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        provider.isStreaming
                            ? Icons.stop_circle_outlined
                            : Icons.play_circle_outline,
                      ),
                label: Text(
                  provider.isStreaming
                      ? 'streaming.stop'.tr
                      : 'streaming.start'.tr,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}



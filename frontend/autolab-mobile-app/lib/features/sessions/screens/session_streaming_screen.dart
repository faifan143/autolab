import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';

import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/streaming_provider.dart';

class SessionStreamingScreen extends StatefulWidget {
  final String sessionId;
  final bool initialStreaming;

  const SessionStreamingScreen({
    super.key,
    required this.sessionId,
    this.initialStreaming = false,
  });

  @override
  State<SessionStreamingScreen> createState() => _SessionStreamingScreenState();
}

class _SessionStreamingScreenState extends State<SessionStreamingScreen> {
  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final user = auth.user;

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text('streaming.title'.tr)),
        body: Center(child: Text('streaming.auth_required'.tr)),
      );
    }

    return ChangeNotifierProvider(
      create: (_) => StreamingProvider()
        ..init(
          widget.sessionId,
          initialStreaming: widget.initialStreaming,
          userId: user.id,
          role: user.role,
        ),
      child: const _SessionStreamingBody(),
    );
  }
}

class _SessionStreamingBody extends StatelessWidget {
  const _SessionStreamingBody();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<StreamingProvider>();
    final auth = context.read<AuthProvider>();
    final user = auth.user!;
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('streaming.title'.tr),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'streaming.description'.tr,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _PreviewArea(
                provider: provider,
                color: color,
                theme: theme,
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                'streaming.recording_server_side'.tr,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: color.primary,
                ),
              ),
            ),
            if (provider.isUploadingRecording) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(value: provider.uploadProgress),
              const SizedBox(height: 8),
              Text(
                provider.connectionStatus ?? 'streaming.uploading'.tr,
                style: theme.textTheme.bodySmall,
              ),
            ] else if (provider.connectionStatus != null &&
                !provider.isLiveBroadcast &&
                !provider.hasLocalPreview)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  provider.connectionStatus!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: color.primary,
                  ),
                ),
              ),
            const SizedBox(height: 12),
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
                onPressed: provider.isLoading || provider.isUploadingRecording
                    ? null
                    : () {
                        if (provider.isLiveBroadcast || provider.isStreaming) {
                          provider.stopStreaming();
                        } else {
                          provider.startStreaming(
                            userId: user.id,
                            role: user.role,
                          );
                        }
                      },
                icon: provider.isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        provider.isLiveBroadcast || provider.isStreaming
                            ? Icons.stop_circle_outlined
                            : Icons.play_circle_outline,
                      ),
                label: Text(
                  provider.isLiveBroadcast || provider.isStreaming
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

class _PreviewArea extends StatelessWidget {
  const _PreviewArea({
    required this.provider,
    required this.color,
    required this.theme,
  });

  final StreamingProvider provider;
  final ColorScheme color;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final renderer = provider.localRenderer;
    final showPreview = provider.hasLocalPreview && renderer != null;
    final showLiveBadge = provider.isLiveBroadcast;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: ColoredBox(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          alignment: Alignment.center,
          children: [
            if (showPreview)
              RTCVideoView(
                renderer,
                mirror: true,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              )
            else
              ColoredBox(
                color: color.surfaceContainerHigh,
                child: Center(
                  child: provider.isLoading
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(),
                            const SizedBox(height: 12),
                            Text(
                              provider.connectionStatus ??
                                  'streaming.connecting'.tr,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            'streaming.preview.idle'.tr,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                ),
              ),
            if (showLiveBadge)
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'streaming.live'.tr,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

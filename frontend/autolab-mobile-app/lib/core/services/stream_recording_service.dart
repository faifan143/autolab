import 'dart:io';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:path_provider/path_provider.dart';

/// Records the teacher's local camera/mic while streaming (Android only).
class StreamRecordingService {
  MediaRecorder? _recorder;
  String? _filePath;

  // Disabled due to flutter_webrtc MediaMuxer stop crashes on some Android devices.
  bool get isSupported => false;
  bool get isRecording => _recorder != null;

  Future<void> start(MediaStream stream) async {
    if (!isSupported) return;
    if (!Platform.isAndroid) return;
    if (_recorder != null) return;

    final videoTracks = stream.getVideoTracks();
    if (videoTracks.isEmpty) return;

    final dir = await getTemporaryDirectory();
    _filePath = '${dir.path}/session_stream_${DateTime.now().millisecondsSinceEpoch}.mp4';

    _recorder = MediaRecorder();
    await _recorder!.start(
      _filePath!,
      videoTrack: videoTracks.first,
      // OUTPUT follows the flutter_webrtc Android example and produces
      // more broadly compatible files than INPUT on many devices.
      audioChannel: RecorderAudioChannel.OUTPUT,
    );
  }

  /// Stops recording and returns the file path when the file exists and is non-empty.
  Future<String?> stop() async {
    final recorder = _recorder;
    final path = _filePath;
    _recorder = null;

    if (recorder != null) {
      try {
        await recorder.stop();
      } catch (_) {}
    }

    _filePath = null;

    if (path == null) return null;
    final file = File(path);
    if (await _waitForRecordedFile(file)) return path;
    return null;
  }

  Future<bool> _waitForRecordedFile(File file) async {
    // Media file finalization can lag briefly after stop() resolves.
    for (var i = 0; i < 10; i++) {
      if (await file.exists() && await file.length() > 0) {
        return true;
      }
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
    return false;
  }

  Future<void> deleteFile(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (_) {}
  }
}

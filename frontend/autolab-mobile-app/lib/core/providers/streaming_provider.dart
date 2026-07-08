import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart' hide navigator;
import 'package:mediasfu_mediasoup_client/mediasfu_mediasoup_client.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/sessions_service.dart';
import '../services/stream_recording_service.dart';
import '../services/streaming_signaling_service.dart';
import '../services/storage_service.dart';

class StreamingProvider with ChangeNotifier {
  final SessionsService _sessionsService = SessionsService();
  final StreamingSignalingService _signaling = StreamingSignalingService();
  final StreamRecordingService _recording = StreamRecordingService();
  final StorageService _storage = StorageService();

  Device? _device;
  Transport? _sendTransport;
  MediaStream? _localStream;
  RTCVideoRenderer? _localRenderer;
  Producer? _videoProducer;
  Producer? _audioProducer;
  final List<Completer<Producer>> _producerCompleters = [];

  bool _disposed = false;
  bool _isStopping = false;
  bool _isStreaming = false;
  bool _isLoading = false;
  bool _isUploadingRecording = false;
  bool _saveRecording = false;
  double _uploadProgress = 0;
  bool _hasLocalPreview = false;
  String? _error;
  String? _sessionId;
  String? _connectionStatus;

  bool get isStreaming => _isStreaming;
  bool get isLoading => _isLoading;
  bool get isUploadingRecording => _isUploadingRecording;
  bool get saveRecording => _saveRecording;
  bool get recordingSupported => _recording.isSupported;
  double get uploadProgress => _uploadProgress;
  bool get isLiveBroadcast => _videoProducer != null;
  bool get hasLocalPreview => _hasLocalPreview;
  String? get error => _error;
  String? get sessionId => _sessionId;
  String? get connectionStatus => _connectionStatus;
  RTCVideoRenderer? get localRenderer => _localRenderer;

  void setSaveRecording(bool value) {
    if (!recordingSupported) return;
    if (_isStreaming || isLiveBroadcast) return;
    _saveRecording = value;
    _notify();
  }

  @override
  void dispose() {
    _disposed = true;
    _signaling.onError = null;
    unawaited(_stopRecordingSilently());
    unawaited(_cleanupPublishers());
    super.dispose();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> init(
    String sessionId, {
    bool initialStreaming = false,
    required String userId,
    required String role,
  }) async {
    _sessionId = sessionId;
    _isStreaming = initialStreaming;
    _error = null;
    _connectionStatus = null;
    _notify();

    if (initialStreaming) {
      await startStreaming(userId: userId, role: role);
    }
  }

  Future<void> startStreaming({
    required String userId,
    required String role,
  }) async {
    if (_disposed || _sessionId == null || isLiveBroadcast || _isLoading) {
      return;
    }

    _isLoading = true;
    _error = null;
    _connectionStatus = 'streaming.connecting'.tr;
    _notify();

    var startedSessionOnServer = false;

    try {
      final cameraGranted = await _ensureMediaPermissions();
      if (!cameraGranted) {
        throw Exception('streaming.permission_denied'.tr);
      }

      if (!_isStreaming) {
        await _sessionsService.startStream(_sessionId!);
        startedSessionOnServer = true;
      }

      final token = await _storage.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('No access token available');
      }

      _signaling.onError = (message) {
        if (_disposed || _isStopping) return;
        _error = message;
        _notify();
      };

      await _signaling.connect(userId: userId, role: role, token: token);
      await _startPublishing(_sessionId!);

      _isStreaming = true;
      _connectionStatus = 'streaming.live'.tr;
      _error = null;
    } catch (e) {
      if (_disposed) return;
      _error = _humanizeStreamingError(e);
      _connectionStatus = null;
      await _stopRecordingSilently();
      await _cleanupPublishers();
      if (startedSessionOnServer || _isStreaming) {
        try {
          await _sessionsService.stopStream(_sessionId!);
        } catch (_) {}
      }
      _isStreaming = false;
      _hasLocalPreview = false;
      _isLoading = false;
      _notify();
      return;
    }

    if (_disposed) return;
    _isLoading = false;
    _notify();
  }

  Future<void> stopStreaming() async {
    if (_disposed ||
        _sessionId == null ||
        (!_isStreaming && !isLiveBroadcast) ||
        _isLoading ||
        _isUploadingRecording) {
      return;
    }

    _isLoading = true;
    _isStopping = true;
    _error = null;
    _uploadProgress = 0;
    _notify();

    String? recordingPath;

    try {
      await _signaling.stopStream(_sessionId!);
      await _sessionsService.stopStream(_sessionId!);
      recordingPath = await _recording.stop();
    } catch (e) {
      recordingPath ??= await _recording.stop();
      final message = _humanizeStreamingError(e);
      if (!_disposed && message.isNotEmpty) {
        _error = message;
      }
    } finally {
      await _cleanupPublishers();
      _isStreaming = false;
      _hasLocalPreview = false;
      _connectionStatus = null;
      _isStopping = false;

      if (!_disposed &&
          _saveRecording &&
          recordingPath != null &&
          _sessionId != null) {
        await _uploadRecording(recordingPath);
      } else if (!_disposed && _saveRecording && recordingPath == null) {
        _error = 'streaming.upload_failed'.tr;
      } else if (recordingPath != null) {
        await _recording.deleteFile(recordingPath);
      }

      if (!_disposed) {
        _isLoading = false;
        _notify();
      }
    }
  }

  Future<void> _uploadRecording(String path) async {
    if (_sessionId == null) return;

    _isUploadingRecording = true;
    _uploadProgress = 0;
    _connectionStatus = 'streaming.uploading'.tr;
    _notify();

    try {
      await _sessionsService.uploadStreamVideo(
        _sessionId!,
        path,
        onSendProgress: (sent, total) {
          if (_disposed || total <= 0) return;
          _uploadProgress = sent / total;
          _notify();
        },
      );
      if (!_disposed) {
        _connectionStatus = 'streaming.upload_success'.tr;
        _error = null;
      }
    } catch (e) {
      if (!_disposed) {
        _error = 'streaming.upload_failed'.tr;
        _connectionStatus = null;
      }
    } finally {
      _isUploadingRecording = false;
      await _recording.deleteFile(path);
      if (!_disposed) _notify();
    }
  }

  Future<void> _stopRecordingSilently() async {
    final path = await _recording.stop();
    if (path != null) {
      await _recording.deleteFile(path);
    }
  }

  Future<void> _startPublishing(String sessionId) async {
    final routerCaps = await _signaling.getRouterRtpCapabilities(sessionId);

    _device = Device();
    await _device!.load(routerRtpCapabilities: routerCaps);

    final transportInfo = await _signaling.createProducerTransport(sessionId);
    final params = Map<String, dynamic>.from(transportInfo['params'] as Map);

    _sendTransport = _device!.createSendTransport(
      id: params['id'] as String,
      iceParameters: IceParameters.fromMap(
        Map<String, dynamic>.from(params['iceParameters'] as Map),
      ),
      iceCandidates: (params['iceCandidates'] as List)
          .map(
            (candidate) => IceCandidate.fromMap(
              Map<String, dynamic>.from(candidate as Map),
            ),
          )
          .toList(),
      dtlsParameters: DtlsParameters.fromMap(
        Map<String, dynamic>.from(params['dtlsParameters'] as Map),
      ),
      producerCallback: _onProducerCreated,
    );

    _sendTransport!.on('connect', (Map data) async {
      try {
        await _signaling.connectTransport(
          _sendTransport!.id,
          data['dtlsParameters'] as DtlsParameters,
        );
        (data['callback'] as Function)();
      } catch (error) {
        (data['errback'] as Function)(error);
      }
    });

    _sendTransport!.on('produce', (Map data) async {
      try {
        final kind = data['kind']?.toString() ?? 'video';
        final producerId = await _signaling.produce(
          sessionId: sessionId,
          transportId: _sendTransport!.id,
          kind: kind,
          rtpParameters: data['rtpParameters'] as RtpParameters,
        );
        (data['callback'] as Function)(producerId);
      } catch (error) {
        (data['errback'] as Function)(error);
      }
    });

    _sendTransport!.on('connectionstatechange', (Map data) {
      if (_disposed || _isStopping) return;
      final state = data['connectionState']?.toString() ?? '';
      if (state == 'failed' ||
          state == 'disconnected' ||
          state == 'closed') {
        _error = 'streaming.connection_failed'.tr;
        _notify();
      }
    });

    _localRenderer = RTCVideoRenderer();
    await _localRenderer!.initialize();

    _localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': {
        'facingMode': 'user',
        'width': {'ideal': 1280},
        'height': {'ideal': 720},
      },
    });

    _localRenderer!.srcObject = _localStream;
    _hasLocalPreview = true;
    _notify();

    if (_saveRecording) {
      try {
        await _recording.start(_localStream!);
      } catch (_) {
        // Live stream continues even if local recording fails to start.
      }
    }

    if (_device!.canProduce(RTCRtpMediaType.RTCRtpMediaTypeVideo)) {
      final videoTrack = _localStream!.getVideoTracks().first;
      _videoProducer = await _produceTrack(
        track: videoTrack,
        source: 'camera',
      );
      _notify();
    }

    if (_device!.canProduce(RTCRtpMediaType.RTCRtpMediaTypeAudio)) {
      final audioTracks = _localStream!.getAudioTracks();
      if (audioTracks.isNotEmpty) {
        try {
          _audioProducer = await _produceTrack(
            track: audioTracks.first,
            source: 'mic',
          );
        } catch (_) {
          // Video-only streaming is still valid.
        }
      }
    }
  }

  Future<Producer> _produceTrack({
    required MediaStreamTrack track,
    required String source,
  }) async {
    final completer = Completer<Producer>();
    _producerCompleters.add(completer);
    _sendTransport!.produce(
      track: track,
      stream: _localStream!,
      source: source,
      stopTracks: false,
    );
    return completer.future.timeout(const Duration(seconds: 30));
  }

  void _onProducerCreated(Producer producer) {
    for (final completer in _producerCompleters) {
      if (!completer.isCompleted) {
        completer.complete(producer);
        return;
      }
    }
  }

  String _humanizeStreamingError(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      final serverMessage = body is Map
          ? body['message']?.toString()
          : null;
      if (error.response?.statusCode == 400 &&
          (serverMessage?.contains('No active stream') ?? false)) {
        return '';
      }
    }

    final message = error.toString();
    if (message.contains('No active stream') ||
        message.contains('Stream not found or unauthorized')) {
      return '';
    }
    if (message.contains('Timed out waiting for produced') ||
        message.contains('connectionstatechange') ||
        message.contains('FAILED') ||
        message.contains('PeerConnection is closed') ||
        message.contains('sender is null')) {
      return _isStopping ? '' : 'streaming.connection_failed'.tr;
    }
    if (message.contains('DioException')) {
      return _isStopping ? '' : 'streaming.connection_failed'.tr;
    }
    return message;
  }

  Future<bool> _ensureMediaPermissions() async {
    final statuses = await [
      Permission.camera,
      Permission.microphone,
    ].request();

    return statuses[Permission.camera]?.isGranted == true &&
        statuses[Permission.microphone]?.isGranted == true;
  }

  Future<void> _cleanupPublishers() async {
    _signaling.onError = null;

    for (final completer in _producerCompleters) {
      if (!completer.isCompleted) {
        completer.completeError(StateError('Streaming stopped'));
      }
    }
    _producerCompleters.clear();

    try {
      _videoProducer?.close();
    } catch (_) {}
    try {
      _audioProducer?.close();
    } catch (_) {}
    _videoProducer = null;
    _audioProducer = null;

    try {
      _sendTransport?.close();
    } catch (_) {}
    _sendTransport = null;
    _device = null;

    if (_localStream != null) {
      for (final track in _localStream!.getTracks()) {
        await track.stop();
      }
      await _localStream!.dispose();
      _localStream = null;
    }

    if (_localRenderer != null) {
      await _localRenderer!.dispose();
      _localRenderer = null;
    }

    _hasLocalPreview = false;
    _signaling.disconnect();
  }
}

import 'dart:async';

import 'package:mediasfu_mediasoup_client/mediasfu_mediasoup_client.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/server_config.dart';

class StreamingSignalingService {
  io.Socket? _socket;
  void Function(String message)? onError;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect({
    required String userId,
    required String role,
    required String token,
  }) async {
    disconnect();

    final cleanToken = token.replaceFirst(RegExp(r'^Bearer\s+'), '');
    final baseUrl =
        ServerConfig.instance.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    final uri = '$baseUrl/ws/streaming';

    final completer = Completer<void>();

    _socket = io.io(
      uri,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .setAuth({
            'userId': userId,
            'role': role,
            'token': cleanToken,
          })
          .setExtraHeaders({'Authorization': 'Bearer $cleanToken'})
          .setTimeout(10000)
          .build(),
    );

    _socket?.onConnect((_) {
      if (!completer.isCompleted) completer.complete();
    });

    _socket?.onConnectError((error) {
      if (!completer.isCompleted) {
        completer.completeError(
          error ?? 'Failed to connect to streaming server',
        );
      }
    });

    _socket?.onError((error) {
      onError?.call(error?.toString() ?? 'Streaming socket error');
    });

    _socket?.on('stream-error', (data) {
      final message =
          data is Map ? data['message']?.toString() : data?.toString();
      if (message != null && message.isNotEmpty) {
        onError?.call(message);
      }
    });

    await completer.future.timeout(
      const Duration(seconds: 10),
      onTimeout: () => throw TimeoutException('Streaming connection timed out'),
    );
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    onError = null;
  }

  Future<RtpCapabilities> getRouterRtpCapabilities(String sessionId) async {
    final response = await _waitForEvent(
      emitEvent: 'get-router-rtp-capabilities',
      emitPayload: {'sessionId': sessionId},
      listenEvent: 'router-rtp-capabilities',
      matches: (data) =>
          data is Map &&
          (data['sessionId'] == null || data['sessionId'] == sessionId),
    );

    return RtpCapabilities.fromMap(
      Map<String, dynamic>.from(response['rtpCapabilities'] as Map),
    );
  }

  Future<Map<String, dynamic>> createProducerTransport(String sessionId) async {
    return _waitForEvent(
      emitEvent: 'create-transport',
      emitPayload: {'sessionId': sessionId, 'type': 'producer'},
      listenEvent: 'transport-created',
      matches: (data) =>
          data is Map &&
          (data['sessionId'] == null || data['sessionId'] == sessionId),
    );
  }

  Future<void> connectTransport(
    String transportId,
    DtlsParameters dtlsParameters,
  ) async {
    await _waitForEvent(
      emitEvent: 'connect-transport',
      emitPayload: {
        'transportId': transportId,
        'dtlsParameters': dtlsParameters.toMap(),
      },
      listenEvent: 'transport-connected',
      matches: (data) =>
          data is Map && data['transportId']?.toString() == transportId,
    );
  }

  Future<String> produce({
    required String sessionId,
    required String transportId,
    required String kind,
    required RtpParameters rtpParameters,
  }) async {
    final response = await _waitForEvent(
      emitEvent: 'produce',
      emitPayload: {
        'sessionId': sessionId,
        'transportId': transportId,
        'kind': kind,
        'rtpParameters': rtpParameters.toMap(),
      },
      listenEvent: 'produced',
      matches: (data) =>
          data is Map &&
          (data['sessionId'] == null || data['sessionId'] == sessionId) &&
          data['kind']?.toString() == kind,
    );

    return response['producerId']?.toString() ?? '';
  }

  Future<void> stopStream(String sessionId) async {
    final socket = _socket;
    if (socket == null || !socket.connected) return;

    final completer = Completer<void>();

    void handler(dynamic data) {
      socket.off('stream-stopped-ack', handler);
      if (!completer.isCompleted) completer.complete();
    }

    socket.on('stream-stopped-ack', handler);
    socket.emit('stop-stream', {'sessionId': sessionId});

    try {
      await completer.future.timeout(const Duration(seconds: 10));
    } on TimeoutException {
      socket.off('stream-stopped-ack', handler);
    }
  }

  Future<Map<String, dynamic>> _waitForEvent({
    required String emitEvent,
    required Map<String, dynamic> emitPayload,
    required String listenEvent,
    required bool Function(dynamic data) matches,
  }) async {
    final socket = _socket;
    if (socket == null || !socket.connected) {
      throw StateError('Streaming socket is not connected');
    }

    final completer = Completer<Map<String, dynamic>>();

    late void Function(dynamic data) errorHandler;

    void successHandler(dynamic data) {
      if (!matches(data)) return;
      socket.off(listenEvent, successHandler);
      socket.off('stream-error', errorHandler);
      if (!completer.isCompleted) {
        completer.complete(Map<String, dynamic>.from(data as Map));
      }
    }

    errorHandler = (dynamic data) {
      socket.off(listenEvent, successHandler);
      socket.off('stream-error', errorHandler);
      if (!completer.isCompleted) {
        final message = data is Map
            ? data['message']?.toString() ?? 'Streaming error'
            : data?.toString() ?? 'Streaming error';
        completer.completeError(Exception(message));
      }
    };

    socket.on(listenEvent, successHandler);
    socket.on('stream-error', errorHandler);
    socket.emit(emitEvent, emitPayload);

    return completer.future.timeout(
      const Duration(seconds: 30),
      onTimeout: () {
        socket.off(listenEvent, successHandler);
        socket.off('stream-error', errorHandler);
        throw TimeoutException('Timed out waiting for $listenEvent');
      },
    );
  }
}

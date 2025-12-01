import 'package:get_storage/get_storage.dart';

class ServerConfig {
  static final ServerConfig instance = ServerConfig._();
  ServerConfig._();

  final GetStorage _box = GetStorage();
  static const String _key = 'server_ip';

  String? get serverIp => _box.read<String>(_key);

  Future<void> setServerIp(String ip) async {
    await _box.write(_key, ip);
    // Debug log to terminal when IP changes.
    // ignore: avoid_print
    print('🔧 ServerConfig: saved server IP = $ip');
  }

  /// Returns "http://<IP>:3000" for REST.
  String get apiBaseUrl {
    final ip = serverIp;
    final url = ip == null ? 'http://127.0.0.1:3000/' : 'http://$ip:3000/';
    // ignore: avoid_print
    print('🔧 ServerConfig.apiBaseUrl = $url');
    return url;
  }

  /// Returns "ws://<IP>:3000" for WebSocket.
  String get wsBaseUrl {
    final ip = serverIp;
    return ip == null ? 'ws://127.0.0.1:3000/' : 'ws://$ip:3000/';
  }
}

import 'package:flutter/services.dart';

class WifiService {
  static const _method = MethodChannel("campuspulse/wifi");

  /// Returns a Map like:
  /// { "ssid": "...", "bssid": "...", "ipAddress": "...", "isWifi": true/false }
  Future<Map<String, dynamic>> getWifiDetails() async {
    final res = await _method.invokeMethod<Map>("getWifiDetails");
    if (res == null) return {"supported": false};
    return Map<String, dynamic>.from(res);
  }

  /// Helper used by main.dart
  Future<bool> isWifiConnected([Map<String, dynamic>? details]) async {
    details ??= await getWifiDetails();

    // main indicator from native side
    final isWifi = details["isWifi"];
    if (isWifi is bool) return isWifi;

    // fallback checks
    final ssid = (details["ssid"] ?? "").toString().trim();
    return ssid.isNotEmpty && ssid != "<unknown ssid>";
  }
}

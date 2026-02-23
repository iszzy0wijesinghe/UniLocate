import 'package:flutter/material.dart';
import '../services/wifi_service.dart';
import '../ui/app_theme.dart';

class HomeView extends StatefulWidget {
  final Future<void> Function() onStartCalibration;
  const HomeView({super.key, required this.onStartCalibration});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView>
    with SingleTickerProviderStateMixin {
  final _wifiSvc = WifiService();
  Map<String, dynamic>? _wifi;
  String? _wifiError;
  bool _wifiOk = false;

  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  @override
  void initState() {
    super.initState();
    _refreshWifi();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _refreshWifi() async {
    try {
      final m = await _wifiSvc.getWifiDetails();

      final ssid = (m["ssid"] ?? "").toString().trim();
      final bssid = (m["bssid"] ?? "").toString().trim();
      final ip = (m["ipAddress"] ?? "").toString().trim();

      // you can tighten this rule later (e.g., require "SLIIT" in SSID)
      final ok = ssid.isNotEmpty && ip.isNotEmpty && bssid.isNotEmpty;

      if (!mounted) return;
      setState(() {
        _wifi = m;
        _wifiOk = ok;
        _wifiError = ok ? null : "Connect to campus WiFi to start calibration.";
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _wifi = null;
        _wifiOk = false;
        _wifiError = "WiFi info error: $e";
      });
    }
  }

  String _wifiLine() {
    final m = _wifi;
    if (m == null) return _wifiError ?? "WiFi: —";

    final ssid = (m["ssid"] ?? "—").toString();
    final ip = (m["ipAddress"] ?? "—").toString();
    final bssid = (m["bssid"] ?? "—").toString();
    final rssi = (m["rssi"] ?? "—").toString();
    final speed = (m["linkSpeedMbps"] ?? "—").toString();

    return "SSID: $ssid\nIP: $ip\nBSSID: $bssid\nRSSI: $rssi dBm • Speed: $speed Mbps";
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
        children: [
          const Text(
            "UniLocate Calibrator",
            style: TextStyle(
              color: AppTheme.brandBlue,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Calibration Tool",
            style: TextStyle(color: cs.outline, fontWeight: FontWeight.w700),
          ),

          const SizedBox(height: 14),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppTheme.brandOrange.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.rule_rounded,
                      color: AppTheme.brandOrange,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      "Rules:\n• Must be on campus WiFi\n• Keep phone steady\n• Save only if accuracy is good",
                      style: TextStyle(
                        color: cs.onSurface,
                        fontWeight: FontWeight.w700,
                        height: 1.25,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        "Connection",
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: _refreshWifi,
                        icon: const Icon(Icons.refresh_rounded),
                        tooltip: "Refresh",
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      _wifiLine(),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        height: 1.35,
                        color: _wifiOk ? AppTheme.brandBlue : cs.error,
                      ),
                    ),
                  ),
                  if (_wifiError != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _wifiError!,
                      style: TextStyle(
                        color: cs.error,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          Center(
            child: GestureDetector(
              onTap: () async {
                await _refreshWifi();
                if (!_wifiOk) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(_wifiError ?? "WiFi required")),
                  );
                  return;
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Preparing calibration… ✨")),
                );
                await widget.onStartCalibration();
              },
              child: AnimatedBuilder(
                animation: _pulse,
                builder: (_, __) {
                  final t = 0.92 + (_pulse.value * 0.08);
                  return Transform.scale(
                    scale: t,
                    child: Container(
                      width: 164,
                      height: 164,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.brandBlue,
                            AppTheme.brandBlue.withOpacity(0.85),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.brandBlue.withOpacity(0.25),
                            blurRadius: 24,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 48,
                            ),
                            SizedBox(height: 6),
                            Text(
                              "Start",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          const SizedBox(height: 10),
          Center(
            child: Text(
              "Tap to calibrate this place",
              style: TextStyle(color: cs.outline, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

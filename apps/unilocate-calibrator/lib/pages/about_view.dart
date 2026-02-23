import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../ui/app_theme.dart';

class AboutView extends StatefulWidget {
  const AboutView({super.key});

  @override
  State<AboutView> createState() => _AboutViewState();
}

class _AboutViewState extends State<AboutView> {
  String _version = "—";
  String _build = "—";
  String _appName = "UniLocate Calibrator";
  String _package = "—";

  @override
  void initState() {
    super.initState();
    _loadInfo();
  }

  Future<void> _loadInfo() async {
    final info = await PackageInfo.fromPlatform();
    if (!mounted) return;
    setState(() {
      _appName = info.appName.isEmpty ? _appName : info.appName;
      _package = info.packageName;
      _version = info.version;
      _build = info.buildNumber;
    });
  }

  Widget _row(String k, String v) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              k,
              style: TextStyle(color: cs.outline, fontWeight: FontWeight.w700),
            ),
          ),
          Text(
            v,
            style: const TextStyle(
              color: AppTheme.brandBlue,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _feature(String title, String desc, IconData icon, Color tone) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: tone.withOpacity(0.10),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(icon, color: tone),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppTheme.brandBlue,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: TextStyle(
                      color: cs.outline,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text("About")),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _appName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppTheme.brandBlue,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Admin location calibration tool for UniLocate.\nCollects stable GPS + WiFi + sensor signatures.",
                    style: TextStyle(
                      color: cs.outline,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _row("Version", _version),
                  _row("Build", _build),
                  _row("Package", _package),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            "Features",
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppTheme.brandBlue,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 10),
          _feature(
            "WiFi enforced",
            "Calibration runs only when connected to campus WiFi.",
            Icons.wifi,
            AppTheme.brandOrange,
          ),
          const SizedBox(height: 10),
          _feature(
            "GPS sampling",
            "Collects multiple readings and saves stable median coords.",
            Icons.my_location,
            Colors.green,
          ),
          const SizedBox(height: 10),
          _feature(
            "Sensors",
            "Captures heading, acceleration and barometer pressure (if supported).",
            Icons.sensors,
            AppTheme.brandBlue,
          ),
        ],
      ),
    );
  }
}

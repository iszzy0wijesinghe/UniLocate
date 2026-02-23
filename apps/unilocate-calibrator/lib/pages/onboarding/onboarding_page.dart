import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key, required this.onFinish});
  final VoidCallback onFinish;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage>
    with SingleTickerProviderStateMixin {
  final _controller = PageController();
  int _index = 0;

  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  final _pages = const [
    _OnbData(
      title: "Welcome to UniLocate",
      subtitle:
          "A tiny tool to calibrate indoor campus spots using GPS + sensors.\nSave clean points & export as JSON.",
      icon: Icons.location_on_rounded,
    ),
    _OnbData(
      title: "Capture stable readings",
      subtitle:
          "Hold your phone steady for 30 seconds.\nWe’ll record accuracy, heading (if available) and barometer (if available).",
      icon: Icons.speed_rounded,
    ),
    _OnbData(
      title: "Campus WiFi verification",
      subtitle:
          "We check WiFi details to ensure you’re inside campus.\n(Android requires Location permission to read SSID/BSSID).",
      icon: Icons.wifi_rounded,
    ),
    _OnbData(
      title: "Ready to calibrate?",
      subtitle:
          "Let’s enable the required permissions.\nYou can change them later in Settings.",
      icon: Icons.check_circle_rounded,
    ),
  ];

  @override
  void dispose() {
    _pulse.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    // We need location for GPS + WiFi SSID/BSSID on Android.
    final loc = await Permission.locationWhenInUse.request();

    // Sensors (accelerometer/compass/barometer) typically don't need runtime permissions.
    // Storage is not needed if saving in app documents dir (your current approach).

    if (!mounted) return;

    if (loc.isGranted) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool("onboarding_done", true);
      widget.onFinish();
    } else {
      _showNiceSnack(
        "Location is required for GPS + WiFi verification 🙏",
        success: false,
      );
    }
  }

  void _showNiceSnack(String msg, {bool success = true}) {
    final cs = Theme.of(context).colorScheme;
    final bg = success ? const Color(0xFF0EA5E9) : cs.error;
    final icon = success ? Icons.check_circle_rounded : Icons.error_rounded;

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: bg,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                msg,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _next() {
    if (_index < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOut,
      );
    } else {
      _requestPermissions();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final last = _index == _pages.length - 1;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 10),

            // Top progress dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: active ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: active ? const Color(0xFF053668) : cs.outlineVariant,
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              }),
            ),

            const SizedBox(height: 14),

            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) {
                  final d = _pages[i];

                  return Padding(
                    padding: const EdgeInsets.fromLTRB(18, 10, 18, 12),
                    child: Column(
                      children: [
                        const Spacer(),

                        // Animated icon bubble
                        AnimatedBuilder(
                          animation: _pulse,
                          builder: (_, __) {
                            final scale = 0.94 + (_pulse.value * 0.06);
                            return Transform.scale(
                              scale: scale,
                              child: Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF053668).withOpacity(0.10),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF053668).withOpacity(0.18),
                                      blurRadius: 28,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  d.icon,
                                  size: 64,
                                  color: const Color(0xFF053668),
                                ),
                              ),
                            );
                          },
                        ),

                        const SizedBox(height: 22),

                        Text(
                          d.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),

                        const SizedBox(height: 10),

                        Text(
                          d.subtitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            height: 1.35,
                            color: cs.onSurface.withOpacity(0.75),
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),

                        const Spacer(),
                      ],
                    ),
                  );
                },
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
              child: Row(
                children: [
                  TextButton(
                    onPressed: () async {
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setBool("onboarding_done", true);
                      widget.onFinish();
                    },
                    child: const Text("Skip"),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: _next,
                    icon: Icon(last ? Icons.lock_open_rounded : Icons.arrow_forward_rounded),
                    label: Text(last ? "Enable & Start" : "Next"),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF053668),
                      minimumSize: const Size(160, 52),
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
}

class _OnbData {
  final String title;
  final String subtitle;
  final IconData icon;
  const _OnbData({required this.title, required this.subtitle, required this.icon});
}
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/pressure_service.dart';
import 'services/wifi_service.dart';
import 'pages/home_shell.dart';
import 'pages/onboarding/onboarding_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final done = prefs.getBool("onboarding_done") ?? false;

  runApp(CampusCalibratorApp(showOnboarding: !done));
}

class CampusCalibratorApp extends StatefulWidget {
  const CampusCalibratorApp({super.key, required this.showOnboarding});
  final bool showOnboarding;

  @override
  State<CampusCalibratorApp> createState() => _CampusCalibratorAppState();
}

class _CampusCalibratorAppState extends State<CampusCalibratorApp> {
  late bool _showOnboarding = widget.showOnboarding;

  @override
  Widget build(BuildContext context) {
    const primary = Color(0xFF053668); // Teal Blue
    const accent = Color(0xFFFF7100); // Blaze Orange

    final light = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: accent,
      surface: Colors.white,
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Unilocate Calibrator',

      // ✅ Light mode only
      themeMode: ThemeMode.light,
      darkTheme: null,

      theme: ThemeData(
        useMaterial3: true,
        colorScheme: light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),

        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: primary,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: primary,
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),

        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          surfaceTintColor: Colors.transparent,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
        ),

        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          isDense: true,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFE6ECF4)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFE6ECF4)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: primary, width: 1.4),
          ),
          labelStyle: const TextStyle(color: Color(0xFF47627A)),
        ),

        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(56),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),

        chipTheme: ChipThemeData(
          backgroundColor: const Color(0xFFEAF1F8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          labelStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),

        dividerTheme: const DividerThemeData(
          color: Color(0xFFE6ECF4),
          thickness: 1,
        ),

        snackBarTheme: const SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
        ),
      ),

      home: _showOnboarding
          ? OnboardingPage(
              onFinish: () => setState(() => _showOnboarding = false),
            )
          : const HomeShell(),
    );
  }
}

class CalibrationRecord {
  final String id;
  final String placeId;
  final String placeType;
  final String building;
  final int floor;
  final DateTime capturedAt;

  final double lat;
  final double lng;
  final double accuracyM;

  final Map<String, dynamic> sensors;

  CalibrationRecord({
    required this.id,
    required this.placeId,
    required this.placeType,
    required this.building,
    required this.floor,
    required this.capturedAt,
    required this.lat,
    required this.lng,
    required this.accuracyM,
    required this.sensors,
  });

  Map<String, dynamic> toJson() => {
    "id": id,
    "placeId": placeId,
    "placeType": placeType,
    "building": building,
    "floor": floor,
    "capturedAt": capturedAt.toIso8601String(),
    "geo": {"lat": lat, "lng": lng, "accuracyM": accuracyM},
    "sensors": sensors,
  };
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Brand colors
  static const _primary = Color(0xFF053668);
  static const _accent = Color(0xFFFF7100);

  // Form
  final _formKey = GlobalKey<FormState>();
  final _placeIdCtrl = TextEditingController(text: "G1104");
  final _buildingCtrl = TextEditingController(text: "G_BLOCK");
  final _floorCtrl = TextEditingController(text: "11");
  String _placeType = "LECTURE_HALL";

  // Running state
  bool _running = false;
  int _secondsLeft = 0;

  // Optional sensor support + notes
  bool _compassSupported = true;
  String? _compassNote;

  bool _pressureSupported = false;
  String? _pressureNote;

  // Live readings
  double? _liveLat, _liveLng, _liveAcc, _liveHeading;
  AccelerometerEvent? _liveAccel;
  double? _livePressure; // hPa

  // Pressure (barometer)
  final _pressureSvc = PressureService();
  StreamSubscription<double>? _pressureSub;

  // WiFi
  final _wifiSvc = WifiService();
  Map<String, dynamic>? _liveWifi;
  bool _wifiOk = false;
  String? _wifiError;

  // Samples
  final List<double> _latS = [];
  final List<double> _lngS = [];
  final List<double> _accS = [];
  final List<double> _headingS = [];
  final List<AccelerometerEvent> _accelS = [];
  final List<double> _pressureS = [];

  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription? _compassSub;

  // Saved
  List<CalibrationRecord> _saved = [];
  final Set<String> _selectedIds = {};
  String _filterType = "ALL";

  @override
  void initState() {
    super.initState();
    _loadSaved();
    _refreshWifi();
  }

  @override
  void dispose() {
    _placeIdCtrl.dispose();
    _buildingCtrl.dispose();
    _floorCtrl.dispose();
    _stopStreams();
    super.dispose();
  }

  // ---------- Snack ----------
  void _toast(String message, {bool success = true}) {
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
                message,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Storage ----------
  Future<File> _getLocalFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File("${dir.path}/campus_calibrations.json");
  }

  Future<void> _loadSaved() async {
    final file = await _getLocalFile();
    if (!await file.exists()) return;

    final txt = await file.readAsString();
    final decoded = jsonDecode(txt);
    final list = (decoded["calibrations"] as List).cast<Map<String, dynamic>>();

    setState(() {
      _saved = list.map((m) {
        return CalibrationRecord(
          id: m["id"],
          placeId: m["placeId"],
          placeType: m["placeType"],
          building: m["building"],
          floor: m["floor"],
          capturedAt: DateTime.parse(m["capturedAt"]),
          lat: (m["geo"]["lat"] as num).toDouble(),
          lng: (m["geo"]["lng"] as num).toDouble(),
          accuracyM: (m["geo"]["accuracyM"] as num).toDouble(),
          sensors: (m["sensors"] as Map).cast<String, dynamic>(),
        );
      }).toList();
    });
  }

  Future<void> _saveToDisk() async {
    final file = await _getLocalFile();
    final payload = {
      "campus": "SLIIT",
      "exportedAt": DateTime.now().toIso8601String(),
      "calibrations": _saved.map((e) => e.toJson()).toList(),
    };
    await file.writeAsString(
      const JsonEncoder.withIndent("  ").convert(payload),
    );
  }

  // ---------- WiFi ----------
  Future<void> _refreshWifi() async {
    try {
      final details = await _wifiSvc.getWifiDetails();

      bool ok = false;
      try {
        ok = await _wifiSvc.isWifiConnected(details);
      } catch (_) {
        try {
          // ignore: avoid_dynamic_calls
          ok = await (_wifiSvc as dynamic).isWifiConnected();
        } catch (_) {
          final ssid = (details["ssid"] ?? "").toString().trim();
          ok = ssid.isNotEmpty && ssid.toLowerCase() != "<unknown ssid>";
        }
      }

      if (!mounted) return;

      setState(() {
        _liveWifi = details;
        _wifiOk = ok;
        _wifiError = ok ? null : "WiFi required. Connect to campus WiFi.";
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _liveWifi = null;
        _wifiOk = false;
        _wifiError = "WiFi info error: $e";
      });
    }
  }

  // ---------- Permissions ----------
  Future<void> _ensurePermissions() async {
    await Permission.locationWhenInUse.request();
    final status = await Permission.locationWhenInUse.status;
    if (!status.isGranted) throw Exception("Location permission denied");

    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) throw Exception("Location Services are OFF");
  }

  Future<Position> _getPos() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.bestForNavigation,
        timeLimit: const Duration(seconds: 6),
      );
    } on TimeoutException {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    }
  }

  // ---------- Stats ----------
  double _median(List<double> values) {
    if (values.isEmpty) return double.nan;
    final sorted = [...values]..sort();
    final mid = sorted.length ~/ 2;
    if (sorted.length.isOdd) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2.0;
  }

  double _avg(List<double> values) {
    if (values.isEmpty) return double.nan;
    return values.reduce((a, b) => a + b) / values.length;
  }

  Map<String, double> _accelAvg(List<AccelerometerEvent> list) {
    if (list.isEmpty)
      return {"x": double.nan, "y": double.nan, "z": double.nan};
    double sx = 0, sy = 0, sz = 0;
    for (final e in list) {
      sx += e.x;
      sy += e.y;
      sz += e.z;
    }
    return {
      "x": sx / list.length,
      "y": sy / list.length,
      "z": sz / list.length,
    };
  }

  String _accBadge(double? acc) {
    if (acc == null) return "—";
    if (acc <= 10) return "Great";
    if (acc <= 25) return "OK";
    return "Weak";
  }

  Color _accTone(double? acc) {
    if (acc == null) return Colors.grey;
    if (acc <= 10) return Colors.green;
    if (acc <= 25) return Colors.orange;
    return Colors.red;
  }

  Future<void> _stopStreams() async {
    await _accelSub?.cancel();
    _accelSub = null;
    await _compassSub?.cancel();
    _compassSub = null;
    await _pressureSub?.cancel();
    _pressureSub = null;
  }

  // ---------- Calibration ----------
  Future<void> _startCalibration() async {
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) {
      _toast("Please fill required fields ✍️", success: false);
      return;
    }

    await _refreshWifi();
    if (!_wifiOk) {
      _toast(_wifiError ?? "WiFi required", success: false);
      return;
    }

    setState(() {
      _running = true;
      _secondsLeft = 30;

      _latS.clear();
      _lngS.clear();
      _accS.clear();
      _headingS.clear();
      _accelS.clear();
      _pressureS.clear();

      _livePressure = null;
      _liveHeading = null;

      _compassSupported = true;
      _compassNote = null;
      _pressureSupported = false;
      _pressureNote = null;
    });

    try {
      await _ensurePermissions();

      // ---- Barometer support (optional)
      try {
        _pressureSupported = await _pressureSvc.isSupported();
        _pressureNote = _pressureSupported
            ? null
            : "No barometer sensor on this device";
      } catch (_) {
        _pressureSupported = false;
        _pressureNote = "No barometer sensor on this device";
      }

      // ---- Accelerometer (no runtime permissions)
      _accelSub = accelerometerEvents.listen((e) {
        if (!mounted) return;
        setState(() => _liveAccel = e);
        _accelS.add(e);
      });

      // ---- Compass (optional, can be null or error)
      final compassStream = FlutterCompass.events;
      if (compassStream == null) {
        _compassSupported = false;
        _compassNote = "No magnetometer (compass) on this device";
      } else {
        _compassSub = compassStream.listen(
          (e) {
            final h = e.heading;
            if (h == null) {
              if (!mounted) return;
              setState(() {
                _liveHeading = null;
                _compassSupported = false;
                _compassNote = "Compass not recognized";
              });
              return;
            }
            if (!mounted) return;
            setState(() {
              _liveHeading = h;
              _compassSupported = true;
              _compassNote = null;
            });
            _headingS.add(h);
          },
          onError: (_) {
            if (!mounted) return;
            setState(() {
              _liveHeading = null;
              _compassSupported = false;
              _compassNote = "Compass not recognized";
            });
          },
        );
      }

      // ---- Pressure stream (only if supported)
      if (_pressureSupported) {
        _pressureSub = _pressureSvc.stream().listen((p) {
          if (!mounted) return;
          setState(() => _livePressure = p);
          _pressureS.add(p);
        });
      }

      // ---- GPS sampling (don’t crash whole run if one second fails)
      for (int i = 0; i < 30; i++) {
        try {
          final pos = await _getPos();
          if (!mounted) return;

          setState(() {
            _liveLat = pos.latitude;
            _liveLng = pos.longitude;
            _liveAcc = pos.accuracy;
            _secondsLeft = 29 - i;
          });

          _latS.add(pos.latitude);
          _lngS.add(pos.longitude);
          _accS.add(pos.accuracy);
        } catch (_) {
          // skip this second if GPS struggling
          if (!mounted) return;
          setState(() => _secondsLeft = 29 - i);
        }

        await Future.delayed(const Duration(seconds: 1));
      }

      await _stopStreams();

      final lat = _median(_latS);
      final lng = _median(_lngS);
      final acc = _median(_accS);

      final headingAvg = _avg(_headingS);
      double headingVar = double.nan;
      if (_headingS.isNotEmpty) {
        final mean = headingAvg;
        headingVar =
            _headingS
                .map((x) => pow(x - mean, 2).toDouble())
                .reduce((a, b) => a + b) /
            _headingS.length;
      }

      final accelAvg = _accelAvg(_accelS);

      final floor = int.tryParse(_floorCtrl.text.trim()) ?? 0;
      final placeId = _placeIdCtrl.text.trim();
      final building = _buildingCtrl.text.trim();

      Map<String, dynamic> pressureJson() {
        if (!_pressureSupported) {
          return {
            "supported": false,
            "note": _pressureNote ?? "No barometer sensor",
          };
        }
        if (_pressureS.isEmpty) return {"supported": true, "samples": 0};
        final avg = _avg(_pressureS);
        final med = _median(_pressureS);
        final minV = _pressureS.reduce(min);
        final maxV = _pressureS.reduce(max);
        return {
          "supported": true,
          "avg_hPa": double.parse(avg.toStringAsFixed(2)),
          "median_hPa": double.parse(med.toStringAsFixed(2)),
          "min_hPa": double.parse(minV.toStringAsFixed(2)),
          "max_hPa": double.parse(maxV.toStringAsFixed(2)),
          "samples": _pressureS.length,
        };
      }

      final rec = CalibrationRecord(
        id: "${placeId}_F${floor}_${DateTime.now().millisecondsSinceEpoch}",
        placeId: placeId,
        placeType: _placeType,
        building: building,
        floor: floor,
        capturedAt: DateTime.now(),
        lat: lat,
        lng: lng,
        accuracyM: acc,
        sensors: {
          "wifi": _liveWifi ?? {"supported": false},
          "headingDeg": (!_compassSupported || _headingS.isEmpty)
              ? {
                  "supported": false,
                  "note": _compassNote ?? "Compass not recognized",
                }
              : {
                  "supported": true,
                  "avg": double.parse(headingAvg.toStringAsFixed(1)),
                  "variance": double.parse(headingVar.toStringAsFixed(2)),
                  "samples": _headingS.length,
                },
          "accel": {
            "avg": {
              "x": double.parse(accelAvg["x"]!.toStringAsFixed(3)),
              "y": double.parse(accelAvg["y"]!.toStringAsFixed(3)),
              "z": double.parse(accelAvg["z"]!.toStringAsFixed(3)),
            },
            "samples": _accelS.length,
          },
          "pressure": pressureJson(),
        },
      );

      if (!mounted) return;

      final saved = await _showReviewSheet(rec);
      if (saved == true) {
        setState(() {
          _saved.insert(0, rec);
          _selectedIds.clear();
        });
        await _saveToDisk();
        if (!mounted) return;
        _toast("Saved calibration ✅", success: true);
      } else {
        _toast("Discarded. You can try again 💫", success: false);
      }
    } catch (e) {
      await _stopStreams();
      if (!mounted) return;
      _toast("Oops… $e", success: false);
    } finally {
      if (!mounted) return;
      setState(() {
        _running = false;
        _secondsLeft = 0;
      });
    }
  }

  // ---------- Review sheet ----------
  Future<bool?> _showReviewSheet(CalibrationRecord rec) {
    final jsonPretty = const JsonEncoder.withIndent("  ").convert(rec.toJson());

    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.72,
          minChildSize: 0.35,
          maxChildSize: 0.92,
          builder: (_, controller) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Review calibration",
                    style: Theme.of(ctx).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _chip(ctx, rec.placeType),
                      _chip(ctx, "F${rec.floor}"),
                      _chip(ctx, rec.building),
                      _chip(ctx, "±${rec.accuracyM.toStringAsFixed(1)}m"),
                      _chip(ctx, (_wifiOk ? "WiFi OK" : "WiFi?")),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Theme.of(
                          ctx,
                        ).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: SingleChildScrollView(
                        controller: controller,
                        child: SelectableText(
                          jsonPretty,
                          style: const TextStyle(fontFamily: "monospace"),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.pop(ctx, false),
                          icon: const Icon(Icons.delete_outline),
                          label: const Text("Discard"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => Navigator.pop(ctx, true),
                          icon: const Icon(Icons.save),
                          label: const Text("Save"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _chip(BuildContext context, String text) {
    return Chip(label: Text(text), visualDensity: VisualDensity.compact);
  }

  // ---------- Export ----------
  List<CalibrationRecord> get _filteredSaved {
    if (_filterType == "ALL") return _saved;
    return _saved.where((e) => e.placeType == _filterType).toList();
  }

  Future<void> _exportSelected() async {
    if (_saved.isEmpty) return;

    final items = _selectedIds.isEmpty
        ? _saved
        : _saved.where((e) => _selectedIds.contains(e.id)).toList();

    final payload = {
      "campus": "SLIIT",
      "exportedAt": DateTime.now().toIso8601String(),
      "calibrations": items.map((e) => e.toJson()).toList(),
    };

    final dir = await getApplicationDocumentsDirectory();
    final file = File("${dir.path}/campus_calibrations_export.json");
    await file.writeAsString(
      const JsonEncoder.withIndent("  ").convert(payload),
    );

    await Share.shareXFiles([
      XFile(file.path),
    ], text: "Campus calibration export (${items.length} points)");
  }

  // ---------- UI helpers ----------
  Widget _telemetryTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String value,
    Color? tone,
  }) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE6ECF4)),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: (tone ?? cs.primary).withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: tone ?? cs.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: cs.outline,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  softWrap: true,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _wifiLine() {
    final m = _liveWifi;
    if (m == null) return _wifiError ?? "WiFi: —";

    String safe(String k) => (m[k] ?? "—").toString();

    final ssid = safe("ssid");
    final ip = safe("ipAddress");
    final bssid = safe("bssid");
    final rssi = safe("rssi");
    final linkSpeed = safe("linkSpeedMbps");

    return "SSID: $ssid\nIP: $ip\nBSSID: $bssid\nRSSI: $rssi\nLink: $linkSpeed";
  }

  Widget _bigStartButton(BuildContext context) {
    return SizedBox(
      height: 62,
      child: FilledButton.icon(
        onPressed: _running ? null : _startCalibration,
        icon: _running
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.6,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.play_arrow_rounded),
        label: Text(
          _running ? "Calibrating… $_secondsLeft s" : "Start Calibration",
          style: const TextStyle(fontSize: 16),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: _primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final list = _filteredSaved;

    final accTone = _accTone(_liveAcc);
    final accText = "Accuracy: ${_accBadge(_liveAcc)}";

    final headingText = (!_compassSupported)
        ? (_compassNote ?? "Compass not recognized")
        : (_liveHeading == null
              ? "Not recognized"
              : "${_liveHeading!.toStringAsFixed(1)}°");

    final pressureText = (!_pressureSupported)
        ? (_pressureNote ?? "No barometer sensor on this device")
        : (_livePressure == null
              ? "Waiting…"
              : "${_livePressure!.toStringAsFixed(2)} hPa");

    return Scaffold(
      appBar: AppBar(
        title: const Text("UniLocate Calibrator"),
        actions: [
          IconButton(
            tooltip: "Refresh WiFi",
            onPressed: _running ? null : _refreshWifi,
            icon: Icon(
              Icons.wifi_rounded,
              color: _wifiOk ? Colors.green : cs.outline,
            ),
          ),
          IconButton(
            tooltip: "Export selected / all",
            onPressed: _saved.isEmpty ? null : _exportSelected,
            icon: const Icon(Icons.ios_share_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 110),
        children: [
          // Hero
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_primary.withOpacity(0.10), _accent.withOpacity(0.10)],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE6ECF4)),
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: _accent.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.radar_rounded, color: _accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Calibration tool",
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: _primary,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Capture stable coordinates + sensor signature and export JSON.",
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.outline,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Big start button
          _bigStartButton(context),

          const SizedBox(height: 14),

          // WiFi card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        "WiFi status",
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const Spacer(),
                      Chip(
                        label: Text(_wifiOk ? "Connected" : "Required"),
                        labelStyle: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: _wifiOk ? const Color(0xFF053668) : cs.error,
                        ),
                        backgroundColor: _wifiOk
                            ? const Color(0xFF053668).withOpacity(0.08)
                            : cs.error.withOpacity(0.08),
                        side: BorderSide(
                          color: _wifiOk ? const Color(0xFF053668) : cs.error,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.wifi_rounded,
                    title: "Connected WiFi details",
                    value: _wifiLine(),
                    tone: _wifiOk ? Colors.green : Colors.red,
                  ),
                  if (_wifiError != null) ...[
                    const SizedBox(height: 8),
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

          const SizedBox(height: 14),

          // Form
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Location details",
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 520;
                        final half = isNarrow
                            ? constraints.maxWidth
                            : (constraints.maxWidth - 12) / 2;

                        return Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            SizedBox(
                              width: half,
                              child: TextFormField(
                                controller: _placeIdCtrl,
                                enabled: !_running,
                                decoration: const InputDecoration(
                                  labelText: "Place ID",
                                  hintText: "e.g., G1104",
                                  prefixIcon: Icon(Icons.tag_rounded),
                                ),
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty)
                                    ? "Required"
                                    : null,
                              ),
                            ),
                            SizedBox(
                              width: half,
                              child: TextFormField(
                                controller: _buildingCtrl,
                                enabled: !_running,
                                decoration: const InputDecoration(
                                  labelText: "Building",
                                  hintText: "e.g., G_BLOCK",
                                  prefixIcon: Icon(Icons.apartment_rounded),
                                ),
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty)
                                    ? "Required"
                                    : null,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 520;
                        final half = isNarrow
                            ? constraints.maxWidth
                            : (constraints.maxWidth - 12) / 2;

                        return Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            SizedBox(
                              width: half,
                              child: DropdownButtonFormField<String>(
                                value: _placeType,
                                decoration: const InputDecoration(
                                  labelText: "Place type",
                                  prefixIcon: Icon(Icons.category_rounded),
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: "LECTURE_HALL",
                                    child: Text("LECTURE_HALL"),
                                  ),
                                  DropdownMenuItem(
                                    value: "LAB",
                                    child: Text("LAB"),
                                  ),
                                  DropdownMenuItem(
                                    value: "LIBRARY",
                                    child: Text("LIBRARY"),
                                  ),
                                  DropdownMenuItem(
                                    value: "STUDY_AREA",
                                    child: Text("STUDY_AREA"),
                                  ),
                                  DropdownMenuItem(
                                    value: "LUNCH_AREA",
                                    child: Text("LUNCH_AREA"),
                                  ),
                                ],
                                onChanged: _running
                                    ? null
                                    : (v) => setState(
                                        () => _placeType = v ?? _placeType,
                                      ),
                              ),
                            ),
                            SizedBox(
                              width: half,
                              child: TextFormField(
                                controller: _floorCtrl,
                                enabled: !_running,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: "Floor",
                                  hintText: "e.g., 11",
                                  prefixIcon: Icon(Icons.stairs_rounded),
                                ),
                                validator: (v) {
                                  final n = int.tryParse((v ?? "").trim());
                                  if (n == null) return "Number";
                                  if (n < -5 || n > 60) return "Invalid";
                                  return null;
                                },
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Telemetry
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        "Live readings",
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const Spacer(),
                      Chip(
                        avatar: Icon(
                          Icons.gps_fixed_rounded,
                          size: 18,
                          color: accTone == Colors.grey
                              ? const Color(0xFF053668)
                              : accTone,
                        ),
                        label: Text(accText),
                        labelStyle: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: accTone == Colors.grey
                              ? const Color(0xFF053668)
                              : accTone,
                        ),
                        backgroundColor:
                            (accTone == Colors.grey
                                    ? const Color(0xFF053668)
                                    : accTone)
                                .withOpacity(0.10),
                        side: BorderSide(
                          color: accTone == Colors.grey
                              ? const Color(0xFF053668)
                              : accTone,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.public_rounded,
                    title: "Latitude / Longitude",
                    value:
                        "${_liveLat?.toStringAsFixed(6) ?? '—'} , ${_liveLng?.toStringAsFixed(6) ?? '—'}",
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.my_location_rounded,
                    title: "Accuracy",
                    value: _liveAcc == null
                        ? "—"
                        : "±${_liveAcc!.toStringAsFixed(1)} m",
                    tone: _accTone(_liveAcc),
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.explore_rounded,
                    title: "Heading (Compass)",
                    value: headingText,
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.speed_rounded,
                    title: "Acceleration",
                    value: _liveAccel == null
                        ? "—"
                        : "${_liveAccel!.x.toStringAsFixed(2)}, ${_liveAccel!.y.toStringAsFixed(2)}, ${_liveAccel!.z.toStringAsFixed(2)}",
                  ),
                  const SizedBox(height: 10),
                  _telemetryTile(
                    context,
                    icon: Icons.compress_rounded,
                    title: "Pressure (Barometer)",
                    value: pressureText,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Saved list header + filters
          Row(
            children: [
              Text(
                "Saved points",
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const Spacer(),
              DropdownButton<String>(
                value: _filterType,
                items: const [
                  DropdownMenuItem(value: "ALL", child: Text("ALL")),
                  DropdownMenuItem(value: "LECTURE_HALL", child: Text("HALL")),
                  DropdownMenuItem(value: "LAB", child: Text("LAB")),
                  DropdownMenuItem(value: "LIBRARY", child: Text("LIBRARY")),
                  DropdownMenuItem(value: "STUDY_AREA", child: Text("STUDY")),
                  DropdownMenuItem(value: "LUNCH_AREA", child: Text("LUNCH")),
                ],
                onChanged: (v) => setState(() => _filterType = v ?? "ALL"),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (list.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  "No saved points yet. Run calibration and save a point.",
                  style: TextStyle(
                    color: cs.outline,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            )
          else
            Card(
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: list.length,
                separatorBuilder: (_, __) =>
                    Divider(height: 1, color: cs.outlineVariant),
                itemBuilder: (_, i) {
                  final r = list[i];
                  final selected = _selectedIds.contains(r.id);

                  return ListTile(
                    onLongPress: () {
                      setState(() {
                        if (selected) {
                          _selectedIds.remove(r.id);
                        } else {
                          _selectedIds.add(r.id);
                        }
                      });
                    },
                    leading: CircleAvatar(
                      backgroundColor: _primary.withOpacity(0.12),
                      child: Icon(
                        r.placeType == "LAB"
                            ? Icons.computer_rounded
                            : r.placeType == "LIBRARY"
                            ? Icons.local_library_rounded
                            : r.placeType == "LUNCH_AREA"
                            ? Icons.restaurant_rounded
                            : r.placeType == "STUDY_AREA"
                            ? Icons.menu_book_rounded
                            : Icons.meeting_room_rounded,
                        color: _primary,
                      ),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            "${r.placeId}  •  F${r.floor}",
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                        if (selected)
                          Icon(Icons.check_circle_rounded, color: _accent),
                      ],
                    ),
                    subtitle: Text(
                      "${r.building} • ${r.placeType}\n"
                      "${r.lat.toStringAsFixed(6)}, ${r.lng.toStringAsFixed(6)} (±${r.accuracyM.toStringAsFixed(1)}m)",
                    ),
                    isThreeLine: true,
                    trailing: IconButton(
                      tooltip: "Share this point",
                      icon: const Icon(Icons.share_rounded),
                      onPressed: () async {
                        final txt = const JsonEncoder.withIndent(
                          "  ",
                        ).convert(r.toJson());
                        await Share.share(txt);
                      },
                    ),
                  );
                },
              ),
            ),
        ],
      ),

      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
          child: Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _running ? null : _startCalibration,
                  style: FilledButton.styleFrom(
                    backgroundColor: _primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(
                    _running
                        ? "Calibrating… $_secondsLeft s"
                        : "Start Calibration",
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
                tooltip: "Export selected / all",
                onPressed: _saved.isEmpty ? null : _exportSelected,
                icon: const Icon(Icons.ios_share_rounded),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

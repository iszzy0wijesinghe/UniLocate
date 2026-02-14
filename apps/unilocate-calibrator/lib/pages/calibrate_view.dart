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
import 'package:wakelock_plus/wakelock_plus.dart';

import '../services/pressure_service.dart';
import '../services/wifi_service.dart';
import '../ui/app_theme.dart';

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

class CalibrateView extends StatefulWidget {
  const CalibrateView({super.key});

  @override
  State<CalibrateView> createState() => _CalibrateViewState();
}

class _CalibrateViewState extends State<CalibrateView> {
  // Form
  final _formKey = GlobalKey<FormState>();
  final _placeIdCtrl = TextEditingController(text: "G1104");
  final _buildingCtrl = TextEditingController(text: "G_BLOCK");
  final _floorCtrl = TextEditingController(text: "11");
  String _placeType = "LECTURE_HALL";

  // Running
  bool _running = false;
  int _secondsLeft = 0;

  // Preflight (auto start)
  bool _preflighting = true;
  String _preflightMsg = "Checking campus WiFi…";

  // Optional sensor support flags + messages
  bool _compassSupported = true;
  String? _compassNote;

  // Live readings
  double? _liveLat, _liveLng, _liveAcc, _liveHeading;
  AccelerometerEvent? _liveAccel;

  // Live display strings (FIX: used in build)
  String _headingText = "—";
  String _pressureText = "—";

  // Pressure
  final _pressureSvc = PressureService();
  StreamSubscription<double>? _pressureSub;
  double? _livePressure;
  bool _pressureSupported = false;
  String? _pressureNote;

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

  // Storage
  List<CalibrationRecord> _saved = [];

  @override
  void initState() {
    super.initState();
    _loadSaved();
    _refreshWifi();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoPreflightOnly();
    });
  }

  @override
  void dispose() {
    _placeIdCtrl.dispose();
    _buildingCtrl.dispose();
    _floorCtrl.dispose();
    _stopStreams();
    super.dispose();
  }

  // ---------- Nice snackbar ----------
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

  // ---------- File ----------
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

    if (!mounted) return;
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
      final ok = await _wifiSvc.isWifiConnected(details);
      if (!mounted) return;

      setState(() {
        _liveWifi = details;
        _wifiOk = ok;
        _wifiError = ok ? null : "Not on campus WiFi (SSID missing).";
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
    await Permission.location.request();
    final status = await Permission.location.status;
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

  Future<void> _autoPreflightOnly() async {
    setState(() {
      _preflighting = true;
      _preflightMsg = "Checking campus WiFi…";
    });

    try {
      await _refreshWifi();
      if (!_wifiOk) throw Exception(_wifiError ?? "WiFi required");

      setState(() => _preflightMsg = "Checking GPS & permissions…");
      await _ensurePermissions();

      setState(() => _preflightMsg = "Warming up sensors…");
      try {
        _pressureSupported = await _pressureSvc.isSupported();
        _pressureNote = _pressureSupported
            ? null
            : "No barometer sensor on this device";
      } catch (_) {
        _pressureSupported = false;
        _pressureNote = "No barometer sensor on this device";
      }

      if (!mounted) return;
      setState(() {
        _preflighting = false;
        _preflightMsg = "Ready ✅";
        // show current state text (optional)
        _pressureText = !_pressureSupported
            ? (_pressureNote ?? "No barometer sensor")
            : (_livePressure == null
                  ? "Waiting…"
                  : "${_livePressure!.toStringAsFixed(2)} hPa");
        _headingText = "—";
      });

      _toast("Ready! Fill details and press Start ✨", success: true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _preflighting = false;
        _preflightMsg = "Can’t continue";
      });
      _toast("Can’t start: $e", success: false);
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

  Future<void> _stopStreams() async {
    await _accelSub?.cancel();
    _accelSub = null;
    await _compassSub?.cancel();
    _compassSub = null;
    await _pressureSub?.cancel();
    _pressureSub = null;
  }

  // ---------- Duplicate check ----------
  int _findDuplicateIndex({
    required String placeId,
    required String building,
    required int floor,
    required String placeType,
  }) {
    return _saved.indexWhere(
      (r) =>
          r.placeId == placeId &&
          r.building == building &&
          r.floor == floor &&
          r.placeType == placeType,
    );
  }

  Future<bool> _confirmOverride() async {
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Already saved"),
        content: const Text(
          "This location already exists.\nOverride saved data?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("No"),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Override"),
          ),
        ],
      ),
    );
    return res ?? false;
  }

  // ---------- Accuracy badge ----------
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

  // ---------- Calibration ----------
  Future<void> _startCalibration() async {
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) {
      _toast("Please fill required fields", success: false);
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

      // reset live
      _livePressure = null;
      _liveHeading = null;
      _headingText = "—";
      _pressureText = "—";
    });

    try {
      await _ensurePermissions();

      // Pressure support (SAFE)
      try {
        _pressureSupported = await _pressureSvc.isSupported();
        _pressureNote = _pressureSupported
            ? null
            : "No barometer sensor on this device";
      } catch (_) {
        _pressureSupported = false;
        _pressureNote = "No barometer sensor on this device";
      }

      // Accelerometer
      _accelSub = accelerometerEvents.listen((e) {
        if (!mounted) return;
        setState(() => _liveAccel = e);
        _accelS.add(e);
      });

      // Compass (SAFE + optional)
      _compassSupported = true;
      _compassNote = null;

      final compassStream = FlutterCompass.events;
      if (compassStream == null) {
        _compassSupported = false;
        _compassNote = "No magnetometer (compass) on this device";
        if (!mounted) return;
        setState(() {
          _liveHeading = null;
          _headingText = _compassNote!;
        });
      } else {
        _compassSub = compassStream.listen(
          (e) {
            final h = e.heading;
            if (!mounted) return;

            if (h == null) {
              setState(() {
                _liveHeading = null;
                _compassSupported = false;
                _compassNote = "Compass not recognized";
                _headingText = _compassNote!;
              });
              return;
            }

            setState(() {
              _liveHeading = h;
              _compassSupported = true;
              _compassNote = null;
              _headingText = "${h.toStringAsFixed(1)}°";
            });
            _headingS.add(h);
          },
          onError: (_) {
            if (!mounted) return;
            setState(() {
              _liveHeading = null;
              _compassSupported = false;
              _compassNote = "Compass not recognized";
              _headingText = _compassNote!;
            });
          },
        );
      }

      // Pressure stream (optional)
      if (_pressureSupported) {
        _pressureSub = _pressureSvc.stream().listen(
          (p) {
            if (!mounted) return;
            setState(() {
              _livePressure = p;
              _pressureText = "${p.toStringAsFixed(2)} hPa";
            });
            _pressureS.add(p);
          },
          onError: (_) {
            if (!mounted) return;
            setState(() {
              _pressureSupported = false;
              _pressureNote = "No barometer sensor on this device";
              _livePressure = null;
              _pressureText = _pressureNote!;
            });
          },
        );
      } else {
        if (!mounted) return;
        setState(() {
          _pressureText = _pressureNote ?? "No barometer sensor on this device";
        });
      }

      // GPS sampling (SAFE: skip failing seconds)
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
          if (!mounted) return;
          setState(() {
            _secondsLeft = 29 - i;
          });
        }

        await Future.delayed(const Duration(seconds: 1));
      }

      await _stopStreams();

      // Guard: if GPS completely failed
      if (_latS.isEmpty || _lngS.isEmpty || _accS.isEmpty) {
        throw Exception("GPS signal is too weak. Try again near a window.");
      }

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
        if (!_pressureSupported)
          return {
            "supported": false,
            "note": _pressureNote ?? "No barometer sensor",
          };
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
          "pressure": (!_pressureSupported)
              ? {
                  "supported": false,
                  "note": _pressureNote ?? "No barometer sensor",
                }
              : pressureJson(),
        },
      );

      if (!mounted) return;

      final shouldSave = await _showReviewSheet(rec);
      if (shouldSave != true) {
        _toast("Discarded. You can try again 💫", success: false);
        return;
      }

      final dupIndex = _findDuplicateIndex(
        placeId: rec.placeId,
        building: rec.building,
        floor: rec.floor,
        placeType: rec.placeType,
      );

      if (dupIndex >= 0) {
        final override = await _confirmOverride();
        if (!override) {
          _toast("Kept existing saved record ✅");
          return;
        }
        setState(() => _saved[dupIndex] = rec);
      } else {
        setState(() => _saved.insert(0, rec));
      }

      await _saveToDisk();
      if (!mounted) return;
      _toast("Saved! This spot is now calibrated ✨", success: true);
      Navigator.pop(context);
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

  // ---------- Review preview ----------
  Future<bool?> _showReviewSheet(CalibrationRecord rec) {
    final cs = Theme.of(context).colorScheme;

    String wifiShort() {
      final w = rec.sensors["wifi"];
      if (w is Map) {
        final ssid = (w["ssid"] ?? "—").toString();
        final bssid = (w["bssid"] ?? "—").toString();
        return "$ssid • $bssid";
      }
      return "—";
    }

    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            16,
            16 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Preview report",
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
              ),
              const SizedBox(height: 10),
              Card(
                color: cs.surfaceContainerHighest,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${rec.placeId} • F${rec.floor}",
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: AppTheme.brandBlue,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "${rec.building} • ${rec.placeType}",
                        style: TextStyle(
                          color: cs.outline,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Divider(height: 20),
                      _kv("Accuracy", "±${rec.accuracyM.toStringAsFixed(1)} m"),
                      _kv(
                        "GPS",
                        "${rec.lat.toStringAsFixed(6)}, ${rec.lng.toStringAsFixed(6)}",
                      ),
                      _kv("WiFi", wifiShort()),
                      _kv("Captured", rec.capturedAt.toLocal().toString()),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(ctx, false),
                      icon: const Icon(Icons.close_rounded),
                      label: const Text("Discard"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => Navigator.pop(ctx, true),
                      icon: const Icon(Icons.save_rounded),
                      label: const Text("Save"),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  static Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(k, style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  // ---------- UI ----------
  String _wifiLine() {
    final m = _liveWifi;
    if (m == null) return _wifiError ?? "WiFi: —";
    final ssid = (m["ssid"] ?? "—").toString();
    final ip = (m["ipAddress"] ?? "—").toString();
    final bssid = (m["bssid"] ?? "—").toString();
    return "SSID: $ssid\nIP: $ip\nBSSID: $bssid";
  }

  Widget _tile({
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
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: (tone ?? AppTheme.brandBlue).withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: tone ?? AppTheme.brandBlue),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: cs.outline,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final progress = _running ? (30 - _secondsLeft) / 30.0 : 0.0;
    final accTone = _accTone(_liveAcc);
    final accText = "Accuracy: ${_accBadge(_liveAcc)}";

    return Scaffold(
      appBar: AppBar(
        title: const Text("Calibration"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _running || _preflighting
              ? null
              : () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            children: [
              // WiFi card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.wifi_rounded),
                          const SizedBox(width: 8),
                          const Text(
                            "WiFi Status",
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                            ),
                          ),
                          const Spacer(),
                          Chip(
                            avatar: Icon(
                              _wifiOk
                                  ? Icons.check_circle_rounded
                                  : Icons.warning_rounded,
                              size: 18,
                              color: _wifiOk
                                  ? const Color(0xFF053668)
                                  : cs.error,
                            ),
                            label: Text(_wifiOk ? "Connected" : "Required"),
                            labelStyle: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: _wifiOk
                                  ? const Color(0xFF053668)
                                  : cs.error,
                            ),
                            backgroundColor: _wifiOk
                                ? const Color(0xFF053668).withOpacity(0.08)
                                : cs.error.withOpacity(0.08),
                            side: BorderSide(
                              color: _wifiOk
                                  ? const Color(0xFF053668)
                                  : cs.error,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _wifiOk
                              ? AppTheme.brandBlue.withOpacity(0.08)
                              : cs.error.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _wifiOk
                                ? AppTheme.brandBlue.withOpacity(0.25)
                                : cs.error.withOpacity(0.25),
                          ),
                        ),
                        child: Text(
                          _wifiLine(),
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: _wifiOk ? const Color(0xFF0F172A) : cs.error,
                            height: 1.3,
                          ),
                        ),
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

              const SizedBox(height: 12),

              // Form
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Location details",
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _placeIdCtrl,
                          enabled: !_running && !_preflighting,
                          decoration: const InputDecoration(
                            labelText: "Place ID",
                            prefixIcon: Icon(Icons.tag_rounded),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? "Required"
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _buildingCtrl,
                          enabled: !_running && !_preflighting,
                          decoration: const InputDecoration(
                            labelText: "Building",
                            prefixIcon: Icon(Icons.apartment_rounded),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? "Required"
                              : null,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                isExpanded: true,
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
                                onChanged: (_running || _preflighting)
                                    ? null
                                    : (v) => setState(
                                        () => _placeType = v ?? _placeType,
                                      ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            SizedBox(
                              width: 110,
                              child: TextFormField(
                                controller: _floorCtrl,
                                enabled: !_running && !_preflighting,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: "Floor",
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
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Start card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Start",
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton.icon(
                        onPressed: (_running || _preflighting)
                            ? null
                            : () async {
                                final ok =
                                    _formKey.currentState?.validate() ?? false;
                                if (!ok) {
                                  _toast(
                                    "Please fill required fields ✍️",
                                    success: false,
                                  );
                                  return;
                                }

                                setState(() {
                                  _preflighting = true;
                                  _preflightMsg = "Final checks…";
                                });

                                try {
                                  await _refreshWifi();
                                  if (!_wifiOk)
                                    throw Exception(
                                      _wifiError ?? "WiFi required",
                                    );
                                  await _ensurePermissions();

                                  if (!mounted) return;
                                  setState(() => _preflighting = false);

                                  await WakelockPlus.enable();
                                  await _startCalibration();
                                } catch (e) {
                                  if (!mounted) return;
                                  setState(() => _preflighting = false);
                                  _toast("Can’t start: $e", success: false);
                                } finally {
                                  await WakelockPlus.disable();
                                }
                              },
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text("Start Calibration (30s)"),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Tip: hold your phone steady for best accuracy.",
                        style: TextStyle(
                          color: cs.outline,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Progress + accuracy
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            "Live status",
                            style: TextStyle(fontWeight: FontWeight.w900),
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
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: _running ? progress : null,
                          minHeight: 8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _running
                            ? "Sampling… $_secondsLeft seconds left"
                            : "Ready. You can see live calibration when start.",
                        style: TextStyle(
                          color: cs.outline,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Live telemetry
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Live readings",
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _tile(
                        icon: Icons.public,
                        title: "Latitude / Longitude",
                        value:
                            "${_liveLat?.toStringAsFixed(6) ?? "—"} , ${_liveLng?.toStringAsFixed(6) ?? "—"}",
                      ),
                      const SizedBox(height: 10),
                      _tile(
                        icon: Icons.my_location_rounded,
                        title: "Accuracy",
                        value: _liveAcc == null
                            ? "—"
                            : "±${_liveAcc!.toStringAsFixed(1)} m",
                        tone: _accTone(_liveAcc),
                      ),
                      const SizedBox(height: 10),
                      _tile(
                        icon: Icons.explore_rounded,
                        title: "Heading (Compass)",
                        value: _headingText,
                      ),
                      const SizedBox(height: 10),
                      _tile(
                        icon: Icons.speed_rounded,
                        title: "Acceleration",
                        value: _liveAccel == null
                            ? "—"
                            : "${_liveAccel!.x.toStringAsFixed(2)}, ${_liveAccel!.y.toStringAsFixed(2)}, ${_liveAccel!.z.toStringAsFixed(2)}",
                      ),
                      const SizedBox(height: 10),
                      _tile(
                        icon: Icons.compress_rounded,
                        title: "Pressure (Barometer)",
                        value: _pressureText,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Preflight overlay
          if (_preflighting)
            Container(
              color: Colors.white.withOpacity(0.92),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            width: 26,
                            height: 26,
                            child: CircularProgressIndicator(strokeWidth: 3),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            _preflightMsg,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Just a moment… we’re preparing a clean calibration ✨",
                            textAlign: TextAlign.center,
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// import 'dart:async';
// import 'dart:convert';
// import 'dart:io';
// import 'dart:math';

// import 'package:flutter/material.dart';
// import 'package:geolocator/geolocator.dart';
// import 'package:permission_handler/permission_handler.dart';
// import 'package:sensors_plus/sensors_plus.dart';
// import 'package:flutter_compass/flutter_compass.dart';
// import 'package:path_provider/path_provider.dart';
// import 'package:wakelock_plus/wakelock_plus.dart';

// import '../services/pressure_service.dart';
// import '../services/wifi_service.dart';
// import '../ui/app_theme.dart';

// class CalibrationRecord {
//   final String id;
//   final String placeId;
//   final String placeType;
//   final String building;
//   final int floor;
//   final DateTime capturedAt;
//   final double lat;
//   final double lng;
//   final double accuracyM;
//   final Map<String, dynamic> sensors;

//   CalibrationRecord({
//     required this.id,
//     required this.placeId,
//     required this.placeType,
//     required this.building,
//     required this.floor,
//     required this.capturedAt,
//     required this.lat,
//     required this.lng,
//     required this.accuracyM,
//     required this.sensors,
//   });

//   Map<String, dynamic> toJson() => {
//     "id": id,
//     "placeId": placeId,
//     "placeType": placeType,
//     "building": building,
//     "floor": floor,
//     "capturedAt": capturedAt.toIso8601String(),
//     "geo": {"lat": lat, "lng": lng, "accuracyM": accuracyM},
//     "sensors": sensors,
//   };
// }

// class CalibrateView extends StatefulWidget {
//   const CalibrateView({super.key});

//   @override
//   State<CalibrateView> createState() => _CalibrateViewState();
// }

// class _CalibrateViewState extends State<CalibrateView> {
//   // Form
//   final _formKey = GlobalKey<FormState>();
//   final _placeIdCtrl = TextEditingController(text: "G1104");
//   final _buildingCtrl = TextEditingController(text: "G_BLOCK");
//   final _floorCtrl = TextEditingController(text: "11");
//   String _placeType = "LECTURE_HALL";

//   // Running
//   bool _running = false;
//   int _secondsLeft = 0;

//   // Preflight (auto start)
//   bool _preflighting = true;
//   String _preflightMsg = "Checking campus WiFi…";

//   // Optional sensor support flags + messages
//   bool _compassSupported = true;
//   String? _compassNote;

//   // Live readings
//   double? _liveLat, _liveLng, _liveAcc, _liveHeading;
//   AccelerometerEvent? _liveAccel;

//   // Pressure
//   final _pressureSvc = PressureService();
//   StreamSubscription<double>? _pressureSub;
//   double? _livePressure;
//   bool _pressureSupported = false;
//   String? _pressureNote;

//   // WiFi
//   final _wifiSvc = WifiService();
//   Map<String, dynamic>? _liveWifi;
//   bool _wifiOk = false;
//   String? _wifiError;

//   // Samples
//   final List<double> _latS = [];
//   final List<double> _lngS = [];
//   final List<double> _accS = [];
//   final List<double> _headingS = [];
//   final List<AccelerometerEvent> _accelS = [];
//   final List<double> _pressureS = [];

//   StreamSubscription<AccelerometerEvent>? _accelSub;
//   StreamSubscription? _compassSub;

//   // Storage
//   List<CalibrationRecord> _saved = [];

//   @override
//   void initState() {
//     super.initState();
//     _loadSaved();
//     _refreshWifi();

//     // Auto preflight + auto start
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       _autoPreflightOnly();
//     });
//   }

//   @override
//   void dispose() {
//     _placeIdCtrl.dispose();
//     _buildingCtrl.dispose();
//     _floorCtrl.dispose();
//     _stopStreams();
//     super.dispose();
//   }

//   // ---------- Nice snackbar ----------
//   void _toast(String message, {bool success = true}) {
//     final cs = Theme.of(context).colorScheme;
//     final bg = success ? const Color(0xFF0EA5E9) : cs.error;
//     final icon = success ? Icons.check_circle_rounded : Icons.error_rounded;

//     ScaffoldMessenger.of(context).clearSnackBars();
//     ScaffoldMessenger.of(context).showSnackBar(
//       SnackBar(
//         backgroundColor: bg,
//         behavior: SnackBarBehavior.floating,
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//         content: Row(
//           children: [
//             Icon(icon, color: Colors.white),
//             const SizedBox(width: 10),
//             Expanded(
//               child: Text(
//                 message,
//                 style: const TextStyle(fontWeight: FontWeight.w800),
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }

//   // ---------- File ----------
//   Future<File> _getLocalFile() async {
//     final dir = await getApplicationDocumentsDirectory();
//     return File("${dir.path}/campus_calibrations.json");
//   }

//   Future<void> _loadSaved() async {
//     final file = await _getLocalFile();
//     if (!await file.exists()) return;

//     final txt = await file.readAsString();
//     final decoded = jsonDecode(txt);
//     final list = (decoded["calibrations"] as List).cast<Map<String, dynamic>>();

//     setState(() {
//       _saved = list.map((m) {
//         return CalibrationRecord(
//           id: m["id"],
//           placeId: m["placeId"],
//           placeType: m["placeType"],
//           building: m["building"],
//           floor: m["floor"],
//           capturedAt: DateTime.parse(m["capturedAt"]),
//           lat: (m["geo"]["lat"] as num).toDouble(),
//           lng: (m["geo"]["lng"] as num).toDouble(),
//           accuracyM: (m["geo"]["accuracyM"] as num).toDouble(),
//           sensors: (m["sensors"] as Map).cast<String, dynamic>(),
//         );
//       }).toList();
//     });
//   }

//   Future<void> _saveToDisk() async {
//     final file = await _getLocalFile();
//     final payload = {
//       "campus": "SLIIT",
//       "exportedAt": DateTime.now().toIso8601String(),
//       "calibrations": _saved.map((e) => e.toJson()).toList(),
//     };
//     await file.writeAsString(
//       const JsonEncoder.withIndent("  ").convert(payload),
//     );
//   }

//   // ---------- WiFi ----------
//   Future<void> _refreshWifi() async {
//     try {
//       final details = await _wifiSvc.getWifiDetails();
//       final ok = await _wifiSvc.isWifiConnected(details);
//       if (!mounted) return;

//       setState(() {
//         _liveWifi = details;
//         _wifiOk = ok;
//         _wifiError = ok ? null : "Not on campus WiFi (SSID missing).";
//       });
//     } catch (e) {
//       if (!mounted) return;
//       setState(() {
//         _liveWifi = null;
//         _wifiOk = false;
//         _wifiError = "WiFi info error: $e";
//       });
//     }
//   }

//   // ---------- Permissions ----------
//   Future<void> _ensurePermissions() async {
//     await Permission.location.request();
//     final status = await Permission.location.status;
//     if (!status.isGranted) throw Exception("Location permission denied");

//     final enabled = await Geolocator.isLocationServiceEnabled();
//     if (!enabled) throw Exception("Location Services are OFF");
//   }

//   // Future<Position> _getPos() async {
//   //   return Geolocator.getCurrentPosition(
//   //     desiredAccuracy: LocationAccuracy.bestForNavigation,
//   //     timeLimit: const Duration(seconds: 6),
//   //   );
//   // }

//   Future<Position> _getPos() async {
//     try {
//       return await Geolocator.getCurrentPosition(
//         desiredAccuracy: LocationAccuracy.bestForNavigation,
//         timeLimit: const Duration(seconds: 6),
//       );
//     } on TimeoutException {
//       // fallback: still get something (slower accuracy)
//       return await Geolocator.getCurrentPosition(
//         desiredAccuracy: LocationAccuracy.high,
//       );
//     }
//   }

//   Future<void> _autoPreflightOnly() async {
//     setState(() {
//       _preflighting = true;
//       _preflightMsg = "Checking campus WiFi…";
//     });

//     try {
//       await _refreshWifi();
//       if (!_wifiOk) throw Exception(_wifiError ?? "WiFi required");

//       setState(() => _preflightMsg = "Checking GPS & permissions…");
//       await _ensurePermissions();

//       setState(() => _preflightMsg = "Warming up sensors…");
//       // _pressureSupported = await _pressureSvc.isSupported();
//       try {
//         _pressureSupported = await _pressureSvc.isSupported();
//         _pressureNote = _pressureSupported
//             ? null
//             : "No barometer sensor on this device";
//       } catch (_) {
//         _pressureSupported = false;
//         _pressureNote = "No barometer sensor on this device";
//       }

//       if (!mounted) return;
//       setState(() {
//         _preflighting = false;
//         _preflightMsg = "Ready ✅";
//       });

//       _toast("Ready! Fill details and press Start ✨", success: true);
//     } catch (e) {
//       if (!mounted) return;
//       setState(() {
//         _preflighting = false;
//         _preflightMsg = "Can’t continue";
//       });
//       _toast("Can’t start: $e", success: false);
//     }
//   }

//   // ---------- Stats ----------
//   double _median(List<double> values) {
//     if (values.isEmpty) return double.nan;
//     final sorted = [...values]..sort();
//     final mid = sorted.length ~/ 2;
//     if (sorted.length.isOdd) return sorted[mid];
//     return (sorted[mid - 1] + sorted[mid]) / 2.0;
//   }

//   double _avg(List<double> values) {
//     if (values.isEmpty) return double.nan;
//     return values.reduce((a, b) => a + b) / values.length;
//   }

//   Map<String, double> _accelAvg(List<AccelerometerEvent> list) {
//     if (list.isEmpty)
//       return {"x": double.nan, "y": double.nan, "z": double.nan};
//     double sx = 0, sy = 0, sz = 0;
//     for (final e in list) {
//       sx += e.x;
//       sy += e.y;
//       sz += e.z;
//     }
//     return {
//       "x": sx / list.length,
//       "y": sy / list.length,
//       "z": sz / list.length,
//     };
//   }

//   Future<void> _stopStreams() async {
//     await _accelSub?.cancel();
//     _accelSub = null;
//     await _compassSub?.cancel();
//     _compassSub = null;
//     await _pressureSub?.cancel();
//     _pressureSub = null;
//   }

//   // ---------- Duplicate check ----------
//   int _findDuplicateIndex({
//     required String placeId,
//     required String building,
//     required int floor,
//     required String placeType,
//   }) {
//     return _saved.indexWhere(
//       (r) =>
//           r.placeId == placeId &&
//           r.building == building &&
//           r.floor == floor &&
//           r.placeType == placeType,
//     );
//   }

//   Future<bool> _confirmOverride() async {
//     final res = await showDialog<bool>(
//       context: context,
//       builder: (ctx) => AlertDialog(
//         title: const Text("Already saved"),
//         content: const Text(
//           "This location already exists.\nOverride saved data?",
//         ),
//         actions: [
//           TextButton(
//             onPressed: () => Navigator.pop(ctx, false),
//             child: const Text("No"),
//           ),
//           FilledButton(
//             onPressed: () => Navigator.pop(ctx, true),
//             child: const Text("Override"),
//           ),
//         ],
//       ),
//     );
//     return res ?? false;
//   }

//   // ---------- Accuracy badge ----------
//   String _accBadge(double? acc) {
//     if (acc == null) return "—";
//     if (acc <= 10) return "Great";
//     if (acc <= 25) return "OK";
//     return "Weak";
//   }

//   Color _accTone(double? acc) {
//     if (acc == null) return Colors.grey;
//     if (acc <= 10) return Colors.green;
//     if (acc <= 25) return Colors.orange;
//     return Colors.red;
//   }

//   // ---------- Calibration ----------
//   Future<void> _startCalibration() async {
//     final ok = _formKey.currentState?.validate() ?? false;
//     if (!ok) {
//       _toast("Please fill required fields", success: false);
//       return;
//     }

//     // Require WiFi right before running
//     await _refreshWifi();
//     if (!_wifiOk) {
//       _toast(_wifiError ?? "WiFi required", success: false);
//       return;
//     }

//     setState(() {
//       _running = true;

//       _secondsLeft = 30;

//       _latS.clear();
//       _lngS.clear();
//       _accS.clear();
//       _headingS.clear();
//       _accelS.clear();

//       _pressureS.clear();
//       _livePressure = null;
//     });

//     try {
//       await _ensurePermissions();
//       _pressureSupported = await _pressureSvc.isSupported();

//       _accelSub = accelerometerEvents.listen((e) {
//         if (!mounted) return;
//         setState(() => _liveAccel = e);
//         _accelS.add(e);
//       });

//       // _compassSub = FlutterCompass.events?.listen((e) {
//       //   final h = e.heading;
//       //   if (h != null) {
//       //     if (!mounted) return;
//       //     setState(() => _liveHeading = h);
//       //     _headingS.add(h);
//       //   }
//       // });

//       _compassSupported = true;
//       _compassNote = null;

//       final compassStream = FlutterCompass.events;
//       if (compassStream == null) {
//         // Device/OS doesn't provide it
//         _compassSupported = false;
//         _compassNote = "No magnetometer (compass) on this device";
//       } else {
//         _compassSub = compassStream.listen(
//           (e) {
//             final h = e.heading;
//             // Some phones give null frequently → treat as not recognized, but don't crash
//             if (h == null) {
//               if (!mounted) return;
//               setState(() {
//                 _liveHeading = null;
//                 _compassSupported = false;
//                 _compassNote = "Compass not recognized";
//               });
//               return;
//             }

//             if (!mounted) return;
//             setState(() {
//               _liveHeading = h;
//               _compassSupported = true;
//               _compassNote = null;
//             });
//             _headingS.add(h);
//           },
//           onError: (err) {
//             if (!mounted) return;
//             setState(() {
//               _liveHeading = null;
//               _compassSupported = false;
//               _compassNote = "Compass not recognized";
//             });
//           },
//         );
//       }

//       if (_pressureSupported) {
//         _pressureSub = _pressureSvc.stream().listen((p) {
//           if (!mounted) return;
//           setState(() => _livePressure = p);
//           _pressureS.add(p);
//         });
//       }

//       for (int i = 0; i < 30; i++) {
//         final pos = await _getPos();
//         if (!mounted) return;

//         setState(() {
//           _liveLat = pos.latitude;
//           _liveLng = pos.longitude;
//           _liveAcc = pos.accuracy;
//           _secondsLeft = 29 - i;
//         });

//         _latS.add(pos.latitude);
//         _lngS.add(pos.longitude);
//         _accS.add(pos.accuracy);

//         await Future.delayed(const Duration(seconds: 1));
//       }

//       await _stopStreams();

//       final lat = _median(_latS);
//       final lng = _median(_lngS);
//       final acc = _median(_accS);

//       final headingAvg = _avg(_headingS);
//       double headingVar = double.nan;
//       if (_headingS.isNotEmpty) {
//         final mean = headingAvg;
//         headingVar =
//             _headingS
//                 .map((x) => pow(x - mean, 2).toDouble())
//                 .reduce((a, b) => a + b) /
//             _headingS.length;
//       }

//       final headingText = !_compassSupported
//           ? (_compassNote ?? "Compass not recognized")
//           : (_liveHeading == null
//                 ? "Not recognized"
//                 : "${_liveHeading!.toStringAsFixed(1)}°");

//       final pressureText = !_pressureSupported
//           ? (_pressureNote ?? "No barometer sensor on this device")
//           : (_livePressure == null
//                 ? "Waiting…"
//                 : "${_livePressure!.toStringAsFixed(2)} hPa");

//       final accelAvg = _accelAvg(_accelS);

//       final floor = int.tryParse(_floorCtrl.text.trim()) ?? 0;
//       final placeId = _placeIdCtrl.text.trim();
//       final building = _buildingCtrl.text.trim();

//       Map<String, dynamic> pressureJson() {
//         if (!_pressureSupported) return {"supported": false};
//         if (_pressureS.isEmpty) return {"supported": true, "samples": 0};
//         final avg = _avg(_pressureS);
//         final med = _median(_pressureS);
//         final minV = _pressureS.reduce(min);
//         final maxV = _pressureS.reduce(max);
//         return {
//           "supported": true,
//           "avg_hPa": double.parse(avg.toStringAsFixed(2)),
//           "median_hPa": double.parse(med.toStringAsFixed(2)),
//           "min_hPa": double.parse(minV.toStringAsFixed(2)),
//           "max_hPa": double.parse(maxV.toStringAsFixed(2)),
//           "samples": _pressureS.length,
//         };
//       }

//       final rec = CalibrationRecord(
//         id: "${placeId}_F${floor}_${DateTime.now().millisecondsSinceEpoch}",
//         placeId: placeId,
//         placeType: _placeType,
//         building: building,
//         floor: floor,
//         capturedAt: DateTime.now(),
//         lat: lat,
//         lng: lng,
//         accuracyM: acc,
//         sensors: {
//           "wifi": _liveWifi ?? {"supported": false},
//           // "headingDeg": _headingS.isEmpty
//           //     ? {"supported": false}
//           //     : {
//           //         "supported": true,
//           //         "avg": double.parse(headingAvg.toStringAsFixed(1)),
//           //         "variance": double.parse(headingVar.toStringAsFixed(2)),
//           //         "samples": _headingS.length,
//           //       },
//           "headingDeg": (!_compassSupported || _headingS.isEmpty)
//               ? {
//                   "supported": false,
//                   "note": _compassNote ?? "Compass not recognized",
//                 }
//               : {
//                   "supported": true,
//                   "avg": double.parse(headingAvg.toStringAsFixed(1)),
//                   "variance": double.parse(headingVar.toStringAsFixed(2)),
//                   "samples": _headingS.length,
//                 },
//           "accel": {
//             "avg": {
//               "x": double.parse(accelAvg["x"]!.toStringAsFixed(3)),
//               "y": double.parse(accelAvg["y"]!.toStringAsFixed(3)),
//               "z": double.parse(accelAvg["z"]!.toStringAsFixed(3)),
//             },
//             "samples": _accelS.length,
//           },
//           "pressure": (!_pressureSupported)
//               ? {
//                   "supported": false,
//                   "note": _pressureNote ?? "No barometer sensor",
//                 }
//               : pressureJson(),
//         },
//       );

//       if (!mounted) return;

//       final shouldSave = await _showReviewSheet(rec);
//       if (shouldSave != true) {
//         _toast("Discarded. You can try again 💫", success: false);
//         return;
//       }

//       final dupIndex = _findDuplicateIndex(
//         placeId: rec.placeId,
//         building: rec.building,
//         floor: rec.floor,
//         placeType: rec.placeType,
//       );

//       if (dupIndex >= 0) {
//         final override = await _confirmOverride();
//         if (!override) {
//           _toast("Kept existing saved record ✅");
//           return;
//         }
//         setState(() => _saved[dupIndex] = rec);
//       } else {
//         setState(() => _saved.insert(0, rec));
//       }

//       await _saveToDisk();
//       if (!mounted) return;
//       _toast("Saved! This spot is now calibrated ✨", success: true);
//       Navigator.pop(context); // go back to Home after save
//     } catch (e) {
//       await _stopStreams();
//       if (!mounted) return;
//       _toast("Oops… $e", success: false);
//     } finally {
//       if (!mounted) return;
//       setState(() {
//         _running = false;
//         _secondsLeft = 0;
//       });
//     }
//   }

//   // ---------- Review preview ----------
//   Future<bool?> _showReviewSheet(CalibrationRecord rec) {
//     final cs = Theme.of(context).colorScheme;

//     String wifiShort() {
//       final w = rec.sensors["wifi"];
//       if (w is Map) {
//         final ssid = (w["ssid"] ?? "—").toString();
//         final bssid = (w["bssid"] ?? "—").toString();
//         return "$ssid • $bssid";
//       }
//       return "—";
//     }

//     return showModalBottomSheet<bool>(
//       context: context,
//       isScrollControlled: true,
//       showDragHandle: true,
//       builder: (ctx) {
//         return Padding(
//           padding: EdgeInsets.fromLTRB(
//             16,
//             8,
//             16,
//             16 + MediaQuery.of(ctx).viewInsets.bottom,
//           ),
//           child: Column(
//             mainAxisSize: MainAxisSize.min,
//             crossAxisAlignment: CrossAxisAlignment.start,
//             children: [
//               const Text(
//                 "Preview report",
//                 style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
//               ),
//               const SizedBox(height: 10),
//               Card(
//                 color: cs.surfaceContainerHighest,
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text(
//                         "${rec.placeId} • F${rec.floor}",
//                         style: const TextStyle(
//                           fontWeight: FontWeight.w900,
//                           fontSize: 16,
//                           color: AppTheme.brandBlue,
//                         ),
//                       ),
//                       const SizedBox(height: 6),
//                       Text(
//                         "${rec.building} • ${rec.placeType}",
//                         style: TextStyle(
//                           color: cs.outline,
//                           fontWeight: FontWeight.w700,
//                         ),
//                       ),
//                       const Divider(height: 20),
//                       _kv("Accuracy", "±${rec.accuracyM.toStringAsFixed(1)} m"),
//                       _kv(
//                         "GPS",
//                         "${rec.lat.toStringAsFixed(6)}, ${rec.lng.toStringAsFixed(6)}",
//                       ),
//                       _kv("WiFi", wifiShort()),
//                       _kv("Captured", rec.capturedAt.toLocal().toString()),
//                     ],
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 12),
//               Row(
//                 children: [
//                   Expanded(
//                     child: OutlinedButton.icon(
//                       onPressed: () => Navigator.pop(ctx, false),
//                       icon: const Icon(Icons.close_rounded),
//                       label: const Text("Discard"),
//                     ),
//                   ),
//                   const SizedBox(width: 12),
//                   Expanded(
//                     child: FilledButton.icon(
//                       onPressed: () => Navigator.pop(ctx, true),
//                       icon: const Icon(Icons.save_rounded),
//                       label: const Text("Save"),
//                     ),
//                   ),
//                 ],
//               ),
//               const SizedBox(height: 8),
//             ],
//           ),
//         );
//       },
//     );
//   }

//   static Widget _kv(String k, String v) {
//     return Padding(
//       padding: const EdgeInsets.only(bottom: 8),
//       child: Row(
//         children: [
//           Expanded(
//             child: Text(k, style: const TextStyle(fontWeight: FontWeight.w800)),
//           ),
//           Text(v, style: const TextStyle(fontWeight: FontWeight.w900)),
//         ],
//       ),
//     );
//   }

//   // ---------- UI ----------
//   String _wifiLine() {
//     final m = _liveWifi;
//     if (m == null) return _wifiError ?? "WiFi: —";
//     final ssid = (m["ssid"] ?? "—").toString();
//     final ip = (m["ipAddress"] ?? "—").toString();
//     final bssid = (m["bssid"] ?? "—").toString();
//     return "SSID: $ssid\nIP: $ip\nBSSID: $bssid";
//   }

//   Widget _tile({
//     required IconData icon,
//     required String title,
//     required String value,
//     Color? tone,
//   }) {
//     final cs = Theme.of(context).colorScheme;
//     return Container(
//       decoration: BoxDecoration(
//         color: cs.surfaceContainerHighest,
//         borderRadius: BorderRadius.circular(16),
//       ),
//       padding: const EdgeInsets.all(12),
//       child: Row(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           Container(
//             width: 38,
//             height: 38,
//             decoration: BoxDecoration(
//               color: (tone ?? AppTheme.brandBlue).withOpacity(0.12),
//               borderRadius: BorderRadius.circular(14),
//             ),
//             child: Icon(icon, color: tone ?? AppTheme.brandBlue),
//           ),
//           const SizedBox(width: 10),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(
//                   title,
//                   style: TextStyle(
//                     color: cs.outline,
//                     fontWeight: FontWeight.w700,
//                   ),
//                 ),
//                 const SizedBox(height: 3),
//                 Text(
//                   value,
//                   style: const TextStyle(
//                     fontWeight: FontWeight.w900,
//                     height: 1.25,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }

//   @override
//   Widget build(BuildContext context) {
//     final cs = Theme.of(context).colorScheme;
//     final progress = _running ? (30 - _secondsLeft) / 30.0 : 0.0;
//     final accTone = _accTone(_liveAcc);
//     final accText = "Accuracy: ${_accBadge(_liveAcc)}";

//     return Scaffold(
//       appBar: AppBar(
//         title: const Text("Calibration"),
//         leading: IconButton(
//           icon: const Icon(Icons.arrow_back_rounded),
//           onPressed: _running || _preflighting
//               ? null
//               : () => Navigator.pop(context),
//         ),
//       ),
//       body: Stack(
//         children: [
//           ListView(
//             padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
//             children: [
//               // WiFi card (more visible)
//               Card(
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Row(
//                         children: [
//                           const Icon(Icons.wifi_rounded),
//                           const SizedBox(width: 8),
//                           const Text(
//                             "WiFi Status",
//                             style: TextStyle(
//                               fontWeight: FontWeight.w900,
//                               fontSize: 16,
//                             ),
//                           ),
//                           const Spacer(),
//                           Chip(
//                             avatar: Icon(
//                               _wifiOk
//                                   ? Icons.check_circle_rounded
//                                   : Icons.warning_rounded,
//                               size: 18,
//                               color: _wifiOk
//                                   ? const Color(0xFF053668)
//                                   : cs.error,
//                             ),
//                             label: Text(_wifiOk ? "Connected" : "Required"),
//                             labelStyle: TextStyle(
//                               fontWeight: FontWeight.w900,
//                               color: _wifiOk
//                                   ? const Color(0xFF053668)
//                                   : cs.error, // ✅ dark readable
//                             ),
//                             backgroundColor: _wifiOk
//                                 ? const Color(0xFF053668).withOpacity(0.08)
//                                 : cs.error.withOpacity(0.08),
//                             side: BorderSide(
//                               color: _wifiOk
//                                   ? const Color(0xFF053668)
//                                   : cs.error,
//                             ),
//                           ),
//                         ],
//                       ),
//                       const SizedBox(height: 10),
//                       Container(
//                         width: double.infinity,
//                         padding: const EdgeInsets.all(14),
//                         decoration: BoxDecoration(
//                           color: _wifiOk
//                               ? AppTheme.brandBlue.withOpacity(0.08)
//                               : cs.error.withOpacity(0.08),
//                           borderRadius: BorderRadius.circular(16),
//                           border: Border.all(
//                             color: _wifiOk
//                                 ? AppTheme.brandBlue.withOpacity(0.25)
//                                 : cs.error.withOpacity(0.25),
//                           ),
//                         ),
//                         child: Text(
//                           _wifiLine(),
//                           style: TextStyle(
//                             fontWeight: FontWeight.w900,
//                             color: _wifiOk
//                                 ? const Color(0xFF0F172A)
//                                 : cs.error, // dark slate
//                             height: 1.3,
//                           ),
//                         ),
//                       ),
//                       if (_wifiError != null) ...[
//                         const SizedBox(height: 8),
//                         Text(
//                           _wifiError!,
//                           style: TextStyle(
//                             color: cs.error,
//                             fontWeight: FontWeight.w800,
//                           ),
//                         ),
//                       ],
//                     ],
//                   ),
//                 ),
//               ),

//               const SizedBox(height: 12),

//               // Form
//               Card(
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Form(
//                     key: _formKey,
//                     child: Column(
//                       crossAxisAlignment: CrossAxisAlignment.start,
//                       children: [
//                         const Text(
//                           "Location details",
//                           style: TextStyle(
//                             fontWeight: FontWeight.w900,
//                             fontSize: 16,
//                           ),
//                         ),
//                         const SizedBox(height: 12),

//                         TextFormField(
//                           controller: _placeIdCtrl,
//                           enabled: !_running && !_preflighting,
//                           decoration: const InputDecoration(
//                             labelText: "Place ID",
//                             prefixIcon: Icon(Icons.tag_rounded),
//                           ),
//                           validator: (v) => (v == null || v.trim().isEmpty)
//                               ? "Required"
//                               : null,
//                         ),
//                         const SizedBox(height: 12),

//                         TextFormField(
//                           controller: _buildingCtrl,
//                           enabled: !_running && !_preflighting,
//                           decoration: const InputDecoration(
//                             labelText: "Building",
//                             prefixIcon: Icon(Icons.apartment_rounded),
//                           ),
//                           validator: (v) => (v == null || v.trim().isEmpty)
//                               ? "Required"
//                               : null,
//                         ),
//                         const SizedBox(height: 12),

//                         // ✅ FIX OVERFLOW: dropdown Expanded + floor small fixed width
//                         Row(
//                           children: [
//                             Expanded(
//                               child: DropdownButtonFormField<String>(
//                                 isExpanded: true,
//                                 value: _placeType,
//                                 decoration: const InputDecoration(
//                                   labelText: "Place type",
//                                   prefixIcon: Icon(Icons.category_rounded),
//                                 ),
//                                 items: const [
//                                   DropdownMenuItem(
//                                     value: "LECTURE_HALL",
//                                     child: Text("LECTURE_HALL"),
//                                   ),
//                                   DropdownMenuItem(
//                                     value: "LAB",
//                                     child: Text("LAB"),
//                                   ),
//                                   DropdownMenuItem(
//                                     value: "LIBRARY",
//                                     child: Text("LIBRARY"),
//                                   ),
//                                   DropdownMenuItem(
//                                     value: "STUDY_AREA",
//                                     child: Text("STUDY_AREA"),
//                                   ),
//                                   DropdownMenuItem(
//                                     value: "LUNCH_AREA",
//                                     child: Text("LUNCH_AREA"),
//                                   ),
//                                 ],
//                                 onChanged: (_running || _preflighting)
//                                     ? null
//                                     : (v) => setState(
//                                         () => _placeType = v ?? _placeType,
//                                       ),
//                               ),
//                             ),
//                             const SizedBox(width: 12),
//                             SizedBox(
//                               width: 110, // ✅ smaller floor
//                               child: TextFormField(
//                                 controller: _floorCtrl,
//                                 enabled: !_running && !_preflighting,
//                                 keyboardType: TextInputType.number,
//                                 decoration: const InputDecoration(
//                                   labelText: "Floor",
//                                   prefixIcon: Icon(Icons.stairs_rounded),
//                                 ),
//                                 validator: (v) {
//                                   final n = int.tryParse((v ?? "").trim());
//                                   if (n == null) return "Number";
//                                   if (n < -5 || n > 60) return "Invalid";
//                                   return null;
//                                 },
//                               ),
//                             ),
//                           ],
//                         ),
//                       ],
//                     ),
//                   ),
//                 ),
//               ),

//               const SizedBox(height: 12),

//               Card(
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       const Text(
//                         "Start",
//                         style: TextStyle(
//                           fontWeight: FontWeight.w900,
//                           fontSize: 16,
//                         ),
//                       ),
//                       const SizedBox(height: 10),
//                       FilledButton.icon(
//                         onPressed: (_running || _preflighting)
//                             ? null
//                             : () async {
//                                 // validate form first
//                                 final ok =
//                                     _formKey.currentState?.validate() ?? false;
//                                 if (!ok) {
//                                   _toast(
//                                     "Please fill required fields ✍️",
//                                     success: false,
//                                   );
//                                   return;
//                                 }

//                                 // re-check WiFi + GPS quickly
//                                 setState(() {
//                                   _preflighting = true;
//                                   _preflightMsg = "Final checks…";
//                                 });

//                                 try {
//                                   await _refreshWifi();
//                                   if (!_wifiOk)
//                                     throw Exception(
//                                       _wifiError ?? "WiFi required",
//                                     );

//                                   await _ensurePermissions();

//                                   if (!mounted) return;
//                                   setState(() => _preflighting = false);

//                                   await WakelockPlus.enable();
//                                   await _startCalibration(); // ✅ MANUAL START
//                                 } catch (e) {
//                                   if (!mounted) return;
//                                   setState(() => _preflighting = false);
//                                   _toast("Can’t start: $e", success: false);
//                                 } finally {
//                                   await WakelockPlus.disable();
//                                 }
//                               },
//                         icon: const Icon(Icons.play_arrow_rounded),
//                         label: const Text("Start Calibration (30s)"),
//                       ),
//                       const SizedBox(height: 8),
//                       Text(
//                         "Tip: hold your phone steady for best accuracy.",
//                         style: TextStyle(
//                           color: cs.outline,
//                           fontWeight: FontWeight.w700,
//                         ),
//                       ),
//                     ],
//                   ),
//                 ),
//               ),

//               const SizedBox(height: 12),

//               // Progress + accuracy status
//               Card(
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Row(
//                         children: [
//                           const Text(
//                             "Live status",
//                             style: TextStyle(fontWeight: FontWeight.w900),
//                           ),
//                           const Spacer(),
//                           Chip(
//                             avatar: Icon(
//                               Icons.gps_fixed_rounded,
//                               size: 18,
//                               color: accTone == Colors.grey
//                                   ? const Color(0xFF053668)
//                                   : accTone,
//                             ),
//                             label: Text(accText),
//                             labelStyle: TextStyle(
//                               fontWeight: FontWeight.w900,
//                               color: accTone == Colors.grey
//                                   ? const Color(0xFF053668)
//                                   : accTone, // ✅ dark
//                             ),
//                             backgroundColor:
//                                 (accTone == Colors.grey
//                                         ? const Color(0xFF053668)
//                                         : accTone)
//                                     .withOpacity(0.10),
//                             side: BorderSide(
//                               color: accTone == Colors.grey
//                                   ? const Color(0xFF053668)
//                                   : accTone,
//                             ),
//                           ),
//                         ],
//                       ),
//                       const SizedBox(height: 10),
//                       ClipRRect(
//                         borderRadius: BorderRadius.circular(999),
//                         child: LinearProgressIndicator(
//                           value: _running ? progress : null,
//                           minHeight: 8,
//                         ),
//                       ),
//                       const SizedBox(height: 8),
//                       Text(
//                         _running
//                             ? "Sampling… $_secondsLeft seconds left"
//                             : "Ready. You can see live caliberation when start.",
//                         style: TextStyle(
//                           color: cs.outline,
//                           fontWeight: FontWeight.w700,
//                         ),
//                       ),
//                     ],
//                   ),
//                 ),
//               ),

//               const SizedBox(height: 12),

//               // Live telemetry
//               Card(
//                 child: Padding(
//                   padding: const EdgeInsets.all(14),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       const Text(
//                         "Live readings",
//                         style: TextStyle(
//                           fontWeight: FontWeight.w900,
//                           fontSize: 16,
//                         ),
//                       ),
//                       const SizedBox(height: 12),
//                       _tile(
//                         icon: Icons.public,
//                         title: "Latitude / Longitude",
//                         value:
//                             "${_liveLat?.toStringAsFixed(6) ?? "—"} , ${_liveLng?.toStringAsFixed(6) ?? "—"}",
//                       ),
//                       const SizedBox(height: 10),
//                       _tile(
//                         icon: Icons.my_location_rounded,
//                         title: "Accuracy",
//                         value: _liveAcc == null
//                             ? "—"
//                             : "±${_liveAcc!.toStringAsFixed(1)} m",
//                         tone: _accTone(_liveAcc),
//                       ),
//                       const SizedBox(height: 10),

//                       // _tile(
//                       //   icon: Icons.explore_rounded,
//                       //   title: "Heading",
//                       //   value: _liveHeading == null
//                       //       ? "—"
//                       //       : "${_liveHeading!.toStringAsFixed(1)}°",
//                       // ),
//                       _tile(
//                         icon: Icons.explore_rounded,
//                         title: "Heading (Compass)",
//                         value: headingText,
//                       ),
//                       const SizedBox(height: 10),
//                       _tile(
//                         icon: Icons.speed_rounded,
//                         title: "Acceleration",
//                         value: _liveAccel == null
//                             ? "—"
//                             : "${_liveAccel!.x.toStringAsFixed(2)}, ${_liveAccel!.y.toStringAsFixed(2)}, ${_liveAccel!.z.toStringAsFixed(2)}",
//                       ),
//                       const SizedBox(height: 10),
//                       // _tile(
//                       //   icon: Icons.compress_rounded,
//                       //   title: "Pressure",
//                       //   value: _livePressure == null
//                       //       ? (_pressureSupported
//                       //             ? "Waiting…"
//                       //             : "Not supported")
//                       //       : "${_livePressure!.toStringAsFixed(2)} hPa",
//                       // ),
//                       _tile(
//                         icon: Icons.compress_rounded,
//                         title: "Pressure (Barometer)",
//                         value: pressureText,
//                       ),
//                     ],
//                   ),
//                 ),
//               ),
//             ],
//           ),

//           // ✅ Preflight overlay (emotional loader)
//           if (_preflighting)
//             Container(
//               color: Colors.white.withOpacity(0.92),
//               child: Center(
//                 child: Padding(
//                   padding: const EdgeInsets.all(24),
//                   child: Card(
//                     child: Padding(
//                       padding: const EdgeInsets.all(18),
//                       child: Column(
//                         mainAxisSize: MainAxisSize.min,
//                         children: [
//                           const SizedBox(
//                             width: 26,
//                             height: 26,
//                             child: CircularProgressIndicator(strokeWidth: 3),
//                           ),
//                           const SizedBox(height: 14),
//                           Text(
//                             _preflightMsg,
//                             textAlign: TextAlign.center,
//                             style: const TextStyle(
//                               fontWeight: FontWeight.w900,
//                               fontSize: 16,
//                             ),
//                           ),
//                           const SizedBox(height: 6),
//                           const Text(
//                             "Just a moment… we’re preparing a clean calibration ✨",
//                             textAlign: TextAlign.center,
//                             style: TextStyle(fontWeight: FontWeight.w700),
//                           ),
//                         ],
//                       ),
//                     ),
//                   ),
//                 ),
//               ),
//             ),
//         ],
//       ),
//     );
//   }
// }

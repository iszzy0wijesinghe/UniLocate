import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

class CalibrationStore {
  static const _fileName = "campus_calibrations.json";

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    return File("${dir.path}/$_fileName");
  }

  /// Returns payload map: { campus, exportedAt, calibrations: [...] }
  Future<Map<String, dynamic>> readPayload() async {
    final f = await _file();
    if (!await f.exists()) {
      return {
        "campus": "SLIIT",
        "exportedAt": DateTime.now().toIso8601String(),
        "calibrations": <Map<String, dynamic>>[],
      };
    }
    final txt = await f.readAsString();
    final decoded = jsonDecode(txt);
    if (decoded is Map<String, dynamic>) return decoded;
    return {
      "campus": "SLIIT",
      "exportedAt": DateTime.now().toIso8601String(),
      "calibrations": <Map<String, dynamic>>[],
    };
  }

  Future<List<Map<String, dynamic>>> readAll() async {
    final payload = await readPayload();
    final list = (payload["calibrations"] as List? ?? const [])
        .whereType<Map>()
        .map((e) => e.cast<String, dynamic>())
        .toList();
    return list;
  }

  Future<void> writeAll(List<Map<String, dynamic>> items) async {
    final f = await _file();
    final payload = {
      "campus": "SLIIT",
      "exportedAt": DateTime.now().toIso8601String(),
      "calibrations": items,
    };
    await f.writeAsString(const JsonEncoder.withIndent("  ").convert(payload));
  }

  /// Duplicate key = placeId + building + floor + placeType
  String keyOf(Map<String, dynamic> m) {
    final placeId = (m["placeId"] ?? "").toString().trim();
    final building = (m["building"] ?? "").toString().trim();
    final floor = (m["floor"] ?? "").toString().trim();
    final placeType = (m["placeType"] ?? "").toString().trim();
    return "$placeId|$building|$floor|$placeType";
  }

  int indexOfDuplicate(
    List<Map<String, dynamic>> items,
    Map<String, dynamic> newItem,
  ) {
    final k = keyOf(newItem);
    return items.indexWhere((e) => keyOf(e) == k);
  }
}

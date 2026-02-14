import 'dart:async';
import 'package:flutter/services.dart';

class PressureService {
  static const _method = MethodChannel("campuspulse/sensors");
  static const _pressureEvent = EventChannel("campuspulse/sensors/pressure");

  Stream<double>? _stream;

  Future<bool> isSupported() async {
    final ok = await _method.invokeMethod<bool>("pressureSupported");
    return ok ?? false;
  }

  Stream<double> stream() {
    _stream ??= _pressureEvent.receiveBroadcastStream().map(
      (e) => (e as num).toDouble(),
    );
    return _stream!;
  }
}

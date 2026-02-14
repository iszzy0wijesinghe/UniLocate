package com.example.campus_calibrator

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity(), SensorEventListener {

  // Pressure channels (already used by your PressureService)
  private val METHOD_CH = "campuspulse/sensors"
  private val PRESSURE_EVENT_CH = "campuspulse/sensors/pressure"

  // WiFi channel (new)
  private val WIFI_METHOD_CH = "campuspulse/wifi"

  private var sensorManager: SensorManager? = null
  private var pressureSensor: Sensor? = null

  private var pressureSink: EventChannel.EventSink? = null
  private var isListening = false

  // WiFi provider (new)
  private lateinit var wifiProvider: WifiInfoProvider

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)

    // ---- Pressure (Barometer) setup ----
    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    pressureSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_PRESSURE)

    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CH)
      .setMethodCallHandler { call, result ->
        when (call.method) {
          "pressureSupported" -> result.success(pressureSensor != null)
          else -> result.notImplemented()
        }
      }

    EventChannel(flutterEngine.dartExecutor.binaryMessenger, PRESSURE_EVENT_CH)
      .setStreamHandler(object : EventChannel.StreamHandler {
        override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
          pressureSink = events
          startPressure()
        }

        override fun onCancel(arguments: Any?) {
          stopPressure()
          pressureSink = null
        }
      })

    // ---- WiFi setup (new) ----
    wifiProvider = WifiInfoProvider(applicationContext)

    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, WIFI_METHOD_CH)
      .setMethodCallHandler { call, result ->
        when (call.method) {
          "getWifiDetails" -> {
            try {
              result.success(wifiProvider.getWifiDetails())
            } catch (e: Exception) {
              result.error("WIFI_ERROR", e.message, null)
            }
          }
          else -> result.notImplemented()
        }
      }
  }

  private fun startPressure() {
    if (isListening) return
    val sensor = pressureSensor ?: return
    sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    isListening = true
  }

  private fun stopPressure() {
    if (!isListening) return
    sensorManager?.unregisterListener(this)
    isListening = false
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type == Sensor.TYPE_PRESSURE) {
      // Pressure in hPa
      val pressureHpa = event.values[0].toDouble()
      pressureSink?.success(pressureHpa)
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // not needed
  }

  override fun onPause() {
    super.onPause()
    // Stop barometer when app goes background (Dart will re-listen when needed)
    stopPressure()
  }
}
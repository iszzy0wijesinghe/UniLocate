package com.example.campus_calibrator

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build

class WifiInfoProvider(private val context: Context) {

    private fun stripQuotes(s: String?): String? {
        if (s == null) return null
        return s.removePrefix("\"").removeSuffix("\"")
    }

    private fun safeSsid(info: WifiInfo?): String? {
        val raw = info?.ssid ?: return null
        if (raw == WifiManager.UNKNOWN_SSID) return null
        return stripQuotes(raw)
    }

    fun getWifiDetails(): Map<String, Any?> {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val active = cm.activeNetwork
        val caps = cm.getNetworkCapabilities(active)

        val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true

        val result = mutableMapOf<String, Any?>(
            "isWifi" to isWifi,
            "networkType" to when {
                isWifi -> "WIFI"
                caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "CELLULAR"
                else -> "UNKNOWN"
            }
        )

        if (!isWifi) return result

        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

        val info: WifiInfo? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+
            wifiManager.connectionInfo
        } else {
            @Suppress("DEPRECATION")
            wifiManager.connectionInfo
        }

        result["ssid"] = safeSsid(info)
        result["bssid"] = info?.bssid
        result["ipAddress"] = intToIp(info?.ipAddress ?: 0)
        result["rssiDbm"] = info?.rssi
        result["linkSpeedMbps"] = info?.linkSpeed
        result["frequencyMhz"] = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) info?.frequency else null
        result["networkId"] = info?.networkId

        // "Distance to AP" cannot be accurately measured by phone without AP data.
        // But we can provide an *estimated* distance based on RSSI (rough).
        val rssi = info?.rssi
        result["distanceEstimateM"] = if (rssi != null) estimateDistanceMeters(rssi) else null

        return result
    }

    private fun intToIp(ip: Int): String {
        return "${ip and 0xFF}.${(ip shr 8) and 0xFF}.${(ip shr 16) and 0xFF}.${(ip shr 24) and 0xFF}"
    }

    // Very rough estimate (environment dependent). Good for demo only.
    private fun estimateDistanceMeters(rssiDbm: Int): Double {
        // Typical TxPower around -59 dBm at 1m (varies a lot)
        val txPower = -59.0
        val n = 2.0 // path-loss exponent (2 indoor-ish, 3-4 noisy)
        return Math.pow(10.0, (txPower - rssiDbm) / (10.0 * n))
    }
}
import 'package:flutter/material.dart';

import 'home_view.dart';
import 'saved_view.dart';
import 'about_view.dart';
import 'calibrate_view.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  Future<void> _openCalibrate() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const CalibrateView()));
    // when coming back, history will already have the saved data (SavedStore)
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeView(onStartCalibration: _openCalibrate),
      const SavedView(),
      const AboutView(),
    ];

    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        height: 70,
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_rounded), label: "Home"),
          NavigationDestination(
            icon: Icon(Icons.history_rounded),
            label: "History",
          ),
          NavigationDestination(icon: Icon(Icons.info_rounded), label: "About"),
        ],
      ),
    );
  }
}

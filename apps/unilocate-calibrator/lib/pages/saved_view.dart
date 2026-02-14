import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../services/calibration_store.dart';
import '../ui/app_theme.dart';

class SavedView extends StatefulWidget {
  const SavedView({super.key});

  @override
  State<SavedView> createState() => _SavedViewState();
}

class _SavedViewState extends State<SavedView> {
  final _store = CalibrationStore();

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = [];
  String _query = "";

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _store.readAll();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = "$e";
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _items;

    bool matches(Map<String, dynamic> m) {
      final placeId = (m["placeId"] ?? "").toString().toLowerCase();
      final building = (m["building"] ?? "").toString().toLowerCase();
      final placeType = (m["placeType"] ?? "").toString().toLowerCase();
      final floor = (m["floor"] ?? "").toString().toLowerCase();
      return placeId.contains(q) ||
          building.contains(q) ||
          placeType.contains(q) ||
          floor.contains(q);
    }

    return _items.where(matches).toList();
  }

  Future<void> _shareOne(Map<String, dynamic> item) async {
    final txt = const JsonEncoder.withIndent("  ").convert(item);
    await Share.share(txt);
  }

  Future<void> _deleteOne(Map<String, dynamic> item) async {
    final id = (item["id"] ?? "").toString();
    if (id.isEmpty) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Delete calibration?"),
        content: Text("This will remove:\n$id"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Cancel"),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.brandOrange,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );

    if (ok != true) return;

    final all = await _store.readAll();
    all.removeWhere((e) => (e["id"] ?? "").toString() == id);
    await _store.writeAll(all);
    await _load();
  }

  void _openDetails(Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Text(
                  "Saved JSON",
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppTheme.brandBlue,
                    fontSize: 18,
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: "Share",
                  onPressed: () => _shareOne(item),
                  icon: const Icon(Icons.share),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(ctx).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    const JsonEncoder.withIndent("  ").convert(item),
                    style: const TextStyle(
                      fontFamily: "monospace",
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill(String text, Color tone) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withOpacity(0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withOpacity(0.28)),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: tone,
          fontWeight: FontWeight.w900,
          fontSize: 12,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final list = _filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text("History"),
        actions: [
          IconButton(
            tooltip: "Reload",
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          children: [
            TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: "Search place, building, type, floor…",
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : (_error != null)
                  ? Center(
                      child: Text(
                        "Error: $_error",
                        style: TextStyle(
                          color: cs.error,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    )
                  : list.isEmpty
                  ? Center(
                      child: Text(
                        _items.isEmpty
                            ? "No saved points yet."
                            : "No results for “$_query”.",
                        style: TextStyle(
                          color: cs.outline,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final r = list[i];
                        final placeId = (r["placeId"] ?? "—").toString();
                        final building = (r["building"] ?? "—").toString();
                        final placeType = (r["placeType"] ?? "—").toString();
                        final floor = (r["floor"] ?? "—").toString();
                        final geo = (r["geo"] is Map) ? (r["geo"] as Map) : {};
                        final acc = (geo["accuracyM"] ?? "—").toString();

                        return InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () => _openDetails(r),
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          "$placeId • F$floor",
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w900,
                                            color: AppTheme.brandBlue,
                                            fontSize: 16,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      IconButton(
                                        tooltip: "Share",
                                        onPressed: () => _shareOne(r),
                                        icon: const Icon(Icons.share),
                                      ),
                                      IconButton(
                                        tooltip: "Delete",
                                        onPressed: () => _deleteOne(r),
                                        icon: Icon(
                                          Icons.delete_outline,
                                          color: cs.error,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _pill(placeType, AppTheme.brandBlue),
                                      _pill(building, AppTheme.brandOrange),
                                      _pill("±$acc m", Colors.green),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

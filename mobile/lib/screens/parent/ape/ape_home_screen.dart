import 'package:flutter/material.dart';
import '../../../theme.dart';
import 'ape_role.dart';
import 'ape_dashboard_screen.dart';
import 'ape_cotisations_screen.dart';
import 'ape_forum_screen.dart';
import 'ape_projets_screen.dart';

class ApeHomeScreen extends StatefulWidget {
  const ApeHomeScreen({super.key});

  @override
  State<ApeHomeScreen> createState() => _ApeHomeScreenState();
}

class _ApeHomeScreenState extends State<ApeHomeScreen> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    ApeRole.instance.check().then((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Espace APE'),
          bottom: TabBar(
            isScrollable: true,
            labelColor: kApeGradient.colors.first,
            unselectedLabelColor: kTextGray,
            indicatorColor: kApeGradient.colors.first,
            tabs: const [
              Tab(text: 'Accueil'),
              Tab(text: 'Cotisations'),
              Tab(text: 'Forum'),
              Tab(text: 'Projets'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            ApeDashboardScreen(),
            ApeCotisationsScreen(),
            ApeForumScreen(),
            ApeProjetsScreen(),
          ],
        ),
      ),
    );
  }
}

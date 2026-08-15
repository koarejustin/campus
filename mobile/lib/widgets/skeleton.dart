import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Effet "squelette brillant" affiché pendant le chargement des données,
/// à la place d'un simple rond de chargement — donne une impression
/// d'appli vivante plutôt que figée.
class Skeleton extends StatelessWidget {
  final double height;
  final double? width;
  final BorderRadius? radius;
  const Skeleton({super.key, required this.height, this.width, this.radius});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE9ECF5),
      highlightColor: const Color(0xFFF6F7FC),
      period: const Duration(milliseconds: 1200),
      child: Container(
        height: height,
        width: width ?? double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: radius ?? BorderRadius.circular(14),
        ),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  final int count;
  final double itemHeight;
  const SkeletonList({super.key, this.count = 4, this.itemHeight = 72});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (i) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Skeleton(height: itemHeight),
        ),
      ),
    );
  }
}

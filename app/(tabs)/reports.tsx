import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import { ChartCard } from '../../src/components/reports/ChartCard';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';

const AnimatablePath = Animated.createAnimatedComponent(Path);

interface DonutData {
  nombre: string;
  total: number;
  color: string;
}

const SkiaDonutChart = ({ data, palette }: { data: DonutData[]; palette: any }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, [data]);

  const total = data.reduce((sum, item) => sum + item.total, 0);
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const thickness = 30;

  return (
    <Canvas style={{ width: 200, height: 200 }}>
      {data.map((item, index) => {
        // BUGFIX (donut math): convert to degrees ONCE. Previously
        // `(angle / total) * 360` divided by `total` a second time, producing
        // arcs that were roughly `1/total` of the correct sweep.
        const startAngleDeg =
          (data.slice(0, index).reduce((sum, i) => sum + i.total, 0) / total) * 360;
        const sweepAngleDeg = (item.total / total) * 360;

        return (
          <Path
            key={item.nombre}
            path={Skia.Path.Make().addArc({
              x: centerX - radius,
              y: centerY - radius,
              width: radius * 2,
              height: radius * 2,
            }, startAngleDeg, sweepAngleDeg * progress.value)}
            color={item.color}
            style="stroke"
            strokeWidth={thickness}
            strokeCap="round"
          />
        );
      })}
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, radius - thickness / 2)}
        color={palette.card}
        style="fill"
      />
    </Canvas>
  );
};

/**
 * Animated pulsing circle replacement for Lottie empty state animation.
 * Uses react-native-reanimated (already a dependency).
 */
const AnimatedCircle = ({ palette }: { palette: any }) => {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.8, 1.2], [0.5, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      style={[
        {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: palette.chartBlue || '#007AFF',
        },
        animatedStyle,
      ]}
    />
  );
};

export default function ReportsScreen() {
  const reports = useBoundStore((state) => state.reports);
  const isInitializing = useBoundStore((state) => state.isInitializing);
  const isDbInitialized = useBoundStore((state) => state.isDbInitialized);
  const themeMode = useBoundStore((state) => state.themeMode);
  const fetchReports = useBoundStore((state) => state.fetchReports);
  const palette = getPalette(themeMode);

  // CRITICAL: hydrate reports on mount and whenever DB becomes ready
  useEffect(() => {
    if (isDbInitialized) {
      fetchReports();
    }
  }, [isDbInitialized, fetchReports]);

  const hasData = reports.categoryTotals.length > 0;

  if (isInitializing) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.text }}>Cargando analítica...</Text>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <AnimatedCircle palette={palette} />
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          No hay datos suficientes para generar el análisis.
        </Text>
        <Text style={[styles.emptyHint, { color: palette.textSecondary }]}>
          Necesitas al menos 1 transacción con categoría de egreso activa.
        </Text>
        <TouchableOpacity
          style={[styles.reloadButton, { backgroundColor: palette.primary }]}
          onPress={fetchReports}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Reintentar cargar reportes"
        >
          <Text style={styles.reloadButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <ChartCard title="Distribución de Gastos">
        <View style={styles.chartWrapper}>
          <SkiaDonutChart data={reports.categoryTotals} palette={palette} />
        </View>
        
        <View style={styles.legend}>
          {(() => {
            const items = [];
            for (const item of reports.categoryTotals) {
              items.push(
                <View key={item.nombre} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text allowFontScaling={true} style={[styles.legendText, { color: palette.text }]}>{item.nombre}</Text>
                  <Text allowFontScaling={true} style={[styles.legendValue, { color: palette.textSecondary }]}>
                    {Math.round((item.total / reports.categoryTotals.reduce((s, v) => s + v.total, 0)) * 100)}%
                  </Text>
                </View>
              );
            }
            return items;
          })()}
        </View>
      </ChartCard>

      {reports.monthlyTrend.length > 0 && (
        <ChartCard title="Tendencia Mensual (Neto)">
          <View style={{ gap: 8 }}>
            {reports.monthlyTrend.map((m) => {
              const maxAbs = Math.max(...reports.monthlyTrend.map((x) => Math.abs(x.total)), 1);
              const barWidth = Math.abs(m.total) / maxAbs * 100;
              const barColor = m.total >= 0 ? palette.income : palette.expense;
              return (
                <View key={m.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text allowFontScaling style={{ color: palette.textSecondary, fontSize: 12, width: 60 }}>
                    {m.month.slice(5)}
                  </Text>
                  <View style={{ flex: 1, height: 18, backgroundColor: palette.card, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${barWidth}%`, height: '100%', backgroundColor: barColor, borderRadius: 4 }} />
                  </View>
                  <Text allowFontScaling style={{ color: palette.text, fontSize: 12, fontWeight: '600', width: 80, textAlign: 'right' }}>
                    {m.total >= 0 ? '+' : ''}{m.total.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </ChartCard>
      )}

      <View style={[styles.infoCard, { backgroundColor: palette.textSecondary + '08', borderLeftColor: palette.primary }]}>
        <Text style={[styles.infoTitle, { color: palette.text }]}>Insight del Mes</Text>
        <Text style={[styles.infoText, { color: palette.textSecondary }]}>
          Tus gastos más altos se concentran en {reports.categoryTotals[0]?.nombre || 'N/A'}. 
          Sigue así para mantener tu salud financiera.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  reloadButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  legend: {
    marginTop: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    flex: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

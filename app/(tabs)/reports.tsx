import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import { ChartCard } from '../../src/components/reports/ChartCard';
import LottieView from 'lottie-react-native';
import { Canvas, Path, Skia, vec } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';

/**
 * GPU-Accelerated Donut Chart using Shopify Skia
 */
const SkiaDonutChart = ({ data, palette }: { data: any[], palette: any }) => {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const thickness = 30;
  
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1000 });
  }, []);

  let startAngle = 0;
  const slices = data.map((item) => {
    const angle = (item.total / total) * 2 * Math.PI;
    const slice = {
      start: startAngle,
      end: startAngle + angle,
      color: item.color,
    };
    startAngle += angle;
    return slice;
  });

  return (
    <Canvas style={{ width: 200, height: 200 }}>
      {slices.map((slice, i) => {
        const path = Skia.Path.Make();
        path.addArc({ 
          x: centerX - radius, 
          y: centerY - radius, 
          width: radius * 2, 
          height: radius * 2 
        }, slice.start * (180 / Math.PI), slice.end * (180 / Math.PI) * progress.value);
        
        return (
          <Path
            key={i}
            path={path}
            color={slice.color}
            style="stroke"
            strokeWidth={thickness}
            strokeCap="round"
          />
        );
      })}
      {/* Center Hole for Donut effect */}
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, radius - thickness / 2)}
        color={palette.card}
        style="fill"
      />
    </Canvas>
  );
};

export default function ReportsScreen() {
  const reports = useBoundStore((state) => state.reports);
  const isInitializing = useBoundStore((state) => state.isInitializing);
  const themeMode = useBoundStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

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
        <LottieView 
          source={require('../../assets/animations/empty_reports.json')} 
          autoPlay 
          loop 
          style={styles.lottie} 
        />
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          No hay datos suficientes para generar el análisis.
        </Text>
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
          {reports.categoryTotals.map((item, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: palette.text }]}>{item.nombre}</Text>
              <Text style={[styles.legendValue, { color: palette.textSecondary }]}>
                {Math.round((item.total / reports.categoryTotals.reduce((s, v) => s + v.total, 0)) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </ChartCard>

      <View style={styles.infoCard}>
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
  lottie: {
    width: 250,
    height: 250,
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
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
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

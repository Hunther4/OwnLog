import React from 'react';
import { Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { theme, getPalette } from '../../theme/theme';
import { useFinanceStore } from '../../store/useFinanceStore';

interface MonthlyTrend {
  month: string;
  total: number;
}

interface MonthlySpendingBarChartProps {
  data: MonthlyTrend[];
}

export const MonthlySpendingBarChart: React.FC<MonthlySpendingBarChartProps> = ({ data }) => {
  // Don't render with empty data - chart will crash
  if (!data || data.length === 0) {
    return null;
  }

  const screenWidth = Dimensions.get('window').width;
  const themeMode = useFinanceStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        data: data.map((item) => item.total),
      },
    ],
  };

  return (
    <BarChart
      data={chartData}
      width={screenWidth - theme.spacing.xl * 2}
      height={220}
      yAxisLabel="$"
      yAxisSuffix=" CLP"
      chartConfig={{
        backgroundColor: palette.card,
        backgroundGradientFrom: palette.card,
        backgroundGradientTo: palette.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // palette.primary
        labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`, // palette.textSecondary
        style: {
          borderRadius: 16,
        },
        propsForDots: {
          r: '6',
          strokeWidth: '2',
          stroke: palette.primary,
        },
      }}
      style={{
        marginVertical: 8,
        borderRadius: 16,
      }}
    />
  );
};

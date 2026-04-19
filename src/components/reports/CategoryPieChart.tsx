import React from 'react';
import { Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { theme, getPalette } from '../../theme/theme';
import { useFinanceStore } from '../../store/useFinanceStore';

interface CategoryDistribution {
  nombre: string;
  total: number;
  color: string;
}

interface CategoryPieChartProps {
  data: CategoryDistribution[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width;
  const themeMode = useFinanceStore((state) => state.themeMode);
  const palette = getPalette(themeMode);

  const chartData = data.map((item) => ({
    name: item.nombre,
    population: item.total,
    color: item.color,
    legendFontColor: palette.textSecondary,
  }));

  return (
    <PieChart
      data={chartData}
      width={screenWidth - theme.spacing.xl * 2}
      height={220}
      chartConfig={{
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      }}
      accessor="population"
      backgroundColor="transparent"
      paddingLeft="15"
      center={[0, 0]}
      absolute
    />
  );
};

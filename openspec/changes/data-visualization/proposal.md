# Proposal: Data Visualization

## Intent

Provide the user with an immediate, intuitive understanding of their spending habits and income distribution through visual reports. This reduces the cognitive load of analyzing raw transaction lists and helps users identify financial patterns quickly.

## Scope

### In Scope
- `ReportsScreen`: A new view dedicated to financial visualizations.
- `CategoryPieChart`: Visualization of expenses grouped by category.
- `MonthlySpendingBarChart`: Visualization of total expenses per month over time.
- `SQLite Aggregation`: Implementation of optimized SQL queries (`SUM`, `GROUP BY`) to perform calculations on the database side, minimizing JS thread overhead.
- `Store Integration`: Connection between `useFinanceStore` and the visualization components to ensure data consistency.

### Out of Scope
- Custom date range filters for charts (deferred to future iterations).
- Exporting reports as PDF or Image files.
- Budget vs. Actual spending comparisons.

## Capabilities

### New Capabilities
- `reports-dashboard`: Provides visual summaries of financial data using charts and aggregated statistics.

### Modified Capabilities
- None

## Approach

1. **Database Layer**: Implement aggregation queries in `SQLiteEngine` to fetch only the final sums for categories and months. This avoids loading thousands of transactions into memory for simple totals.
2. **Store Layer**: Extend `useFinanceStore` with selectors that trigger these aggregation queries, providing a clean API for the UI to consume (e.g., `getCategoryDistribution()`).
3. **UI Layer**: 
    - Implement `ReportsScreen` using a scrollable layout.
    - Use `react-native-chart-kit` (powered by `react-native-svg`) for rendering. This library is chosen for its balance between development speed and performance on Android.
    - Optimize rendering by limiting the data window (e.g., showing the last 6-12 months in the bar chart).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/database/SQLiteEngine.ts` | Modified | Addition of aggregation query methods. |
| `src/store/useFinanceStore.ts` | Modified | New selectors/actions for aggregated data. |
| `src/screens/ReportsScreen.tsx` | New | New screen for displaying reports. |
| `src/components/charts/` | New | Custom wrapper components for the charting library. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance lag on low-end Android | Medium | Use simple SVG-based charts, disable heavy animations, and limit data points. |
| Data drift between lists and charts | Low | Use identical SQL logic for both the balance calculation and the chart aggregations. |

## Rollback Plan

Since this is an additive feature:
1. Remove the `ReportsScreen` and its associated navigation entry.
2. Delete the new aggregation methods in `SQLiteEngine` and the store.
3. Uninstall the charting library.

## Dependencies

- `react-native-chart-kit`
- `react-native-svg`

## Success Criteria

- [ ] Charts render in < 200ms on mid-range devices.
- [ ] Data in the Pie chart accurately reflects the sum of transactions for each category.
- [ ] The Bar chart correctly aggregates and displays monthly spending for the past 6 months.

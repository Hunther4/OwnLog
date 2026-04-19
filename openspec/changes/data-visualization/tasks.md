# Tasks: Data Visualization - Reports Dashboard

## Phase 1: Foundation / Database
- [ ] 1.1 Add `getCategoryDistribution()` to `src/database/SQLiteEngine.ts` using `SUM` and `GROUP BY` for expense categories.
- [ ] 1.2 Add `getMonthlySpendingTrend()` to `src/database/SQLiteEngine.ts` using `strftime` and `GROUP BY` for the last 6 months.
- [ ] 1.3 Create unit tests for `SQLiteEngine` aggregation methods verifying correct sums and groupings with mock data.

## Phase 2: State Management
- [ ] 2.1 Update `src/store/useFinanceStore.ts` to include `reports` state (`CategoryDistribution[]` and `MonthlyTrend[]`).
- [ ] 2.2 Implement `fetchReports()` action in `src/store/useFinanceStore.ts` to orchestrate data fetching from `SQLiteEngine`.
- [ ] 2.3 Verify `fetchReports()` correctly updates the store state through integration tests or logs.

## Phase 3: UI Components
- [ ] 3.1 Create `src/components/charts/ChartCard.tsx` as a generic, styled container for report charts.
- [ ] 3.2 Create `src/components/charts/CategoryPieChart.tsx` using `react-native-chart-kit` for expense distribution.
- [ ] 3.3 Create `src/components/charts/MonthlySpendingBarChart.tsx` using `react-native-chart-kit` for monthly spending trends.

## Phase 4: Screen Integration
- [ ] 4.1 Create `src/screens/ReportsScreen.tsx` with a scrollable layout containing `ChartCard`s.
- [ ] 4.2 Wire `useFinanceStore.fetchReports` to `ReportsScreen` to load data on mount.
- [ ] 4.3 Implement "No Data Available" empty state in `ReportsScreen.tsx` for cases with zero transactions.
- [ ] 4.4 Add loading indicators to `ReportsScreen.tsx` to handle the async fetching state.

## Phase 5: Verification & Polish
- [ ] 5.1 Test performance with > 5,000 transactions to ensure aggregation completes in < 100ms (NFR).
- [ ] 5.2 Verify chart responsiveness and label legibility across different screen sizes.
- [ ] 5.3 Final E2E verification against all scenarios in `openspec/changes/data-visualization/specs/reports-dashboard/spec.md`.

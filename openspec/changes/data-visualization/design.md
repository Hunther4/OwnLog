# Design: Data Visualization

## Technical Approach

The implementation focuses on minimizing JS thread overhead by offloading data aggregation to the SQLite engine. This ensures that even with thousands of transactions, the Reports screen remains responsive on low-end Android devices. We will use `react-native-chart-kit` for rendering SVG-based charts, integrating the app's centralized theme and dynamic category colors.

## Architecture Decisions

### Decision: Database-Side Aggregation

**Choice**: Use `SUM` and `GROUP BY` in SQLite queries.
**Alternatives considered**: Fetching all transactions into the Zustand store and aggregating using JavaScript `.reduce()`.
**Rationale**: Aggregating in JS would block the main thread for large datasets (O(N) complexity in JS), whereas SQLite's indexed aggregation is significantly faster and reduces memory pressure.

### Decision: Charting Library

**Choice**: `react-native-chart-kit` (via `react-native-svg`).
**Alternatives considered**: `Victory Native`, `react-native-gifted-charts`.
**Rationale**: `react-native-chart-kit` provides a lightweight, SVG-based implementation that is easier to style and performs better on low-end devices compared to heavier alternatives.

### Decision: State Management for Reports

**Choice**: On-demand fetching via async actions in `useFinanceStore`.
**Alternatives considered**: Syncing aggregated data in the store during every transaction update.
**Rationale**: Reports are accessed infrequently compared to transaction entries. On-demand fetching avoids unnecessary computation during data entry and ensures reports are always perfectly synced with the DB.

## Data Flow

```
ReportsScreen ──→ useFinanceStore ──→ SQLiteEngine ──→ SQLite DB
       ↑               │                      │
       └───────────────┴──────────────────────┘
               (Aggregated Results)
```

1. `ReportsScreen` mounts and triggers `fetchReports()` in `useFinanceStore`.
2. `useFinanceStore` calls specific aggregation methods in `SQLiteEngine`.
3. `SQLiteEngine` executes `SUM/GROUP BY` queries and returns minimal datasets.
4. `useFinanceStore` updates the local `reports` state.
5. `ReportsScreen` re-renders the charts with the new data.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/database/SQLiteEngine.ts` | Modify | Add `getCategoryDistribution()` and `getMonthlySpendingTrend()` methods. |
| `src/store/useFinanceStore.ts` | Modify | Add `reports` state and `fetchReports()` action. |
| `src/screens/ReportsScreen.tsx` | Create | Main view for financial reports. |
| `src/components/charts/ChartCard.tsx` | Create | Generic styled container for charts. |
| `src/components/charts/CategoryPieChart.tsx` | Create | Implementation of spending distribution pie chart. |
| `src/components/charts/MonthlySpendingBarChart.tsx` | Create | Implementation of monthly spending trend bar chart. |

## Interfaces / Contracts

### Category Distribution Data
```typescript
interface CategoryDistribution {
  nombre: string;
  total: number;
  color: string; // mapped from category.color_hex
}
```

### Monthly Trend Data
```typescript
interface MonthlyTrend {
  month: string; // format: 'MMM' (e.g., 'Jan')
  total: number;
}
```

### SQLite Queries
- **Category Sums**:
  `SELECT c.nombre, c.color_hex, SUM(t.monto) as total FROM transacciones t INNER JOIN categorias c ON t.categoria_id = c.id WHERE c.tipo = 'egreso' AND c.activa = 1 GROUP BY c.id`
- **Monthly Sums**:
  `SELECT strftime('%Y-%m', fecha_local) as month, SUM(monto) as total FROM transacciones t INNER JOIN categorias c ON t.categoria_id = c.id WHERE c.tipo = 'egreso' AND c.activa = 1 GROUP BY month ORDER BY month DESC LIMIT 6`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | SQL Query Logic | Mock `SQLiteDatabase` and verify that `SUM` and `GROUP BY` return expected aggregates for known datasets. |
| Integration | Store $\rightarrow$ DB Flow | Verify `fetchReports()` correctly updates the Zustand state. |
| E2E | Empty State | Ensure the "No Data Available" message appears when the database is empty. |

## Migration / Rollout

No migration required. This is an additive feature.

# Tasks: Performance Optimization

## Phase 1: Re-render Optimization (Priority 1)

- [ ] 1.1 Fix CategoryPicker.tsx (line 15-82) — Wrap component in React.memo, move renderItem (line 25-50) to useCallback
- [ ] 1.2 Fix DashboardHeader in Dashboard.tsx (line 61) — Verify React.memo present, add proper memo dependencies
- [ ] 1.3 Fix TransactionList.tsx root component — Wrap in React.memo, remove inline object props

## Phase 2: Database Query Optimization (Priority 1)

- [ ] 2.1 Fix N+1 Query in SQLiteEngine.ts (line 155-181) — Replace loop with single INSERT OR IGNORE batch
- [ ] 2.2 Add pagination to useFinanceStore.ts hydrate (line 99-101) — Change to load last 100 only with LIMIT 100

## Phase 3: Animation/Shadow Reduction (Priority 2)

- [ ] 3.1 Fix FloatingDock.tsx (lines 401-402, 483, 487) — Reduce elevation to 2, shadowRadius to 4
- [ ] 3.2 Fix Dashboard.tsx shadows — Reduce elevation: 4→2, shadowRadius: 8→4
- [ ] 3.3 Fix calc.tsx shadows (lines 180-237) — Reduce elevation and shadowRadius values

## Phase 4: Verification

- [ ] 4.1 Build and verify no TypeScript/ESLint errors
- [ ] 4.2 Manual test: verify Dashboard loads under 2 seconds
- [ ] 4.3 Manual test: verify no excessive re-renders in DevTools

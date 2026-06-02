# Proposal: code-review-ownlog

## Intent

Realizar una revisión comprehensiva de todo el código fuente en `src/` utilizando el protocolo "judgment day" (dos jueces independientes ciegos) para identificar bugs, problemas de seguridad, issues de performance, y problemas de calidad de código en la aplicación OwnLog.

## Scope

### In Scope

- **Batch 1 - Services**: GoogleDriveService, LocalBackupService, SyncEngine, AuthService, SecurityService, TelemetryService, PerformanceAuditor, DriveSyncService
- **Batch 2 - Store**: useFinanceStore, useBackupStore, useBoundStore, transactionSlice, uiSlice
- **Batch 3 - Repositories**: TransactionRepository, CategoryRepository, ReportRepository, QuickActionRepository, SettingsRepository
- **Batch 4 - Components**: Todos los componentes en `src/components/` (Dashboard, FloatingDock, CategoryPicker, TransactionList, CategoryManager, OnboardingScreen, AddTransactionForm, EmptyState, reports/*)
- **Batch 5 - Database**: SQLiteEngine, schema
- **Batch 6 - Utils + Types**: config, currencyFormatter, haptics, performance, balanceChecksum, exportService, types/*

### Out of Scope

- Revisión de código en `tests/` (unit tests)
- Revisión de archivos de configuración (package.json, tsconfig.json, babel.config.js)
- Revisión de navegación (expo-router)
- Modificación de código (solo revisión, no fixes aquí)

## Capabilities

> Esta propuesta NO introduce nuevas capacidades. Es una revisión de código para validar que las capacidades existentes funcionan correctamente.

### New Capabilities

- Ninguna (pure code review)

### Modified Capabilities

- Ninguna (solo validación)

## Approach

1. **Carga del skill judgment-day**: Utilizar el skill para lanzar dos jueces independientes por cada batch
2. **Revisión ciega**: Cada juez revisa los mismos archivos de forma independiente
3. **Comparación de resultados**:
   - *Confirmed*: Ambos jueces están de acuerdo → issue real
   - *Suspect*: Solo un juez lo encontró → investigar más
   - *Contradiction*: Desacuerdo → re-judge hasta consenso
4. **Clasificación de issues**:
   - CRITICAL: Bug que causa crash, security vuln, data loss
   - WARNING: Code quality, performance, potential bug
   - INFO: Style, minor improvements
5. **Fix confirmado**: Los issues CONFIRMED se pasan a sdd-apply para su corrección

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/services/*` | Review | Batch 1 - 8 archivos |
| `src/store/*` | Review | Batch 2 - 3 archivos + slices |
| `src/repositories/*` | Review | Batch 3 - 5 archivos |
| `src/components/*` | Review | Batch 4 - 14 archivos |
| `src/database/*` | Review | Batch 5 - SQLiteEngine + schema |
| `src/utils/*` + `src/types/*` | Review | Batch 6 - archivos utilitarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Falsos positivos en revisiones | Medium | Requiere consenso de ambos jueces |
| Tiempo excesivo por batch | Medium | Limitar a 2 iterations por batch |
| Issues no reproducibles | Low | Solo marcar confirmed si hay evidencia |

## Rollback Plan

Esta es una revisión de código sin modificación. No hay rollback necesario. Los issues encontrados se documentan para su posterior corrección en cambios separados.

## Dependencies

- **skill: judgment-day**: Debe estar disponible para ejecutar el protocolo de revisión dual

## Success Criteria

- [ ] Batch 1 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Batch 2 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Batch 3 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Batch 4 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Batch 5 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Batch 6 pasa juicio con 0 CRITICALs + 0 confirmed WARNINGs
- [ ] Todos los batches documentados con sus issues respective
- [ ] Issues críticos corregidos en cambios posteriores
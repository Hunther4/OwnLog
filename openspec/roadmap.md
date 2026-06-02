# 🗺️ Master Roadmap: HuntherWallet

This document is the single source of truth for the project progression.

## Current Status: Phase 8 (Cloud Ecosystem)

**Overall Completion: 78%**

| Fase   | Nombre                             | Estado | Descripción Clave                                                                 |
| :----- | :---------------------------------- | :----: | :-------------------------------------------------------------------------------- |
| **1**  | **Cimientos & DB**                 |   ✅   | SQLite Engine, WAL Mode, Esquema V1 y Migraciones.                                |
| **2**  | **Núcleo de Estado**               |   ✅   | Zustand Store, Optimistic Updates y Rollbacks.                                    |
| **3**  | **Navegación & UI Base**           |   ✅   | Expo Router, Layouts, Temas (Light/Dark).                                       |
| **4**  | **Gestión de Finanzas**            |   ✅   | CRUD de Transacciones y Categorías (Soft Delete).                                |
| **5**  | **Inteligencia de Datos**          |   🔄   | Reportes, Gráficos y Agregaciones (Pendiente: Verificación NFR y Polish).      |
| **6**  | **Integridad & Auditoría**         |   ✅   | Balance Checksum y Corrección de Drift.                                         |
| **7**  | **Resiliencia Local**              |   ✅   | Exportación local de DB, VACUUM y mantenimiento.                                |
| **8**  | **Ecosistema Cloud**               |   ✅   | Google Drive API, OAuth2 y Sincronización (En fase de Hardening).                 |
| **9**  | **Secure Rollout & Observability** |   ⏳   | PIN, SHA-256, Remote Monitoring & Rollout Strategy.                               |
| **10** | **Pulido & Performance**           |   ⏳   | Optimización de Listas, Accesibilidad y QA Final.                                |

---

## 📝 Detalle de Ejecución

### Phase 5: Data Intelligence (Pending Polish)

- [x] Implementación de agregaciones en `SQLiteEngine`.
- [x] Integración de Zustand Store.
- [x] Creación de componentes de gráficos.
- [ ] **Pending**: Test de rendimiento con > 5,000 transacciones (< 100ms).
- [ ] **Pending**: Verificación de legibilidad en diversos tamaños de pantalla.

### Phase 7: Local Resilience (Next)

- Focus: Ensure the user never loses data even without internet.
- Key Tasks: `expo-sharing` for DB export, `VACUUM` for disk optimization.

### Phase 8: Cloud Ecosystem

- Focus: Google Drive integration for automatic/manual backups.
- Key Tasks: OAuth2 flow, `VACUUM INTO` snapshots.

### Phase 9: Secure Rollout & Observability

- Focus: Privacy, protection, and production visibility.
- Key Tasks: PIN access, `expo-crypto` for hashing, remote logging integration, and gradual rollout plan.

### Phase 10: Polish & Performance

- Focus: "Production Ready" feel.
- Key Tasks: `FlatList` optimization, accessibility (a11y), final E2E testing.

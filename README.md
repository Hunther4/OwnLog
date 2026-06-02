# OwnLog 💰🇨🇱🇺🇸

> **v1.2.18** (build 10218) · 100% offline personal finance

[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://www.android.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Offline First](https://img.shields.io/badge/offline--first-✓-blueviolet)](#)
[![No Internet Required](https://img.shields.io/badge/internet-not_required-success)](#)

---

## 🇨🇱 Español

**OwnLog** es una app de finanzas personales **offline-first**, diseñada desde cero para funcionar en dispositivos Android de gama baja. Tus datos viven en SQLite local — sin servidores, sin cuentas, sin internet requerida.

### ✨ ¿Por qué OwnLog?

- 🔒 **Privado por diseño** — cero nube, cero telemetría obligatoria
- 📱 **Liviana** — optimizada para Android básico
- ⚡ **Rápida** — `FlatList` virtualizada, modo WAL, import estático
- 🛡️ **Tus datos, tu control** — PIN con SHA-256 × 10 000 iteraciones

### 🆕 Novedades v1.2.18

- 🐛 **7 correcciones** — balance al reset, scroll del dashboard, debounce de Quick Actions, backspace de calculadora, performance audit, fetch de reportes, autocompletar descripción
- 🧭 **FloatingDock** con swipe-up para revelar la barra de navegación inferior (oculta por defecto, peek bar)
- ⚙️ **Settings** con `CollapsibleSection` (accordion colapsable)
- 🚀 **Optimizaciones** — import estático de haptics, 3 nuevos `PRAGMA`, `CategoryPicker` memoizado, haptic optimista al guardar, hidratación en paralelo, `xlsx` lazy, índice parcial `idx_transacciones_active WHERE is_deleted=0`, código muerto eliminado, 8/8 wrappers `BEGIN/COMMIT` reemplazados

---

## 🇺🇸 English

**OwnLog** is an **offline-first** personal finance app, built from the ground up for low-end Android devices. Your data lives in local SQLite — no servers, no accounts, no internet required.

### ✨ Why OwnLog?

- 🔒 **Private by design** — zero cloud, zero mandatory telemetry
- 📱 **Lightweight** — optimized for basic Android
- ⚡ **Fast** — virtualized `FlatList`, WAL mode, static imports
- 🛡️ **Your data, your control** — PIN hashed with SHA-256 × 10 000 iterations

### 🆕 What's new in v1.2.18

- 🐛 **7 bug fixes** — reset balance, dashboard scroll, Quick Actions debounce, calculator backspace, performance audit display, reports fetch, auto-fill description
- 🧭 **FloatingDock** with swipe-up to reveal the bottom navigation bar (hidden by default, peek bar visible)
- ⚙️ **Settings** with `CollapsibleSection` accordion
- 🚀 **Optimizations** — static haptics import, 3 new `PRAGMA`s, memoized `CategoryPicker`, optimistic haptic on save, parallel hydration, lazy `xlsx`, partial index `idx_transacciones_active WHERE is_deleted=0`, dead code removed, 8/8 `BEGIN/COMMIT` wrappers eliminated

---

## 📋 Features / Funcionalidades

| ES | EN | |
|---|---|---|
| 💰 Transacciones | 💰 Transactions | Ingresos y gastos · income & expenses |
| 📊 Presupuestos | 📊 Budgets | Límites mensuales por categoría · monthly limits per category |
| 🏷️ Categorías | 🏷️ Categories | 10 predeterminadas + personalizadas · 10 default + custom |
| 📈 Reportes | 📈 Reports | Gráficos y estadísticas · charts & stats |
| 🌙 Temas | 🌙 Themes | Claro · Oscuro · Púrpura · light · dark · purple |
| ⚡ Quick Actions | ⚡ Quick Actions | Gastos frecuentes en 1 tap · frequent expenses in 1 tap |
| 🧭 FloatingDock | 🧭 FloatingDock | Swipe-up nav · swipe-up navigation reveal |
| 🔐 PIN local | 🔐 Local PIN | SHA-256 × 10 000 iter · SHA-256 × 10 000 iters |
| 📤 Exportar XLSX | 📤 XLSX Export | Lazy load · lazy-loaded |
| 🗑️ Soft delete | 🗑️ Soft delete | Con índice parcial · with partial index |

---

## 🧱 Tech Stack

| Capa / Layer | Tecnología / Tech |
|---|---|
| Framework | React Native `0.81.5` + Expo SDK `54` |
| Routing | `expo-router` `6.0` (file-based) |
| Language | TypeScript `5.9` |
| Database | `expo-sqlite` `16` (WAL mode, INTEGER amounts) |
| State | `zustand` `5` (optimistic + rollback) |
| UI | NativeWind (Tailwind CSS) + Reanimated `4` |
| Lists | `FlatList` virtualizado |
| Crypto | `expo-crypto` (SHA-256), `expo-secure-store` |
| Errors | `@sentry/react-native` (optional) |
| Export | `xlsx` (lazy) |

---

## 📥 Download APK / Descargar APK

### 🇨🇱 Español

**Opción 1 — Instalar APK pre-compilado (recomendado):**

1. Descarga desde [Releases → v1.2.18](https://github.com/Hunther4/OwnLog/releases/download/v1.2.18/ownlog-v1.2.18-build10218.apk)
   *(139 MB)*
2. En tu Android: **Ajustes → Seguridad → Instalar apps desconocidas** → permitir tu navegador
3. Abre el `.apk` y toca **Instalar**
4. No requiere internet en ningún momento

**Opción 2 — Compilar desde código fuente:**

```bash
git clone https://github.com/Hunther4/OwnLog.git
cd OwnLog
npm install
cd android && ./gradlew assembleRelease
# APK en: android/app/build/outputs/apk/release/ownlog-v1.2.18-build10218.apk
```

> ☝️ **Tip**: para un dev build con hot-reload, usa `npx expo run:android`.

### 🇺🇸 English

**Option 1 — Install pre-built APK (recommended):**

1. Download from [Releases → v1.2.18](https://github.com/Hunther4/OwnLog/releases/download/v1.2.18/ownlog-v1.2.18-build10218.apk)
   *(139 MB)*
2. On your Android device: **Settings → Security → Install unknown apps** → allow your browser
3. Open the `.apk` and tap **Install**
4. No internet connection required at any point

**Option 2 — Build from source:**

```bash
git clone https://github.com/Hunther4/OwnLog.git
cd OwnLog
npm install
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/ownlog-v1.2.18-build10218.apk
```

> ☝️ **Tip**: for a dev build with hot-reload, use `npx expo run:android`.

---

## 🛠️ Installation & Setup / Instalación

```bash
# 1. Clone / Clonar
git clone https://github.com/Hunther4/OwnLog.git && cd OwnLog

# 2. Install deps / Instalar dependencias
npm install

# 3. Start dev server / Iniciar dev
npx expo start
```

**Sin variables de entorno requeridas** · **No environment variables required** — v1.2.18 es 100% offline.

---

## 📁 Project Structure / Estructura

```
OwnLog/
├── app/                      # expo-router (file-based)
│   ├── (tabs)/               # Dashboard, transactions, reports, settings
│   ├── add-transaction.tsx   # Alta de movimiento
│   └── _layout.tsx           # Root layout (FloatingDock vive aquí)
├── src/
│   ├── components/           # CollapsibleSection, FloatingDock, CategoryPicker
│   ├── database/             # SQLite init · PRAGMAs · schema · migraciones
│   ├── repositories/         # Capa de acceso a datos
│   ├── services/             # Export XLSX, backup/restore atómico
│   ├── store/                # Zustand stores (con optimistic + rollback)
│   ├── utils/                # crypto, formatters, haptics (static import)
│   ├── theme/                # Tokens light/dark/purple
│   └── types/                # Tipos compartidos
├── android/                  # Proyecto nativo Android (gradle)
├── assets/                   # Iconos, fuentes
├── AGENTS.md                 # Convenciones de código para IAs
├── eas.json                  # Perfiles de build EAS
└── package.json
```

---

## ⚡ Performance Optimizations / Optimizaciones de Rendimiento

Pensado para un Moto E13 con 2 GB de RAM. **No shortcuts.**

| Optimización | Impacto | Dónde |
|---|---|---|
| `FlatList` con `initialNumToRender` / `maxToRenderPerBatch` / `windowSize` | 🟢 Memoria estable con miles de tx | `app/(tabs)/` |
| **Nunca** `FlatList` dentro de `ScrollView` | 🟢 Virtualización preservada | AGENTS.md |
| Modo `PRAGMA journal_mode = WAL` | 🟢 Lecturas no bloquean escrituras | `src/database/` |
| `PRAGMA synchronous = FULL` + `temp_store = MEMORY` + `cache_size = -2000` + `wal_autocheckpoint = 4000` | 🟢 4 PRAGMAs optimizados | `src/database/schema.ts` |
| Import **estático** de `expo-haptics` (no dynamic) | 🟢 Sin round-trip JS↔native | `src/utils/haptics` |
| `CategoryPicker` memoizado | 🟢 Evita re-renders del form al escribir monto | `src/components/` |
| Hidratación **paralela** del store (Promise.all + getMany) | 🟢 Cut startup time | `src/store/useBoundStore.ts` |
| `xlsx` **lazy-loaded** | 🟢 No se paga hasta que exportas | `src/utils/exportService.ts` |
| Índice parcial `idx_transacciones_active WHERE is_deleted = 0` | 🟢 Queries sobre activas saltan borradas | `src/database/schema.ts` |
| Haptic optimista al guardar (UI responde antes que SQLite) | 🟡 Latencia percibida ↓ | `src/components/AddTransactionForm.tsx` |
| Montos como `INTEGER` (1 = 1 peso) | 🟢 Cero drift de punto flotante | AGENTS.md |
| Código muerto removido + 8/8 `BEGIN/COMMIT` → 1 wrapper | 🟢 Bundle más pequeño, semántica consistente | `src/repositories/` |
| Touch targets ≥ 44 × 44 dp + `allowFontScaling` | 🟢 Accesibilidad | AGENTS.md |

---

## 🔐 Security & Privacy / Seguridad y Privacidad

| Pilar | Implementación | Referencia |
|---|---|---|
| **Offline-first** | Cero internet requerida para funcionalidad core | AGENTS.md |
| **PIN hasheado** | SHA-256 × **10 000** iteraciones (`expo-crypto`) | AGENTS.md |
| **Almacenamiento seguro** | `expo-secure-store` para secretos / recovery key | `src/utils/` |
| **Recovery Key soberana** | Generada **localmente**, nunca se sube a ningún server | AGENTS.md |
| **Montos enteros** | `INTEGER` en SQLite — sin floats, sin drift | AGENTS.md |
| **Integridad de DB** | `PRAGMA integrity_check` antes de reemplazar la DB | AGENTS.md |
| **Restore atómico** | Backup `.bak` antes de swap de DB | AGENTS.md |
| **Sin secrets en código** | `.env` + `.gitignore` — sin Client IDs hardcoded | AGENTS.md |
| **Sin telemetría obligatoria** | Sentry es opcional y desactivable | `app.json` |

> 🇨🇱 Tus datos no salen de tu teléfono. Punto.
> 🇺🇸 Your data never leaves your phone. Period.

---

## 🗺️ Changelog / Roadmap

| Versión | Highlights |
|---|---|
| **v1.2.18** (build 10218) | 7 bug fixes · FloatingDock · CollapsibleSection · 3 nuevos `PRAGMA` · índice parcial · lazy xlsx · 8/8 BEGIN/COMMIT unificados |
| v1.2.x | Optimistic updates + rollback en Zustand · soporte de 3 temas |
| v1.1.x | Reportes y gráficos · export XLSX |
| v1.0.x | Transacciones, categorías, presupuestos, PIN local |

Próximamente · Coming next: gráficos con Skia, búsqueda full-text (FTS5) en transacciones, widget de Android, themes personalizables por el usuario.

---

## 📷 Screenshots

> Próximamente · Coming soon — `assets/screenshots/` está reservado.
> Pull requests con capturas bienvenidos 🤝

---

## 🤝 Contributing

Lee [`AGENTS.md`](AGENTS.md) antes de abrir un PR. Reglas duras:

- Conventional Commits · sin `Co-authored-by:` de IA
- `FlatList` para listas · nunca `.map()`
- `INTEGER` para dinero · nunca `float`
- `PRAGMA journal_mode = WAL` siempre activo

---

## ⚖️ License

[MIT](LICENSE) © 2024-2026 Hunther4

---

<p align="center">
  Hecho con ❤️ en 🇨🇱 · Made with ❤️ in 🇨🇱
</p>

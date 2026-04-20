# OwnLog 🇨🇱 🇺🇸

---

## 🇨🇱 Español

**OwnLog** es una app de finanzas personales **offline-first**, diseñada para dispositivos Android de gama baja.

### ¿Por qué OwnLog?

- Sin internet requerida
- Base de datos local SQLite (modo WAL)
- Liviana y rápida en dispositivos básicos
- Privada: tus datos se quedan en tu teléfono

### Features

| Feature | Descripción |
|---------|-------------|
| 💰 Transacciones | Ingresos y gastos registrados |
| 📊 Presupuestos | Límites mensuales por categoría |
| 🏷️ Categorías | 10 categorías + personalizadas |
| 📈 Reportes | Gráficos y estadísticas |
| ☁️ Cloud Backup | Respaldo en Google Drive |
| 🌙 Temas | Claro / Oscuro / Púrpura |
| ⚡ Quick Actions | Gastos frecuentes en 1 tap |

### Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Database:** expo-sqlite (WAL mode)
- **State:** Zustand
- **UI:** NativeWind + Expo Router

---

## 🇺🇸 English

**OwnLog** is an **offline-first** personal finance app, designed for low-end Android devices.

### Why OwnLog?

- No internet required
- Local SQLite database (WAL mode)
- Lightweight and fast on basic devices
- Private: your data stays on your phone

### Features

| Feature | Description |
|---------|-------------|
| 💰 Transactions | Income and expenses recorded |
| 📊 Budgets | Monthly limits per category |
| 🏷️ Categories | 10 categories + custom |
| 📈 Reports | Charts and statistics |
| ☁️ Cloud Backup | Backup to Google Drive |
| 🌙 Themes | Light / Dark / Purple |
| ⚡ Quick Actions | Frequent expenses in 1 tap |

### Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Database:** expo-sqlite (WAL mode)
- **State:** Zustand
- **UI:** NativeWind + Expo Router

---

## 🇨🇱 Español — Cómo Instalar

### Requisitos Previos

1. **Google Cloud Console:** Crear un proyecto y obtener un **OAuth Client ID**
2. **Configurar OAuth:** Agregar el hash SHA-1 del keystore de firma

### Instalación

```bash
npm install
```

### Configuración

Crear archivo `.env` en la raíz del proyecto:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

**Nota:** El archivo `.env` está en `.gitignore` — no se subirá a GitHub.

### Desarrollo

```bash
npx expo start
```

### Build Producción (APK)

```bash
npx eas build -p android --profile production
```

---

## 🇺🇸 English — How to Install

### Prerequisites

1. **Google Cloud Console:** Create a project and get an **OAuth Client ID**
2. **Configure OAuth:** Add your signing keystore's SHA-1 hash

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

**Note:** The `.env` file is in `.gitignore` — it won't be pushed to GitHub.

### Development

```bash
npx expo start
```

### Production Build (APK)

```bash
npx eas build -p android --profile production
```

---

## 📷 Screenshots

Próximamente / Coming soon.

---

## ⚖️ License

MIT License — ver archivo LICENSE
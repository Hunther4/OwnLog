# OwnLog 🇪🇸 🇺🇸

---

## 🇪🇸 Español

**Nombre / Name:** OwnLog

**Descripción / Description:** App de finanzas personales offline-first, diseñada para dispositivos Android de gama baja. / Offline-first personal finance app designed for low-end Android devices.

**Por qué OwnLog? / Why OwnLog?**

- Sin internet requerida / No internet required
- Base de datos local SQLite (modo WAL) / Local SQLite database (WAL mode)
- Liviana y rápida en dispositivos básicos / Lightweight and fast on basic devices
- Privada: tus datos se quedan en tu teléfono / Private: your data stays on your phone

---

## 🇺🇸 English

**Nombre / Name:** OwnLog

**Descripción / Description:** App de finanzas personales offline-first, diseñada para dispositivos Android de gama baja. / Offline-first personal finance app designed for low-end Android devices.

**Por qué OwnLog? / Why OwnLog?**

- Sin internet requerida / No internet required
- Base de datos local SQLite (modo WAL) / Local SQLite database (WAL mode)
- Liviana y rápida en dispositivos básicos / Lightweight and fast on basic devices
- Privada: tus datos se quedan en tu teléfono / Private: your data stays on your phone

---

## 🇪🇸 Español — Features

| Feature | Descripción |
|---------|-------------|
| 💰 Transacciones | Ingresos y gastos registrados / Income and expenses recorded |
| 📊 Presupuestos | Límites mensuales por categoría / Monthly limits per category |
| 🏷️ Categorías | 10 categorías + personalizadas / 10 categories + custom |
| 📈 Reportes | Gráficos y estadísticas / Charts and statistics |
| ☁️ Cloud Backup | Respaldo en Google Drive / Backup to Google Drive |
| 🌙 Temas | Claro / Oscuro / Púrpura / Light / Dark / Purple |
| ⚡ Quick Actions | Gastos frecuentes en 1 tap / Frequent expenses in 1 tap |

---

## 🇺🇸 English — Features

| Feature | Description |
|---------|-------------|
| 💰 Transactions | Ingresos y gastos registrados / Income and expenses recorded |
| 📊 Budgets | Límites mensuales por categoría / Monthly limits per category |
| 🏷️ Categories | 10 categorías + personalizadas / 10 categories + custom |
| 📈 Reports | Gráficos y estadísticas / Charts and statistics |
| ☁️ Cloud Backup | Respaldo en Google Drive / Backup to Google Drive |
| 🌙 Themes | Claro / Oscuro / Púrpura / Light / Dark / Purple |
| ⚡ Quick Actions | Gastos frecuentes en 1 tap / Frequent expenses in 1 tap |

---

## 🇪🇸 Español — Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Database:** expo-sqlite (WAL mode)
- **State:** Zustand
- **UI:** NativeWind + Expo Router

---

## 🇺🇸 English — Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Database:** expo-sqlite (WAL mode)
- **State:** Zustand
- **UI:** NativeWind + Expo Router

---

## 🇪🇸 Español — Cómo usar

### Requisitos previos

1. **Google Cloud Console:** Crear un proyecto y obtener un **OAuth Client ID**
2. **Configurar OAuth:** Agregar el hash SHA-1 del keystore de firma

### Instalar / Install

```bash
npm install
```

### Configuración

Crear archivo `.env` en la raíz del proyecto:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

Ejemplo:
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=967360905724-u1ibo9sep2sg0e8m2ng9o8736pfersrb.apps.googleusercontent.com
```

**Nota:** El archivo `.env` está en `.gitignore` — no se subirá a GitHub.

### Desarrollo / Development

```bash
npx expo start
```

### Build Producción APK / Production Build

```bash
npx eas build -p android --profile production
```

---

## 🇺🇸 English — How to Use

### Prerequisites

1. **Google Cloud Console:** Create a project and get an **OAuth Client ID**
2. **Configure OAuth:** Add your signing keystore's SHA-1 hash

### Install

```bash
npm install
```

### Configuration

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

Example:
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=967360905724-u1ibo9sep2sg0e8m2ng9o8736pfersrb.apps.googleusercontent.com
```

**Note:** The `.env` file is in `.gitignore` — it won't be pushed to GitHub.

### Desarrollo / Development

```bash
npx expo start
```

### Build Producción APK / Production Build

```bash
npx eas build -p android --profile production
```

---

## 📷 Screenshots

Coming soon / Próximamente.

```
┌─────────────────────────┐
│      OwnLog App        │
│   ┌───────────────┐    │
│   │   💰 $150.000 │    │
│   └───────────────┘    │
│                         │
│  🚌 Bus    🍔 Almuerzo │
│  🛒 Súper   ☕ Café    │
└─────────────────────────┘
```

---

## ⚖️ License

MIT License — ver archivo LICENSE / see LICENSE file
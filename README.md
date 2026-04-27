# 📸 FinSnap - Snapshot Your Spending, Archive Your Life.

[![React Native](https://img.shields.io/badge/React_Native-v0.76-blue.svg?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-black.svg?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**FinSnap** (formerly MyLocketFinance) is a visual-first expense tracking mobile application inspired by the minimalist aesthetic of **Locket**. Unlike traditional finance apps that focus on cold numbers and spreadsheets, FinSnap turns every transaction into a visual memory, helping you manage your budget through the lens of your life.

---

## ✨ Key Features

### 📸 Pro Camera Interface
- **Native-feel Experience:** Built with `expo-camera` for high-performance capturing.
- **Precision Zoom:** Full support for **0.5x Ultra-wide**, 1x, and digital zoom.
- **Smart Focus:** Custom animated focus rings with haptic feedback.
- **Quick Snap:** Designed for speed—capture the receipt or the item in under 2 seconds.

### 📅 Smart Calendar Stacks
- **Visual Grouping:** Transactions are automatically grouped into "Stacks" by Album/Tag.
- **Interactive Stacks:** Tap on a stack (e.g., *Emart* or *Travel*) to "unfold" the detailed history of that day.
- **Deep Dark Mode:** A sleek, unified interface optimized for OLED screens.

### 🌍 Global Finance Engine
- **Live Exchange Rates:** Real-time synchronization using Open Exchange Rates API.
- **Smart Conversion:** Automatically converts foreign currencies to your base currency while maintaining precision to avoid floating-point errors.
- **Multi-Currency Support:** Track spending in VNĐ, USD, EUR, and more.

### 📁 Aesthetic Organization
- **Visual Albums:** Organize spending into custom albums like "Daily Grocery", "Coffee Time", or "Paris Trip".
- **Quick Tagging:** Create and assign new albums directly from the camera preview.

---

## 🏗️ Architecture & Technical Stack

FinSnap is built with a **Modular Feature-based Architecture**, prioritizing scalability and clean code:

- **Frontend:** React Native (Expo SDK 52)
- **Routing:** Expo Router (File-based routing)
- **Database:** SQLite (via `expo-sqlite`) for local-first, private data storage.
- **State Management:** React Hooks & Context API.
- **Interactions:** `react-native-reanimated` & `expo-haptics` for premium feel.

npx expo start -c

npx eas-cli update --branch production --platform ios --message "updated"

### Project Structure
```
MyLocketFinance
├─ app
│  ├─ (tabs)
│  │  ├─ calendar.tsx
│  │  ├─ explore.tsx
│  │  ├─ index.tsx
│  │  ├─ settings.tsx
│  │  └─ _layout.tsx
│  ├─ modal.tsx
│  └─ _layout.tsx
├─ app.json
├─ assets
│  └─ images
│     ├─ favicon.png
│     ├─ icon.png
│     ├─ partial-react-logo.png
│     ├─ react-logo.png
│     ├─ react-logo@2x.png
│     ├─ react-logo@3x.png
│     └─ splash-icon.png
├─ components
│  ├─ external-link.tsx
│  ├─ haptic-tab.tsx
│  ├─ hello-wave.tsx
│  ├─ parallax-scroll-view.tsx
│  ├─ themed-text.tsx
│  ├─ themed-view.tsx
│  └─ ui
│     ├─ collapsible.tsx
│     ├─ icon-symbol.ios.tsx
│     └─ icon-symbol.tsx
├─ constants
│  └─ theme.ts
├─ eas.json
├─ eslint.config.js
├─ hooks
│  ├─ use-color-scheme.ts
│  ├─ use-color-scheme.web.ts
│  └─ use-theme-color.ts
├─ package-lock.json
├─ package.json
├─ README.md
├─ scripts
│  └─ reset-project.js
├─ src
│  ├─ api
│  ├─ components
│  │  ├─ common
│  │  ├─ features
│  │  │  ├─ calendar
│  │  │  └─ camera
│  │  │     ├─ CameraControls.tsx
│  │  │     ├─ CameraViewfinder.tsx
│  │  │     ├─ ExpenseForm.tsx
│  │  │     └─ TagPickerModal.tsx
│  │  ├─ navigation
│  │  │  └─ CustomTabBar.tsx
│  │  └─ services
│  │     ├─ database.ts
│  │     └─ settings_db.ts
│  ├─ screens
│  │  ├─ CalendarScreen.tsx
│  │  ├─ CameraModalScreen.tsx
│  │  ├─ Home.tsx
│  │  ├─ SettingScreen.tsx
│  │  └─ TagList.tsx
│  └─ types
│     └─ index.ts
└─ tsconfig.json

```
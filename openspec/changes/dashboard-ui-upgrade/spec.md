# SPEC: Dashboard UI/UX Premium Upgrade

**Status**: ready

**Artifact Store**: engram

**Topic Key**: sdd/dashboard-ui-upgrade/spec

---

## 1. Resumen Ejecutivo

Esta especificación define la transformación del Dashboard de HuntherWallet hacia una interfaz PREMIUM que transmite sofisticación y calidad palpable. Se establece un sistema de color con acentos sutiles, jerarquía tipográfica donde el dinero es el protagonista, espaciado generoso, y componentes redesignados para sentirse como una tarjeta bancaria de alta gama. Todo diseñado para dispositivos Android de 3-4GB RAM sin efectos pesados.

---

## 2. Color System Premium

### 2.1 Requisitos del Sistema de Color

**MUST** existir una paleta completa y distintiva para CADA tema (light, dark, purple).

**MUST** cada tema tener su propia paleta premium que afecte TODAS las ventanas (Dashboard, Transactions, Settings, etc.).

**MUST** los colores de cada tema ser suficientemente contrastantes entre sí para garantizar legibilidad.

**MUST** el color de acento utilizarse en no más de 3 lugares del Dashboard (balance, botón principal, ícono de acciones rápidas).

**MUST** los colores transmitir sofisticación mediante saturación baja (no neon, no saturados).

**SHALL** preservarse la compatibilidad con los 3 temas existentes (light, dark, purple).

### 2.2 Paletas por Tema (COMPLETAS Y DISTINTIVAS)

#### Light Mode (Fondo Claro)

| Elemento       | Color              | Descripción                 |
| -------------- | ------------------ | --------------------------- |
| Background     | `#F8FAFC`          | Off-white sutil             |
| Card Surface   | `#FFFFFF`          | Blanco puro                 |
| Text Primary   | `#0F172A`          | Slate 900 - alto contraste  |
| Text Secondary | `#64748B`          | Slate 500 - legible         |
| **Acento**     | `#6366F1` (Indigo) | Indigo vibrate pero no neon |
| Ingresos       | `#16A34A`          | Green 600 - verde profundo  |
| Egresos        | `#DC2626`          | Red 600 - rojo definido     |
| Border/Divider | `#E2E8F0`          | Slate 200 - sutil           |

#### Dark Mode (Fondo Oscuro)

| Elemento       | Color                    | Descripción                         |
| -------------- | ------------------------ | ----------------------------------- |
| Background     | `#09090B`                | Zinc 950 - noir profundo            |
| Card Surface   | `#18181B`                | Zinc 900                            |
| Text Primary   | `#FAFAFA`                | White - máximo contraste            |
| Text Secondary | `#A1A1AA`                | Zinc 400 - legible sobre negro      |
| **Acento**     | `#818CF8` (Indigo Light) | Indigo claro que brilla sobre negro |
| Ingresos       | `#4ADE80`                | Green 400 - verde brillante         |
| Egresos        | `#F87171`                | Red 400 - rojo brillante            |
| Border/Divider | `#27272A`                | Zinc 800 - sutil                    |

#### Purple Mode (Fondo Púrpura - DISTINTIVO)

| Elemento       | Color              | Descripción                    |
| -------------- | ------------------ | ------------------------------ |
| Background     | `#0F0A1A`          | Purple 950 - base oscura       |
| Card Surface   | `#1A142E`          | Purple 900 - superficie        |
| Text Primary   | `#F5D0FE`          | Lavender 200 - white/lavanda   |
| Text Secondary | `#C4B5FD`          | Violet 300 - pastel legible    |
| **Acento**     | `#C084FC` (Purple) | Purple 400 - distintivo violet |
| Ingresos       | `#4ADE80`          | Green 400 - consistencia       |
| Egresos        | `#FB7185`          | Rose 400 - rose柔和            |
| Border/Divider | `#3B0764`          | Purple 800 - sutil             |

**REQUISITO**: El color de acento SOLO aparece en:

1. El valor numérico del BalanceWidget (highlight sutil)
2. El botón principal "+ Agregar Transacción"
3. Un ícono de edición o indicador visual mínimo

**NO DEBE** tener acentos en: bordes de todas las tarjetas, fondos de iconos, etc.

**IMPORTANTE**: El accent DEBE resaltar sobre el background - no blendearse. En Purple mode, el accent es violet/purple para diferenciarse del fondo.

### 2.3 Bordes y Divisores

**MUST** usar `borderColor` con opacidad reducida (ej: `palette.textSecondary + '15'` o `rgba(0,0,0,0.06)`).

**SHALL** evitar bordes visibles强 (fuertes) — usar líneas sutiles de 0.5px a 1px.

---

## 3. Typography Scale

### 3.1 Jerarquía Tipográfica

| Nivel                  | Uso                       | Tamaño  | Weight         | Color                 |
| ---------------------- | ------------------------- | ------- | -------------- | --------------------- |
| **Balance**            | Saldo total               | 36-38px | 700 (Bold)     | Acento o Text Primary |
| **Label**              | "Saldo Total", "Ingresos" | 13-14px | 500 (Medium)   | Text Secondary        |
| **Quick Action Label** | Nombre de acción rápida   | 15px    | 600 (SemiBold) | Text Primary          |
| **Body**               | Descripción transacciones | 14-15px | 400 (Regular)  | Text Primary          |
| **Caption**            | Fecha, hora               | 12px    | 400            | Text Secondary        |

**MUST** el valor del balance ser el elemento más prominente visualmente.

**SHALL** usar `fontVariant: ['tabular-nums']` si está disponible para que los números no oscilen al cambiar.

### 3.2 Números de Dinero

**MUST** los números de dinero usar un tamaño de fuente entre 36px y 38px (solo un poco más grande que el actual 32px).

**MUST** el color del balance usar el color de acento con opacidad completa O texto primario con peso bold.

**MUST** el formato de moneda usar separador de miles visible (ej: "$ 1.234.567").

---

## 4. Spacing & Layout

### 4.1 Sistema de Espaciado Unificado

**MUST** usar múltiplos de 4px para todo espaciado (4, 8, 12, 16, 20, 24, 32, 40, 48).

**MUST** el padding interno de tarjetas ser 18-20px (solo un poco más grande que los actuales 16px).

**MUST** la separación entre secciones ser 20-24px mínimo (solo un poco más grande).

**MUST** la separación entre items de lista ser 12px.

### 4.2 Distribución Vertical

```
[BalanceWidget]           margin-bottom: 24px
[Resumen Mensual]         margin-bottom: 24px
[Botón Agregar]           margin-bottom: 24px
[Accesos Rápidos]         margin-bottom: 16px
[Sección Títulos]         margin-top: 24px
[Lista Transacciones]     gap: 12px
```

**SHALL** no haver desperdicio de espacio vertical — cada pixel debe tener función.

---

## 5. Componentes Específicos

### 5.1 BalanceWidget

**MUST** presentarse como una "tarjeta bancaria premium" — superficie limpia, sin clutter.

**MUST** tener:

- Border radius: 20-24px (no 24px, mantener proporción)
- Shadow sutil (elevation: 2-3, no 4)
- Padding interno: 20px (solo un poco más grande)
- El label arriba, el valor centrado y grande

**SHALL NO** tener gradient de fondo — superficie sólida.

**EJEMPLO VISUAL**:

```
┌────────────────────────────┐
│    Saldo Total             │  ← Label (14px, secondary)
│                            │
│      $ 1.234.567           │  ← Value (36-38px, bold, accent)
│                            │
└────────────────────────────┘
```

### 5.2 QuickActions (Accesos Rápidos)

**MUST** los íconos/emoji tener tamaño de 22-24px (solo un poco más grande que los actuales 20px).

**MUST** el touch target mínimo ser 44x44px.

**MUST** las tarjetas de acción rápida tener:

- Padding: 14-16px (solo un poco más grande)
- Border radius: 16px
- Un border sutil (1px, opacity reducida)

**SHALL** el emoji/ícono estar alineado a la izquierda con el label.

**SHALL** el monto estar alineado a la derecha, con formato de moneda claro.

### 5.3 Transacciones (Lista)

**MUST** cada item de transacción mostrar:

- Emoji/Categoría (22-24px) | Descripción + Fecha (stacked) | Monto (derecha)

**MUST** el monto usar colores distintos para ingreso (green sutil) y egreso (red sutil).

**MUST** la fecha aparecer en caption secondary debajo de la descripción.

**SHALL** no mostrar líneas divisorias entre items — usar spacing.

---

## 6. Detalles Palpables (Premium Feel)

### 6.1 Bordes y Superficies

**MUST** todas las tarjetas tener border sutil: `borderWidth: 1`, `borderColor: 'rgba(0,0,0,0.06)'`.

**MUST** el color del border adaptarse al tema (más claro en dark, más sutil en purple).

### 6.2 Estados de Componentes

**MUST** el estado "presionado" usar:

- Opacidad reducida (0.7) O
- Escala mínima (0.98) — NO ambas juntas

**MUST** el estado "deshabilitado" usar opacidad 0.4.

**SHALL** tener feedback háptico preserved — no remover por temas visuales.

### 6.3 Animaciones (Funcionales, No Placebo)

**MUST** las animaciones ser mínimas y funcionales:

- Fade-in de 200ms al cargar componentes (solo la primera vez)
- Press feedback instantáneo (sin delay)

**MUST NOT** tener:

- Animaciones de "entrada" que duran más de 300ms
- Animaciones de "carga" que no indican progreso real
- Transiciones que distraen

**EJEMPLO CORRECTO**: `FadeIn.duration(200)` en el BalanceWidget — indica que cargó, no distrae.

### 6.4 Undefined / Estados Vacíos

**MUST** los estados vacíos ("Sin transacciones") usar:

- Icono centrado (emoji grande: 48px)
- Texto secondary claro
- Sin decoración adicional

**SHALL** ser clean, no tener "illustrations" que ocupen espacio.

---

## 7. Restricciones Técnicas

### 7.1 Rendimiento (Low-End Android)

**MUST** mantener `FlatList` con `initialNumToRender: 10`, `maxToRenderPerBatch: 10`.

**MUST NOT** usar `BlurView` o glassmorphism.

**MUST NOT** usar animaciones que requieran frameskip o causen jank.

**MUST** preservarse `allowFontScaling={true}` en todos los Text components.

### 7.2 Accesibilidad

**MUST** mantener contraste mínimo 4.5:1 para texto secundario, 7:1 para texto primario.

**MUST** preservarse el soporte de haptic feedback en todos los botones.

---

## 8. Escenarios de Prueba

### Scenario: Visualización del Balance Premium

- GIVEN el usuario tiene transacciones registradas
- WHEN abre el Dashboard
- THEN ve el BalanceWidget con valor prominente (36-38px), label sutil arriba
- AND el color de acento está presente solo en el número del balance

### Scenario: Accesos Rápidos en Pantalla Chica

- GIVEN el usuario tiene 4 acciones rápidas configuradas
- WHEN visualiza el Dashboard
- THEN ve 2x2 grid con spacing parejo (18-20px)
- AND cada card tiene border sutil y padding uniforme

### Scenario: Transacción Reciente Visible

- GIVEN existe una transacción de egreso de $500
- WHEN se muestra en la lista
- THEN muestra emoji de categoría (22-24px), descripción, fecha abajo
- AND monto en rojo sutil a la derecha

### Scenario: Loading State del Dashboard

- GIVEN la app está inicializando
- WHEN muestra el esqueleto
- THEN muestra el BalanceWidget con ActivityIndicator
- AND mantiene el layout final para evitar layout shift

### Scenario: Touch Feedback en QuickAction

- GIVEN el usuario toca una tarjeta de acción rápida
- WHEN presiona
- THEN recibe haptic feedback (impact medium)
- AND ve reducción de opacidad a 0.7

---

## 9. Criterios de Aceptación Visual

| Criterio                   | Validación                               |
| -------------------------- | ---------------------------------------- |
| El dinero se ve importante | Balance 36-38px, bold, central           |
| Colores controlados        | 3 paletas completas (light/dark/purple)  |
| Espaciado generoso         | Padding 18-20px en cards                 |
| Sin ruido visual           | Sin borders fuertes, sin decorations     |
| Touch feedback claro       | Haptic + feedback visual presente        |
| Funcional sin distractión  | Animaciones < 300ms, solo cuando aportan |

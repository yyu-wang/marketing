# Mobile Adaptation Design

**Date:** 2026-07-21
**Approach:** Adaptive Components + Device Detection (Option C)

---

## Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

---

## 1. Device Detection Composable

**New file:** `src/composables/useDevice.ts`

- Reactive detection via `window.matchMedia('(max-width: 767px)')`
- Exports `isMobile`, `isTablet`, `isDesktop` (computed refs)
- Resize listener cleaned up in `onBeforeUnmount`
- Used only when CSS can't handle the adaptation (conditional rendering, JS logic branches)

---

## 2. Layout & Navigation

### AppLayout (`src/components/layout/AppLayout.vue`)

- Keeps existing: starry background + offline banner + `<RouterView />`
- **New (mobile):** Conditionally renders `MobileTabBar` at bottom when `isMobile` is true
- TabBar height: 56px + `env(safe-area-inset-bottom)`

### MobileTabBar (`src/components/layout/MobileTabBar.vue`, new)

- 4 tabs: Chat (`/`), Dashboard (`/dashboard`), Projects (`/projects`), Profile (dropdown)
- Active state via `route.path`
- Glass effect background (`backdrop-filter: blur`)

### ChatView (`src/views/ChatView.vue`)

- Existing: hamburger button + overlay sidebar (already has `@media (max-width: 768px)`)
- Tweak: sidebar width on mobile → `width: 85vw; max-width: 300px`

### AdminLayout (`src/components/layout/AdminLayout.vue`)

- Mobile: sidebar collapses to a slide-out drawer triggered by hamburger button in a top header bar
- Main content padding reduced to `16px`

---

## 3. Page-Level Adaptations

### ChatView + ChatInput + MessageList + MessageBubble

- MessageList padding: `24px → 16px 12px`
- ChatInput: remove `max-width: 1000px`, reduce padding, advanced options stack vertically
- Hero title: `30px → 22px` on mobile
- User message bubble max-width: `66.67% → 85%` on mobile
- Sidebar list item touch area ≥ 44px

### DashboardView

- ECharts height: `380px → 240px`, legend at bottom
- Stat card value font-size: `42px → 28px`
- Table: wrap with `overflow-x: auto` for horizontal scroll

### ProjectsView / ProjectDetailView

- Grid already collapses to single column at 768px
- Toolbar wraps on mobile (channel filter + sort + batch delete)
- Copy card action buttons: touch area ≥ 44px
- Dialog width on mobile → fullscreen (via global override)

### LoginView / RegisterView

- Card padding: `48px 40px → 32px 24px` on mobile
- `max-width: 440px` with `margin: 0 16px` keeps it centered

### Admin Pages

- Sidebar → top nav bar or drawer
- Tables wrapped with `overflow-x: auto`

---

## 4. Global Details

### Element Plus Overrides (`src/styles/element-overrides.scss`)

- Dialog: fullscreen on mobile (`100vw`, `100vh`, `border-radius: 0`)
- MessageBox: same fullscreen treatment

### Touch & Interaction (`src/styles/index.scss`)

- Minimum touch target: 44×44px for clickable elements
- `-webkit-tap-highlight-color: transparent`
- Wrap hover effects in `@media (hover: hover)` to avoid sticky hover on touch
- Input font-size ≥ 16px to prevent iOS auto-zoom

### Safe Area & Viewport (`index.html`)

- Ensure `viewport-fit=cover` in meta viewport
- Fixed bottom elements: `padding-bottom: env(safe-area-inset-bottom)`
- Fixed top elements: `padding-top: env(safe-area-inset-top)`

### Scrollbars (`src/styles/index.scss`)

- Hide custom scrollbar on mobile: `::-webkit-scrollbar { display: none }` inside `@media (max-width: 767px)`

---

## File Manifest

### New Files
| File | Purpose |
|------|---------|
| `src/composables/useDevice.ts` | Device detection composable |
| `src/components/layout/MobileTabBar.vue` | Bottom tab bar navigation |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/layout/AppLayout.vue` | Conditionally render MobileTabBar |
| `src/components/layout/AdminLayout.vue` | Mobile: sidebar → drawer |
| `src/views/ChatView.vue` | Sidebar width tweak on mobile |
| `src/components/chat/ChatSidebar.vue` | Responsive touch area |
| `src/components/chat/ChatInput.vue` | Remove max-width, stack advanced options, reduce padding |
| `src/components/chat/MessageList.vue` | Responsive padding |
| `src/components/chat/MessageBubble.vue` | User bubble 85% width on mobile |
| `src/views/DashboardView.vue` | Chart height, stat font-size, table scroll |
| `src/views/ProjectsView.vue` | Toolbar wrap, touch areas |
| `src/views/ProjectDetailView.vue` | Toolbar wrap, touch areas |
| `src/views/LoginView.vue` | Reduced padding on mobile |
| `src/views/RegisterView.vue` | Reduced padding on mobile |
| `src/styles/index.scss` | Mobile scrollbar, touch defaults, safe-area |
| `src/styles/element-overrides.scss` | Dialog/MessageBox fullscreen on mobile |
| `index.html` | viewport-fit=cover |

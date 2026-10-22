# Fusion Starter

A production-ready full-stack React application template with integrated Express server, featuring React Router 6 SPA mode, TypeScript, Vitest, Zod and modern tooling.

While the starter comes with a express server, only create endpoint when strictly neccesary, for example to encapsulate logic that must leave in the server, such as private keys handling, or certain DB operations, db...

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (spa) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Testing**: Vitest
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components (Index.tsx = home)
├── components/ui/        # Pre-built UI component library
├── App.tsx                # App entry point and with SPA routing setup
└── global.css            # TailwindCSS 3 theming and global styles

server/                   # Express API backend
├── index.ts              # Main server setup (express config + routes)
└── routes/               # API handlers

shared/                   # Types used by both client & server
└── api.ts                # Example of how to share api interfaces
```

## Key Features

## SPA Routing System

The routing system is powered by React Router 6:

- `client/pages/Index.tsx` represents the home page.
- Routes are defined in `client/App.tsx` using the `react-router-dom` import
- Route files are located in the `client/pages/` directory

For example, routes can be defined with:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Routes>
  <Route path="/" element={<Index />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>;
```

### Styling System

- **Primary**: TailwindCSS 3 utility classes
- **Theme and design tokens**: Configure in `client/global.css` 
- **UI components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

```typescript
// cn utility usage
className={cn(
  "base-classes",
  { "conditional-class": condition },
  props.className  // User overrides
)}
```

### Express Server Integration

- **Development**: Frontend/Proxy on port 3000 (proxies `/api` to Java Gateway on 8080)
- **Hot reload**: Both client and server code
- **API endpoints**: Prefixed with `/api/`

#### Example API Routes
- `GET /api/ping` - Simple ping api
- `GET /api/demo` - Demo endpoint  

### Shared Types
Import consistent types in both client and server:
```typescript
import { DemoResponse } from '@shared/api';
```

Path aliases:
- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev        # Start dev server (client + server)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test          # Run Vitest tests
```

## Adding Features

### Add new colors to the theme

Open `client/global.css` and `tailwind.config.ts` and add new tailwind colors.

### New API Route
1. **Optional**: Create a shared interface in `shared/api.ts`:
```typescript
export interface MyRouteResponse {
  message: string;
  // Add other response properties here
}
```

2. Create a new route handler in `server/routes/my-route.ts`:
```typescript
import { RequestHandler } from "express";
import { MyRouteResponse } from "@shared/api"; // Optional: for type safety

export const handleMyRoute: RequestHandler = (req, res) => {
  const response: MyRouteResponse = {
    message: 'Hello from my endpoint!'
  };
  res.json(response);
};
```

3. Register the route in `server/index.ts`:
```typescript
import { handleMyRoute } from "./routes/my-route";

// Add to the createServer function:
app.get("/api/my-endpoint", handleMyRoute);
```

4. Use in React components with type safety:
```typescript
import { MyRouteResponse } from '@shared/api'; // Optional: for type safety

const response = await fetch('/api/my-endpoint');
const data: MyRouteResponse = await response.json();
```

### New Page Route
1. Create component in `client/pages/MyPage.tsx`
2. Add route in `client/App.tsx`:
```typescript
<Route path="/my-page" element={<MyPage />} />
```

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables (Linux, macOS, Windows)
- **Cloud Deployment**: Use either Netlify or Vercel via their MCP integrations for easy deployment. Both providers work well with this starter template.

### **Session Progress (March 5, 2026)**

#### **Mapping & Attractions Feature**
*   **Problem:** The Google Maps API key was not functional for the user.
*   **Solution:** Migrated the `places-service` to use **LocationIQ** (Nearby API) for finding attractions and **Unsplash** for high-quality destination images.
*   **Implementation Details:**
    *   **Backend (`places-service`)**: Updated `PlacesService.java` to fetch `tourism` tags within a 10km radius of the selected Lat/Lng coordinates using LocationIQ.
    *   **Image Proxy**: The `/api/places/photo` endpoint now redirects to Unsplash's "Source" API using the attraction's name as a keyword.
    *   **Frontend**: Updated `CreateTrip.tsx` to trigger attraction fetching based on map coordinates (Lat/Lng) instead of address strings for better precision.
    *   **UI**: Added a 2-column grid in the trip creation flow (Step 2) to display attractions with name, rating, and Unsplash photos.

#### **Technical Notes**
*   **Express Proxy**: Always ensure `createProxyMiddleware` in `server/index.ts` is registered **before** `express.json()` to prevent request body consumption.
*   **Absolute Paths**: Frontend fetches should use absolute-style paths (e.g., `/api/places/...`) to ensure the Express proxy catches them correctly.

#### **Group Invitations & Trip Management (March 5, 2026 - Final)**
*   **Map Exploration**: Created a dedicated `Map.tsx` page with a "Tablet-style" sidebar that dynamically fetches and displays nearby attractions using Geoapify and Wikipedia.
*   **Invitation System**: 
    *   Added a "Pending Invitations" section to the Dashboard.
    *   Implemented the searchable `AddMemberModal` for inviting users by name or email.
    *   Added a data seeder to `user-service` ensuring standard test users (Voyzr Admin is ID 1).
*   **Trip Controls**:
    *   Added member removal functionality in the Trip Edit modal (protected for organizers).
    *   Implemented manual Status management (UPCOMING, LIVE, COMPLETED, CANCELLED) in the trip editing flow.
*   **Stability**: Refactored `PlacesService.java` to use standard Java constructors and granular error catching to eliminate 500 errors and handle Wikipedia API rate limits/User-Agent requirements.


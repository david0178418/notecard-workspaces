# Note Card Application Plan (Bun Native)

This document outlines the steps to create the Note Card web application using Bun's native tooling, React, Material UI, and Jotai in the current workspace.

1.  **Project Setup (Bun Native):**
    *   Initialize the Bun project in the current directory (if needed): `bun init -y`.
    *   Install dependencies: `bun add react react-dom jotai @mui/material @emotion/react @emotion/styled`.
    *   Install development types: `bun add -d @types/react @types/react-dom`.
    *   Configure `tsconfig.json` (strictness, JSX, module resolution). Key settings:
        *   `"lib": ["DOM", "DOM.Iterable", "ESNext"]`
        *   `"jsx": "react-jsx"`
        *   `"module": "ESNext"`
        *   `"moduleResolution": "bundler"`
        *   `"target": "ESNext"`
        *   `"strict": true`
        *   `"esModuleInterop": true`
        *   `"skipLibCheck": true`
        *   `"forceConsistentCasingInFileNames": true`
    *   Create project structure: `src/`, `src/components/`, `src/hooks/`, `src/state/`, `src/lib/`, `src/types/`.
    *   Create HTML entry point: `index.html` (linking to `src/index.tsx`).
    *   Create TSX entry point: `src/index.tsx`.

2.  **Development Script (`package.json`):**
    *   Add/update the `dev` script in `package.json`:
        ```json
        "scripts": {
          "dev": "bun --hot index.html"
        }
        ```

3.  **Core Type Definitions (`src/types/`):**
    *   Define `CardData`: `{ id: string; text: string; position: { x: number; y: number }; /* Optional: size, color */ }`
    *   Define `WorkspaceData`: `{ id: string; name: string; cards: Record<string, CardData>; viewState: { pan: { x: number; y: number }; zoom: number }; }`
    *   Define `AppState`: `{ workspaces: Record<string, WorkspaceData>; currentWorkspaceId: string | null; }`

4.  **State Management (Jotai + Persistence) (`src/state/`, `src/lib/`):**
    *   Use `atomWithStorage` from `jotai/utils` for a persisted `appStateAtom` in `src/state/atoms.ts`. Key: `'notecardAppState'`, Initial value: `{ workspaces: {}, currentWorkspaceId: null }`.
    *   Create derived atoms (e.g., `currentWorkspaceAtom`, `currentCardsAtom`, `currentViewStateAtom`).
    *   Define write atoms or helper functions for state modifications (add/update/delete cards, update view state, manage workspaces).

5.  **Entry Point (`src/index.tsx`):**
    *   Import React, ReactDOM, `App` component, global CSS (including MUI baseline/setup).
    *   Use `ReactDOM.createRoot` to render `<App />` into the DOM element specified in `index.html` (e.g., `#root`).

6.  **Workspace Component (`src/components/Workspace.tsx`):**
    *   Use Jotai hooks (`useAtomValue`) to read current `cards` and `viewState`.
    *   Render `Card` components with transforms based on `viewState`.
    *   Integrate `usePanZoom` hook.
    *   Ensure responsiveness.

7.  **Pan/Zoom Logic (`src/hooks/usePanZoom.ts`):**
    *   Custom hook using `useSetAtom` to update `viewState`.
    *   Handle **mouse and touch events** for panning.
    *   Handle **wheel event** for zooming, implementing zoom-to-cursor logic by adjusting pan state.

8.  **Card Component (`src/components/Card.tsx`):**
    *   Use Material UI components (e.g., `Card`, `CardContent`) for structure and styling.
    *   Receive `cardId` prop. Use Jotai (`useAtomValue`, `useSetAtom`) for data access and updates.
    *   Implement **drag-and-drop using mouse and touch events**, updating card position in workspace coordinates.
    *   Handle text editing (double-click/tap).
    *   Include delete mechanism (e.g., an `IconButton` with a delete icon).
    *   Ensure adequate tap target sizes for mobile.

9.  **UI Controls (`src/components/Toolbar.tsx`, `src/components/WorkspaceSwitcher.tsx`):**
    *   Use Material UI components (e.g., `AppBar`, `Toolbar`, `Button`, `Select`, `MenuItem`).
    *   Use Jotai hooks for state interaction.
    *   Design controls to be responsive.

10. **Application Shell (`src/App.tsx`):**
    *   Set up main layout using Material UI components (e.g., `Box`, `CssBaseline`).
    *   Render `Workspace` conditionally based on `currentWorkspaceId`.
    *   Render `Toolbar`, `WorkspaceSwitcher`, etc.

11. **Styling:**
    *   Leverage Material UI's styling solution (Emotion or styled-components).
    *   Employ mobile-first/responsive design using MUI's features (e.g., `Grid`, `Stack`, breakpoints).

12. **Production Build (Deferred):**
    *   Plan to add a `bun build index.html --outdir ./dist` script later, configuring necessary build optimizations. 
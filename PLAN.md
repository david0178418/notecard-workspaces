# Note Card Application Plan (Bun Native)

This document outlines the steps to create the Note Card web application using Bun's native tooling, React, and Jotai.

1.  **Project Setup (Bun Native):**
    *   Create the project directory: `mkdir my-notecard-app && cd my-notecard-app`
    *   Initialize the Bun project: `bun init -y`.
    *   Install dependencies: `bun add react react-dom jotai`.
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
    *   Create entry point: `src/index.tsx`.

2.  **Development Script (`package.json`):**
    *   Add a `dev` script to `package.json`:
        ```json
        "scripts": {
          "dev": "bun --hot src/index.tsx"
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
    *   Import React, ReactDOM, `App` component, global CSS.
    *   Use `ReactDOM.createRoot` to render `<App />` into a DOM element (e.g., `#root`).

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
    *   Receive `cardId` prop. Use Jotai (`useAtomValue`, `useSetAtom`) for data access and updates.
    *   Implement **drag-and-drop using mouse and touch events**, updating card position in workspace coordinates.
    *   Handle text editing (double-click/tap).
    *   Include delete mechanism.
    *   Ensure adequate tap target sizes for mobile.

9.  **UI Controls (`src/components/Toolbar.tsx`, `src/components/WorkspaceSwitcher.tsx`):**
    *   Use Jotai hooks for state interaction.
    *   Design controls to be responsive.

10. **Application Shell (`src/App.tsx`):**
    *   Set up main layout.
    *   Render `Workspace` conditionally based on `currentWorkspaceId`.
    *   Render `Toolbar`, `WorkspaceSwitcher`, etc.

11. **Styling:**
    *   Employ mobile-first/responsive design (CSS Modules, etc.).

12. **Production Build (Deferred):**
    *   Plan to add a `bun build` script later, configuring entry points, output directory (`./dist`), and optimizations. 
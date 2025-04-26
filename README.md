# Note Cards - Virtual Whiteboard

A simple web application for creating and organizing virtual note cards on an infinite canvas, built with React, TypeScript, and Bun.

## Features

*   **Infinite Canvas:** Pan and zoom around a large workspace.
*   **Multiple Workspaces:** Organize cards into different named workspaces.
*   **Card Management:** Create, edit text, resize, and move cards freely.
*   **Persistence:** Workspaces and card state are saved automatically in local storage.
*   **Theme Switching:** Toggle between light and dark modes.
*   **Sidebar card list with drag-and-drop reordering.**
*   **Workspace Import/Export:**
    *   Export selected workspaces to a JSON file.
    *   Import workspaces from a previously exported JSON file, with options to select which workspaces to import and handle ID conflicts.
*   **Starts with a sample workspace containing introductory cards on first load.**

## Tech Stack

*   **Framework:** React 19 (using experimental features)
*   **Language:** TypeScript
*   **Build/Runtime:** Bun
*   **UI Library:** Material UI (MUI)
*   **State Management:** Jotai
*   **Notifications:** Notistack
*   **Unique IDs:** Native `crypto.randomUUID()`

## Getting Started

### Prerequisites

*   [Bun](https://bun.sh) (latest version recommended)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd cards
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```

### Running the Development Server

```bash
bun dev
```

This will start the development server (usually on `http://localhost:3000`) with hot reloading.

### Building for Production

```bash
bun run bundle
```

This command builds the application for production, outputting optimized files to the `dist/` directory.

## Usage

*   **Creating Cards:** Double-click anywhere on the canvas (outside existing cards). Cards are centered on the click point.
*   **Editing Cards:** Double-click a card to edit its text. Click outside or press Escape to finish.
*   **Moving Cards:** Click and drag a card.
*   **Resizing Cards:** Click and drag the bottom-right corner of a card.
*   **Panning:** Click and drag the canvas background.
*   **Zooming:** Use the mouse wheel or pinch gesture over the canvas background.
*   **Workspaces:** Use the sidebar (accessed via the top-left menu icon) to switch between workspaces, create new ones, or delete the current workspace.
*   **Sidebar Card List:** Click a card to center it on the canvas and bring it to the front. Drag the handle (<svg><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>) to reorder cards within the list. Click the delete icon to remove a card.
*   **Import/Export:** Use the "Import" and "Export" buttons in the sidebar. Dialogs will appear to let you select which workspaces to import or export.
    *   **Export:** Select the desired workspaces and click "Export Selected". A JSON file will be downloaded.
    *   **Import:** Click "Import", select a JSON file (previously exported from this app). A dialog will show the workspaces found; select the ones you want and click "Import Selected". Existing workspaces with the same ID will be overwritten (a warning toast will appear).

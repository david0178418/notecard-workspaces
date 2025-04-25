import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { atom } from 'jotai';
import type { AppState, WorkspaceData, CardData, Point, ViewState, CardSize } from '../types';
import { nanoid } from 'nanoid'; // Using nanoid for unique IDs

const DEFAULT_CARD_WIDTH = 200;
const DEFAULT_CARD_HEIGHT = 100;

// Type for theme mode
export type ThemeMode = 'light' | 'dark';

// Function to get the system's preferred theme or default to light
const getSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'light'; // Default fallback
};

// Define the initial state conforming to the AppState interface
const initialWorkspaceId = nanoid(); // Generate an ID for the initial workspace
const initialAppState: AppState = {
  workspaces: {
    [initialWorkspaceId]: {
      id: initialWorkspaceId,
      name: 'Default Workspace',
      cards: {},
      viewState: { pan: { x: 0, y: 0 }, zoom: 1 },
    },
  },
  currentWorkspaceId: initialWorkspaceId,
};

// Create a storage instance for localStorage
// Using createJSONStorage ensures proper serialization/deserialization
// Note: atomWithStorage uses JSON.stringify/parse by default if storage
// is localStorage/sessionStorage and no storage object is provided,
// but explicitly providing it makes the type handling more robust.
const storage = createJSONStorage<AppState>(() => localStorage);

/**
 * The main atom holding the entire application state.
 * It automatically persists to localStorage under the key 'notecardAppState'.
 */
export const appStateAtom = atomWithStorage<AppState>(
  'notecardAppState',
  initialAppState, // Use the state with a default workspace
  storage
);

// --- Derived Atoms --- //

export const currentWorkspaceIdAtom = atom((get) => get(appStateAtom).currentWorkspaceId);

export const workspacesAtom = atom((get) => get(appStateAtom).workspaces);

export const currentWorkspaceAtom = atom<WorkspaceData | null>((get) => {
  const state = get(appStateAtom);
  if (!state.currentWorkspaceId) return null;
  return state.workspaces[state.currentWorkspaceId] ?? null;
});

export const currentCardsAtom = atom<Record<string, CardData>>((get) => {
  const currentWorkspace = get(currentWorkspaceAtom);
  return currentWorkspace?.cards ?? {};
});

export const currentViewStateAtom = atom<ViewState>((get) => {
  const currentWorkspace = get(currentWorkspaceAtom);
  // Provide a default view state if somehow the workspace doesn't exist
  return currentWorkspace?.viewState ?? { pan: { x: 0, y: 0 }, zoom: 1 };
});

// Atom for storing the current theme mode, persisted to localStorage
export const themeModeAtom = atomWithStorage<ThemeMode>(
  'notecardThemeMode', // Storage key
  getSystemTheme() // Use system theme as the initial default
);

// Atom to toggle the theme mode
export const toggleThemeModeAtom = atom(
  null, // Read function is not needed
  (get, set) => {
    const currentMode = get(themeModeAtom);
    set(themeModeAtom, currentMode === 'light' ? 'dark' : 'light');
  }
);

// Atom to control the visibility of the sidebar drawer
export const sidebarOpenAtom = atom(false); // Default to closed

// Atom to store the current size of the workspace viewport
export const viewportSizeAtom = atom<{ width: number; height: number }>({ width: 0, height: 0 });

// Atom to store the order of card interaction (most recent at the end)
export const interactionOrderAtom = atom<string[]>([]);

// Atom to temporarily store the ID of the last created card for autofocus
export const lastCreatedCardIdAtom = atom<string | null>(null);

// --- Action Atoms / Functions --- //
// Note: We use atom(null, (get, set, ...) => ...) for actions that modify state.

// Action to update the current workspace's view state
export const updateViewStateAtom = atom(
  null,
  (get, set, newViewState: Partial<ViewState>) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace) return prev; // Should not happen if currentId is set

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            viewState: { ...currentWorkspace.viewState, ...newViewState },
          },
        },
      };
    });
  }
);

// Action to add a new card to the current workspace
export const addCardAtom = atom(
  null,
  (get, set, newCardData: Pick<CardData, 'text' | 'position'>) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    const newCard: CardData = {
      ...newCardData,
      size: { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT },
      id: nanoid(),
    };

    // First, update the main state with the new card
    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace) return prev;
      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            cards: {
              ...currentWorkspace.cards,
              [newCard.id]: newCard,
            },
          },
        },
      };
    });

    // Then, set the ID for autofocus trigger
    set(lastCreatedCardIdAtom, newCard.id);
  }
);

// Action to update a specific card's position
export const updateCardPositionAtom = atom(
  null,
  (get, set, { cardId, position }: { cardId: string; position: Point }) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace?.cards[cardId]) return prev; // Card doesn't exist

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            cards: {
              ...currentWorkspace.cards,
              [cardId]: { ...currentWorkspace.cards[cardId], position },
            },
          },
        },
      };
    });
  }
);

// Action to update a specific card's text
export const updateCardTextAtom = atom(
  null,
  (get, set, { cardId, text }: { cardId: string; text: string }) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace?.cards[cardId]) return prev;

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            cards: {
              ...currentWorkspace.cards,
              [cardId]: { ...currentWorkspace.cards[cardId], text },
            },
          },
        },
      };
    });
  }
);

// Action to update a specific card's size
export const updateCardSizeAtom = atom(
  null,
  (get, set, { cardId, size }: { cardId: string; size: CardSize }) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace?.cards[cardId]) return prev; // Card doesn't exist

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            cards: {
              ...currentWorkspace.cards,
              [cardId]: { ...currentWorkspace.cards[cardId], size },
            },
          },
        },
      };
    });
  }
);

// Action to delete a specific card
export const deleteCardAtom = atom(
  null,
  (get, set, cardId: string) => {
    const currentId = get(currentWorkspaceIdAtom);
    if (!currentId) return;

    set(appStateAtom, (prev) => {
      const currentWorkspace = prev.workspaces[currentId];
      if (!currentWorkspace?.cards[cardId]) return prev;

      const { [cardId]: _, ...remainingCards } = currentWorkspace.cards;

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [currentId]: {
            ...currentWorkspace,
            cards: remainingCards,
          },
        },
      };
    });
  }
);

// Action to create a new workspace
export const createWorkspaceAtom = atom(null, (get, set, name: string) => {
  const newId = nanoid();
  const newWorkspace: WorkspaceData = {
    id: newId,
    name,
    cards: {},
    viewState: { pan: { x: 0, y: 0 }, zoom: 1 },
  };

  set(appStateAtom, (prev) => ({
    ...prev,
    workspaces: {
      ...prev.workspaces,
      [newId]: newWorkspace,
    },
    currentWorkspaceId: newId, // Switch to the new workspace
  }));
});

// Action to switch the current workspace
export const switchWorkspaceAtom = atom(
  null,
  (get, set, workspaceId: string) => {
    set(appStateAtom, (prev) => {
      if (!prev.workspaces[workspaceId]) return prev; // Don't switch if ID is invalid
      return {
        ...prev,
        currentWorkspaceId: workspaceId,
      };
    });
  }
);

// Action to delete a workspace
export const deleteWorkspaceAtom = atom(
  null,
  (get, set, workspaceId: string) => {
    set(appStateAtom, (prev) => {
      if (!prev.workspaces[workspaceId]) return prev; // Doesn't exist
      const workspaceKeys = Object.keys(prev.workspaces);
      if (workspaceKeys.length <= 1) return prev; // Don't delete the last one

      const { [workspaceId]: _, ...remainingWorkspaces } = prev.workspaces;
      // Explicitly type the final ID variable
      let finalCurrentId: string | null = prev.currentWorkspaceId;

      if (finalCurrentId === workspaceId) {
        // If deleting the current one, switch to the first remaining one
        const remainingKeys = Object.keys(remainingWorkspaces);
        finalCurrentId = remainingKeys[0] ?? null;
      }

      // The type of finalCurrentId is now guaranteed to be string | null
      return {
        ...prev,
        workspaces: remainingWorkspaces,
        currentWorkspaceId: finalCurrentId,
      };
    });
  }
);

// Action atom to center the view on a specific point in workspace coordinates
export const centerOnPointAtom = atom(
  null,
  (get, set, targetPoint: Point) => {
    const { width: viewportWidth, height: viewportHeight } = get(viewportSizeAtom);
    const { zoom } = get(currentViewStateAtom);

    if (viewportWidth === 0 || viewportHeight === 0) {
      console.warn('Cannot center, viewport size is zero.');
      return;
    }

    // Calculate the pan needed to place targetPoint at the viewport center
    const newPanX = viewportWidth / 2 - targetPoint.x * zoom;
    const newPanY = viewportHeight / 2 - targetPoint.y * zoom;

    // Update the view state using the existing atom
    set(updateViewStateAtom, { pan: { x: newPanX, y: newPanY } /*, zoom */ });
    // We only update pan for now, keeping zoom the same
  }
);

// Action to bring a specific card to the front visually by updating interaction order
export const bringCardToFrontAtom = atom(
  null,
  (get, set, cardId: string) => {
    const currentOrder = get(interactionOrderAtom);
    // Remove the ID if it exists, then add it to the end
    const newOrder = currentOrder.filter(id => id !== cardId).concat(cardId);
    set(interactionOrderAtom, newOrder);
  }
);

// Example of a derived atom (we will add more later as needed)
// import { atom } from 'jotai';
// export const currentWorkspaceIdAtom = atom((get) => get(appStateAtom).currentWorkspaceId); 
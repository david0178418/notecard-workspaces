import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { atom, useSetAtom } from 'jotai';
import type { AppState, WorkspaceData, CardData, Point, ViewState, CardSize, ToastMesssage } from '../types';

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
const initialWorkspaceId = crypto.randomUUID(); // Use crypto.randomUUID()
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

// --- Hydration State --- //
// Atom to track if the main persisted state has been loaded
export const isAppStateHydratedAtom = atom(false);

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

// --- Toast Notification Atoms --- //

const toastQueueAtom = atom<ToastMesssage[]>([]);

export const toastMsgAtom = atom(get => get(toastQueueAtom)[0] || null);

const pushToastMsgAtom = atom(
	null,
	(get, set, message: ToastMesssage | string) => {
		const addedMsg = (typeof message === 'string') ? { message } : message;
		const tqa = get(toastQueueAtom);
		set(toastQueueAtom, [ ...tqa, addedMsg ]);
	},
);

export const clearCurrentToastMsgAtom = atom(
	null,
	(get, set) => {
		const tqa = get(toastQueueAtom);
		if (tqa.length > 0) {
			const [, ...rest] = tqa; // Use destructuring to remove the first element
			set(toastQueueAtom, rest);
		}
	},
);

export function usePushToastMsg() {
	return useSetAtom(pushToastMsgAtom);
}

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

    // Define default size here to use for offset calculation
    const defaultWidth = 200;
    const defaultHeight = 100;

    // Adjust the position to center the card on the target point
    const adjustedPosition = {
      x: newCardData.position.x - defaultWidth / 2,
      y: newCardData.position.y - defaultHeight / 2,
    };

    const newCard: CardData = {
      text: newCardData.text, // Ensure text is included
      position: adjustedPosition, // Use the adjusted position
      size: { width: defaultWidth, height: defaultHeight },
      id: crypto.randomUUID(),
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

    // Second, add the new card ID to the interaction order
    set(interactionOrderAtom, (prevOrder) => [...prevOrder, newCard.id]);

    // Finally, set the ID for autofocus trigger
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

    // Update the main state
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

    // Also remove the card ID from the interaction order
    set(interactionOrderAtom, (prevOrder) => prevOrder.filter(id => id !== cardId));
  }
);

// Action to create a new workspace
export const createWorkspaceAtom = atom(null, (_get, set, name: string) => {
  const newId = crypto.randomUUID(); // Use crypto.randomUUID()
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
  (_get, set, workspaceId: string) => {
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
  (_get, set, workspaceId: string) => {
    set(appStateAtom, (prev) => {
      if (!prev.workspaces[workspaceId]) return prev;
      const workspaceKeys = Object.keys(prev.workspaces);
      if (workspaceKeys.length <= 1) return prev;

      const { [workspaceId]: _, ...remainingWorkspaces } = prev.workspaces;
      let finalCurrentId: string | null = prev.currentWorkspaceId;

      if (finalCurrentId === workspaceId) {
        const remainingKeys = Object.keys(remainingWorkspaces);
        if (remainingKeys.length > 0) {
          // @ts-expect-error - TS struggles to infer remainingKeys[0] is non-undefined here
          finalCurrentId = remainingKeys[0];
        } else {
          finalCurrentId = null;
        }
      }

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
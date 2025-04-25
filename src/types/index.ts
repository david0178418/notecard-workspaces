export interface Point {
  x: number;
  y: number;
}

export interface CardSize {
  width: number;
  height: number;
}

export interface CardData {
  id: string;
  text: string;
  position: Point;
  size?: CardSize;
  // Optional properties can be added later, e.g.:
  // color?: string;
}

export interface ViewState {
  pan: Point;
  zoom: number;
}

export interface WorkspaceData {
  id: string;
  name: string;
  cards: Record<string, CardData>; // Using Record for easy ID lookup
  viewState: ViewState;
}

export interface AppState {
  workspaces: Record<string, WorkspaceData>; // Using Record for easy ID lookup
  currentWorkspaceId: string | null;
} 
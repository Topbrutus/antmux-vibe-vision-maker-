import { GenesisSessionData, OctaSystemState } from '../types/vectorScope';
import { createDefaultOctaSystem } from './mathEngine';

const STORAGE_KEY = 'genesis_vector_lab_saved_sessions_v2';
const AUTOSAVE_KEY = 'genesis_vector_lab_active_state_autosave';

export interface SavedSessionItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  data: GenesisSessionData;
}

/**
 * Saves current active session automatically into localStorage
 */
export function autoSaveCurrentSession(data: GenesisSessionData): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to autosave session to localStorage:', err);
  }
}

/**
 * Retrieves the last auto-saved session if available
 */
export function getAutoSavedSession(): GenesisSessionData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load autosaved session:', err);
    return null;
  }
}

/**
 * Clears the autosaved state
 */
export function clearAutoSavedSession(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (err) {
    console.warn('Failed to clear autosaved session:', err);
  }
}

/**
 * Loads all saved sessions from localStorage
 */
export function getSavedSessions(): SavedSessionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load saved sessions from localStorage:', err);
    return [];
  }
}

/**
 * Saves or updates a session in localStorage
 */
export function saveSessionToStorage(item: SavedSessionItem): SavedSessionItem[] {
  try {
    const existing = getSavedSessions();
    const index = existing.findIndex((s) => s.id === item.id);
    let updated: SavedSessionItem[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [item, ...existing];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
    return getSavedSessions();
  }
}

/**
 * Deletes a session by ID
 */
export function deleteSessionFromStorage(id: string): SavedSessionItem[] {
  try {
    const existing = getSavedSessions();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete session:', err);
    return getSavedSessions();
  }
}

/**
 * Exports session as a downloadable JSON file
 */
export function exportSessionToFile(session: GenesisSessionData, filename?: string) {
  const name = filename || `genesis_session_${session.name || 'preset'}_${Date.now()}.json`;
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports session from a JSON file
 */
export function importSessionFromFile(file: File): Promise<GenesisSessionData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as GenesisSessionData;
        resolve(parsed);
      } catch (err) {
        reject(new Error('Fichier de session invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}

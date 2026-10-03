import { Injectable, effect, signal } from '@angular/core';
import { KeyLabel } from '../models/key-label.models';
import {
  parseLayoutExportFile,
  serializeLayout,
} from '../utils/layout-export.utils';

// Same key shape as the JSON export file, so loading/saving can reuse its
// validation instead of trusting whatever's sitting in localStorage.
const STORAGE_KEY = 'alhena-labels';

function loadFromStorage(): Record<number, KeyLabel> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseLayoutExportFile(JSON.parse(raw)) : {};
  } catch {
    // Missing/corrupt/unavailable storage all just mean "start empty".
    return {};
  }
}

/**
 * Holds the labels the user has assigned to each key position code (0-89).
 * Plain signal-based service for now — see CLAUDE.md for when to promote
 * this to `@ngrx/signals`.
 *
 * Persisted to localStorage under `alhena-labels` so labels survive a
 * reload; a `storage` event listener (which only fires in *other*
 * tabs/windows, never the one that wrote the change) keeps every open tab
 * showing the same labels.
 */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  readonly labels = signal<Record<number, KeyLabel>>(loadFromStorage());

  constructor() {
    effect(() => {
      const labels = this.labels();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serializeLayout(labels)),
        );
      } catch {
        // Storage can be unavailable (quota, private browsing, etc.) —
        // labels still work for this tab, just without persistence.
      }
    });

    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        this.labels.set(loadFromStorage());
      }
    });
  }

  /** Replaces the entire label map, e.g. after importing a JSON file. */
  loadLabels(labels: Record<number, KeyLabel>) {
    this.labels.set(labels);
  }

  setLabel(positionCode: number, label: KeyLabel) {
    this.labels.update((labels) => ({ ...labels, [positionCode]: label }));
  }

  clearLabel(positionCode: number) {
    this.labels.update((labels) => {
      const next = { ...labels };
      delete next[positionCode];
      return next;
    });
  }
}

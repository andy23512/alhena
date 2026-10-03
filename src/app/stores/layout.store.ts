import { Injectable, signal } from '@angular/core';
import { KeyLabel } from '../models/key-label.models';

/**
 * Holds the labels the user has assigned to each key position code (0-89).
 * Plain signal-based service for now — see CLAUDE.md for when to promote
 * this to `@ngrx/signals`.
 */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  readonly labels = signal<Record<number, KeyLabel>>({});

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

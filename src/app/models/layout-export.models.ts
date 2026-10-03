import { KeyLabel } from './key-label.models';

export const LAYOUT_EXPORT_VERSION = 1;

/** Shape of the JSON file produced/consumed by layout export & import. */
export interface LayoutExportFile {
  version: number;
  /** Keyed by position code (0-89), serialized as a string by JSON.stringify. */
  labels: Record<string, KeyLabel>;
}

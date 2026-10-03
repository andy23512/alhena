import { KeyLabel, KeyLabelType } from '../models/key-label.models';
import {
  LAYOUT_EXPORT_VERSION,
  LayoutExportFile,
} from '../models/layout-export.models';

export function serializeLayout(
  labels: Record<number, KeyLabel>,
): LayoutExportFile {
  return { version: LAYOUT_EXPORT_VERSION, labels };
}

/**
 * Validates and converts an arbitrary parsed JSON value into a position
 * code -> KeyLabel map. Throws a descriptive `Error` if the data doesn't
 * match the expected shape, so callers can show the message to the user.
 */
export function parseLayoutExportFile(data: unknown): Record<number, KeyLabel> {
  if (!data || typeof data !== 'object') {
    throw new Error('File is not a valid Alhena layout JSON object.');
  }
  const { version, labels } = data as Record<string, unknown>;
  if (version !== LAYOUT_EXPORT_VERSION) {
    throw new Error(
      `Unsupported layout file version: ${JSON.stringify(version)}.`,
    );
  }
  if (!labels || typeof labels !== 'object') {
    throw new Error('File is missing a "labels" object.');
  }

  const result: Record<number, KeyLabel> = {};
  for (const [key, value] of Object.entries(labels)) {
    const positionCode = Number(key);
    if (!Number.isInteger(positionCode) || positionCode < 0 || positionCode > 89) {
      throw new Error(`Invalid position code: "${key}".`);
    }
    if (!isKeyLabel(value)) {
      throw new Error(`Invalid label for position code ${key}.`);
    }
    result[positionCode] = value;
  }
  return result;
}

function isKeyLabel(value: unknown): value is KeyLabel {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { type, value: labelValue } = value as Record<string, unknown>;
  return (
    (type === KeyLabelType.Text || type === KeyLabelType.Icon) &&
    typeof labelValue === 'string'
  );
}

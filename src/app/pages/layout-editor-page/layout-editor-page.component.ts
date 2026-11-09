import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { POSITION_CODE_LAYOUT } from 'tangent-cc-lib';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayoutComponent } from '../../components/layout/layout.component';
import {
  KeyEditDialogComponent,
  KeyEditDialogResult,
} from '../../components/key-edit-dialog/key-edit-dialog.component';
import {
  parseLayoutExportFile,
  serializeLayout,
} from '../../utils/layout-export.utils';
import { exportSvgAsPngBlob } from '../../utils/svg-export.utils';
import {
  KEY_COLORS,
  KEY_COLOR_NAMES,
  KeyColor,
  KeyLabel,
} from '../../models/key-label.models';
import { LayerStore } from '../../stores/layer.store';
import { DEVICE_TYPE_LABELS, DEVICE_TYPES } from '../../models/device.models';

const EXPORT_FILE_NAME = 'alhena-layout.json';
const EXPORT_IMAGE_FILE_NAME = 'alhena-layout.png';

@Component({
  selector: 'app-layout-editor-page',
  standalone: true,
  imports: [
    LayoutComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './layout-editor-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutEditorPageComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly layerStore = inject(LayerStore);
  protected readonly deviceTypes = DEVICE_TYPES;
  protected readonly deviceTypeLabels = DEVICE_TYPE_LABELS;

  private readonly layout = viewChild.required(LayoutComponent);
  protected readonly exportingImage = signal(false);

  protected readonly multiSelect = signal(false);
  protected readonly selectedKeys = signal<ReadonlySet<number>>(new Set());
  protected readonly keyColors = KEY_COLORS;
  protected readonly keyColorNames = KEY_COLOR_NAMES;

  protected toggleMultiSelect() {
    this.multiSelect.update((on) => !on);
    this.selectedKeys.set(new Set());
  }

  protected clearSelection() {
    this.selectedKeys.set(new Set());
  }

  /** Position codes of the keys actually drawn for the current device. */
  private visibleKeyCodes(): number[] {
    const showThumb3 = this.layerStore.showThumb3Switch();
    const codes: number[] = [];
    for (const side of Object.values(POSITION_CODE_LAYOUT)) {
      for (const [sw, map] of Object.entries(side)) {
        if (sw === 'thumbEnd' && !showThumb3) {
          continue;
        }
        codes.push(...Object.values(map as Record<string, number>));
      }
    }
    return codes;
  }

  /** Replaces the selection with every visible key matching `predicate`. */
  protected selectKeysWhere(
    predicate: (label: KeyLabel | undefined, code: number) => boolean,
  ) {
    const labels = this.layerStore.labels();
    this.selectedKeys.set(
      new Set(
        this.visibleKeyCodes().filter((code) => predicate(labels[code], code)),
      ),
    );
  }

  protected selectUnlabeled() {
    this.selectKeysWhere((label) => !label || !label.value);
  }

  protected invertSelection() {
    const current = this.selectedKeys();
    this.selectKeysWhere((_label, code) => !current.has(code));
  }

  protected applyColor(color: KeyColor | undefined) {
    this.layerStore.setColorForKeys(this.selectedKeys(), color);
  }

  protected applyDimmed(dimmed: boolean) {
    this.layerStore.setDimmedForKeys(this.selectedKeys(), dimmed);
  }

  onKeyClick(positionCode: number) {
    if (this.multiSelect()) {
      this.selectedKeys.update((keys) => {
        const next = new Set(keys);
        if (!next.delete(positionCode)) {
          next.add(positionCode);
        }
        return next;
      });
      return;
    }
    const dialogRef = this.dialog.open(KeyEditDialogComponent, {
      data: {
        positionCode,
        label: this.layerStore.labels()[positionCode] ?? null,
      },
      width: '360px',
    });
    dialogRef.afterClosed().subscribe((result: KeyEditDialogResult) => {
      if (result === undefined) {
        return;
      }
      if (result === null) {
        this.layerStore.clearLabel(positionCode);
        return;
      }
      this.layerStore.setLabel(positionCode, result);
    });
  }

  onExport() {
    const file = serializeLayout(this.layerStore.labels());
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT_FILE_NAME;
    a.click();
    URL.revokeObjectURL(url);
  }

  async onSaveImage() {
    this.exportingImage.set(true);
    try {
      const svg = this.layout().getSvgElement();
      const blob = await exportSvgAsPngBlob(svg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = EXPORT_IMAGE_FILE_NAME;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      this.snackBar.open(
        `Image export failed: ${error instanceof Error ? error.message : String(error)}`,
        'OK',
        { duration: 5000 },
      );
    } finally {
      this.exportingImage.set(false);
    }
  }

  onPrint() {
    window.print();
  }

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so selecting the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }
    const hasExistingLabels =
      Object.keys(this.layerStore.labels()).length > 0;
    if (
      hasExistingLabels &&
      !window.confirm(
        'Importing will replace all current key labels. Continue?',
      )
    ) {
      return;
    }
    file
      .text()
      .then((text) => {
        const labels = parseLayoutExportFile(JSON.parse(text));
        this.layerStore.loadLabels(labels);
        this.snackBar.open(
          `Imported ${Object.keys(labels).length} key label(s).`,
          'OK',
          { duration: 3000 },
        );
      })
      .catch((error: unknown) => {
        this.snackBar.open(
          `Import failed: ${error instanceof Error ? error.message : String(error)}`,
          'OK',
          { duration: 5000 },
        );
      });
  }

  onNewLayer() {
    const name = window.prompt(
      'New layer name:',
      `Layer ${this.layerStore.layers().length + 1}`,
    );
    if (!name) {
      return;
    }
    this.layerStore.addLayer(name);
  }

  onDeleteLayer() {
    const layer = this.layerStore.activeLayer();
    if (this.layerStore.layers().length <= 1) {
      this.snackBar.open('Can’t delete the only layer.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (
      !window.confirm(`Delete layer "${layer.name}"? This can't be undone.`)
    ) {
      return;
    }
    this.layerStore.deleteLayer(layer.id);
  }
}

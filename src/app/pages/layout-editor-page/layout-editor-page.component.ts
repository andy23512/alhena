import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LayoutComponent } from '../../components/layout/layout.component';
import {
  KeyEditDialogComponent,
  KeyEditDialogResult,
} from '../../components/key-edit-dialog/key-edit-dialog.component';
import {
  parseLayoutExportFile,
  serializeLayout,
} from '../../utils/layout-export.utils';
import { LayoutStore } from '../../stores/layout.store';

const EXPORT_FILE_NAME = 'alhena-layout.json';

@Component({
  selector: 'app-layout-editor-page',
  standalone: true,
  imports: [LayoutComponent, MatButtonModule],
  templateUrl: './layout-editor-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutEditorPageComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly layoutStore = inject(LayoutStore);

  onKeyClick(positionCode: number) {
    const dialogRef = this.dialog.open(KeyEditDialogComponent, {
      data: {
        positionCode,
        label: this.layoutStore.labels()[positionCode] ?? null,
      },
      width: '360px',
    });
    dialogRef.afterClosed().subscribe((result: KeyEditDialogResult) => {
      if (result === undefined) {
        return;
      }
      if (result === null) {
        this.layoutStore.clearLabel(positionCode);
        return;
      }
      this.layoutStore.setLabel(positionCode, result);
    });
  }

  onExport() {
    const file = serializeLayout(this.layoutStore.labels());
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

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so selecting the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }
    const hasExistingLabels =
      Object.keys(this.layoutStore.labels()).length > 0;
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
        this.layoutStore.loadLabels(labels);
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
}

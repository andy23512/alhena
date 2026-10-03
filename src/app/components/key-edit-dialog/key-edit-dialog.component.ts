import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IconPickerComponent } from '../icon-picker/icon-picker.component';
import { KeyLabel, KeyLabelType } from '../../models/key-label.models';

export interface KeyEditDialogData {
  positionCode: number;
  label: KeyLabel | null;
}

/**
 * Result convention: `undefined` = cancelled (no change), `null` = clear the
 * label, a `KeyLabel` = set/replace the label.
 */
export type KeyEditDialogResult = KeyLabel | null | undefined;

@Component({
  selector: 'app-key-edit-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    IconPickerComponent,
  ],
  templateUrl: './key-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyEditDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<KeyEditDialogComponent, KeyEditDialogResult>>(
      MatDialogRef,
    );
  readonly data = inject<KeyEditDialogData>(MAT_DIALOG_DATA);
  readonly KeyLabelType = KeyLabelType;

  readonly type = signal<KeyLabelType>(this.data.label?.type ?? KeyLabelType.Text);
  readonly value = signal(this.data.label?.value ?? '');

  onValueInput(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }

  save() {
    const value = this.value().trim();
    if (!value) {
      this.dialogRef.close(null);
      return;
    }
    this.dialogRef.close({ type: this.type(), value });
  }

  clear() {
    this.dialogRef.close(null);
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}

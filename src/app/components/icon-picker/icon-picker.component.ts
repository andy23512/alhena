import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const MAX_RESULTS = 60;

/**
 * Searches and picks a Material Symbols icon name. The full name list
 * (~4300 names, ~65kB) is loaded lazily on first use via dynamic import so
 * it doesn't bloat the main bundle.
 */
@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './icon-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerComponent {
  /** Two-way bound: the currently chosen (or typed) icon name. */
  readonly selected = model<string>('');

  protected readonly query = signal(this.selected());
  protected readonly loading = signal(true);
  private readonly allNames = signal<readonly string[]>([]);

  constructor() {
    import('../../data/material-symbols-icon-names').then(
      ({ MATERIAL_SYMBOLS_ICON_NAMES }) => {
        this.allNames.set(MATERIAL_SYMBOLS_ICON_NAMES);
        this.loading.set(false);
      },
    );
  }

  protected readonly matches = computed(() => {
    const q = this.query().trim().toLowerCase();
    const names = this.allNames();
    return q ? names.filter((name) => name.includes(q)) : names;
  });

  protected readonly visibleMatches = computed(() =>
    this.matches().slice(0, MAX_RESULTS),
  );

  onQueryInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.selected.set(value);
  }

  choose(name: string) {
    this.query.set(name);
    this.selected.set(name);
  }
}

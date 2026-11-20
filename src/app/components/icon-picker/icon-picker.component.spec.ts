import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_SYMBOLS_ICON_NAMES } from '../../data/material-symbols-icon-names';
import { IconPickerComponent } from './icon-picker.component';

@Component({
  imports: [IconPickerComponent],
  template: `<app-icon-picker [(selected)]="selected"></app-icon-picker>`,
})
class HostComponent {
  readonly selected = signal('');
}

describe('IconPickerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  async function create(initial = '') {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.selected.set(initial);
    fixture.detectChanges();
  }
  // The list of names is loaded lazily, so give it a moment.
  async function loaded() {
    for (
      let i = 0;
      i < 100 && el().textContent!.includes('Loading icons');
      i++
    ) {
      await new Promise((r) => setTimeout(r, 10));
      fixture.detectChanges();
    }
  }
  const el = () => fixture.nativeElement as HTMLElement;
  const input = () => el().querySelector('input') as HTMLInputElement;
  const buttons = () =>
    Array.from(el().querySelectorAll('button')) as HTMLButtonElement[];
  const names = () => buttons().map((b) => b.title);
  const note = () =>
    el().querySelector('p')?.textContent!.replace(/\s+/g, ' ').trim();
  const type = (v: string) => {
    input().value = v;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('says it is loading until the names have come', async () => {
    await create();
    expect(note()).toBe('Loading icons…');
    expect(buttons().length).toBe(0);
    await loaded();
    expect(el().textContent).not.toContain('Loading icons');
  });

  it('has a labelled search box with an example', async () => {
    await create();
    expect(el().querySelector('mat-label')!.textContent).toBe(
      'Search Material Symbols icons',
    );
    expect(input().placeholder).toBe('e.g. home');
  });

  describe('once loaded', () => {
    it('shows the first 60 icons, in order, each as its own glyph with its name as title', async () => {
      await create();
      await loaded();
      expect(names()).toEqual(MATERIAL_SYMBOLS_ICON_NAMES.slice(0, 60));
      expect(
        buttons()[0].querySelector('.material-symbols-rounded')!.textContent,
      ).toBe(MATERIAL_SYMBOLS_ICON_NAMES[0]);
    });

    it('says how many matches there are beyond the ones shown', async () => {
      await create();
      await loaded();
      expect(note()).toBe(
        `Showing 60 of ${MATERIAL_SYMBOLS_ICON_NAMES.length} matches — keep typing to narrow it down.`,
      );
    });

    it('narrows the list as you type, ignoring case and spaces around', async () => {
      await create();
      await loaded();
      type('  HOME ');
      const expected = MATERIAL_SYMBOLS_ICON_NAMES.filter((n) =>
        n.includes('home'),
      );
      expect(names()).toEqual(expected.slice(0, 60));
      expect(names()).toContain('home');
    });

    it('does not say anything about more matches when all of them are shown', async () => {
      await create();
      await loaded();
      const few = MATERIAL_SYMBOLS_ICON_NAMES.find(
        (n) =>
          MATERIAL_SYMBOLS_ICON_NAMES.filter((m) => m.includes(n)).length <= 5,
      )!;
      type(few);
      expect(buttons().length).toBeGreaterThan(0);
      expect(note()).toBeUndefined();
    });

    it('says when nothing matches', async () => {
      await create();
      await loaded();
      type('zzzzzzzz');
      expect(buttons().length).toBe(0);
      expect(note()).toBe('No icons found for "zzzzzzzz".');
    });

    it('lists everything again when the search is cleared', async () => {
      await create();
      await loaded();
      type('home');
      type('');
      expect(names()).toEqual(MATERIAL_SYMBOLS_ICON_NAMES.slice(0, 60));
    });
  });

  describe('choosing', () => {
    it('sets the chosen icon, and shows it in the search box', async () => {
      await create();
      await loaded();
      buttons()[3].click();
      fixture.detectChanges();
      const name = MATERIAL_SYMBOLS_ICON_NAMES[3];
      expect(host.selected()).toBe(name);
      expect(input().value).toBe(name);
    });

    it('marks only the chosen icon', async () => {
      await create();
      await loaded();
      buttons()[2].click();
      fixture.detectChanges();
      const marked = buttons().filter((b) => b.style.backgroundColor !== '');
      expect(marked.length).toBe(1);
      expect(marked[0].title).toBe(MATERIAL_SYMBOLS_ICON_NAMES[2]);
    });

    it('opens with the icon that is already chosen, in the search box and marked in the list', async () => {
      await create('home');
      await loaded();
      expect(input().value).toBe('home');
      expect(names()).toEqual(
        MATERIAL_SYMBOLS_ICON_NAMES.filter((n) => n.includes('home')).slice(
          0,
          60,
        ),
      );
      const marked = buttons().filter((b) => b.style.backgroundColor !== '');
      expect(marked.map((b) => b.title)).toEqual(['home']);
    });

    it('follows the parent when it changes the chosen icon', async () => {
      await create();
      await loaded();
      host.selected.set('star');
      fixture.detectChanges();
      expect(input().value).toBe('star');
    });

    it('passes on what is typed, even when it is not an icon', async () => {
      await create();
      await loaded();
      type('my_icon');
      expect(host.selected()).toBe('my_icon');
    });
  });
});

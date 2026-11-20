import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  KEY_COLORS,
  KEY_COLOR_NAMES,
  KeyLabel,
  KeyLabelType,
} from '../../models/key-label.models';
import { IconPickerComponent } from '../icon-picker/icon-picker.component';
import {
  KeyEditDialogComponent,
  KeyEditDialogData,
} from './key-edit-dialog.component';

describe('KeyEditDialogComponent', () => {
  let close: jasmine.Spy;
  let fixture: ComponentFixture<KeyEditDialogComponent>;

  function create(label: KeyLabel | null = null, positionCode = 12) {
    close = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { positionCode, label } satisfies KeyEditDialogData,
        },
      ],
    });
    fixture = TestBed.createComponent(KeyEditDialogComponent);
    fixture.detectChanges();
    return fixture;
  }
  const el = () => fixture.nativeElement as HTMLElement;
  const textInput = () =>
    el().querySelector('input[matInput]') as HTMLInputElement | null;
  const type = (v: string) => {
    textInput()!.value = v;
    textInput()!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find(
      (b) => b.textContent!.trim() === label,
    ) as HTMLButtonElement;
  const toggle = (label: string) =>
    Array.from(el().querySelectorAll('mat-button-toggle')).find(
      (t) => t.textContent!.trim() === label,
    )!;
  const colorButtons = () =>
    Array.from(
      el().querySelectorAll('button[aria-label]'),
    ) as HTMLButtonElement[];
  const pickColor = (name: string) => {
    colorButtons()
      .find((b) => b.getAttribute('aria-label') === name)!
      .click();
    fixture.detectChanges();
  };
  const checkbox = () =>
    el().querySelector('mat-checkbox input') as HTMLInputElement;

  it('says which key is being edited', () => {
    create(null, 42);
    expect(el().querySelector('h2')!.textContent!.trim()).toBe('Edit key #42');
  });

  describe('for a key with no label', () => {
    beforeEach(() => create());

    it('starts as empty text, with no color, not dimmed', () => {
      expect(textInput()!.value).toBe('');
      expect(toggle('Text').classList).toContain('mat-button-toggle-checked');
      expect(toggle('Icon').classList).not.toContain(
        'mat-button-toggle-checked',
      );
      expect(checkbox().checked).toBeFalse();
      expect(el().querySelector('app-icon-picker')).toBeNull();
    });

    it('saves nothing as a cleared label', () => {
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith(null);
    });

    it('saves text that is typed, without the spaces around it', () => {
      type('  Esc ');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: 'Esc',
      });
    });

    it('treats text of only spaces as nothing', () => {
      type('   ');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith(null);
    });

    it('saves when Enter is pressed in the text box', () => {
      type('x');
      textInput()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter' }),
      );
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: 'x',
      });
    });

    it('can be cancelled, which is different from clearing', () => {
      type('x');
      button('Cancel').click();
      expect(close).toHaveBeenCalledOnceWith(undefined);
    });

    it('can be cleared, whatever was typed', () => {
      type('x');
      button('Clear').click();
      expect(close).toHaveBeenCalledOnceWith(null);
    });
  });

  describe('color', () => {
    beforeEach(() => create());

    it('offers "no color" and every preset, each in its own color', () => {
      const bs = colorButtons();
      expect(bs.map((b) => b.getAttribute('aria-label'))).toEqual([
        'No color',
        ...KEY_COLOR_NAMES,
      ]);
      bs.slice(1).forEach((b, i) => {
        const name = KEY_COLOR_NAMES[i];
        const probe = document.createElement('div');
        probe.style.backgroundColor = KEY_COLORS[name];
        expect(b.style.backgroundColor).toBe(probe.style.backgroundColor);
      });
    });

    it('rings the chosen one, "no color" at first', () => {
      const ringed = () =>
        colorButtons()
          .filter((b) => b.classList.contains('ring-2'))
          .map((b) => b.getAttribute('aria-label'));
      expect(ringed()).toEqual(['No color']);
      pickColor('red');
      expect(ringed()).toEqual(['red']);
      pickColor('No color');
      expect(ringed()).toEqual(['No color']);
    });

    it('saves a color with no text', () => {
      pickColor('mint');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: '',
        color: 'mint',
      });
    });

    it('saves a color with text, and leaves it out once taken off', () => {
      type('a');
      pickColor('blue');
      pickColor('No color');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: 'a',
      });
    });
  });

  describe('dimming', () => {
    beforeEach(() => create());

    it('saves a dimmed key with no text', () => {
      checkbox().click();
      fixture.detectChanges();
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: '',
        dimmed: true,
      });
    });

    it('leaves dimmed out once switched off again', () => {
      type('a');
      checkbox().click();
      checkbox().click();
      fixture.detectChanges();
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: 'a',
      });
    });

    it('is labelled', () => {
      expect(el().querySelector('mat-checkbox')!.textContent!.trim()).toBe(
        'Dim this key',
      );
    });
  });

  describe('for a key that has a label', () => {
    it('starts from its text, color and dimming', () => {
      create({
        type: KeyLabelType.Text,
        value: 'Tab',
        color: 'green',
        dimmed: true,
      });
      expect(textInput()!.value).toBe('Tab');
      expect(
        colorButtons()
          .filter((b) => b.classList.contains('ring-2'))
          .map((b) => b.getAttribute('aria-label')),
      ).toEqual(['green']);
      expect(checkbox().checked).toBeTrue();
    });

    it('saves it back the same when nothing is changed', () => {
      const label: KeyLabel = {
        type: KeyLabelType.Text,
        value: 'Tab',
        color: 'green',
        dimmed: true,
      };
      create(label);
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith(label);
    });

    it('keeps the other fields when only the text is changed', () => {
      create({ type: KeyLabelType.Text, value: 'Tab', color: 'red' });
      type('Shift');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Text,
        value: 'Shift',
        color: 'red',
      });
    });

    it('is cleared when the text, color and dimming are all taken away', () => {
      create({ type: KeyLabelType.Text, value: 'Tab', color: 'red' });
      type('');
      pickColor('No color');
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith(null);
    });
  });

  describe('icon', () => {
    it('starts on the icon tab, with the icon picker and a preview of the icon', async () => {
      create({ type: KeyLabelType.Icon, value: 'home' });
      expect(toggle('Icon').classList).toContain('mat-button-toggle-checked');
      expect(textInput()?.closest('app-icon-picker')).not.toBeNull();
      expect(el().querySelector('app-icon-picker')).not.toBeNull();
      const preview = el().querySelector('.text-3xl')!;
      expect(preview.classList).toContain('material-symbols-rounded');
      expect(preview.textContent).toBe('home');
    });

    it('shows no preview without an icon', () => {
      create({ type: KeyLabelType.Icon, value: '', color: 'red' });
      expect(el().querySelector('.text-3xl')).toBeNull();
    });

    it('switches between text and icon, keeping what was entered', () => {
      create();
      type('abc');
      (toggle('Icon').querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().querySelector('app-icon-picker')).not.toBeNull();
      expect(el().querySelector('.text-3xl')!.textContent).toBe('abc');
      (toggle('Text').querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().querySelector('app-icon-picker')).toBeNull();
      expect(textInput()!.value).toBe('abc');
    });

    it('saves an icon label', () => {
      create({ type: KeyLabelType.Icon, value: 'home' });
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Icon,
        value: 'home',
      });
    });

    it('saves what is picked in the icon picker', () => {
      create({ type: KeyLabelType.Icon, value: '' });
      const picker = fixture.debugElement.query(
        (d) => d.componentInstance instanceof IconPickerComponent,
      ).componentInstance as IconPickerComponent;
      picker.selected.set('star');
      fixture.detectChanges();
      button('Save').click();
      expect(close).toHaveBeenCalledOnceWith({
        type: KeyLabelType.Icon,
        value: 'star',
      });
    });
  });
});

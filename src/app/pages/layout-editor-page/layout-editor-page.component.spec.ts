import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { POSITION_CODE_LAYOUT } from 'tangent-cc-lib';
import { LayoutComponent } from '../../components/layout/layout.component';
import { DeviceType } from '../../models/device.models';
import {
  KEY_COLOR_NAMES,
  KeyLabel,
  KeyLabelType,
} from '../../models/key-label.models';
import { LayerStore } from '../../stores/layer.store';
import { LayoutEditorPageComponent } from './layout-editor-page.component';

const text = (value: string, extra: Partial<KeyLabel> = {}): KeyLabel => ({
  type: KeyLabelType.Text,
  value,
  ...extra,
});

describe('LayoutEditorPageComponent', () => {
  let fixture: ComponentFixture<LayoutEditorPageComponent>;
  let store: LayerStore;
  let dialogResult: unknown;
  let opened: { positionCode: number; label: KeyLabel | null }[];
  let snack: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    opened = [];
    dialogResult = undefined;
    snack = jasmine.createSpy('open');
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {
          provide: MatDialog,
          useValue: {
            open: (
              _c: unknown,
              config: {
                data: { positionCode: number; label: KeyLabel | null };
              },
            ) => {
              opened.push(config.data);
              return { afterClosed: () => of(dialogResult) };
            },
          },
        },
        { provide: MatSnackBar, useValue: { open: snack } },
      ],
    });
    store = TestBed.inject(LayerStore);
    fixture = TestBed.createComponent(LayoutEditorPageComponent);
    fixture.detectChanges();
  });
  afterAll(() => localStorage.clear());

  const el = () => fixture.nativeElement as HTMLElement;
  const page = () =>
    fixture.componentInstance as unknown as Record<
      string,
      (...a: unknown[]) => unknown
    >;
  const state = () =>
    fixture.componentInstance as unknown as {
      selectedKeys: () => ReadonlySet<number>;
      multiSelect: () => boolean;
      exportingImage: () => boolean;
    };
  const btn = (label: string) =>
    Array.from(el().querySelectorAll('button, a[mat-icon-button]')).find(
      (b) =>
        b.textContent!.trim() === label ||
        b.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;
  const click = (label: string) => {
    btn(label).click();
    fixture.detectChanges();
  };
  const layout = () =>
    fixture.debugElement.query(By.directive(LayoutComponent))
      .componentInstance as LayoutComponent;
  const selected = () => [...state().selectedKeys()].sort((a, b) => a - b);
  const clickKey = (code: number) => {
    page()['onKeyClick'](code);
    fixture.detectChanges();
  };
  const startMulti = () => click('Multi-select');
  const allCodes = (excludeThumbEnd = false) => {
    const codes: number[] = [];
    for (const side of Object.values(POSITION_CODE_LAYOUT)) {
      for (const [sw, map] of Object.entries(side)) {
        if (excludeThumbEnd && sw === 'thumbEnd') continue;
        codes.push(...Object.values(map as Record<string, number>));
      }
    }
    return codes.sort((a, b) => a - b);
  };

  describe('layout', () => {
    it('draws the layout of the active layer', () => {
      store.setLabel(3, text('x'));
      fixture.detectChanges();
      expect(layout().keyLabelMap()).toEqual({ 3: text('x') });
      expect(layout().showThumb3Switch()).toBeTrue();
    });

    it('leaves out the 3rd thumb switch for the Master Forge', () => {
      store.setDeviceType(DeviceType.MasterForge);
      fixture.detectChanges();
      expect(layout().showThumb3Switch()).toBeFalse();
    });
  });

  describe('editing a key', () => {
    it('opens the dialog with the key and its label', () => {
      store.setLabel(7, text('Tab'));
      clickKey(7);
      expect(opened).toEqual([{ positionCode: 7, label: text('Tab') }]);
    });

    it('opens the dialog with no label for a key that has none', () => {
      clickKey(8);
      expect(opened).toEqual([{ positionCode: 8, label: null }]);
    });

    it('sets the label that comes back', () => {
      dialogResult = text('New', { color: 'red' });
      clickKey(4);
      expect(store.labels()).toEqual({ 4: text('New', { color: 'red' }) });
    });

    it('clears the label when the dialog says so', () => {
      store.setLabel(4, text('x'));
      dialogResult = null;
      clickKey(4);
      expect(store.labels()).toEqual({});
    });

    it('changes nothing when the dialog is cancelled', () => {
      store.setLabel(4, text('x'));
      dialogResult = undefined;
      clickKey(4);
      expect(store.labels()).toEqual({ 4: text('x') });
    });

    it('is reached by clicking a key in the layout', () => {
      const first = layout()
        .getSvgElement()
        .querySelector('path.cursor-pointer') as SVGPathElement;
      first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(opened.length).toBe(1);
    });
  });

  describe('multi-select', () => {
    it('is off at first, with a button to turn it on and no second row of tools', () => {
      expect(state().multiSelect()).toBeFalse();
      expect(btn('Multi-select')).toBeTruthy();
      expect(btn('Done selecting')).toBeUndefined();
      expect(btn('Select unlabeled')).toBeUndefined();
    });

    it('shows the second row, with a done button, once on', () => {
      startMulti();
      expect(state().multiSelect()).toBeTrue();
      expect(btn('Done selecting')).toBeTruthy();
      expect(btn('Multi-select')).toBeUndefined();
      expect(btn('Select unlabeled')).toBeTruthy();
      expect(el().textContent).toContain('0 selected');
    });

    it('selects and un-selects a key by clicking it, instead of opening the dialog', () => {
      startMulti();
      clickKey(3);
      clickKey(5);
      expect(selected()).toEqual([3, 5]);
      clickKey(3);
      expect(selected()).toEqual([5]);
      expect(opened).toEqual([]);
      expect(el().textContent).toContain('1 selected');
    });

    it('passes the selection on to the layout', () => {
      startMulti();
      clickKey(9);
      expect(layout().selectedKeys()).toBe(state().selectedKeys());
      expect(
        layout().getSvgElement().querySelectorAll('[data-export-ignore]')
          .length,
      ).toBe(1);
    });

    it('forgets the selection when turned off, and when turned on again', () => {
      startMulti();
      clickKey(3);
      click('Done selecting');
      expect(selected()).toEqual([]);
      startMulti();
      expect(selected()).toEqual([]);
      clickKey(3);
      click('Done selecting');
      startMulti();
      expect(selected()).toEqual([]);
    });

    it('opens the dialog again after it is turned off', () => {
      startMulti();
      click('Done selecting');
      clickKey(2);
      expect(opened.length).toBe(1);
    });

    it('clears the selection', () => {
      startMulti();
      clickKey(1);
      clickKey(2);
      click('Clear selection');
      expect(selected()).toEqual([]);
      expect(state().multiSelect()).toBeTrue();
    });

    describe('picking many', () => {
      beforeEach(startMulti);

      it('selects every key that has no label', () => {
        store.setLabel(0, text('a'));
        store.setLabel(1, text('', { color: 'red' }));
        store.setLabel(2, { type: KeyLabelType.Icon, value: 'home' });
        click('Select unlabeled');
        const expected = allCodes().filter((c) => c !== 0 && c !== 2);
        expect(selected()).toEqual(expected);
        expect(selected()).toContain(1);
      });

      it('replaces what was selected before', () => {
        clickKey(0);
        store.setLabel(0, text('a'));
        click('Select unlabeled');
        expect(selected()).not.toContain(0);
      });

      it('leaves out the keys of the 3rd thumb switch on a Master Forge', () => {
        store.setDeviceType(DeviceType.MasterForge);
        fixture.detectChanges();
        click('Select unlabeled');
        expect(selected()).toEqual(allCodes(true));
        expect(selected().length).toBe(90 - 10);
      });

      it('has all 90 keys on the other devices', () => {
        click('Select unlabeled');
        expect(selected().length).toBe(90);
      });

      it('inverts the selection', () => {
        clickKey(0);
        clickKey(1);
        click('Invert');
        expect(selected()).toEqual(
          allCodes().filter((c) => c !== 0 && c !== 1),
        );
        click('Invert');
        expect(selected()).toEqual([0, 1]);
      });

      it('inverting an empty selection selects everything shown', () => {
        click('Invert');
        expect(selected()).toEqual(allCodes());
      });
    });

    describe('changing many', () => {
      beforeEach(() => {
        startMulti();
        clickKey(10);
        clickKey(11);
      });

      it('gives the same color to every selected key', () => {
        click('Apply red');
        expect(store.labels()).toEqual({
          10: text('', { color: 'red' }),
          11: text('', { color: 'red' }),
        });
      });

      it('offers every color, and one to remove it', () => {
        for (const name of KEY_COLOR_NAMES) {
          expect(btn(`Apply ${name}`)).toBeTruthy();
        }
        store.setColorForKeys([10], 'blue');
        fixture.detectChanges();
        click('Remove color');
        expect(store.labels()).toEqual(
          { 11: undefined as never }.constructor === Object ? {} : {},
        );
      });

      it('dims and un-dims the selected keys', () => {
        click('Dim');
        expect(store.labels()[10]).toEqual(text('', { dimmed: true }));
        click('Undim');
        expect(store.labels()).toEqual({});
      });

      it('does not touch keys that are not selected', () => {
        store.setLabel(50, text('x'));
        click('Dim');
        expect(store.labels()[50]).toEqual(text('x'));
      });

      it('has the buttons off until a key is selected', () => {
        click('Clear selection');
        expect(btn('Apply red').disabled).toBeTrue();
        expect(btn('Remove color').disabled).toBeTrue();
        expect(btn('Dim').disabled).toBeTrue();
        expect(btn('Undim').disabled).toBeTrue();
        clickKey(1);
        expect(btn('Apply red').disabled).toBeFalse();
        expect(btn('Dim').disabled).toBeFalse();
      });
    });
  });

  describe('export', () => {
    let blobs: Blob[];
    let clicked: { download: string; href: string }[];
    beforeEach(() => {
      blobs = [];
      clicked = [];
      spyOn(URL, 'createObjectURL').and.callFake((b) => {
        blobs.push(b as Blob);
        return 'blob:x';
      });
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push({ download: this.download, href: this.href });
      });
    });

    it('saves the labels as a JSON file with a version', async () => {
      store.setLabel(2, text('a'));
      page()['onExport']();
      expect(clicked).toEqual([
        { download: 'alhena-layout.json', href: 'blob:x' },
      ]);
      expect(blobs[0].type).toBe('application/json');
      expect(JSON.parse(await blobs[0].text())).toEqual({
        version: 1,
        labels: { '2': text('a') },
      });
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    });

    it('is written with indentation, so it is readable', async () => {
      store.setLabel(2, text('a'));
      page()['onExport']();
      expect(await blobs[0].text()).toContain('\n  "version": 1');
    });

    it('has a button for it', () => {
      page()['onExport'] = jasmine.createSpy('onExport') as never;
      expect(btn('Export JSON')).toBeTruthy();
    });
  });

  describe('save image', () => {
    let clicked: string[];
    beforeEach(() => {
      clicked = [];
      const real = URL.createObjectURL.bind(URL);
      // the drawing has to be a real address so the browser can load it;
      // only the downloaded PNG gets a made-up one
      spyOn(URL, 'createObjectURL').and.callFake((b) =>
        (b as Blob).type.startsWith('image/svg+xml') ? real(b) : 'blob:img',
      );
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push(this.download);
      });
    });

    // The real export runs here (nothing in it is replaced except the font
    // download and the final encoding), so these also check the page hands it
    // the layout's own svg.
    beforeEach(() => {
      // The font is fetched once and kept for the whole run, so answer it
      // exactly as svg-export.utils.spec.ts does, whichever file runs first.
      spyOn(window, 'fetch').and.callFake(async (input) =>
        String(input).includes('googleapis')
          ? new Response(
              "@font-face { font-family: 'Material Symbols Rounded'; src: url(https://example.test/font.woff2) format('woff2'); }",
            )
          : new Response(new Blob([new Uint8Array([1, 2, 3])])),
      );
    });

    it('draws the layout svg and saves it as a PNG file', async () => {
      await (page()['onSaveImage']() as Promise<void>);
      expect(clicked).toEqual(['alhena-layout.png']);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2); // the drawing, then the PNG
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img');
      expect(state().exportingImage()).toBeFalse();
      expect(snack).not.toHaveBeenCalled();
    });

    it('is busy while it works, with its button off', async () => {
      let finish!: (b: Blob | null) => void;
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((cb) => {
        finish = cb;
      });
      const done = page()['onSaveImage']() as Promise<void>;
      fixture.detectChanges();
      expect(state().exportingImage()).toBeTrue();
      expect(btn('Saving…').disabled).toBeTrue();
      for (let i = 0; i < 50 && !finish; i++)
        await new Promise((r) => setTimeout(r, 10));
      finish(new Blob(['x']));
      await done;
      fixture.detectChanges();
      expect(btn('Save Image').disabled).toBeFalse();
      expect(clicked).toEqual(['alhena-layout.png']);
    });

    it('says so when it fails, and is not busy any more', async () => {
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((cb) =>
        cb(null),
      );
      await (page()['onSaveImage']() as Promise<void>);
      expect(snack).toHaveBeenCalledOnceWith(
        'Image export failed: Failed to encode the layout as a PNG image.',
        'OK',
        { duration: 5000 },
      );
      expect(clicked).toEqual([]);
      expect(state().exportingImage()).toBeFalse();
    });
  });

  it('prints the page', () => {
    const print = spyOn(window, 'print');
    click('Print');
    expect(print).toHaveBeenCalledTimes(1);
  });

  describe('import', () => {
    const file = (content: string) =>
      new File([content], 'layout.json', { type: 'application/json' });
    const select = async (f: File | null) => {
      const input = el().querySelector('input[type=file]') as HTMLInputElement;
      const dt = new DataTransfer();
      if (f) dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
      for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 5));
      fixture.detectChanges();
      return input;
    };
    const valid = JSON.stringify({ version: 1, labels: { '3': text('in') } });

    it('opens the file chooser from the button, for JSON files only', () => {
      const input = el().querySelector('input[type=file]') as HTMLInputElement;
      expect(input.accept).toBe('application/json');
      const open = spyOn(input, 'click');
      click('Import JSON');
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('replaces the labels, and says how many came in', async () => {
      await select(file(valid));
      expect(store.labels()).toEqual({ 3: text('in') });
      expect(snack).toHaveBeenCalledOnceWith('Imported 1 key label(s).', 'OK', {
        duration: 3000,
      });
    });

    it('does not ask when there is nothing to lose', async () => {
      const confirm = spyOn(window, 'confirm');
      await select(file(valid));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('asks first when there are labels that would be replaced', async () => {
      store.setLabel(1, text('mine'));
      const confirm = spyOn(window, 'confirm').and.returnValue(true);
      await select(file(valid));
      expect(confirm).toHaveBeenCalledOnceWith(
        'Importing will replace all current key labels. Continue?',
      );
      expect(store.labels()).toEqual({ 3: text('in') });
    });

    it('keeps the labels when you say no', async () => {
      store.setLabel(1, text('mine'));
      spyOn(window, 'confirm').and.returnValue(false);
      await select(file(valid));
      expect(store.labels()).toEqual({ 1: text('mine') });
      expect(snack).not.toHaveBeenCalled();
    });

    it('does nothing when no file is chosen', async () => {
      const confirm = spyOn(window, 'confirm');
      await select(null);
      expect(store.labels()).toEqual({});
      expect(snack).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();
    });

    it('lets the same file be chosen again', async () => {
      const input = await select(file(valid));
      expect(input.value).toBe('');
    });

    it('says why when the file is not valid, and keeps the labels', async () => {
      store.setLabel(1, text('mine'));
      spyOn(window, 'confirm').and.returnValue(true);
      await select(file(JSON.stringify({ version: 9, labels: {} })));
      expect(snack).toHaveBeenCalledOnceWith(
        'Import failed: Unsupported layout file version: 9.',
        'OK',
        { duration: 5000 },
      );
      expect(store.labels()).toEqual({ 1: text('mine') });
    });

    it('says so when the file is not JSON', async () => {
      await select(file('not json'));
      expect(snack.calls.mostRecent().args[0]).toMatch(/^Import failed: /);
      expect(snack.calls.mostRecent().args[2]).toEqual({ duration: 5000 });
    });
  });

  describe('layers', () => {
    it('lists the layers and shows the active one', () => {
      store.addLayer('Second');
      fixture.detectChanges();
      const select = fixture.debugElement.queryAll(By.css('mat-select'))[0]
        .componentInstance;
      expect(select.value).toBe(store.activeLayerId());
    });

    it('switches layers from the list', () => {
      const first = store.layers()[0].id;
      store.addLayer('Second');
      fixture.detectChanges();
      const select = fixture.debugElement.queryAll(By.css('mat-select'))[0]
        .componentInstance;
      select.valueChange.emit(first);
      expect(store.activeLayerId()).toBe(first);
    });

    it('switches the device from the list, showing the current one', () => {
      const select = fixture.debugElement.queryAll(By.css('mat-select'))[1]
        .componentInstance;
      expect(select.value).toBe(DeviceType.Standard);
      select.valueChange.emit(DeviceType.MasterForge);
      expect(store.deviceType()).toBe(DeviceType.MasterForge);
    });

    describe('new layer', () => {
      it('suggests the next number as its name', () => {
        const prompt = spyOn(window, 'prompt').and.returnValue(null);
        click('New layer');
        expect(prompt).toHaveBeenCalledOnceWith('New layer name:', 'Layer 2');
      });

      it('adds a layer with the name that is given, and switches to it', () => {
        spyOn(window, 'prompt').and.returnValue('Mine');
        click('New layer');
        expect(store.layers().map((l) => l.name)).toEqual(['Layer 1', 'Mine']);
        expect(store.activeLayer().name).toBe('Mine');
      });

      it('adds nothing when cancelled or left empty', () => {
        const prompt = spyOn(window, 'prompt').and.returnValue(null);
        click('New layer');
        prompt.and.returnValue('');
        click('New layer');
        expect(store.layers().length).toBe(1);
      });
    });

    describe('delete layer', () => {
      it('refuses to delete the only layer, and says so', () => {
        const confirm = spyOn(window, 'confirm');
        click('Delete layer');
        expect(snack).toHaveBeenCalledOnceWith(
          'Can’t delete the only layer.',
          'OK',
          { duration: 3000 },
        );
        expect(confirm).not.toHaveBeenCalled();
        expect(store.layers().length).toBe(1);
      });

      it('asks by name, then deletes the active layer', () => {
        store.addLayer('Second');
        const confirm = spyOn(window, 'confirm').and.returnValue(true);
        click('Delete layer');
        expect(confirm).toHaveBeenCalledOnceWith(
          'Delete layer "Second"? This can\'t be undone.',
        );
        expect(store.layers().map((l) => l.name)).toEqual(['Layer 1']);
      });

      it('keeps the layer when you say no', () => {
        store.addLayer('Second');
        spyOn(window, 'confirm').and.returnValue(false);
        click('Delete layer');
        expect(store.layers().length).toBe(2);
      });
    });
  });

  it('links to the source code in a new tab, safely', () => {
    const a = btn('Source code on GitHub') as unknown as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://github.com/andy23512/alhena');
    expect(a.target).toBe('_blank');
    expect(a.rel).toBe('noopener');
  });

  it('hides the toolbars when printing', () => {
    const rows = el().querySelectorAll('.print\\:hidden');
    expect(rows.length).toBeGreaterThan(0);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { LayoutEditorPageComponent } from './pages/layout-editor-page/layout-editor-page.component';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes), provideNoopAnimations()],
    });
  });
  afterAll(() => localStorage.clear());

  it('has one route, the editor, at the root', () => {
    expect(appRoutes.length).toBe(1);
    expect(appRoutes[0].path).toBe('');
    expect(appRoutes[0].component).toBe(LayoutEditorPageComponent);
  });

  it('shows the editor in its router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-layout-editor-page'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-layout')).not.toBeNull();
  });
});

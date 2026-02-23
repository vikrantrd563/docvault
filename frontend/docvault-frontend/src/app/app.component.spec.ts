import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { AppComponent } from './app.component';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { Subject } from 'rxjs';

describe('AppComponent', () => {
  let component: AppComponent;
  let authSpy: any;
  let broadcastSpy: any;

  beforeEach(async () => {
    authSpy = {
      instance: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getAllAccounts: vi.fn().mockReturnValue([]),
      },
      logoutRedirect: vi.fn(),
    };
    broadcastSpy = { msalSubject$: new Subject() };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: MsalService, useValue: authSpy },
        { provide: MsalBroadcastService, useValue: broadcastSpy },
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should start with loggedIn false', () => { expect(component.loggedIn).toBe(false); });

  it('checkAuth() should set loggedIn false when no accounts', () => {
    authSpy.instance.getAllAccounts.mockReturnValue([]);
    component.checkAuth();
    expect(component.loggedIn).toBe(false);
  });

  it('checkAuth() should set loggedIn true when account exists', () => {
    authSpy.instance.getAllAccounts.mockReturnValue([{ name: 'Vikrant Shah', username: 'v@test.com' }]);
    component.checkAuth();
    expect(component.loggedIn).toBe(true);
    expect(component.displayName).toBe('Vikrant Shah');
    expect(component.userEmail).toBe('v@test.com');
    expect(component.initials).toBe('VS');
  });

  it('checkAuth() should handle single name with no last name', () => {
    authSpy.instance.getAllAccounts.mockReturnValue([{ name: 'Vikrant', username: 'v@test.com' }]);
    component.checkAuth();
    expect(component.initials).toBe('V');
  });

  it('logout() should call logoutRedirect', () => {
    component.logout();
    expect(authSpy.logoutRedirect).toHaveBeenCalled();
  });

  it('ngOnDestroy() should complete destroy$', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

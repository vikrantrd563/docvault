import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent as App } from './app.component';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';

const msalMock = {
  loginRedirect: () => {},
  instance: {
    initialize: () => Promise.resolve(),
    getAllAccounts: () => [],
    getActiveAccount: () => null,
  }
};

const msalBroadcastMock = {
  msalSubject$: { subscribe: () => {} },
  inProgress$: { pipe: () => ({ subscribe: () => {} }) }
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalMock },
        { provide: MsalBroadcastService, useValue: msalBroadcastMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

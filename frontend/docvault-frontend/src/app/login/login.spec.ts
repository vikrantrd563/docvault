import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { LoginComponent as Login } from './login.component';
import { MsalService } from '@azure/msal-angular';

const msalMock = {
  loginRedirect: () => {},
  instance: {
    initialize: () => Promise.resolve(),
    getAllAccounts: () => [],
    getActiveAccount: () => null,
  }
};

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should navigate to / if already logged in', async () => {
    const routerSpy = { navigate: vi.fn() };
    (component as any).router = routerSpy;
    (msalMock.instance as any).getAllAccounts = () => [{ name: 'Vikrant' }];
    await component.ngOnInit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    msalMock.instance.getAllAccounts = () => [];
  });

  it('login() should call loginRedirect', () => {
    const spy = vi.spyOn(msalMock, 'loginRedirect');
    component.login();
    expect(spy).toHaveBeenCalled();
  });

});





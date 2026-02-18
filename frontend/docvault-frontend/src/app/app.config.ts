import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS }
 from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MSAL_INSTANCE, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG,
 MsalService, MsalGuard, MsalBroadcastService, MsalInterceptor,
 MsalModule } from '@azure/msal-angular';
import { routes } from './app.routes';
import { MSALInstanceFactory, MSALGuardConfigFactory,
 MSALInterceptorConfigFactory } from './auth-config';
export const appConfig: ApplicationConfig = {
 providers: [
 provideRouter(routes),
 provideAnimations(),
 provideHttpClient(withInterceptorsFromDi()),
 importProvidersFrom(MsalModule),
 { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
 { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
 { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
 { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
 MsalService,
 MsalGuard,
 MsalBroadcastService
 ]
};

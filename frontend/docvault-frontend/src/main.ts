import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { MsalRedirectComponent } from '@azure/msal-angular';

// Bootstrap main app
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

// Bootstrap MSAL redirect handler separately
bootstrapApplication(MsalRedirectComponent, appConfig)
  .catch(err => console.error(err));

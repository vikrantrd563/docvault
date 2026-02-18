export const environment = {
  production: false,
  apiBaseUrl: 'http://10.10.11.178:5251/api',
  msalConfig: {
    auth: {
      clientId: 'cdeae5d3-39ef-4f39-adb4-0dcfcf038a0f',
      authority: 'https://login.microsoftonline.com/aba96f5c-fedf-45cc-8df8-8a5c26557f1f',
      redirectUri: 'http://localhost:4200'
    }
  },
  apiScopes: ['api://cdeae5d3-39ef-4f39-adb4-0dcfcf038a0f/Documents.Read']
};
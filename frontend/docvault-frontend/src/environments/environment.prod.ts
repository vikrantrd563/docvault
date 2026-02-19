export const environment = {
  production: true,
  apiBaseUrl: 'https://docvault-apim.azure-api.net',
  msalConfig: {
    auth: {
      clientId: 'cdeae5d3-39ef-4f39-adb4-0dcfcf038a0f',
      authority: 'https://login.microsoftonline.com/aba96f5c-fedf-45cc-8df8-8a5c26557f1f',
      redirectUri: 'http://localhost:4200'
    }
  },
  apiScopes: ['api://cdeae5d3-39ef-4f39-adb4-0dcfcf038a0f/Documents.Read']
};
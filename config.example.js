// Copy this file to config.js and set your values. Do not commit config.js (it's in .gitignore).
window.MAILTRAP_CONFIG = {
  accountId: '123456',
  defaultInboxId: '1234567',
  baseUrl: 'https://mailtrap.io/api',
  defaultToken: '',  // Paste your Mailtrap API token here, or use the UI after opening the app
  getToken() {
    return localStorage.getItem('mailtrap_api_token') || this.defaultToken || '';
  },
  setToken(token) {
    localStorage.setItem('mailtrap_api_token', token);
  },
  getInboxId() {
    return localStorage.getItem('mailtrap_inbox_id') || this.defaultInboxId || '';
  },
  setInboxId(id) {
    localStorage.setItem('mailtrap_inbox_id', String(id).trim());
  }
};

const CONFIG = window.MAILTRAP_CONFIG;

function getApiUrl() {
  const inboxId = CONFIG.getInboxId();
  return `${CONFIG.baseUrl}/accounts/${CONFIG.accountId}/inboxes/${inboxId}/messages`;
}

const elements = {
  messageList: document.getElementById('message-list'),
  messageCount: document.getElementById('message-count'),
  listLoading: document.getElementById('list-loading'),
  listError: document.getElementById('list-error'),
  tokenPrompt: document.getElementById('token-prompt'),
  apiToken: document.getElementById('api-token'),
  apiTokenModal: document.getElementById('api-token-modal'),
  saveToken: document.getElementById('save-token'),
  saveTokenModal: document.getElementById('save-token-modal'),
  inboxId: document.getElementById('inbox-id'),
  refresh: document.getElementById('refresh'),
  detailEmpty: document.getElementById('detail-empty'),
  detailContent: document.getElementById('detail-content'),
  detailSubject: document.getElementById('detail-subject'),
  detailFrom: document.getElementById('detail-from'),
  detailTo: document.getElementById('detail-to'),
  detailSent: document.getElementById('detail-sent'),
  detailSize: document.getElementById('detail-size'),
  detailBody: document.getElementById('detail-body'),
  bodyIframe: document.getElementById('body-iframe'),
  bodyText: document.getElementById('body-text'),
  tabs: document.querySelectorAll('.tab')
};

let messages = [];
let selectedId = null;

function showTokenPrompt() {
  const token = CONFIG.getToken();
  if (!token) {
    elements.tokenPrompt.classList.remove('hidden');
  } else {
    elements.apiToken.value = token;
    elements.inboxId.value = CONFIG.getInboxId();
    loadMessages();
  }
}

function hideTokenPrompt() {
  elements.tokenPrompt.classList.add('hidden');
}

function saveTokenFromModal() {
  const token = elements.apiTokenModal.value.trim();
  if (token) {
    CONFIG.setToken(token);
    elements.apiToken.value = token;
    elements.apiTokenModal.value = '';
    hideTokenPrompt();
    loadMessages();
  }
}

function saveTokenFromHeader() {
  const token = elements.apiToken.value.trim();
  const inboxId = elements.inboxId.value.trim();
  if (token) CONFIG.setToken(token);
  if (inboxId) CONFIG.setInboxId(inboxId);
  if (token || inboxId) loadMessages();
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderMessageList() {
  elements.messageList.innerHTML = '';
  elements.messageCount.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}`;

  messages.forEach((msg) => {
    const li = document.createElement('li');
    li.className = 'message-item' + (msg.is_read ? '' : ' unread');
    if (selectedId === msg.id) li.classList.add('active');
    li.innerHTML = `
      <div class="subject">${escapeHtml(msg.subject || '(No subject)')}</div>
      <div class="from">${escapeHtml(msg.from_email || msg.from_name || '—')}</div>
      <div class="date">${formatDate(msg.sent_at)}</div>
    `;
    li.addEventListener('click', () => selectMessage(msg.id));
    elements.messageList.appendChild(li);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function selectMessage(id) {
  selectedId = id;
  renderMessageList();
  const msg = messages.find((m) => m.id === id);
  if (!msg) return;

  elements.detailEmpty.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');
  elements.detailSubject.textContent = msg.subject || '(No subject)';
  elements.detailFrom.textContent = msg.from_name ? `${msg.from_name} <${msg.from_email}>` : msg.from_email;
  elements.detailTo.textContent = msg.to_email;
  elements.detailSent.textContent = new Date(msg.sent_at).toLocaleString();
  elements.detailSize.textContent = msg.human_size || `${msg.email_size} bytes`;

  elements.bodyText.classList.add('hidden');
  elements.bodyIframe.classList.add('hidden');
  switchBodyTab('html', msg);
}

function switchBodyTab(tab, msg) {
  if (!msg) msg = messages.find((m) => m.id === selectedId);
  if (!msg) return;

  elements.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));

  if (tab === 'html' && msg.html_path) {
    elements.bodyText.classList.add('hidden');
    elements.bodyIframe.classList.remove('hidden');
    const url = `https://mailtrap.io${msg.html_path}`;
    fetch(url, { headers: { 'Api-Token': CONFIG.getToken() } })
      .then((r) => r.text())
      .then((html) => {
        const doc = elements.bodyIframe.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
      })
      .catch(() => {
        elements.bodyIframe.srcdoc = '<p style="padding:1rem;color:#888">Could not load HTML body.</p>';
      });
  } else if (tab === 'text' && msg.txt_path) {
    elements.bodyIframe.classList.add('hidden');
    elements.bodyText.classList.remove('hidden');
    const url = `https://mailtrap.io${msg.txt_path}`;
    fetch(url, { headers: { 'Api-Token': CONFIG.getToken() } })
      .then((r) => r.text())
      .then((text) => {
        elements.bodyText.textContent = text;
      })
      .catch(() => {
        elements.bodyText.textContent = 'Could not load text body.';
      });
  } else if (tab === 'raw' && msg.raw_path) {
    elements.bodyIframe.classList.add('hidden');
    elements.bodyText.classList.remove('hidden');
    const url = `https://mailtrap.io${msg.raw_path}`;
    fetch(url, { headers: { 'Api-Token': CONFIG.getToken() } })
      .then((r) => r.text())
      .then((text) => {
        elements.bodyText.textContent = text;
      })
      .catch(() => {
        elements.bodyText.textContent = 'Could not load raw body.';
      });
  } else {
    elements.bodyIframe.classList.add('hidden');
    elements.bodyText.classList.remove('hidden');
    elements.bodyText.textContent = 'No content available for this tab.';
  }
}

async function loadMessages() {
  const token = CONFIG.getToken();
  if (!token) {
    showTokenPrompt();
    return;
  }

  elements.listError.classList.add('hidden');
  elements.listLoading.classList.remove('hidden');
  elements.messageList.innerHTML = '';

  try {
    const res = await fetch(getApiUrl(), {
      headers: { 'Api-Token': token }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    messages = await res.json();
    if (!Array.isArray(messages)) messages = [];
    renderMessageList();
    if (selectedId && !messages.some((m) => m.id === selectedId)) {
      selectedId = null;
      elements.detailContent.classList.add('hidden');
      elements.detailEmpty.classList.remove('hidden');
    }
  } catch (e) {
    elements.listError.textContent = e.message || 'Failed to load messages';
    elements.listError.classList.remove('hidden');
    messages = [];
    renderMessageList();
  } finally {
    elements.listLoading.classList.add('hidden');
  }
}

function init() {
  elements.saveTokenModal.addEventListener('click', saveTokenFromModal);
  elements.saveToken.addEventListener('click', saveTokenFromHeader);
  elements.refresh.addEventListener('click', () => {
    const token = elements.apiToken.value.trim();
    const inboxId = elements.inboxId.value.trim();
    if (token) CONFIG.setToken(token);
    if (inboxId) CONFIG.setInboxId(inboxId);
    loadMessages();
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchBodyTab(tab.dataset.tab));
  });

  showTokenPrompt();
}

init();

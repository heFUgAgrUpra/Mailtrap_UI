const CONFIG = window.MAILTRAP_CONFIG;

function getCurrentInboxId() {
  return (elements.inboxSelect && elements.inboxSelect.value) || CONFIG.getInboxId();
}

const MESSAGES_PER_PAGE = 30;

function getApiUrl(opts) {
  const accountId = CONFIG.getAccountId();
  const inboxId = getCurrentInboxId();
  let url = `${CONFIG.baseUrl}/accounts/${accountId}/inboxes/${inboxId}/messages`;
  const params = new URLSearchParams();
  if (opts && opts.page) params.set('page', String(opts.page));
  if (opts && opts.search && opts.search.trim()) params.set('search', opts.search.trim());
  const qs = params.toString();
  if (qs) url += '?' + qs;
  return url;
}

function getInboxesUrl() {
  const accountId = CONFIG.getAccountId();
  return `${CONFIG.baseUrl}/accounts/${accountId}/inboxes`;
}

const elements = {
  messageList: document.getElementById('message-list'),
  messageCount: document.getElementById('message-count'),
  listLoading: document.getElementById('list-loading'),
  listError: document.getElementById('list-error'),
  pagination: document.getElementById('pagination'),
  pageFirst: document.getElementById('page-first'),
  pagePrev: document.getElementById('page-prev'),
  pageNext: document.getElementById('page-next'),
  pageInfo: document.getElementById('page-info'),
  tokenPrompt: document.getElementById('token-prompt'),
  openSettingsFromPrompt: document.getElementById('open-settings-from-prompt'),
  settingsModal: document.getElementById('settings-modal'),
  settingsApiToken: document.getElementById('settings-api-token'),
  settingsAccountId: document.getElementById('settings-account-id'),
  settingsSave: document.getElementById('settings-save'),
  settingsCancel: document.getElementById('settings-cancel'),
  settingsBtn: document.getElementById('settings-btn'),
  inboxSelect: document.getElementById('inbox-select'),
  defaultInboxCheckbox: document.getElementById('default-inbox'),
  searchInput: document.getElementById('search-input'),
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
  contextMenu: document.getElementById('context-menu'),
  tabs: document.querySelectorAll('.tab')
};

let messages = [];
let selectedId = null;
let searchQuery = '';
let currentPage = 1;
let hasMorePages = false;

function showTokenPrompt() {
  const token = CONFIG.getToken();
  if (!token) {
    elements.tokenPrompt.classList.remove('hidden');
  } else {
    loadInboxes();
  }
}

function hideTokenPrompt() {
  elements.tokenPrompt.classList.add('hidden');
}

function syncDefaultInboxCheckbox() {
  if (!elements.defaultInboxCheckbox) return;
  const saved = CONFIG.getInboxId();
  const current = elements.inboxSelect && elements.inboxSelect.value;
  elements.defaultInboxCheckbox.checked = !!(current && saved && current === saved);
}

function openSettings() {
  if (elements.settingsApiToken) elements.settingsApiToken.value = CONFIG.getToken();
  if (elements.settingsAccountId) elements.settingsAccountId.value = CONFIG.getAccountId();
  elements.settingsModal.classList.remove('hidden');
  elements.tokenPrompt.classList.add('hidden');
}

function closeSettings() {
  elements.settingsModal.classList.add('hidden');
}

function saveSettings() {
  const token = elements.settingsApiToken.value.trim();
  const accountId = elements.settingsAccountId.value.trim();
  if (token) CONFIG.setToken(token);
  if (accountId) CONFIG.setAccountId(accountId);
  closeSettings();
  loadInboxes();
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

function matchSearch(msg) {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.trim().toLowerCase();
  const subject = (msg.subject || '').toLowerCase();
  const from = [msg.from_email, msg.from_name].filter(Boolean).join(' ').toLowerCase();
  const to = (msg.to_email || '').toLowerCase();
  return subject.includes(q) || from.includes(q) || to.includes(q);
}

function renderMessageList() {
  elements.messageList.innerHTML = '';
  const filtered = messages.filter(matchSearch);
  const total = messages.length;
  elements.messageCount.textContent = '';

  filtered.forEach((msg) => {
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

function openUrlInBrowser(url) {
  if (typeof window.electronOpenExternal === 'function') {
    window.electronOpenExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function getActiveTab() {
  const active = document.querySelector('.tab.active');
  return active ? active.dataset.tab : 'html';
}

function getSelectedText() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    const start = active.selectionStart;
    const end = active.selectionEnd;
    if (start != null && end != null && end > start) {
      return active.value.substring(start, end).trim();
    }
    return '';
  }
  const tab = getActiveTab();
  if (tab === 'html' && elements.bodyIframe && elements.bodyIframe.contentDocument) {
    const iframeSel = elements.bodyIframe.contentDocument.getSelection();
    if (iframeSel && !iframeSel.isCollapsed && iframeSel.toString().trim()) {
      return iframeSel.toString().trim();
    }
  }
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return '';
  return sel.toString().trim();
}

function copySelectionOrBody() {
  const selected = getSelectedText();
  const text = selected || (function() {
    if (contextMenuFromSearchBox && elements.searchInput) {
      return elements.searchInput.value || '';
    }
    const tab = getActiveTab();
    if (tab === 'html' && elements.bodyIframe.contentDocument && elements.bodyIframe.contentDocument.body) {
      return elements.bodyIframe.contentDocument.body.innerText || '';
    }
    return elements.bodyText.innerText || '';
  })();
  if (!text.trim()) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {}).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

let contextMenuLinkHref = null;
let contextMenuFromSearchBox = false;

function showContextMenu(x, y, linkHref, fromSearchBox) {
  contextMenuLinkHref = linkHref || null;
  contextMenuFromSearchBox = !!fromSearchBox;
  const menu = elements.contextMenu;
  if (!menu) return;
  const openBtn = menu.querySelector('[data-action="open-link"]');
  if (openBtn) {
    openBtn.classList.toggle('hidden', !contextMenuLinkHref);
  }
  menu.classList.remove('hidden');
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}

function hideContextMenu() {
  const menu = elements.contextMenu;
  if (menu) menu.classList.add('hidden');
  contextMenuLinkHref = null;
  contextMenuFromSearchBox = false;
}

function handleContextMenuAction(action) {
  if (action === 'copy') copySelectionOrBody();
  else if (action === 'paste') {
    try {
      document.execCommand('paste');
    } catch (_) {}
  } else if (action === 'open-link' && contextMenuLinkHref) {
    openUrlInBrowser(contextMenuLinkHref);
  }
  hideContextMenu();
}

function makeLinksOpenInBrowser(iframe) {
  if (!iframe || !iframe.contentDocument) return;
  const doc = iframe.contentDocument;
  doc.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href) openUrlInBrowser(href);
    });
  });
  doc.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = iframe.getBoundingClientRect();
    const x = rect.left + e.clientX;
    const y = rect.top + e.clientY;
    const link = e.target.closest ? e.target.closest('a[href^="http"]') : null;
    const linkHref = link ? link.getAttribute('href') : null;
    showContextMenu(x, y, linkHref);
  });
}

// Match URLs for linkifying plain text (http/https)
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function linkifyText(text) {
  return escapeHtml(text).replace(URL_REGEX, (match) => {
    return '<a href="' + escapeHtml(match) + '" class="body-link" target="_blank" rel="noopener noreferrer">' + escapeHtml(match) + '</a>';
  });
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
        makeLinksOpenInBrowser(elements.bodyIframe);
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
        elements.bodyText.innerHTML = linkifyText(text);
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
        elements.bodyText.innerHTML = linkifyText(text);
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

async function loadInboxes() {
  const token = CONFIG.getToken();
  const accountId = CONFIG.getAccountId();
  if (!token) {
    showTokenPrompt();
    return;
  }
  if (!accountId) {
    if (elements.inboxSelect) {
      elements.inboxSelect.innerHTML = '<option value="">Enter Account ID → Refresh</option>';
      elements.inboxSelect.disabled = false;
    }
    if (elements.listError) {
      elements.listError.textContent = 'Enter your Account ID in the header and click Refresh to load inboxes.';
      elements.listError.classList.remove('hidden');
    }
    return;
  }
  CONFIG.setAccountId(accountId);
  if (elements.listError) elements.listError.classList.add('hidden');

  elements.inboxSelect.innerHTML = '<option value="">Loading…</option>';
  elements.inboxSelect.disabled = true;

  try {
    const url = `${CONFIG.baseUrl}/accounts/${accountId}/inboxes`;
    const res = await fetch(url, { headers: { 'Api-Token': token } });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    const inboxes = await res.json();
    if (!Array.isArray(inboxes)) throw new Error('Invalid inboxes response');

    elements.inboxSelect.innerHTML = '';
    const currentInboxId = CONFIG.getInboxId();
    let selectedInbox = currentInboxId;

    inboxes.forEach((inbox) => {
      const opt = document.createElement('option');
      opt.value = String(inbox.id);
      opt.textContent = inbox.name ? `${inbox.name} (${inbox.id})` : String(inbox.id);
      if (String(inbox.id) === currentInboxId) selectedInbox = String(inbox.id);
      elements.inboxSelect.appendChild(opt);
    });

    if (inboxes.length && !selectedInbox) {
      selectedInbox = String(inboxes[0].id);
    }
    elements.inboxSelect.value = selectedInbox || '';
    elements.inboxSelect.disabled = false;
    syncDefaultInboxCheckbox();

    if (selectedInbox) {
      currentPage = 1;
      loadMessages();
    }
  } catch (e) {
    elements.inboxSelect.innerHTML = '<option value="">Failed to load</option>';
    elements.inboxSelect.disabled = false;
    if (elements.listError) {
      elements.listError.textContent = 'Inboxes: ' + (e.message || 'Request failed. Check Account ID and token.');
      elements.listError.classList.remove('hidden');
    }
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
    const searchParam = elements.searchInput ? elements.searchInput.value.trim() : '';
    const url = getApiUrl({ page: currentPage, search: searchParam || undefined });
    const res = await fetch(url, {
      headers: { 'Api-Token': token }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    messages = await res.json();
    if (!Array.isArray(messages)) messages = [];
    hasMorePages = messages.length >= MESSAGES_PER_PAGE;
    renderMessageList();
    updatePaginationUI();
    if (selectedId && !messages.some((m) => m.id === selectedId)) {
      selectedId = null;
    }
    if (messages.length > 0 && !messages.some((m) => m.id === selectedId)) {
      selectMessage(messages[0].id);
    } else if (messages.length === 0) {
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

function updatePaginationUI() {
  if (!elements.pagination) return;
  elements.pagination.classList.toggle('hidden', messages.length === 0);
  if (elements.pageFirst) {
    elements.pageFirst.disabled = currentPage <= 1;
  }
  if (elements.pagePrev) {
    elements.pagePrev.disabled = currentPage <= 1;
  }
  if (elements.pageNext) {
    elements.pageNext.disabled = !hasMorePages;
  }
  if (elements.pageInfo) {
    elements.pageInfo.textContent = `Page ${currentPage}`;
  }
}

function init() {
  elements.openSettingsFromPrompt.addEventListener('click', openSettings);
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.settingsCancel.addEventListener('click', closeSettings);
  elements.settingsSave.addEventListener('click', saveSettings);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettings();
  });
  elements.refresh.addEventListener('click', () => {
    currentPage = 1;
    loadInboxes();
  });

  elements.inboxSelect.addEventListener('change', () => {
    const id = elements.inboxSelect.value;
    if (id) {
      currentPage = 1;
      loadMessages();
    }
    syncDefaultInboxCheckbox();
  });

  if (elements.pageFirst) {
    elements.pageFirst.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage = 1;
        loadMessages();
      }
    });
  }
  if (elements.pagePrev) {
    elements.pagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadMessages();
      }
    });
  }
  if (elements.pageNext) {
    elements.pageNext.addEventListener('click', () => {
      if (hasMorePages) {
        currentPage++;
        loadMessages();
      }
    });
  }

  elements.defaultInboxCheckbox.addEventListener('change', () => {
    if (elements.defaultInboxCheckbox.checked) {
      const id = elements.inboxSelect.value;
      if (id) CONFIG.setInboxId(id);
    } else {
      CONFIG.setInboxId('');
    }
  });

  let searchDebounceTimer = null;
  elements.searchInput.addEventListener('input', () => {
    searchQuery = elements.searchInput.value;
    renderMessageList();
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      loadMessages();
    }, 400);
  });
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounceTimer);
      currentPage = 1;
      loadMessages();
    }
  });

  elements.bodyText.addEventListener('click', (e) => {
    const link = e.target.closest('a.body-link');
    if (link && link.href) {
      e.preventDefault();
      openUrlInBrowser(link.getAttribute('href'));
    }
  });

  elements.detailContent.addEventListener('contextmenu', (e) => {
    if (!elements.detailContent.classList.contains('hidden')) {
      e.preventDefault();
      const link = e.target.closest('a.body-link');
      showContextMenu(e.clientX, e.clientY, link ? link.getAttribute('href') : null);
    }
  });

  if (elements.searchInput) {
    elements.searchInput.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, null, true);
    });
  }

  const listHeader = document.querySelector('.list-header');
  if (listHeader) {
    listHeader.addEventListener('contextmenu', (e) => {
      if (e.target === elements.searchInput) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, null);
    });
  }

  if (elements.contextMenu) {
    elements.contextMenu.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleContextMenuAction(btn.dataset.action);
      });
    });
  }

  document.addEventListener('click', hideContextMenu);
  document.addEventListener('scroll', hideContextMenu, true);

  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchBodyTab(tab.dataset.tab));
  });

  showTokenPrompt();
}

init();

/**
 * Ahizan AI — Client App Logic
 * Intégration Vercel AI Elements: <Conversation>, <Message>, <PromptInput>, <Suggestions>, <ToolCall>
 * Support du streaming SSE direct, annulation de requête (AbortController) et persistance localStorage.
 */

// État global de l'application
const state = {
  currentSessionId: null,
  sessions: [], // { id, title, messages: [{ role, content, toolInvocations }] }
  models: [],
  selectedModel: 'gemini-2.5-flash',
  temperature: 0.2,
  isGenerating: false,
  abortController: null,
};

// Sélecteurs DOM
const dom = {
  conversationViewport: document.getElementById('conversation-viewport'),
  conversationContainer: document.getElementById('conversation-container'),
  promptForm: document.getElementById('prompt-form'),
  promptTextarea: document.getElementById('prompt-textarea'),
  btnSubmit: document.getElementById('btn-submit'),
  btnStop: document.getElementById('btn-stop-streaming'),
  modelSelect: document.getElementById('model-select'),
  footerActiveModel: document.getElementById('footer-active-model'),
  sessionsList: document.getElementById('sessions-list'),
  btnNewChat: document.getElementById('btn-new-chat'),
  chatTitle: document.getElementById('chat-current-title'),
  // Paramètres Modal
  settingsModal: document.getElementById('settings-modal'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  settingModel: document.getElementById('setting-model'),
  settingTemp: document.getElementById('setting-temperature'),
  tempVal: document.getElementById('temp-val'),
  // Suggestions
  suggestionChips: document.querySelectorAll('.suggestion-chip'),
};

// Initialisation
async function init() {
  loadStoredPreferences();
  loadSessions();
  setupEventListeners();
  await fetchAvailableModels();

  if (state.sessions.length === 0) {
    createNewSession();
  } else {
    switchSession(state.sessions[0].id);
  }
}

// -------------------------------------------------------------
// Modèles & Préférences
// -------------------------------------------------------------
async function fetchAvailableModels() {
  try {
    const res = await fetch('/api/models');
    if (res.ok) {
      const data = await res.json();
      state.models = data.models || [];
      renderModelOptions();
    }
  } catch (err) {
    console.warn('Impossible de charger les modèles depuis le microservice:', err);
  }
}

function renderModelOptions() {
  if (state.models.length === 0) return;

  dom.modelSelect.innerHTML = '';
  dom.settingModel.innerHTML = '';

  state.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.provider})`;
    dom.modelSelect.appendChild(opt);

    const optSetting = opt.cloneNode(true);
    dom.settingModel.appendChild(optSetting);
  });

  dom.modelSelect.value = state.selectedModel;
  dom.settingModel.value = state.selectedModel;
  dom.footerActiveModel.textContent = state.selectedModel;
}

function loadStoredPreferences() {
  const savedModel = localStorage.getItem('ahizan_ai_model');
  if (savedModel) state.selectedModel = savedModel;

  const savedTemp = localStorage.getItem('ahizan_ai_temp');
  if (savedTemp) {
    state.temperature = parseFloat(savedTemp);
    dom.settingTemp.value = state.temperature;
    dom.tempVal.textContent = state.temperature;
  }
}

// -------------------------------------------------------------
// Gestion des Sessions
// -------------------------------------------------------------
function loadSessions() {
  try {
    const raw = localStorage.getItem('ahizan_ai_sessions');
    state.sessions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.sessions = [];
  }
}

function saveSessions() {
  localStorage.setItem('ahizan_ai_sessions', JSON.stringify(state.sessions));
  renderSessionsList();
}

function createNewSession() {
  const id = 'session_' + Date.now();
  const newSession = {
    id,
    title: 'Nouvelle conversation',
    messages: [
      {
        role: 'assistant',
        content: `Bonjour ! Je suis **Ahizan AI**, votre copilote d'intelligence opérationnelle pour la marketplace Ahizan.\n\nJe suis directement connecté au catalogue officiel Vendure GraphQL et aux indicateurs financiers. Que souhaitez-vous inspecter ?`
      }
    ]
  };

  state.sessions.unshift(newSession);
  saveSessions();
  switchSession(id);
}

function switchSession(id) {
  state.currentSessionId = id;
  const session = state.sessions.find(s => s.id === id);
  if (!session) return;

  dom.chatTitle.textContent = session.title;
  renderMessages(session.messages);
  renderSessionsList();
}

function deleteSession(id, e) {
  e.stopPropagation();
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveSessions();

  if (state.currentSessionId === id) {
    if (state.sessions.length > 0) {
      switchSession(state.sessions[0].id);
    } else {
      createNewSession();
    }
  }
}

function renderSessionsList() {
  dom.sessionsList.innerHTML = '';
  state.sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = `session-item ${s.id === state.currentSessionId ? 'active' : ''}`;
    item.onclick = () => switchSession(s.id);

    item.innerHTML = `
      <span class="session-title">${escapeHtml(s.title)}</span>
      <button class="session-delete-btn" title="Supprimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    item.querySelector('.session-delete-btn').addEventListener('click', (e) => deleteSession(s.id, e));
    dom.sessionsList.appendChild(item);
  });
}

// -------------------------------------------------------------
// Rendu des Messages & Composants AI Elements
// -------------------------------------------------------------
function renderMessages(messages) {
  dom.conversationContainer.innerHTML = '';
  messages.forEach(msg => appendMessageDOM(msg));
  scrollToBottom();
}

function appendMessageDOM(msg) {
  const isAssistant = msg.role === 'assistant';
  const msgEl = document.createElement('div');
  msgEl.className = `message ${msg.role}`;

  const avatar = isAssistant
    ? `<div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
       </div>`
    : `<div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
       </div>`;

  const header = `
    <div class="message-header">
      <span class="author-name">${isAssistant ? 'Ahizan AI' : 'Super Admin'}</span>
      <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `;

  // Parse markdown
  const formattedHtml = typeof marked !== 'undefined' ? marked.parse(msg.content || '') : msg.content;

  msgEl.innerHTML = `
    ${avatar}
    <div class="message-content">
      ${header}
      <div class="markdown-body">${formattedHtml}</div>
      <div class="tool-invocations-container"></div>
    </div>
  `;

  dom.conversationContainer.appendChild(msgEl);
  return msgEl;
}

// -------------------------------------------------------------
// Streaming SSE avec AI SDK Core (/api/chat/stream)
// -------------------------------------------------------------
async function sendMessage(text) {
  if (!text || !text.trim() || state.isGenerating) return;

  const session = state.sessions.find(s => s.id === state.currentSessionId);
  if (!session) return;

  // 1. Ajouter le message utilisateur
  const userMsg = { role: 'user', content: text.trim() };
  session.messages.push(userMsg);
  appendMessageDOM(userMsg);
  dom.promptTextarea.value = '';
  adjustTextareaHeight();
  scrollToBottom();

  // Mise à jour du titre si première interaction
  if (session.messages.length === 2 && session.title === 'Nouvelle conversation') {
    session.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    dom.chatTitle.textContent = session.title;
    saveSessions();
  }

  // 2. Préparer le conteneur assistant en streaming
  setGenerating(true);
  state.abortController = new AbortController();

  const assistantMsgDOM = appendMessageDOM({ role: 'assistant', content: '' });
  const contentBody = assistantMsgDOM.querySelector('.markdown-body');
  const toolContainer = assistantMsgDOM.querySelector('.tool-invocations-container');

  contentBody.innerHTML = '<span class="streaming-cursor"></span>';
  scrollToBottom();

  let accumulatedText = '';

  try {
    const payload = {
      messages: session.messages,
      model: state.selectedModel,
      temperature: state.temperature
    };

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });

    if (!res.ok) {
      throw new Error(`Erreur serveur HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        // Protocole Vercel AI SDK Data Stream
        // Format typique: 0:"texte partiel" ou 9:{"toolCallId": ...}
        if (line.startsWith('0:')) {
          try {
            const rawToken = JSON.parse(line.slice(2));
            accumulatedText += rawToken;
            contentBody.innerHTML = (typeof marked !== 'undefined' ? marked.parse(accumulatedText) : accumulatedText) + '<span class="streaming-cursor"></span>';
            scrollToBottom();
          } catch (e) {}
        } else if (line.startsWith('9:') || line.startsWith('a:') || line.startsWith('b:')) {
          // Événement d'outil (Tool Call / Tool Result)
          renderToolEvent(line, toolContainer);
        } else if (line.startsWith('data: ')) {
          // SSE Standard fallback
          const chunk = line.slice(6);
          accumulatedText += chunk;
          contentBody.innerHTML = (typeof marked !== 'undefined' ? marked.parse(accumulatedText) : accumulatedText) + '<span class="streaming-cursor"></span>';
          scrollToBottom();
        }
      }
    }

    // Retirer le curseur de streaming
    contentBody.innerHTML = typeof marked !== 'undefined' ? marked.parse(accumulatedText) : accumulatedText;

    // Enregistrer le message dans la session
    session.messages.push({ role: 'assistant', content: accumulatedText });
    saveSessions();

  } catch (err) {
    if (err.name === 'AbortError') {
      contentBody.innerHTML = (typeof marked !== 'undefined' ? marked.parse(accumulatedText) : accumulatedText) + '<p><em>[Génération interrompue par l\'administrateur]</em></p>';
      session.messages.push({ role: 'assistant', content: accumulatedText + ' [Interrompu]' });
      saveSessions();
    } else {
      contentBody.innerHTML = `<p style="color: var(--danger)">❌ Une erreur est survenue lors de la communication avec Ahizan AI : ${err.message}</p>`;
    }
  } finally {
    setGenerating(false);
    scrollToBottom();
  }
}

// Rendu des composants <ToolCall /> et <ToolResult />
function renderToolEvent(rawLine, container) {
  try {
    const data = JSON.parse(rawLine.slice(2));
    const card = document.createElement('div');
    card.className = 'tool-call-card';
    card.innerHTML = `
      <div class="tool-call-header">
        <span class="tool-call-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          ${data.toolName || 'Outil Vendure'}
        </span>
        <span class="tool-status-badge completed">✓ Exécuté</span>
      </div>
      <div class="tool-details">
        ${escapeHtml(JSON.stringify(data.args || data.result || data, null, 2))}
      </div>
    `;
    container.appendChild(card);
  } catch (e) {}
}

function setGenerating(isGenerating) {
  state.isGenerating = isGenerating;
  if (isGenerating) {
    dom.btnStop.classList.remove('hidden');
    dom.btnSubmit.classList.add('hidden');
  } else {
    dom.btnStop.classList.add('hidden');
    dom.btnSubmit.classList.remove('hidden');
    state.abortController = null;
  }
}

function scrollToBottom() {
  dom.conversationViewport.scrollTop = dom.conversationViewport.scrollHeight;
}

function adjustTextareaHeight() {
  dom.promptTextarea.style.height = 'auto';
  dom.promptTextarea.style.height = Math.min(dom.promptTextarea.scrollHeight, 180) + 'px';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// -------------------------------------------------------------
// Écouteurs d'Événements
// -------------------------------------------------------------
function setupEventListeners() {
  // Envoi Formulaire
  dom.promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(dom.promptTextarea.value);
  });

  // Touche Entrée pour envoyer (Shift+Entrée pour saut de ligne)
  dom.promptTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(dom.promptTextarea.value);
    }
  });

  dom.promptTextarea.addEventListener('input', adjustTextareaHeight);

  // Bouton Arrêter (Abort)
  dom.btnStop.addEventListener('click', () => {
    if (state.abortController) {
      state.abortController.abort();
    }
  });

  // Changement de modèle rapide dans le header
  dom.modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
    localStorage.setItem('ahizan_ai_model', state.selectedModel);
    dom.footerActiveModel.textContent = state.selectedModel;
    dom.settingModel.value = state.selectedModel;
  });

  // Bouton Nouveau Chat
  dom.btnNewChat.addEventListener('click', createNewSession);

  // Suggestions chips
  dom.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) sendMessage(prompt);
    });
  });

  // Modal Paramètres
  dom.btnOpenSettings.addEventListener('click', () => {
    dom.settingsModal.classList.add('active');
  });

  const closeSettings = () => dom.settingsModal.classList.remove('active');
  dom.btnCloseSettings.addEventListener('click', closeSettings);
  dom.modalBackdrop.addEventListener('click', closeSettings);

  dom.settingTemp.addEventListener('input', (e) => {
    dom.tempVal.textContent = e.target.value;
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    state.selectedModel = dom.settingModel.value;
    state.temperature = parseFloat(dom.settingTemp.value);
    localStorage.setItem('ahizan_ai_model', state.selectedModel);
    localStorage.setItem('ahizan_ai_temp', state.temperature.toString());
    dom.modelSelect.value = state.selectedModel;
    dom.footerActiveModel.textContent = state.selectedModel;
    closeSettings();
  });
}

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', init);

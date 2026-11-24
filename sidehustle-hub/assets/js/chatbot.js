/**
 * SideHustle Hub — AI Career Advisor Chatbot
 * Powered by xAI Grok API (api.x.ai)
 *
 * Features:
 *  - Grok API integration with streaming-aware fetch
 *  - Skill/hobby discovery quiz → personalised side-hustle recommendations
 *  - Full side hustle Q&A with database context injection
 *  - Persistent API key storage (localStorage)
 *  - Quick reply chips, typing indicator, rich message rendering
 *  - Works on both home page and individual detail pages
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const GROK_API_URL  = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL    = 'grok-3-mini';        // fast, cheap, smart
const LS_API_KEY    = 'ssh_grok_api_key';
const LS_CHAT_HIST  = 'ssh_chat_history';
const LS_USER_PROF  = 'ssh_user_profile';
const MAX_HISTORY   = 20;                   // messages kept in context

// ─── State ────────────────────────────────────────────────────────────────────
let chatOpen        = false;
let isTyping        = false;
let apiKey          = localStorage.getItem(LS_API_KEY) || '';
let chatHistory     = [];                   // [{role, content}] for Grok context
let userProfile     = JSON.parse(localStorage.getItem(LS_USER_PROF) || 'null');
let hustleDb        = [];                   // populated from hustles.json
let currentPage     = '';                   // 'home' or hustle-id
let quizDismissed   = false;

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const dbSummary = hustleDb.map(h =>
    `• ${h.title} [${h.id}] — Category: ${h.category}, Difficulty: ${h.difficulty}, ` +
    `Time: ${h.timePerWeek}/wk, Revenue: ${h.avgMonthlyRevenue}/mo, Scope: ${h.scope}, ` +
    `Skills needed: ${h.skills.join(', ')}, Platforms: ${h.platforms.join(', ')}`
  ).join('\n');

  const profileStr = userProfile
    ? `\nKNOWN USER PROFILE:\n- Skills/Hobbies: ${userProfile.skills.join(', ')}\n` +
      `- Study field: ${userProfile.field || 'not specified'}\n` +
      `- Weekly free time: ${userProfile.time || 'not specified'}\n` +
      `- Goal: ${userProfile.goal || 'not specified'}\n`
    : '';

  const pageCtx = currentPage && currentPage !== 'home'
    ? `\nCURRENT PAGE: The student is currently viewing the "${currentPage}" side hustle guide.`
    : '';

  return `You are HustleAI, a friendly and practical career advisor specifically for university/college students who want to earn income alongside their studies. You are embedded in SideHustle Hub, a platform that helps students discover and execute side hustles.

YOUR KNOWLEDGE BASE — Side Hustles Available:
${dbSummary}
${profileStr}${pageCtx}

YOUR ROLE:
1. Help students identify their skills, hobbies, and interests through natural conversation
2. Match them to the best side hustles from the database above based on:
   - Their skills/hobbies
   - Available time per week
   - Risk tolerance and startup cost preference
   - Long-term goals (passive income vs active income)
   - Current study field (e.g. a CS student → web dev or app dev makes sense)
3. Provide specific, actionable advice on HOW to start each hustle
4. Answer questions about platforms, tools, revenue expectations, and processes
5. Motivate and guide — be encouraging but realistic

RESPONSE STYLE:
- Keep responses concise (3–5 sentences max per point), use bullet points for steps
- When recommending a hustle, ALWAYS include: [HUSTLE:hustle-id] tag so the UI can show a card link
  Example: "I'd recommend **Freelance Web Development** [HUSTLE:freelance-web-dev] based on your coding skills."
- Use emojis sparingly (1–2 per message max)
- Never hallucinate income figures beyond what's in the database
- If a student asks something not related to jobs/income/skills, politely redirect
- If no API key is set, you are running in demo mode — still respond helpfully

Always end your first message with asking about their skills or study field if you don't know it yet.`;
}

// ─── Initialise ───────────────────────────────────────────────────────────────
function initChatbot() {
  // Load hustle DB from global db object (set by app.js) or fetch it
  if (typeof db !== 'undefined' && db.hustles) {
    hustleDb = db.hustles;
  } else {
    // Standalone load (detail pages)
    fetchHustleDb();
  }

  currentPage = document.body.dataset.hustle || document.body.dataset.page || 'home';

  renderChatWidget();
  restoreChatHistory();
  checkApiKey();
}

async function fetchHustleDb() {
  const paths = ['../data/hustles.json', './data/hustles.json'];
  for (const p of paths) {
    try {
      const r = await fetch(p);
      const data = await r.json();
      hustleDb = data.hustles || [];
      return;
    } catch (_) {}
  }
}

// ─── Render Widget HTML ───────────────────────────────────────────────────────
function renderChatWidget() {
  const wrapper = document.createElement('div');
  wrapper.id = 'chatbot-root';
  wrapper.innerHTML = `
  <!-- Floating Action Button -->
  <button class="chat-fab" id="chat-fab" onclick="toggleChat()" aria-label="Open AI Career Advisor">
    <span class="chat-fab-icon chat-fab-icon-open">🤖</span>
    <span class="chat-fab-icon chat-fab-icon-close">✕</span>
    <span class="chat-fab-badge" id="chat-fab-badge" style="display:none">1</span>
  </button>

  <!-- Chat Window -->
  <div class="chat-window" id="chat-window" role="dialog" aria-label="AI Career Advisor">

    <!-- Header -->
    <div class="chat-header">
      <div class="chat-avatar">🤖</div>
      <div class="chat-header-info">
        <div class="chat-header-name">HustleAI</div>
        <div class="chat-header-status">
          <div class="chat-status-dot"></div>
          Powered by Grok (xAI)
        </div>
      </div>
      <div class="chat-header-actions">
        <button class="chat-action-btn" onclick="clearChat()" title="Clear chat">🗑</button>
        <button class="chat-action-btn" onclick="openApiSetup()" title="API Key Settings">⚙</button>
        <button class="chat-action-btn" onclick="toggleChat()" title="Close">✕</button>
      </div>
    </div>

    <!-- API Key Banner (shown when no key) -->
    <div class="api-key-banner" id="api-key-banner">
      ⚠ No Grok API key set — running in demo mode.
      <button class="api-key-link" onclick="openApiSetup()">Add API Key →</button>
    </div>

    <!-- API Key Setup Panel -->
    <div class="api-setup-panel" id="api-setup-panel">
      <h4>🔑 Grok API Key Setup</h4>
      <p>
        Get your free API key from <strong>console.x.ai</strong> (xAI platform).<br/>
        Your key is stored only in this browser (localStorage). It is never sent anywhere except directly to <code>api.x.ai</code>.
      </p>
      <div class="api-key-input-row">
        <input class="api-key-input" id="api-key-input" type="password"
          placeholder="xai-xxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" />
        <button class="api-key-save-btn" onclick="saveApiKey()">Save</button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">
        Steps: <a href="https://console.x.ai" target="_blank" rel="noopener" style="color:var(--accent)">console.x.ai</a>
        → Sign up → API Keys → Create Key → Paste above
      </div>
    </div>

    <!-- Skill Quiz Panel -->
    <div class="skill-quiz-panel" id="skill-quiz-panel">
      <div class="skill-quiz-title">🎯 Quick Skill Check — select all that apply:</div>
      <div class="skill-quiz-chips" id="skill-quiz-chips"></div>
      <div class="skill-quiz-actions">
        <button class="quiz-submit-btn" onclick="submitSkillQuiz()">Find My Hustle →</button>
        <button class="quiz-skip-btn" onclick="dismissQuiz()">Skip, I'll ask manually</button>
      </div>
    </div>

    <!-- Messages -->
    <div class="chat-messages" id="chat-messages"></div>

    <!-- Quick Replies -->
    <div class="quick-replies" id="quick-replies"></div>

    <!-- Input -->
    <div class="chat-input-area">
      <textarea
        class="chat-input"
        id="chat-input"
        placeholder="Ask me about side hustles, your skills, income ideas..."
        rows="1"
        onkeydown="handleInputKeydown(event)"
        oninput="autoResizeTextarea(this)"
      ></textarea>
      <button class="chat-send-btn" id="chat-send-btn" onclick="sendMessage()" title="Send">➤</button>
    </div>
  </div>`;

  document.body.appendChild(wrapper);

  // Render skill quiz chips
  renderSkillQuizChips();

  // Show initial greeting after short delay
  setTimeout(() => {
    if (!chatHistory.length) {
      showWelcomeMessage();
    }
  }, 800);
}

// ─── Welcome Message ──────────────────────────────────────────────────────────
function showWelcomeMessage() {
  const hasProfile = !!userProfile;
  const greeting = hasProfile
    ? `Welcome back! 👋 I remember you're into **${userProfile.skills.slice(0, 2).join(' & ')}**. Want me to find updated opportunities, or do you have a new question?`
    : `Hey there! 👋 I'm **HustleAI**, your personal side hustle advisor.\n\nI can help you:\n• Discover which side hustles match your skills & hobbies\n• Plan your first steps to start earning\n• Answer questions about any hustle in our database\n\nTo get started — **what do you study, and what are some of your skills or hobbies?**`;

  appendBotMessage(greeting);
  setQuickReplies([
    '🎯 Find hustles for my skills',
    '💰 What pays the most?',
    '⏱ Least time-consuming?',
    '🟢 Easiest to start today?',
    '💻 I know coding',
    '🎨 I like creative work',
  ]);

  if (!hasProfile && !quizDismissed) {
    document.getElementById('skill-quiz-panel').classList.add('visible');
  }
}

// ─── Skill Quiz ───────────────────────────────────────────────────────────────
const SKILL_OPTIONS = [
  'Coding / Programming', 'Web Design', 'Graphic Design', 'Video Editing',
  'Photography', 'Writing / Blogging', 'Teaching / Tutoring', 'Social Media',
  'Music / Audio', 'Marketing', 'Maths / Finance', 'Languages',
  'Gaming', 'Fitness / Sports', 'Cooking / Food', 'Business / Sales',
];

function renderSkillQuizChips() {
  const container = document.getElementById('skill-quiz-chips');
  if (!container) return;
  container.innerHTML = SKILL_OPTIONS.map(s =>
    `<div class="skill-chip" onclick="toggleSkillChip(this, '${s}')">${s}</div>`
  ).join('');
}

function toggleSkillChip(el, skill) {
  el.classList.toggle('selected');
}

function submitSkillQuiz() {
  const selected = [...document.querySelectorAll('.skill-chip.selected')].map(el => el.textContent);
  if (selected.length === 0) {
    dismissQuiz();
    return;
  }

  document.getElementById('skill-quiz-panel').classList.remove('visible');
  quizDismissed = true;

  // Save profile
  userProfile = { skills: selected, field: '', time: '', goal: '' };
  localStorage.setItem(LS_USER_PROF, JSON.stringify(userProfile));

  // Compose user message
  const userMsg = `My skills and interests: ${selected.join(', ')}. Based on these, which side hustles should I pursue?`;
  appendUserMessage(userMsg);
  callGrokApi(userMsg);
}

function dismissQuiz() {
  document.getElementById('skill-quiz-panel').classList.remove('visible');
  quizDismissed = true;
}

// ─── Toggle Chat ──────────────────────────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chat-window');
  const fab = document.getElementById('chat-fab');
  const badge = document.getElementById('chat-fab-badge');

  win.classList.toggle('open', chatOpen);
  fab.classList.toggle('open', chatOpen);

  if (chatOpen) {
    badge.style.display = 'none';
    document.getElementById('chat-input').focus();
    scrollToBottom();
  }
}

// ─── API Key Management ───────────────────────────────────────────────────────
function checkApiKey() {
  const banner = document.getElementById('api-key-banner');
  if (banner) banner.classList.toggle('hidden', !!apiKey);
}

function openApiSetup() {
  const panel = document.getElementById('api-setup-panel');
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    const input = document.getElementById('api-key-input');
    input.value = apiKey;
    input.focus();
  }
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const val = input.value.trim();
  if (!val) return;
  apiKey = val;
  localStorage.setItem(LS_API_KEY, apiKey);
  document.getElementById('api-setup-panel').classList.remove('visible');
  checkApiKey();
  appendBotMessage('✅ API key saved! I\'m now connected to Grok. Ask me anything about side hustles.');
}

// ─── Send Message ─────────────────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  input.style.height = 'auto';
  clearQuickReplies();

  appendUserMessage(text);
  callGrokApi(text);
}

function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// ─── Grok API Call ────────────────────────────────────────────────────────────
async function callGrokApi(userMessage) {
  isTyping = true;
  setSendDisabled(true);

  // Add to history
  chatHistory.push({ role: 'user', content: userMessage });
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

  // Show typing indicator
  const typingEl = showTypingIndicator();

  try {
    if (!apiKey) {
      // Demo mode — deterministic local fallback
      removeTypingIndicator(typingEl);
      const reply = generateDemoReply(userMessage);
      appendBotMessage(reply.text, reply.quickReplies);
      chatHistory.push({ role: 'assistant', content: reply.text });
    } else {
      // Real Grok API call
      const messages = [
        { role: 'system', content: buildSystemPrompt() },
        ...chatHistory.slice(-MAX_HISTORY),
      ];

      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROK_MODEL,
          messages,
          max_tokens: 600,
          temperature: 0.7,
          stream: false,
        }),
      });

      removeTypingIndicator(typingEl);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `HTTP ${response.status}`;
        appendBotMessage(`⚠️ Grok API error: ${errMsg}`, null, true);
        chatHistory.pop(); // remove failed user message
        return;
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No response from Grok.';
      chatHistory.push({ role: 'assistant', content: reply });
      saveChatHistory();

      const { text, hustleIds } = parseReply(reply);
      const qr = suggestQuickReplies(reply);
      appendBotMessage(text, qr, false, hustleIds);
    }
  } catch (err) {
    removeTypingIndicator(typingEl);
    appendBotMessage(`⚠️ Network error: ${err.message}. Check your connection and API key.`, null, true);
  } finally {
    isTyping = false;
    setSendDisabled(false);
  }
}

// ─── Demo Mode (no API key) ───────────────────────────────────────────────────
function generateDemoReply(msg) {
  const m = msg.toLowerCase();
  const qr = ['💰 Show highest earning', '🟢 Easiest to start', '💻 Tech hustles', '📱 Social media'];

  if (/skill|hobby|interest|good at|know how/i.test(m)) {
    return {
      text: `Great question! 🎯 To give you the best recommendations, could you tell me more about your specific skills? For example:\n\n• **What do you study?** (CS, Design, Business...)\n• **What do you enjoy doing in your free time?**\n• **How many hours/week can you dedicate?**\n\nIn the meantime, our most popular picks for students are **Freelance Web Dev** [HUSTLE:freelance-web-dev], **Content Creation** [HUSTLE:content-creation], and **Social Media Management** [HUSTLE:social-media-management].`,
      quickReplies: qr,
    };
  }
  if (/cod|program|develop|javascript|python|web/i.test(m)) {
    return {
      text: `With coding skills, you have two top paths:\n\n1. **Freelance Web Development** [HUSTLE:freelance-web-dev] — fastest way to earn ($800–$3,000/mo), start on Upwork/Fiverr\n2. **App / SaaS Development** [HUSTLE:app-development] — higher ceiling ($0–$50K+/mo) but takes longer to build\n\nI'd start with freelancing to get cash flow, then build a product on the side. Want a step-by-step plan?`,
      quickReplies: ['📋 Show me the roadmap', '💰 How much can I charge?', '🔗 What platforms to use?'],
    };
  }
  if (/design|creative|art|graphic|visual/i.test(m)) {
    return {
      text: `Creative skills are incredibly monetisable! 🎨 Top options for you:\n\n1. **Freelance Graphic Design** [HUSTLE:graphic-design] — start on Fiverr, $50–$500/project\n2. **Social Media Management** [HUSTLE:social-media-management] — use your eye for design, $300–$1,500/client/mo\n3. **Stock Photography** [HUSTLE:stock-photography] — passive income from your photos\n\nWhich sounds most interesting?`,
      quickReplies: ['🎨 Graphic Design guide', '📱 Social media management', '📸 Stock photography'],
    };
  }
  if (/teach|tutor|explain|student|education/i.test(m)) {
    return {
      text: `Teaching is one of the **fastest side hustles to start** with zero cost! 📚\n\n**Online Tutoring** [HUSTLE:tutoring] lets you earn $15–$80/hr starting today:\n• Sign up on Wyzant or Tutorme\n• Offer your first session free for a review\n• Build recurring weekly students\n\nWhat subject(s) are you strongest in?`,
      quickReplies: ['📚 Tutoring full guide', '💰 How much can tutors earn?', '🌐 Which platform is best?'],
    };
  }
  if (/easy|simple|quick|fast|beginner|start today|no skill/i.test(m)) {
    return {
      text: `Easiest side hustles to start **today with no prior experience**:\n\n🟢 **Resume Writing** [HUSTLE:resume-writing] — $50–$200/resume, start immediately\n🟢 **Online Tutoring** [HUSTLE:tutoring] — if you're strong in any subject\n🟢 **Social Media Management** [HUSTLE:social-media-management] — manage Instagram/LinkedIn for local businesses\n🟢 **Stock Photography** [HUSTLE:stock-photography] — snap photos with your phone\n\nAll of these have $0 startup cost. Which fits you best?`,
      quickReplies: ['📝 Resume writing guide', '📚 Tutoring guide', '📱 Social media guide'],
    };
  }
  if (/money|earn|income|revenue|pay|salary|profit/i.test(m)) {
    return {
      text: `Highest earning potential in our database (sorted by ceiling):\n\n💰 **App / SaaS Dev** [HUSTLE:app-development] — up to $50K+/mo (MRR)\n💰 **Affiliate Marketing** [HUSTLE:affiliate-marketing] — $100–$10K+/mo (passive)\n💰 **Content Creation** [HUSTLE:content-creation] — $200–$5K+/mo\n💰 **Freelance Web Dev** [HUSTLE:freelance-web-dev] — $800–$3K/mo\n\nNote: higher ceiling = more time/skill to reach it. What's your priority — fast cash or long-term passive income?`,
      quickReplies: ['⚡ Fast cash now', '📈 Long-term passive', '💻 I can code'],
    };
  }
  if (/time|busy|hour|part.?time|limited/i.test(m)) {
    return {
      text: `Short on time? Here are hustles that need **under 10 hrs/week**:\n\n⏱ **Affiliate Marketing** [HUSTLE:affiliate-marketing] — once set up, runs passively\n⏱ **Stock Photography** [HUSTLE:stock-photography] — 3–8 hrs/week\n⏱ **Resume Writing** [HUSTLE:resume-writing] — 5–10 hrs/week\n⏱ **Tutoring** [HUSTLE:tutoring] — you control your schedule\n\nAffiliate marketing is the most time-efficient long-term. Want to know how to start it?`,
      quickReplies: ['💰 Affiliate marketing guide', '📸 Stock photography', '📝 Resume writing'],
    };
  }

  // Default
  return {
    text: `I'm HustleAI — your personal side hustle advisor! 🤖\n\nTo get the most relevant recommendations, please **add your Grok API key** (click ⚙ above) for full AI-powered advice, or tell me:\n\n• What are your skills or hobbies?\n• How many hours/week can you spare?\n• Do you prefer active income (now) or passive income (later)?`,
    quickReplies: ['🎯 Match to my skills', '💰 Highest earning', '🟢 Easiest to start', '⏱ Least time needed'],
  };
}

// ─── Parse Grok Reply ─────────────────────────────────────────────────────────
function parseReply(rawText) {
  // Extract [HUSTLE:id] tags
  const hustleRegex = /\[HUSTLE:([a-z-]+)\]/g;
  const hustleIds = [];
  let match;
  while ((match = hustleRegex.exec(rawText)) !== null) {
    if (!hustleIds.includes(match[1])) hustleIds.push(match[1]);
  }

  // Clean tags from display text
  let text = rawText.replace(/\[HUSTLE:[a-z-]+\]/g, '').trim();

  // Convert basic markdown to HTML-safe format
  text = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return { text, hustleIds };
}

// ─── Suggest Quick Replies from AI response ───────────────────────────────────
function suggestQuickReplies(reply) {
  const r = reply.toLowerCase();
  if (/step|roadmap|how to start/i.test(r)) return ['📋 Full roadmap', '💰 Revenue breakdown', '🛠 What tools do I need?'];
  if (/freelance|upwork|fiverr|client/i.test(r)) return ['💼 How do I get first clients?', '💰 Pricing advice', '📋 Portfolio tips'];
  if (/youtube|content|video/i.test(r)) return ['🎥 Growing a YouTube channel', '💰 When do I make money?', '📱 TikTok vs YouTube'];
  if (/tutor|teach|student/i.test(r)) return ['📚 Which platform?', '💰 How much to charge?', '👥 Group sessions?'];
  if (/affiliate|blog|seo/i.test(r)) return ['📝 Starting a blog', '🔍 SEO basics', '💸 Best affiliate programs'];
  if (/app|saas|software/i.test(r)) return ['⚡ No-code MVP', '💰 SaaS pricing', '📣 How to get users'];
  return ['🔍 Tell me more', '📋 Show full guide', '🆚 Compare options', '💰 Revenue details'];
}

// ─── Render Messages ──────────────────────────────────────────────────────────
function appendBotMessage(text, quickReplies = null, isError = false, hustleIds = []) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const msgEl = document.createElement('div');
  msgEl.className = `msg bot${isError ? ' msg-error' : ''}`;

  // Build hustle cards HTML
  let hustleCardsHtml = '';
  if (hustleIds && hustleIds.length > 0) {
    const prefix = getPagePrefix();
    hustleCardsHtml = hustleIds.map(id => {
      const h = hustleDb.find(x => x.id === id);
      if (!h) return '';
      return `<a href="${prefix}pages/${id}.html" class="chat-hustle-card">
        <div class="chat-hustle-card-title">${h.badge} ${h.title}</div>
        <div class="chat-hustle-card-meta">${h.difficulty} · ${h.timePerWeek}/wk · ${h.avgMonthlyRevenue}/mo · View full guide →</div>
      </a>`;
    }).join('');
  }

  msgEl.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div>
      <div class="msg-bubble">${text}${hustleCardsHtml}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  container.appendChild(msgEl);
  scrollToBottom();

  if (quickReplies) setQuickReplies(quickReplies);
  persistMessage('bot', text);

  // Show notification badge if chat is closed
  if (!chatOpen) {
    const badge = document.getElementById('chat-fab-badge');
    if (badge) badge.style.display = 'flex';
  }
}

function appendUserMessage(text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgEl = document.createElement('div');
  msgEl.className = 'msg user';
  msgEl.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  container.appendChild(msgEl);
  scrollToBottom();
  persistMessage('user', text);
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.id = 'typing-wrap';
  wrap.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  container.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ─── Quick Replies ────────────────────────────────────────────────────────────
function setQuickReplies(chips) {
  const container = document.getElementById('quick-replies');
  if (!container) return;
  container.innerHTML = chips.map(c =>
    `<button class="qr-chip" onclick="quickReply('${escapeAttr(c)}')">${c}</button>`
  ).join('');
}

function clearQuickReplies() {
  const c = document.getElementById('quick-replies');
  if (c) c.innerHTML = '';
}

function quickReply(text) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = text;
    sendMessage();
  }
}

// ─── Persistence ──────────────────────────────────────────────────────────────
function persistMessage(role, content) {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_CHAT_HIST) || '[]');
    stored.push({ role, content, ts: Date.now() });
    if (stored.length > 50) stored.splice(0, stored.length - 50);
    localStorage.setItem(LS_CHAT_HIST, JSON.stringify(stored));
  } catch (_) {}
}

function restoreChatHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_CHAT_HIST) || '[]');
    if (!stored.length) return;

    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Restore last 10 messages visually
    const recent = stored.slice(-10);
    recent.forEach(m => {
      if (m.role === 'user') {
        appendUserMessage(m.content);
      } else {
        const { text, hustleIds } = parseReply(m.content);
        appendBotMessage(text, null, false, hustleIds);
      }
    });

    // Rebuild context history
    chatHistory = recent.map(m => ({ role: m.role, content: m.content }));
  } catch (_) {}
}

function saveChatHistory() {
  localStorage.setItem(LS_CHAT_HIST, JSON.stringify(
    chatHistory.slice(-50).map(m => ({ ...m, ts: Date.now() }))
  ));
}

function clearChat() {
  const container = document.getElementById('chat-messages');
  if (container) container.innerHTML = '';
  chatHistory = [];
  localStorage.removeItem(LS_CHAT_HIST);
  clearQuickReplies();
  setTimeout(showWelcomeMessage, 100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scrollToBottom() {
  const c = document.getElementById('chat-messages');
  if (c) requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}

function setSendDisabled(disabled) {
  const btn = document.getElementById('chat-send-btn');
  if (btn) btn.disabled = disabled;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function getPagePrefix() {
  // Determine relative path prefix based on page location
  const path = window.location.pathname;
  return path.includes('/pages/') ? '../' : './';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initChatbot);

// Also expose globally for inline event handlers
window.toggleChat = toggleChat;
window.clearChat = clearChat;
window.openApiSetup = openApiSetup;
window.saveApiKey = saveApiKey;
window.sendMessage = sendMessage;
window.handleInputKeydown = handleInputKeydown;
window.autoResizeTextarea = autoResizeTextarea;
window.quickReply = quickReply;
window.submitSkillQuiz = submitSkillQuiz;
window.dismissQuiz = dismissQuiz;
window.toggleSkillChip = toggleSkillChip;

/* ═══════════════════════════════════════════
   FREEWILL ANALYSIS — freewill.js
   Quiz logic, OCEAN scoring, OpenRouter API
═══════════════════════════════════════════ */

const API_KEY = '';

const QUESTIONS = [
  { id: 1,  trait: 'E', text: 'I enjoy being the center of attention at social gatherings.' },
  { id: 2,  trait: 'C', text: 'I prefer having a detailed plan than being spontaneous.' },
  { id: 3,  trait: 'N', text: 'I often feel anxious or worried that things might go wrong.' },
  { id: 4,  trait: 'O', text: 'I love exploring new ideas and abstract concepts.' },
  { id: 5,  trait: 'A', text: 'I genuinely care about others\' feelings and go out of my way to help.' },
  { id: 6,  trait: 'E', text: 'After a social event, I feel energized rather than drained.' },
  { id: 7,  trait: 'C', text: 'I keep my living and working spaces neat and organized.' },
  { id: 8,  trait: 'N', text: 'My mood can shift quite easily throughout the day.' },
  { id: 9,  trait: 'O', text: 'I enjoy art, music, poetry or other forms of creative expression.' },
  { id: 10, trait: 'A', text: 'I avoid arguments and prefer to keep the peace even if I disagree.' },
  { id: 11, trait: 'E', text: 'I find it easy to approach and talk to strangers.' },
  { id: 12, trait: 'C', text: 'I follow through on commitments even when it becomes inconvenient.' },
  { id: 13, trait: 'N', text: 'I tend to dwell on mistakes or things I could have done differently.' },
  { id: 14, trait: 'O', text: 'I enjoy thinking about philosophical or big-picture questions.' },
  { id: 15, trait: 'A', text: 'I trust people easily and give them the benefit of the doubt.' },
];

const TRAIT_NAMES = {
  O: 'Openness',
  C: 'Conscientiousness',
  E: 'Extraversion',
  A: 'Agreeableness',
  N: 'Neuroticism',
};

let currentQ       = 0;
let answers        = new Array(QUESTIONS.length).fill(null);
let currentScores  = null;
let currentProfile = null;

const screens = {
  landing:  document.getElementById('screen-landing'),
  quiz:     document.getElementById('screen-quiz'),
  loading:  document.getElementById('screen-loading'),
  results:  document.getElementById('screen-results'),
};

const $traitLabel   = document.getElementById('trait-label');
const $questionText = document.getElementById('question-text');
const $optionsRow   = document.getElementById('options-row');
const $progressFill = document.getElementById('progress-fill');
const $quizCounter  = document.getElementById('quiz-counter');
const $btnBack      = document.getElementById('btn-back');
const $btnNext      = document.getElementById('btn-next');
const $loadingMsg   = document.getElementById('loading-msg');
const $btnStart     = document.getElementById('btn-start');
const $btnRetake    = document.getElementById('btn-retake');

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderQuestion(index) {
  const q = QUESTIONS[index];
  const wrap = document.getElementById('question-wrap');
  wrap.style.animation = 'none';
  void wrap.offsetWidth;
  wrap.style.animation = 'fadeUp 0.4s cubic-bezier(0,0,0.2,1) both';
  $traitLabel.textContent   = TRAIT_NAMES[q.trait];
  $questionText.textContent = q.text;
  const pct = ((index) / QUESTIONS.length) * 100;
  $progressFill.style.width = pct + '%';
  $quizCounter.textContent  = (index + 1) + ' / ' + QUESTIONS.length;
  $btnBack.style.visibility = index === 0 ? 'hidden' : 'visible';
  $optionsRow.innerHTML = '';
  for (let v = 1; v <= 5; v++) {
    const btn = document.createElement('button');
    btn.className   = 'option-btn' + (answers[index] === v ? ' selected' : '');
    btn.textContent = v;
    btn.setAttribute('aria-label', 'Option ' + v);
    btn.addEventListener('click', () => selectOption(v));
    $optionsRow.appendChild(btn);
  }
  updateNextBtn();
}

function selectOption(value) {
  answers[currentQ] = value;
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i + 1 === value);
  });
  updateNextBtn();
}

function updateNextBtn() {
  $btnNext.disabled    = answers[currentQ] === null;
  $btnNext.textContent = currentQ === QUESTIONS.length - 1 ? 'See Results \u2192' : 'Next \u2192';
}

function calculateScores() {
  const raw   = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const count = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  QUESTIONS.forEach((q, i) => {
    if (answers[i] !== null) {
      raw[q.trait]   += answers[i];
      count[q.trait] += 1;
    }
  });
  const scores = {};
  for (const t in raw) {
    const avg = count[t] > 0 ? raw[t] / count[t] : 1;
    scores[t] = Math.round(((avg - 1) / 4) * 100);
  }
  return scores;
}

async function fetchProfile(scores) {
  const prompt = 'You are an expert psychologist specializing in the Big Five (OCEAN) personality model.\n\nA person completed a 15-question assessment. Their trait scores (0-100%) are:\n- Openness: ' + scores.O + '%\n- Conscientiousness: ' + scores.C + '%\n- Extraversion: ' + scores.E + '%\n- Agreeableness: ' + scores.A + '%\n- Neuroticism: ' + scores.N + '%\n\nWrite a deeply insightful, nuanced personality profile for this person. The tone should be intelligent, direct, and editorial. Write as if you know this person intimately.\n\nReturn ONLY a valid JSON object with exactly these 8 keys, no preamble, no markdown:\n{\n  "overview": "2-3 sentences.",\n  "strengths": "2-3 sentences.",\n  "blindspots": "2-3 sentences.",\n  "thinking": "2-3 sentences.",\n  "social": "2-3 sentences.",\n  "career": "2-3 sentences.",\n  "stress": "2-3 sentences.",\n  "growth": "2-3 sentences."\n}';

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('API error:', errText);
    throw new Error('API error: ' + response.status);
  }

  const data  = await response.json();
  const text  = data.choices[0].message.content.trim();
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

function renderScoreBars(scores) {
  setTimeout(() => {
    ['O','C','E','A','N'].forEach(t => {
      const bar = document.getElementById('bar-' + t);
      const pct = document.getElementById('pct-' + t);
      if (bar && pct) {
        bar.style.setProperty('--pct', scores[t] + '%');
        pct.textContent = scores[t] + '%';
      }
    });
  }, 200);
}

function renderProfileText(profile) {
  const map = {
    'text-overview':   profile.overview,
    'text-strengths':  profile.strengths,
    'text-blindspots': profile.blindspots,
    'text-thinking':   profile.thinking,
    'text-social':     profile.social,
    'text-career':     profile.career,
    'text-stress':     profile.stress,
    'text-growth':     profile.growth,
  };
  for (const [id, text] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }
  document.querySelectorAll('.profile-block').forEach((block, i) => {
    setTimeout(() => block.classList.add('visible'), 300 + i * 120);
  });
}

const loadingMessages = [
  'Calculating trait scores\u2026',
  'Mapping your OCEAN profile\u2026',
  'Consulting the analysis engine\u2026',
  'Composing your portrait\u2026',
  'Almost there\u2026',
];

let loadingInterval;

function startLoadingMessages() {
  let i = 0;
  $loadingMsg.textContent = loadingMessages[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    $loadingMsg.textContent = loadingMessages[i];
  }, 2200);
}

function stopLoadingMessages() {
  clearInterval(loadingInterval);
}

function buildWhatsAppMessage(scores, profile) {
  const siteUrl = window.location.href;
  return '🧠 *FREEWILL ANALYSIS — My Personality Profile*\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n📊 *OCEAN TRAIT SCORES*\n━━━━━━━━━━━━━━━━━━━━━\n' +
    'Openness: ' + scores.O + '%\n' +
    'Conscientiousness: ' + scores.C + '%\n' +
    'Extraversion: ' + scores.E + '%\n' +
    'Agreeableness: ' + scores.A + '%\n' +
    'Neuroticism: ' + scores.N + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n🔍 *OVERVIEW*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.overview + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n💪 *STRENGTHS*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.strengths + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n⚠️ *BLIND SPOTS*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.blindspots + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n🧩 *HOW I THINK & DECIDE*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.thinking + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n🤝 *SOCIAL BEHAVIOUR*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.social + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n💼 *CAREER TENDENCIES*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.career + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n😤 *UNDER STRESS*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.stress + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n🌱 *GROWTH ADVICE*\n━━━━━━━━━━━━━━━━━━━━━\n' + profile.growth + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\nTake yours → ' + siteUrl;
}

async function runAnalysis() {
  showScreen('loading');
  startLoadingMessages();
  const scores = calculateScores();
  try {
    const profile = await fetchProfile(scores);
    stopLoadingMessages();
    showScreen('results');
    renderScoreBars(scores);
    renderProfileText(profile);
    currentScores  = scores;
    currentProfile = profile;
  } catch (err) {
    stopLoadingMessages();
    console.error('Freewill Analysis error:', err);
    alert('Something went wrong while generating your profile. Please try again.');
    showScreen('quiz');
    renderQuestion(currentQ);
  }
}

$btnStart.addEventListener('click', () => {
  currentQ = 0;
  answers  = new Array(QUESTIONS.length).fill(null);
  showScreen('quiz');
  renderQuestion(0);
});

$btnBack.addEventListener('click', () => {
  if (currentQ > 0) { currentQ--; renderQuestion(currentQ); }
});

$btnNext.addEventListener('click', () => {
  if (answers[currentQ] === null) return;
  if (currentQ < QUESTIONS.length - 1) { currentQ++; renderQuestion(currentQ); }
  else { runAnalysis(); }
});

$btnRetake.addEventListener('click', () => {
  currentQ       = 0;
  answers        = new Array(QUESTIONS.length).fill(null);
  currentScores  = null;
  currentProfile = null;
  ['O','C','E','A','N'].forEach(t => {
    const bar = document.getElementById('bar-' + t);
    const pct = document.getElementById('pct-' + t);
    if (bar) bar.style.setProperty('--pct', '0%');
    if (pct) pct.textContent = '0%';
  });
  document.querySelectorAll('.profile-block').forEach(b => b.classList.remove('visible'));
  showScreen('landing');
});

document.getElementById('btn-share').addEventListener('click', () => {
  document.getElementById('share-modal').classList.add('active');
});

document.getElementById('share-close').addEventListener('click', () => {
  document.getElementById('share-modal').classList.remove('active');
});

document.getElementById('share-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('share-modal')) {
    document.getElementById('share-modal').classList.remove('active');
  }
});

document.getElementById('share-whatsapp').addEventListener('click', async () => {
  if (!currentScores || !currentProfile) return;

  // populate score card
  ['O','C','E','A','N'].forEach(t => {
    const fill = document.getElementById('sc-' + t);
    const pct  = document.getElementById('sc-pct-' + t);
    if (fill) fill.style.width = currentScores[t] + '%';
    if (pct)  pct.textContent  = currentScores[t] + '%';
  });

  // generate and download image
  const card = document.getElementById('score-card');
  card.style.left = '-9999px';

  const canvas = await html2canvas(card, {
    backgroundColor: '#050d1a',
    scale: 2,
    useCORS: true,
  });

  const link = document.createElement('a');
  link.download = 'freewill-analysis.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  // open WhatsApp with text
  setTimeout(() => {
    const message = buildWhatsAppMessage(currentScores, currentProfile);
    const encoded = encodeURIComponent(message);
    window.open('https://wa.me/?text=' + encoded, '_blank');
  }, 1000);
});

document.addEventListener('keydown', (e) => {
  if (!screens.quiz.classList.contains('active')) return;
  const num = parseInt(e.key);
  if (num >= 1 && num <= 5) selectOption(num);
  if (e.key === 'Enter' && answers[currentQ] !== null) $btnNext.click();
  if (e.key === 'ArrowLeft' && currentQ > 0) $btnBack.click();
});
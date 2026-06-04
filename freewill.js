/* ═══════════════════════════════════════════
   FREEWILL ANALYSIS — freewill.js
   Quiz logic, OCEAN scoring, and Openrouter API integration
═══════════════════════════════════════════ */

const API_KEY = '';

/* ── Question Bank ──────────────────────────
   trait: O=Openness C=Conscientiousness
          E=Extraversion A=Agreeableness N=Neuroticism
   Each question maps to one trait.
────────────────────────────────────────── */
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

/* ── State ── */
let currentQ   = 0;
let answers    = new Array(QUESTIONS.length).fill(null);

/* ── DOM refs ── */
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

/* ════════════════════════════════════════
   SCREEN NAVIGATION
════════════════════════════════════════ */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════
   QUIZ RENDERING
════════════════════════════════════════ */
function renderQuestion(index) {
  const q = QUESTIONS[index];

  // animate out → in
  const wrap = document.getElementById('question-wrap');
  wrap.style.animation = 'none';
  void wrap.offsetWidth;
  wrap.style.animation = 'fadeUp 0.4s cubic-bezier(0,0,0.2,1) both';

  $traitLabel.textContent   = TRAIT_NAMES[q.trait];
  $questionText.textContent = q.text;

  // progress
  const pct = ((index) / QUESTIONS.length) * 100;
  $progressFill.style.width = pct + '%';
  $quizCounter.textContent  = `${index + 1} / ${QUESTIONS.length}`;

  // back button
  $btnBack.style.visibility = index === 0 ? 'hidden' : 'visible';

  // option buttons
  $optionsRow.innerHTML = '';
  for (let v = 1; v <= 5; v++) {
    const btn = document.createElement('button');
    btn.className  = 'option-btn' + (answers[index] === v ? ' selected' : '');
    btn.textContent = v;
    btn.setAttribute('aria-label', `Option ${v}`);
    btn.addEventListener('click', () => selectOption(v));
    $optionsRow.appendChild(btn);
  }

  updateNextBtn();
}

function selectOption(value) {
  answers[currentQ] = value;

  // update button states
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i + 1 === value);
  });

  updateNextBtn();
}

function updateNextBtn() {
  const answered = answers[currentQ] !== null;
  $btnNext.disabled = !answered;

  if (currentQ === QUESTIONS.length - 1) {
    $btnNext.textContent = 'See Results →';
  } else {
    $btnNext.textContent = 'Next →';
  }
}

/* ════════════════════════════════════════
   SCORING
════════════════════════════════════════ */
function calculateScores() {
  const raw   = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const count = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  QUESTIONS.forEach((q, i) => {
    if (answers[i] !== null) {
      raw[q.trait]   += answers[i];
      count[q.trait] += 1;
    }
  });

  // convert to percentage (1–5 scale → 0–100%)
  const scores = {};
  for (const t in raw) {
    const avg = count[t] > 0 ? raw[t] / count[t] : 1;
    scores[t] = Math.round(((avg - 1) / 4) * 100);
  }

  return scores;
}

/* ════════════════════════════════════════
   OPENROUTER API CALL
════════════════════════════════════════ */
async function fetchProfile(scores) {
  const prompt = `You are an expert psychologist specializing in the Big Five (OCEAN) personality model.

A person completed a 15-question assessment. Their trait scores (0–100%) are:
- Openness: ${scores.O}%
- Conscientiousness: ${scores.C}%
- Extraversion: ${scores.E}%
- Agreeableness: ${scores.A}%
- Neuroticism: ${scores.N}%

Write a deeply insightful, nuanced personality profile for this person. The tone should be intelligent, direct, and editorial — not clinical or generic. Write as if you know this person intimately.

Return ONLY a valid JSON object with exactly these 8 keys. No preamble, no markdown, no extra text:

{
  "overview": "2–3 sentences capturing the essence of this personality.",
  "strengths": "2–3 sentences on their key strengths.",
  "blindspots": "2–3 sentences on their blind spots or shadow traits.",
  "thinking": "2–3 sentences on how they think and make decisions.",
  "social": "2–3 sentences on how they show up socially.",
  "career": "2–3 sentences on their career tendencies and work style.",
  "stress": "2–3 sentences on how they handle stress and pressure.",
  "growth": "2–3 sentences of specific, honest growth advice."
}`;

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
    console.error('OpenRouter error:', errText);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content.trim();

  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}
// Retake
$btnRetake.addEventListener('click', () => {
  currentQ = 0;
  answers  = new Array(QUESTIONS.length).fill(null);

  ['O','C','E','A','N'].forEach(t => {
    const bar = document.getElementById(`bar-${t}`);
    const pct = document.getElementById(`pct-${t}`);
    if (bar) bar.style.setProperty('--pct', '0%');
    if (pct) pct.textContent = '0%';
  });

  document.querySelectorAll('.profile-block').forEach(b => b.classList.remove('visible'));
  showScreen('landing');
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (!screens.quiz.classList.contains('active')) return;

  const num = parseInt(e.key);
  if (num >= 1 && num <= 5) selectOption(num);
  if (e.key === 'Enter' && answers[currentQ] !== null) $btnNext.click();
  if (e.key === 'ArrowLeft' && currentQ > 0) $btnBack.click();
});

/* ════════════════════════════════════════
   SHARE MODAL
════════════════════════════════════════ */
let currentScores  = null;
let currentProfile = null;

function buildWhatsAppMessage(scores, profile) {
  const siteUrl = window.location.href;
  return `🧠 *FREEWILL ANALYSIS — My Personality Profile*

━━━━━━━━━━━━━━━━━━━━━
📊 *OCEAN TRAIT SCORES*
━━━━━━━━━━━━━━━━━━━━━
Openness: ${scores.O}%
Conscientiousness: ${scores.C}%
Extraversion: ${scores.E}%
Agreeableness: ${scores.A}%
Neuroticism: ${scores.N}%

━━━━━━━━━━━━━━━━━━━━━
🔍 *OVERVIEW*
━━━━━━━━━━━━━━━━━━━━━
${profile.overview}

━━━━━━━━━━━━━━━━━━━━━
💪 *STRENGTHS*
━━━━━━━━━━━━━━━━━━━━━
${profile.strengths}

━━━━━━━━━━━━━━━━━━━━━
⚠️ *BLIND SPOTS*
━━━━━━━━━━━━━━━━━━━━━
${profile.blindspots}

━━━━━━━━━━━━━━━━━━━━━
🧩 *HOW I THINK & DECIDE*
━━━━━━━━━━━━━━━━━━━━━
${profile.thinking}

━━━━━━━━━━━━━━━━━━━━━
🤝 *SOCIAL BEHAVIOUR*
━━━━━━━━━━━━━━━━━━━━━
${profile.social}

━━━━━━━━━━━━━━━━━━━━━
💼 *CAREER TENDENCIES*
━━━━━━━━━━━━━━━━━━━━━
${profile.career}

━━━━━━━━━━━━━━━━━━━━━
😤 *UNDER STRESS*
━━━━━━━━━━━━━━━━━━━━━
${profile.stress}

━━━━━━━━━━━━━━━━━━━━━
🌱 *GROWTH ADVICE*
━━━━━━━━━━━━━━━━━━━━━
${profile.growth}

━━━━━━━━━━━━━━━━━━━━━
Take yours → ${siteUrl}`;
}

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

document.getElementById('share-whatsapp').addEventListener('click', () => {
  if (!currentScores || !currentProfile) return;
  const message = buildWhatsAppMessage(currentScores, currentProfile);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
});
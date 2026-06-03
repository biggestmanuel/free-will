/* ═══════════════════════════════════════════
   FREEWILL ANALYSIS — freewill.js
   Quiz logic, OCEAN scoring, and Cohere API integration
═══════════════════════════════════════════ */

const API_KEY = cohere_cz0lKNQCR1jqBj6OPbI9ubjErU2K7hvyHYFuMfgi1FmdWI;

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
   COHERE API CALL
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

  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'X-Client-Name': 'freewill-analysis',
},
body: JSON.stringify({
  model: 'command-r-plus-08-2024',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.text.trim();

  // strip any accidental markdown fences
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

/* ════════════════════════════════════════
   RESULTS RENDERING
════════════════════════════════════════ */
function renderScoreBars(scores) {
  const map = { O: 'O', C: 'C', E: 'E', A: 'A', N: 'N' };

  // small delay so the screen transition finishes first
  setTimeout(() => {
    for (const t in map) {
      const bar = document.getElementById(`bar-${t}`);
      const pct = document.getElementById(`pct-${t}`);
      if (bar && pct) {
        bar.style.setProperty('--pct', scores[t] + '%');
        pct.textContent = scores[t] + '%';
      }
    }
  }, 200);
}

function renderProfileText(profile) {
  const sectionMap = {
    'text-overview':   profile.overview,
    'text-strengths':  profile.strengths,
    'text-blindspots': profile.blindspots,
    'text-thinking':   profile.thinking,
    'text-social':     profile.social,
    'text-career':     profile.career,
    'text-stress':     profile.stress,
    'text-growth':     profile.growth,
  };

  for (const [id, text] of Object.entries(sectionMap)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  // staggered fade-in for profile blocks
  const blocks = document.querySelectorAll('.profile-block');
  blocks.forEach((block, i) => {
    setTimeout(() => block.classList.add('visible'), 300 + i * 120);
  });
}

/* ════════════════════════════════════════
   LOADING MESSAGES
════════════════════════════════════════ */
const loadingMessages = [
  'Calculating trait scores…',
  'Mapping your OCEAN profile…',
  'Consulting the analysis engine…',
  'Composing your portrait…',
  'Almost there…',
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

/* ════════════════════════════════════════
   MAIN FLOW
════════════════════════════════════════ */
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
  } catch (err) {
    stopLoadingMessages();
    console.error('Freewill Analysis error:', err);
    alert('Something went wrong while generating your profile. Please check your API key and try again.');
    showScreen('quiz');
    renderQuestion(currentQ);
  }
}

/* ════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════ */

// Start
$btnStart.addEventListener('click', () => {
  currentQ = 0;
  answers  = new Array(QUESTIONS.length).fill(null);
  showScreen('quiz');
  renderQuestion(0);
});

// Back
$btnBack.addEventListener('click', () => {
  if (currentQ > 0) {
    currentQ--;
    renderQuestion(currentQ);
  }
});

// Next / Submit
$btnNext.addEventListener('click', () => {
  if (answers[currentQ] === null) return;

  if (currentQ < QUESTIONS.length - 1) {
    currentQ++;
    renderQuestion(currentQ);
  } else {
    runAnalysis();
  }
});

// Retake
$btnRetake.addEventListener('click', () => {
  currentQ = 0;
  answers  = new Array(QUESTIONS.length).fill(null);

  // reset score bars
  ['O','C','E','A','N'].forEach(t => {
    const bar = document.getElementById(`bar-${t}`);
    const pct = document.getElementById(`pct-${t}`);
    if (bar) bar.style.setProperty('--pct', '0%');
    if (pct) pct.textContent = '0%';
  });

  // reset profile blocks visibility
  document.querySelectorAll('.profile-block').forEach(b => b.classList.remove('visible'));

  showScreen('landing');
});

// Keyboard support — press 1–5 to select, Enter to advance
document.addEventListener('keydown', (e) => {
  if (!screens.quiz.classList.contains('active')) return;

  const num = parseInt(e.key);
  if (num >= 1 && num <= 5) {
    selectOption(num);
  }

  if (e.key === 'Enter' && answers[currentQ] !== null) {
    $btnNext.click();
  }

  if (e.key === 'ArrowLeft' && currentQ > 0) {
    $btnBack.click();
  }
});
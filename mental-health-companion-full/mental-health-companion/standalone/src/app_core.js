/* ===================== core: state, helpers, charts, data ===================== */
const DISCLAIMER = 'This tool provides general support only. It is not a medical diagnosis or a substitute for professional care.';
const KEY = 'mhc.standalone.v1';
const EMO_COLORS = { anxiety: '#6366F1', sadness: '#3B82F6', anger: '#F97316', fear: '#8B5CF6', joy: '#22C55E', stress: '#EAB308', neutral: '#94A3B8' };
const TAGS = ['sleep', 'work', 'study', 'family', 'health', 'finance', 'relationship'];
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
let storageOk = true;

function defaults() {
  return {
    profile: { name: '', lang: 'en', theme: 'auto', font: 'normal', contrast: false, onboarded: false },
    consents: { data_use: true, share: false, research: false },
    entries: [], contacts: [], plan: { warning: '', coping: '', places: '', people: '', pros: '', env: '' },
    assess: [], goals: [], gratitude: [], thoughts: [], checkins: [], chats: [], reviews: [], feedback: [], appts: [], audit: [],
    keywords: MHC.DEFAULT_CRISIS.map(k => Object.assign({}, k)), thresholds: { lowMax: 33, modMax: 66 },
    bookmarks: {}, done: {}, recFeedback: {}, reminders: { journal: true, appointment: true, weekly: true, highStress: true }
  };
}
function load() {
  try { const r = localStorage.getItem(KEY); if (r) { const o = JSON.parse(r); return Object.assign(defaults(), o, { profile: Object.assign(defaults().profile, o.profile || {}) }); } }
  catch (e) { storageOk = false; }
  return defaults();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storageOk = false; } }
function audit(action, meta) { S.audit.unshift({ ts: Date.now(), action, meta: meta || '' }); S.audit = S.audit.slice(0, 200); save(); }
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ------------------------------- helpers ------------------------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const pct = v => Math.round(v * 100) + '%';
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = ts => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const fmtDT = ts => fmtDate(ts) + ', ' + fmtTime(ts);
const DAY = 864e5;
async function download(name, text, mime) {
  // Published pages must use the viewer's `downloads` capability; a plain file open falls back to a normal download.
  try {
    if (window.claude && window.claude.use) {
      const d = await window.claude.use('downloads');
      if (d) { try { await d.save({ filename: name, data: text }); return; } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return; } }
    }
  } catch (e) { }
  const b = new Blob([text], { type: mime || 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
let toastTimer;
function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', 2600); }

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', chat: 'M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z',
  book: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5V22h16', chart: 'M3 3v18h18M7 15l4-5 3 3 5-7', leaf: 'M11 20A7 7 0 014 13c0-6 6-9 16-9 0 10-3 16-9 16zM4 21c2-6 5-9 9-11',
  clip: 'M9 4h6l1 2h3v15H5V6h3zM9 12h6M9 16h4', target: 'M12 22a10 10 0 110-20 10 10 0 010 20zM12 18a6 6 0 110-12 6 6 0 010 12zM12 14a2 2 0 110-4 2 2 0 010 4z', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 118 0v4', help: 'M12 22a10 10 0 110-20 10 10 0 010 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01', phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.8 2z',
  mic: 'M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v4', moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', down: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  alert: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01', heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z', more: 'M4 6h16M4 12h16M4 18h16',
  cal: 'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4', up: 'M7 17L17 7M8 7h9v9', dn: 'M17 17L7 7M16 17H7V8', flat: 'M5 12h14', check: 'M20 6L9 17l-5-5', sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  tool: 'M14.7 6.3a4 4 0 01-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4L15 12l-3-3z', bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0'
};
const ic = (n, c) => `<svg class="icon ${c || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;

/* ---------------------------- i18n (placeholders) ---------------------------- */
const I18N = {
  en: { dashboard: 'Dashboard', new: 'New entry', chat: 'Companion chat', journal: 'Journal', tracker: 'Mood tracker', toolkit: 'Self-help', assess: 'Assessments', goals: 'Goals and habits', recs: 'Recommendations', pros: 'Find a professional', safety: 'Safety plan', privacy: 'Privacy center', settings: 'Settings', help: 'Help and feedback', admin: 'Admin tools', about: 'About and ethics', sos: 'Need help now?', more: 'More' },
  hi: { dashboard: 'डैशबोर्ड', new: 'नई प्रविष्टि', chat: 'साथी चैट', journal: 'जर्नल', tracker: 'मूड ट्रैकर', toolkit: 'स्व-सहायता', assess: 'आकलन', goals: 'लक्ष्य और आदतें', recs: 'सुझाव', pros: 'विशेषज्ञ खोजें', safety: 'सुरक्षा योजना', privacy: 'गोपनीयता केंद्र', settings: 'सेटिंग्स', help: 'सहायता और प्रतिक्रिया', admin: 'एडमिन टूल', about: 'परिचय और नैतिकता', sos: 'अभी मदद चाहिए?', more: 'और' },
  te: { dashboard: 'డాష్‌బోర్డ్', new: 'కొత్త ఎంట్రీ', chat: 'సహచర చాట్', journal: 'జర్నల్', tracker: 'మూడ్ ట్రాకర్', toolkit: 'స్వీయ సహాయం', assess: 'అంచనాలు', goals: 'లక్ష్యాలు', recs: 'సిఫార్సులు', pros: 'నిపుణులను కనుగొనండి', safety: 'భద్రతా ప్రణాళిక', privacy: 'గోప్యతా కేంద్రం', settings: 'సెట్టింగ్‌లు', help: 'సహాయం మరియు అభిప్రాయం', admin: 'అడ్మిన్ సాధనాలు', about: 'పరిచయం మరియు నీతి', sos: 'ఇప్పుడే సహాయం కావాలా?', more: 'మరిన్ని' }
};
const T = k => (I18N[S.profile.lang] || I18N.en)[k] || I18N.en[k] || k;

/* -------------------------------- reference data -------------------------------- */
// VERIFY BEFORE PRODUCTION: numbers are seeded from the project brief and common public listings.
const HELPLINES = [
  ['India', 'National Emergency Number', '112', '24x7', 'Multiple', 'emergency'], ['India', 'Tele-MANAS', '14416', '24x7', 'Multiple', 'helpline'],
  ['India', 'KIRAN Mental Health Helpline', '1800-599-0019', '24x7', 'Multiple', 'helpline'],
  ['United States', '988 Suicide & Crisis Lifeline', '988', '24x7', 'English, Spanish', 'helpline'], ['United States', 'Emergency Services', '911', '24x7', 'English', 'emergency'],
  ['United Kingdom', 'Samaritans', '116 123', '24x7', 'English', 'helpline'], ['United Kingdom', 'Emergency Services', '999', '24x7', 'English', 'emergency'],
  ['Australia', 'Lifeline', '13 11 14', '24x7', 'English', 'helpline'], ['Canada', '9-8-8 Suicide Crisis Helpline', '988', '24x7', 'English, French', 'helpline']
];
const QUESTIONNAIRES = {
  PHQ9: { title: 'PHQ-9', long: 'Patient Health Questionnaire-9', intro: 'Over the last 2 weeks, how often have you been bothered by the following problems?', opts: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], max: 27, high: 10,
    items: ['Little interest or pleasure in doing things', 'Feeling down, depressed, or hopeless', 'Trouble falling or staying asleep, or sleeping too much', 'Feeling tired or having little energy', 'Poor appetite or overeating', 'Feeling bad about yourself, or that you are a failure or have let yourself or your family down', 'Trouble concentrating on things, such as reading or watching television', 'Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual', 'Thoughts that you would be better off dead, or of hurting yourself in some way'],
    bands: [[0, 4, 'Minimal'], [5, 9, 'Mild'], [10, 14, 'Moderate'], [15, 19, 'Moderately severe'], [20, 27, 'Severe']] },
  GAD7: { title: 'GAD-7', long: 'Generalized Anxiety Disorder-7', intro: 'Over the last 2 weeks, how often have you been bothered by the following problems?', opts: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], max: 21, high: 10,
    items: ['Feeling nervous, anxious, or on edge', 'Not being able to stop or control worrying', 'Worrying too much about different things', 'Trouble relaxing', 'Being so restless that it is hard to sit still', 'Becoming easily annoyed or irritable', 'Feeling afraid, as if something awful might happen'],
    bands: [[0, 4, 'Minimal'], [5, 9, 'Mild'], [10, 14, 'Moderate'], [15, 21, 'Severe']] },
  PSS10: { title: 'PSS-10', long: 'Perceived Stress Scale (Cohen, Kamarck and Mermelstein, 1983)', intro: 'In the last month, how often have you...', opts: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'], max: 40, high: 27, reverse: [3, 4, 6, 7],
    items: ['been upset because of something that happened unexpectedly?', 'felt that you were unable to control the important things in your life?', 'felt nervous and stressed?', 'felt confident about your ability to handle your personal problems?', 'felt that things were going your way?', 'found that you could not cope with all the things that you had to do?', 'been able to control irritations in your life?', 'felt that you were on top of things?', 'been angered because of things that were outside of your control?', 'felt difficulties were piling up so high that you could not overcome them?'],
    bands: [[0, 13, 'Low perceived stress'], [14, 26, 'Moderate perceived stress'], [27, 40, 'High perceived stress']] }
};
const TIPS = ['Notice three things you can hear right now. It takes 20 seconds and brings you back to the present.', 'A short walk after a stressful stretch of work helps more than another coffee.', 'Writing a worry down does not solve it, but it stops you carrying it in your head.', 'Regular sleep and wake times are one of the kindest things you can do for your mood.', 'Drink a glass of water before you check your phone in the morning.', 'You do not have to feel better to take one small helpful step.', 'Talking to someone you trust for five minutes can change the whole afternoon.'];
const AFFIRM = ['I can take this one step at a time.', 'My feelings are valid, and they will change.', 'I am allowed to rest.', 'I have handled hard days before.', 'Asking for help is a strength.', 'I am doing the best I can with what I have today.'];
const PROS = [
  { id: 'p1', name: 'Sample Profile A', spec: 'Anxiety and stress management', langs: ['English', 'Hindi'], avail: 'Weekdays, evenings', rating: 4.6, fee: 'Fee placeholder' },
  { id: 'p2', name: 'Sample Profile B', spec: 'Low mood and life transitions', langs: ['English', 'Telugu'], avail: 'Mon, Wed, Sat', rating: 4.4, fee: 'Fee placeholder' },
  { id: 'p3', name: 'Sample Profile C', spec: 'Student and workplace wellbeing', langs: ['English', 'Hindi', 'Telugu'], avail: 'Tue to Fri, mornings', rating: 4.8, fee: 'Fee placeholder' }
];
const SAMPLE_TEXT = {
  high: ['I am under a lot of pressure and I am unable to sleep properly.', 'Deadlines are piling up and I feel completely overwhelmed.', 'I cannot stop worrying about my exams and I feel so anxious.', 'Money is tight and I keep worrying about rent and bills.', 'I am exhausted and stressed, there is too much to do.', 'My boss keeps piling on work and I am furious and stressed.'],
  mid: ['Work is annoying but manageable.', 'A bit tired and busy today, but I got through it.', 'Feeling somewhat worried about the meeting tomorrow.', 'Some stress with the project but I am managing.', 'I feel a little low and lonely this evening.'],
  low: ['I had a great day and felt really relaxed.', 'Went for a walk and feel calm and happy.', 'Dinner with family was lovely and I laughed a lot.', 'Feeling proud and motivated after finishing my assignment.', 'Just a regular day, nothing special happened.', 'Slept well and feel rested and good.']
};

/* ----------------------------- analysis + entries ----------------------------- */
function runAnalysis(text, opt) { return MHC.analyze(text, { keywords: S.keywords, thresholds: S.thresholds, tags: (opt && opt.tags) || [], mood: opt && opt.mood != null ? opt.mood : null }); }
function trendData() { return S.entries.map(e => ({ ts: e.ts, stress: e.a.stress.score, emotion: e.a.emotion.top, sentiment: e.a.sentiment.label, tags: e.tags, keywords: e.a.keywords })); }
function makeEntry(text, a, extra) {
  const slim = JSON.parse(JSON.stringify(a)); slim.preprocessing = { cleaned: a.preprocessing.cleaned, tokens: a.preprocessing.tokens };
  return Object.assign({ id: uid(), ts: Date.now(), text, tags: a.tags || [], mood: null, locked: false, shared: false, helpful: null, a: slim }, extra || {});
}
function generateSamples() {
  const now = Date.now(); let n = 0;
  for (let d = 59; d >= 0; d--) {
    if (Math.random() < 0.28) continue;
    const phase = d > 30 ? 62 - (59 - d) * 0.9 : 35 + (30 - d) * 1.1;         // easing down, then rising again
    const target = phase + (Math.random() - 0.5) * 18;
    const pool = target > 62 ? SAMPLE_TEXT.high : target > 38 ? SAMPLE_TEXT.mid : SAMPLE_TEXT.low;
    const text = pool[Math.floor(Math.random() * pool.length)];
    const ts = now - d * DAY - Math.floor(Math.random() * 10) * 3600e3 - 3600e3;
    const tags = /sleep/i.test(text) ? ['sleep'] : /work|boss|deadline|project|meeting/i.test(text) ? ['work'] : /exam|assignment/i.test(text) ? ['study'] : /family|dinner/i.test(text) ? ['family'] : /money|rent/i.test(text) ? ['finance'] : [];
    const a = runAnalysis(text, { tags });
    S.entries.push(makeEntry(text, a, { ts, demo: true })); n++;
  }
  save(); return n;
}

/* ------------------------------------ charts ------------------------------------ */
const lvlColor = l => l === 'high' ? 'var(--danger)' : l === 'moderate' ? '#D97706' : '#16A34A';
function gauge(score, level) {
  return `<svg class="gauge" viewBox="0 0 200 120" role="img" aria-label="Stress ${Math.round(score)} out of 100, ${level}"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round" pathLength="100"/>
  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${lvlColor(level)}" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(1, score)} 100"/>
  <text x="100" y="92" text-anchor="middle" font-family="var(--serif)" font-size="34" fill="currentColor">${Math.round(score)}</text><text x="100" y="112" text-anchor="middle" font-size="11" fill="var(--muted)">out of 100</text></svg>`;
}
function lineChart(days) {
  if (days.length < 2) return '<div class="empty">Add entries on at least two different days to see the line.</div>';
  const W = 640, H = 230, P = { l: 34, r: 10, t: 10, b: 26 }, x0 = days[0].ts, x1 = days[days.length - 1].ts;
  const sx = t => P.l + (t - x0) / ((x1 - x0) || 1) * (W - P.l - P.r), sy = v => P.t + (100 - v) / 100 * (H - P.t - P.b);
  const th = S.thresholds; const band = (a, b, c) => `<rect x="${P.l}" y="${sy(b)}" width="${W - P.l - P.r}" height="${sy(a) - sy(b)}" style="fill:var(${c})" opacity=".55"/>`;
  const pts = days.map(d => [sx(d.ts), sy(d.avg)]);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Stress score over time">${band(0, th.lowMax, '--calm-bg')}${band(th.lowMax, th.modMax, '--caution-bg')}${band(th.modMax, 100, '--danger-bg')}
  ${[0, th.lowMax, th.modMax, 100].map(v => `<text x="${P.l - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join('')}
  <polyline fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>
  ${days.map((d, i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.2" fill="var(--brand)"><title>${fmtDate(d.ts)}: ${Math.round(d.avg)}</title></circle>`).join('')}
  <text x="${P.l}" y="${H - 6}" font-size="10" fill="var(--muted)">${fmtDate(x0)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtDate(x1)}</text></svg>`;
}
function sentimentTimeline(entries) {
  if (entries.length < 2) return '<div class="empty">Not enough entries yet.</div>';
  const e = entries.slice().sort((a, b) => a.ts - b.ts), W = 640, H = 110, x0 = e[0].ts, x1 = e[e.length - 1].ts, sx = t => 14 + (t - x0) / ((x1 - x0) || 1) * (W - 28);
  const y = { positive: 22, neutral: 55, negative: 88 }, col = { positive: '#16A34A', neutral: '#94A3B8', negative: '#DC2626' };
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Sentiment timeline">${['positive', 'neutral', 'negative'].map(k => `<line x1="10" x2="${W - 10}" y1="${y[k]}" y2="${y[k]}" stroke="var(--line)"/><text x="12" y="${y[k] - 5}" font-size="10" fill="var(--muted)">${k}</text>`).join('')}
  ${e.map(x => `<circle cx="${sx(x.ts)}" cy="${y[x.sentiment]}" r="4.5" fill="${col[x.sentiment]}" opacity=".85"><title>${fmtDate(x.ts)}: ${x.sentiment}</title></circle>`).join('')}</svg>`;
}
function donut(pairs) {
  const total = pairs.reduce((a, p) => a + p[1], 0); if (!total) return '<div class="empty">No data.</div>';
  let off = 25; const seg = pairs.map(([k, v]) => { const len = v / total * 100; const s = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${EMO_COLORS[k] || '#888'}" stroke-width="7" stroke-dasharray="${len} ${100 - len}" stroke-dashoffset="${off}"><title>${cap(k)}: ${v}</title></circle>`; off -= len; return s; }).join('');
  return `<div class="row" style="align-items:center"><svg viewBox="0 0 42 42" width="170" height="170" role="img" aria-label="Emotion distribution">${seg}<text x="21" y="22.5" text-anchor="middle" font-size="7" fill="currentColor" font-family="var(--serif)">${total}</text></svg>
  <div class="legend" style="flex-direction:column;gap:.3rem">${pairs.map(([k, v]) => `<span><i style="background:${EMO_COLORS[k]}"></i>${cap(k)} ${Math.round(v / total * 100)}%</span>`).join('')}</div></div>`;
}
function barChart(items, max, unit) {
  if (!items.length) return '<div class="empty">No data.</div>';
  const W = 640, H = 190, bw = Math.min(56, (W - 40) / items.length - 8), m = max || Math.max(...items.map(i => i.value), 1);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${items.map((it, i) => { const x = 30 + i * ((W - 40) / items.length), h = it.value / m * (H - 50); return `<rect x="${x}" y="${H - 28 - h}" width="${bw}" height="${h}" rx="6" fill="${it.color || 'var(--brand)'}"><title>${it.label}: ${it.value.toFixed(0)}${unit || ''}</title></rect><text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(it.label)}</text><text x="${x + bw / 2}" y="${H - 32 - h}" text-anchor="middle" font-size="10" fill="currentColor">${it.value ? it.value.toFixed(0) : ''}</text>`; }).join('')}</svg>`;
}
function heatmap(entries) {
  const byDay = {}; entries.forEach(e => (byDay[MHC.dayKey(e.ts)] = byDay[MHC.dayKey(e.ts)] || []).push(e.stress));
  const today = new Date(); today.setHours(0, 0, 0, 0); const mon = new Date(today); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - 11 * 7);
  let rows = ''; const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let r = 0; r < 7; r++) { let tds = ''; for (let c = 0; c < 12; c++) { const d = new Date(mon); d.setDate(d.getDate() + c * 7 + r); const k = MHC.dayKey(d.getTime()), v = byDay[k]; const avg = v ? MHC.mean(v) : null; const th = S.thresholds; const bg = d > today ? 'transparent' : avg == null ? 'var(--surface-2)' : avg <= th.lowMax ? '#86D9A1' : avg <= th.modMax ? '#F6C463' : '#EF7B7B'; tds += `<td style="background:${bg};border-radius:4px;border:2px solid var(--bg)" title="${k}${avg != null ? ': ' + Math.round(avg) : ''}"></td>`; } rows += `<tr><th class="small muted" style="font-weight:400;padding-right:.4rem">${names[r]}</th>${tds}</tr>`; }
  return `<div class="scroll"><table class="hm" role="img" aria-label="Calendar heatmap of daily stress, last 12 weeks" style="border-collapse:separate;border-spacing:0">${rows}</table></div><div class="legend"><span><i style="background:#86D9A1"></i>Low</span><span><i style="background:#F6C463"></i>Moderate</span><span><i style="background:#EF7B7B"></i>High</span><span><i style="background:var(--surface-2);border:1px solid var(--line)"></i>No entry</span></div>`;
}
function highlight(text, kws) {
  const map = new Map(kws.map(k => [k.word.toLowerCase(), k.weight]));
  return String(text).split(/([A-Za-z\u00C0-\u024F']+)/).map((p, i) => {
    if (i % 2 === 0) return esc(p);
    let lw = p.toLowerCase().replace(/'/g, ''); if (lw === 'cant') lw = 'cannot';
    const w = map.get(lw); return w == null ? esc(p) : `<mark class="hl ${w > 0 ? 'pos' : ''}" title="Influence ${w > 0 ? '+' : ''}${w}">${esc(p)}</mark>`;
  }).join('');
}
const trendIcon = d => d === 'increasing' ? ic('up') : d === 'decreasing' ? ic('dn') : ic('flat');
function trendSentence(tr) {
  if (tr.direction === 'insufficient') return 'Add a few more entries to see how your stress is changing over time.';
  const w = tr.direction === 'stable' ? 'has been stable' : tr.direction === 'increasing' ? 'has been increasing' : 'has been decreasing';
  return `Your stress ${w}: your last ${tr.n} entries average ${Math.round(tr.recent)}, compared with ${Math.round(tr.previous)} before that (${tr.pctChange > 0 ? '+' : ''}${tr.pctChange}%).`;
}

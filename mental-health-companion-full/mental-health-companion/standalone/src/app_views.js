/* ============================== views ============================== */
const cleanups = [];
const onLeave = fn => cleanups.push(fn);
let guestCount = 0; try { guestCount = +sessionStorage.getItem('mhc.guest') || 0; } catch (e) { }
const badge = (kind, text) => `<span class="badge b-${kind}">${esc(text || cap(kind))}</span>`;
const disc = () => `<p class="disclaimer" role="note">${DISCLAIMER}</p>`;
const pageHead = (title, sub, actions) => `<div class="head"><div><h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">${title}</h1>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ''}</div><div class="row no-print">${actions || ''}</div></div>`;
const emptyBox = (msg, btn) => `<div class="empty"><p>${msg}</p>${btn || ''}</div>`;

/* ---------------------------- shared result panel ---------------------------- */
function emotionBars(probs) {
  return Object.entries(probs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar"><span>${cap(k)}</span><div class="track" role="img" aria-label="${cap(k)} ${pct(v)}"><div class="fill" style="width:${v * 100}%;background:${EMO_COLORS[k]}"></div></div><span>${pct(v)}</span></div>`).join('');
}
function resultHTML(a, o) {
  o = o || {}; const tr = MHC.trend(trendData(), 5, 5); const resp = MHC.respond(a, tr, (a.tags || []).join(' '));
  const orig = a.preprocessing.original || o.text || '';
  return `<div class="stack" id="result">
  <div class="card"><div class="row between"><h3>Your analysis</h3><span class="small muted">${esc(a.model.name)} v${esc(a.model.version)} (${a.latencyMs} ms)</span></div>
    <div class="grid g3" style="align-items:center">
      <div class="stat"><span class="muted small">Sentiment</span>${badge(a.sentiment.label)}<span class="small muted">confidence ${pct(a.sentiment.confidence)}</span></div>
      <div class="stat"><span class="muted small">Main emotion</span><span class="big" style="font-size:1.6rem">${cap(a.emotion.top)}</span><span class="small muted">${pct(a.emotion.probabilities[a.emotion.top])} likely</span></div>
      <div class="stat"><span class="muted small">Stress level</span>${badge(a.stress.level, cap(a.stress.level) + ' stress')}<span class="small muted">confidence ${pct(a.stress.confidence)}</span></div>
    </div>
    ${a.lowSignal ? '<p class="small muted" style="margin-top:.8rem">Few emotion words were found, so this result is a low-confidence guess. More detail helps.</p>' : ''}
    ${a.riskOverride ? '<p class="small muted" style="margin-top:.8rem">Because safety words were found, stress and sentiment were set to at least a high-concern value in your tracker.</p>' : ''}
  </div>
  <div class="grid g2">
    <div class="card"><h3>Stress gauge</h3>${gauge(a.stress.score, a.stress.level)}<p class="center small muted">Bands: low up to ${S.thresholds.lowMax}, moderate up to ${S.thresholds.modMax}, high above.</p></div>
    <div class="card"><h3>Emotion mix</h3>${emotionBars(a.emotion.probabilities)}</div>
  </div>
  <div class="card"><h3>Words that shaped the result</h3><p>${a.keywords.length ? highlight(orig, a.keywords) : esc(orig)}</p>
    <p class="small muted">Amber words pushed toward stress or negative feeling; green words pushed toward calm or positive feeling.</p>
    <div class="chips">${a.keywords.map(k => `<span class="badge ${k.weight > 0 ? 'b-positive' : 'b-moderate'}">${esc(k.word)} ${k.weight > 0 ? '+' : ''}${k.weight}</span>`).join('') || '<span class="muted small">No influential words found.</span>'}</div>
    <details style="margin-top:.7rem"><summary class="small" style="cursor:pointer;font-weight:700">Show preprocessing (original, cleaned, tokens)</summary>
      <p class="small"><b>Original:</b> ${esc(orig)}</p><p class="small"><b>Cleaned:</b> ${esc(a.preprocessing.cleaned) || '(empty)'}</p><p class="small"><b>Tokens:</b> ${a.preprocessing.tokens.map(t => `<code>${esc(t)}</code>`).join(' ')}</p></details></div>
  <div class="card"><h3>Trend ${trendIcon(tr.direction)}</h3><p>${esc(trendSentence(tr))}</p></div>
  <div class="card tint"><h3>A supportive note</h3><p>${esc(resp.empathy)}</p>
    ${resp.suggestions.length ? `<ul>${resp.suggestions.map(s => `<li><b>${esc(s.title)}.</b> ${esc(s.body)} ${s.tool ? `<a href="#/app/toolkit/${s.tool}">Open tool</a>` : ''}</li>`).join('')}</ul>` : ''}
    ${resp.nudge ? `<p><b>${esc(resp.nudge)}</b> <a href="#/app/pros">Find a professional</a></p>` : ''}
    ${resp.resources.length ? `<div class="grid g2">${resp.resources.map(r => `<a class="card" style="text-decoration:none;color:inherit" href="tel:${r.phone.replace(/[^0-9+]/g, '')}"><b>${ic('phone')} ${esc(r.name)}</b><br><span class="big" style="font-family:var(--serif);font-size:1.4rem">${esc(r.phone)}</span><br><span class="small muted">${esc(r.desc)}</span></a>`).join('')}</div>` : ''}
  </div>
  ${o.actions || ''}${disc()}</div>`;
}

/* -------------------------------- landing -------------------------------- */
function landing() {
  const has = S.profile.onboarded;
  return `<header class="topbar"><div class="in"><a class="brandmark" href="#/">${logo()} Mental Health Companion</a>
    <nav aria-label="Main"><a href="#how">How it works</a><a href="#/about">About and ethics</a><a href="#/helplines">Helplines</a><a class="btn light sm" href="#/app/dashboard">${has ? 'Log in' : 'Get started'}</a></nav></div></header>
  <main id="main"><section class="hero"><div class="in"><div><h1>Write how you feel. See what your words say about stress.</h1>
    <p class="lead">A private journal that reads each entry for sentiment, emotion and stress, tracks the pattern over weeks, and points you to real support when things get heavy.</p>
    <div class="row"><a class="btn light" href="#/app/dashboard">${has ? 'Continue to my journal' : 'Get started'}</a><a class="btn ghost" style="color:#fff;border-color:#fff" href="#/app/dashboard">Log in</a></div>
    <p class="small" style="color:#BBD0F7;margin-top:1rem">${DISCLAIMER}</p></div>
    <div class="demo" aria-labelledby="dh"><h2 id="dh" style="font-size:1.2rem">Try it now (guest mode)</h2>
      <label for="demoText" class="small">Type a sentence about how you feel</label>
      <textarea id="demoText" maxlength="500" placeholder="I am under a lot of pressure and I am unable to sleep properly."></textarea>
      <div class="row" style="margin:.5rem 0"><button class="btn" data-act="demoAnalyze">Analyze</button><span class="small muted" id="demoLeft">${Math.max(0, 3 - guestCount)} of 3 guest analyses left. Nothing is saved.</span></div>
      <div class="chips">${['I am under a lot of pressure and I am unable to sleep properly.', 'I had a great day and felt really relaxed.', 'Work is annoying but manageable.'].map(t => `<button class="chip" data-act="demoFill" data-t="${esc(t)}">${esc(t.length > 34 ? t.slice(0, 32) + '...' : t)}</button>`).join('')}</div>
      <div class="pipe" aria-live="polite" id="pipe">${['Preprocess', 'Sentiment', 'Emotion', 'Stress', 'Trend'].map(s => `<div class="step"><b>${s}</b><div class="v">&nbsp;</div></div>`).join('')}</div>
      <div id="demoOut" class="small muted">Results appear here. Crisis detection is always on, even in guest mode.</div></div></div></section>
  <section class="section" id="how"><div class="in"><h2>From your words to a clearer picture, in five steps</h2><p class="muted">Every entry moves through the same pipeline, and you can see each stage.</p>
    <div class="flow">${[['Text input', 'You write or speak a few sentences.'], ['Preprocessing', 'Emojis, slang and contractions are cleaned; negations like "not" are kept.'], ['Sentiment and emotion', 'Positive, neutral or negative, plus one of seven emotions.'], ['Stress level', 'A 0 to 100 score, banded low, moderate or high.'], ['Trend and support', 'Your recent average is compared with the one before, and you get gentle suggestions.']].map((s, i) => `<div class="f"><div class="n">${i + 1}</div><b>${s[0]}</b><p class="small muted" style="margin:.3rem 0 0">${s[1]}</p></div>`).join('')}</div></div></section>
  <section class="section alt"><div class="in"><h2>What you can do here</h2><div class="grid g3">${[['pen', 'Journal with analysis', 'Text or voice, tags, mood slider and a private lock.'], ['chart', 'Mood and stress tracker', 'Line chart, heatmap, emotion mix, time-of-day patterns and triggers.'], ['chat', 'Companion chat', 'Talk it through and get a reply that reflects what you wrote.'], ['leaf', 'Self-help toolkit', 'Animated breathing, grounding, muscle relaxation, thought record.'], ['clip', 'PHQ-9, GAD-7, PSS-10', 'Screening aids with score history. Not a diagnosis.'], ['shield', 'Safety plan and helplines', 'Build a plan, save contacts, one-tap call numbers.'], ['lock', 'Privacy first', 'Your data stays in this browser. Export or delete any time.'], ['target', 'Goals and habits', 'Sleep, exercise, water, meditation and time with people.']].map(f => `<div class="card">${ic(f[0])}<h3>${f[1]}</h3><p class="small muted" style="margin:0">${f[2]}</p></div>`).join('')}</div></div></section>
  <section class="section"><div class="in"><h2>Who it is built for</h2><div class="grid g2">
    <div class="card"><h3>Clients</h3><p class="small">Everything on this page works for you today, in this app.</p></div>
    <div class="card"><h3>Psychologists, staff and admins</h3><p class="small">The full project adds care-team portals, alert triage, model training and audit logs. They need a server and database, so they are in the project source, not this single file.</p></div></div></div></section>
  <section class="section alt"><div class="in"><h2>Our privacy and safety promise</h2><div class="grid g2">
    <div class="card"><h3>We never diagnose</h3><p class="small">Results are estimates from words, and they can be wrong. Confidence is always shown, and you can report a wrong prediction.</p></div>
    <div class="card"><h3>Safety comes first</h3><p class="small">If your words suggest you may be in danger, the app stops the casual suggestions and shows emergency support right away.</p></div>
    <div class="card"><h3>Your data stays with you</h3><p class="small">This version stores everything in your own browser. Nothing is sent to a server. It is not encrypted, so avoid using it on a shared device.</p></div>
    <div class="card"><h3>Testimonials</h3><p class="small muted">Placeholder. Real testimonials will appear here only with each person's consent.</p></div></div></div></section>
  <section class="section"><div class="in" style="max-width:820px"><h2>Frequently asked questions</h2>${faqHTML()}</div></section>
  <div class="helpline-strip"><div class="in"><b>${ic('alert')} In crisis or in danger?</b><a href="tel:112">India emergency 112</a><a href="tel:14416">Tele-MANAS 14416</a><a href="tel:1800-599-0019">KIRAN 1800-599-0019</a><a href="#/helplines" style="margin-left:auto">More countries</a></div></div>
  </main>${footer()}`;
}
function faqHTML() {
  return [['Is this a replacement for therapy?', DISCLAIMER], ['Who can see my journal?', 'Only you, on this device. In the full project, sharing with a psychologist needs your consent and is logged.'], ['What happens if I write something that suggests I am in danger?', 'You see emergency support straight away, with call buttons and your safety plan. In the full project, your care team and emergency contacts can be notified if you allowed it.'], ['How accurate is the analysis?', 'It is an automated estimate from wording. Sarcasm, mixed feelings and short texts can fool it, so treat it as a prompt for reflection.'], ['Can I delete my data?', 'Yes. Open the Privacy center to download or delete everything in one click.']]
    .map(q => `<details class="faq"><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join('');
}
function logo() { return `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#2563EB"/><circle cx="16" cy="16" r="9" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><circle cx="16" cy="16" r="4" fill="#fff"/></svg>`; }
function footer() { return `<footer class="foot"><div class="in"><div class="row between"><b>${logo()} Mental Health Companion</b><span><a href="#/about">About and ethics</a> &nbsp; <a href="#/helplines">Helplines</a> &nbsp; <a href="#/app/privacy">Privacy</a></span></div><p class="small" style="margin-top:.8rem">${DISCLAIMER}</p><p class="small" style="opacity:.8">Standalone demo edition. Analysis runs in your browser with a transparent word-and-rules engine, not the trained models of the full project.</p></div></footer>`; }

function helplinesPage(inApp) {
  const rows = HELPLINES.map(h => `<tr data-c="${esc(h[0].toLowerCase())}"><td>${esc(h[0])}</td><td>${esc(h[1])}</td><td><a class="btn sm" href="tel:${h[2].replace(/[^0-9+]/g, '')}">${ic('phone')} ${esc(h[2])}</a></td><td>${esc(h[3])}</td><td>${esc(h[4])}</td></tr>`).join('');
  const body = `<div class="stack"><div class="card" style="border-left:4px solid var(--danger)"><b>If you or someone else is in immediate danger, call your local emergency number now (112 in India).</b></div>
  <div class="field"><label for="hsearch">Search by country or service</label><input id="hsearch" type="search" data-act-input="helpSearch" placeholder="India, Samaritans, 988"></div>
  <div class="card scroll"><table class="t" id="htable"><thead><tr><th>Country</th><th>Service</th><th>Call</th><th>Hours</th><th>Language</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="disclaimer">These numbers are starter entries and must be verified with each organisation before real-world use. The list is not exhaustive.</p></div>`;
  return inApp ? body : `<header class="topbar"><div class="in"><a class="brandmark" href="#/">${logo()} Mental Health Companion</a><nav><a href="#/">Home</a><a class="btn light sm" href="#/app/dashboard">Open app</a></nav></div></header><main id="main" class="section"><div class="in"><h1>Helplines</h1>${body}</div></main>${footer()}`;
}

function aboutPage(inApp) {
  const b = `<div class="stack" style="max-width:780px"><h1>How the AI works, and where it falls short</h1>
  <div class="card"><h3>How it works</h3><p>Each entry is cleaned (lower-cased, emojis turned into words, slang and contractions expanded, repeated letters squeezed, common stop words removed but never negations such as "not"). A safety layer then checks for crisis phrases. Sentiment, emotion and stress come from a weighted word and phrase lexicon with rules for negation, intensifiers ("very") and "but" clauses. Trends compare the average of your last five entries with the five before. If you move the mood slider on a new entry, it nudges the stress score slightly.</p></div>
  <div class="card"><h3>What this demo is, and is not</h3><p>This single-file edition uses a transparent lexicon-and-rules engine so you can see exactly why it says what it says. The full project also includes trained TF-IDF + Logistic Regression, DistilBERT and RoBERTa models. Those need a Python back end.</p></div>
  <div class="card"><h3>Limitations and bias</h3><ul><li>Sarcasm, humour, mixed feelings and cultural or regional expressions can be misread.</li><li>The word lists were written for English, and coverage of Hinglish, Hindi and Telugu is minimal.</li><li>Short entries carry little signal, so results show lower confidence.</li><li>Different people express distress differently. A low score never proves you are fine.</li><li>The crisis matcher favours caution, so it may sometimes raise the alert when a phrase is negated ("I would never hurt myself").</li></ul></div>
  <div class="card"><h3>What we will never do</h3><p>Diagnose, prescribe, or replace a psychologist or doctor. The questionnaires (PHQ-9, GAD-7, PSS-10) are screening aids only.</p></div>${disc()}</div>`;
  return inApp ? b : `<header class="topbar"><div class="in"><a class="brandmark" href="#/">${logo()} Mental Health Companion</a><nav><a href="#/">Home</a><a class="btn light sm" href="#/app/dashboard">Open app</a></nav></div></header><main id="main" class="section"><div class="in">${b}</div></main>${footer()}`;
}

/* ------------------------------ app: dashboard ------------------------------ */
function dashboard() {
  const td = trendData(), tr = MHC.trend(td, 5, 5), st = MHC.streak(td);
  const last = S.entries.slice().sort((a, b) => b.ts - a.ts);
  const latest = last[0], hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const todayE = last.filter(e => MHC.dayKey(e.ts) === MHC.dayKey(Date.now()));
  const todayAvg = todayE.length ? MHC.mean(todayE.map(e => e.a.stress.score)) : null;
  const gScore = todayAvg != null ? todayAvg : latest ? latest.a.stress.score : null;
  const lvl = gScore == null ? null : gScore <= S.thresholds.lowMax ? 'low' : gScore <= S.thresholds.modMax ? 'moderate' : 'high';
  const tip = TIPS[Math.floor(Date.now() / DAY) % TIPS.length];
  const up = S.appts.filter(a => a.status !== 'cancelled' && new Date(a.when) > Date.now()).sort((a, b) => new Date(a.when) - new Date(b.when)).slice(0, 2);
  return `${pageHead(`${greet}${S.profile.name ? ', ' + esc(S.profile.name) : ''}`, 'How are you feeling today?')}
  <div class="stack"><div class="card"><label for="quick">How are you feeling?</label><textarea id="quick" placeholder="A sentence or two is enough."></textarea><div class="row" style="margin-top:.5rem"><button class="btn" data-act="quickAnalyze">Analyze</button><a class="btn ghost" href="#/app/new">Open full entry form</a></div></div>
  <div class="grid g3">
    <div class="card"><h3>Today's stress</h3>${gScore != null ? gauge(gScore, lvl) + `<p class="center">${badge(lvl, cap(lvl) + ' stress')}</p>` : '<p class="muted">No entries yet.</p>'}</div>
    <div class="card"><h3>Trend</h3><p class="stat"><span class="big">${trendIcon(tr.direction)} ${tr.direction === 'insufficient' ? '--' : (tr.pctChange > 0 ? '+' : '') + tr.pctChange + '%'}</span></p><p class="small muted">${esc(trendSentence(tr))}</p></div>
    <div class="card"><h3>Streak</h3><p class="stat"><span class="big">${st} day${st === 1 ? '' : 's'}</span></p><p class="small muted">${st ? 'Nice. Keep the habit gentle.' : 'Write an entry today to start a streak.'}</p><h3 style="margin-top:.8rem">Today's mood</h3><p style="font-size:1.8rem;margin:0">${latest && latest.mood ? MOODS[latest.mood - 1] : ''} ${latest ? cap(latest.a.emotion.top) : '--'}</p></div>
  </div>
  <div class="grid g2"><div class="card"><div class="row between"><h3>Recent entries</h3><a href="#/app/journal">See all</a></div>${last.slice(0, 3).map(entryCard).join('') || emptyBox('No entries yet. Your first one takes about a minute.', '<a class="btn" href="#/app/new">Write an entry</a>')}</div>
  <div class="stack"><div class="card tint"><h3>Daily tip</h3><p style="margin:0">${tip}</p></div>
   <div class="card"><h3>Upcoming appointments</h3>${up.length ? up.map(a => `<p style="margin:.2rem 0">${ic('cal')} ${fmtDT(a.when)} with ${esc(a.name)}</p>`).join('') : '<p class="muted small">None. <a href="#/app/pros">Find a professional</a></p>'}</div>
   <div class="card"><h3>Active goals</h3>${S.goals.length ? S.goals.slice(0, 3).map(g => `<p style="margin:.2rem 0">${cap(g.type)}: ${todayVal(g)} / ${g.target} ${esc(g.unit)}</p>`).join('') : '<p class="muted small">No goals yet. <a href="#/app/goals">Set one</a></p>'}</div></div></div>
  ${!S.entries.length ? `<div class="card"><b>Want to see the tracker with data?</b><p class="small muted">Add 60 days of sample entries, analysed by the same engine. You can remove them later in the Privacy center.</p><button class="btn soft" data-act="loadSamples">Load sample data</button></div>` : ''}${disc()}</div>`;
}
const todayVal = g => (g.log && g.log[MHC.dayKey(Date.now())]) || 0;
function entryCard(e) {
  const txt = e.locked ? '<i class="muted">Locked entry</i>' : esc(e.text.length > 140 ? e.text.slice(0, 138) + '...' : e.text);
  return `<div class="entry" style="margin:.5rem 0"><div class="row between"><span class="small muted">${fmtDT(e.ts)}${e.demo ? ' (sample)' : ''}</span><span class="row" style="gap:.3rem">${badge(e.a.sentiment.label)}${badge(e.a.stress.level, cap(e.a.stress.level))}</span></div><p style="margin:.4rem 0 0">${txt}</p></div>`;
}

/* -------------------------------- new entry -------------------------------- */
let draft = { text: '', tags: [], mood: 3, locked: false, result: null };
function newEntry() {
  return `${pageHead('New entry', 'Write freely. Nobody else sees this.')}
  <div class="stack"><div class="card"><div class="field"><label for="etext">What is on your mind?</label><textarea id="etext" maxlength="2000" data-act-input="draftText" placeholder="Write about your day, your worries, anything.">${esc(draft.text)}</textarea>
   <div class="row between"><span class="small muted"><span id="cc">${draft.text.length}</span> / 2000</span><button class="btn soft sm" data-act="voice" id="voiceBtn">${ic('mic')} Voice input</button></div></div>
   <div class="field"><label for="mood">Mood <span id="moodEmoji" style="font-size:1.4rem">${MOODS[draft.mood - 1]}</span></label><input id="mood" type="range" min="1" max="5" value="${draft.mood}" data-act-input="mood" aria-valuetext="${draft.mood} of 5"><div class="row between small muted"><span>Low</span><span>Great</span></div></div>
   <div class="field"><label>Tags</label><div class="chips">${TAGS.map(t => `<button class="chip" data-act="tag" data-t="${t}" aria-pressed="${draft.tags.includes(t)}">${t}</button>`).join('')}</div></div>
   <div class="field"><label class="row" style="font-weight:400"><input type="checkbox" id="lockbox" ${draft.locked ? 'checked' : ''} data-act-input="lock"> Private (lock this entry in the journal)</label></div>
   <div class="row"><button class="btn" data-act="analyze">Analyze</button><button class="btn ghost" data-act="clearDraft">Clear</button></div></div>
  <div id="resultSlot">${draft.result ? resultHTML(draft.result, { text: draft.text, actions: resultActions() }) : ''}</div></div>`;
}
function resultActions() {
  return `<div class="card no-print"><div class="row"><button class="btn" data-act="saveEntry">Save entry</button><button class="btn ghost" data-act="editDraft">Edit text</button><button class="btn ghost" data-act="discard">Discard</button></div>
  <div class="row" style="margin-top:.7rem"><span class="small muted">Was this helpful?</span><button class="chip" data-act="helpful" data-v="1" aria-label="Helpful">${ic('check')} Yes</button><button class="chip" data-act="helpful" data-v="0" aria-label="Not helpful">No</button><button class="chip" data-act="reportWrong">Report wrong prediction</button></div></div>`;
}

/* ---------------------------------- chat ---------------------------------- */
const FOLLOW = { anxiety: ['What feels like the biggest worry right now?', 'Would a slow breathing exercise help before we talk it through?'], sadness: ['That sounds painful. Would you like to tell me more about what happened?', 'What has helped, even a little, on days like this?'], anger: ['What happened just before you started to feel this way?', 'What would you like to be different?'], fear: ['What feels most frightening about it?', 'Is there someone you trust who could be with you or on the phone?'], stress: ['What is the one thing weighing on you most?', 'If you could take one thing off your plate today, what would it be?'], joy: ['That is good to hear. What made it feel good?'], neutral: ["I'm listening. What's on your mind?", 'Tell me a bit more about your day.'] };
function chatView() {
  const msgs = S.chats.slice(-60);
  return `${pageHead('Companion chat', 'A gentle place to talk things through.', `<button class="btn ghost sm" data-act="exportChat">${ic('down')} Export</button><button class="btn ghost sm" data-act="clearChat">${ic('trash')} Clear</button><a class="btn danger sm" href="#/app/safety">Talk to a human</a>`)}
  <div class="card"><div class="chat" id="chatlog" aria-live="polite">${msgs.length ? msgs.map(chatBubble).join('') : '<div class="msg bot">Hi. I am a supportive companion, not a therapist. How are you feeling right now?</div>'}</div>
  <div class="row" style="margin-top:.7rem"><label for="chatin" class="small" style="position:absolute;left:-9999px">Message</label><input id="chatin" type="text" placeholder="Type a message" style="flex:1 1 200px" maxlength="500"><button class="btn" data-act="chatSend">Send</button></div></div>${disc()}`;
}
const chatBubble = m => `<div class="msg ${m.who}">${esc(m.text)}</div>`;
function botReply(a) {
  const tr = MHC.trend(trendData(), 5, 5), r = MHC.respond(a, tr, '');
  const f = FOLLOW[a.emotion.top] || FOLLOW.neutral; const q = f[Math.round(a.stress.score) % f.length];
  let extra = ''; if (r.suggestions.length && a.stress.level !== 'low') { const s = r.suggestions[0]; extra = `\n\nIf it helps: ${s.title.toLowerCase()}. ${s.body}`; }
  return r.empathy + ' ' + q + extra;
}

/* --------------------------------- journal --------------------------------- */
const jf = { q: '', emotion: '', stress: '', sentiment: '', tag: '', from: '', to: '', sort: 'new', page: 1 };
function filteredEntries() {
  let e = S.entries.slice();
  if (jf.q) e = e.filter(x => !x.locked && x.text.toLowerCase().includes(jf.q.toLowerCase()));
  if (jf.emotion) e = e.filter(x => x.a.emotion.top === jf.emotion);
  if (jf.stress) e = e.filter(x => x.a.stress.level === jf.stress);
  if (jf.sentiment) e = e.filter(x => x.a.sentiment.label === jf.sentiment);
  if (jf.tag) e = e.filter(x => x.tags.includes(jf.tag));
  if (jf.from) e = e.filter(x => x.ts >= new Date(jf.from).getTime());
  if (jf.to) e = e.filter(x => x.ts <= new Date(jf.to).getTime() + DAY);
  e.sort((a, b) => jf.sort === 'old' ? a.ts - b.ts : jf.sort === 'stress' ? b.a.stress.score - a.a.stress.score : b.ts - a.ts);
  return e;
}
function journalList() {
  const all = filteredEntries(), per = 8, pages = Math.max(1, Math.ceil(all.length / per)); jf.page = Math.min(jf.page, pages);
  const rows = all.slice((jf.page - 1) * per, jf.page * per);
  return `${rows.map(e => `<div class="entry" style="margin:.6rem 0"><div class="row between"><span class="small muted">${fmtDT(e.ts)}${e.demo ? ' (sample)' : ''}${e.source === 'chat' ? ' (chat)' : ''}${e.locked ? ' ' + ic('lock') : ''}</span><span class="row" style="gap:.3rem">${badge(e.a.sentiment.label)}${badge('info', cap(e.a.emotion.top))}${badge(e.a.stress.level, cap(e.a.stress.level) + ' ' + Math.round(e.a.stress.score))}</span></div>
   <p style="margin:.5rem 0">${e.locked ? '<i class="muted">Locked. Unlock to read.</i>' : esc(e.text)}</p><div class="chips" style="margin-bottom:.5rem">${e.tags.map(t => `<span class="badge b-neutral">${esc(t)}</span>`).join('')}</div>
   <div class="row no-print"><button class="btn soft sm" data-act="viewEntry" data-id="${e.id}" ${e.locked ? 'disabled' : ''}>View analysis</button><button class="btn ghost sm" data-act="toggleLock" data-id="${e.id}">${e.locked ? 'Unlock' : 'Lock'}</button><button class="btn ghost sm" data-act="share" data-id="${e.id}">${e.shared ? 'Shared (demo)' : 'Share with psychologist'}</button><button class="btn ghost sm" style="color:var(--danger);border-color:var(--danger)" data-act="delEntry" data-id="${e.id}">${ic('trash')} Delete</button></div></div>`).join('') || emptyBox('No entries match. Try clearing the filters or write a new entry.', '<a class="btn" href="#/app/new">New entry</a>')}
  <div class="row between no-print" style="margin-top:.8rem"><span class="small muted">${all.length} entries, page ${jf.page} of ${pages}</span><span class="row"><button class="btn ghost sm" data-act="page" data-d="-1" ${jf.page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn ghost sm" data-act="page" data-d="1" ${jf.page >= pages ? 'disabled' : ''}>Next</button></span></div>`;
}
function journalView() {
  const sel = (id, opts, cur, label) => `<div><label for="${id}" class="small">${label}</label><select id="${id}" data-act-input="jf" data-k="${id.slice(2)}"><option value="">All</option>${opts.map(o => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  return `${pageHead('Journal history', 'Search, filter and export your entries.', `<button class="btn ghost sm" data-act="exportCSV">${ic('down')} CSV</button><button class="btn ghost sm" data-act="print">Print or save PDF</button>`)}
  <div class="card no-print"><div class="grid g3"><div><label for="jfq" class="small">Search text</label><input id="jfq" type="search" value="${esc(jf.q)}" data-act-input="jf" data-k="q"></div>
   ${sel('jfemotion', MHC.EMOTIONS, jf.emotion, 'Emotion')}${sel('jfstress', ['low', 'moderate', 'high'], jf.stress, 'Stress')}${sel('jfsentiment', ['positive', 'neutral', 'negative'], jf.sentiment, 'Sentiment')}${sel('jftag', TAGS, jf.tag, 'Tag')}
   <div><label for="jfsort" class="small">Sort</label><select id="jfsort" data-act-input="jf" data-k="sort"><option value="new" ${jf.sort === 'new' ? 'selected' : ''}>Newest</option><option value="old" ${jf.sort === 'old' ? 'selected' : ''}>Oldest</option><option value="stress" ${jf.sort === 'stress' ? 'selected' : ''}>Highest stress</option></select></div>
   <div><label for="jffrom" class="small">From</label><input id="jffrom" type="date" value="${jf.from}" data-act-input="jf" data-k="from"></div><div><label for="jfto" class="small">To</label><input id="jfto" type="date" value="${jf.to}" data-act-input="jf" data-k="to"></div></div></div>
  <div id="jlist">${journalList()}</div>`;
}

/* --------------------------------- tracker --------------------------------- */
let trRange = 60;
function trackerView() {
  if (!S.entries.length) return `${pageHead('Mood and stress tracker')}${emptyBox('Your charts appear after your first entries.', '<a class="btn" href="#/app/new">Write an entry</a> <button class="btn soft" data-act="loadSamples">Load sample data</button>')}`;
  const all = trendData(), cutoff = trRange ? Date.now() - trRange * DAY : 0, td = all.filter(e => e.ts >= cutoff);
  const sum = MHC.summaries(td), tr = MHC.trend(td, 5, 5), wk = MHC.weekly(td), st = MHC.streak(all);
  const top = sum.emotions[0];
  return `${pageHead('Mood and stress tracker', 'Patterns in your entries over time.', `<select aria-label="Date range" data-act-input="range">${[[7, 'Last 7 days'], [30, 'Last 30 days'], [60, 'Last 60 days'], [90, 'Last 90 days'], [0, 'All time']].map(r => `<option value="${r[0]}" ${r[0] === trRange ? 'selected' : ''}>${r[1]}</option>`).join('')}</select><button class="btn ghost sm" data-act="print">Print or save PDF</button>`)}
  <div class="stack"><div class="card tint"><h3>Summary ${trendIcon(tr.direction)}</h3><p>${esc(trendSentence(tr))}</p><p class="small muted" style="margin:0">${td.length} entries. Streak: ${st} day${st === 1 ? '' : 's'}. ${top ? 'Most frequent emotion: ' + top[0] + '. ' : ''}${sum.best ? 'Calmest day: ' + fmtDate(new Date(sum.best.day + 'T12:00:00').getTime()) + ' (' + Math.round(sum.best.avg) + '). ' : ''}${sum.worst ? 'Hardest day: ' + fmtDate(new Date(sum.worst.day + 'T12:00:00').getTime()) + ' (' + Math.round(sum.worst.avg) + ').' : ''}</p></div>
  <div class="card"><h3>Stress over time</h3>${lineChart(sum.daily.map(d => ({ ts: new Date(d.day + 'T12:00:00').getTime(), avg: d.avg })))}</div>
  <div class="card"><h3>Sentiment timeline</h3>${sentimentTimeline(td)}</div>
  <div class="grid g2"><div class="card"><h3>Emotion mix</h3>${donut(sum.emotions)}</div><div class="card"><h3>Calendar heatmap (12 weeks)</h3>${heatmap(all)}</div></div>
  <div class="grid g2"><div class="card"><h3>Weekly average stress</h3>${barChart(wk.slice(-8).map(w => ({ label: w.week.slice(5), value: w.avg, color: w.avg <= S.thresholds.lowMax ? '#16A34A' : w.avg <= S.thresholds.modMax ? '#D97706' : '#DC2626' })), 100)}<p class="small muted">${wk.length > 1 ? 'Latest week vs previous: ' + (wk[wk.length - 1].change > 0 ? '+' : '') + wk[wk.length - 1].change + '%' : 'Need two weeks of data to compare.'}</p></div>
   <div class="card"><h3>Time of day</h3>${barChart(sum.timeOfDay.map(t => ({ label: cap(t.part), value: t.avg })), 100)}<p class="small muted">Average stress by when you wrote.</p></div></div>
  <div class="grid g2"><div class="card"><h3>Top triggers (words)</h3>${sum.triggers.length ? `<div class="chips">${sum.triggers.map(t => `<span class="badge b-moderate">${esc(t[0])} x${t[1]}</span>`).join('')}</div>` : '<p class="muted">Not enough data.</p>'}</div>
   <div class="card"><h3>Top tags</h3>${sum.tags.length ? `<div class="chips">${sum.tags.map(t => `<span class="badge b-info">${esc(t[0])} x${t[1]}</span>`).join('')}</div>` : '<p class="muted">Add tags to your entries to see themes.</p>'}</div></div>
  ${S.entries.length < 10 ? '<div class="card no-print"><b>Want to see the tracker with more data?</b> <button class="btn soft sm" data-act="loadSamples">Add 60 days of sample entries</button></div>' : ''}${disc()}</div>`;
}

/* ---------------------------------- toolkit ---------------------------------- */
const TOOLS = [['breathing', 'Breathing'], ['meditate', 'Meditation timer'], ['grounding', '5-4-3-2-1'], ['pmr', 'Muscle relaxation'], ['sleep', 'Sleep hygiene'], ['gratitude', 'Gratitude'], ['cbt', 'Thought record'], ['affirm', 'Affirmations'], ['audio', 'Audio'], ['checkin', 'Daily check-in']];
function toolkitView(tool) {
  tool = tool || 'breathing';
  const tabs = `<div class="tabs" role="tablist">${TOOLS.map(t => `<a class="chip" role="tab" href="#/app/toolkit/${t[0]}" aria-pressed="${t[0] === tool}" style="text-decoration:none;color:inherit">${t[1]}</a>`).join('')}</div>`;
  const body = {
    breathing: `<div class="card"><h3>Guided breathing</h3><div class="row"><button class="btn soft sm" data-act="breath" data-m="478">4-7-8</button><button class="btn soft sm" data-act="breath" data-m="box">Box (4-4-4-4)</button><button class="btn ghost sm" data-act="breathStop">Stop</button></div><div class="breath-wrap"><div class="breath" id="breath" role="img" aria-label="Breathing guide">Ready</div></div><p class="center muted small" id="breathHint">Choose a pattern. If you feel dizzy, stop and breathe normally.</p></div>`,
    meditate: `<div class="card"><h3>Meditation timer</h3><div class="row"><label for="mins" style="margin:0">Minutes</label><select id="mins" style="width:auto">${[1, 3, 5, 10, 15, 20].map(m => `<option ${m === 5 ? 'selected' : ''}>${m}</option>`).join('')}</select><button class="btn" data-act="medStart">Start</button><button class="btn ghost" data-act="medStop">Stop</button></div><p class="stat center"><span class="big" id="medtime" style="font-size:3.4rem">05:00</span></p><p class="muted small center">Sit comfortably, follow your breath, and gently return when your mind wanders.</p></div>`,
    grounding: `<div class="card"><h3>5-4-3-2-1 grounding</h3><p class="muted">Tick each item as you notice it.</p>${[['See', 5], ['Touch', 4], ['Hear', 3], ['Smell', 2], ['Taste', 1]].map(([s, n]) => `<div class="field"><b>${n} things you can ${s.toLowerCase()}</b><div class="chips" style="margin-top:.3rem">${Array.from({ length: n }, (_, i) => `<label class="chip" style="font-weight:400"><input type="checkbox"> ${i + 1}</label>`).join('')}</div></div>`).join('')}<p class="muted small">Done? Take one slow breath out.</p></div>`,
    pmr: `<div class="card"><h3>Progressive muscle relaxation</h3><p class="muted">Tense each area for 5 seconds, then release for 10. Breathe out as you let go.</p><ol>${['Feet and toes: curl them tight', 'Calves: point your toes up', 'Thighs: squeeze together', 'Stomach: pull in gently', 'Hands: make fists', 'Arms: bend and tense your biceps', 'Shoulders: lift toward your ears', 'Face: scrunch eyes and jaw, then soften'].map(x => `<li>${x}</li>`).join('')}</ol></div>`,
    sleep: `<div class="card"><h3>Sleep hygiene tips</h3><ul>${['Keep the same sleep and wake time, even on weekends.', 'Dim lights and put screens away 30 to 60 minutes before bed.', 'Limit caffeine after midday and heavy meals late at night.', 'Keep the room cool, dark and quiet.', 'Use the bed for sleep. If awake for 20 minutes, get up and do something calm.', 'Write tomorrow\'s to-do list before bed to unload your mind.', 'Get daylight in the morning and some movement during the day.'].map(x => `<li>${x}</li>`).join('')}</ul><p class="small muted">If poor sleep continues for weeks, consider talking to a doctor.</p></div>`,
    gratitude: `<div class="card"><h3>Gratitude journal</h3><div class="field"><label for="grat">Something you are grateful for today</label><input id="grat" type="text" maxlength="200"></div><button class="btn" data-act="addGrat">Save</button><div style="margin-top:1rem">${S.gratitude.slice().reverse().slice(0, 10).map(g => `<p class="entry small" style="margin:.4rem 0">${fmtDate(g.ts)}: ${esc(g.text)}</p>`).join('') || '<p class="muted small">Nothing saved yet.</p>'}</div></div>`,
    cbt: `<div class="card"><h3>Thought record (CBT reframing)</h3><p class="muted small">Slow a stressful thought down and test it.</p>${[['sit', 'Situation: what happened?'], ['thought', 'Automatic thought: what went through your mind?'], ['emo', 'Feeling and strength (0 to 100)'], ['for', 'Evidence for the thought'], ['against', 'Evidence against the thought'], ['balanced', 'A more balanced thought']].map(([k, l]) => `<div class="field"><label for="c_${k}">${l}</label><textarea id="c_${k}" style="min-height:64px"></textarea></div>`).join('')}<button class="btn" data-act="saveCbt">Save thought record</button><p class="small muted" style="margin-top:.6rem">${S.thoughts.length} saved.</p></div>`,
    affirm: `<div class="card center"><h3>Positive affirmation</h3><p style="font-family:var(--serif);font-size:1.6rem" id="aff">${AFFIRM[0]}</p><button class="btn" data-act="affirm">Another one</button></div>`,
    audio: `<div class="card"><h3>Relaxation audio</h3><p class="muted">Placeholders. Audio files are not bundled in this edition.</p>${['Rain and forest sounds', 'Body scan (10 min)', 'Sleep story (15 min)'].map(x => `<div class="entry row between" style="margin:.4rem 0"><span>${x}</span><button class="btn ghost sm" disabled>Coming soon</button></div>`).join('')}</div>`,
    checkin: `<div class="card"><h3>Daily check-in</h3><div class="field"><label for="ci">How is today so far? <span id="ciEmoji" style="font-size:1.4rem">😐</span></label><input id="ci" type="range" min="1" max="5" value="3" data-act-input="ciMood"></div><div class="field"><label for="cin">One line (optional)</label><input id="cin" type="text" maxlength="200"></div><button class="btn" data-act="saveCheckin">Save check-in</button><p class="small muted" style="margin-top:.6rem">${S.checkins.length} check-ins saved. ${S.checkins.slice(-7).map(c => MOODS[c.mood - 1]).join(' ')}</p></div>`
  }[tool] || '';
  return `${pageHead('Self-help toolkit', 'Small practices that can help in the moment.')}${tabs}${body}${disc()}`;
}

/* -------------------------------- assessments -------------------------------- */
function assessView(code) {
  if (code && QUESTIONNAIRES[code]) {
    const q = QUESTIONNAIRES[code];
    return `${pageHead(q.title, q.long)}<div class="card"><p>${q.intro}</p><form id="qform" onsubmit="return false">${q.items.map((it, i) => `<fieldset style="border:1px solid var(--line);border-radius:12px;margin:.6rem 0;padding:.6rem .9rem"><legend style="padding:0 .3rem">${i + 1}. ${esc(it)}</legend><div class="chips">${q.opts.map((o, v) => `<label class="chip" style="font-weight:400"><input type="radio" name="q${i}" value="${v}"> ${o}</label>`).join('')}</div></fieldset>`).join('')}</form>
      <div class="row"><button class="btn" data-act="submitQ" data-code="${code}">See my score</button><a class="btn ghost" href="#/app/assess">Cancel</a></div>${disc()}</div>`;
  }
  return `${pageHead('Assessments', 'Screening aids only. They cannot diagnose anything.')}<div class="grid g3">${Object.entries(QUESTIONNAIRES).map(([c, q]) => `<div class="card"><h3>${q.title}</h3><p class="small muted">${q.long}</p><p class="small">${q.items.length} questions</p><a class="btn" href="#/app/assess/${c}">Start</a></div>`).join('')}</div>
  <div class="card" style="margin-top:1rem"><h3>Score history</h3>${['PHQ9', 'GAD7', 'PSS10'].map(c => { const h = S.assess.filter(a => a.code === c); return h.length ? `<h4>${QUESTIONNAIRES[c].title}</h4>${barChart(h.slice(-10).map(a => ({ label: fmtDate(a.ts).slice(0, 6), value: a.score })), QUESTIONNAIRES[c].max)}<p class="small muted">Latest: ${h[h.length - 1].score} (${h[h.length - 1].band})</p>` : ''; }).join('') || '<p class="muted">No results yet.</p>'}</div>${disc()}`;
}
function scoreQ(code, answers) {
  const q = QUESTIONNAIRES[code], top = q.opts.length - 1;
  const score = answers.reduce((s, a, i) => s + (q.reverse && q.reverse.includes(i) ? top - a : a), 0);
  const band = q.bands.find(b => score >= b[0] && score <= b[1])[2];
  return { score, band, high: score >= q.high };
}

/* ---------------------------------- goals ---------------------------------- */
const GOAL_DEF = { sleep: [7.5, 'hours'], exercise: [30, 'minutes'], hydration: [8, 'glasses'], meditation: [10, 'minutes'], social: [30, 'minutes'] };
function goalStreak(g) { let s = 0; const d = new Date(); if (!(g.log && g.log[MHC.dayKey(d.getTime())] >= g.target)) d.setDate(d.getDate() - 1); while (g.log && g.log[MHC.dayKey(d.getTime())] >= g.target) { s++; d.setDate(d.getDate() - 1); } return s; }
function goalsView() {
  return `${pageHead('Goals and habits', 'Small daily targets, tracked kindly.')}<div class="card"><div class="row"><label for="gt" style="margin:0">New goal</label><select id="gt" style="width:auto">${Object.keys(GOAL_DEF).map(k => `<option value="${k}">${cap(k)} (${GOAL_DEF[k][0]} ${GOAL_DEF[k][1]})</option>`).join('')}</select><button class="btn" data-act="addGoal">Add goal</button></div></div>
  <div class="grid g2" style="margin-top:1rem">${S.goals.map(g => { const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], value: (g.log && g.log[MHC.dayKey(d.getTime())]) || 0 }; });
    return `<div class="card"><div class="row between"><h3>${cap(g.type)}</h3><span class="badge b-info">Streak ${goalStreak(g)}</span></div><p class="small muted">Target ${g.target} ${g.unit} per day</p>${barChart(days, Math.max(g.target, ...days.map(d => d.value)))}
    <div class="row"><input type="number" step="0.5" min="0" id="gv_${g.id}" value="${todayVal(g) || ''}" aria-label="Today's value" style="width:110px" placeholder="Today"><button class="btn sm" data-act="logGoal" data-id="${g.id}">Log today</button><label class="row small" style="font-weight:400;margin:0"><input type="checkbox" ${g.remind ? 'checked' : ''} data-act-input="goalRemind" data-id="${g.id}"> Remind me</label><button class="btn ghost sm" style="color:var(--danger);border-color:var(--danger)" data-act="delGoal" data-id="${g.id}">${ic('trash')}</button></div></div>`; }).join('') || `<div style="grid-column:1/-1">${emptyBox('No goals yet. Pick one above to begin.')}</div>`}</div>`;
}

/* ------------------------------ recommendations ------------------------------ */
function recsView() {
  const latest = S.entries.slice().sort((a, b) => b.ts - a.ts)[0], tr = MHC.trend(trendData(), 5, 5);
  const r = latest ? MHC.respond(latest.a, tr, latest.tags.join(' ')) : null;
  const card = s => `<div class="card"><div class="row between"><h3>${esc(s.title)}</h3><span class="badge b-info">${esc(s.cat)}</span></div><p class="small">${esc(s.body)}</p><div class="row">${s.tool ? `<a class="btn soft sm" href="#/app/toolkit/${s.tool}">Try it</a>` : ''}<button class="chip" data-act="bookmark" data-id="${s.id}" aria-pressed="${!!S.bookmarks[s.id]}">${S.bookmarks[s.id] ? 'Saved' : 'Save'}</button><button class="chip" data-act="doneRec" data-id="${s.id}" aria-pressed="${!!S.done[s.id]}">${S.done[s.id] ? 'Done' : 'Mark done'}</button><button class="chip" data-act="recFb" data-id="${s.id}" data-v="1" aria-pressed="${S.recFeedback[s.id] === 1}" aria-label="Helpful">${ic('check')}</button><button class="chip" data-act="recFb" data-id="${s.id}" data-v="-1" aria-pressed="${S.recFeedback[s.id] === -1}" aria-label="Not helpful">No</button></div></div>`;
  return `${pageHead('Recommendations', latest ? `Based on your latest entry (${cap(latest.a.emotion.top)}, ${latest.a.stress.level} stress) and your trend.` : 'Write an entry to personalise these.')}
  ${r && r.crisis ? '<div class="card" style="border-left:4px solid var(--danger)"><b>Your latest entry suggested you may need urgent support.</b> <a href="#/app/safety">Open safety plan and helplines</a></div>' : ''}
  ${r && !r.crisis ? `<h2>For you now</h2><div class="grid g2">${r.suggestions.map(card).join('')}</div>${r.nudge ? `<p class="card tint" style="margin-top:1rem"><b>${esc(r.nudge)}</b> <a href="#/app/pros">Find a professional</a></p>` : ''}` : ''}
  <h2 style="margin-top:1.5rem">All ideas</h2><div class="grid g2">${MHC.SUGGESTIONS.map(card).join('')}</div>${disc()}`;
}

/* ------------------------------ professionals ------------------------------ */
function prosView() {
  return `${pageHead('Find a professional', 'Sample profiles for demonstration only.')}<div class="card" style="border-left:4px solid var(--brand)"><b>These are fictional sample profiles.</b> <span class="muted">No real professionals are listed and no request leaves your device. Use your local health services, a helpline, or a licensed professional to get real care.</span></div>
  <div class="grid g3" style="margin-top:1rem">${PROS.map(p => `<div class="card"><h3>${p.name}</h3><p class="small">${p.spec}</p><p class="small muted">Languages: ${p.langs.join(', ')}<br>Availability: ${p.avail}<br>Rating: ${p.rating} (sample)<br>${p.fee}</p><button class="btn sm" data-act="bookPro" data-id="${p.id}">Request appointment</button></div>`).join('')}</div>
  <div class="card" style="margin-top:1rem"><h3>Your appointment requests (demo)</h3>${S.appts.length ? `<div class="scroll"><table class="t"><thead><tr><th>With</th><th>When</th><th>Mode</th><th>Status</th><th></th></tr></thead><tbody>${S.appts.map(a => `<tr><td>${esc(a.name)}</td><td>${fmtDT(a.when)}</td><td>Video link placeholder</td><td>${cap(a.status)}</td><td>${a.status !== 'cancelled' ? `<button class="btn ghost sm" data-act="reschedAppt" data-id="${a.id}">Reschedule</button> <button class="btn ghost sm" data-act="cancelAppt" data-id="${a.id}">Cancel</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">None yet.</p>'}</div>${disc()}`;
}

/* ---------------------------------- safety ---------------------------------- */
function safetyView() {
  const p = S.plan; const ta = (k, l, h) => `<div class="field"><label for="sp_${k}">${l}</label><textarea id="sp_${k}" style="min-height:72px" placeholder="${h}" data-act-input="plan" data-k="${k}">${esc(p[k])}</textarea></div>`;
  return `${pageHead('Safety plan and emergency', 'Prepare now so it is easy to use later.', '<a class="btn danger" href="tel:112">' + ic('phone') + ' Call 112</a>')}
  <div class="stack"><div class="card" style="border-left:4px solid var(--danger)"><b>In immediate danger? Call your emergency number now.</b> <button class="btn danger sm" data-act="sos">Open emergency support</button> <a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/hospital+near+me">Find nearby hospitals (map link)</a></div>
  <div class="card"><h3>Emergency contacts</h3>${S.contacts.map(c => `<div class="entry row between" style="margin:.4rem 0"><span><b>${esc(c.name)}</b> (${esc(c.rel || 'contact')}) <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></span><span class="row"><label class="row small" style="font-weight:400;margin:0"><input type="checkbox" ${c.notify ? 'checked' : ''} data-act-input="notify" data-id="${c.id}"> Notify in crisis</label><button class="btn ghost sm" data-act="delContact" data-id="${c.id}">${ic('trash')}</button></span></div>`).join('') || '<p class="muted small">No contacts yet.</p>'}
   <div class="grid g3" style="margin-top:.6rem"><input id="cn" type="text" placeholder="Name" aria-label="Contact name"><input id="cr" type="text" placeholder="Relationship" aria-label="Relationship"><input id="cp" type="tel" placeholder="Phone" aria-label="Phone"></div><button class="btn sm" style="margin-top:.6rem" data-act="addContact">Add contact</button>
   <p class="small muted">In this standalone edition, contacts are saved on your device and are not notified automatically. The full project can send email or SMS with your consent.</p></div>
  <div class="card"><h3>My safety plan</h3>${ta('warning', 'Warning signs that I am struggling', 'One per line')}${ta('coping', 'Things I can do to cope on my own', 'One per line')}${ta('places', 'Safe places I can go', 'One per line')}${ta('people', 'People I can contact', 'Names and numbers')}${ta('pros', 'Professionals and helplines', 'Tele-MANAS 14416, KIRAN 1800-599-0019')}${ta('env', 'Making my environment safer', 'One per line')}
   <div class="row"><button class="btn" data-act="dlPlan">${ic('down')} Download plan</button><button class="btn ghost" data-act="print">Print</button></div></div>
  <div><h2>Helplines</h2>${helplinesPage(true)}</div></div>`;
}

/* ---------------------------------- privacy ---------------------------------- */
function privacyView() {
  const c = S.consents; const cb = (k, l) => `<label class="row" style="font-weight:400"><input type="checkbox" ${c[k] ? 'checked' : ''} data-act-input="consent" data-k="${k}"> ${l}</label>`;
  return `${pageHead('Privacy center', 'You control your data.')}<div class="stack">
  <div class="card tint"><b>Where your data lives.</b> Entries, chats and settings are stored only in this browser (local storage). Nothing is uploaded. It is not encrypted here, so avoid shared devices or clear it when done. ${storageOk ? '' : '<b>Your browser blocked storage, so data will be lost when you close this page.</b>'}</div>
  <div class="card"><h3>Consents</h3>${cb('data_use', 'Use my entries to show analysis and trends (needed for the app to work)')}${cb('share', 'Allow sharing with professionals I choose (full project feature; recorded here as your preference)')}${cb('research', 'Allow anonymised data for research (full project feature; nothing is sent from this edition)')}</div>
  <div class="card"><h3>Download my data</h3><div class="row"><button class="btn" data-act="exportJSON">${ic('down')} JSON</button><button class="btn ghost" data-act="exportCSV">${ic('down')} Entries as CSV</button></div></div>
  <div class="card"><h3>Access log</h3><p class="small muted">Actions taken on this device. No one else can view your data here.</p>${S.audit.length ? `<div class="scroll"><table class="t"><tbody>${S.audit.slice(0, 15).map(a => `<tr><td>${fmtDT(a.ts)}</td><td>${esc(a.action)}</td><td class="muted">${esc(a.meta)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nothing yet.</p>'}</div>
  <div class="card"><h3>Sample data</h3><button class="btn ghost" data-act="removeSamples">Remove sample entries</button></div>
  <div class="card" style="border-left:4px solid var(--danger)"><h3>Delete everything</h3><p class="small">Permanently removes all entries, chats, goals, plans and settings from this browser.</p><button class="btn danger" data-act="wipe">${ic('trash')} Delete all my data</button></div></div>`;
}

/* --------------------------------- settings --------------------------------- */
function settingsView() {
  const p = S.profile, r = S.reminders; const sel = (id, opts, cur) => `<select id="${id}" data-act-input="pref" data-k="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `${pageHead('Profile and settings')}<div class="stack"><div class="card"><div class="grid g2"><div class="field"><label for="name">Name</label><input id="name" type="text" value="${esc(p.name)}" data-act-input="pref" data-k="name"></div><div class="field"><label for="lang">Language</label>${sel('lang', [['en', 'English'], ['hi', 'हिन्दी (placeholder)'], ['te', 'తెలుగు (placeholder)']], p.lang)}</div>
  <div class="field"><label for="theme">Theme</label>${sel('theme', [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']], p.theme)}</div><div class="field"><label for="font">Text size</label>${sel('font', [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']], p.font)}</div></div>
  <label class="row" style="font-weight:400"><input type="checkbox" ${p.contrast ? 'checked' : ''} data-act-input="contrast"> High contrast</label><p class="small muted">Only navigation labels are translated for now; the rest is in English.</p></div>
  <div class="card"><h3>Reminders (preferences)</h3>${[['journal', 'Journal reminders'], ['appointment', 'Appointment reminders'], ['weekly', 'Weekly summary'], ['highStress', 'High-stress alerts']].map(([k, l]) => `<label class="row" style="font-weight:400"><input type="checkbox" ${r[k] ? 'checked' : ''} data-act-input="remind" data-k="${k}"> ${l}</label>`).join('')}<p class="small muted">Saved as preferences. Email, SMS and push delivery need the full project's back end.</p></div>
  <div class="card"><h3>Sessions and security</h3><p class="small muted">This edition has no accounts, passwords or two-factor login, because nothing leaves your device. Those features are part of the full project.</p></div></div>`;
}

/* ------------------------------- help + admin ------------------------------- */
function helpView() {
  return `${pageHead('Help and feedback')}<div class="stack"><div class="card">${faqHTML()}</div><div class="card"><h3>Send feedback</h3><div class="field"><label for="fbr">Rating</label><select id="fbr"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div class="field"><label for="fbc">Comment or issue</label><textarea id="fbc"></textarea></div><button class="btn" data-act="sendFeedback">Save feedback</button><p class="small muted">Saved on this device only. There is no server to receive it in this edition. ${S.feedback.length} saved.</p></div>${disc()}</div>`;
}
const CHECKS = [['I am under a lot of pressure and I am unable to sleep properly.', 'Negative, Anxiety, High'], ['I had a great day and felt really relaxed.', 'Positive, Joy, Low'], ['Work is annoying but manageable.', 'Neutral or Negative, Stress, Moderate'], ["I feel like I can't go on anymore.", 'Crisis flow']];
function adminView() {
  return `${pageHead('Admin tools (demo)', 'Tune the safety layer and check the engine.')}<div class="stack">
  <div class="card"><h3>Built-in checks</h3><div class="scroll"><table class="t"><thead><tr><th>Input</th><th>Expected</th><th>Result</th><th>Pass</th></tr></thead><tbody>${CHECKS.map(([t, exp]) => { const a = runAnalysis(t); const ok = t.includes("can't go on") ? a.risk.level === 'critical' : t.includes('pressure') ? a.sentiment.label === 'negative' && a.emotion.top === 'anxiety' && a.stress.level === 'high' : t.includes('great') ? a.sentiment.label === 'positive' && a.emotion.top === 'joy' && a.stress.level === 'low' : ['neutral', 'negative'].includes(a.sentiment.label) && a.emotion.top === 'stress' && a.stress.level === 'moderate'; return `<tr><td>${esc(t)}</td><td>${exp}</td><td>${a.risk.level !== 'none' ? 'Crisis: ' + a.risk.level : cap(a.sentiment.label) + ', ' + cap(a.emotion.top) + ', ' + cap(a.stress.level) + ' (' + Math.round(a.stress.score) + ')'}</td><td>${ok ? badge('positive', 'Pass') : badge('high', 'Fail')}</td></tr>`; }).join('')}</tbody></table></div></div>
  <div class="card"><h3>Test a phrase</h3><div class="row"><input id="tp" type="text" placeholder="Type a phrase" style="flex:1 1 220px" aria-label="Phrase to test"><button class="btn" data-act="testPhrase">Test</button></div><div id="tpOut" class="small" style="margin-top:.6rem"></div></div>
  <div class="card"><h3>Crisis keywords</h3><div class="scroll"><table class="t"><thead><tr><th>Phrase</th><th>Severity</th><th>Enabled</th><th></th></tr></thead><tbody>${S.keywords.map((k, i) => `<tr><td>${esc(k.phrase)}</td><td>${badge(k.severity)}</td><td><input type="checkbox" ${k.enabled !== false ? 'checked' : ''} aria-label="Enable ${esc(k.phrase)}" data-act-input="kwOn" data-i="${i}"></td><td><button class="btn ghost sm" data-act="kwDel" data-i="${i}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>
   <div class="row" style="margin-top:.6rem"><input id="kwp" type="text" placeholder="New phrase (write can not as cannot)" style="flex:1 1 220px" aria-label="New phrase"><select id="kws" style="width:auto" aria-label="Severity"><option value="critical">critical</option><option value="elevated">elevated</option></select><button class="btn" data-act="kwAdd">Add</button><button class="btn ghost" data-act="kwReset">Reset defaults</button></div></div>
  <div class="card"><h3>Stress bands</h3><div class="row"><label for="thl" style="margin:0">Low up to</label><input id="thl" type="number" min="5" max="90" value="${S.thresholds.lowMax}" style="width:90px"><label for="thm" style="margin:0">Moderate up to</label><input id="thm" type="number" min="10" max="95" value="${S.thresholds.modMax}" style="width:90px"><button class="btn" data-act="saveTh">Save bands</button></div><p class="small muted">Default 33 and 66. Changes apply to new entries.</p></div>
  <div class="card"><h3>Model information</h3><p class="small">Active engine: Lexicon and rules v1.0-demo (runs in your browser). The trained TF-IDF + Logistic Regression, DistilBERT and RoBERTa models, dataset upload, model comparison and rollback belong to the full-stack project.</p></div></div>`;
}

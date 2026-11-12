/* ============================== router, shell, actions ============================== */
const NAV = [['dashboard', 'home'], ['new', 'pen'], ['chat', 'chat'], ['journal', 'book'], ['tracker', 'chart'], ['toolkit', 'leaf'], ['assess', 'clip'], ['goals', 'target'], ['recs', 'bulb'], ['pros', 'users'], ['safety', 'shield'], ['privacy', 'lock'], ['settings', 'cog'], ['help', 'help'], ['admin', 'tool'], ['about', 'heart']];
const BOTTOM = [['dashboard', 'home'], ['new', 'pen'], ['chat', 'chat'], ['tracker', 'chart'], ['menu', 'more']];
let pendingAuto = false, obStep = 0, ob = { name: '', lang: 'en', share: false, research: false, accept: false, cn: '', cp: '' };

function applyPrefs() {
  const r = document.documentElement, p = S.profile;
  if (p.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  r.setAttribute('data-font', p.font); if (p.contrast) r.setAttribute('data-contrast', 'high'); else r.removeAttribute('data-contrast');
}
function appShell(parts) {
  const cur = parts[0] || 'dashboard';
  let content;
  switch (cur) {
    case 'dashboard': content = dashboard(); break; case 'new': content = newEntry(); break; case 'chat': content = chatView(); break;
    case 'journal': content = journalView(); break; case 'tracker': content = trackerView(); break; case 'toolkit': content = toolkitView(parts[1]); break;
    case 'assess': content = assessView(parts[1]); break; case 'goals': content = goalsView(); break; case 'recs': content = recsView(); break;
    case 'pros': content = prosView(); break; case 'safety': content = safetyView(); break; case 'privacy': content = privacyView(); break;
    case 'settings': content = settingsView(); break; case 'help': content = helpView(); break; case 'admin': content = adminView(); break;
    case 'about': content = aboutPage(true); break; case 'helplines': content = pageHead('Helplines') + helplinesPage(true); break;
    case 'menu': content = pageHead('More') + `<div class="grid g2">${NAV.map(([k, i]) => `<a class="card row" style="text-decoration:none;color:inherit" href="#/app/${k}">${ic(i)} <b>${T(k)}</b></a>`).join('')}</div>`; break;
    default: content = pageHead('Page not found') + emptyBox('That page does not exist.', '<a class="btn" href="#/app/dashboard">Go to dashboard</a>');
  }
  const link = (k, i, cls) => `<a class="${cls}" href="#/app/${k}" ${k === cur ? 'aria-current="page"' : ''}>${ic(i)}<span>${cls === 'nav' ? T(k) : (k === 'menu' ? T('more') : T(k).split(' ')[0])}</span></a>`;
  return `<a class="skip" href="#main-app" data-act="skip">Skip to content</a><div class="shell"><aside class="side" aria-label="Sidebar"><a class="brandmark" href="#/">${logo()} Companion</a><nav aria-label="App">${NAV.map(([k, i]) => link(k, i, 'nav')).join('')}</nav><p class="small" style="padding:.8rem;opacity:.8">${DISCLAIMER}</p></aside>
  <div><div class="mobtop"><a class="brandmark" href="#/">${logo()} Companion</a><a href="#/app/settings" style="color:#fff" aria-label="Settings">${ic('cog')}</a></div><main id="main-app" class="main" tabindex="-1">${content}<p class="small muted center" style="margin-top:2rem">${DISCLAIMER}</p></main></div></div>
  <nav class="bottom" aria-label="Quick">${BOTTOM.map(([k, i]) => link(k, i, '')).join('')}</nav>
  <button class="sos" data-act="sos">${ic('alert')} ${T('sos')}</button>`;
}
function route(keepScroll) {
  cleanups.splice(0).forEach(f => { try { f(); } catch (e) { } });
  const h = (location.hash || '#/').slice(1);
  if (h && !h.startsWith('/')) { const el = document.getElementById(h); if (el) { el.scrollIntoView(); return; } }
  const parts = h.split('/').filter(Boolean), y = window.scrollY, root = $('#app');
  let html, isApp = false;
  if (!parts.length) html = landing();
  else if (parts[0] === 'helplines') html = helplinesPage(false);
  else if (parts[0] === 'about') html = aboutPage(false);
  else if (parts[0] === 'app') { html = appShell(parts.slice(1)); isApp = true; }
  else html = landing();
  root.innerHTML = html; document.title = (isApp ? T(parts[1] || 'dashboard') + ' - ' : '') + 'Mental Health Companion';
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (isApp && !S.profile.onboarded && !['safety', 'menu'].includes(parts[1])) openOnboarding();   // never block the safety pages
  if (isApp && parts[1] === 'new' && pendingAuto) { pendingAuto = false; ACT.analyze(); }
  if (isApp && parts[1] === 'chat') { const l = $('#chatlog'); if (l) l.scrollTop = l.scrollHeight; }
}
const refresh = () => route(true);

/* -------------------------------- modals + overlay -------------------------------- */
function openModal(html) { closeModal(); const m = document.createElement('div'); m.id = 'modal'; m.className = 'modal-back'; m.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(m); const f = m.querySelector('button,input,select,textarea,a'); if (f) f.focus(); m.addEventListener('mousedown', e => { if (e.target === m && !m.dataset.locked) closeModal(); }); return m; }
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
function confirmBox(msg, okLabel, cb, danger) { openModal(`<h3>Please confirm</h3><p>${msg}</p><div class="row"><button class="btn ${danger ? 'danger' : ''}" data-act="confirmOk">${okLabel}</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`); ACT._ok = cb; }
function showEmergency(level, source, matched) {
  audit('crisis_support_shown', (level || 'elevated') + ' via ' + source);
  if (level && level !== 'none' && source !== 'button' && source !== 'phq9') { S.alerts = S.alerts || []; S.alerts.unshift({ id: uid(), ts: Date.now(), level, matched: matched || [], status: 'created', source }); save(); }
  const c = S.contacts.find(x => x.notify) || S.contacts[0];
  const o = document.createElement('div'); o.id = 'overlay'; o.className = 'emergency'; o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'emh');
  o.innerHTML = `<div class="in"><h1 id="emh">You are not alone. Help is available right now.</h1><p style="font-size:1.1rem">${source === 'button' ? 'If you are in danger or need to talk to someone, these lines are free and open now.' : "I'm really glad you shared this. What you wrote suggests you may be going through something very painful. Please reach out to someone now."}</p>
   <a class="callbtn" href="tel:112"><span>Emergency services<small>Immediate danger (India)</small></span><span class="num">112</span></a>
   <a class="callbtn" href="tel:14416"><span>Tele-MANAS<small>Free mental health support, 24x7</small></span><span class="num">14416</span></a>
   <a class="callbtn" href="tel:1800-599-0019"><span>KIRAN helpline<small>Mental health rehabilitation, 24x7</small></span><span class="num">1800-599-0019</span></a>
   ${c ? `<a class="btn navy" href="tel:${esc(c.phone)}">${ic('phone')} Contact my emergency contact (${esc(c.name)})</a>` : `<a class="btn navy" href="#/app/safety" data-act="closeOverlay">Add an emergency contact</a>`}
   <a class="btn navy" href="#/app/safety" data-act="closeOverlay">Open my safety plan</a><a class="btn outline" href="tel:14416">Talk to someone now</a>
   <p class="small" style="margin-top:1rem;opacity:.9">If you are outside India, see the <a style="color:#fff" href="#/app/safety" data-act="closeOverlay">helplines list</a>. Numbers should be verified before real-world use. ${DISCLAIMER}</p>
   <button class="btn outline" data-act="closeOverlay" style="margin-top:1rem">I am safe for now, take me back</button></div>`;
  const old = $('#overlay'); if (old) old.remove(); document.body.appendChild(o); o.scrollTop = 0; const f = o.querySelector('a'); if (f) f.focus();
}

/* --------------------------------- onboarding --------------------------------- */
function openOnboarding() {
  const m = openModal(obHTML()); m.dataset.locked = '1';
}
function obHTML() {
  const dots = `<p class="small muted">Step ${obStep + 1} of 3</p>`;
  if (obStep === 0) return `${dots}<h2>Welcome</h2><p>This is a private space to write about how you feel and notice patterns. It is not therapy and it cannot diagnose anything.</p>${disc()}<label class="row" style="font-weight:400;margin-top:.8rem"><input type="checkbox" id="obAccept" ${ob.accept ? 'checked' : ''} data-act-input="ob" data-k="accept"> I understand and accept this.</label><div class="row" style="margin-top:.8rem"><button class="btn" data-act="obNext">Continue</button><a class="btn ghost" href="#/">Back to home</a></div>`;
  if (obStep === 1) return `${dots}<h2>About you</h2><div class="field"><label for="obName">What should we call you?</label><input id="obName" type="text" value="${esc(ob.name)}" data-act-input="ob" data-k="name" maxlength="40"></div><div class="field"><label for="obLang">Language</label><select id="obLang" data-act-input="ob" data-k="lang"><option value="en">English</option><option value="hi" ${ob.lang === 'hi' ? 'selected' : ''}>हिन्दी (placeholder)</option><option value="te" ${ob.lang === 'te' ? 'selected' : ''}>తెలుగు (placeholder)</option></select></div>
   <p class="small muted">Your entries are used only to show analysis and trends, and stay in this browser.</p><label class="row" style="font-weight:400"><input type="checkbox" ${ob.share ? 'checked' : ''} data-act-input="ob" data-k="share"> I might share with a professional later (preference only)</label><label class="row" style="font-weight:400"><input type="checkbox" ${ob.research ? 'checked' : ''} data-act-input="ob" data-k="research"> Allow anonymised research use (preference only; nothing is sent)</label><div class="row" style="margin-top:.8rem"><button class="btn ghost" data-act="obBack">Back</button><button class="btn" data-act="obNext">Continue</button></div>`;
  return `${dots}<h2>Someone to call in a hard moment</h2><p class="small muted">Optional. This person's number will appear on your emergency screen.</p><div class="field"><label for="obCn">Name</label><input id="obCn" type="text" value="${esc(ob.cn)}" data-act-input="ob" data-k="cn"></div><div class="field"><label for="obCp">Phone</label><input id="obCp" type="tel" value="${esc(ob.cp)}" data-act-input="ob" data-k="cp"></div><div class="row"><button class="btn ghost" data-act="obBack">Back</button><button class="btn" data-act="obFinish">Finish</button></div>`;
}

/* ------------------------------------ helpers ------------------------------------ */
const csvCell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
function findEntry(id) { return S.entries.find(e => e.id === id); }
let breathTimer = null, medTimer = null, rec = null;
function stopBreath() { clearInterval(breathTimer); breathTimer = null; const b = $('#breath'); if (b) { b.classList.remove('big'); b.textContent = 'Ready'; } }

/* -------------------------------------- actions -------------------------------------- */
const ACT = {
  skip() { const m = $('#main-app'); if (m) { m.focus(); m.scrollIntoView(); } },
  closeModal, closeOverlay() { const o = $('#overlay'); if (o) o.remove(); },
  confirmOk() { const f = ACT._ok; closeModal(); if (f) f(); },
  sos() { showEmergency('elevated', 'button'); },
  /* onboarding */
  obNext() { if (obStep === 0 && !ob.accept) return toast('Please tick the box to continue.'); obStep++; $('#modal .modal').innerHTML = obHTML(); },
  obBack() { obStep = Math.max(0, obStep - 1); $('#modal .modal').innerHTML = obHTML(); },
  obFinish() {
    S.profile.name = ob.name.trim(); S.profile.lang = ob.lang; S.profile.onboarded = true; S.consents.share = ob.share; S.consents.research = ob.research;
    if (ob.cp.trim()) S.contacts.push({ id: uid(), name: ob.cn.trim() || 'Emergency contact', rel: '', phone: ob.cp.trim(), notify: true });
    audit('onboarding_completed'); save(); closeModal(); route();
  },
  /* landing demo */
  demoFill(el) { $('#demoText').value = el.dataset.t; },
  demoAnalyze() {
    const t = $('#demoText').value.trim(); if (!t) return toast('Type a sentence first.');
    if (guestCount >= 3) { $('#demoOut').innerHTML = '<b>You have used the 3 guest analyses.</b> <a href="#/app/dashboard">Get started</a> to keep going and save your entries.'; return; }
    guestCount++; try { sessionStorage.setItem('mhc.guest', guestCount); } catch (e) { }
    $('#demoLeft').textContent = Math.max(0, 3 - guestCount) + ' of 3 guest analyses left. Nothing is saved.';
    const a = MHC.analyze(t, { keywords: S.keywords, thresholds: S.thresholds });
    if (a.risk.level !== 'none') { showEmergency(a.risk.level, 'guest_demo', a.risk.matched); return; }
    const vals = [a.preprocessing.tokens.length + ' tokens', cap(a.sentiment.label) + ' ' + pct(a.sentiment.confidence), cap(a.emotion.top), cap(a.stress.level) + ' ' + Math.round(a.stress.score), 'Sign in to track'];
    const steps = $$('#pipe .step'); steps.forEach(s => { s.classList.remove('on'); s.querySelector('.v').innerHTML = '&nbsp;'; });
    $('#demoOut').textContent = 'Analyzing...';
    vals.forEach((v, i) => setTimeout(() => { if (!steps[i]) return; steps[i].classList.add('on'); steps[i].querySelector('.v').textContent = v; }, 260 * (i + 1)));
    setTimeout(() => { const r = MHC.respond(a, { direction: 'insufficient' }, ''); const o = $('#demoOut'); if (o) o.innerHTML = `<p style="margin:.2rem 0">${esc(r.empathy)}</p>${r.nudge ? `<p class="small" style="margin:.2rem 0"><b>${esc(r.nudge)}</b></p>` : ''}<p class="small muted" style="margin:.2rem 0">Estimate only, not a diagnosis. <a href="#/app/dashboard">Save entries and see trends</a></p>`; }, 260 * 6);
  },
  /* entries */
  quickAnalyze() { const t = $('#quick').value.trim(); if (t.length < 3) return toast('Write a few words first.'); draft = { text: t, tags: [], mood: 3, locked: false, result: null }; pendingAuto = true; location.hash = '#/app/new'; },
  loadSamples() { const n = generateSamples(); audit('sample_data_loaded', n + ' entries'); toast(n + ' sample entries added.'); refresh(); },
  removeSamples() { confirmBox('Remove all sample entries? Your own entries stay.', 'Remove samples', () => { S.entries = S.entries.filter(e => !e.demo); save(); toast('Sample entries removed.'); refresh(); }); },
  tag(el) { const t = el.dataset.t; draft.tags = draft.tags.includes(t) ? draft.tags.filter(x => x !== t) : draft.tags.concat(t); el.setAttribute('aria-pressed', draft.tags.includes(t)); },
  clearDraft() { draft = { text: '', tags: [], mood: 3, locked: false, result: null }; refresh(); },
  analyze() {
    const ta = $('#etext'); if (ta) draft.text = ta.value; const t = draft.text.trim(); if (t.length < 3) return toast('Write at least a few words to analyze.');
    const slot = $('#resultSlot'); if (slot) slot.innerHTML = '<div class="card"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:70%"></div></div>';
    setTimeout(() => {
      const a = runAnalysis(t, { tags: draft.tags, mood: draft.mood }); draft.result = a; draft.helpful = null;
      if (a.risk.level !== 'none') showEmergency(a.risk.level, 'entry', a.risk.matched);
      const s = $('#resultSlot'); if (s) { s.innerHTML = resultHTML(a, { text: t, actions: resultActions() }); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 300);
  },
  saveEntry() { if (!draft.result) return; S.entries.push(makeEntry(draft.text, draft.result, { mood: draft.mood, locked: draft.locked, tags: draft.tags, helpful: draft.helpful })); audit('entry_saved'); draft = { text: '', tags: [], mood: 3, locked: false, result: null }; toast('Entry saved.'); location.hash = '#/app/journal'; },
  editDraft() { const t = $('#etext'); if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); } },
  discard() { confirmBox('Discard this analysis? Your text stays in the box.', 'Discard', () => { draft.result = null; refresh(); }, true); },
  helpful(el) { draft.helpful = el.dataset.v === '1'; toast('Thanks. Your rating helps improve suggestions.'); },
  reportWrong() {
    const a = draft.result; if (!a) return;
    const sel = (id, opts, cur) => `<div class="field"><label for="${id}">${id === 'rw_s' ? 'Sentiment' : id === 'rw_e' ? 'Emotion' : 'Stress'} should be</label><select id="${id}">${opts.map(o => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    openModal(`<h3>Report a wrong prediction</h3><p class="small muted">Your text is not stored with this report, only the labels.</p>${sel('rw_s', ['positive', 'neutral', 'negative'], a.sentiment.label)}${sel('rw_e', MHC.EMOTIONS, a.emotion.top)}${sel('rw_t', ['low', 'moderate', 'high'], a.stress.level)}<div class="row"><button class="btn" data-act="rwSave">Save report</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`);
  },
  rwSave() { const a = draft.result; S.reviews.push({ ts: Date.now(), predicted: { s: a.sentiment.label, e: a.emotion.top, t: a.stress.level }, corrected: { s: $('#rw_s').value, e: $('#rw_e').value, t: $('#rw_t').value } }); save(); closeModal(); toast('Report saved on this device. Thank you.'); },
  voice(el) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast('Voice input is not supported in this browser.');
    if (rec) { rec.stop(); rec = null; el.innerHTML = ic('mic') + ' Voice input'; return; }
    rec = new SR(); rec.lang = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }[S.profile.lang] || 'en-IN'; rec.interimResults = false; rec.continuous = true;
    rec.onresult = ev => { const t = Array.from(ev.results).slice(ev.resultIndex).map(r => r[0].transcript).join(' '); const ta = $('#etext'); if (ta) { ta.value = (ta.value + ' ' + t).trim(); draft.text = ta.value; $('#cc').textContent = ta.value.length; } };
    rec.onerror = () => { toast('Voice input stopped.'); rec = null; el.innerHTML = ic('mic') + ' Voice input'; }; rec.onend = () => { rec = null; el.innerHTML = ic('mic') + ' Voice input'; };
    try { rec.start(); el.innerHTML = ic('mic') + ' Listening... tap to stop'; } catch (e) { rec = null; }
    onLeave(() => { if (rec) { try { rec.stop(); } catch (e) { } rec = null; } });
  },
  /* chat */
  chatSend() {
    const inp = $('#chatin'), t = inp.value.trim(); if (!t) return; inp.value = '';
    S.chats.push({ who: 'user', text: t, ts: Date.now() }); const a = runAnalysis(t);
    S.entries.push(makeEntry(t, a, { source: 'chat' }));
    const log = $('#chatlog'); log.innerHTML = S.chats.slice(-60).map(chatBubble).join('') + '<div class="msg bot typing" id="typing"><span></span><span></span><span></span></div>'; log.scrollTop = log.scrollHeight;
    if (a.risk.level !== 'none') showEmergency(a.risk.level, 'chat', a.risk.matched);
    setTimeout(() => {
      const reply = a.risk.level !== 'none' ? "I'm really glad you told me. You deserve support right now. I've put emergency numbers on your screen. Please call one, or reach someone you trust. I'm here with you." : botReply(a);
      S.chats.push({ who: 'bot', text: reply, ts: Date.now() }); save(); const l = $('#chatlog'); if (l) { l.innerHTML = S.chats.slice(-60).map(chatBubble).join(''); l.scrollTop = l.scrollHeight; }
    }, 750);
  },
  exportChat() { download('chat-export.txt', S.chats.map(m => `[${fmtDT(m.ts)}] ${m.who === 'user' ? 'You' : 'Companion'}: ${m.text}`).join('\n') || 'No messages.'); },
  clearChat() { confirmBox('Clear the whole chat history?', 'Clear chat', () => { S.chats = []; save(); refresh(); }, true); },
  /* journal */
  viewEntry(el) { const e = findEntry(el.dataset.id); if (!e || e.locked) return; const a = JSON.parse(JSON.stringify(e.a)); a.preprocessing.original = e.text; openModal(resultHTML(a, { text: e.text }) + '<div class="row" style="margin-top:.8rem"><button class="btn" data-act="closeModal">Close</button></div>'); },
  toggleLock(el) { const e = findEntry(el.dataset.id); e.locked = !e.locked; save(); $('#jlist').innerHTML = journalList(); },
  share(el) { const e = findEntry(el.dataset.id); e.shared = !e.shared; save(); audit(e.shared ? 'entry_marked_shared' : 'entry_unshared'); toast(e.shared ? 'Marked as shared (demo). Nothing was sent anywhere.' : 'Sharing turned off.'); $('#jlist').innerHTML = journalList(); },
  delEntry(el) { confirmBox('Delete this entry and its analysis? This cannot be undone.', 'Delete entry', () => { S.entries = S.entries.filter(e => e.id !== el.dataset.id); audit('entry_deleted'); save(); $('#jlist').innerHTML = journalList(); }, true); },
  page(el) { jf.page += +el.dataset.d; $('#jlist').innerHTML = journalList(); },
  exportCSV() { const rows = [['date', 'text', 'sentiment', 'emotion', 'stress_level', 'stress_score', 'tags'].join(',')].concat(S.entries.slice().sort((a, b) => a.ts - b.ts).map(e => [new Date(e.ts).toISOString(), e.locked ? '[locked]' : e.text, e.a.sentiment.label, e.a.emotion.top, e.a.stress.level, e.a.stress.score, e.tags.join('|')].map(csvCell).join(','))); download('journal.csv', rows.join('\n'), 'text/csv'); audit('export_csv'); },
  print() { window.print(); },
  /* toolkit */
  breath(el) {
    stopBreath(); const ph = el.dataset.m === '478' ? [['Breathe in', 4, true], ['Hold', 7, true], ['Breathe out', 8, false]] : [['Breathe in', 4, true], ['Hold', 4, true], ['Breathe out', 4, false], ['Hold', 4, false]];
    let i = 0, left = 0; const b = $('#breath'), hint = $('#breathHint'), reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => { if (left <= 0) { const p = ph[i % ph.length]; left = p[1]; b.style.transitionDuration = p[0] === 'Hold' ? '0.2s' : (reduce ? '0s' : p[1] + 's'); b.classList.toggle('big', p[2]); i++; } const p = ph[(i - 1) % ph.length]; b.textContent = p[0]; hint.textContent = left + ' seconds. Cycle ' + Math.ceil(i / ph.length) + '.'; left--; };
    tick(); breathTimer = setInterval(tick, 1000); onLeave(stopBreath);
  },
  breathStop() { stopBreath(); $('#breathHint').textContent = 'Stopped. Breathe normally.'; },
  medStart() { clearInterval(medTimer); let s = +$('#mins').value * 60; const show = () => { const el = $('#medtime'); if (el) el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }; show(); medTimer = setInterval(() => { s--; show(); if (s <= 0) { clearInterval(medTimer); toast('Session complete. Well done.'); } }, 1000); onLeave(() => clearInterval(medTimer)); },
  medStop() { clearInterval(medTimer); },
  addGrat() { const v = $('#grat').value.trim(); if (!v) return toast('Write one thing first.'); S.gratitude.push({ ts: Date.now(), text: v }); save(); refresh(); },
  saveCbt() { const o = { ts: Date.now() }; ['sit', 'thought', 'emo', 'for', 'against', 'balanced'].forEach(k => o[k] = $('#c_' + k).value); if (!o.thought.trim()) return toast('Add the thought first.'); S.thoughts.push(o); save(); toast('Thought record saved.'); refresh(); },
  affirm() { $('#aff').textContent = AFFIRM[Math.floor(Math.random() * AFFIRM.length)]; },
  saveCheckin() { S.checkins.push({ ts: Date.now(), mood: +$('#ci').value, note: $('#cin').value }); save(); toast('Check-in saved.'); refresh(); },
  /* assessments */
  submitQ(el) {
    const code = el.dataset.code, q = QUESTIONNAIRES[code], ans = q.items.map((_, i) => { const r = $(`input[name=q${i}]:checked`); return r ? +r.value : null; });
    if (ans.includes(null)) return toast('Please answer every question.');
    const r = scoreQ(code, ans); S.assess.push({ code, ts: Date.now(), score: r.score, band: r.band }); audit('assessment_completed', code); save();
    openModal(`<h2>${q.title}: ${r.score} of ${q.max}</h2><p>${badge(r.high ? 'high' : 'info', r.band)}</p><p>${r.high ? 'This score is in a range where talking to a psychologist or doctor is a good idea. This is a screening aid, not a diagnosis.' : 'This score is in a lower range. Screening aids are not diagnoses, and if you are worried, talking to a professional is always fine.'}</p>${disc()}<div class="row" style="margin-top:.8rem"><a class="btn" href="#/app/pros" data-act="closeModal">Find a professional</a><a class="btn ghost" href="#/app/assess" data-act="closeModal">Back to assessments</a></div>`);
    if (code === 'PHQ9' && ans[8] > 0) showEmergency('elevated', 'phq9');
  },
  /* goals */
  addGoal() { const t = $('#gt').value; if (S.goals.some(g => g.type === t)) return toast('You already track that goal.'); S.goals.push({ id: uid(), type: t, target: GOAL_DEF[t][0], unit: GOAL_DEF[t][1], log: {} }); save(); refresh(); },
  logGoal(el) { const g = S.goals.find(x => x.id === el.dataset.id), v = parseFloat($('#gv_' + g.id).value); if (isNaN(v) || v < 0) return toast('Enter a number.'); g.log[MHC.dayKey(Date.now())] = v; save(); refresh(); },
  delGoal(el) { confirmBox('Delete this goal and its history?', 'Delete goal', () => { S.goals = S.goals.filter(g => g.id !== el.dataset.id); save(); refresh(); }, true); },
  /* recommendations */
  bookmark(el) { const id = el.dataset.id; S.bookmarks[id] = !S.bookmarks[id]; save(); refresh(); },
  doneRec(el) { const id = el.dataset.id; S.done[id] = !S.done[id]; save(); refresh(); },
  recFb(el) { const id = el.dataset.id, v = +el.dataset.v; S.recFeedback[id] = S.recFeedback[id] === v ? 0 : v; save(); refresh(); },
  /* professionals */
  bookPro(el) { const p = PROS.find(x => x.id === el.dataset.id); openModal(`<h3>Request with ${p.name}</h3><p class="small muted">Sample profile. Saved on this device only.</p><div class="field"><label for="apw">Preferred date and time</label><input id="apw" type="datetime-local"></div><div class="row"><button class="btn" data-act="apSave" data-id="${p.id}">Save request</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`); },
  apSave(el) { const v = $('#apw').value; if (!v) return toast('Pick a date and time.'); const p = PROS.find(x => x.id === el.dataset.id); S.appts.push({ id: uid(), name: p.name, when: v, status: 'requested' }); save(); closeModal(); refresh(); },
  reschedAppt(el) { openModal(`<h3>Reschedule</h3><div class="field"><label for="apw">New date and time</label><input id="apw" type="datetime-local"></div><div class="row"><button class="btn" data-act="apRe" data-id="${el.dataset.id}">Save</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`); },
  apRe(el) { const v = $('#apw').value; if (!v) return toast('Pick a date and time.'); const a = S.appts.find(x => x.id === el.dataset.id); a.when = v; a.status = 'rescheduled'; save(); closeModal(); refresh(); },
  cancelAppt(el) { confirmBox('Cancel this appointment request?', 'Cancel request', () => { S.appts.find(x => x.id === el.dataset.id).status = 'cancelled'; save(); refresh(); }, true); },
  /* safety */
  addContact() { const n = $('#cn').value.trim(), p = $('#cp').value.trim(); if (!n || !p) return toast('Add a name and a phone number.'); S.contacts.push({ id: uid(), name: n, rel: $('#cr').value.trim(), phone: p, notify: false }); save(); refresh(); },
  delContact(el) { confirmBox('Remove this contact?', 'Remove', () => { S.contacts = S.contacts.filter(c => c.id !== el.dataset.id); save(); refresh(); }, true); },
  dlPlan() { const p = S.plan; const sec = (t, v) => `${t}\n${(v || '(not filled in yet)').trim()}\n`; download('my-safety-plan.txt', ['MY SAFETY PLAN', '', sec('Warning signs', p.warning), sec('Ways I can cope', p.coping), sec('Safe places', p.places), sec('People I can contact', p.people), sec('Professionals and helplines', p.pros), sec('Making my environment safer', p.env), 'Emergency contacts:', ...S.contacts.map(c => `- ${c.name}: ${c.phone}`), '', 'India: Emergency 112, Tele-MANAS 14416, KIRAN 1800-599-0019', '', DISCLAIMER].join('\n')); },
  /* privacy */
  exportJSON() { download('my-data.json', JSON.stringify(S, null, 2), 'application/json'); audit('export_json'); },
  wipe() { confirmBox('This permanently deletes everything stored by this app in this browser. There is no undo.', 'Delete everything', () => { try { localStorage.removeItem(KEY); } catch (e) { } S = defaults(); draft = { text: '', tags: [], mood: 3, locked: false, result: null }; obStep = 0; applyPrefs(); toast('All data deleted.'); location.hash = '#/'; route(); }, true); },
  sendFeedback() { const c = $('#fbc').value.trim(); S.feedback.push({ ts: Date.now(), rating: +$('#fbr').value, comment: c }); save(); toast('Feedback saved on this device.'); $('#fbc').value = ''; },
  /* admin */
  testPhrase() {
    const t = $('#tp').value; if (!t.trim()) return; const a = runAnalysis(t);
    $('#tpOut').innerHTML = `<p>Risk: ${badge(a.risk.level === 'none' ? 'positive' : a.risk.level, cap(a.risk.level))} ${a.risk.matched.length ? 'matched: ' + a.risk.matched.map(esc).join(', ') : ''}</p><p>${cap(a.sentiment.label)}, ${cap(a.emotion.top)}, ${cap(a.stress.level)} stress (${Math.round(a.stress.score)})</p>`;
  },
  kwDel(el) { S.keywords.splice(+el.dataset.i, 1); save(); refresh(); },
  kwAdd() { const p = $('#kwp').value.trim().toLowerCase().replace(/'/g, '').replace(/\bcan not\b/g, 'cannot'); if (!p) return; if (S.keywords.some(k => k.phrase === p)) return toast('Already in the list.'); S.keywords.push({ phrase: p, severity: $('#kws').value, enabled: true }); audit('crisis_keyword_added'); save(); refresh(); },
  kwReset() { confirmBox('Restore the default crisis keyword list?', 'Restore', () => { S.keywords = MHC.DEFAULT_CRISIS.map(k => Object.assign({}, k)); save(); refresh(); }); },
  saveTh() { const l = +$('#thl').value, m = +$('#thm').value; if (!(l >= 5 && m > l && m <= 95)) return toast('Low must be lower than moderate (5 to 95).'); S.thresholds = { lowMax: l, modMax: m }; audit('thresholds_changed', l + '/' + m); save(); toast('Stress bands saved.'); }
};

/* ------------------------------------ inputs ------------------------------------ */
const INP = {
  draftText(el) { draft.text = el.value; $('#cc').textContent = el.value.length; },
  mood(el) { draft.mood = +el.value; $('#moodEmoji').textContent = MOODS[draft.mood - 1]; el.setAttribute('aria-valuetext', el.value + ' of 5'); },
  lock(el) { draft.locked = el.checked; },
  ob(el) { ob[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; },
  jf(el) { jf[el.dataset.k] = el.value; jf.page = 1; $('#jlist').innerHTML = journalList(); },
  range(el) { trRange = +el.value; refresh(); },
  ciMood(el) { $('#ciEmoji').textContent = MOODS[+el.value - 1]; },
  goalRemind(el) { S.goals.find(g => g.id === el.dataset.id).remind = el.checked; save(); },
  notify(el) { S.contacts.find(c => c.id === el.dataset.id).notify = el.checked; save(); },
  plan(el) { S.plan[el.dataset.k] = el.value; save(); },
  consent(el) { S.consents[el.dataset.k] = el.checked; audit('consent_changed', el.dataset.k + '=' + el.checked); save(); },
  pref(el) { S.profile[el.dataset.k] = el.value; save(); applyPrefs(); if (el.dataset.k !== 'name') refresh(); },
  contrast(el) { S.profile.contrast = el.checked; save(); applyPrefs(); },
  remind(el) { S.reminders[el.dataset.k] = el.checked; save(); },
  kwOn(el) { S.keywords[+el.dataset.i].enabled = el.checked; save(); },
  helpSearch(el) { const q = el.value.toLowerCase(); $$('#htable tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'); }
};

document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (!f) return; if (el.dataset.act === 'skip') e.preventDefault(); f(el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-act-input]'); if (!el) return; const f = INP[el.dataset.actInput]; if (f) f(el, e); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const m = $('#modal'); if (m && !m.dataset.locked) closeModal(); else if ($('#overlay')) ACT.closeOverlay(); }
  if (e.key === 'Enter' && e.target.id === 'chatin') ACT.chatSend();
});
window.addEventListener('hashchange', () => route());
applyPrefs(); route();

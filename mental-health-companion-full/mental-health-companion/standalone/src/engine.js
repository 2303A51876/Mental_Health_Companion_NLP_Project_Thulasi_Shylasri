/* Mental Health Companion - in-browser NLP engine (lexicon + rules).
 * Pipeline: text -> preprocess -> safety layer -> sentiment -> emotion -> stress -> explain.
 * This is a transparent demo engine, NOT the trained TF-IDF/DistilBERT/RoBERTa models of the full stack.
 * It never diagnoses. Works in the browser (global MHC) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';

  /* ------------------------------ preprocessing ------------------------------ */
  const EMOJI = {
    '😢': 'crying', '😭': 'sobbing', '😞': 'sad', '😔': 'sad', '☹': 'sad', '🙁': 'sad', '😟': 'worried', '😰': 'anxious',
    '😨': 'scared', '😱': 'scared', '😡': 'angry', '😠': 'angry', '🤬': 'furious', '😊': 'happy', '😄': 'happy', '😁': 'happy',
    '🙂': 'happy', '😀': 'happy', '😍': 'love', '❤': 'love', '😴': 'sleepy', '😩': 'exhausted', '😫': 'exhausted',
    '😌': 'relaxed', '🥰': 'love', '😅': 'nervous', '😬': 'nervous', '😐': 'neutral', '💔': 'heartbroken'
  };
  const CONTRACTIONS = {
    "can't": 'cannot', 'cant': 'cannot', "won't": 'will not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
    "hasn't": 'has not', "hadn't": 'had not', "shouldn't": 'should not', "wouldn't": 'would not', "couldn't": 'could not',
    "i'm": 'i am', "i've": 'i have', "i'll": 'i will', "i'd": 'i would', "it's": 'it is', "that's": 'that is',
    "there's": 'there is', "they're": 'they are', "we're": 'we are', "you're": 'you are', "let's": 'let us', "y'all": 'you all'
  };
  const SLANG = {
    idk: 'i do not know', tbh: 'to be honest', rn: 'right now', omg: 'oh my god', ngl: 'not going to lie', imo: 'in my opinion',
    btw: 'by the way', thx: 'thanks', ty: 'thanks', pls: 'please', plz: 'please', u: 'you', ur: 'your', cuz: 'because',
    bc: 'because', gonna: 'going to', wanna: 'want to', gotta: 'have to', nvm: 'never mind', smh: 'shaking my head',
    ikr: 'i know right', tho: 'though', idc: 'i do not care', ofc: 'of course', sm: 'so much', lowkey: 'somewhat',
    kinda: 'kind of', sorta: 'sort of', dunno: 'do not know', lil: 'little', bff: 'best friend', wfh: 'work from home'
  };
  const SPELL = {
    definately: 'definitely', alot: 'a lot', 'stresed': 'stressed', 'stressd': 'stressed', 'anxios': 'anxious', 'anixety': 'anxiety',
    'depresed': 'depressed', 'exausted': 'exhausted', 'tierd': 'tired', 'overwelmed': 'overwhelmed', 'overwhlemed': 'overwhelmed',
    'worryed': 'worried', 'sleeep': 'sleep', 'sleap': 'sleep', 'pressue': 'pressure', 'presure': 'pressure', 'hapy': 'happy',
    'frustated': 'frustrated', 'excited': 'excited', 'lonley': 'lonely', 'nervouse': 'nervous', 'realy': 'really', 'becuase': 'because',
    'teh': 'the', 'recieve': 'receive', 'thier': 'their', 'wich': 'which', 'proparly': 'properly', 'properley': 'properly'
  };
  const NEGATIONS = new Set(['not', 'no', 'never', 'nor', 'cannot', 'without', 'neither', "n't", 'nobody', 'nothing', 'none', 'hardly', 'barely']);
  const STOP = new Set(('a an the and or of to in on at by for with about against between into through during before after above below from up down ' +
    'out off over under again further then once here there when where why how all any both each few more most other some such own same so than too very ' +
    'can will just should now i me my myself we our ours you your yours he him his she her hers it its they them their what which who whom this that these ' +
    'those am is are was were be been being have has had having do does did doing would could might must shall may also ok okay really quite rather still ' +
    'even much many get got getting go going one').split(' '));
  // Words that carry meaning for us even though they are in classic stopword lists
  const KEEP = new Set(['up', 'down', 'out', 'over', 'under', 'off', 'very', 'so', 'too', 'more', 'most', 'all', 'only', 'again', 'still', 'much', 'really', 'quite', 'rather', 'just']);
  STOP.forEach(w => { if (KEEP.has(w) && !['just', 'ok', 'okay', 'also'].includes(w)) STOP.delete(w); });
  ['i', 'me', 'my', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'it', 'its', 'this', 'that', 'we', 'you', 'he', 'she', 'they', 'them', 'their', 'what', 'which', 'who', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'here', 'there', 'when', 'where', 'why', 'how', 'can', 'will', 'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'go', 'going', 'get', 'got', 'one', 'now', 'then', 'own', 'same', 'some', 'such', 'than', 'other', 'any', 'each', 'few', 'both', 'once', 'further', 'against', 'between', 'above', 'below', 'our', 'ours', 'your', 'yours', 'him', 'his', 'her', 'hers', 'myself', 'these', 'those', 'whom', 'being', 'having', 'doing', 'getting', 'also', 'ok', 'okay', 'just'].forEach(w => STOP.add(w));

  const IRREGULAR = { slept: 'sleep', sleeping: 'sleep', ate: 'eat', felt: 'feel', feeling: 'feel', feels: 'feel', was: 'be', were: 'be', ran: 'run', went: 'go', thought: 'think', lost: 'lose', broke: 'break', cried: 'cry', crying: 'cry', tired: 'tired', worse: 'bad', better: 'good', best: 'good', worst: 'bad', children: 'child', people: 'person', kept: 'keep', left: 'leave', woke: 'wake', wrote: 'write', said: 'say' };

  function collapseRepeats(word, known) {
    if (!/(.)\1{2,}/.test(word)) return word;
    const two = word.replace(/(.)\1{2,}/g, '$1$1');
    const one = word.replace(/(.)\1+/g, '$1');
    if (known && known.has(two)) return two;
    if (known && known.has(one)) return one;
    return two;
  }

  let VOCAB = null; // set after lexicons are built (used by lemmatizer / repeat normaliser)

  function lemma(w) {
    if (IRREGULAR[w]) return IRREGULAR[w];
    if (!VOCAB || VOCAB.has(w)) return w;
    const c = [];
    if (w.endsWith('ies')) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) c.push(w.slice(0, -2));
    if (w.endsWith('s')) c.push(w.slice(0, -1));
    if (w.endsWith('ed')) { c.push(w.slice(0, -2)); c.push(w.slice(0, -1)); const b = w.slice(0, -2); if (/(.)\1$/.test(b)) c.push(b.slice(0, -1)); }
    if (w.endsWith('ing')) { const b = w.slice(0, -3); c.push(b); c.push(b + 'e'); if (/(.)\1$/.test(b)) c.push(b.slice(0, -1)); }
    if (w.endsWith('ly')) c.push(w.slice(0, -2));
    if (w.endsWith('ness')) c.push(w.slice(0, -4));
    if (w.endsWith('er')) c.push(w.slice(0, -2));
    for (const x of c) if (VOCAB.has(x)) return x;
    return w;
  }

  /** opts: {stripPunct:true, stripNumbers:true, removeStop:true} -> {original, normalized, cleaned, tokens, surfaces} */
  function preprocess(text, opts) {
    const o = Object.assign({ stripPunct: true, stripNumbers: true, removeStop: true }, opts || {});
    const original = String(text == null ? '' : text);
    let t = original.toLowerCase();
    t = t.replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+|www\.\S+/g, ' ').replace(/@\w+/g, ' ');
    t = t.replace(/[\u2018\u2019\u02BC`´]/g, "'");
    // emoji -> words (also strips variation selectors)
    t = t.replace(/\uFE0F/g, '');
    t = Array.from(t).map(ch => (EMOJI[ch] ? ' ' + EMOJI[ch] + ' ' : ch)).join('');
    // slang and contractions (word-level so we do not touch substrings)
    t = t.replace(/[a-z']+/g, w => {
      if (CONTRACTIONS[w]) return CONTRACTIONS[w];
      if (SLANG[w]) return SLANG[w];
      if (/n't$/.test(w)) return w.slice(0, -3) + ' not';
      if (/'m$/.test(w)) return w.slice(0, -2) + ' am';
      if (/'re$/.test(w)) return w.slice(0, -3) + ' are';
      if (/'ve$/.test(w)) return w.slice(0, -3) + ' have';
      if (/'ll$/.test(w)) return w.slice(0, -3) + ' will';
      if (/'d$/.test(w)) return w.slice(0, -2) + ' would';
      if (/'s$/.test(w)) return w.slice(0, -2);
      return w;
    });
    if (o.stripNumbers) t = t.replace(/\d+/g, ' ');
    if (o.stripPunct) t = t.replace(/[^a-z\s]/g, ' ');
    const words = t.split(/\s+/).filter(Boolean).map(w => SPELL[w] || collapseRepeats(w, VOCAB)).map(w => SPELL[w] || w);
    const normalized = words.join(' ');
    const tokens = [], surfaces = [];
    for (const w of words) {
      if (o.removeStop && STOP.has(w) && !NEGATIONS.has(w)) continue;
      tokens.push(lemma(w)); surfaces.push(w);
    }
    return { original, normalized, cleaned: tokens.join(' '), tokens, surfaces, words };
  }

  /* --------------------------------- lexicons -------------------------------- */
  // term: [valence(-3..3), {emotion: weight}, stressLoad]
  const L = {};
  function add(words, val, emo, stress) { words.split(' ').forEach(w => { L[w] = [val, emo || {}, stress || 0]; }); }
  // anxiety
  add('anxious anxiety nervous worried worry uneasy apprehensive jittery restless tense panicky overthinking dread', -2, { anxiety: 2 }, 1.5);
  add('panic', -2.5, { anxiety: 2.4, fear: 0.6 }, 2);
  add('overthink racing', -1.5, { anxiety: 1.8 }, 1.2);
  add('worries worrying', -2, { anxiety: 2 }, 1.5);
  // fear
  add('scared afraid frightened terrified fear fearful scary petrified', -2.5, { fear: 2.4, anxiety: 0.6 }, 1.6);
  add('dread', -2, { fear: 1.5, anxiety: 1 }, 1.5);
  // sadness
  add('sad unhappy down low miserable gloomy depressed heartbroken lonely alone empty numb hopeless crying sobbing cry tearful grief grieving lost', -2, { sadness: 2 }, 0.8);
  add('depress', -2.5, { sadness: 2.4 }, 1);
  add('isolated', -2, { sadness: 1.6, anxiety: 0.6 }, 1.2);
  add('miss missing', -1, { sadness: 1.2 }, 0.4);
  add('disappointed disappointing let-down failure failed fail', -2, { sadness: 1.4, stress: 0.6 }, 1.2);
  add('tired exhausted drained fatigued burnt burned worn sleepy', -1.5, { sadness: 0.7, stress: 1.0 }, 1.2);
  add('exhaust', -1.8, { stress: 1.2, sadness: 0.6 }, 1.3);
  add('worthless useless burden', -3, { sadness: 2.4 }, 1.5);
  // anger
  add('angry furious mad irritated irritating annoyed annoying annoy frustrated frustrating frustration rage resentful hate hated hating', -2, { anger: 2 }, 1);
  add('annoying annoyed annoy irritated irritating', -1.5, { anger: 1.2, stress: 1.0 }, 1.5);
  add('furious rage hate', -2.8, { anger: 2.6 }, 1.3);
  // stress
  add('stress stressed stressful overwhelmed overwhelming overwhelm swamped burnout pressured', -2.2, { stress: 2.2, anxiety: 0.5 }, 2.2);
  add('pressure', -1.8, { stress: 1.8, anxiety: 1.0 }, 2.2);
  add('deadline deadlines workload exams exam backlog backlogs', -1, { stress: 1.4, anxiety: 0.4 }, 1.6);
  add('busy hectic', -0.8, { stress: 1.2 }, 1.2);
  add('work', 0, { stress: 0.5 }, 1.0);
  add('boss manager assignment project meeting meetings', 0, { stress: 0.4 }, 0.5);
  add('pile piling', -1, { stress: 1.2 }, 1.2);
  add('manage manageable', 0.4, { stress: 0.5 }, 0);
  add('struggle struggling', -1.8, { stress: 1.4, sadness: 0.6, anxiety: 0.4 }, 1.6);
  add('tension tight', -1.2, { stress: 1.1, anxiety: 0.5 }, 1.2);
  add('headache headaches', -1, { stress: 0.8 }, 0.8);
  add('money debt rent bills expenses financial', -0.3, { stress: 0.8, anxiety: 0.3 }, 1.2);
  add('difficult hard tough rough', -1.2, { stress: 0.8, sadness: 0.3 }, 0.9);
  add('bad terrible awful horrible worse worst', -2.2, { sadness: 0.8, stress: 0.5 }, 1);
  add('upset', -1.8, { sadness: 1.2, anger: 0.6 }, 1);
  // joy / positive
  add('happy joy joyful glad delighted cheerful thrilled excited wonderful fantastic amazing awesome great good lovely love loved enjoy enjoyed enjoying', 2, { joy: 2 }, -1);
  add('good', 1.2, { joy: 1.1 }, -0.6);
  add('great fantastic amazing awesome wonderful', 2.4, { joy: 2.2 }, -1.2);
  add('relaxed calm peaceful relaxing relax content comfortable serene rested refreshed', 1.8, { joy: 1.5 }, -1.8);
  add('proud confident motivated energized hopeful optimistic grateful thankful blessed accomplished', 2, { joy: 1.8 }, -1.2);
  add('fun laugh laughed smile smiled smiling', 1.8, { joy: 1.8 }, -1);
  add('better improved improving progress', 1, { joy: 0.9 }, -0.8);
  add('safe supported loved', 1.8, { joy: 1.3 }, -1);
  add('fine okay alright', 0.3, { neutral: 0.6 }, 0);
  add('normal ordinary routine regular usual', 0, { neutral: 1.2 }, -0.2);
  add('nothing special', 0, { neutral: 0.6 }, 0);

  // sleep-problem phrases and other multi-word patterns: [regex, valence, emo, stress, label]
  const PATTERNS = [
    [/\b(unable|cannot|can not|not able|struggl\w*|trouble|difficulty|hard|hardly|barely)( to)? (fall )?(sleep|asleep)\b/, -2, { anxiety: 2.3, stress: 0.8 }, 2.4, 'sleep trouble'],
    [/\bnot (sleep|sleeping) (well|properly|enough)\b/, -1.8, { anxiety: 1.8, stress: 0.8 }, 2.0, 'poor sleep'],
    [/\b(insomnia|sleepless|no sleep|awake all night)\b/, -2, { anxiety: 2.0, stress: 0.8 }, 2.2, 'insomnia'],
    [/\b(unable|cannot|can not|not able|struggl\w*|trouble|difficulty) (to )?(relax|focus|concentrate|breathe|switch off|stop worrying)\b/, -2, { anxiety: 1.8, stress: 1.0 }, 2.0, 'cannot relax/focus'],
    [/\blot of (pressure|stress|work|things|responsibilit\w+)\b/, -1.2, { stress: 1.4 }, 1.6, 'heavy load'],
    [/\btoo much (to do|work|pressure|stress|on my plate)\b/, -1.5, { stress: 1.6 }, 2.0, 'too much'],
    [/\b(heart (is )?racing|racing thoughts|mind (is )?racing)\b/, -2, { anxiety: 2.2 }, 1.8, 'racing'],
    [/\bon edge\b/, -1.8, { anxiety: 1.8 }, 1.6, 'on edge'],
    [/\b(lost|no) (interest|motivation)\b/, -2, { sadness: 1.8 }, 1.2, 'low motivation'],
    [/\bcannot (stop|handle|cope|take)\b/, -2, { stress: 1.4, anxiety: 0.8 }, 2.0, 'cannot cope'],
    [/\b(feel|feeling) (like )?(a )?failure\b/, -2.4, { sadness: 2 }, 1.4, 'failure']
  ];

  const INTENSIFIERS = { very: 1.4, really: 1.35, so: 1.35, extremely: 1.7, totally: 1.4, completely: 1.5, super: 1.4, incredibly: 1.6, too: 1.3, constantly: 1.4, always: 1.25, terribly: 1.5, absolutely: 1.5, deeply: 1.5, severe: 1.5, severely: 1.6, lot: 1.15 };
  const DIMINISHERS = { slightly: 0.6, bit: 0.65, somewhat: 0.7, little: 0.65, kind: 0.8, mildly: 0.6, barely: 0.5 };

  VOCAB = new Set(Object.keys(L));
  ['sleep', 'work', 'pressure', 'day', 'feel', 'think', 'eat', 'home', 'family', 'friend', 'time', 'life', 'go', 'good', 'bad', 'people', 'talk', 'walk', 'call'].forEach(w => VOCAB.add(w));

  /* ------------------------------- crisis layer ------------------------------ */
  const DEFAULT_CRISIS = [
    ['kill myself', 'critical'], ['want to die', 'critical'], ['wish i was dead', 'critical'], ['wish i were dead', 'critical'], ['end my life', 'critical'], ['ending my life', 'critical'],
    ['suicide', 'critical'], ['suicidal', 'critical'], ['take my own life', 'critical'], ['cannot go on', 'critical'], ['can not go on', 'critical'],
    ['better off dead', 'critical'], ['no reason to live', 'critical'], ['do not want to be here anymore', 'critical'], ['do not want to live', 'critical'],
    ['hurt myself', 'critical'], ['harm myself', 'critical'], ['self harm', 'critical'], ['cut myself', 'critical'], ['overdose', 'critical'], ['end it all', 'critical'],
    ['hopeless', 'elevated'], ['no way out', 'elevated'], ['cannot take it anymore', 'elevated'], ['worthless', 'elevated'], ['nobody cares', 'elevated'],
    ['give up on everything', 'elevated'], ['being abused', 'elevated'], ['hits me', 'elevated'], ['afraid for my safety', 'elevated'],
    ['want to hurt someone', 'elevated'], ['panic attack', 'elevated'], ['cannot breathe', 'elevated'], ['no point in living', 'critical'], ['everyone would be better off without me', 'critical']
  ].map(([phrase, severity]) => ({ phrase, severity, enabled: true }));

  /** keywords: [{phrase, severity, enabled}] (admin-editable). Rule layer + lightweight distress heuristic. */
  function detectRisk(text, keywords, sentiment) {
    const pre = preprocess(text, { stripPunct: true, stripNumbers: true, removeStop: false });
    const hay = ' ' + pre.normalized.replace(/\bcan not\b/g, 'cannot') + ' ';
    const matches = [];
    (keywords || DEFAULT_CRISIS).forEach(k => {
      if (k.enabled === false) return;
      const p = ' ' + String(k.phrase).toLowerCase().trim().replace(/'/g, '').replace(/\s+/g, ' ') + ' ';
      const alt = p.replace('cannot', 'can not');
      if (hay.includes(p) || hay.includes(alt) || hay.includes(p.replace(/ /g, ' ').replace(/^ (\w+)ing /, ' $1 '))) matches.push(k);
    });
    let level = 'none';
    if (matches.some(m => m.severity === 'critical')) level = 'critical';
    else if (matches.length) level = 'elevated';
    // heuristic "model" layer: several severe-distress words together with strongly negative sentiment
    let heuristic = 0;
    const severe = ['hopeless', 'trapped', 'burden', 'unbearable', 'empty', 'numb', 'worthless', 'alone', 'exhausted', 'pointless', 'giving up', 'give up'];
    severe.forEach(w => { if (hay.includes(' ' + w + ' ')) heuristic += 1; });
    if (level === 'none' && heuristic >= 3 && (sentiment == null || sentiment < -0.3)) level = 'elevated';
    return { level, matched: matches.map(m => m.phrase), heuristic };
  }

  /* ------------------------------- core analysis ----------------------------- */
  const EMOTIONS = ['anxiety', 'sadness', 'anger', 'fear', 'joy', 'stress', 'neutral'];

  function analyze(text, opts) {
    const o = Object.assign({ keywords: null, thresholds: { lowMax: 33, modMax: 66 }, mood: null, tags: [] }, opts || {});
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const pre = preprocess(text);
    const words = pre.words;
    const contrib = []; // {word, weight, kind}
    let valSum = 0, stressLoad = 0, hits = 0, pos = 0, neg = 0;
    const emo = {}; EMOTIONS.forEach(e => emo[e] = 0);
    const seenPattern = [];
    const butIdx = words.indexOf('but');

    // multi-word patterns first (on normalized text)
    PATTERNS.forEach(([re, v, em, s, label]) => {
      const m = pre.normalized.match(re);
      if (m) {
        valSum += v; stressLoad += s; hits++; v < 0 ? neg++ : pos++;
        Object.keys(em).forEach(k => emo[k] += em[k]);
        seenPattern.push(label);
        m[0].split(' ').filter(w => !STOP.has(w) || NEGATIONS.has(w)).forEach(w => contrib.push({ word: w, weight: v / 3, kind: 'phrase:' + label, stress: s / m[0].split(' ').length }));
      }
    });
    const patternWords = new Set(); seenPattern.length && PATTERNS.forEach(([re]) => { const m = pre.normalized.match(re); if (m) m[0].split(' ').forEach(w => patternWords.add(w)); });

    words.forEach((w, i) => {
      const base = lemma(w);
      const e = L[base] || L[w];
      if (!e || patternWords.has(w)) return;
      let [v, em, s] = e;
      // context window: negations and modifiers within 3 tokens before
      let neg3 = false, mult = 1;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        const p = words[j];
        if (NEGATIONS.has(p)) neg3 = true;
        if (INTENSIFIERS[p]) mult *= INTENSIFIERS[p];
        if (DIMINISHERS[p]) mult *= DIMINISHERS[p];
      }
      if (i >= 2 && words[i - 1] === 'of' && words[i - 2] === 'lot') mult *= 1.15;
      // clause weighting around "but" (valence + emotion only; stress load is not down-weighted)
      const bf = butIdx >= 0 ? (i < butIdx ? 0.7 : 1.3) : 1;
      let ev = v * mult * bf, es = s * mult; const eemo = {};
      Object.keys(em).forEach(k => eemo[k] = em[k] * mult * bf);
      if (neg3) {
        ev = -ev * 0.75; es = -es * 0.6;
        const flipped = {};
        Object.keys(eemo).forEach(k => {
          if (k === 'joy') { flipped.sadness = (flipped.sadness || 0) + eemo[k] * 0.8; }
          else if (k === 'neutral') { flipped.neutral = eemo[k]; }
          else { flipped.neutral = (flipped.neutral || 0) + eemo[k] * 0.4; }
        });
        Object.keys(eemo).forEach(k => delete eemo[k]); Object.assign(eemo, flipped);
      }
      valSum += ev; stressLoad += es; hits++; ev < 0 ? neg++ : (ev > 0 ? pos++ : 0);
      Object.keys(eemo).forEach(k => emo[k] += eemo[k]);
      contrib.push({ word: w, weight: ev / 3 || (es ? -es / 6 : 0), kind: neg3 ? 'negated' : 'lexicon', stress: es });
    });

    // ---- sentiment
    const norm = hits ? valSum / Math.sqrt(hits + 1) : 0;         // roughly -3..3
    let sentiment, sConf;
    const mixed = pos > 0 && neg > 0;
    if (norm > 0.7 && !(mixed && norm < 1.2)) sentiment = 'positive';
    else if (norm < -0.55 && !(mixed && norm > -0.8)) sentiment = 'negative';
    else sentiment = 'neutral';
    if (mixed && Math.abs(norm) < 1.1) sentiment = 'neutral';
    if (!hits) sentiment = 'neutral';
    sConf = 0.5 + 0.47 * Math.tanh(Math.abs(norm) / 1.6);
    if (sentiment === 'neutral') sConf = hits ? 0.55 + 0.25 * (1 - Math.tanh(Math.abs(norm))) : 0.62;
    if (mixed) sConf = Math.max(0.5, sConf - 0.08);

    // ---- emotion (softmax over accumulated weights + neutral prior)
    emo.neutral += hits ? 0.35 : 2.2;
    const logits = EMOTIONS.map(k => emo[k]);
    const mx = Math.max(...logits);
    const ex = logits.map(x => Math.exp((x - mx) * 1.05));
    const sum = ex.reduce((a, b) => a + b, 0);
    const probs = {}; EMOTIONS.forEach((k, i) => probs[k] = +(ex[i] / sum).toFixed(4));
    const topEmotion0 = EMOTIONS.reduce((a, b) => (probs[b] > probs[a] ? b : a));

    // ---- stress
    let load = stressLoad;
    if (o.mood != null) load += (3 - o.mood) * 0.5;               // optional mood slider nudge (1 low .. 5 great)
    let score = 100 / (1 + Math.exp(-(load - 2.5) * 0.9));
    score = Math.max(2, Math.min(98, score));
    const th = o.thresholds;
    const level = score <= th.lowMax ? 'low' : score <= th.modMax ? 'moderate' : 'high';
    const nearest = Math.min(Math.abs(score - th.lowMax), Math.abs(score - th.modMax));
    const stressConf = +(0.55 + 0.4 * Math.min(1, nearest / 18)).toFixed(4);

    // ---- safety layer decision
    const risk = detectRisk(text, o.keywords, norm);
    let overridden = false;
    if (risk.level !== 'none') {                 // never record a crisis entry as calm/neutral in the tracker
      overridden = true;
      const floor = risk.level === 'critical' ? 92 : 75;
      if (score < floor) { score = floor; }
      if (sentiment === 'neutral' || sentiment === 'positive') { sentiment = 'negative'; sConf = Math.max(sConf, 0.7); }
      if (topEmotion0 === 'neutral' || topEmotion0 === 'joy') {
        probs.sadness = Math.max(probs.sadness, 0.55); probs.neutral = Math.min(probs.neutral, 0.15); probs.joy = Math.min(probs.joy, 0.05);
        const tot = EMOTIONS.reduce((a, k) => a + probs[k], 0); EMOTIONS.forEach(k => probs[k] = +(probs[k] / tot).toFixed(4));
      }
    }
    const topEmotion = EMOTIONS.reduce((a, b) => (probs[b] > probs[a] ? b : a));
    const level2 = score <= th.lowMax ? 'low' : score <= th.modMax ? 'moderate' : 'high';

    // ---- explainability: aggregate by word
    const agg = {};
    contrib.forEach(c => { const a = agg[c.word] || (agg[c.word] = { word: c.word, weight: 0, kind: c.kind }); a.weight += c.weight; });
    const keywords = Object.values(agg).map(a => ({ word: a.word, weight: +a.weight.toFixed(3), kind: a.kind }))
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 8);

    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    return {
      preprocessing: { original: pre.original, cleaned: pre.cleaned, tokens: pre.tokens },
      sentiment: { label: sentiment, confidence: +sConf.toFixed(4), score: +norm.toFixed(3) },
      emotion: { top: topEmotion, probabilities: probs },
      stress: { level: level2, score: +score.toFixed(1), confidence: stressConf },
      keywords, risk, riskOverride: overridden, patterns: seenPattern, tags: o.tags,
      lowSignal: hits === 0,
      model: { name: 'Lexicon+rules engine', version: '1.0-demo', note: 'In-browser demo engine, not the trained ML models' },
      latencyMs: Math.max(1, Math.round(t1 - t0))
    };
  }

  /* ---------------------------------- trends --------------------------------- */
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  /** entries: [{ts, stress, emotion, sentiment, tags}] any order. */
  function trend(entries, N, tolerancePct) {
    N = N || 5; tolerancePct = tolerancePct == null ? 5 : tolerancePct;
    const e = entries.slice().sort((a, b) => a.ts - b.ts);
    if (e.length < 2) return { direction: 'insufficient', pctChange: 0, recent: e.length ? e[e.length - 1].stress : 0, previous: 0, n: e.length };
    const n = Math.min(N, Math.floor(e.length / 2));
    const recent = mean(e.slice(-n).map(x => x.stress));
    const prev = mean(e.slice(-2 * n, -n).map(x => x.stress));
    const pct = prev === 0 ? 0 : (recent - prev) / prev * 100;
    const direction = Math.abs(pct) < tolerancePct ? 'stable' : pct > 0 ? 'increasing' : 'decreasing';
    return { direction, pctChange: +pct.toFixed(1), recent: +recent.toFixed(1), previous: +prev.toFixed(1), n };
  }
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function streak(entries, now) {
    const days = new Set(entries.map(e => dayKey(e.ts)));
    let s = 0; const d = new Date(now || Date.now());
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);   // today not logged yet does not break the streak
    while (days.has(dayKey(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }
  function summaries(entries) {
    const byDay = {};
    entries.forEach(e => { (byDay[dayKey(e.ts)] = byDay[dayKey(e.ts)] || []).push(e); });
    const daily = Object.keys(byDay).sort().map(k => ({ day: k, avg: mean(byDay[k].map(x => x.stress)), n: byDay[k].length }));
    const best = daily.length ? daily.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
    const worst = daily.length ? daily.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
    const parts = { morning: [], afternoon: [], evening: [], night: [] };
    entries.forEach(e => { const h = new Date(e.ts).getHours(); parts[h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'].push(e.stress); });
    const timeOfDay = Object.keys(parts).map(k => ({ part: k, avg: mean(parts[k]), n: parts[k].length }));
    const emoCount = {}; entries.forEach(e => emoCount[e.emotion] = (emoCount[e.emotion] || 0) + 1);
    const tagCount = {}; entries.forEach(e => (e.tags || []).forEach(t => tagCount[t] = (tagCount[t] || 0) + 1));
    const kwCount = {}; entries.forEach(e => (e.keywords || []).forEach(k => { if (k.weight < 0) kwCount[k.word] = (kwCount[k.word] || 0) + 1; }));
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return { daily, best, worst, timeOfDay, emotions: top(emoCount), tags: top(tagCount), triggers: top(kwCount).slice(0, 10) };
  }
  function weekly(entries) {
    const w = {};
    entries.forEach(e => { const d = new Date(e.ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = dayKey(d.getTime()); (w[k] = w[k] || []).push(e.stress); });
    const rows = Object.keys(w).sort().map(k => ({ week: k, avg: mean(w[k]), n: w[k].length }));
    return rows.map((r, i) => Object.assign(r, { change: i && rows[i - 1].avg ? +(((r.avg - rows[i - 1].avg) / rows[i - 1].avg) * 100).toFixed(1) : null }));
  }

  /* --------------------------- supportive responses -------------------------- */
  const EMPATHY = {
    anxiety: ['It sounds like your mind has been racing, and that can be exhausting. Thank you for putting it into words.', 'Feeling on edge is draining. You took a helpful step by writing it down.'],
    sadness: ["I'm sorry you're feeling low. It takes courage to write this down, and your feelings matter.", 'That sounds heavy. You do not have to carry it alone.'],
    anger: ["It sounds like something really frustrated you. It's understandable to feel that way.", 'Anger often points to something that matters to you. Thanks for naming it.'],
    fear: ['Feeling afraid is hard. You are not alone in this moment.', 'That sounds frightening. Let us take it one small step at a time.'],
    joy: ["It's lovely to hear things are going well. Enjoy this feeling.", 'That is good to hear. Noticing what helps is a real skill.'],
    stress: ['It sounds like you have a lot on your plate right now. That is a lot to carry.', 'Pressure builds up quietly. Good on you for checking in with yourself.'],
    neutral: ['Thanks for checking in. Reflecting on your day is a helpful habit.', 'A steady day is worth noting too.']
  };
  const SUGGESTIONS = [
    { id: 'breath478', cat: 'breathing', title: '4-7-8 breathing', body: 'Breathe in for 4, hold for 7, out for 8. Repeat 4 times.', emo: ['anxiety', 'fear'], stress: null, tool: 'breathing' },
    { id: 'box', cat: 'breathing', title: 'Box breathing', body: 'Inhale 4, hold 4, exhale 4, hold 4 for two minutes.', emo: ['stress', 'anger'], stress: ['high', 'moderate'], tool: 'breathing' },
    { id: 'ground', cat: 'grounding', title: '5-4-3-2-1 grounding', body: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.', emo: ['anxiety', 'fear'], stress: null, tool: 'grounding' },
    { id: 'sleep', cat: 'sleep', title: 'Wind-down routine', body: 'Dim lights and put screens away 30 to 60 minutes before bed; keep a regular sleep time.', emo: ['anxiety', 'stress'], stress: ['high', 'moderate'], tool: 'sleep', keyword: 'sleep' },
    { id: 'worry', cat: 'sleep', title: 'Worry notebook', body: 'Write what is on your mind before bed so you can set it aside until tomorrow.', emo: ['anxiety', 'stress'], stress: null, tool: 'journal' },
    { id: 'walk', cat: 'exercise', title: 'Ten-minute walk', body: 'A short walk, ideally outdoors, can ease tension and lift mood.', emo: ['sadness', 'stress', 'anger'], stress: null },
    { id: 'talk', cat: 'social', title: 'Reach out to someone you trust', body: 'Send a message or call someone. You do not need to explain everything.', emo: ['sadness', 'fear', 'anxiety'], stress: null },
    { id: 'share', cat: 'social', title: 'Share the load', body: 'Tell a colleague, teacher or manager what is on your plate and ask for support.', emo: ['stress'], stress: ['high'] },
    { id: 'name', cat: 'journaling', title: 'Name the feeling', body: 'Describe the feeling in one sentence and rate it from 1 to 10.', emo: ['anger', 'sadness', 'anxiety'], stress: null, tool: 'cbt' },
    { id: 'good3', cat: 'journaling', title: 'Three good things', body: 'Write down three things that went okay today, however small.', emo: ['sadness', 'joy', 'neutral'], stress: ['low'], tool: 'gratitude' },
    { id: 'pause', cat: 'tip', title: 'Cool-down pause', body: 'Count to ten before responding. Step away for a few minutes if you can.', emo: ['anger'], stress: null },
    { id: 'break', cat: 'tip', title: 'Take a real break', body: 'Step away from your desk or phone for five minutes and drink some water.', emo: ['stress'], stress: ['moderate', 'high'] },
    { id: 'keep', cat: 'tip', title: 'Keep the good going', body: 'Note what helped today feel good so you can repeat it on harder days.', emo: ['joy', 'neutral'], stress: ['low'] },
    { id: 'pmr', cat: 'breathing', title: 'Progressive muscle relaxation', body: 'Tense and release each muscle group from your feet up to your face.', emo: ['stress', 'anxiety'], stress: ['high', 'moderate'], tool: 'pmr' }
  ];
  const HELP_LINKS = [
    { name: 'Tele-MANAS', phone: '14416', desc: 'National tele-mental-health service (India)' },
    { name: 'KIRAN', phone: '1800-599-0019', desc: 'Mental health rehabilitation helpline (India)' }
  ];

  function pick(arr, seed) { return arr[Math.abs(seed | 0) % arr.length]; }
  function respond(a, tr, tagsText) {
    if (a.risk.level !== 'none') return { crisis: true, empathy: "I'm really glad you told me. You deserve support right now, and you do not have to face this alone.", suggestions: [], nudge: null, resources: HELP_LINKS };
    const emo = a.emotion.top, st = a.stress.level;
    const seed = Math.round(a.stress.score);
    const empathy = pick(EMPATHY[emo] || EMPATHY.neutral, seed);
    const txt = (a.preprocessing.cleaned || '') + ' ' + (tagsText || '');
    let cand = SUGGESTIONS.filter(s => s.emo.includes(emo) && (!s.stress || s.stress.includes(st)));
    if (/sleep/.test(txt)) cand = cand.filter(s => s.keyword === 'sleep').concat(cand.filter(s => s.keyword !== 'sleep'));
    if (cand.length < 2) cand = cand.concat(SUGGESTIONS.filter(s => !cand.includes(s) && (!s.stress || s.stress.includes(st))));
    const suggestions = cand.slice(0, st === 'high' ? 4 : 3);
    const rising = tr && tr.direction === 'increasing';
    const nudge = (st === 'high' || rising) ? 'Consider speaking with a psychologist or another professional you trust' + (rising ? ': your stress has been trending upward.' : ', especially as things feel heavy right now.') : null;
    return { crisis: false, empathy, suggestions, nudge, resources: (st === 'high' || rising) ? HELP_LINKS : [] };
  }

  const api = { preprocess, analyze, detectRisk, trend, streak, summaries, weekly, respond, DEFAULT_CRISIS, EMOTIONS, SUGGESTIONS, dayKey, mean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MHC = api;
})(typeof window !== 'undefined' ? window : globalThis);

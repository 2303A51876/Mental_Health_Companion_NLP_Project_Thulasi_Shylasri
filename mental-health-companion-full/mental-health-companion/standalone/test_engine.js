const M = require('./src/engine.js');
const cases = [
 ["I am under a lot of pressure and I am unable to sleep properly.", {s:'negative', e:'anxiety', st:'high', risk:'none'}],
 ["I had a great day and felt really relaxed.", {s:'positive', e:'joy', st:'low', risk:'none'}],
 ["Work is annoying but manageable.", {s:['neutral','negative'], e:'stress', st:'moderate', risk:'none'}],
 ["I feel like I can't go on anymore.", {risk:'critical'}],
 ["I'm not happy at all today", {s:'negative', risk:'none'}],
 ["soooo sad and tired 😭", {s:'negative', e:'sadness', risk:'none'}],
 ["Just a regular day, nothing special happened.", {s:'neutral', e:'neutral', st:'low', risk:'none'}],
 ["I am not worried about the exam", {risk:'none'}],
 ["Everything feels hopeless lately and I'm so tired.", {risk:'elevated'}],
 ["I want to kill myself", {risk:'critical'}],
 ["I cannot stop worrying about my deadlines, I feel overwhelmed and cannot sleep", {s:'negative', st:'high', risk:'none'}],
 ["", {s:'neutral', risk:'none'}],
];
let ok=0, bad=0;
for (const [t, exp] of cases) {
  const r = M.analyze(t);
  const checks = [];
  if (exp.s) checks.push([ 'sentiment', [].concat(exp.s).includes(r.sentiment.label) ]);
  if (exp.e) checks.push([ 'emotion', r.emotion.top === exp.e ]);
  if (exp.st) checks.push([ 'stress', r.stress.level === exp.st ]);
  if (exp.risk) checks.push([ 'risk', r.risk.level === exp.risk ]);
  const pass = checks.every(c=>c[1]); pass?ok++:bad++;
  console.log((pass?'PASS':'FAIL'), JSON.stringify(t).slice(0,70).padEnd(72),
     `${r.sentiment.label}(${r.sentiment.confidence.toFixed(2)}) ${r.emotion.top}(${r.emotion.probabilities[r.emotion.top]}) stress=${r.stress.level}/${r.stress.score} risk=${r.risk.level}`,
     pass?'':' <-- '+checks.filter(c=>!c[1]).map(c=>c[0]).join(','));
}
console.log(`\n${ok} passed, ${bad} failed`);
const p = M.preprocess("Soooo sad 😢 idk tbh I can't sleep!!! http://x.com @bob <b>help</b> 123");
console.log('\npreprocess:', JSON.stringify(p.cleaned), '| tokens:', p.tokens.join(','));
console.log('top keywords test1:', JSON.stringify(M.analyze(cases[0][0]).keywords.slice(0,5)));
// trend test
const now=Date.now(), day=864e5;
const mk=(d,s)=>({ts:now-d*day, stress:s});
console.log('trend increasing:', JSON.stringify(M.trend([mk(9,30),mk(8,32),mk(7,35),mk(6,31),mk(5,33),mk(4,60),mk(3,65),mk(2,70),mk(1,62),mk(0,68)])));
console.log('trend stable:', JSON.stringify(M.trend([mk(3,50),mk(2,51),mk(1,50),mk(0,50)])));
console.log('trend one entry:', JSON.stringify(M.trend([mk(0,50)])));
console.log('streak:', M.streak([mk(0,1),mk(1,1),mk(2,1),mk(4,1)], now));

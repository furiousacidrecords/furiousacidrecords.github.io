'use strict';

// E3.1 conversational fallback layer.
// Keeps the main grammar engine intact and only adds safe phrase-level rewrites
// for short conversational inputs that otherwise have no second candidate.
(() => {
  const originalBuildVariants = buildVariants;

  function addIfChanged(out, source, text, rule, score, note, formula) {
    text = normalize(text);
    if (!text || text.toLowerCase() === normalize(source).toLowerCase()) return;
    out.push({ text, rule, score, note, formula });
  }

  function conversationalFallbacks(source) {
    const out = [];

    // Standard contraction expansion that does not depend on the NLP library.
    const contractions = [
      [/\bwhat['’]s\b/gi, 'what is'],
      [/\bwho['’]s\b/gi, 'who is'],
      [/\bthat['’]s\b/gi, 'that is'],
      [/\bit['’]s\b/gi, 'it is'],
      [/\bI['’]m\b/g, 'I am'],
      [/\byou['’]re\b/gi, 'you are'],
      [/\bwe['’]re\b/gi, 'we are'],
      [/\bthey['’]re\b/gi, 'they are'],
      [/\bcan['’]t\b/gi, 'cannot'],
      [/\bdon['’]t\b/gi, 'do not'],
      [/\bwon['’]t\b/gi, 'will not'],
      [/\bisn['’]t\b/gi, 'is not'],
      [/\baren['’]t\b/gi, 'are not'],
      [/\bdidn['’]t\b/gi, 'did not'],
      [/\bdoesn['’]t\b/gi, 'does not'],
      [/\bcouldn['’]t\b/gi, 'could not'],
      [/\bwouldn['’]t\b/gi, 'would not'],
      [/\bshouldn['’]t\b/gi, 'should not']
    ];
    for (const [rx, replacement] of contractions) {
      rx.lastIndex = 0;
      if (!rx.test(source)) continue;
      rx.lastIndex = 0;
      addIfChanged(out, source, source.replace(rx, replacement), 'C-FALLBACK', 100,
        'Expanded a standard English contraction.', 'CONTRACTION → expanded form');
    }

    // Compromise tags words like “hi” as #Expression. These are whole-expression
    // equivalents, so they are safer than treating them as nouns or verbs.
    const greetings = [
      [/\bhey\b/i, 'Hi'],
      [/\bhey\b/i, 'Hello'],
      [/\bhi\b/i, 'Hello'],
      [/\bhello\b/i, 'Hi']
    ];
    for (const [rx, replacement] of greetings) {
      if (!rx.test(source)) continue;
      addIfChanged(out, source, source.replace(rx, replacement), 'L-EXPRESSION', 98,
        'Replaced a conversational expression with an equivalent expression.',
        'EXPRESSION → equivalent EXPRESSION');
    }

    // Phrase-level paraphrases: preserve the social function, not individual words.
    const phraseRules = [
      [/\bwhat['’]s up\b/i, "how's it going"],
      [/\bwhat['’]s up\b/i, 'how are things'],
      [/\bwhat is up\b/i, "how's it going"],
      [/\bwhat is up\b/i, 'how are things']
    ];
    for (const [rx, replacement] of phraseRules) {
      if (!rx.test(source)) continue;
      addIfChanged(out, source, source.replace(rx, replacement), 'P-EXPRESSION', 94,
        'Rephrased a conventional conversational phrase with the same social function.',
        'PHRASE → equivalent PHRASE');
    }

    return out;
  }

  buildVariants = async function(source, mode, transitionMode, floor, limit) {
    let rows = await originalBuildVariants(source, mode, transitionMode, floor, limit);
    const extras = conversationalFallbacks(source).filter(x => x.score >= floor);
    rows = uniqueByText([...rows, ...extras]);

    const original = rows.find(x => x.rule === 'R00');
    let rest = rows.filter(x => x !== original);
    if (mode === 'formal') rest.sort((a, b) => b.score - a.score || a.rule.localeCompare(b.rule));
    else rest = shuffle(rest);
    return [...(original ? [original] : []), ...rest].slice(0, limit);
  };
})();

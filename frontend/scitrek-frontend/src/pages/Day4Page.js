// src/pages/Day4Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  CardSelect,
  SentenceStarters,
  StepFlow,
  StageDesk,
  StructuredReflection,
  composeParts,
  decomposeText,
} from '../components/interactions';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

/* ------------------------------ Config/Data ------------------------------ */

// Keep three default comparison genes (no TP53/MYC).
const DEFAULT_GENE_ROWS = [
  { gene: 'EGFR', normalFunction: '', whyMatters: '' },
  { gene: 'RAS',  normalFunction: '', whyMatters: '' }, // links to KRAS page
  { gene: 'TDG',  normalFunction: '', whyMatters: '' },
];

/** Protein Atlas links */
const PROTEIN_ATLAS_URLS = {
  EGFR: 'https://www.proteinatlas.org/ENSG00000146648-EGFR',
  RAS:  'https://www.proteinatlas.org/ENSG00000133703-KRAS', // “RAS” label → KRAS link
  TDG:  'https://www.proteinatlas.org/ENSG00000139372-TDG',
};

const METHOD_STARTERS = ['qPCR', 'IHC', 'RNA-seq'];

// "Gene Function Matching" was two blank boxes per gene. The first half really
// is a matching task — the three functions below are the ones the Atlas pages
// describe — so it is chosen from the set rather than typed from memory. The
// stored value is still the function's wording, so saved work and the teacher
// dashboard are unchanged.
const GENE_FUNCTION_OPTIONS = [
  'Receives growth signals from outside the cell',
  'Relays growth signals inside the cell like a switch',
  'Repairs damaged bases in DNA',
  'Holds the cell cycle still until damage is fixed',
];

// The aggression comparison names two genes and asks for a justification.
const AGGRESSION_PARTS = [
  {
    key: 'q2More',
    label: 'The gene you think is MORE aggressive when mis-regulated',
    options: ['EGFR', 'RAS', 'TDG'],
  },
  {
    key: 'q2Less',
    label: 'The gene you think is LESS aggressive when mis-regulated',
    options: ['EGFR', 'RAS', 'TDG'],
  },
  {
    key: 'q2Why',
    label: 'Justify your reasoning from what you saw in the Atlas',
    placeholder: 'Compare what each gene normally does, then say what goes wrong if it is mis-regulated.',
    starters: ['I think ___ is more aggressive than ___ because…', 'The evidence in the Atlas showed…'],
  },
];

const FUNCTION_AGGRESSION_PARTS = [
  {
    key: 'q1Risk',
    label: 'For the gene you are looking at, which is riskier?',
    options: ['Too loud (over-expressed)', 'Too quiet (under-expressed)'],
  },
  {
    key: 'q1Why',
    label: 'Explain how its usual job makes that risky',
    placeholder: 'Because this gene normally…, expressing it that way would…',
    starters: [
      'Because this gene normally…',
      'If it were too loud, the cell would…',
      'If it were too quiet, the cell would…',
    ],
  },
];

/**
 * Each scenario names the three things a good answer contains — the old
 * placeholder spelled them out as an ASCII form. They are real fields now.
 * The composed prose is still written to `methods.scenarioN`.
 */
const scenarioParts = (n) => [
  {
    key: `s${n}Method`,
    label: `Scenario ${n} — best method`,
    options: METHOD_STARTERS,
  },
  {
    key: `s${n}Why`,
    label: 'Why it fits this scenario',
    placeholder: 'What about this method matches what the scenario needs?',
  },
  {
    key: `s${n}Alt`,
    label: 'Why another method is less ideal',
    placeholder: 'Name a different method and say what it would miss or cost.',
  },
];

const SCENARIOS = [
  {
    n: 1,
    key: 'scenario1',
    partsKey: 'scenario1Parts',
    prompt: (
      <>
        You already suspect <b>Gene X</b> changes after treatment. You need a <b>fast</b>, <b>low-cost</b> check across{' '}
        <b>20 samples</b>. What method would you use, and why?
      </>
    ),
  },
  {
    n: 2,
    key: 'scenario2',
    partsKey: 'scenario2Parts',
    prompt: (
      <>
        You need to know <b>where in the tissue</b> a protein is found (tumor core vs edges), not just how much RNA is
        present. What method would you use, and why?
      </>
    ),
  },
  {
    n: 3,
    key: 'scenario3',
    partsKey: 'scenario3Parts',
    prompt: (
      <>
        You <b>don’t know</b> which genes change between healthy and cancer samples. You want a broad scan to discover
        unexpected differences. What method would you use, and why?
      </>
    ),
  },
];

// Question wording is unchanged throughout; each one now offers the phrases it
// is fishing for as tap-to-insert starters, so answering begins from a decision
// rather than from an empty box.
const RECAP_STEPS = [
  {
    key: 'regWrong',
    title: 'What might cause gene regulation to go wrong?',
    placeholder: 'e.g., mutations, epigenetic changes, signaling errors…',
    starters: ['A mutation in the gene itself', 'An epigenetic change such as methylation', 'A broken signalling pathway', 'A missing transcription factor'],
  },
  {
    key: 'cancerVsTypical',
    title: 'How is cancer growth different from typical cells?',
    placeholder: 'Use the vocabulary list above as your guide.',
    starters: ['Cancer cells ignore the signals that normally…', 'Typical cells stop dividing when…', 'Cancer cells avoid apoptosis by…'],
  },
  {
    key: 'detectHousekeeping',
    title: 'Housekeeping vs cancer-linked expression: one example of each “too loud / too quiet”.',
    placeholder: 'Type your answer…',
    starters: ['GAPDH stays steady, so…', 'Too loud:', 'Too quiet:'],
  },
];

const DAY4_WRAP = [
  {
    key: 'patternsFromVisuals',
    label: 'How did visuals help you notice patterns between healthy and cancerous cells?',
    starters: ['Seeing the two side by side made it obvious that…', 'The colour differences showed…', 'I would have missed ___ in a table of numbers'],
  },
  {
    key: 'functionAndAggression',
    label: 'How does typical gene function affect progression once mutated? Which seem more “aggressive,” and why?',
    starters: ['A gene that normally pushes growth becomes dangerous when…', 'A gene that normally repairs damage becomes dangerous when…'],
  },
  {
    key: 'newThingLearned',
    label: 'One new thing you learned about gene expression differences today',
    starters: ['I did not realise that…', 'The Atlas showed me that…'],
  },
];

const toSymbol = (s = '') => String(s).trim().toUpperCase();
const getProteinAtlasUrl = (sym = '') => {
  const s = toSymbol(sym);
  if (PROTEIN_ATLAS_URLS[s]) return PROTEIN_ATLAS_URLS[s];
  // Fallback is EGFR (no TP53/MYC anywhere)
  return `https://www.proteinatlas.org/search/${encodeURIComponent('EGFR')}`;
};

// Migrate legacy saved data: TP53→EGFR, MYC→RAS
const remapLegacyGene = (g) => {
  const s = toSymbol(g);
  if (s === 'TP53') return 'EGFR';
  if (s === 'MYC')  return 'RAS';
  return g;
};

/* ------------------------------ UI helpers ------------------------------ */

/** Small helper to render a linked gene symbol */
const GeneLink = ({ symbol, className }) => {
  const s = toSymbol(symbol);
  const url = getProteinAtlasUrl(s);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={`${s} on the Human Protein Atlas`}
    >
      {s} <i className="fa-solid fa-arrow-up-right-from-square ml-1 text-xs align-super" />
    </a>
  );
};

/* --------------------------- Protein Atlas panel -------------------------- */

function ProteinAtlasPanel({ gene, onGeneChange, height = '900px' }) {
  const [loaded, setLoaded] = React.useState(false);
  const setGene = onGeneChange;
  const [timedOut, setTimedOut] = React.useState(false);
  const src = getProteinAtlasUrl(gene);

  React.useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [src]);

  const geneOptions = Object.keys(PROTEIN_ATLAS_URLS); // ['EGFR','RAS','TDG']

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="gene-select">Select gene</label>
            <select
              id="gene-select"
              value={gene}
              onChange={(e) => setGene(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-64"
              aria-label="Select gene to view on Protein Atlas"
            >
              {geneOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium px-4 py-2 rounded"
            >
              Open on Protein Atlas
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-500">Quick links:</span>
            {geneOptions.map(s => (
              <GeneLink key={s} symbol={s} className="text-primary-700 underline" />
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Some browsers block embeds; if the panel stays blank, use “Open on Protein Atlas”.
        </p>
      </div>

      <div className="relative">
        <iframe
          key={src}
          src={src}
          title={`Protein Atlas: ${gene}`}
          className="w-full bg-white"
          style={{ height }}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="bg-white/85 backdrop-blur border border-gray-200 rounded-lg px-4 py-3 text-center">
              <div className="font-medium">Loading Protein Atlas…</div>
              <div className="text-xs text-gray-600 mt-1">
                {timedOut
                  ? 'Your browser may block this embed. Click “Open on Protein Atlas.”'
                  : 'One moment while we load the interactive view.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */

const Day4Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 4;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Which gene the pinned Protein Atlas panel is showing. Lifted out of the
  // panel so moving to a gene's question also moves the evidence.
  const [atlasGene, setAtlasGene] = useState('EGFR');

  // --- AUTOSAVE (Day 5 pattern) ---
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  // Central answers model
  const [answersData, setAnswersData] = useState({
    recap: { regWrong: '', cancerVsTypical: '', detectHousekeeping: '' },
    viz: {
      notes: '',
      geneTable: DEFAULT_GENE_ROWS,
      q1FunctionToAggression: '',
      q1Parts: {},
      q2AggressivenessByFunction: '',
      q2Parts: {},
    },
    // `scenarioNParts` are additive; `scenarioN` still holds the readable prose.
    methods: {
      scenario1: '', scenario1Parts: {},
      scenario2: '', scenario2Parts: {},
      scenario3: '', scenario3Parts: {},
    },
    inquiry: { think: '' },
    wrap: {
      patternsFromVisuals: '',
      functionAndAggression: '',
      newThingLearned: '',
    },
    participation: { trackerNotes: '', points: '' },
  });
  const answersDataRef = useRef(answersData);

  useEffect(() => {
    answersDataRef.current = answersData;
  }, [answersData]);

  /* -------------------------- load user + saved answers ------------------------- */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!isMounted) return;
        setUser(u);

        let data = null;
        try {
          data = await getResponseDetail(moduleId);
        } catch {
          // treat 404 as no previous answers
        }
        if (!isMounted) return;

        if (data?.answers) {
          const payload = data.answers.answers || data.answers;
          setAnswersData(prev => {
            // merge
            let merged = { ...prev, ...payload };

            // ensure table exists
            if (!merged.viz?.geneTable || !Array.isArray(merged.viz.geneTable)) {
              merged.viz = merged.viz || {};
              merged.viz.geneTable = DEFAULT_GENE_ROWS;
            }

            // **migrate legacy gene names in saved data**
            merged.viz.geneTable = merged.viz.geneTable.map(row => ({
              ...row,
              gene: remapLegacyGene(row.gene),
            }));

            if (!merged.inquiry) merged.inquiry = { think: '' };
            merged.viz = { q1Parts: {}, q2Parts: {}, ...merged.viz };
            merged.methods = {
              scenario1Parts: {}, scenario2Parts: {}, scenario3Parts: {},
              ...(merged.methods || {}),
            };
            return merged;
          });
          setDirty(false);
          setLastSavedAt(new Date());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [moduleId]);

  /* ------------------------------ saving logic ----------------------------- */
  const saveAnswers = async ({ silent = true } = {}) => {
    if (saving) return;
    try {
      setSaving(true);
      await upsertResponse(moduleId, answersDataRef.current);
      setDirty(false);
      setLastSavedAt(new Date());
      if (!silent) alert('Your work has been saved!');
    } catch (e) {
      if (!silent) alert('Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // periodic autosave while dirty
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 15000); // every 15s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  // save on tab hide / close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dirty && !saving) {
        saveAnswers({ silent: true });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  const handleLogout = async () => {
    if (dirty && !saving) {
      await saveAnswers({ silent: true });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const handleSave = async () => {
    await saveAnswers({ silent: false });
  };

  // lightweight nested setter with autosave debounce (~2s)
  const setField = (path, value) => {
    setAnswersData((prev) => {
      const clone = structuredClone(prev);
      // eslint-disable-next-line no-new-func
      new Function('obj', 'value', `obj.${path} = value;`)(clone, value);
      return clone;
    });
    setDirty(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDirty((currentDirty) => {
        if (currentDirty && !saving) {
          saveAnswers({ silent: true });
        }
        return currentDirty;
      });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setStructured = (partsPath, prosePath, parts, nextValues) => {
    setField(partsPath, nextValues);
    setField(prosePath, composeParts(parts, nextValues));
  };

  const appendTo = (path, current, text) => setField(path, current ? `${current} ${text}` : text);

  // Anything written before these prompts became builders is shown back to the
  // student rather than silently dropped.
  const q1Carry = Object.keys(answersData.viz.q1Parts || {}).length
    ? ''
    : decomposeText(FUNCTION_AGGRESSION_PARTS, answersData.viz.q1FunctionToAggression).carryOver;
  const q2Carry = Object.keys(answersData.viz.q2Parts || {}).length
    ? ''
    : decomposeText(AGGRESSION_PARTS, answersData.viz.q2AggressivenessByFunction).carryOver;

  if (loading) return <div className="flex items-center justify-center h-screen">Loading…</div>;

  /* ---------------------------------- UI ----------------------------------- */

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      {/* autosave status badge */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-full bg-white/90 backdrop-blur px-3 py-1 shadow border text-xs text-gray-700">
          {saving
            ? 'Autosaving…'
            : lastSavedAt
              ? `Saved • ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : 'Ready'}
          {dirty && !saving ? <span className="ml-2 text-amber-600">(unsaved)</span> : null}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 4: Levels of Expression, Diagnosis, & Treatment</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">
            Spotting patterns in gene activity—and what they mean for patients
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Vocabulary focus: <b>oncogene</b>, <b>tumor suppressor</b>, <b>DNA repair</b>, <b>over/under-expression (“loud/quiet”)</b>, <b>IHC</b>, <b>qPCR</b>, <b>RNA-seq</b>.
          </p>
        </div>

        {/* Objective */}
        <section id="objective-section">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-primary-700">
              <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
              Objective
            </h2>
            <p className="text-gray-700">
              Compare gene activity between healthy and cancerous cells using visual data. Identify patterns in expression,
              and connect them to differences in diagnosis and treatment.
            </p>
          </div>
        </section>

        {/* What's the Plan? */}
        <section id="plan-section">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <i className="fa-solid fa-list-check text-primary-500 mr-3" />
              What's the Plan?
            </h2>
            <ul className="space-y-4">
              {[
                'Recap: when regulation goes wrong & how we detect it',
                'Activity 1: Visualize expression patterns and map gene functions',
                'Mini-lesson: What do qPCR, IHC, and RNA-seq measure?',
                'Guided Atlas activity: Find “loud vs quiet” evidence on specific tabs',
                'Mentor-led wrap-up using visuals + participation tracker',
              ].map((item, idx) => (
                <li key={idx} className="flex items-start">
                  <div className="bg-primary-100 rounded-full p-1 mr-3 mt-1">
                    <i className="fa-solid fa-check text-primary-700 text-sm" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Activities */}
        <section id="activities-section" className="space-y-10">
          <h2 className="text-3xl font-bold text-center">Activities</h2>

          {/* Recap & Review */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Recap & Review</h3>

            <StepFlow
              hint="Three recall questions from Days 1–3, one at a time."
              steps={RECAP_STEPS.map(({ key, title, placeholder, starters }) => ({
                id: key,
                title,
                isComplete: Boolean((answersData.recap[key] || '').trim()),
                render: () => (
                  <>
                    <textarea
                      value={answersData.recap[key]}
                      onChange={e => setField(`recap.${key}`, e.target.value)}
                      className="w-full border border-gray-300 rounded p-3"
                      rows={4}
                      placeholder={placeholder}
                      aria-label={title}
                    />
                    <SentenceStarters
                      starters={starters}
                      onInsert={(t) => appendTo(`recap.${key}`, answersData.recap[key], t)}
                    />
                  </>
                ),
              }))}
            />

            <div className="flex justify-end mt-4">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </section>

          {/* Activity 1: Visualizing Gene Expression Patterns */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Activity 1: Visualizing Gene Expression Patterns</h3>

            <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mb-4">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>
                Explore the Atlas first, then answer below. It stays on screen while you work and follows whichever
                gene you are on — no scrolling back and forth between the evidence and the answer.
              </span>
            </p>

            <StageDesk
              showTitleOnStage={false}
              mediaTitle="Human Protein Atlas — stays with you"
              media={
                <ProteinAtlasPanel gene={atlasGene} onGeneChange={setAtlasGene} height="70vh" />
              }
            >
              <h4 className="font-semibold">Gene Function Matching</h4>
              <StepFlow
                hint="One gene at a time. Selecting a gene here also loads it in the Atlas panel."
                steps={answersData.viz.geneTable.map((row, idx) => {
                  const symbol = toSymbol(remapLegacyGene(row.gene) || 'EGFR');
                  const url = getProteinAtlasUrl(symbol);
                  const update = (patch) => {
                    const next = [...answersData.viz.geneTable];
                    next[idx] = { ...next[idx], gene: symbol, ...patch };
                    setField('viz.geneTable', next);
                  };
                  return {
                    id: `${symbol}-${idx}`,
                    title: symbol,
                    isComplete: Boolean((row.normalFunction || '').trim() && (row.whyMatters || '').trim()),
                    render: () => (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setAtlasGene(symbol)}
                            className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50"
                          >
                            <i className="fa-solid fa-eye mr-1.5" aria-hidden="true" />
                            Show {symbol} in the Atlas panel
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-700 underline text-sm"
                            title={`${symbol} on the Human Protein Atlas`}
                          >
                            Open {symbol} in a new tab
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                          </a>
                        </div>

                        <CardSelect
                          legend={`${symbol} — normal function`}
                          hint="Match it to what the Atlas page above describes."
                          options={GENE_FUNCTION_OPTIONS}
                          value={row.normalFunction}
                          onChange={(v) => update({ normalFunction: v })}
                          columns={2}
                          name={`gene-fn-${idx}`}
                        />

                        <div>
                          <label htmlFor={`gene-why-${idx}`} className="text-sm font-medium mb-1 block">
                            {symbol} — why does it matter?
                          </label>
                          <textarea
                            id={`gene-why-${idx}`}
                            value={row.whyMatters}
                            onChange={e => update({ whyMatters: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            rows={2}
                            placeholder="How could changes affect diagnosis/treatment?"
                          />
                          <SentenceStarters
                            starters={[
                              'If this gene is mis-regulated, a doctor could…',
                              'It could be used as a marker for…',
                              'A drug could target it by…',
                            ]}
                            onInsert={(t) => update({ whyMatters: row.whyMatters ? `${row.whyMatters} ${t}` : t })}
                          />
                        </div>
                      </div>
                    ),
                  };
                })}
              />

              {/* Key Questions — clarified wording */}
              <div className="space-y-6 pt-2">
                <div>
                  <label htmlFor="viz-q1" className="text-sm font-medium mb-1 block">1) Function → Aggression</label>
                  <p className="text-xs text-gray-600 mb-1">
                    Here “aggressive” = more likely to cause fast growth or resist control if mis-regulated.
                  </p>
                  <StructuredReflection
                    parts={FUNCTION_AGGRESSION_PARTS}
                    values={answersData.viz.q1Parts}
                    carryOver={q1Carry}
                    onChange={(next) =>
                      setStructured('viz.q1Parts', 'viz.q1FunctionToAggression', FUNCTION_AGGRESSION_PARTS, next)
                    }
                  />
                </div>
                <div>
                  <label htmlFor="viz-q2" className="text-sm font-medium mb-1 block">2) More vs less “aggressive” by function</label>
                  <p className="text-xs text-gray-600 mb-1">
                    Compare any two genes you studied. Justify your reasoning.
                  </p>
                  <StructuredReflection
                    parts={AGGRESSION_PARTS}
                    values={answersData.viz.q2Parts}
                    carryOver={q2Carry}
                    onChange={(next) =>
                      setStructured('viz.q2Parts', 'viz.q2AggressivenessByFunction', AGGRESSION_PARTS, next)
                    }
                  />
                </div>
              </div>
            </StageDesk>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </section>

          {/* Mini-lesson: Methods (qPCR, IHC, RNA-seq) — background only */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-2">Mini-Lesson: How Do We Measure Expression?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Read the method summaries, then answer the scenarios below. For each scenario: (1) pick the best method, (2) explain why,
              and (3) say why at least one other method is less ideal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <h4 className="font-semibold mb-1">qPCR</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Measures specific mRNA levels.</li>
                  <li>Fast and targeted (a few genes).</li>
                  <li>Reports relative fold-change vs a baseline gene.</li>
                </ul>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <h4 className="font-semibold mb-1">IHC</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tissue images of protein staining.</li>
                  <li>Shows where the protein is and approximate amount.</li>
                  <li>Reported as staining intensity/patterns on slides.</li>
                </ul>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <h4 className="font-semibold mb-1">RNA-seq</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Profiles many genes at once.</li>
                  <li>Good for discovering unexpected changes.</li>
                  <li>Output is counts/TPM and comparisons across samples.</li>
                </ul>
              </div>
            </div>

            {/* Scenario-based quick checks — the three method cards above stay
                on screen while students answer. */}
            <div className="mt-6">
              <StepFlow
                title="Three scenarios"
                hint="The method summaries stay above. Each answer has three parts — they assemble into your full response."
                steps={SCENARIOS.map(({ n, key, partsKey, prompt }) => {
                  const parts = scenarioParts(n);
                  const values = answersData.methods[partsKey] || {};
                  const carryOver = Object.keys(values).length
                    ? ''
                    : decomposeText(parts, answersData.methods[key]).carryOver;
                  return {
                    id: key,
                    title: `Scenario ${n}`,
                    isComplete: parts.every(({ key: pk }) => (values[pk] || '').trim()),
                    render: () => (
                      <>
                        <p className="text-sm text-gray-800 mb-3">{prompt}</p>
                        <StructuredReflection
                          parts={parts}
                          values={values}
                          carryOver={carryOver}
                          onChange={(next) =>
                            setStructured(`methods.${partsKey}`, `methods.${key}`, parts, next)
                          }
                        />
                      </>
                    ),
                  };
                })}
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
              >
                Save Section
              </button>
            </div>
          </section>

        </section>

        {/* Inquiry & Discussion */}
        <section id="inquiry-section" className="mb-16">
          <div className="bg-primary-100 rounded-2xl shadow-md p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 text-primary-200">
              <i className="fa-solid fa-quote-right text-9xl opacity-30" />
            </div>

            <h2 className="text-2xl font-bold mb-6 text-primary-800 relative z-10">
              <i className="fa-solid fa-lightbulb text-primary-500 mr-3" />
              Inquiry & Discussion
            </h2>

            <div className="bg-white rounded-xl p-6 shadow-sm relative z-10">
              <h3 className="text-xl font-semibold mb-2 text-primary-700">Think & Respond</h3>
              <p className="text-gray-700 mb-2">
                Scenario: A sample shows high <GeneLink symbol="RAS" /> and low <GeneLink symbol="EGFR" /> expression.
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Write one hypothesis and one measurement to test it (choose: qPCR, IHC, or RNA-seq). State the result that would support your claim.
              </p>
              <textarea
                value={answersData.inquiry.think}
                onChange={e => setField('inquiry.think', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Type your response…"
              />
              <SentenceStarters
                starters={[
                  'High RAS with low EGFR suggests…',
                  'I would test it with qPCR against a housekeeping gene',
                  'I would test it with IHC to see where the protein sits',
                  'My claim is supported if…',
                ]}
                onInsert={(t) => appendTo('inquiry.think', answersData.inquiry.think, t)}
              />
              <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                  Submit Response
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Wrap-Up & Reflection */}
        <section id="wrap-up-section" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-flag-checkered text-primary-500 mr-3" />
            Wrap-Up & Reflection
          </h3>
          <StepFlow
            hint="Three reflections, one at a time."
            steps={DAY4_WRAP.map(({ key, label, starters }) => ({
              id: key,
              title: label,
              isComplete: Boolean((answersData.wrap[key] || '').trim()),
              render: () => (
                <>
                  <textarea
                    value={answersData.wrap[key]}
                    onChange={e => setField(`wrap.${key}`, e.target.value)}
                    className="w-full border border-gray-300 rounded p-3"
                    rows={4}
                    placeholder="Type your answer…"
                    aria-label={label}
                  />
                  <SentenceStarters
                    starters={starters}
                    onInsert={(t) => appendTo(`wrap.${key}`, answersData.wrap[key], t)}
                  />
                </>
              ),
            }))}
          />
          <div className="flex justify-end mt-6">
            <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
              Save Reflection
            </button>
          </div>
        </section>

        {/* Global Save */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-6 rounded-lg"
          >
            Save
          </button>
        </div>

        {/* Page Nav */}
        <div className="flex justify-between">
          <Link
            to="/sections/day-3"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 3
          </Link>
          <Link
            to="/sections/day-5"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
          >
            Go to Day 5
            <i className="fa-solid fa-arrow-right ml-2" />
          </Link>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center" />

      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
};

export default Day4Page;

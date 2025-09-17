// src/pages/Day4Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
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

function ProteinAtlasPanel() {
  const [gene, setGene] = React.useState('EGFR');
  const [loaded, setLoaded] = React.useState(false);
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
              className="inline-flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded"
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
          className="w-full h-[900px] bg-white"
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
      q2AggressivenessByFunction: '',
    },
    methods: { qPCRuse: '', IHCuse: '', RNAseqUse: '' },
    inquiry: { think: '' },
    wrap: {
      patternsFromVisuals: '',
      functionAndAggression: '',
      newThingLearned: '',
    },
    participation: { trackerNotes: '', points: '' },
  });

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
      await upsertResponse(moduleId, answersData);
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
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
                    <i className="fa-solid fa-check text-primary-600 text-sm" />
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

            <label className="text-sm font-medium mb-1 block">What might cause gene regulation to go wrong?</label>
            <textarea
              value={answersData.recap.regWrong}
              onChange={e => setField('recap.regWrong', e.target.value)}
              className="w-full border border-gray-300 rounded p-3 mb-3"
              rows={3}
              placeholder="e.g., mutations, epigenetic changes, signaling errors…"
            />

            <label className="text-sm font-medium mb-1 block">How is cancer growth different from typical cells?</label>
            <textarea
              value={answersData.recap.cancerVsTypical}
              onChange={e => setField('recap.cancerVsTypical', e.target.value)}
              className="w-full border border-gray-300 rounded p-3 mb-3"
              rows={3}
              placeholder="Use the vocabulary list above as your guide."
            />

            <label className="text-sm font-medium mb-1 block">Housekeeping vs cancer-linked gene expression: one example of each “too loud / too quiet”.</label>
            <textarea
              value={answersData.recap.detectHousekeeping}
              onChange={e => setField('recap.detectHousekeeping', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={3}
            />

            <div className="flex justify-end mt-4">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </section>

          {/* Activity 1: Visualizing Gene Expression Patterns */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Activity 1: Visualizing Gene Expression Patterns</h3>

            <ProteinAtlasPanel />

            {/* Gene function matching (table, students fill) */}
            <h4 className="font-semibold mb-2 mt-6">Gene Function Matching</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2">Gene</th>
                    <th className="text-left px-4 py-2">Normal Function (you write)</th>
                    <th className="text-left px-4 py-2">Why does it matter? (1 phrase)</th>
                    <th className="text-left px-4 py-2">Protein Atlas</th>
                  </tr>
                </thead>
                <tbody>
                  {answersData.viz.geneTable.map((row, idx) => {
                    const symbol = toSymbol(remapLegacyGene(row.gene) || 'EGFR');
                    const url = getProteinAtlasUrl(symbol);
                    return (
                      <tr key={`${row.gene || idx}-${idx}`} className="border-t">
                        <td className="px-4 py-2">
                          <input
                            value={remapLegacyGene(row.gene)}
                            onChange={e => {
                              const next = [...answersData.viz.geneTable];
                              next[idx] = { ...next[idx], gene: e.target.value };
                              setField('viz.geneTable', next);
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-40"
                            placeholder="e.g., EGFR"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.normalFunction}
                            onChange={e => {
                              const next = [...answersData.viz.geneTable];
                              next[idx] = { ...next[idx], normalFunction: e.target.value };
                              setField('viz.geneTable', next);
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="What does this gene usually help the cell do?"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.whyMatters}
                            onChange={e => {
                              const next = [...answersData.viz.geneTable];
                              next[idx] = { ...next[idx], whyMatters: e.target.value };
                              setField('viz.geneTable', next);
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="How could changes affect diagnosis/treatment?"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-700 underline"
                            title={`${symbol} on the Human Protein Atlas`}
                          >
                            {symbol}
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Key Questions — clarified wording */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">1) Function → Aggression</label>
                <p className="text-xs text-gray-600 mb-1">
                  Here “aggressive” = more likely to cause fast growth or resist control if mis-regulated.
                </p>
                <textarea
                  value={answersData.viz.q1FunctionToAggression}
                  onChange={e => setField('viz.q1FunctionToAggression', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={4}
                  placeholder="Explain how a gene’s usual job could make it risky if it’s too loud or too quiet."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">2) More vs less “aggressive” by function</label>
                <p className="text-xs text-gray-600 mb-1">
                  Compare any two genes you studied. Justify your reasoning.
                </p>
                <textarea
                  value={answersData.viz.q2AggressivenessByFunction}
                  onChange={e => setField('viz.q2AggressivenessByFunction', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={4}
                  placeholder="Which seems more aggressive when mis-regulated, and why?"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </section>

          {/* Mini-lesson: Methods (qPCR, IHC, RNA-seq) — background only */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Mini-Lesson: How Do We Measure Expression?</h3>
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

            {/* Quick checks (students supply answers) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">qPCR is best when…</label>
                <textarea
                  value={answersData.methods.qPCRuse}
                  onChange={e => setField('methods.qPCRuse', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Describe a situation where qPCR fits."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">IHC is best when…</label>
                <textarea
                  value={answersData.methods.IHCuse}
                  onChange={e => setField('methods.IHCuse', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Describe a situation where IHC fits."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">RNA-seq is best when…</label>
                <textarea
                  value={answersData.methods.RNAseqUse}
                  onChange={e => setField('methods.RNAseqUse', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Describe a situation where RNA-seq fits."
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
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
              <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">How did visuals help you notice patterns between healthy and cancerous cells?</label>
              <textarea
                value={answersData.wrap.patternsFromVisuals}
                onChange={e => setField('wrap.patternsFromVisuals', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">How does typical gene function affect progression once mutated? Which seem more “aggressive,” and why?</label>
              <textarea
                value={answersData.wrap.functionAndAggression}
                onChange={e => setField('wrap.functionAndAggression', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">One new thing you learned about gene expression differences today</label>
              <textarea
                value={answersData.wrap.newThingLearned}
                onChange={e => setField('wrap.newThingLearned', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
              Save Reflection
            </button>
          </div>
        </section>

        {/* Global Save */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg"
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
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
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

// src/pages/Day3Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

const DEFAULT_GENES = [
  { name: 'HK1 (housekeeping)', type: 'housekeeping' },
  { name: 'GAPDH (housekeeping)', type: 'housekeeping' },
  { name: 'BRCA1', type: 'candidate' },
  { name: 'BRCA2', type: 'candidate' },
  { name: 'TP53', type: 'candidate' },
  { name: 'MYC', type: 'candidate' },
];

// Gentle nudge; do not block paste
const warnOnPaste = (e) => {
  try {
    const target = e.target;
    target?.setAttribute('data-paste-warned', '1');
  } catch {}
};

/**
 * IMPORTANT: Your images live in /public/images so they are served at /images/<filename>
 * We URL-encode filenames to safely handle spaces and commas.
 */
const GENE_CARD_FILES = [
  'ChatGPT Image Aug 22, 2025 at 10_16_26 AM.png',
  'ChatGPT Image Aug 22, 2025 at 10_16_25 AM.png',
  'ChatGPT Image Aug 22, 2025 at 10_16_23 AM.png',
  'ChatGPT Image Aug 22, 2025 at 10_16_21 AM.png',
  'ChatGPT Image Aug 22, 2025 at 10_16_20 AM.png',
  'ChatGPT Image Aug 22, 2025 at 10_16_18 AM.png',
];

const SUSPECT_CARD_FILES = [
  'ChatGPT Image Aug 22, 2025 at 10_16_01 AM.png', // HK1
  'ChatGPT Image Aug 22, 2025 at 10_16_02 AM.png', // GAPDH
  'ChatGPT Image Aug 22, 2025 at 10_16_05 AM.png', // BRCA1
];

const GENE_CARDS = DEFAULT_GENES.map((g, i) => ({
  gene: g.name.replace(/\s*\(.+?\)\s*$/, ''),
  fullLabel: g.name,
  type: g.type,
  file: GENE_CARD_FILES[i] || GENE_CARD_FILES[GENE_CARD_FILES.length - 1],
}));

const imageUrl = (filename) => `/images/${encodeURIComponent(filename)}`;

const Day3Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 3;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- autosave state (match Day 5 pattern) ---
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // {src, alt} | null

  // Academic honesty banner
  const [honestyAck, setHonestyAck] = useState(false);

  // Central answers model
  const [answersData, setAnswersData] = useState({
    // Introduction
    intro: { loudQuietMeaning: '' },

    // Comparing gene expression
    compare: {
      healthyDesc: '',
      cancerDesc: '',
      patterns: '',
      table: DEFAULT_GENES.map(g => ({
        gene: g.name,
        category: g.type === 'housekeeping' ? 'typical' : '',
        notes: '',
      })),
    },

    // Gene detective
    detective: {
      suspiciousNotes: '',
      hypothesis: '',
      experimentPlan: '',
      experimentSketch: '',
    },

    // Inquiry & discussion
    inquiry: { think: '' },

    // Wrap-up
    wrap: {
      idSignals: '',
      overUnderExamples: '',
      hkBaseline: '',
      preBiopsyMethods: '',
    },
  });

  /* --------------------------- load user + saved answers --------------------------- */
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
            const merged = { ...prev, ...payload };
            // ensure compare.table exists
            if (!merged.compare?.table || !Array.isArray(merged.compare.table)) {
              merged.compare = merged.compare || {};
              merged.compare.table = DEFAULT_GENES.map(g => ({
                gene: g.name,
                category: g.type === 'housekeeping' ? 'typical' : '',
                notes: '',
              }));
            }
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

  /* -------------------------------- helpers -------------------------------- */
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

  // periodic autosave while dirty (every 15s)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 15000);
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

      {/* autosave status badge (matches Day 5) */}
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

      {/* Academic honesty banner */}
      {!honestyAck && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
          <div className="container mx-auto px-4 py-3 text-sm flex items-start gap-3">
            <i className="fa-solid fa-hand text-amber-600 mt-0.5" />
            <div className="flex-1">
              <b>Heads up:</b> This activity is about your thinking. Please do your own work (don’t paste AI-generated answers).
              We’ll give you examples and scaffolds below.
            </div>
            <button
              className="ml-2 px-3 py-1 rounded border bg-white hover:bg-amber-100"
              onClick={() => setHonestyAck(true)}
            >
              I understand
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 3: Seeing Static — Gene Signals & Cancer Detection</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">How expression levels hint at disease</h2>
        </div>

        {/* Objective */}
        <section id="objective-section">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-primary-700">
              <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
              Objective
            </h2>
            <p className="text-gray-700">
              Explore how scientists detect cancer by looking at gene expression “volume.” If key genes are too loud
              (over-expressed) or too quiet (under-expressed), that imbalance can signal trouble.
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
                'Review: when “loud” or “quiet” genes matter',
                'Compare expression in housekeeping vs. cancer-linked genes',
                'Use cards to explore patterns across patients and genes',
                'Learn how scientists form hypotheses and test them',
                'Formulate a hypothesis and design a simple experiment',
                'Learn how detection & diagnosis work together (imaging + expression)',
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

          {/* 1. Intro to Gene Expression & Detection */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">What Does Gene Expression Look Like?</h3>
            <p className="text-gray-700 mb-4">
              Review your Day 2 notes on oncogenes, tumor suppressors, and DNA repair genes. Then answer:
            </p>
            <label className="block text-sm font-medium mb-2">
              If a gene is too “loud” (high expression) or too “quiet” (low expression), what might that mean? (Connect to
              oncogenes = often dangerous when <em>too loud</em>; tumor suppressors/repair = dangerous when <em>too quiet</em>.)
            </label>
            <textarea
              value={answersData.intro.loudQuietMeaning}
              onChange={e => setField('intro.loudQuietMeaning', e.target.value)}
              onPaste={warnOnPaste}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
              placeholder="Type your answer…"
            />
          </section>

          {/* 2. Comparing Gene Expression */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Comparing Gene Expression</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-medium mb-2">Describe expression in healthy cells</h4>
                <p className="text-xs text-gray-600 mb-1">
                  Hint: housekeeping steady; cancer-linked genes within normal ranges and responding to signals.
                </p>
                <textarea
                  value={answersData.compare.healthyDesc}
                  onChange={e => setField('compare.healthyDesc', e.target.value)}
                  onPaste={warnOnPaste}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">Describe expression in cancerous cells</h4>
                <p className="text-xs text-gray-600 mb-1">
                  Hint: examples of over/under-expression (e.g., MYC high; TP53 low) and why those matter.
                </p>
                <textarea
                  value={answersData.compare.cancerDesc}
                  onChange={e => setField('compare.cancerDesc', e.target.value)}
                  onPaste={warnOnPaste}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
            </div>

            <h4 className="font-medium mb-2">Categorize each gene (Typical vs Suspicious)</h4>
            <p className="text-xs text-gray-600 mb-2">Use the cards below to help your decision.</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2">Gene</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {answersData.compare.table.map((row, idx) => (
                    <tr key={`${row.gene}-${idx}`} className="border-t">
                      <td className="px-4 py-2">
                        <input
                          value={row.gene}
                          onChange={e => {
                            const next = [...answersData.compare.table];
                            next[idx] = { ...next[idx], gene: e.target.value };
                            setField('compare.table', next);
                          }}
                          onPaste={warnOnPaste}
                          className="border border-gray-300 rounded px-2 py-1 w-56"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.category || ''}
                          onChange={e => {
                            const next = [...answersData.compare.table];
                            next[idx] = { ...next[idx], category: e.target.value };
                            setField('compare.table', next);
                          }}
                          className="border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">— choose —</option>
                          <option value="typical">Typical</option>
                          <option value="suspicious">Suspicious</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={row.notes || ''}
                          onChange={e => {
                            const next = [...answersData.compare.table];
                            next[idx] = { ...next[idx], notes: e.target.value };
                            setField('compare.table', next);
                          }}
                          onPaste={warnOnPaste}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                          placeholder="Why?"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Patterns you noticed</h4>
              <p className="text-xs text-gray-600 mb-1">
                Hint: trends across healthy vs cancerous; housekeeping vs candidates; “too loud/too quiet” pairs.
              </p>
              <textarea
                value={answersData.compare.patterns}
                onChange={e => setField('compare.patterns', e.target.value)}
                onPaste={warnOnPaste}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
                placeholder="Type your answer…"
              />
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </section>
        </section>

        {/* --- CARDS FIRST --- */}

        {/* Gene Cards */}
        <section id="gene-cards" className="space-y-4 scroll-mt-24">
          <h2 className="text-3xl font-bold text-center">Gene Cards</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            Use these visuals while you mark each gene <span className="font-medium">Typical</span> or <span className="font-medium">Suspicious</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GENE_CARDS.map(({ gene, file }, idx) => (
              <figure key={`${gene}-${idx}`} className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setLightbox({ src: imageUrl(file), alt: `${gene} gene card` })}
                  aria-label={`Open larger view of ${gene} gene card`}
                >
                  <div className="w-full h-56 bg-white flex items-center justify-center p-2">
                    <img
                      src={imageUrl(file)}
                      alt={`${gene} gene card`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </button>
                <figcaption className="p-4">
                  <h4 className="text-lg font-semibold">{gene}</h4>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Patient/Suspect Cards */}
        <section id="suspect-cards" className="space-y-4 scroll-mt-24">
          <h2 className="text-3xl font-bold text-center">Patient Cards</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            These tissue profiles show real expression patterns. Compare with the gene cards to decide whether cancer is likely.
            Tap a card to zoom.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUSPECT_CARD_FILES.map((file, idx) => (
              <figure key={`suspect-${idx}`} className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setLightbox({ src: imageUrl(file), alt: `Patient tissue card ${idx+1}` })}
                  aria-label={`Open larger view of patient tissue card ${idx+1}`}
                >
                  <div className="w-full h-56 bg-white flex items-center justify-center p-2">
                    <img
                      src={imageUrl(file)}
                      alt={`Patient tissue card ${idx+1}`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </button>
                <figcaption className="p-4 text-center">
                  <h4 className="text-lg font-semibold">Patient Case {idx+1}</h4>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Background: Hypotheses & Techniques (after cards per your request) */}
        <section id="background-hypothesis" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4">How Scientists Build a Testable Idea</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <h4 className="font-semibold mb-2">What is a hypothesis?</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>A clear, testable statement that predicts a relationship.</li>
                <li>Names the groups you’ll compare and the measurement you’ll use.</li>
                <li>Example A: <em>“Patient cases with high <b>MYC</b> and low <b>TP53</b> will show faster cell-cycle gene activity than controls.”</em></li>
                <li>Example B: <em>“<b>BRCA1</b> expression is lower in tumor tissue versus matched normal tissue from the same patient.”</em></li>
              </ul>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <h4 className="font-semibold mb-2">Common ways to test it</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><b>qPCR</b>: measures mRNA levels for specific genes (fast, targeted).</li>
                <li><b>RNA-seq</b>: measures mRNA across many genes (global view).</li>
                <li><b>Immunohistochemistry (IHC)</b>: stains proteins in tissue sections (where + how much).</li>
                <li><b>Imaging first</b>: Ultrasound/MRI/PET to locate masses; suspicious findings → biopsy → expression tests.</li>
              </ul>
            </div>
          </div>

          {/* Optional teacher-swappable video */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Short explainer (optional)</h4>
            <div className="rounded-xl overflow-hidden">
              <iframe
                className="w-full h-64 md:h-80 rounded-xl"
                src="https://www.youtube.com/embed/_NBo-GZDKOM"
                title="Cancer detection overview (teacher-provided video)"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* 3. Gene Detective */}
        <section id="gene-detective" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-2xl font-semibold mb-4">Gene Detective — Formulate a Hypothesis</h3>
            <div className="flex gap-3 mt-1">
              <a href="#gene-cards" className="text-primary-600 underline text-sm">Jump to cards ↑</a>
              <a href="#background-hypothesis" className="text-primary-600 underline text-sm">Jump to background ↑</a>
            </div>
          </div>

          <label className="block text-sm font-medium mb-1">
            A) Which patient cards looked <b>most suspicious</b>, and why?
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Refer to specific genes/patterns (e.g., “MYC looks very high while TP53 looks low in Case 2”).
          </p>
          <textarea
            value={answersData.detective.suspiciousNotes}
            onChange={e => setField('detective.suspiciousNotes', e.target.value)}
            onPaste={warnOnPaste}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            rows={3}
            placeholder="Type your observations…"
          />

          <label className="block text-sm font-medium mb-1">B) Write a clear, testable hypothesis.</label>
          <p className="text-xs text-gray-600 mb-2">
            Include groups and measurement. Example: “In Patient Case 3, <b>BRCA1</b> expression is lower than in matched normal tissue as measured by qPCR.”
          </p>
          <textarea
            value={answersData.detective.hypothesis}
            onChange={e => setField('detective.hypothesis', e.target.value)}
            onPaste={warnOnPaste}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            rows={3}
            placeholder="Type your hypothesis…"
          />

          <label className="block text-sm font-medium mb-1">C) Describe a simple experiment to test it.</label>
          <p className="text-xs text-gray-600 mb-2">
            Mention <em>samples</em> (e.g., tumor vs matched normal), <em>method</em> (qPCR/RNA-seq/IHC), <em>control</em> (housekeeping gene), and a
            <em> decision rule</em> (what result would support your hypothesis?).
          </p>
          <textarea
            value={answersData.detective.experimentPlan}
            onChange={e => setField('detective.experimentPlan', e.target.value)}
            onPaste={warnOnPaste}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            rows={3}
            placeholder="Type your plan…"
          />

          <label className="block text-sm font-medium mb-1">D) Sketch your experiment (describe or drop a link)</label>
          <p className="text-xs text-gray-600 mb-2">
            You can link a drawing (Drive/Docs) or describe your setup briefly (diagram, groups, arrows for workflow).
          </p>
          <input
            value={answersData.detective.experimentSketch}
            onChange={e => setField('detective.experimentSketch', e.target.value)}
            onPaste={warnOnPaste}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Link or short description"
          />

          <div className="flex justify-end mt-6">
            <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
              Save Section
            </button>
          </div>
        </section>

        {/* 4. Detection & Diagnosis (content block) */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4">Detection & Diagnosis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <h4 className="font-semibold mb-1">Imaging First</h4>
              <p className="text-sm text-gray-700">
                Ultrasound, MRI, PET can find masses. Concerning features (shape, vascularity, growth rate) may lead to biopsy and expression testing.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <h4 className="font-semibold mb-1">Known Mutations</h4>
              <p className="text-sm text-gray-700">
                Mutations like <span className="font-medium">BRCA1/2</span> increase risk; may trigger earlier testing and monitoring.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <h4 className="font-semibold mb-1">Multiple Methods</h4>
              <p className="text-sm text-gray-700">
                Diagnosis uses combined evidence (imaging, histology, gene expression) for the clearest picture.
              </p>
            </div>
          </div>
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

            <div className="bg-white rounded-xl p-6 shadow-sm mb-6 relative z-10 space-y-4">
              {[
                { q: 'Why are housekeeping genes helpful in expression studies?', a: 'Their fairly constant expression provides a baseline for comparisons with variable, cancer-linked genes.' },
                { q: 'Give one reason an oncogene might look “too loud.”', a: 'A mutation or amplification can increase transcription/translation, driving uncontrolled growth.' },
                { q: 'Give one reason a tumor suppressor might look “too quiet.”', a: 'Promoter methylation or loss-of-function mutation can reduce expression and remove growth brakes.' },
              ].map((item, idx) => (
                <details key={idx} className="border border-gray-200 rounded-lg transition-colors">
                  <summary className="cursor-pointer px-4 py-3 hover:bg-primary-50 rounded-lg flex justify-between items-center">
                    <h4 className="font-medium">{item.q}</h4>
                    <i className="fa-solid fa-chevron-down text-gray-500" />
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-gray-600 text-sm">{item.a}</div>
                </details>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm relative z-10">
              <h3 className="text-xl font-semibold mb-2 text-primary-700">Think & Respond</h3>
              <p className="text-gray-700 mb-2">
                Scenario: You observe high <b>MYC</b> expression and low <b>TP53</b> expression in a sample.
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Write one hypothesis and one measurement you’d use to test it (e.g., “qPCR of MYC and TP53 vs housekeeping gene”).
              </p>
              <textarea
                value={answersData.inquiry.think}
                onChange={e => setField('inquiry.think', e.target.value)}
                onPaste={warnOnPaste}
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
            {[
              { key: 'idSignals', label: 'What kinds of gene behavior can help identify cancer presence/absence?' },
              { key: 'overUnderExamples', label: 'Give one example of a gene being over-expressed (too loud) and one being under-expressed (too quiet). Why might each be concerning?' },
              { key: 'hkBaseline', label: 'Why are housekeeping genes a good baseline for comparison?' },
              { key: 'preBiopsyMethods', label: 'Before biopsy, what other methods might detect cancer presence?' },
            ].map(({ key, label }) => (
              <div key={key} className="flex flex-col">
                <label className="text-sm font-medium mb-1">{label}</label>
                <textarea
                  value={answersData.wrap[key]}
                  onChange={e => setField(`wrap.${key}`, e.target.value)}
                  onPaste={warnOnPaste}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
            ))}
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
            to="/sections/day-2"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 2
          </Link>
          <Link
            to="/sections/day-4"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            Go to Day 4
            <i className="fa-solid fa-arrow-right ml-2" />
          </Link>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center" />

      {/* Logout popup */}
      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}

      {/* Simple lightbox for cards */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <div
            className="relative max-w-[92vw] max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-10 right-0 text-white text-xl"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Day3Page;

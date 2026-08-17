// src/pages/Day3Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  CategorizeItems,
  PredictThenReveal,
  SentenceStarters,
  StepFlow,
  StageDesk,
  StructuredReflection,
  composeParts,
  decomposeText,
} from '../components/interactions';
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
 * The card images live in /public/images and are served at /images/<filename>.
 *
 * They used to be named "ChatGPT Image Aug 22, 2025 at 10_16_26 AM.png". The
 * comma is why nobody could see them: encodeURIComponent escapes it to %2C, and
 * the static-file middleware resolves paths with decodeURI, which leaves %2C
 * alone. The file was never found, so every card fell through to the SPA's
 * index.html and rendered as a broken image. The files are named plainly now.
 */
const GENE_CARD_FILES = [
  'gene-card-hk1.png',
  'gene-card-gapdh.png',
  'gene-card-brca1.png',
  'gene-card-brca2.png',
  'gene-card-tp53.png',
  'gene-card-myc.png',
];

const SUSPECT_CARD_FILES = [
  'patient-card-1.png',
  'patient-card-2.png',
  'patient-card-3.png',
];

const GENE_CARDS = DEFAULT_GENES.map((g, i) => ({
  gene: g.name.replace(/\s*\(.+?\)\s*$/, ''),
  fullLabel: g.name,
  type: g.type,
  file: GENE_CARD_FILES[i] || GENE_CARD_FILES[GENE_CARD_FILES.length - 1],
}));

const imageUrl = (filename) => `/images/${encodeURIComponent(filename)}`;

const GENE_CATEGORIES = [
  { value: 'typical', label: 'Typical' },
  { value: 'suspicious', label: 'Suspicious' },
];

// Parts of a good answer, named by the prompts themselves. The composed prose
// is written back to the same answer key the page has always used; the parts
// live under an additive sibling key so the builder can restore exactly.
const LOUD_QUIET_PARTS = [
  {
    key: 'lqLoud',
    label: 'Too loud (high expression)',
    hint: 'Which kind of gene is dangerous when it is over-expressed, and why?',
    placeholder: 'If an oncogene is too loud…',
  },
  {
    key: 'lqQuiet',
    label: 'Too quiet (low expression)',
    hint: 'Which kinds of gene are dangerous when they are under-expressed, and why?',
    placeholder: 'If a tumor suppressor or repair gene is too quiet…',
  },
];

const GENE_SYMBOLS = ['HK1', 'GAPDH', 'BRCA1', 'BRCA2', 'TP53', 'MYC'];

// The two "describe expression" prompts were blank boxes. The wording is
// unchanged; what changed is that the parts a good answer needs are now named,
// and the parts whose answer is a choice are tapped rather than typed.
const HEALTHY_PARTS = [
  {
    key: 'healthyHousekeeping',
    label: 'Housekeeping genes (HK1, GAPDH) look…',
    options: ['Steady and reliable', 'Swinging up and down', 'Switched off'],
  },
  {
    key: 'healthyCandidates',
    label: 'Cancer-linked genes (BRCA1/2, TP53, MYC) look…',
    options: ['Within their normal range', 'Far above normal', 'Far below normal'],
  },
  {
    key: 'healthyWhy',
    label: 'Why that pattern makes sense',
    placeholder: 'In a healthy cell the signals that turn genes up and down are still working, so…',
    starters: [
      'The cell still controls when each gene is switched on because…',
      'Housekeeping genes stay steady because…',
    ],
  },
];

const CANCER_PARTS = [
  {
    key: 'cancerLoud',
    label: 'Pick a gene that is too loud (over-expressed)',
    options: GENE_SYMBOLS,
  },
  {
    key: 'cancerQuiet',
    label: 'Pick a gene that is too quiet (under-expressed)',
    options: GENE_SYMBOLS,
  },
  {
    key: 'cancerWhy',
    label: 'Why those two changes matter',
    placeholder: 'A gene that is too loud can…, while a gene that is too quiet can…',
    starters: [
      'Too loud is dangerous because…',
      'Too quiet is dangerous because…',
      'Together these two changes mean…',
    ],
  },
];

const PATTERN_PARTS = [
  {
    key: 'patternPick',
    label: 'The pattern that stood out most',
    options: [
      'One gene too loud while another is too quiet',
      'Both housekeeping genes stayed steady',
      'A repair gene (BRCA1/BRCA2) was too quiet',
      'A growth gene (MYC) was too loud',
    ],
  },
  {
    key: 'patternWhy',
    label: 'Which genes and cases showed it',
    placeholder: 'Name the genes and the patient case where you saw it.',
    starters: [
      'The housekeeping genes were…',
      'The cancer-linked genes were different because…',
      'One pair that stood out was…',
    ],
  },
];

const SUSPICIOUS_PARTS = [
  {
    key: 'suspCase',
    label: 'The case that looked most suspicious',
    options: ['Patient Case 1', 'Patient Case 2', 'Patient Case 3'],
  },
  {
    key: 'suspEvidence',
    label: 'What you saw on that card',
    placeholder: 'Name the genes and whether each was over-, under- or normally expressed.',
    starters: ['In Case 1 I noticed…', 'In Case 2 I noticed…', 'In Case 3 I noticed…'],
  },
];

const HYPOTHESIS_PARTS = [
  {
    key: 'hypGroups',
    label: 'Groups being compared',
    placeholder: 'e.g., Patient Case 3 tumor tissue vs. matched normal tissue from the same patient',
    starters: ['Tumor tissue vs. matched normal tissue', 'Patient Case', 'Cancer samples vs. healthy controls'],
  },
  {
    key: 'hypGene',
    label: 'Gene you are focusing on',
    placeholder: 'e.g., BRCA1',
    rows: 1,
    starters: ['BRCA1', 'BRCA2', 'TP53', 'MYC'],
  },
  {
    key: 'hypDirection',
    label: 'What you predict will happen',
    placeholder: 'e.g., expression will be lower in the tumor tissue',
    starters: ['expression will be higher in', 'expression will be lower in', 'expression will be about the same in'],
  },
  {
    key: 'hypMeasurement',
    label: 'How you would measure it',
    placeholder: 'e.g., as measured by qPCR',
    rows: 1,
    starters: ['as measured by qPCR', 'as measured by RNA-seq', 'as measured by immunohistochemistry (IHC)'],
  },
];

const EXPERIMENT_PARTS = [
  {
    key: 'expSamples',
    label: 'Samples',
    hint: 'What exactly are you comparing?',
    placeholder: 'e.g., tumor tissue and matched normal tissue from five patients',
  },
  {
    key: 'expMethod',
    label: 'Method',
    hint: 'How will you actually measure expression?',
    placeholder: 'e.g., qPCR for the genes of interest',
    rows: 1,
    starters: ['qPCR', 'RNA-seq', 'Immunohistochemistry (IHC)'],
  },
  {
    key: 'expControl',
    label: 'Control',
    hint: 'What steady reference do you compare against?',
    placeholder: 'e.g., GAPDH as a housekeeping gene',
    rows: 1,
    starters: ['GAPDH (housekeeping gene)', 'HK1 (housekeeping gene)'],
  },
  {
    key: 'expDecision',
    label: 'Decision rule',
    hint: 'What result would support your hypothesis — and what result would not?',
    placeholder: 'e.g., support if BRCA1 is at least 2× lower in tumor tissue than in normal tissue',
    starters: ['My hypothesis is supported if…', 'My hypothesis is not supported if…'],
  },
];

const DAY3_INQUIRY = [
  {
    q: 'Why are housekeeping genes helpful in expression studies?',
    a: 'Their fairly constant expression provides a baseline for comparisons with variable, cancer-linked genes.',
  },
  {
    q: 'Give one reason an oncogene might look “too loud.”',
    a: 'A mutation or amplification can increase transcription/translation, driving uncontrolled growth.',
  },
  {
    q: 'Give one reason a tumor suppressor might look “too quiet.”',
    a: 'Promoter methylation or loss-of-function mutation can reduce expression and remove growth brakes.',
  },
];

// The wording of every wrap-up question is unchanged. Each one now offers the
// phrases it is fishing for as tap-to-insert starters, so the answer begins from
// a decision rather than from a blank box.
const DAY3_WRAP = [
  {
    key: 'idSignals',
    label: 'What kinds of gene behavior can help identify cancer presence/absence?',
    starters: [
      'A growth gene expressed far too loudly',
      'A tumor suppressor expressed far too quietly',
      'A repair gene that has been switched off',
      'Housekeeping genes drifting away from steady',
    ],
  },
  {
    key: 'overUnderExamples',
    label: 'Give one example of a gene being over-expressed (too loud) and one being under-expressed (too quiet). Why might each be concerning?',
    starters: ['MYC over-expressed…', 'TP53 under-expressed…', 'BRCA1 under-expressed…', 'This is concerning because…'],
  },
  {
    key: 'hkBaseline',
    label: 'Why are housekeeping genes a good baseline for comparison?',
    starters: ['They stay steady across cell types, so…', 'Without a baseline you cannot tell whether…'],
  },
  {
    key: 'preBiopsyMethods',
    label: 'Before biopsy, what other methods might detect cancer presence?',
    starters: ['Imaging (ultrasound, MRI, PET)', 'Blood tests', 'Family history and known mutations', 'Physical examination'],
  },
];

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
    // Introduction. `loudQuietParts` is additive — the composed prose still
    // lives in `loudQuietMeaning`, exactly as before.
    intro: { loudQuietMeaning: '', loudQuietParts: {} },

    // Comparing gene expression
    compare: {
      healthyDesc: '',
      healthyDescParts: {},
      cancerDesc: '',
      cancerDescParts: {},
      patterns: '',
      patternsParts: {},
      table: DEFAULT_GENES.map(g => ({
        gene: g.name,
        category: g.type === 'housekeeping' ? 'typical' : '',
        notes: '',
      })),
    },

    // Gene detective
    detective: {
      suspiciousNotes: '',
      suspiciousParts: {},
      hypothesis: '',
      hypothesisParts: {},
      experimentPlan: '',
      experimentPlanParts: {},
      experimentSketch: '',
    },

    // Inquiry & discussion
    inquiry: { think: '', predictions: ['', '', ''] },

    // Wrap-up
    wrap: {
      idSignals: '',
      overUnderExamples: '',
      hkBaseline: '',
      preBiopsyMethods: '',
    },
  });
  const answersDataRef = useRef(answersData);

  useEffect(() => {
    answersDataRef.current = answersData;
  }, [answersData]);

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
            merged.inquiry = {
              think: merged.inquiry?.think || '',
              predictions: Array.isArray(merged.inquiry?.predictions)
                ? merged.inquiry.predictions.slice(0, DAY3_INQUIRY.length)
                : Array(DAY3_INQUIRY.length).fill(''),
            };
            merged.intro = { loudQuietMeaning: '', loudQuietParts: {}, ...(merged.intro || {}) };
            merged.compare = {
              healthyDescParts: {},
              cancerDescParts: {},
              patternsParts: {},
              ...merged.compare,
            };
            merged.detective = {
              hypothesisParts: {},
              experimentPlanParts: {},
              suspiciousParts: {},
              ...(merged.detective || {}),
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

  /* -------------------------------- helpers -------------------------------- */
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

  // periodic autosave while dirty (every 15s)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 15000);
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

  /**
   * Write a response-builder's parts to their additive key AND the composed
   * prose to the key this page has always persisted, so the teacher dashboard
   * keeps reading a plain readable answer.
   */
  const setStructured = (partsPath, prosePath, parts, nextValues) => {
    setField(partsPath, nextValues);
    setField(prosePath, composeParts(parts, nextValues));
  };

  const appendTo = (path, current, text) => setField(path, current ? `${current} ${text}` : text);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading…</div>;

  // Anything a student wrote before these prompts became builders is shown back
  // to them rather than silently dropped.
  const loudQuietCarry = Object.keys(answersData.intro.loudQuietParts || {}).length
    ? ''
    : decomposeText(LOUD_QUIET_PARTS, answersData.intro.loudQuietMeaning).carryOver;
  const hypothesisCarry = Object.keys(answersData.detective.hypothesisParts || {}).length
    ? ''
    : decomposeText(HYPOTHESIS_PARTS, answersData.detective.hypothesis).carryOver;
  const experimentCarry = Object.keys(answersData.detective.experimentPlanParts || {}).length
    ? ''
    : decomposeText(EXPERIMENT_PARTS, answersData.detective.experimentPlan).carryOver;
  const healthyCarry = Object.keys(answersData.compare.healthyDescParts || {}).length
    ? ''
    : decomposeText(HEALTHY_PARTS, answersData.compare.healthyDesc).carryOver;
  const cancerCarry = Object.keys(answersData.compare.cancerDescParts || {}).length
    ? ''
    : decomposeText(CANCER_PARTS, answersData.compare.cancerDesc).carryOver;
  const patternsCarry = Object.keys(answersData.compare.patternsParts || {}).length
    ? ''
    : decomposeText(PATTERN_PARTS, answersData.compare.patterns).carryOver;
  const suspiciousCarry = Object.keys(answersData.detective.suspiciousParts || {}).length
    ? ''
    : decomposeText(SUSPICIOUS_PARTS, answersData.detective.suspiciousNotes).carryOver;

  const patientCardPane = (
    <div className="space-y-3">
      {/* Capped, because a full-width row of three portrait cards on a laptop
          is taller than the screen. The 2:3 box is width-driven, so the row
          keeps its height whether it is on the stage or in the corner dock. */}
      <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
        {SUSPECT_CARD_FILES.map((file, idx) => (
          <button
            key={`pane-suspect-${idx}`}
            type="button"
            className="rounded-lg border border-gray-200 bg-white p-1 hover:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            onClick={() => setLightbox({ src: imageUrl(file), alt: `Patient tissue card ${idx + 1}` })}
          >
            <img
              src={imageUrl(file)}
              alt={`Patient tissue card ${idx + 1}`}
              className="w-full aspect-[2/3] object-contain"
              loading="lazy"
            />
            <span className="block text-[11px] text-gray-600 mt-1">Case {idx + 1}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600">Tap a card to zoom. The full gallery is further up the page.</p>
    </div>
  );

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

          {/* 1. Intro to Gene Expression & Detection */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">What Does Gene Expression Look Like?</h3>
            <p className="text-gray-700 mb-4">
              Review your Day 1 and 2 notes on oncogenes, tumor suppressors, and DNA repair genes. Then answer:
            </p>
            <p className="block text-sm font-medium mb-3">
              If a gene is too “loud” (high expression) or too “quiet” (low expression), what might that mean? (Connect to
              oncogenes = often dangerous when <em>too loud</em>; tumor suppressors/repair = dangerous when <em>too quiet</em>.)
            </p>
            <StructuredReflection
              parts={LOUD_QUIET_PARTS}
              values={answersData.intro.loudQuietParts}
              carryOver={loudQuietCarry}
              onChange={(next) =>
                setStructured('intro.loudQuietParts', 'intro.loudQuietMeaning', LOUD_QUIET_PARTS, next)
              }
              hint="Two halves to the same idea — answer them one at a time."
            />
          </section>

          {/* 2. Comparing Gene Expression */}
          <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h3 className="text-2xl font-semibold mb-4">Comparing Gene Expression</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium mb-2">Describe expression in healthy cells</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Hint: housekeeping steady; cancer-linked genes within normal ranges and responding to signals.
                </p>
                <StructuredReflection
                  parts={HEALTHY_PARTS}
                  values={answersData.compare.healthyDescParts}
                  carryOver={healthyCarry}
                  onChange={(next) =>
                    setStructured('compare.healthyDescParts', 'compare.healthyDesc', HEALTHY_PARTS, next)
                  }
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">Describe expression in cancerous cells</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Hint: examples of over/under-expression (e.g., MYC high; TP53 low) and why those matter.
                </p>
                <StructuredReflection
                  parts={CANCER_PARTS}
                  values={answersData.compare.cancerDescParts}
                  carryOver={cancerCarry}
                  onChange={(next) =>
                    setStructured('compare.cancerDescParts', 'compare.cancerDesc', CANCER_PARTS, next)
                  }
                />
              </div>
            </div>

            <h4 className="font-medium mb-2">Categorize each gene (Typical vs Suspicious)</h4>
            <CategorizeItems
              hint="Each gene’s card is right here — you no longer have to scroll away to check it."
              categories={GENE_CATEGORIES}
              notesPlaceholder="Why?"
              onImageClick={(item) => setLightbox({ src: item.image, alt: item.imageAlt })}
              items={answersData.compare.table.map((row, idx) => {
                const card = GENE_CARDS[idx];
                return {
                  id: `${row.gene}-${idx}`,
                  label: row.gene,
                  hint: card?.type === 'housekeeping' ? 'Housekeeping gene' : 'Cancer-linked candidate',
                  image: card ? imageUrl(card.file) : undefined,
                  imageAlt: card ? `${card.gene} gene card` : '',
                };
              })}
              values={answersData.compare.table}
              onChange={(idx, next) => {
                const table = [...answersData.compare.table];
                table[idx] = { ...table[idx], category: next.category, notes: next.notes ?? table[idx].notes };
                setField('compare.table', table);
              }}
            />

            <div className="mt-6">
              <h4 className="font-medium mb-2">Patterns you noticed</h4>
              <p className="text-xs text-gray-600 mb-1">
                Hint: trends across healthy vs cancerous; housekeeping vs candidates; “too loud/too quiet” pairs.
              </p>
              <StructuredReflection
                parts={PATTERN_PARTS}
                values={answersData.compare.patternsParts}
                carryOver={patternsCarry}
                onChange={(next) =>
                  setStructured('compare.patternsParts', 'compare.patterns', PATTERN_PARTS, next)
                }
              />
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
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
                  <div className="w-full h-80 bg-white flex items-center justify-center p-2">
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
                  <div className="w-full h-80 bg-white flex items-center justify-center p-2">
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
            <h4 className="font-semibold mb-2">Short explainer</h4>
            <div className="w-full rounded-xl overflow-hidden ring-1 ring-gray-200 bg-black">
              <iframe
                className="w-full aspect-video max-h-[70vh] block"
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
              <a href="#gene-cards" className="text-primary-700 underline text-sm">Jump to cards ↑</a>
              <a href="#background-hypothesis" className="text-primary-700 underline text-sm">Jump to background ↑</a>
            </div>
          </div>

          <StageDesk media={patientCardPane} mediaTitle="Patient cards stay with you">
            <StepFlow
              hint="Observe, then hypothesise, then design. One step at a time — your work is saved as you go."
              steps={[
                {
                  id: 'observe',
                  title: 'A) What looked suspicious?',
                  hint: 'Refer to specific genes and patterns (e.g., “MYC looks very high while TP53 looks low in Case 2”).',
                  isComplete: SUSPICIOUS_PARTS.every(
                    ({ key }) => (answersData.detective.suspiciousParts?.[key] || '').trim()
                  ),
                  render: () => (
                    <StructuredReflection
                      parts={SUSPICIOUS_PARTS}
                      values={answersData.detective.suspiciousParts}
                      carryOver={suspiciousCarry}
                      onChange={(next) =>
                        setStructured(
                          'detective.suspiciousParts',
                          'detective.suspiciousNotes',
                          SUSPICIOUS_PARTS,
                          next
                        )
                      }
                    />
                  ),
                },
                {
                  id: 'hypothesis',
                  title: 'B) Write a testable hypothesis',
                  hint: 'A hypothesis needs four things. Build them one at a time and the full sentence assembles below.',
                  isComplete: HYPOTHESIS_PARTS.every(
                    ({ key }) => (answersData.detective.hypothesisParts?.[key] || '').trim()
                  ),
                  render: () => (
                    <StructuredReflection
                      parts={HYPOTHESIS_PARTS}
                      values={answersData.detective.hypothesisParts}
                      carryOver={hypothesisCarry}
                      onChange={(next) =>
                        setStructured('detective.hypothesisParts', 'detective.hypothesis', HYPOTHESIS_PARTS, next)
                      }
                      hint="Example: “In Patient Case 3, BRCA1 expression is lower than in matched normal tissue, as measured by qPCR.”"
                    />
                  ),
                },
                {
                  id: 'experiment',
                  title: 'C) Design an experiment to test it',
                  hint: 'Samples, method, control, and a decision rule — the four things a reviewer would look for.',
                  isComplete: EXPERIMENT_PARTS.every(
                    ({ key }) => (answersData.detective.experimentPlanParts?.[key] || '').trim()
                  ),
                  render: () => (
                    <StructuredReflection
                      parts={EXPERIMENT_PARTS}
                      values={answersData.detective.experimentPlanParts}
                      carryOver={experimentCarry}
                      onChange={(next) =>
                        setStructured(
                          'detective.experimentPlanParts',
                          'detective.experimentPlan',
                          EXPERIMENT_PARTS,
                          next
                        )
                      }
                    />
                  ),
                },
              ]}
            />

            <div className="flex justify-end">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </StageDesk>
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
              <p className="text-sm text-gray-600">
                Predict first, then compare. You will remember it far better than reading the answer straight away.
              </p>
              {DAY3_INQUIRY.map((item, idx) => (
                <PredictThenReveal
                  key={item.q}
                  question={item.q}
                  expertAnswer={item.a}
                  value={answersData.inquiry.predictions?.[idx] || ''}
                  onChange={(v) => setField(`inquiry.predictions[${idx}]`, v)}
                />
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
              <SentenceStarters
                starters={[
                  'MYC is driving growth while TP53 has lost its brakes, so…',
                  'I would measure MYC and TP53 by qPCR against GAPDH',
                  'I would compare tumor tissue with matched normal tissue',
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
            hint="Four questions, one at a time."
            steps={DAY3_WRAP.map(({ key, label, starters }) => ({
              id: key,
              title: label,
              isComplete: Boolean((answersData.wrap[key] || '').trim()),
              render: () => (
                <>
                  <textarea
                    value={answersData.wrap[key]}
                    onChange={e => setField(`wrap.${key}`, e.target.value)}
                    onPaste={warnOnPaste}
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
            to="/sections/day-2"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 2
          </Link>
          <Link
            to="/sections/day-4"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
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
          className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4"
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

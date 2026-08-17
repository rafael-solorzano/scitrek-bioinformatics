// src/pages/Day2Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  CardSelect,
  CarriedOverNote,
  MatchPairs,
  PredictThenReveal,
  SentenceStarters,
  StageDesk,
  StepFlow,
} from '../components/interactions';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

/* ------------------------------ content data ------------------------------ */

const CELL_CYCLE_PHASE_OPTIONS = [
  { label: 'Interphase', description: 'The cell grows, copies its DNA, and prepares to divide.', icon: 'fa-solid fa-hourglass-half' },
  { label: 'Mitosis (M phase)', description: 'The copied chromosomes are separated into two nuclei.', icon: 'fa-solid fa-arrows-split-up-and-left' },
  { label: 'Cytokinesis', description: 'The cytoplasm pinches apart.', icon: 'fa-solid fa-scissors' },
  { label: 'G0', description: 'A resting state outside the cycle.', icon: 'fa-solid fa-bed' },
  { label: 'Apoptosis', description: 'Programmed cell death.', icon: 'fa-solid fa-skull' },
];

const INTERPHASE_STEPS = [
  { key: 'interphaseG1', title: 'G1 — Gap/Growth 1', placeholder: 'G1 (Gap/Growth 1)…' },
  { key: 'interphaseS', title: 'S — Synthesis', placeholder: 'S (Synthesis)…' },
  { key: 'interphaseG2', title: 'G2 — Gap/Growth 2', placeholder: 'G2 (Gap/Growth 2)…' },
];

const MITOSIS_PHASES = ['prophase', 'metaphase', 'anaphase', 'telophase'];

const CANCER_GENE_TERMS = [
  { id: 'oncogenes', label: 'Oncogenes' },
  { id: 'tumorSuppressors', label: 'Tumor suppressor genes' },
  { id: 'dnaRepair', label: 'DNA repair genes' },
];

const CANCER_GENE_DEFINITIONS = [
  {
    id: 'accelerator',
    short: 'Stuck accelerator',
    text: 'Mutated or overactive versions push a cell to keep dividing when it should not — like an accelerator stuck down.',
  },
  {
    id: 'brakes',
    short: 'Failed brakes',
    text: 'They normally slow or halt division and can trigger repair or apoptosis — like the brakes. Losing them removes a stop signal.',
  },
  {
    id: 'proofreaders',
    short: 'Missing proofreaders',
    text: 'They find and fix errors in DNA before the cell divides — like proofreaders. Without them, mutations pile up.',
  },
];

const P53_ROLE_OPTIONS = [
  { label: 'transcription factor', description: 'It binds DNA and switches other genes on.' },
  { label: 'kinase', description: 'It adds phosphate groups to other proteins.' },
  { label: 'cell membrane receptor', description: 'It receives signals from outside the cell.' },
  { label: 'DNA repair enzyme', description: 'It physically repairs damaged DNA itself.' },
];

const MDM2_OPTIONS = [
  { label: 'Mdm2 tags p53 for degradation, so p53 levels drop' },
  { label: 'Mdm2 activates p53, so p53 levels rise' },
  { label: 'Mdm2 mutates the p53 gene directly' },
  { label: 'Mdm2 has no effect on p53' },
];

const CELLS_DO_OPTIONS = [
  { label: 'divide', description: 'Go through the cycle and make two cells.' },
  { label: 'stop dividing (arrest)', description: 'Pause at a checkpoint or drop into G0.' },
  { label: 'die by apoptosis', description: 'Self-destruct in a controlled way.' },
  { label: 'grow larger without dividing', description: 'Take in material but never split.' },
];

const TOO_FEW_OPTIONS = [
  { label: 'Wounds and injuries heal slowly or not at all' },
  { label: 'Tissues cannot replace worn-out or damaged cells' },
  { label: 'Blood cell counts drop, hurting oxygen delivery and immunity' },
];

const TOO_MANY_OPTIONS = [
  { label: 'A tumor forms as cells pile up' },
  { label: 'Growing cells crowd healthy tissue and stop it working' },
  { label: 'Cells with damaged DNA keep dividing and can spread' },
];

const DAY2_INQUIRY = [
  {
    q: 'If p53 is mutated and cannot activate repair or apoptosis, what happens to the cell cycle?',
    a: 'Cells can pass damaged DNA through checkpoints, increasing mutation load and potential tumor formation.',
  },
  {
    q: 'How might overactive Mdm2 impact p53 and cancer risk?',
    a: 'Mdm2 tags p53 for degradation; overactivity can reduce p53 levels, weakening crucial damage responses.',
  },
  {
    q: 'Name one environmental factor that could increase mutation rates. How might this affect regulators?',
    a: 'UV radiation can cause thymine dimers; checkpoint proteins and repair genes must respond or errors accumulate.',
  },
];

const WRAP_QUESTIONS = [
  { key: 'healthyDivision', q: 'What does healthy cellular division typically look like? What are the two main phases?' },
  { key: 'cancerVsNormal', q: 'How does cancer differ from normal cell growth?' },
  { key: 'threeGeneTypes', q: 'What are oncogenes, tumor suppressor genes, and DNA repair genes? Why are they important?' },
  { key: 'p53Normal', q: 'What is the normal function of p53 in a healthy cell?' },
  { key: 'mdm2OnP53', q: 'What is the effect of Mdm2 on p53?' },
  { key: 'whatIfRan', q: 'Describe one “what-if” you tested. What did you observe?' },
  { key: 'favVideo', q: 'Which video was your favorite and why?' },
  { key: 'favSim', q: 'Which simulation was your favorite and why?' },
];

/* ------------------------------ UI helpers -------------------------------- */

/** Auto-resizing textarea (grows to fit content) */
function AutoResizeTextarea({ value, onChange, className = '', rows = 2, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={rows}
      className={['resize-none', className].join(' ')}
      {...props}
    />
  );
}

/** PhET-style embed wrapper with blocked detection + controls */
function EmbedWithFallback({
  src,
  title,
  height = '70vh',
  // Allow common media features used by YouTube/Vimeo/HHMI wrappers
  allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write'
}) {
  const [loaded, setLoaded] = useState(false);
  const [maybeBlocked, setMaybeBlocked] = useState(false);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);

  const startWatchdog = () => {
    setLoaded(false);
    setMaybeBlocked(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMaybeBlocked(true);
    }, 3500);
  };

  useEffect(() => {
    startWatchdog();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src]);

  const onLoad = () => {
    setLoaded(true);
    setMaybeBlocked(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reload = () => {
    if (iframeRef.current) {
      try {
        const s = iframeRef.current.src;
        iframeRef.current.src = s;
      } catch (_) {}
    }
    startWatchdog();
  };

  return (
    <div className="bg-gray-100 rounded-xl p-3 md:p-4 relative overflow-hidden ring-1 ring-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-700">{title}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-white hover:bg-gray-50 border"
            onClick={reload}
            title="Reload"
          >
            <i className="fa-solid fa-rotate-right mr-1" /> Reload
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-sm rounded-md bg-white hover:bg-gray-50 border"
            title="Open in new tab"
          >
            <i className="fa-solid fa-up-right-from-square mr-1" /> Open in new tab
          </a>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-gray-700 text-sm z-10">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white shadow">
              <i className="fa-solid fa-spinner animate-spin" /> Loading…
            </div>
          </div>
        )}
        {maybeBlocked && !loaded && (
          <div className="absolute inset-x-3 top-3 z-20">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 text-xs flex items-center justify-between">
              <span>
                This site may block embeds in iframes. Use <b>Open in new tab</b> if this panel doesn’t appear.
              </span>
              <button
                onClick={reload}
                className="ml-3 px-2 py-1 border rounded bg-white hover:bg-amber-50"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          onLoad={onLoad}
          title={title}
          src={src}
          className="w-full bg-white"
          style={{ height }}
          allow={allow}
          loading="lazy"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-presentation"
        />
      </div>

      <p className="mt-2 text-xs text-gray-600">
        Trouble loading? School filters or site security rules can block embeds. Use “Open in new tab.”
      </p>
    </div>
  );
}

/* ------------------------------ Component --------------------------------- */

const Day2Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 2;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- AUTOSAVE state (Day5-style) ------------------------------------------
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);
  const unmountedRef = useRef(false);

  // Central answers model
  const [answersData, setAnswersData] = useState({
    cellCycle: {
      phasesTwo: ['', ''],
      interphaseG1: '',
      interphaseS: '',
      interphaseG2: '',
      mitosisSketch: {
        prophase: { drawing: '', desc: '' },
        metaphase: { drawing: '', desc: '' },
        anaphase: { drawing: '', desc: '' },
        telophase: { drawing: '', desc: '' },
      },
      cytokinesis: { drawing: '', desc: '' },
      postDivisionStage: '',
    },

    cancerBasics: {
      howDiffers: '',
      twoHallmarks: '',
      mutationsRole: '',
      earlyDetection: '',
    },

    p53Sim: {
      oncogenes: '',
      tumorSuppressors: '',
      dnaRepair: '',
      p53Function: '',
      p53TFBlank: '',
      mdm2Effect: '',
    },

    cycleSim: {
      cellsDo: ['', ''],
      apoptosis: '',
      badRegulators: '',
      tooFewCells: '',
      tooManyCells: '',
      phasesNotes: '',
      regulatorsNotes: '',
      whatIf: '',
      whatIfObservation: '',
    },

    // `predictions` is additive — it holds the answer a student commits to
    // before revealing the expert response for each inquiry prompt.
    inquiry: { think: '', predictions: ['', '', ''] },

    wrap: {
      healthyDivision: '',
      cancerVsNormal: '',
      threeGeneTypes: '',
      p53Normal: '',
      mdm2OnP53: '',
      whatIfRan: '',
      favVideo: '',
      favSim: '',
    },
  });
  const answersDataRef = useRef(answersData);

  useEffect(() => {
    answersDataRef.current = answersData;
  }, [answersData]);

  /* -------------------------- lifecycle & data load ------------------------- */

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const normalizeAnswers = (payload) => {
      setAnswersData((prev) => {
        const next = { ...prev, ...(payload || {}) };
        // Older saves predate the prediction field and the array-valued
        // multi-selects; fill them in without touching anything else.
        next.inquiry = {
          think: next.inquiry?.think || '',
          predictions: Array.isArray(next.inquiry?.predictions)
            ? next.inquiry.predictions.slice(0, DAY2_INQUIRY.length)
            : Array(DAY2_INQUIRY.length).fill(''),
        };
        next.cellCycle = {
          ...prev.cellCycle,
          ...(next.cellCycle || {}),
          phasesTwo: Array.isArray(next.cellCycle?.phasesTwo) ? next.cellCycle.phasesTwo : ['', ''],
        };
        next.cycleSim = {
          ...prev.cycleSim,
          ...(next.cycleSim || {}),
          cellsDo: Array.isArray(next.cycleSim?.cellsDo) ? next.cycleSim.cellsDo : ['', ''],
        };
        return next;
      });
    };

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!active) return;
        setUser(u);

        let data = null;
        try {
          data = await getResponseDetail(moduleId);
        } catch {
          // treat 404 as no previous answers
        }
        if (!active) return;

        if (data?.answers) {
          const payload = data.answers.answers || data.answers;
          normalizeAnswers(payload);
          setDirty(false);
          setLastSavedAt(new Date());
        } else {
          normalizeAnswers(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [moduleId]);

  /* ------------------------------ saving logic ------------------------------ */

  const saveAnswers = async ({ silent = true } = {}) => {
    if (saving) return;

    try {
      setSaving(true);
      await upsertResponse(moduleId, answersDataRef.current);
      if (!unmountedRef.current) {
        setDirty(false);
        setLastSavedAt(new Date());
      }
      if (!silent) alert('Your work has been saved!');
    } catch (e) {
      if (!silent) alert('Error saving. Please try again.');
    } finally {
      if (!unmountedRef.current) setSaving(false);
    }
  };

  const markDirtyAndDebounce = () => {
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
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

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

  const handleSave = async () => {
    await saveAnswers({ silent: false });
  };

  const handleLogout = async () => {
    if (dirty && !saving) {
      await saveAnswers({ silent: true });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  /* ------------------------------- helpers --------------------------------- */

  const setField = (path, value) => {
    setAnswersData((prev) => {
      const clone =
        typeof structuredClone === 'function'
          ? structuredClone(prev)
          : JSON.parse(JSON.stringify(prev));

      // eslint-disable-next-line no-new-func
      new Function('obj', 'value', `obj.${path} = value;`)(clone, value);
      Promise.resolve().then(markDirtyAndDebounce);
      return clone;
    });
  };

  /** Append a sentence starter to an existing free-text answer. */
  const appendTo = (path, current, text) =>
    setField(path, current ? `${current} ${text}` : text);

  /** Which value in `list` (if any) the stored string corresponds to. */
  const isKnown = (list, stored) => list.some((o) => o.label === stored);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  // MatchPairs works in definition ids; the page still persists the definition
  // text, so existing answers stay readable on the teacher dashboard.
  const geneMatchValues = CANCER_GENE_TERMS.reduce((acc, term) => {
    const stored = answersData.p53Sim[term.id];
    const def = CANCER_GENE_DEFINITIONS.find((d) => d.text === stored);
    if (def) acc[term.id] = def.id;
    return acc;
  }, {});

  // Full width on the stage and sized by ratio, so the same node is large while
  // watching and small in the corner dock without ever being remounted.
  const cellCycleVideo = (
    <div className="w-full rounded-xl overflow-hidden ring-1 ring-gray-200 bg-black">
      <iframe
        className="w-full aspect-video max-h-[70vh] block"
        src="https://www.youtube-nocookie.com/embed/zNJJ_C2j4gk"
        title="Cell Cycle - Osmosis / Elsevier"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );

  const cancerVideo = (
    <div className="w-full rounded-xl overflow-hidden ring-1 ring-gray-200 bg-black">
      <iframe
        className="w-full aspect-video max-h-[70vh] block"
        src="https://www.youtube-nocookie.com/embed/tsXnVu3kUnM"
        title="What is Cancer and How Does it Start? - Cancer Research UK"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );

  /* --------------------------------- UI ------------------------------------ */

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
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

      {user ? (
        <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />
      ) : (
        <div className="container mx-auto px-4">
          <div className="animate-pulse h-14 bg-gray-200 rounded-xl mb-4" />
        </div>
      )}

      <main className="container mx-auto px-4 py-8 space-y-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 2: Understanding Cancer</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">Cell Cycle, Mutations & Regulation Gone Wrong</h2>
        </div>

        <section id="scenario" className="mb-4">
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center text-primary-800">
              <i className="fa-solid fa-user-doctor text-primary-500 mr-2" /> Case Spark: Genetic Risk & Decisions
            </h3>
            <p className="text-sm md:text-base text-gray-800">
              A patient learns she carries a <b>BRCA1</b> variant associated with higher risk of breast and ovarian cancer.
              What does this mean for her cells? How could <b>p53</b>, cell-cycle checkpoints, and regulators like <b>Mdm2</b>
              change the outcome? As you go through today’s activities, collect evidence to explain how gene regulation
              can push cells toward healthy division—or cancer.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Facilitator tip: Provide <b>noise-cancelling headphones</b> for videos—classroom discussions can get loud.
            </p>
          </div>
        </section>

        <section id="objective-section" className="mb-12">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-primary-700">
              <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
              Objective
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Investigate what happens when the “instructions” inside a cell break down—leading to uncontrolled growth
              (cancer). Prepare for Days 3–4 by learning healthy vs. harmful cell division, explore p53 and regulators
              like Mdm2, and see why cancer is a problem of cell-cycle regulation gone wrong.
            </p>
          </div>
        </section>

        <section id="plan-section" className="mb-12">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <i className="fa-solid fa-list-check text-primary-500 mr-3" />
              What's the Plan?
            </h2>
            <ul className="space-y-4">
              {[
                'Watch: The Cell Cycle (healthy division)',
                'Watch: What is Cancer & how does it start?',
                'Activity: p53 Gene & Cancer (HHMI BioInteractive)',
                'Activity: Eukaryotic Cell Cycle & Cancer (HHMI BioInteractive)',
                'Wrap-Up: Synthesize what you learned'
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

        <section id="activities-header" className="mb-2">
          <h2 className="text-3xl font-bold text-center">Activities</h2>
        </section>

        <section id="watch-part-1" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-video text-primary-500 mr-3" />
            Watch & Learn — Part 1: Cell Cycle
          </h3>

          <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mb-4">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>Watch first, then answer below. The video stays on screen while you work.</span>
          </p>

          <StageDesk media={cellCycleVideo} mediaTitle="Cell Cycle — Osmosis">
            <div className="space-y-8 text-sm">
              <div>
                <p className="font-medium mb-2">1) What are the two phases of the cell cycle?</p>
                <CardSelect
                  multi
                  max={2}
                  columns={2}
                  legend="Choose exactly two"
                  hint="The other options are real biology terms — but they are not the two phases of the cycle itself."
                  options={CELL_CYCLE_PHASE_OPTIONS}
                  value={answersData.cellCycle.phasesTwo.filter(Boolean)}
                  onChange={(vals) => setField('cellCycle.phasesTwo', [vals[0] || '', vals[1] || ''])}
                />
              </div>

              <div>
                <p className="font-medium mb-2">2) Describe the three subphases of interphase.</p>
                <StepFlow
                  steps={INTERPHASE_STEPS.map(({ key, title, placeholder }) => ({
                    id: key,
                    title,
                    isComplete: Boolean((answersData.cellCycle[key] || '').trim()),
                    render: () => (
                      <AutoResizeTextarea
                        value={answersData.cellCycle[key]}
                        onChange={(e) => setField(`cellCycle.${key}`, e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        rows={3}
                        placeholder={placeholder}
                        aria-label={title}
                      />
                    ),
                  }))}
                />
              </div>

              <div>
                <p className="font-medium mb-2">3) Describe the four phases of mitosis:</p>
                <StepFlow
                  hint="One phase at a time — pause the video on that phase before you write."
                  steps={MITOSIS_PHASES.map((phase) => {
                    const title = phase[0].toUpperCase() + phase.slice(1);
                    return {
                      id: phase,
                      title,
                      hint: 'What are the chromosomes, spindle, and nuclear membrane doing?',
                      isComplete: Boolean((answersData.cellCycle.mitosisSketch[phase].desc || '').trim()),
                      render: () => (
                        <AutoResizeTextarea
                          value={answersData.cellCycle.mitosisSketch[phase].desc}
                          onChange={(e) => setField(`cellCycle.mitosisSketch.${phase}.desc`, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          rows={3}
                          placeholder={`${title} — describe what you see (chromosomes, spindle, nucleus, etc.)`}
                          aria-label={title}
                        />
                      ),
                    };
                  })}
                />
              </div>

              <div>
                <p className="font-medium mb-2">4) Describe a cell in cytokinesis.</p>
                <AutoResizeTextarea
                  value={answersData.cellCycle.cytokinesis.desc}
                  onChange={(e) => setField('cellCycle.cytokinesis.desc', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Membrane pinches; two daughter cells separate…"
                />
              </div>

              <div>
                <p className="font-medium mb-2">
                  5) When cells no longer need to divide, what stage do they enter? Describe.
                </p>
                <AutoResizeTextarea
                  value={answersData.cellCycle.postDivisionStage}
                  onChange={(e) => setField('cellCycle.postDivisionStage', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="e.g., G0 — quiescent/resting phase…"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                >
                  Save Answers
                </button>
              </div>
            </div>
          </StageDesk>
        </section>

        <section id="watch-part-2" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-video text-primary-500 mr-3" />
            Watch & Learn — Part 2: What is Cancer?
          </h3>

          <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mb-4">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>Watch first, then answer below. The video stays on screen while you work.</span>
          </p>

          <StageDesk
            media={cancerVideo}
            mediaTitle="What is Cancer and How Does it Start? — Cancer Research UK"
          >
            <h4 className="text-xl font-semibold">After the video</h4>
            <StepFlow
              hint="Four questions, one at a time. Your answers are saved as you go."
              steps={[
                {
                  id: 'howDiffers',
                  title: 'Cancer vs. normal growth',
                  hint: 'How does cancer differ from normal cell growth?',
                  isComplete: Boolean((answersData.cancerBasics.howDiffers || '').trim()),
                  render: () => (
                    <>
                      <AutoResizeTextarea
                        value={answersData.cancerBasics.howDiffers}
                        onChange={(e) => setField('cancerBasics.howDiffers', e.target.value)}
                        className="w-full border border-gray-300 rounded p-3"
                        rows={3}
                        placeholder="Type your answer…"
                        aria-label="How does cancer differ from normal cell growth?"
                      />
                      <SentenceStarters
                        starters={[
                          'Normal cells divide only when…',
                          'Cancer cells ignore the signal to…',
                          'Another difference is that cancer cells…',
                        ]}
                        onInsert={(t) => appendTo('cancerBasics.howDiffers', answersData.cancerBasics.howDiffers, t)}
                      />
                    </>
                  ),
                },
                {
                  id: 'twoHallmarks',
                  title: 'Two hallmarks',
                  hint: 'Name and describe two hallmarks of cancer from the video.',
                  isComplete: Boolean((answersData.cancerBasics.twoHallmarks || '').trim()),
                  render: () => (
                    <>
                      <AutoResizeTextarea
                        value={answersData.cancerBasics.twoHallmarks}
                        onChange={(e) => setField('cancerBasics.twoHallmarks', e.target.value)}
                        className="w-full border border-gray-300 rounded p-3"
                        rows={3}
                        placeholder="Type your answer…"
                        aria-label="Name and describe two hallmarks of cancer from the video"
                      />
                      <SentenceStarters
                        label="Hallmarks mentioned in the video — tap one to start:"
                        starters={[
                          'Sustained growth signalling —',
                          'Ignoring signals to stop growing —',
                          'Avoiding cell death (apoptosis) —',
                          'Growing new blood vessels —',
                          'Invading nearby tissue and spreading —',
                        ]}
                        onInsert={(t) => appendTo('cancerBasics.twoHallmarks', answersData.cancerBasics.twoHallmarks, t)}
                      />
                    </>
                  ),
                },
                {
                  id: 'mutationsRole',
                  title: 'The role of mutations',
                  hint: 'What role do mutations play in cancer development?',
                  isComplete: Boolean((answersData.cancerBasics.mutationsRole || '').trim()),
                  render: () => (
                    <AutoResizeTextarea
                      value={answersData.cancerBasics.mutationsRole}
                      onChange={(e) => setField('cancerBasics.mutationsRole', e.target.value)}
                      className="w-full border border-gray-300 rounded p-3"
                      rows={3}
                      placeholder="Type your answer…"
                      aria-label="What role do mutations play in cancer development?"
                    />
                  ),
                },
                {
                  id: 'earlyDetection',
                  title: 'Stretch: why early detection matters',
                  hint: 'The CR-UK video doesn’t cover this directly — answer using your understanding of tumor growth and treatment outcomes.',
                  isComplete: Boolean((answersData.cancerBasics.earlyDetection || '').trim()),
                  render: () => (
                    <AutoResizeTextarea
                      value={answersData.cancerBasics.earlyDetection}
                      onChange={(e) => setField('cancerBasics.earlyDetection', e.target.value)}
                      className="w-full border border-gray-300 rounded p-3"
                      rows={3}
                      placeholder="Use your prior knowledge and today’s concepts…"
                      aria-label="Why is early detection important?"
                    />
                  ),
                },
              ]}
            />

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
              >
                Save Answers
              </button>
            </div>
          </StageDesk>
        </section>

        <section id="sim-p53" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-flask-vial text-primary-500 mr-3" />
            Activity: Online Simulation — p53 Gene & Cancer
          </h3>

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-2">How to use this simulation</h4>
            <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
              <li>Open the simulation page and click <b>Start Interactive</b>.</li>
              <li>Use the left sidebar to move through slides; answer the questions below after each relevant slide.</li>
              <li>
                Focus on: <b>oncogenes</b>, <b>tumor suppressor genes</b>, <b>DNA repair genes</b>, <b>p53</b>, and <b>Mdm2</b>.
              </li>
              <li>If you get lost, return to the slide list and re-open the slide mentioned in the question label.</li>
            </ol>
          </div>

          <StageDesk
            showTitleOnStage={false}
            mediaTitle="HHMI BioInteractive — p53 Gene & Cancer"
            media={
              <EmbedWithFallback
                src="https://media.hhmi.org/biointeractive/click/p53/01.html?_gl=1*1pyukss*_ga*NjQ2NDY1NDE5LjE3NDc0MTYwNDE.*_ga_H0E1KHGJBH*czE3NTc2NDgyOTQkbzIkZzEkdDE3NTc2NDkzNjQkajYwJGwwJGgw"
                title="HHMI BioInteractive — p53 Gene & Cancer"
                height="65vh"
              />
            }
          >
            <div className="space-y-8 text-sm">
              <div>
                <p className="font-medium mb-1">Slide 2 — Three kinds of cancer-related genes</p>
                <MatchPairs
                  legend="Match each kind of gene to what it does"
                  hint="These three are easy to mix up, so they are side by side on purpose."
                  terms={CANCER_GENE_TERMS}
                  definitions={CANCER_GENE_DEFINITIONS}
                  values={geneMatchValues}
                  onChange={(termId, defId) =>
                    setField(
                      `p53Sim.${termId}`,
                      defId ? CANCER_GENE_DEFINITIONS.find((d) => d.id === defId).text : ''
                    )
                  }
                />
                {CANCER_GENE_TERMS.filter((t) => answersData.p53Sim[t.id] && !geneMatchValues[t.id]).map((t) => (
                  <CarriedOverNote
                    key={t.id}
                    label={`Your earlier answer for ${t.label}`}
                    text={answersData.p53Sim[t.id]}
                  />
                ))}
              </div>

              <div>
                <p className="font-medium mb-1">Slide 3 — Normal function of <b>p53</b> in a healthy cell?</p>
                <AutoResizeTextarea
                  value={answersData.p53Sim.p53Function}
                  onChange={(e) => setField('p53Sim.p53Function', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Type your answer…"
                  aria-label="Normal function of p53 in a healthy cell"
                />
                <SentenceStarters
                  starters={[
                    'When DNA is damaged, p53…',
                    'If the damage can be fixed, p53…',
                    'If the damage is too severe, p53…',
                  ]}
                  onInsert={(t) => appendTo('p53Sim.p53Function', answersData.p53Sim.p53Function, t)}
                />
              </div>

              <div>
                <p className="font-medium mb-1">Slide 5 — “p53 functions primarily as a ________.”</p>
                <CardSelect
                  legend="Fill the blank"
                  columns={2}
                  options={P53_ROLE_OPTIONS}
                  value={answersData.p53Sim.p53TFBlank}
                  onChange={(v) => setField('p53Sim.p53TFBlank', v)}
                />
                {!isKnown(P53_ROLE_OPTIONS, answersData.p53Sim.p53TFBlank) ? (
                  <CarriedOverNote text={answersData.p53Sim.p53TFBlank} />
                ) : null}
              </div>

              <div>
                <p className="font-medium mb-1">Slide 6 — Effect of <b>Mdm2</b> on p53?</p>
                <CardSelect
                  legend="Choose the effect the simulation describes"
                  columns={1}
                  options={MDM2_OPTIONS}
                  value={answersData.p53Sim.mdm2Effect}
                  onChange={(v) => setField('p53Sim.mdm2Effect', v)}
                />
                {!isKnown(MDM2_OPTIONS, answersData.p53Sim.mdm2Effect) ? (
                  <CarriedOverNote text={answersData.p53Sim.mdm2Effect} />
                ) : null}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                >
                  Save Answers
                </button>
              </div>
            </div>
          </StageDesk>
        </section>

        <section id="sim-cycle" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-microscope text-primary-500 mr-3" />
            Activity: Online Simulation — Eukaryotic Cell Cycle & Cancer
          </h3>

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-2">How to navigate this simulation</h4>
            <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
              <li>Click <b>Open in new tab</b>. The simulation currently does not run when embedded.</li>
              <li>Click <b>Start Interactive</b>. Use the <b>top tabs</b> (Overview, Phases, Regulators, Overview of Cancer).</li>
              <li>As you open each tab, read the short panels on the left; some have animations or interactive toggles.</li>
              <li>Answer the questions below labelled with the section (e.g., “Cell Cycle Phases”).</li>
              <li>For “what-if” tests, use the interactive toggles (e.g., disable checkpoints, change protein levels), then note what you observe.</li>
            </ol>
            <p className="text-xs text-gray-600 mt-1">
              Tip: If lost, return to the <b>Overview</b> tab, then proceed left-to-right.
            </p>
          </div>

          <StageDesk
            showTitleOnStage={false}
            mediaTitle="HHMI BioInteractive — Eukaryotic Cell Cycle & Cancer"
            media={
              <EmbedWithFallback
                src="https://media.hhmi.org/biointeractive/click/cellcycle/?_gl=1*1e5q9o3*_ga*NjQ2NDY1NDE5LjE3NDc0MTYwNDE.*_ga_H0E1KHGJBH*czE3NTgwNzEzOTAkbzMkZzAkdDE3NTgwNzEzOTAkajYwJGwwJGgw"
                title="HHMI BioInteractive — Eukaryotic Cell Cycle & Cancer"
                height="65vh"
              />
            }
          >
            <div className="space-y-8 text-sm">
              <div>
                <p className="font-medium mb-1">
                  Overview — Molecular signals can cause cells to <b>divide</b>, ________, or ________.
                </p>
                <CardSelect
                  multi
                  max={2}
                  columns={2}
                  legend="Choose the two missing outcomes"
                  hint="Slide numbers are shown in the simulation sidebar."
                  options={CELLS_DO_OPTIONS}
                  value={answersData.cycleSim.cellsDo.filter(Boolean)}
                  onChange={(vals) => setField('cycleSim.cellsDo', [vals[0] || '', vals[1] || ''])}
                />
              </div>

              <div>
                <p className="font-medium mb-1">Overview — What is <b>apoptosis</b>, and why is it beneficial?</p>
                <AutoResizeTextarea
                  value={answersData.cycleSim.apoptosis}
                  onChange={(e) => setField('cycleSim.apoptosis', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Type your answer…"
                  aria-label="What is apoptosis, and why is it beneficial?"
                />
              </div>

              <div>
                <p className="font-medium mb-1">
                  Regulators &amp; Cancer — What happens if cell cycle regulators don’t function properly?
                </p>
                <AutoResizeTextarea
                  value={answersData.cycleSim.badRegulators}
                  onChange={(e) => setField('cycleSim.badRegulators', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Type your answer…"
                  aria-label="What happens if cell cycle regulators don’t function properly?"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="font-medium mb-1">Give one issue that arises with <b>too few</b> cells.</p>
                  <CardSelect
                    legend="Pick one"
                    columns={1}
                    options={TOO_FEW_OPTIONS}
                    value={answersData.cycleSim.tooFewCells}
                    onChange={(v) => setField('cycleSim.tooFewCells', v)}
                  />
                  {!isKnown(TOO_FEW_OPTIONS, answersData.cycleSim.tooFewCells) ? (
                    <CarriedOverNote text={answersData.cycleSim.tooFewCells} />
                  ) : null}
                </div>
                <div>
                  <p className="font-medium mb-1">Give one issue that arises with <b>too many</b> cells.</p>
                  <CardSelect
                    legend="Pick one"
                    columns={1}
                    options={TOO_MANY_OPTIONS}
                    value={answersData.cycleSim.tooManyCells}
                    onChange={(v) => setField('cycleSim.tooManyCells', v)}
                  />
                  {!isKnown(TOO_MANY_OPTIONS, answersData.cycleSim.tooManyCells) ? (
                    <CarriedOverNote text={answersData.cycleSim.tooManyCells} />
                  ) : null}
                </div>
              </div>

              <div>
                <p className="font-medium mb-1">Cell Cycle Phases — Notes (G1, S, G2, M + checkpoints)</p>
                <AutoResizeTextarea
                  value={answersData.cycleSim.phasesNotes}
                  onChange={(e) => setField('cycleSim.phasesNotes', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="After exploring the simulation, type your notes here. This is important for Day 3 and 4"
                  aria-label="Cell Cycle Phases notes"
                />
              </div>

              <div>
                <p className="font-medium mb-1">Regulators &amp; Cancer — Notes</p>
                <AutoResizeTextarea
                  value={answersData.cycleSim.regulatorsNotes}
                  onChange={(e) => setField('cycleSim.regulatorsNotes', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="After exploring the simulation, type your notes here. This is important for Day 3 and 4"
                  aria-label="Regulators and Cancer notes"
                />
              </div>

              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <h5 className="font-semibold mb-2">Run a what-if test</h5>
                <StepFlow
                  steps={[
                    {
                      id: 'setup',
                      title: 'Set it up',
                      hint: 'Use the simulation toggles to change one thing, then say what you changed.',
                      isComplete: Boolean((answersData.cycleSim.whatIf || '').trim()),
                      render: () => (
                        <>
                          <AutoResizeTextarea
                            value={answersData.cycleSim.whatIf}
                            onChange={(e) => setField('cycleSim.whatIf', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            rows={2}
                            placeholder="Describe the setup…"
                            aria-label="What-if scenario setup"
                          />
                          <SentenceStarters
                            label="Not sure what to try? Tap one:"
                            starters={[
                              'I turned p53 off.',
                              'I overexpressed cyclin D.',
                              'I disabled the G2/M checkpoint arrest.',
                            ]}
                            onInsert={(t) => appendTo('cycleSim.whatIf', answersData.cycleSim.whatIf, t)}
                          />
                        </>
                      ),
                    },
                    {
                      id: 'observe',
                      title: 'What happened?',
                      hint: 'Describe what you actually saw, not what you expected.',
                      isComplete: Boolean((answersData.cycleSim.whatIfObservation || '').trim()),
                      render: () => (
                        <AutoResizeTextarea
                          value={answersData.cycleSim.whatIfObservation}
                          onChange={(e) => setField('cycleSim.whatIfObservation', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          rows={2}
                          placeholder="What did you see?"
                          aria-label="What-if observation"
                        />
                      ),
                    },
                  ]}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                >
                  Save Answers
                </button>
              </div>
            </div>
          </StageDesk>

          <p className="text-xs text-gray-500 mt-3">
            Facilitator tip: Before students begin, demo the navigation quickly (tabs, slide list, toggles) to reduce confusion.
          </p>
        </section>

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
              {DAY2_INQUIRY.map((item, idx) => (
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
              <h3 className="text-xl font-semibold mb-4 text-primary-700">Think & Respond</h3>
              <p className="text-gray-700 mb-4">
                Scenario: A cell has severe DNA damage, p53 is mutated, and cyclin D is overexpressed. Predict what
                happens at the G1/S checkpoint.
              </p>
              <AutoResizeTextarea
                value={answersData.inquiry.think}
                onChange={(e) => setField('inquiry.think', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Type your response here..."
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                >
                  Submit Response
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="wrap-up-section" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-flag-checkered text-primary-500 mr-3" />
            Wrap-Up & Reflection
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            Eight questions, one at a time. Everything you wrote earlier today is still saved — this is where you pull it together.
          </p>

          <StepFlow
            steps={WRAP_QUESTIONS.map(({ key, q }) => {
              const id = `wrap-${key}`;
              return {
                id: key,
                title: q,
                isComplete: Boolean((answersData.wrap[key] ?? '').trim()),
                render: () => (
                  <>
                    <label htmlFor={id} className="sr-only">
                      {q}
                    </label>
                    <AutoResizeTextarea
                      id={id}
                      value={answersData.wrap[key] ?? ''}
                      onChange={(e) => setField(`wrap.${key}`, e.target.value)}
                      className="w-full border border-gray-300 rounded p-3"
                      rows={4}
                      placeholder="Type your answer…"
                    />
                    {key === 'favVideo' ? (
                      <SentenceStarters
                        label="Today’s videos:"
                        starters={['The Cell Cycle video, because…', 'The What is Cancer? video, because…']}
                        onInsert={(t) => appendTo('wrap.favVideo', answersData.wrap.favVideo, t)}
                      />
                    ) : null}
                    {key === 'favSim' ? (
                      <SentenceStarters
                        label="Today’s simulations:"
                        starters={['The p53 Gene & Cancer simulation, because…', 'The Eukaryotic Cell Cycle & Cancer simulation, because…']}
                        onInsert={(t) => appendTo('wrap.favSim', answersData.wrap.favSim, t)}
                      />
                    ) : null}
                  </>
                ),
              };
            })}
          />

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
            >
              Save Reflection
            </button>
          </div>
        </section>

        <div className="flex justify-center">
          <button
            onClick={handleSave}
            className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-6 rounded-lg"
          >
            Save
          </button>
        </div>

        <div className="flex justify-between">
          <Link
            to="/sections/day-1"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 1
          </Link>
          <Link
            to="/sections/day-3"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
          >
            Go to Day 3
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

export default Day2Page;

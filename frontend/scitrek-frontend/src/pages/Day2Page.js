// src/pages/Day2Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

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
      // If not loaded by now, it may be blocked by X-Frame-Options/CSP
      setMaybeBlocked(true);
    }, 3500);
  };

  useEffect(() => {
    startWatchdog();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [src]);

  const onLoad = () => {
    setLoaded(true);
    setMaybeBlocked(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reload = () => {
    if (iframeRef.current) {
      try {
        // Force reload by resetting src
        const s = iframeRef.current.src;
        iframeRef.current.src = s;
      } catch (_) {}
    }
    startWatchdog();
  };

  return (
    <div className="bg-gray-100 rounded-xl p-3 md:p-4 relative overflow-hidden ring-1 ring-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-800">{title}</div>
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-gray-800 text-sm z-10">
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
          // IMPORTANT: include allow-presentation to silence Cast/Presentation API errors from the embed
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-presentation"
        />
      </div>

      <p className="mt-2 text-xs text-gray-800">
        Trouble loading? School filters or site security rules can block embeds. Use “Open in new tab.”
      </p>
    </div>
  );
}

/* ------------------------------ Component --------------------------------- */

const Day2Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 2; // default to Day 2

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
    // Watch & Learn (Cell Cycle video)
    cellCycle: {
      phasesTwo: ['', ''], // Interphase, Mitosis
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

    // Watch & Learn (Cancer Research UK video)
    cancerBasics: {
      howDiffers: '',
      twoHallmarks: '',
      mutationsRole: '',
      // Early detection not covered in this video; keep as an optional stretch
      earlyDetection: '',
    },

    // Activity 1: p53 Gene & Cancer
    p53Sim: {
      oncogenes: '',
      tumorSuppressors: '',
      dnaRepair: '',
      p53Function: '',
      p53TFBlank: '', // "transcription factor"
      mdm2Effect: '',
    },

    // Activity 2: Eukaryotic Cell Cycle & Cancer
    cycleSim: {
      cellsDo: ['', ''], // divide, differentiate, or die
      apoptosis: '',
      badRegulators: '',
      tooFewCells: '',
      tooManyCells: '',
      phasesNotes: '',
      regulatorsNotes: '',
      whatIf: '',
      whatIfObservation: '',
    },

    // Inquiry & discussion
    inquiry: { think: '' },

    // Wrap-up reflections
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
          setAnswersData(prev => ({ ...prev, ...payload }));
          setDirty(false);
          setLastSavedAt(new Date());
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [moduleId]);

  /* ------------------------------ saving logic ------------------------------ */

  const saveAnswers = async ({ silent = true } = {}) => {
    if (saving) return;
    try {
      setSaving(true);
      await upsertResponse(moduleId, answersData);
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
      // read latest dirty/saving at call time
      setDirty(currentDirty => {
        if (currentDirty && !saving) {
          saveAnswers({ silent: true });
        }
        return currentDirty;
      });
    }, 2000); // 2s after last change
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

  // save on tab hide / page close
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

  // Manual save (buttons still work)
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

  // tiny setter: path like "cellCycle.interphaseG1" or "cycleSim.cellsDo[0]"
  const setField = (path, value) => {
    setAnswersData(prev => {
      // fallback in older environments
      const clone = typeof structuredClone === 'function'
        ? structuredClone(prev)
        : JSON.parse(JSON.stringify(prev));
      // eslint-disable-next-line no-new-func
      new Function('obj', 'value', `obj.${path} = value;`)(clone, value);
      // mark dirty after computing next state
      Promise.resolve().then(markDirtyAndDebounce);
      return clone;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  /* --------------------------------- UI ------------------------------------ */

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      {/* Day5-style autosave status badge */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-full bg-white/90 backdrop-blur px-3 py-1 shadow border text-xs text-gray-800">
          {saving
            ? 'Autosaving…'
            : lastSavedAt
              ? `Saved • ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : 'Ready'}
          {dirty && !saving ? <span className="ml-2 text-amber-600">(unsaved)</span> : null}
        </div>
      </div>

      {/* Guard banner to avoid calling .split() on null user */}
      {user ? (
        <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />
      ) : (
        <div className="container mx-auto px-4">
          <div className="animate-pulse h-14 bg-gray-200 rounded-xl mb-4" />
        </div>
      )}

      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 2: Understanding Cancer</h1>
          <h2 className="text-xl md:text-2xl text-gray-800">Cell Cycle, Mutations & Regulation Gone Wrong</h2>
        </div>

        {/* Curiosity Spark: Case Scenario */}
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
            <p className="text-xs text-gray-800 mt-2">
              Facilitator tip: Provide <b>noise-cancelling headphones</b> for videos—classroom discussions can get loud.
            </p>
          </div>
        </section>

        {/* Objective */}
        <section id="objective-section" className="mb-12">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-primary-800">
              <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
              Objective
            </h2>
            <p className="text-gray-800 leading-relaxed">
              Investigate what happens when the “instructions” inside a cell break down—leading to uncontrolled growth (cancer).
              Prepare for Days 3–4 by learning healthy vs. harmful cell division, explore p53 and regulators like Mdm2, and see why cancer is a problem of cell-cycle regulation gone wrong.
            </p>
          </div>
        </section>

        {/* What's the Plan? */}
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
                    <i className="fa-solid fa-check text-primary-600 text-sm" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Activities */}
        <section id="activities-header" className="mb-2">
          <h2 className="text-3xl font-bold text-center">Activities</h2>
        </section>

        {/* Watch & Learn: Cell Cycle */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-video text-primary-500 mr-3" />
            Watch & Learn — Part 1: Cell Cycle
          </h3>

          <div className="rounded-xl overflow-hidden mb-4">
            <iframe
              className="w-full h-80 rounded-xl"
              src="https://www.youtube-nocookie.com/embed/zNJJ_C2j4gk"
              title="Cell Cycle - Osmosis / Elsevier"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>

          {/* Questions (labels outside inputs so they remain visible) */}
          <div className="border border-gray-200 rounded-2xl p-4 md:p-6">
            <h4 className="text-xl font-semibold mb-4">Key Questions</h4>

            <div className="space-y-6 text-sm">
              <div>
                <label className="font-medium mb-2 block" htmlFor="day2-cell-phases-0">1) What are the two phases of the cell cycle?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    id="day2-cell-phases-0"
                    value={answersData.cellCycle.phasesTwo[0]}
                    onChange={e => setField('cellCycle.phasesTwo[0]', e.target.value)}
                    className="border-b-2 border-primary-300 focus:border-primary-500 outline-none px-2 py-1"
                    placeholder="Type here…"
                  />
                  <input
                    id="day2-cell-phases-1"
                    aria-label="Second phase of the cell cycle"
                    value={answersData.cellCycle.phasesTwo[1]}
                    onChange={e => setField('cellCycle.phasesTwo[1]', e.target.value)}
                    className="border-b-2 border-primary-300 focus:border-primary-500 outline-none px-2 py-1"
                    placeholder="Type here…"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium mb-2 block" htmlFor="day2-cell-interphase-g1">2) Describe the three subphases of interphase.</label>
                <AutoResizeTextarea
                  id="day2-cell-interphase-g1"
                  value={answersData.cellCycle.interphaseG1}
                  onChange={e => setField('cellCycle.interphaseG1', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                  rows={2}
                  placeholder="G1 (Gap/Growth 1)…"
                />
                <AutoResizeTextarea
                  id="day2-cell-interphase-s"
                  aria-label="S (Synthesis) subphase"
                  value={answersData.cellCycle.interphaseS}
                  onChange={e => setField('cellCycle.interphaseS', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                  rows={2}
                  placeholder="S (Synthesis)…"
                />
                <AutoResizeTextarea
                  id="day2-cell-interphase-g2"
                  aria-label="G2 (Gap/Growth 2) subphase"
                  value={answersData.cellCycle.interphaseG2}
                  onChange={e => setField('cellCycle.interphaseG2', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="G2 (Gap/Growth 2)…"
                />
              </div>

              <div>
                <label className="font-medium mb-2 block">3) Describe the four phases of mitosis:</label>
                {['prophase','metaphase','anaphase','telophase'].map(phase => (
                  <div key={phase} className="grid grid-cols-1 gap-3 mb-3">
                    {/* Removed the drawing/link input per request */}
                    <AutoResizeTextarea
                      id={`day2-cell-mitosis-${phase}`}
                      aria-label={`${phase[0].toUpperCase() + phase.slice(1)} — describe what you see`}
                      value={answersData.cellCycle.mitosisSketch[phase].desc}
                      onChange={e => setField(`cellCycle.mitosisSketch.${phase}.desc`, e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2"
                      rows={2}
                      placeholder={`${phase[0].toUpperCase()+phase.slice(1)} — describe what you see (chromosomes, spindle, nucleus, etc.)`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-medium mb-2 block" htmlFor="day2-cell-cytokinesis">4) Describe a cell in cytokinesis.</label>
                <div className="grid grid-cols-1 gap-3">
                  {/* Removed the drawing input per request */}
                  <AutoResizeTextarea
                    id="day2-cell-cytokinesis"
                    value={answersData.cellCycle.cytokinesis.desc}
                    onChange={e => setField('cellCycle.cytokinesis.desc', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                    rows={2}
                    placeholder="Membrane pinches; two daughter cells separate…"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium mb-2 block" htmlFor="day2-cell-post-division">5) When cells no longer need to divide, what stage do they enter? Describe.</label>
                <AutoResizeTextarea
                  id="day2-cell-post-division"
                  value={answersData.cellCycle.postDivisionStage}
                  onChange={e => setField('cellCycle.postDivisionStage', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="e.g., G0 — quiescent/resting phase…"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Answers
              </button>
            </div>
          </div>
        </section>

        {/* Watch & Learn: What is Cancer? */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-video text-primary-500 mr-3" />
            Watch & Learn — Part 2: What is Cancer?
          </h3>

          <div className="rounded-xl overflow-hidden mb-4">
            <iframe
              className="w-full h-80 rounded-xl"
              src="https://www.youtube-nocookie.com/embed/tsXnVu3kUnM"
              title="What is Cancer and How Does it Start? - Cancer Research UK"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 md:p-6">
            <h4 className="text-xl font-semibold mb-4">After the video</h4>
            <div className="space-y-5 text-sm">
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cancer-how-differs">1) How does cancer differ from normal cell growth?</label>
                <AutoResizeTextarea
                  id="day2-cancer-how-differs"
                  value={answersData.cancerBasics.howDiffers}
                  onChange={e => setField('cancerBasics.howDiffers', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cancer-two-hallmarks">2) Name & describe two hallmarks of cancer from the video.</label>
                <AutoResizeTextarea
                  id="day2-cancer-two-hallmarks"
                  value={answersData.cancerBasics.twoHallmarks}
                  onChange={e => setField('cancerBasics.twoHallmarks', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cancer-mutations">3) What role do mutations play in cancer development?</label>
                <AutoResizeTextarea
                  id="day2-cancer-mutations"
                  value={answersData.cancerBasics.mutationsRole}
                  onChange={e => setField('cancerBasics.mutationsRole', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Type your answer…"
                />
              </div>
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cancer-early-detection">
                  4) Stretch (beyond this video): Why is <em>early detection</em> important?
                </label>
                <AutoResizeTextarea
                  id="day2-cancer-early-detection"
                  value={answersData.cancerBasics.earlyDetection}
                  onChange={e => setField('cancerBasics.earlyDetection', e.target.value)}
                  className="w-full border border-gray-300 rounded p-3"
                  rows={3}
                  placeholder="Use your prior knowledge and today’s concepts…"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: The CR-UK video doesn’t cover this directly; answer using your understanding of tumor growth & treatment outcomes.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Answers
              </button>
            </div>
          </div>
        </section>

        {/* Activity 1: p53 Gene & Cancer */}
        <section id="sim-p53" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-flask-vial text-primary-500 mr-3" />
            Activity: Online Simulation — p53 Gene & Cancer
          </h3>

          {/* Clear “How to use” block */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-2">How to use this simulation</h4>
            <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
              <li>Open the simulation page and click <b>Start Interactive</b>.</li>
              <li>Use the left sidebar to move through slides; answer the questions below after each relevant slide.</li>
              <li>Focus on: <b>oncogenes</b>, <b>tumor suppressor genes</b>, <b>DNA repair genes</b>, <b>p53</b>, and <b>Mdm2</b>.</li>
              <li>If you get lost, return to the slide list and re-open the slide mentioned in the question label.</li>
            </ol>
          </div>

          {/* Embedded (with fallback) */}
          <EmbedWithFallback
            src="https://media.hhmi.org/biointeractive/click/p53/01.html?_gl=1*1pyukss*_ga*NjQ2NDY1NDE5LjE3NDc0MTYwNDE.*_ga_H0E1KHGJBH*czE3NTc2NDgyOTQkbzIkZzEkdDE3NTc2NDkzNjQkajYwJGwwJGgw"
            title="HHMI BioInteractive — p53 Gene & Cancer"
          />

          <div className="border border-gray-200 rounded-2xl p-4 md:p-6 space-y-4 text-sm mt-6">
            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-p53-oncogenes">Slide 2 — What are <b>oncogenes</b>?</label>
              <input
                id="day2-p53-oncogenes"
                value={answersData.p53Sim.oncogenes}
                onChange={e => setField('p53Sim.oncogenes', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Type your answer…"
              />
            </div>
            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-p53-tumor-suppressors">Slide 2 — What are <b>tumor suppressor genes</b>?</label>
              <input
                id="day2-p53-tumor-suppressors"
                value={answersData.p53Sim.tumorSuppressors}
                onChange={e => setField('p53Sim.tumorSuppressors', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Type your answer…"
              />
            </div>
            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-p53-dna-repair">Slide 2 — What are <b>DNA repair genes</b>?</label>
              <input
                id="day2-p53-dna-repair"
                value={answersData.p53Sim.dnaRepair}
                onChange={e => setField('p53Sim.dnaRepair', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Type your answer…"
              />
            </div>
            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-p53-function">Slide 3 — Normal function of <b>p53</b> in a healthy cell?</label>
              <input
                id="day2-p53-function"
                value={answersData.p53Sim.p53Function}
                onChange={e => setField('p53Sim.p53Function', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Type your answer…"
              />
            </div>
            <div>
              <p className="font-medium mb-1">Slide 5 — “p53 functions primarily as a ________.”</p>
              <input
                id="day2-p53-tf-blank"
                aria-label='Slide 5 — p53 functions primarily as a blank (fill the blank)'
                value={answersData.p53Sim.p53TFBlank}
                onChange={e => setField('p53Sim.p53TFBlank', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Fill the blank (one or two words)…"
              />
            </div>
            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-p53-mdm2">Slide 6 — Effect of <b>Mdm2</b> on p53?</label>
              <input
                id="day2-p53-mdm2"
                value={answersData.p53Sim.mdm2Effect}
                onChange={e => setField('p53Sim.mdm2Effect', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Type your answer…"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Answers
              </button>
            </div>
          </div>
        </section>

        {/* Activity 2: Cell Cycle & Cancer */}
        <section id="sim-cycle" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-microscope text-primary-500 mr-3" />
            Activity: Online Simulation — Eukaryotic Cell Cycle & Cancer
          </h3>

          {/* Clear “How to navigate” block */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <h4 className="font-semibold mb-2">How to navigate this simulation</h4>
            <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
              <li>Click <b>Open in new tab</b>. The simulation currently does not run when embedded.</li>
              <li>Click <b>Start Interactive</b>. Use the <b>top tabs</b> (Overview, Phases, Regulators, Overview of Cancer).</li>
              <li>As you open each tab, read the short panels on the left; some have animations or interactive toggles.</li>
              <li>Answer the questions below labelled with the section (e.g., “Cell Cycle Phases”).</li>
              <li>For “what-if” tests, use the interactive toggles (e.g., disable checkpoints, change protein levels), then note what you observe.</li>
            </ol>
            <p className="text-xs text-gray-800 mt-1">Tip: If lost, return to the <b>Overview</b> tab, then proceed left-to-right.</p>
          </div>

          {/* Embedded (with fallback) */}
          <EmbedWithFallback
            src="https://media.hhmi.org/biointeractive/click/cellcycle/?_gl=1*1e5q9o3*_ga*NjQ2NDY1NDE5LjE3NDc0MTYwNDE.*_ga_H0E1KHGJBH*czE3NTgwNzEzOTAkbzMkZzAkdDE3NTgwNzEzOTAkajYwJGwwJGgw"
            title="HHMI BioInteractive — Eukaryotic Cell Cycle & Cancer"
          />

          <div className="border border-gray-200 rounded-2xl p-4 md:p-6 space-y-5 text-sm mt-6">
            <div>
            <label className="font-medium mb-1 block" htmlFor="day2-cycle-cells-do-0"> Overview — Molecular signals can cause cells to <b>divide</b>, ________, or ________. Fill the two blanks.</label>
              <input
                id="day2-cycle-cells-do-0"
                value={answersData.cycleSim.cellsDo[0]}
                onChange={e => setField('cycleSim.cellsDo[0]', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder='First blank'
              />
              <input
                id="day2-cycle-cells-do-1"
                aria-label="Second blank"
                value={answersData.cycleSim.cellsDo[1]}
                onChange={e => setField('cycleSim.cellsDo[1]', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 mt-2"
                placeholder='Second blank'
              />
              <p className="text-xs text-gray-500 mt-1">Slide numbers are shown in the simulation sidebar.</p>
            </div>

            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-cycle-apoptosis">Overview — What is <b>apoptosis</b>, and why is it beneficial?</label>
              <AutoResizeTextarea
                id="day2-cycle-apoptosis"
                value={answersData.cycleSim.apoptosis}
                onChange={e => setField('cycleSim.apoptosis', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={2}
                placeholder="Type your answer…"
              />
            </div>

            <div>
              <p className="font-medium mb-1">Regulators & Cancer — What happens if cell cycle regulators don’t function properly?</p>
              <AutoResizeTextarea
                value={answersData.cycleSim.badRegulators}
                onChange={e => setField('cycleSim.badRegulators', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={2}
                placeholder="Type your answer…"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cycle-too-few">Give one issue that arises with <b>too few</b> cells.</label>
                <input
                  id="day2-cycle-too-few"
                  value={answersData.cycleSim.tooFewCells}
                  onChange={e => setField('cycleSim.tooFewCells', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Type your answer…"
                />
              </div>
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cycle-too-many">Give one issue that arises with <b>too many</b> cells.</label>
                <input
                  id="day2-cycle-too-many"
                  value={answersData.cycleSim.tooManyCells}
                  onChange={e => setField('cycleSim.tooManyCells', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Type your answer…"
                />
              </div>
            </div>

            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-cycle-phases-notes">Cell Cycle Phases — Notes (G1, S, G2, M + checkpoints)</label>
              <AutoResizeTextarea
                id="day2-cycle-phases-notes"
                value={answersData.cycleSim.phasesNotes}
                onChange={e => setField('cycleSim.phasesNotes', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={2}
                placeholder="After exploring the simulation, type your notes here. This is important for Day 3 and 4"
              />
            </div>

            <div>
              <label className="font-medium mb-1 block" htmlFor="day2-cycle-regulators-notes">Regulators & Cancer — Notes</label>
              <AutoResizeTextarea
                id="day2-cycle-regulators-notes"
                value={answersData.cycleSim.regulatorsNotes}
                onChange={e => setField('cycleSim.regulatorsNotes', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={2}
                placeholder="After exploring the simulation, type your notes here. This is important for Day 3 and 4"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cycle-what-if">What-if scenario (e.g., turn p53 off, overexpress cyclin D, disable G2/M arrest):</label>
                <AutoResizeTextarea
                  id="day2-cycle-what-if"
                  value={answersData.cycleSim.whatIf}
                  onChange={e => setField('cycleSim.whatIf', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Describe the setup…"
                />
              </div>
              <div>
                <label className="font-medium mb-1 block" htmlFor="day2-cycle-observe">Observation — what happened?</label>
                <AutoResizeTextarea
                  id="day2-cycle-observe"
                  value={answersData.cycleSim.whatIfObservation}
                  onChange={e => setField('cycleSim.whatIfObservation', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="What did you see?"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                Save Answers
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Facilitator tip: Before students begin, demo the navigation quickly (tabs, slide list, toggles) to reduce confusion.
          </p>
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
                { q: 'If p53 is mutated and cannot activate repair or apoptosis, what happens to the cell cycle?', a: 'Cells can pass damaged DNA through checkpoints, increasing mutation load and potential tumor formation.' },
                { q: 'How might overactive Mdm2 impact p53 and cancer risk?', a: 'Mdm2 tags p53 for degradation; overactivity can reduce p53 levels, weakening crucial damage responses.' },
                { q: 'Name one environmental factor that could increase mutation rates. How might this affect regulators?', a: 'UV radiation can cause thymine dimers; checkpoint proteins and repair genes must respond or errors accumulate.' }
              ].map((item, idx) => (
                <details key={idx} className="border border-gray-200 rounded-lg transition-colors">
                  <summary className="cursor-pointer px-4 py-3 hover:bg-primary-50 rounded-lg flex justify-between items-center">
                    <h4 className="font-medium">{item.q}</h4>
                    <i className="fa-solid fa-chevron-down text-gray-500" />
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-gray-800 text-sm">{item.a}</div>
                </details>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm relative z-10">
              <h3 className="text-xl font-semibold mb-4 text-primary-800">Think & Respond</h3>
              <label className="text-gray-800 mb-4 block" htmlFor="day2-inquiry-think">
                Scenario: A cell has severe DNA damage, p53 is mutated, and cyclin D is overexpressed. Predict what happens at the G1/S checkpoint.
              </label>
              <AutoResizeTextarea
                id="day2-inquiry-think"
                value={answersData.inquiry.think}
                onChange={e => setField('inquiry.think', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Type your response here..."
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
      {
        key: "healthyDivision",
        q: "What does healthy cellular division typically look like? What are the two main phases?",
      },
      { key: "cancerVsNormal", q: "How does cancer differ from normal cell growth?" },
      {
        key: "threeGeneTypes",
        q: "What are oncogenes, tumor suppressor genes, and DNA repair genes? Why are they important?",
      },
      { key: "p53Normal", q: "What is the normal function of p53 in a healthy cell?" },
      { key: "mdm2OnP53", q: "What is the effect of Mdm2 on p53?" },
      { key: "whatIfRan", q: "Describe one “what-if” you tested. What did you observe?" },
      { key: "favVideo", q: "Which video was your favorite and why?" },
      { key: "favSim", q: "Which simulation was your favorite and why?" },
    ].map(({ key, q }) => {
      const id = `wrap-${key}`;
      return (
        <div key={key} className="space-y-2">
          <label htmlFor={id} className="block text-sm font-medium text-gray-800">
            {q}
          </label>

          <AutoResizeTextarea
            id={id}
            value={answersData.wrap[key] ?? ""}
            onChange={(e) => setField(`wrap.${key}`, e.target.value)}
            className="w-full border border-gray-300 rounded p-3"
            rows={3}
            placeholder="Type your answer…"
          />
        </div>
      );
    })}
  </div>

  <div className="flex justify-end mt-6">
    <button
      onClick={handleSave}
      className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
    >
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
            to="/sections/day-1"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 1
          </Link>
          <Link
            to="/sections/day-3"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
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

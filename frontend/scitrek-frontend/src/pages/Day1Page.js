// src/pages/Day1Page.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

// -----------------------------------------------------------------------------
// Pacing Mode (Floating Pacing Dashboard)
// -----------------------------------------------------------------------------
const DAY1_PACING_STEPS = [
  { label: 'Intro & Objective', duration: 5, target: 'welcome-section' },
  { label: 'Core Concepts', duration: 8, target: 'content-blocks-section' },
  { label: 'Amoeba Sisters Video', duration: 12, target: 'video-section' },
  { label: 'Expression vs Regulation (DnD + Q)', duration: 8, target: 'gene-expression-section' },
  { label: 'PhET Simulation', duration: 15, target: 'simulation-section' },
  { label: 'Inquiry & Discussion', duration: 6, target: 'inquiry-section' },
  { label: 'Wrap-up', duration: 6, target: 'wrap-up-section' }
];


/**
 * FloatingPacingDashboard
 * - Start/Pause/Reset
 * - Shows current step, time remaining in step, total progress
 * - Jump link scrolls to section id
 */
function FloatingPacingDashboard({ steps, defaultActive = false }) {
  const totalMinutes = useMemo(
    () => steps.reduce((acc, s) => acc + (Number(s.duration) || 0), 0),
    [steps]
  );

  const [isActive, setIsActive] = useState(defaultActive);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ticking timer
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const elapsedMins = elapsedSeconds / 60;

  // compute current step + per-step timing
  let cumulative = 0;
  let currentIndex = steps.findIndex((step) => {
    cumulative += step.duration;
    return elapsedMins < cumulative;
  });

  if (currentIndex === -1) currentIndex = steps.length; // finished

  const isFinished = currentIndex >= steps.length;
  const currentStep = !isFinished ? steps[currentIndex] : { label: 'Finished!', target: 'footer', duration: 0 };

  const stepStartMins = steps.slice(0, currentIndex).reduce((acc, s) => acc + s.duration, 0);
  const stepElapsedMins = Math.max(0, elapsedMins - stepStartMins);
  const stepRemainingMins = !isFinished ? Math.max(0, currentStep.duration - stepElapsedMins) : 0;

  const totalRemainingMins = Math.max(0, totalMinutes - elapsedMins);
  const pct = Math.min(100, Math.max(0, (elapsedMins / Math.max(1, totalMinutes)) * 100));

  const formatMMSS = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[92vw] max-w-sm">
      <div className="rounded-2xl shadow-2xl border border-slate-700 bg-slate-900/95 backdrop-blur text-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Pacing Mode • {totalMinutes} min plan
            </div>
            <div className="mt-1 text-lg font-bold">
              {currentStep.label}
            </div>
            <div className="mt-1 text-xs text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-mono">Elapsed: {formatMMSS(elapsedSeconds)}</span>
              <span className="font-mono">Remaining: {Math.max(0, Math.ceil(totalRemainingMins))}m</span>
              {!isFinished ? (
                <span className="font-mono">
                  This step: {Math.max(0, Math.ceil(stepRemainingMins))}m left
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {!isActive ? (
              <button
                onClick={() => setIsActive(true)}
                className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-sm font-bold"
              >
                Start
              </button>
            ) : (
              <button
                onClick={() => setIsActive(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
              >
                Pause
              </button>
            )}

            <button
              onClick={() => {
                setIsActive(false);
                setElapsedSeconds(0);
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
              title="Reset timer to 0"
            >
              Reset
            </button>

            <button
              onClick={() => scrollTo(currentStep.target)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
              title="Scroll to the current section"
            >
              Jump
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>{Math.min(100, Math.floor(pct))}%</span>
            <span className="text-slate-400">
              {isFinished ? 'Done' : `Step ${currentIndex + 1} of ${steps.length}`}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Optional: quick jump list (collapsed) */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-300 hover:text-white select-none">
            Jump to any section
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {steps.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => scrollTo(s.target)}
                className="text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <span className="font-semibold">{s.label}</span>
                <span className="text-slate-400"> • {s.duration}m</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

// ---- helpers: UI chips for click-to-answer ---------------------------------
// (Kept in case you reuse elsewhere)
function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full border text-sm transition',
        active
          ? 'bg-primary-500 text-white border-primary-600'
          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
      ].join(' ')}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/**
 * InlineChoice: compact inline <select> so students can see all options.
 * - Shows a placeholder "— choose —" and lists every option
 * - Selecting the blank placeholder clears the choice
 * Accessibility:
 * - native select ensures keyboard & screen reader support
 */
function InlineChoice({ idx, value, setFill, options }) {
  const id = `day1-inline-${idx}`;
  return (
    <label className="inline-flex items-center align-baseline" htmlFor={id}>
      <span className="sr-only">{`Blank ${idx + 1}`}</span>
      <select
        id={id}
        value={value || ''}
        onChange={(e) => setFill(idx, e.target.value)}
        className={[
          'inline-block',
          'px-2 py-1',
          'rounded-md',
          'border border-dashed border-primary-300',
          'bg-primary-50 hover:bg-primary-100',
          'text-primary-800',
          'text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary-400'
        ].join(' ')}
        aria-label={`Blank ${idx + 1}. Choose an option.`}
      >
        <option value="">{'— choose —'}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---- gene expression steps for DnD -----------------------------------------
const INITIAL_STEPS = [
  'RNA polymerase binds to the positive transcription factor',
  'Transcription',
  'mRNA is created',
  'Translation',
  'Protein is created'
];

const Day1Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 1;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- AUTOSAVE state (mirrors Day5Page) ------------------------------------
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  // Track mount/unmount to avoid state updates post-unmount
  const unmountedRef = useRef(false);

  // Centralized answers (kept compatible, but improved defaults where needed)
  const [answersData, setAnswersData] = useState({
    worksheet: Array(4).fill(''),
    analogies: Array.from({ length: 4 }, () => ({ analogy: '', why: '' })),
    fillBlanks: Array(13).fill(''),
    dnd: {
      available: INITIAL_STEPS,
      ordered: Array(INITIAL_STEPS.length).fill(''),
      orderSize: INITIAL_STEPS.length
    },
    geneQ1: '',
    inquiry: { think: '' },
    sim: {
      gene1: Array(5).fill(''),
      gene2: Array(4).fill(''),
      gene3: Array(6).fill(''),
      reflections: Array(4).fill('')
    },
    wrap: { reflection: '' },
    // legacy keys kept as no-ops
    simOn: '',
    simOff: '',
    simObservations: '',
    simSteps: Array(3).fill(''),
    discussion: Array(3).fill(''),
    exitTicket: Array(3).fill('')
  });

  const [showModal, setShowModal] = useState(false);
  const [showUtah1, setShowUtah1] = useState(false);
  const [showUtah2, setShowUtah2] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ESC closes modals
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowUtah1(false);
        setShowUtah2(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ------- load user + saved answers (same pattern as Day5) -------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
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
          setAnswersData((prev) => {
            const next = { ...prev, ...payload };

            // Ensure new sim shape is present
            if (!next.sim) {
              next.sim = {
                gene1: Array(5).fill(''),
                gene2: Array(4).fill(''),
                gene3: Array(6).fill(''),
                reflections: Array(4).fill('')
              };
            } else {
              next.sim.gene1 = Array.isArray(next.sim.gene1)
                ? next.sim.gene1
                    .slice(0, 5)
                    .concat(Array(Math.max(0, 5 - next.sim.gene1.length)).fill(''))
                : Array(5).fill('');
              next.sim.gene2 = Array.isArray(next.sim.gene2)
                ? next.sim.gene2
                    .slice(0, 4)
                    .concat(Array(Math.max(0, 4 - next.sim.gene2.length)).fill(''))
                : Array(4).fill('');
              next.sim.gene3 = Array.isArray(next.sim.gene3)
                ? next.sim.gene3
                    .slice(0, 6)
                    .concat(Array(Math.max(0, 6 - next.sim.gene3.length)).fill(''))
                : Array(6).fill('');
              next.sim.reflections = Array.isArray(next.sim.reflections)
                ? next.sim.reflections
                    .slice(0, 4)
                    .concat(Array(Math.max(0, 4 - next.sim.reflections.length)).fill(''))
                : Array(4).fill('');
            }

            // Ensure DnD shape exists
            if (!next.dnd)
              next.dnd = {
                available: INITIAL_STEPS,
                ordered: Array(5).fill(''),
                orderSize: 5
              };
            if (!Array.isArray(next.dnd.available)) next.dnd.available = INITIAL_STEPS;
            if (!Array.isArray(next.dnd.ordered))
              next.dnd.ordered = Array(next.dnd.orderSize || 5).fill('');

            // Keep fillBlanks length >= 13
            if (!Array.isArray(next.fillBlanks) || next.fillBlanks.length < 13) {
              const fb = Array(13).fill('');
              (next.fillBlanks || []).forEach((v, i) => (fb[i] = v));
              next.fillBlanks = fb;
            }

            return next;
          });

          setDirty(false);
          setLastSavedAt(new Date());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [moduleId]);

  // ------- helpers: save routine / debouncer (Day5 parity) -------
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
      if (dirty && !saving) saveAnswers({ silent: true });
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
  }, [dirty, saving]); // re-evaluate when flags change

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

  // Manual logout (ensure save first if dirty)
  const handleLogout = async () => {
    if (dirty && !saving) {
      await saveAnswers({ silent: true });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // Manual save button
  const handleSave = async () => {
    await saveAnswers({ silent: false });
  };

  // ---- state setters (each marks dirty + debounces autosave) ----------------
  const setFill = (idx, val) =>
    setAnswersData((a) => {
      const fillBlanks = [...a.fillBlanks];
      fillBlanks[idx] = val;
      const next = { ...a, fillBlanks };
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  const setGeneQ1 = (val) =>
    setAnswersData((a) => {
      const next = { ...a, geneQ1: val };
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  const setInquiryThink = (val) =>
    setAnswersData((a) => {
      const next = { ...a, inquiry: { ...a.inquiry, think: val } };
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  const setSimGene = (geneKey, idx, val) =>
    setAnswersData((a) => {
      const arr = [...a.sim[geneKey]];
      arr[idx] = val;
      const next = { ...a, sim: { ...a.sim, [geneKey]: arr } };
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  const setSimReflection = (idx, val) =>
    setAnswersData((a) => {
      const reflections = [...a.sim.reflections];
      reflections[idx] = val;
      const next = { ...a, sim: { ...a.sim, reflections } };
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  // ---- drag & drop ----------------------------------------------------------
  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setAnswersData((a) => {
      const available = Array.from(a.dnd.available);
      const ordered = Array.from(a.dnd.ordered);
      const ORDER_SIZE = a.dnd.orderSize ?? a.dnd.ordered.length ?? 5;

      const normalizeOrdered = (list) => {
        const filled = list.filter(Boolean);
        while (filled.length < ORDER_SIZE) filled.push('');
        return filled.slice(0, ORDER_SIZE);
      };

      if (source.droppableId === 'available' && destination.droppableId === 'available') {
        const [moved] = available.splice(source.index, 1);
        available.splice(destination.index, 0, moved);
        const next = { ...a, dnd: { ...a.dnd, available } };
        Promise.resolve().then(markDirtyAndDebounce);
        return next;
      }
      if (source.droppableId === 'ordered' && destination.droppableId === 'ordered') {
        const filled = ordered.filter(Boolean);
        const [moved] = filled.splice(source.index, 1);
        filled.splice(destination.index, 0, moved);
        const next = { ...a, dnd: { ...a.dnd, available, ordered: normalizeOrdered(filled) } };
        Promise.resolve().then(markDirtyAndDebounce);
        return next;
      }
      if (source.droppableId === 'available' && destination.droppableId === 'ordered') {
        const [moved] = available.splice(source.index, 1);
        const filled = ordered.filter(Boolean);
        filled.splice(destination.index, 0, moved);
        const next = { ...a, dnd: { ...a.dnd, available, ordered: normalizeOrdered(filled) } };
        Promise.resolve().then(markDirtyAndDebounce);
        return next;
      }
      if (source.droppableId === 'ordered' && destination.droppableId === 'available') {
        const filled = ordered.filter(Boolean);
        const [moved] = filled.splice(source.index, 1);
        if (moved) available.splice(destination.index, 0, moved);
        const next = { ...a, dnd: { ...a.dnd, available, ordered: normalizeOrdered(filled) } };
        Promise.resolve().then(markDirtyAndDebounce);
        return next;
      }
      return a;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      {/* Pacing Mode dashboard */}
      <FloatingPacingDashboard steps={DAY1_PACING_STEPS} />

      {/* autosave status badge (same UX as Day5) */}
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

      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Section 1: Welcome & Orientation */}
        <div className="text-center mb-8" id="welcome-section">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 1: Unlocking the Code</h1>
          <h2 className="text-xl md:text-2xl text-gray-800 mb-8">How Your Cells Decide What to Do</h2>
        </div>

        {/* Section 2: Objective */}
        <section id="objective-section" className="mb-16">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <div className="flex flex-col md:flex-row items-start">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 flex items-center text-primary-800">
                  <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
                  Objective
                </h2>
                <p className="text-gray-800 leading-relaxed text-base md:text-lg">
                  Today, we explore gene regulation—how cells control which genes are turned ON or OFF.
                  By the end, you’ll be able to explain the basics and why they matter for health and disease.
                </p>
              </div>
              <div className="md:w-1/3 flex justify-center">
                <img
                  className="w-full max-w-xs h-48 object-cover rounded-xl shadow-md"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/7571bd2468-b274dc1a8a8148360b21.png"
                  alt="DNA double helix illustration"
                  title="DNA double helix illustration"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Core Concepts + Interactive Model links */}
        <section id="content-blocks-section" className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Core Concepts</h2>

          <div id="gene-regulation-card" className="bg-white rounded-2xl shadow-md p-6 md:p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <i className="fa-solid fa-dna text-primary-500 mr-3" />
              What is Gene Regulation?
            </h3>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <p className="text-gray-800 mb-4">
                  Gene regulation is how cells control which genes are expressed (ON) or repressed (OFF). Think of your genes
                  as a library of instructions—regulation decides which “books” are read when.
                </p>
                <p className="text-gray-800 mb-4">
                  <span className="font-semibold">Note:</span> Parts of a gene (like <em>promoters</em> and other regulatory regions)
                  can encode instructions about when a gene should be used—so some regulation is literally <em>encoded within the gene</em>.
                </p>
              </div>

              <div className="md:w-1/3 flex justify-center">
                <div className="w-full max-w-xs">
                  <div className="bg-white rounded-2xl shadow p-4 border">
                    <h4 className="text-base font-semibold mb-2">Interactive Model</h4>
                    <div className="space-y-2">
                      <button
                        className="w-full text-white bg-primary-500 hover:bg-primary-600 font-medium py-2 px-3 rounded-lg"
                        onClick={() => setShowUtah1(true)}
                      >
                        1) Anatomy of a Gene
                      </button>
                      <button
                        className="w-full text-white bg-primary-500 hover:bg-primary-600 font-medium py-2 px-3 rounded-lg"
                        onClick={() => setShowUtah2(true)}
                      >
                        2) Translation Machinery
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Opens an interactive page. Close with <kbd>Esc</kbd>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Utah modal 1 */}
            {showUtah1 && (
              <div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                onClick={() => setShowUtah1(false)}
              >
                <div
                  className="bg-white p-2 rounded-xl w-[95vw] h-[90vh] max-w-6xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <h5 className="font-semibold">Anatomy of a Gene (learn.genetics.utah.edu)</h5>
                    <button
                      className="px-3 py-1 bg-primary-500 text-white rounded-md"
                      onClick={() => setShowUtah1(false)}
                    >
                      Close
                    </button>
                  </div>
                  <iframe
                    title="Anatomy of a Gene"
                    src="https://learn.genetics.utah.edu/content/basics/geneanatomy/"
                    className="w-full h-[calc(90vh-60px)] rounded-b-xl"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Utah modal 2 */}
            {showUtah2 && (
              <div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                onClick={() => setShowUtah2(false)}
              >
                <div
                  className="bg-white p-2 rounded-xl w-[95vw] h-[90vh] max-w-6xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <h5 className="font-semibold">Central Dogma: Translation (learn.genetics.utah.edu)</h5>
                    <button
                      className="px-3 py-1 bg-primary-500 text-white rounded-md"
                      onClick={() => setShowUtah2(false)}
                    >
                      Close
                    </button>
                  </div>
                  <iframe
                    title="Central Dogma"
                    src="https://learn.genetics.utah.edu/content/basics/centraldogma/"
                    className="w-full h-[calc(90vh-60px)] rounded-b-xl"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Video & Dropdown Quiz */}
        <section id="video-section" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold flex items-center">
              <i className="fa-solid fa-video text-primary-500 mr-3" />
              Learn with the Amoeba Sisters
            </h3>
            <div className="text-xs md:text-sm text-gray-500 flex items-center gap-2">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>Use the dropdown in each blank to choose your answer.</span>
            </div>
          </header>

          {/* Video */}
          <div className="rounded-xl overflow-hidden ring-1 ring-gray-200">
            <iframe
              className="w-full h-80 md:h-[28rem]"
              src="https://www.youtube.com/embed/ebIpkw3XapE"
              title="Gene Regulation and the Order of the Operon"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="mt-2 text-sm text-gray-800">
            <span className="font-medium">Heads-up:</span> In <em>translation</em>, the <b>ribosome</b> uses the <b>mRNA</b> to build a protein.
          </p>

          {/* Dropdown narrative */}
          <div className="border border-gray-200 rounded-xl p-4 md:p-6 mt-6 space-y-5">
            <h4 className="text-xl font-semibold mb-2">Choose to complete each idea as you watch:</h4>

            <div className="leading-relaxed text-[15px] md:text-base">
              To express a gene means that a gene can be used to make something functional, often a{' '}
              <InlineChoice idx={0} value={answersData.fillBlanks[0]} setFill={setFill} options={['DNA', 'protein']} />.
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              The gene, which is made up of DNA, can be transcribed into mRNA during{' '}
              <InlineChoice idx={1} value={answersData.fillBlanks[1]} setFill={setFill} options={['transcription', 'translation']} />{' '}
              and then used in{' '}
              <InlineChoice idx={2} value={answersData.fillBlanks[2]} setFill={setFill} options={['transcription', 'translation']} />{' '}
              to make a polypeptide chain. A protein is made up of 1 or more of those chains.
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              But you know what? Not every gene is expressed! That’s why the phrase “gene regulation” gets paired with “gene expression” — because the{' '}
              <InlineChoice idx={3} value={answersData.fillBlanks[3]} setFill={setFill} options={['expression', 'regulation']} />{' '}
              has to be{' '}
              <InlineChoice idx={4} value={answersData.fillBlanks[4]} setFill={setFill} options={['expressed', 'regulated']} />
              . For example, a cell in the eye has no need for using a gene that codes for stomach acid, even though the gene is present. It would be wasteful to express that gene!
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              How does gene regulation involve or impact transcription? Transcription is when an enzyme called{' '}
              <InlineChoice idx={5} value={answersData.fillBlanks[5]} setFill={setFill} options={['RNA polymerase', 'gRNA lactase']} />{' '}
              makes mRNA from a DNA template. There are regulatory proteins that can decrease or increase transcription. These regulatory proteins are often referred to as{' '}
              <InlineChoice idx={6} value={answersData.fillBlanks[6]} setFill={setFill} options={['transitory codons', 'transcription factors']} />.
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              Some transcription factors bind to a DNA region called the{' '}
              <InlineChoice idx={7} value={answersData.fillBlanks[7]} setFill={setFill} options={['operator', 'promoter']} />{' '}
              to help RNA polymerase start transcription, while other transcription factors can bind there to repress it. Some transcription factors can bind to enhancer sequences, where they increase transcription. Ultimately, transcription factors play a huge role in whether a gene is expressed. Also, environmental factors can influence transcription factors, meaning that the presence or absence of an environmental factor could impact gene expression.
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              A <InlineChoice idx={8} value={answersData.fillBlanks[8]} setFill={setFill} options={['repressor', 'sequence stop']} />{' '}
              blocks RNA polymerase from doing transcription by binding to a sequence called the{' '}
              <InlineChoice idx={9} value={answersData.fillBlanks[9]} setFill={setFill} options={['operator', 'promoter']} />. Since the RNA polymerase can’t bind, these genes cannot be expressed. This is because if the genes cannot be transcribed into mRNA, they cannot go to{' '}
              <InlineChoice idx={10} value={answersData.fillBlanks[10]} setFill={setFill} options={['transcription', 'translation']} />{' '}
              for a protein to be built.
            </div>

            <div className="leading-relaxed text-[15px] md:text-base">
              So, how does the gene get expressed? The repressor has got to be moved. In the presence of certain substances (in this case, lactose), another protein will bind to the repressor and move it out of the way. When the repressor is not blocking this RNA polymerase, transcription can happen! The RNA polymerase does transcription, and it makes the{' '}
              <InlineChoice idx={11} value={answersData.fillBlanks[11]} setFill={setFill} options={['mRNA', 'DNA']} />
              , and translation can follow. It uses that mRNA to make{' '}
              <InlineChoice idx={12} value={answersData.fillBlanks[12]} setFill={setFill} options={['protein', 'carbohydrates']} />
              . This is a great gene regulation example — controlling whether genes are expressed, or not!
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                className="text-sm text-gray-800 hover:text-gray-800 underline underline-offset-2"
                onClick={() =>
                  setAnswersData((a) => {
                    const next = { ...a, fillBlanks: Array(13).fill('') };
                    Promise.resolve().then(markDirtyAndDebounce);
                    return next;
                  })
                }
              >
                Reset choices
              </button>
              <button
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
                onClick={handleSave}
              >
                Save Answers
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Gene Expression vs. Regulation (DnD + Q1) */}
        <section id="gene-expression-section" className="border border-gray-200 rounded-2xl p-6 md:p-8 bg-white">
          <h4 className="text-xl font-semibold mb-4">Gene Expression vs Gene Regulation</h4>
          <p className="text-gray-800 mb-6">
            What’s the relationship between expression and regulation, and why does it matter for our health?
          </p>
          <label htmlFor="day1-gene-q1" className="sr-only">Gene expression vs regulation response</label>
          <textarea
            id="day1-gene-q1"
            value={answersData.geneQ1}
            onChange={(e) => setGeneQ1(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-8"
            rows={4}
            placeholder="Use terms like promoter, operator, repressor, transcription factors, RNA polymerase, ribosome…"
          />

          <h5 className="font-medium mb-3">Put the steps for gene expression in the typical order:</h5>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available steps */}
              <Droppable droppableId="available" type="STEP">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-white border border-gray-200 rounded-lg p-3 min-h-[220px]"
                  >
                    <h6 className="font-semibold mb-2">Available Steps</h6>

                    {answersData.dnd.available.map((step, idx) => (
                      <Draggable key={step} draggableId={step} index={idx}>
                        {(drag) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 cursor-move hover:bg-gray-100"
                          >
                            {step}
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Ordered steps */}
              <Droppable droppableId="ordered" type="STEP">
                {(provided) => {
                  const filled = answersData.dnd.ordered.filter(Boolean);
                  const ORDER_SIZE = answersData.dnd.orderSize ?? answersData.dnd.ordered.length ?? 5;

                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-primary-50 border-2 border-dashed border-primary-300 rounded-lg p-3 min-h-[220px]"
                    >
                      <h6 className="font-semibold mb-2">Your Order</h6>

                      {filled.map((step, idx) => (
                        <Draggable key={step} draggableId={step} index={idx}>
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-move hover:bg-gray-50"
                            >
                              {idx + 1}. {step}
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {Array.from({ length: ORDER_SIZE - filled.length }).map((_, i) => (
                        <div
                          key={`slot-${i}`}
                          className="rounded-lg p-3 mb-2 min-h-[48px] flex items-center justify-center bg-primary-100/40 text-gray-800"
                        >
                          Drop step {filled.length + i + 1} here
                        </div>
                      ))}

                      {provided.placeholder}
                    </div>
                  );
                }}
              </Droppable>
            </div>
          </DragDropContext>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              Save Section
            </button>
          </div>
        </section>

        {/* Section 6: PhET Simulation (embedded) */}
        <section id="simulation-section" className="mb-16">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-primary-500 px-6 md:px-8 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <i className="fa-solid fa-flask-vial mr-3" />
                Explore with the PhET Simulation (Embedded)
              </h2>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Guidance (ultra-clear) */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <h3 className="font-semibold mb-2">Step-by-Step: How to Complete This Simulation</h3>
                <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2">
                  <li>
                    <b>Press Play</b> in the embedded panel below. If it freezes, use <b>Reload</b> in
                    the toolbar or <b>Open in new tab</b>.
                  </li>
                  <li>
                    Each level is shown as <b>Gene 1</b>, <b>Gene 2</b>, and <b>Gene 3</b> (this matches the simulation).
                    Your goal is to build proteins by placing the needed parts in the <b>correct order</b>.
                  </li>
                  <li>
                    <b>Plan first, then place.</b> Before dragging anything, look at the
                    <b> Biomolecule Toolbox</b> and decide which parts you’ll use and in what order.
                    Use terms you already saw: <b>promoter</b>, <b>transcription factors</b> (positive/negative),
                    <b> RNA polymerase</b>, <b>operator</b>/<b>repressor</b>, and the <b>ribosome</b>.
                  </li>
                  <li>
                    <b>Place tools one at a time.</b> Drag a tool to the center where you see its faint outline.
                    If the order is correct, parts will work together and a <b>protein</b> will appear.
                    Drag each finished protein into <b>Your Protein Collection</b>.
                  </li>
                  <li>
                    <b>Not every tool is needed.</b> Some tools are <i>not</i> useful for certain genes.
                    That’s intentional—watch what each tool does and skip tools that aren’t required.
                  </li>
                  <li>
                    If no protein is produced, your order isn’t correct. <b>Re-plan</b> with your team and try again.
                  </li>
                  <li className="mt-1">
                    When you complete each gene:
                    <ul className="list-disc list-inside ml-5 mt-1">
                      <li>
                        <b>Gene 1:</b> Record the <b>five</b> parts you actually used, in order.
                      </li>
                      <li>
                        <b>Gene 2:</b> Record the <b>four</b> parts you actually used, in order (only four are needed).
                      </li>
                      <li>
                        <b>Gene 3:</b> Record the <b>six</b> parts you actually used, in order.
                      </li>
                    </ul>
                  </li>
                  <li>
                    After all three are complete, the collection will show <b>“Collection Complete!”</b>
                    — you’re not done until you also answer the reflection questions below.
                  </li>
                </ol>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary-800">
                    Mini reference (what the parts do)
                  </summary>
                  <ul className="list-disc list-inside text-sm text-gray-800 mt-2 space-y-1">
                    <li><b>Promoter:</b> Start site where RNA polymerase can bind (often needs a positive TF).</li>
                    <li><b>Transcription factors (TFs):</b> Positive TFs help start transcription; negative TFs (repressors) block it.</li>
                    <li><b>Operator/Repressor:</b> Repressor on operator = RNA polymerase is blocked (gene OFF) until the repressor is removed.</li>
                    <li><b>RNA polymerase:</b> Transcribes DNA → mRNA.</li>
                    <li><b>Ribosome:</b> Translates mRNA → protein.</li>
                  </ul>
                </details>
              </div>

              {/* Embedded iframe + toolbar */}
              <div className="bg-gray-100 rounded-xl p-3 md:p-4 relative overflow-hidden ring-1 ring-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-800">PhET: Gene Expression Essentials</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm rounded-md bg-white hover:bg-gray-50 border"
                      onClick={() => {
                        const iframe = document.getElementById('phet-gene-expression-iframe');
                        if (iframe) iframe.src = iframe.src;
                      }}
                      title="Reload simulation"
                    >
                      <i className="fa-solid fa-rotate-right mr-1" /> Reload
                    </button>
                    <a
                      href="https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html?responsive"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-sm rounded-md bg-white hover:bg-gray-50 border"
                      title="Open in new tab"
                    >
                      <i className="fa-solid fa-up-right-from-square mr-1" /> Open in new tab
                    </a>
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden">
                  <iframe
                    id="phet-gene-expression-iframe"
                    title="PhET Gene Expression Essentials"
                    src="https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html?responsive"
                    className="w-full h-[50vh] min-h-[360px] bg-white"
                    allowFullScreen
                  />
                </div>

                <p className="mt-2 text-xs text-gray-800">
                  Trouble loading? Some school filters or browser extensions can block embeds. Use “Open in new tab” above if needed.
                </p>
              </div>

              {/* Your plan for each gene */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="border-b border-gray-200 p-4">
                  <h4 className="font-semibold text-lg">Your Plan for Each Gene</h4>
                  <p className="text-sm text-gray-800 mt-1">
                    Write only the parts you actually used, in order. It’s ok if some tools weren’t needed.
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {/* Gene 1 */}
                  <div className="p-4">
                    <h5 className="font-medium mb-2">Gene 1</h5>
                    <p className="text-gray-800 text-sm mb-2">
                      Plan the <b>three</b> you’ll need.
                    </p>
                    {['i.', 'ii.', 'iii.'].map((label, idx) => (
                      <div key={label} className="flex items-center mb-2 text-sm">
                        <label className="font-medium mr-2 w-6" htmlFor={`day1-sim-gene1-${idx}`}>{label}</label>
                        <input
                          id={`day1-sim-gene1-${idx}`}
                          value={answersData.sim.gene1[idx] || ''}
                          onChange={(e) => setSimGene('gene1', idx, e.target.value)}
                          type="text"
                          placeholder={
                            label === 'i.'
                              ? 'First part (e.g., positive TF at promoter)'
                              : label === 'ii.'
                              ? 'Second part'
                              : 'Third part'
                          }
                          className="border border-gray-300 rounded px-3 py-1 flex-grow"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gene 2 */}
                  <div className="p-4">
                    <h5 className="font-medium mb-2">Gene 2</h5>
                    <p className="text-gray-800 text-sm mb-2">
                      Only list the <b>four</b> parts you truly used, in order (not all tools are needed here).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {['i', 'ii', 'iii', 'iv'].map((label, idx) => (
                        <div key={label} className="flex items-center">
                          <label className="font-medium mr-2 w-6" htmlFor={`day1-sim-gene2-${idx}`}>{label}.</label>
                          <input
                            id={`day1-sim-gene2-${idx}`}
                            value={answersData.sim.gene2[idx] || ''}
                            onChange={(e) => setSimGene('gene2', idx, e.target.value)}
                            type="text"
                            placeholder={`Part ${label}`}
                            className="border border-gray-300 rounded px-3 py-1 flex-grow"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gene 3 */}
                  <div className="p-4">
                    <h5 className="font-medium mb-2">Gene 3</h5>
                    <p className="text-gray-800 text-sm mb-2">List the <b>four</b> parts used here, in order:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {['i', 'ii', 'iii', 'iv'].map((label, idx) => (
                        <div key={label} className="flex items-center">
                          <label className="font-medium mr-2 w-6" htmlFor={`day1-sim-gene3-${idx}`}>{label}.</label>
                          <input
                            id={`day1-sim-gene3-${idx}`}
                            value={answersData.sim.gene3[idx] || ''}
                            onChange={(e) => setSimGene('gene3', idx, e.target.value)}
                            type="text"
                            placeholder={`Part ${label}`}
                            className="border border-gray-300 rounded px-3 py-1 flex-grow"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reflections */}
                <div className="p-4 bg-gray-50">
                  <h5 className="font-medium mb-4">Reflection Questions</h5>
                  {[
                    'Gene ON → Protein made: In your own words, what steps were needed for transcription and translation to succeed? Name the key parts you used (promoter, TFs, RNA polymerase, operator/repressor, ribosome).',
                    'Gene OFF → No protein: What would it look like to turn a gene OFF in this simulation? Which parts/tools caused the gene to be OFF?',
                    'Turning a gene ON: List the steps (in order) that “turn on” a gene so a protein is produced. Be specific.',
                    'Missing component: Pick one part (e.g., ribosome or RNA polymerase). What happened when that part was missing, and why?'
                  ].map((q, i) => (
                    <div key={i} className="mb-4">
                      <label className="text-sm font-medium mb-2 block" htmlFor={`day1-sim-reflection-${i}`}>{q}</label>
                      <textarea
                        id={`day1-sim-reflection-${i}`}
                        value={answersData.sim.reflections[i] || ''}
                        onChange={(e) => setSimReflection(i, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                        rows={2}
                        placeholder="Write your thoughts…"
                      />
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 flex flex-wrap gap-3 justify-end">
                  <button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
                    onClick={() =>
                      setAnswersData((a) => {
                        const next = {
                          ...a,
                          sim: {
                            gene1: Array(5).fill(''),
                            gene2: Array(4).fill(''),
                            gene3: Array(6).fill(''),
                            reflections: Array(4).fill('')
                          }
                        };
                        Promise.resolve().then(markDirtyAndDebounce);
                        return next;
                      })
                    }
                  >
                    Reset Answers
                  </button>
                  <button
                    className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
                    onClick={handleSave}
                  >
                    Save Answers
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Inquiry & Discussion */}
        <section id="inquiry-section" className="mb-16">
          <div className="bg-primary-100 rounded-2xl shadow-md p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 text-primary-200">
              <i className="fa-solid fa-quote-right text-9xl opacity-30" />
            </div>

            <h2 className="text-2xl font-bold mb-6 text-primary-800 relative z-10">
              <i className="fa-solid fa-lightbulb text-primary-500 mr-3" />
              Inquiry & Discussion
            </h2>

            <div className="bg-white rounded-xl p-6 shadow-sm mb-6 relative z-10">
              {[
                { q: 'What if a repressor is bound on the operator?', a: 'RNA polymerase cannot proceed—remove the repressor or add an inducer.' },
                { q: 'Which environmental factors affect regulation?', a: 'Temperature, chemicals, and light can change transcription factor activity.' },
                { q: 'How do mutations impact regulation?', a: 'Mutations in promoters/operators or TF binding sites can misregulate expression.' }
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
              <p className="text-gray-800 mb-4">
                A cell is exposed to extreme heat. Predict how heat shock might change transcription factor activity and protein production.
              </p>
              <label htmlFor="day1-inquiry-think" className="sr-only">Think and respond</label>
              <textarea
                id="day1-inquiry-think"
                value={answersData.inquiry.think}
                onChange={(e) => setInquiryThink(e.target.value)}
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

        {/* Section 8: Wrap-Up & Reflection */}
        <section id="wrap-up-section" className="mb-16">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <i className="fa-solid fa-flag-checkered text-primary-500 mr-3" />
              Wrap-Up & Reflection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Day 1 Takeaways</h3>
                <ul className="space-y-3">
                  {[
                    'Gene regulation controls which genes are expressed (ON/OFF)',
                    'Promoters, operators, repressors, TFs, RNA polymerase, and ribosomes play specific roles',
                    'Environment can influence regulation',
                    'Errors in regulation can cause disease'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 bg-gray-100 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <i className="fa-solid fa-arrow-right text-primary-500 mr-2" />
                    Coming Up Tomorrow
                  </h4>
                  <p className="text-gray-800 text-sm">
                    Day 2: “Gene Regulation in Action” — real-world examples of regulation and its impact on development & disease.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Reflection Journal</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-gray-800 mb-3 block" htmlFor="day1-wrap-reflection">Reflect: What surprised you most today?</label>
                  <textarea
                    id="day1-wrap-reflection"
                    value={answersData.wrap.reflection}
                    onChange={(e) =>
                      setAnswersData((a) => {
                        const next = { ...a, wrap: { ...a.wrap, reflection: e.target.value } };
                        Promise.resolve().then(markDirtyAndDebounce);
                        return next;
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                    rows={6}
                    placeholder="Type your reflection here..."
                  />
                  <div className="flex justify-end">
                    <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg">
                      Save Reflection
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

        <div className="flex justify-between mt-8">
          <Link
            to="/sections/vocabulary"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Important Vocabulary
          </Link>
          <Link
            to="/sections/day-2"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            Go to Day 2
            <i className="fa-solid fa-arrow-right ml-2" />
          </Link>
        </div>
      </main>

      <footer id="footer" className="bg-white border-t border-gray-200 py-6 text-center" />

      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}

      {/* Legacy diagram modal (kept) */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-4 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="w-full h-auto object-contain"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/83ad216047-58dd7cda2076e1890e82.png"
              alt="Gene regulation diagram showing how genes are turned on and off"
              title="Gene regulation diagram"
            />
            <div className="text-right mt-3">
              <button
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Day1Page;
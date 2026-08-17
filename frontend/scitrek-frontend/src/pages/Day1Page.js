// src/pages/Day1Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  CardSelect,
  ClozeChoice,
  PredictThenReveal,
  RankItems,
  SentenceStarters,
  StageDesk,
  StepFlow,
  normalizeRank,
} from '../components/interactions';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

// ---- gene expression steps for the ordering task ---------------------------
const INITIAL_STEPS = [
  'RNA polymerase binds to the positive transcription factor',
  'Transcription',
  'mRNA is created',
  'Translation',
  'Protein is created'
];

// The parts available in the PhET Biomolecule Toolbox. Students used to retype
// these labels from the simulation into blank inputs, which measured typing
// rather than reasoning; now they select and order the real vocabulary.
const PHET_PARTS = [
  'Promoter',
  'Positive transcription factor',
  'Negative transcription factor (repressor)',
  'RNA polymerase',
  'Ribosome',
  'mRNA destroyer'
];

const GENE_PLANS = [
  { key: 'gene1', label: 'Gene 1', size: 3, note: 'Plan the three parts you will need.' },
  { key: 'gene2', label: 'Gene 2', size: 4, note: 'Only the four parts you truly used — not every tool is needed here.' },
  { key: 'gene3', label: 'Gene 3', size: 4, note: 'List the four parts used here, in order.' }
];

const INQUIRY_ITEMS = [
  {
    q: 'What if a repressor is bound on the operator?',
    a: 'RNA polymerase cannot proceed—remove the repressor or add an inducer.'
  },
  {
    q: 'Which environmental factors affect regulation?',
    a: 'Temperature, chemicals, and light can change transcription factor activity.'
  },
  {
    q: 'How do mutations impact regulation?',
    a: 'Mutations in promoters/operators or TF binding sites can misregulate expression.'
  }
];

const SIM_REFLECTIONS = [
  {
    title: 'Gene ON → protein made',
    prompt: 'In your own words, what steps were needed for transcription and translation to succeed? Name the key parts you used (promoter, TFs, RNA polymerase, operator/repressor, ribosome).'
  },
  {
    title: 'Gene OFF → no protein',
    prompt: 'What would it look like to turn a gene OFF in this simulation? Which parts/tools caused the gene to be OFF?'
  },
  {
    title: 'Turning a gene ON',
    prompt: 'List the steps (in order) that “turn on” a gene so a protein is produced. Be specific.'
  },
  {
    title: 'Missing component',
    prompt: 'Pick one part (e.g., ribosome or RNA polymerase). What happened when that part was missing, and why?'
  }
];

/** Turn a stored ordered list of part labels into the shape RankItems wants. */
const partsRankValue = (chosen, size) => {
  const ordered = (Array.isArray(chosen) ? chosen : []).filter((p) => PHET_PARTS.includes(p)).slice(0, size);
  return {
    available: PHET_PARTS.filter((p) => !ordered.includes(p)),
    ordered: [...ordered, ...Array(Math.max(0, size - ordered.length)).fill('')],
    orderSize: size
  };
};

/** Free text a student saved before this activity used the part vocabulary. */
const legacyPartNotes = (chosen) =>
  (Array.isArray(chosen) ? chosen : []).filter((p) => p && !PHET_PARTS.includes(p));

const Day1Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 1;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- AUTOSAVE state -------------------------------------------------------
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);
  const unmountedRef = useRef(false);

  // Centralized answers — keys and value types are unchanged from before, so
  // previously saved work and the teacher dashboard are unaffected.
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
    // `predictions` is additive: it stores the prediction a student commits to
    // before revealing each expert answer.
    inquiry: { think: '', predictions: Array(INQUIRY_ITEMS.length).fill('') },
    sim: {
      gene1: Array(3).fill(''),
      gene2: Array(4).fill(''),
      gene3: Array(4).fill(''),
      reflections: Array(4).fill('')
    },
    wrap: { reflection: '', surprise: '' },
    // legacy keys kept as no-ops
    simOn: '',
    simOff: '',
    simObservations: '',
    simSteps: Array(3).fill(''),
    discussion: Array(3).fill(''),
    exitTicket: Array(3).fill('')
  });
  const answersDataRef = useRef(answersData);

  useEffect(() => {
    answersDataRef.current = answersData;
  }, [answersData]);

  const [showModal, setShowModal] = useState(false);
  const [showUtah1, setShowUtah1] = useState(false);
  const [showUtah2, setShowUtah2] = useState(false);

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

  // ------- load user + saved answers -------
  useEffect(() => {
    let isMounted = true;

    const normalizeAnswers = (payload) => {
      setAnswersData((prev) => {
        const next = { ...prev, ...(payload || {}) };

        const trim = (arr, size) =>
          Array.isArray(arr)
            ? arr.slice(0, size).concat(Array(Math.max(0, size - arr.length)).fill(''))
            : Array(size).fill('');

        next.sim = {
          gene1: trim(next.sim?.gene1, 3),
          gene2: trim(next.sim?.gene2, 4),
          gene3: trim(next.sim?.gene3, 4),
          reflections: trim(next.sim?.reflections, 4)
        };

        next.dnd = normalizeRank(next.dnd, INITIAL_STEPS, INITIAL_STEPS.length);

        if (!Array.isArray(next.fillBlanks) || next.fillBlanks.length < 13) {
          const fb = Array(13).fill('');
          (next.fillBlanks || []).forEach((v, i) => {
            fb[i] = v;
          });
          next.fillBlanks = fb;
        }

        next.inquiry = {
          think: next.inquiry?.think || '',
          predictions: trim(next.inquiry?.predictions, INQUIRY_ITEMS.length)
        };

        next.wrap = { reflection: '', surprise: '', ...(next.wrap || {}) };

        return next;
      });
    };

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
          // treat missing saved data as empty answers
        }
        if (!isMounted) return;

        if (data?.answers) {
          const payload = data.answers.answers || data.answers;
          normalizeAnswers(payload);
          setDirty(false);
          setLastSavedAt(new Date());
        } else {
          normalizeAnswers(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [moduleId]);

  // ------- save routine / debouncer -------
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- state setters (each marks dirty + debounces autosave) ---------------
  const update = (mutate) =>
    setAnswersData((a) => {
      const next = mutate(a);
      Promise.resolve().then(markDirtyAndDebounce);
      return next;
    });

  const setFill = (idx, val) =>
    update((a) => {
      const fillBlanks = [...a.fillBlanks];
      fillBlanks[idx] = val;
      return { ...a, fillBlanks };
    });

  const setGeneQ1 = (val) => update((a) => ({ ...a, geneQ1: val }));

  const setInquiryThink = (val) =>
    update((a) => ({ ...a, inquiry: { ...a.inquiry, think: val } }));

  const setInquiryPrediction = (idx, val) =>
    update((a) => {
      const predictions = [...(a.inquiry.predictions || [])];
      predictions[idx] = val;
      return { ...a, inquiry: { ...a.inquiry, predictions } };
    });

  const setGeneParts = (geneKey, ordered) =>
    update((a) => ({ ...a, sim: { ...a.sim, [geneKey]: ordered } }));

  const setSimReflection = (idx, val) =>
    update((a) => {
      const reflections = [...a.sim.reflections];
      reflections[idx] = val;
      return { ...a, sim: { ...a.sim, reflections } };
    });

  const setDnd = (next) => update((a) => ({ ...a, dnd: next }));

  const setWrap = (key, val) =>
    update((a) => ({ ...a, wrap: { ...a.wrap, [key]: val } }));

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  // Sized by aspect ratio rather than a fixed height, so the same element is
  // large on the stage and small in the corner dock without ever remounting.
  const videoPane = (
    <div className="w-full rounded-xl overflow-hidden ring-1 ring-gray-200 bg-black">
      <iframe
        className="w-full aspect-video max-h-[70vh] block"
        src="https://www.youtube.com/embed/ebIpkw3XapE"
        title="Gene Regulation and the Order of the Operon"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );

  const phetPane = (
    <div className="w-full bg-gray-100 rounded-xl p-3 relative overflow-hidden ring-1 ring-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-700">PhET: Gene Expression Essentials</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-white hover:bg-gray-50 border"
            onClick={() => {
              const iframe = document.getElementById('phet-gene-expression-iframe');
              if (iframe) {
                const src = iframe.getAttribute('src');
                if (src) iframe.setAttribute('src', src);
              }
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
          className="w-full aspect-[4/3] max-h-[75vh] block bg-white"
          allowFullScreen
        />
      </div>

      <p className="mt-2 text-xs text-gray-600">
        Trouble loading? Some school filters or browser extensions can block embeds. Use “Open in new tab” above if needed.
      </p>
    </div>
  );

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
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

      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Section 1: Welcome & Orientation */}
        <div className="text-center mb-8" id="welcome-section">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 1: Unlocking the Code</h1>
          <h2 className="text-xl md:text-2xl text-gray-700 mb-8">How Your Cells Decide What to Do</h2>
        </div>

        {/* Section 2: Objective */}
        <section id="objective-section" className="mb-16">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <div className="flex flex-col md:flex-row items-start">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 flex items-center text-primary-700">
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
                <p className="text-gray-700 mb-4">
                  Gene regulation is how cells control which genes are expressed (ON) or repressed (OFF). Think of your genes
                  as a library of instructions—regulation decides which “books” are read when.
                </p>
                <p className="text-gray-700 mb-4">
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
                        className="w-full text-stone-900 bg-primary-500 hover:bg-primary-600 font-medium py-2 px-3 rounded-lg"
                        onClick={() => setShowUtah1(true)}
                      >
                        1) Anatomy of a Gene
                      </button>
                      <button
                        className="w-full text-stone-900 bg-primary-500 hover:bg-primary-600 font-medium py-2 px-3 rounded-lg"
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
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100]"
                onClick={() => setShowUtah1(false)}
              >
                <div
                  className="bg-white p-2 rounded-xl w-[95vw] h-[90vh] max-w-6xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <h5 className="font-semibold">Anatomy of a Gene (learn.genetics.utah.edu)</h5>
                    <button
                      className="px-3 py-1 bg-primary-500 text-stone-900 rounded-md"
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
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100]"
                onClick={() => setShowUtah2(false)}
              >
                <div
                  className="bg-white p-2 rounded-xl w-[95vw] h-[90vh] max-w-6xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <h5 className="font-semibold">Central Dogma: Translation (learn.genetics.utah.edu)</h5>
                    <button
                      className="px-3 py-1 bg-primary-500 text-stone-900 rounded-md"
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

        {/* Section 4: Video & inline cloze — video stays pinned beside the blanks */}
        <section id="video-section" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <header className="mb-4">
            <h3 className="text-2xl font-semibold flex items-center">
              <i className="fa-solid fa-video text-primary-500 mr-3" />
              Learn with the Amoeba Sisters
            </h3>
            <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mt-1">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>Tap the word that completes each idea. The video stays on screen while you answer.</span>
            </p>
          </header>

          <StageDesk
            media={videoPane}
            mediaTitle="Gene Expression and Regulation"
            mediaNote="Heads-up: in translation, the ribosome uses the mRNA to build a protein."
          >
            <div className="space-y-5">
              <h4 className="text-lg font-semibold">Complete each idea as you watch</h4>

              <p className="leading-loose text-[15px] md:text-base">
                To express a gene means that a gene can be used to make something functional, often a
                <ClozeChoice blankNumber={1} value={answersData.fillBlanks[0]} onChange={(v) => setFill(0, v)} options={['DNA', 'protein']} />.
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                The gene, which is made up of DNA, can be transcribed into mRNA during
                <ClozeChoice blankNumber={2} value={answersData.fillBlanks[1]} onChange={(v) => setFill(1, v)} options={['transcription', 'translation']} />
                and then used in
                <ClozeChoice blankNumber={3} value={answersData.fillBlanks[2]} onChange={(v) => setFill(2, v)} options={['transcription', 'translation']} />
                to make a polypeptide chain. A protein is made up of 1 or more of those chains.
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                But you know what? Not every gene is expressed! That’s why the phrase “gene regulation” gets paired with “gene expression” — because the
                <ClozeChoice blankNumber={4} value={answersData.fillBlanks[3]} onChange={(v) => setFill(3, v)} options={['expression', 'regulation']} />
                has to be
                <ClozeChoice blankNumber={5} value={answersData.fillBlanks[4]} onChange={(v) => setFill(4, v)} options={['expressed', 'regulated']} />.
                For example, a cell in the eye has no need for using a gene that codes for stomach acid, even though the gene is present. It would be wasteful to express that gene!
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                How does gene regulation involve or impact transcription? Transcription is when an enzyme called
                <ClozeChoice blankNumber={6} value={answersData.fillBlanks[5]} onChange={(v) => setFill(5, v)} options={['RNA polymerase', 'gRNA lactase']} />
                makes mRNA from a DNA template. There are regulatory proteins that can decrease or increase transcription. These regulatory proteins are often referred to as
                <ClozeChoice blankNumber={7} value={answersData.fillBlanks[6]} onChange={(v) => setFill(6, v)} options={['transitory codons', 'transcription factors']} />.
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                Some transcription factors bind to a DNA region called the
                <ClozeChoice blankNumber={8} value={answersData.fillBlanks[7]} onChange={(v) => setFill(7, v)} options={['operator', 'promoter']} />
                to help RNA polymerase start transcription, while other transcription factors can bind there to repress it. Some transcription factors can bind to enhancer sequences, where they increase transcription. Ultimately, transcription factors play a huge role in whether a gene is expressed. Also, environmental factors can influence transcription factors, meaning that the presence or absence of an environmental factor could impact gene expression.
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                A
                <ClozeChoice blankNumber={9} value={answersData.fillBlanks[8]} onChange={(v) => setFill(8, v)} options={['repressor', 'sequence stop']} />
                blocks RNA polymerase from doing transcription by binding to a sequence called the
                <ClozeChoice blankNumber={10} value={answersData.fillBlanks[9]} onChange={(v) => setFill(9, v)} options={['operator', 'promoter']} />.
                Since the RNA polymerase can’t bind, these genes cannot be expressed. This is because if the genes cannot be transcribed into mRNA, they cannot go to
                <ClozeChoice blankNumber={11} value={answersData.fillBlanks[10]} onChange={(v) => setFill(10, v)} options={['transcription', 'translation']} />
                for a protein to be built.
              </p>

              <p className="leading-loose text-[15px] md:text-base">
                So, how does the gene get expressed? The repressor has got to be moved. In the presence of certain substances (in this case, lactose), another protein will bind to the repressor and move it out of the way. When the repressor is not blocking this RNA polymerase, transcription can happen! The RNA polymerase does transcription, and it makes the
                <ClozeChoice blankNumber={12} value={answersData.fillBlanks[11]} onChange={(v) => setFill(11, v)} options={['mRNA', 'DNA']} />,
                and translation can follow. It uses that mRNA to make
                <ClozeChoice blankNumber={13} value={answersData.fillBlanks[12]} onChange={(v) => setFill(12, v)} options={['protein', 'carbohydrates']} />.
                This is a great gene regulation example — controlling whether genes are expressed, or not!
              </p>

              <p className="text-xs text-gray-600" aria-live="polite">
                {answersData.fillBlanks.filter(Boolean).length} of 13 blanks completed
              </p>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-800 underline underline-offset-2"
                  onClick={() => update((a) => ({ ...a, fillBlanks: Array(13).fill('') }))}
                >
                  Reset choices
                </button>
                <button
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                  onClick={handleSave}
                >
                  Save Answers
                </button>
              </div>
            </div>
          </StageDesk>
        </section>

        {/* Section 5: Gene Expression vs. Regulation */}
        <section id="gene-expression-section" className="border border-gray-200 rounded-2xl p-6 md:p-8 bg-white">
          <h4 className="text-xl font-semibold mb-4">Gene Expression vs Gene Regulation</h4>
          <p className="text-gray-700 mb-3">
            What’s the relationship between expression and regulation, and why does it matter for our health?
          </p>
          <textarea
            value={answersData.geneQ1}
            onChange={(e) => setGeneQ1(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            rows={4}
            placeholder="Use terms like promoter, operator, repressor, transcription factors, RNA polymerase, ribosome…"
          />
          <SentenceStarters
            starters={[
              'Gene expression is when…',
              'Gene regulation decides…',
              'This matters for health because…',
              'For example, if a repressor…'
            ]}
            onInsert={(text) => setGeneQ1(answersData.geneQ1 ? `${answersData.geneQ1} ${text}` : text)}
          />

          <div className="mt-8">
            <h5 className="font-medium mb-1">Put the steps for gene expression in the typical order</h5>
            <RankItems
              value={answersData.dnd}
              onChange={setDnd}
              hint="Drag the cards, or use the Add and arrow buttons if you prefer the keyboard."
              poolLabel="Available steps"
              orderLabel="Your order"
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

        {/* Section 6: PhET Simulation */}
        <section id="simulation-section" className="mb-16">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-primary-500 px-6 md:px-8 py-4">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center">
                <i className="fa-solid fa-flask-vial mr-3" />
                Explore with the PhET Simulation (Embedded)
              </h2>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Guidance */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <h3 className="font-semibold mb-2">Step-by-Step: How to Complete This Simulation</h3>
                <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2">
                  <li>
                    <b>Press Play</b> in the embedded panel. If it freezes, use <b>Reload</b> in
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

              {/* Sim runs large, then docks into the corner while students record */}
              <StageDesk
                media={phetPane}
                mediaTitle="PhET: Gene Expression Essentials"
                showTitleOnStage={false}
              >
                <div>
                  <h4 className="font-semibold text-lg">Your Plan for Each Gene</h4>
                  <p className="text-sm text-gray-700 mt-1 mb-4">
                    Build the order you actually used from the Biomolecule Toolbox. It’s fine if some tools weren’t needed.
                  </p>

                  <StepFlow
                    title="Record each gene"
                    steps={GENE_PLANS.map(({ key, label, size, note }) => {
                      const chosen = answersData.sim[key] || [];
                      const legacy = legacyPartNotes(chosen);
                      return {
                        id: key,
                        title: label,
                        hint: note,
                        isComplete: chosen.filter((c) => PHET_PARTS.includes(c)).length === size,
                        render: () => (
                          <div>
                            {legacy.length ? (
                              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                <p className="font-medium mb-1">Your earlier notes for {label}</p>
                                <p>{legacy.join(', ')}</p>
                              </div>
                            ) : null}
                            <RankItems
                              value={partsRankValue(chosen, size)}
                              onChange={(next) => setGeneParts(key, next.ordered.filter(Boolean))}
                              poolLabel="Biomolecule toolbox"
                              orderLabel={`${label} — the order you used`}
                            />
                          </div>
                        )
                      };
                    })}
                  />
                </div>

                <div className="pt-2">
                  <h4 className="font-semibold text-lg mb-3">Reflection Questions</h4>
                  <StepFlow
                    steps={SIM_REFLECTIONS.map((r, i) => ({
                      id: `refl-${i}`,
                      title: r.title,
                      hint: r.prompt,
                      isComplete: Boolean((answersData.sim.reflections[i] || '').trim()),
                      render: () => (
                        <textarea
                          value={answersData.sim.reflections[i] || ''}
                          onChange={(e) => setSimReflection(i, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                          rows={4}
                          placeholder="Write your thoughts…"
                          aria-label={r.title}
                        />
                      )
                    }))}
                  />
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
                    onClick={() =>
                      update((a) => ({
                        ...a,
                        sim: {
                          gene1: Array(3).fill(''),
                          gene2: Array(4).fill(''),
                          gene3: Array(4).fill(''),
                          reflections: Array(4).fill('')
                        }
                      }))
                    }
                  >
                    Reset Answers
                  </button>
                  <button
                    className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                    onClick={handleSave}
                  >
                    Save Answers
                  </button>
                </div>
              </StageDesk>
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

            <div className="bg-white rounded-xl p-6 shadow-sm mb-6 relative z-10 space-y-4">
              <p className="text-sm text-gray-600">
                Predict first, then compare. You’ll remember it far better than reading the answer straight away.
              </p>
              {INQUIRY_ITEMS.map((item, idx) => (
                <PredictThenReveal
                  key={item.q}
                  question={item.q}
                  expertAnswer={item.a}
                  value={answersData.inquiry.predictions?.[idx] || ''}
                  onChange={(v) => setInquiryPrediction(idx, v)}
                />
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm relative z-10">
              <h3 className="text-xl font-semibold mb-4 text-primary-700">Think & Respond</h3>
              <p className="text-gray-700 mb-4">
                A cell is exposed to extreme heat. Predict how heat shock might change transcription factor activity and protein production.
              </p>
              <textarea
                value={answersData.inquiry.think}
                onChange={(e) => setInquiryThink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Type your response here..."
              />
              <SentenceStarters
                starters={[
                  'If the cell gets very hot, I predict…',
                  'Transcription factors would…',
                  'That means protein production…'
                ]}
                onInsert={(text) =>
                  setInquiryThink(answersData.inquiry.think ? `${answersData.inquiry.think} ${text}` : text)
                }
              />
              <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
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
                  <p className="text-gray-700 text-sm">
                    Day 2: “Gene Regulation in Action” — real-world examples of regulation and its impact on development & disease.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Reflection Journal</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <CardSelect
                    legend="Reflect: what surprised you most today?"
                    hint="Pick the closest one, then say why in your own words."
                    columns={1}
                    value={answersData.wrap.surprise}
                    onChange={(v) => setWrap('surprise', v)}
                    options={[
                      { label: 'How much control happens before a protein is even made', icon: 'fa-solid fa-sliders' },
                      { label: 'That every cell has the same genes but uses different ones', icon: 'fa-solid fa-clone' },
                      { label: 'How a single blocked spot on DNA can switch a gene off', icon: 'fa-solid fa-ban' },
                      { label: 'That the environment outside a cell can change what it expresses', icon: 'fa-solid fa-cloud-sun' },
                      { label: 'Something else', icon: 'fa-solid fa-pen' }
                    ]}
                  />

                  <label htmlFor="day1-reflection" className="block text-gray-700 mt-4 mb-2">
                    Tell us why that surprised you.
                  </label>
                  <textarea
                    id="day1-reflection"
                    value={answersData.wrap.reflection}
                    onChange={(e) => setWrap('reflection', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                    rows={5}
                    placeholder="Type your reflection here..."
                  />
                  <div className="flex justify-end">
                    <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                      Save Reflection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Action */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-6 rounded-lg"
          >
            Save
          </button>
        </div>

        <div className="flex justify-between mt-8">
          <Link
            to="/sections/vocabulary"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Important Vocabulary
          </Link>
          <Link
            to="/sections/day-2"
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
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
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100]"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-4 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="w-full h-auto object-contain"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/83ad216047-58dd7cda2076e1890e82.png"
              alt="gene regulation diagram large"
            />
            <div className="text-right mt-3">
              <button
                className="px-4 py-2 bg-primary-500 text-stone-900 rounded-lg hover:bg-primary-600"
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

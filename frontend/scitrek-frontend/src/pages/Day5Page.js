// src/pages/Day5Page.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  PredictThenReveal,
  SentenceStarters,
  StepFlow,
  StageDesk,
  StructuredReflection,
  composeParts,
  decomposeText,
} from '../components/interactions';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

const TEMPLATE_URL =
  'https://docs.google.com/presentation/d/1v-u2kytUM2MXvtG2qnFLdON0U4pX2Ey0y1cVEgj6zFY/edit?usp=sharing';

// The Results prompt already names the four things it wants; they are fields now.
const RESULTS_PARTS = [
  {
    key: 'resNormal',
    label: 'Normal function of the gene',
    placeholder: 'What does this gene usually do in a healthy breast cell?',
  },
  {
    key: 'resCancer',
    label: 'How it behaves differently in cancer',
    placeholder: 'Is it louder or quieter? Mutated? What changes?',
  },
  {
    key: 'resWhy',
    label: 'Why it matters for doctors and patients',
    placeholder: 'Clinical relevance — diagnosis, prognosis, or treatment choice.',
  },
  {
    key: 'resSurprise',
    label: 'Anything unexpected you found',
    placeholder: 'It is fine to write “nothing surprised me” and say why.',
  },
];

const DAY5_INQUIRY = [
  {
    q: 'What makes a scientific figure credible?',
    a: 'Clear labeling, appropriate axes/scales, defined controls, and sources you can cite.',
  },
  {
    q: 'How do you present uncertainty honestly?',
    a: 'Show error bars or ranges, note limitations, and avoid overstating conclusions.',
  },
  {
    q: 'What changed after peer feedback?',
    a: 'Summarize one edit you made to improve clarity, evidence, or design.',
  },
];

const Day5Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 5;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- autosave state ---
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  // Centralized answers model
  const [answersData, setAnswersData] = useState({
    intro: { whyPoster: '' },
    step1: { title: '' },
    step2: { oneLineExplanation: '' },
    step3: { procedureSummary: '', topSources: ['', '', '', '', ''] },
    step4: { visualLink: '', caption: '' },
    // `resultsSummaryParts` is additive; `resultsSummary` still holds the prose.
    step5: { resultsSummary: '', resultsSummaryParts: {} },
    step6: { conclusion: '', challenges: '', improvements: '' },
    step7: { assemblyNotes: '', designNotes: '' },
    step8: { presentationNotes: '', peerFeedbackGiven: '', peerFeedbackReceived: '' },
    inquiry: { think: '', predictions: ['', '', ''] },
    spotlight: { takeaways: '' },
    wrap: { whyCommMatters: '', lookingAhead: '', finalReflection: '' },
  });
  const answersDataRef = useRef(answersData);

  useEffect(() => {
    answersDataRef.current = answersData;
  }, [answersData]);

  // ------- load user + saved answers -------
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
            if (!merged.step3?.topSources || !Array.isArray(merged.step3.topSources)) {
              merged.step3 = merged.step3 || {};
              merged.step3.topSources = ['', '', '', '', ''];
            }
            merged.inquiry = {
              think: merged.inquiry?.think || '',
              predictions: Array.isArray(merged.inquiry?.predictions)
                ? merged.inquiry.predictions.slice(0, DAY5_INQUIRY.length)
                : Array(DAY5_INQUIRY.length).fill(''),
            };
            merged.step5 = { resultsSummaryParts: {}, ...(merged.step5 || {}) };
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

  // ------- helpers -------
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
    // clear any existing
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (dirty && !saving) saveAnswers({ silent: true });
    }, 15000); // every 15s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]); // re-evaluate when flags change

  // save on tab hide / close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        // Some browsers ignore async here; set flag to hint unsaved work.
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dirty && !saving) {
        // Fire-and-forget; browser may cut it short, but better than nothing.
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
  }, [dirty, saving]); // use latest flags

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

  // lightweight nested setter with autosave debounce
  const setField = (path, value) => {
    setAnswersData((prev) => {
      const clone = structuredClone(prev);
      // eslint-disable-next-line no-new-func
      new Function('obj', 'value', `obj.${path} = value;`)(clone, value);
      return clone;
    });
    setDirty(true);

    // debounce autosave ~2s after last keystroke
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

  if (loading) return <div className="flex items-center justify-center h-screen">Loading…</div>;

  const a = answersData;
  const resultsCarry = Object.keys(a.step5.resultsSummaryParts || {}).length
    ? ''
    : decomposeText(RESULTS_PARTS, a.step5.resultsSummary).carryOver;

  const filled = (v) => Boolean((v || '').trim());

  // Live preview of the poster the student is assembling. Keeping it on screen
  // is the point: the eight prompts were previously eight separate cards, so
  // nobody could see the whole poster while writing any one part of it.
  const posterPreview = (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm">
        <div className="font-semibold text-primary-800 mb-1">Slideshow template</div>
        <a href={TEMPLATE_URL} target="_blank" rel="noreferrer noopener" className="text-primary-700 underline">
          Open the Google Slides template
        </a>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Your poster so far</h4>
        <dl className="space-y-2 text-sm">
          {[
            ['Title', a.step1.title],
            ['Research explanation', a.step2.oneLineExplanation],
            ['Procedure', a.step3.procedureSummary],
            ['Visual caption', a.step4.caption],
            ['Results', a.step5.resultsSummary],
            ['Conclusion', a.step6.conclusion],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className={filled(value) ? 'text-gray-800 whitespace-pre-wrap' : 'text-gray-600 italic'}>
                {filled(value) ? value : 'Not written yet'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );

  const posterSteps = [
    {
      id: 'step1',
      title: 'Step 1: Title',
      hint: 'A clear, descriptive title for your project.',
      isComplete: filled(a.step1.title),
      render: () => (
        <>
          <p className="text-gray-700 mb-2 text-sm">
            Example: “BRCA-1 Gene &amp; Breast Cancer: Causes &amp; Conclusions”.
          </p>
          <label htmlFor="d5-title" className="block text-sm font-medium mb-1">Your project title</label>
          <input
            id="d5-title"
            value={a.step1.title}
            onChange={(e) => setField('step1.title', e.target.value)}
            className="w-full border border-gray-300 rounded p-3"
            placeholder='Example: “BRCA-1 Gene & Breast Cancer: Causes & Conclusions”'
          />
        </>
      ),
    },
    {
      id: 'step2',
      title: 'Step 2: Research Explanation',
      hint: 'Your main conclusion in one sentence. What does your gene do, and how does it relate to breast cancer progression?',
      isComplete: filled(a.step2.oneLineExplanation),
      render: () => (
        <>
          <label htmlFor="d5-explain" className="block text-sm font-medium mb-1">
            One-sentence research explanation
          </label>
          <textarea
            id="d5-explain"
            value={a.step2.oneLineExplanation}
            onChange={(e) => setField('step2.oneLineExplanation', e.target.value)}
            className="w-full border border-gray-300 rounded p-3"
            rows={3}
            placeholder='Example: “Gene XYZ contributes to breast cancer through a mutation that disables ABC, which normally regulates cell growth in breast tissue.”'
          />
          <SentenceStarters
            starters={[
              'My gene normally…',
              'In breast cancer it…',
              'which means that as the cancer progresses…',
            ]}
            onInsert={(t) => appendTo('step2.oneLineExplanation', a.step2.oneLineExplanation, t)}
          />
        </>
      ),
    },
    {
      id: 'step3',
      title: 'Step 3: Description of Procedure',
      hint: 'A short explanation of your research process, plus the top 3–5 sources you used.',
      isComplete: filled(a.step3.procedureSummary) && a.step3.topSources.filter(filled).length >= 3,
      render: () => (
        <>
          <label htmlFor="d5-procedure" className="block text-sm font-medium mb-1">Procedure summary</label>
          <textarea
            id="d5-procedure"
            value={a.step3.procedureSummary}
            onChange={(e) => setField('step3.procedureSummary', e.target.value)}
            className="w-full border border-gray-300 rounded p-3 mb-4"
            rows={4}
            placeholder="What did you look up or analyze? How did you compare expression between typical (healthy) vs cancer cells?"
          />

          <h5 className="font-medium mb-1">Top 3–5 Sources</h5>
          <p className="text-xs text-gray-600 mb-2" aria-live="polite">
            {a.step3.topSources.filter(filled).length} of 5 listed — three is the minimum.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {a.step3.topSources.map((src, i) => (
              <input
                key={i}
                value={src}
                onChange={(e) => {
                  const next = [...a.step3.topSources];
                  next[i] = e.target.value;
                  setField('step3.topSources', next);
                }}
                className="w-full border border-gray-300 rounded p-2"
                placeholder={`Source ${i + 1}`}
                aria-label={`Source ${i + 1}`}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'step4',
      title: 'Step 4: Visual Data Representation',
      hint: 'A bar graph, heat map, or similar showing your gene in a cancer cell and in a typical healthy cell.',
      isComplete: filled(a.step4.visualLink) && filled(a.step4.caption),
      render: () => (
        <>
          <div className="bg-gray-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700">
              Draw or find a visual (bar graph, heat map, etc.) showing gene expression for your gene in a cancer cell AND in a
              typical (healthy) cell. Upload the visual to your slide. Label which samples are healthy and which are cancerous.
            </p>
          </div>

          <label htmlFor="d5-visual" className="block text-sm font-medium mb-1">
            Link to your visual (or where it’s uploaded)
          </label>
          <input
            id="d5-visual"
            value={a.step4.visualLink}
            onChange={(e) => setField('step4.visualLink', e.target.value)}
            className="w-full border border-gray-300 rounded p-3 mb-3"
            placeholder="Paste a link to your chart/heatmap (Slides/Drive/image, etc.)"
          />

          <label htmlFor="d5-caption" className="block text-sm font-medium mb-1">Caption (1–2 sentences)</label>
          <textarea
            id="d5-caption"
            value={a.step4.caption}
            onChange={(e) => setField('step4.caption', e.target.value)}
            className="w-full border border-gray-300 rounded p-3"
            rows={3}
            placeholder="Explain what your visual shows (healthy vs cancer expression) and what the key takeaway is."
          />
        </>
      ),
    },
    {
      id: 'step5',
      title: 'Step 5: Results',
      hint: 'Four things belong in a results summary. Write them one at a time and the full paragraph assembles below.',
      isComplete: RESULTS_PARTS.every(({ key }) => filled(a.step5.resultsSummaryParts?.[key])),
      render: () => (
        <StructuredReflection
          parts={RESULTS_PARTS}
          values={a.step5.resultsSummaryParts}
          carryOver={resultsCarry}
          onChange={(next) =>
            setStructured('step5.resultsSummaryParts', 'step5.resultsSummary', RESULTS_PARTS, next)
          }
        />
      ),
    },
    {
      id: 'step6',
      title: 'Step 6: Conclusion',
      hint: 'What your findings mean, plus an honest look at what was hard and what you would change.',
      isComplete: filled(a.step6.conclusion),
      render: () => (
        <>
          <p className="text-gray-700 mb-3 text-sm">
            Discuss whether what you observed was the normal function of the gene, and how changes in this gene (expression or
            mutation) could contribute to how a cell becomes cancerous.
          </p>

          <label htmlFor="d5-conclusion" className="block text-sm font-medium mb-1">Conclusion</label>
          <textarea
            id="d5-conclusion"
            value={a.step6.conclusion}
            onChange={(e) => setField('step6.conclusion', e.target.value)}
            className="w-full border border-gray-300 rounded p-3 mb-3"
            rows={3}
            placeholder="What do your results mean? How could this gene’s behavior contribute to cancer progression?"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="d5-challenges" className="block text-sm font-medium mb-1">
                Challenges / possible sources of error
              </label>
              <textarea
                id="d5-challenges"
                value={a.step6.challenges}
                onChange={(e) => setField('step6.challenges', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="What was difficult? What might have limited accuracy or clarity?"
              />
            </div>
            <div>
              <label htmlFor="d5-improvements" className="block text-sm font-medium mb-1">
                Improvements for next time
              </label>
              <textarea
                id="d5-improvements"
                value={a.step6.improvements}
                onChange={(e) => setField('step6.improvements', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="What would you change or add to make your research/visuals stronger next time?"
              />
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'step7',
      title: 'Step 7: Assemble the Slideshow',
      hint: 'Organize the parts above into slides, then make it visually appealing without burying the science.',
      isComplete: filled(a.step7.assemblyNotes),
      render: () => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="d5-assembly" className="block text-sm font-medium mb-1">
                Slide order &amp; structure checklist
              </label>
              <textarea
                id="d5-assembly"
                value={a.step7.assemblyNotes}
                onChange={(e) => setField('step7.assemblyNotes', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="List your slide order (Title → Research Explanation → Procedure/Sources → Visual/Caption → Results → Conclusion → etc.)"
              />
              <SentenceStarters
                label="Suggested order — tap to add:"
                starters={[
                  'Title →',
                  'Research Explanation →',
                  'Procedure & Sources →',
                  'Visual & Caption →',
                  'Results →',
                  'Conclusion',
                ]}
                onInsert={(t) => appendTo('step7.assemblyNotes', a.step7.assemblyNotes, t)}
              />
            </div>
            <div>
              <label htmlFor="d5-design" className="block text-sm font-medium mb-1">
                Design notes (readable + creative)
              </label>
              <textarea
                id="d5-design"
                value={a.step7.designNotes}
                onChange={(e) => setField('step7.designNotes', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="Colors, fonts, spacing, labeling, accessibility, and what creative elements you’re adding."
              />
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mt-4 text-sm">
            Hint: Add a QR code or share link on your slides so others can view your presentation easily.
          </div>
        </>
      ),
    },
    {
      id: 'step8',
      title: 'Step 8: Presentation & Peer Feedback',
      hint: 'Present to the class, then record what you gave and what you got.',
      isComplete: filled(a.step8.presentationNotes),
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="d5-pres" className="block text-sm font-medium mb-1">Presentation notes</label>
            <textarea
              id="d5-pres"
              value={a.step8.presentationNotes}
              onChange={(e) => setField('step8.presentationNotes', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={3}
              placeholder="How did your presentation go? Timing, clarity, what you emphasized."
            />
          </div>
          <div>
            <label htmlFor="d5-fb-given" className="block text-sm font-medium mb-1">Feedback you gave others</label>
            <textarea
              id="d5-fb-given"
              value={a.step8.peerFeedbackGiven}
              onChange={(e) => setField('step8.peerFeedbackGiven', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={3}
              placeholder="Write 1 positive note + 1 constructive suggestion you gave."
            />
          </div>
          <div>
            <label htmlFor="d5-fb-recv" className="block text-sm font-medium mb-1">Feedback you received</label>
            <textarea
              id="d5-fb-recv"
              value={a.step8.peerFeedbackReceived}
              onChange={(e) => setField('step8.peerFeedbackReceived', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={3}
              placeholder="What feedback did you receive? What will you change based on it?"
            />
          </div>
        </div>
      ),
    },
  ];

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
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Day 5: Poster Presentation — Showcasing Your Scientific Journey!</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">
            Create a slideshow (research-poster style) explaining how ONE gene behaves differently during breast cancer progression
          </h2>
        </div>

        {/* 1) Objective */}
        <section id="objective-section">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border-l-4 border-primary-500">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-primary-700">
              <i className="fa-solid fa-bullseye text-primary-500 mr-3" />
              Objective
            </h2>
            <p className="text-gray-700 mb-4">
              You will create a slideshow in the style of a research poster that explains how one specific gene behaves differently
              during the growth of breast cancer. Your slideshow should include: a title, research explanation, procedure,
              visual data representation (bar graph/heat map/etc.), results, and conclusion.
            </p>

            <label className="block text-sm font-medium mb-1">Why do scientists use research posters/slides to share findings?</label>
            <textarea
              value={answersData.intro.whyPoster}
              onChange={(e) => setField('intro.whyPoster', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={3}
              placeholder="Explain the purpose of research posters (sharing results clearly, visuals, evidence, quick communication to others, etc.)…"
            />
            <div className="flex justify-end mt-4">
              <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                Save Section
              </button>
            </div>
          </div>
        </section>

        {/* 2) What's the Plan? */}
        <section id="plan-section">
          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <i className="fa-solid fa-list-check text-primary-500 mr-3" />
              What You’ll Do Today
            </h2>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-gray-700 mb-6">
              <div className="font-semibold text-primary-800 mb-1">Slideshow Template (optional, recommended)</div>
              <div>
                Use this as inspiration for your design:
                <a
                  href="https://docs.google.com/presentation/d/1v-u2kytUM2MXvtG2qnFLdON0U4pX2Ey0y1cVEgj6zFY/edit?usp=sharing"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary-700 underline ml-1"
                >
                  Google Slides Template Link
                </a>
              </div>
            </div>

            <ul className="space-y-4">
              {[
                'Step 1: Create a clear, descriptive title for your project',
                'Step 2: Write a one-sentence research explanation (your main conclusion)',
                'Step 3: Describe your procedure and list your top 3–5 sources',
                'Step 4: Add a visual (bar graph/heat map/etc.) comparing healthy vs cancer expression + caption',
                'Step 5: Summarize your results (normal function, what changes in cancer, why it matters)',
                'Step 6: Write your conclusion and reflect on challenges and improvements',
                'Step 7: Assemble and design your slideshow (creative but readable and focused)',
                'Step 8: Present your slideshow and collect peer feedback',
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

        {/* 3) Activities — one guided flow instead of eight stacked cards */}
        <section id="activities-section" className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Slideshow Creation (SciTrek-Led)</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto text-sm">
            Work through the eight steps in order. Your poster assembles beside you as you go, and everything is saved
            automatically — you can jump back to any step at any time.
          </p>

          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
            <StageDesk
              media={posterPreview}
              mediaTitle="Your poster, assembling as you write"
            >
              <StepFlow steps={posterSteps} />

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
                >
                  Save
                </button>
              </div>
            </StageDesk>
          </div>
        </section>

        {/* 4) Inquiry & Discussion */}
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
                Answer from your own poster first, then compare. Your answers here are saved with the rest of your work.
              </p>
              {DAY5_INQUIRY.map((item, idx) => (
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
                Imagine a classmate challenges your claim: “Your gene isn’t actually over-expressed; it’s just sample bias.”
              </p>
              <label className="block text-sm font-medium mb-1">What extra evidence or analysis would you add to strengthen your conclusion?</label>
              <textarea
                value={answersData.inquiry.think}
                onChange={(e) => setField('inquiry.think', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Type your response here…"
              />
              <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
                  Submit Response
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5) Wrap-Up & Reflection */}
        <section id="wrap-up-section" className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <i className="fa-solid fa-flag-checkered text-primary-500 mr-3" />
            Conclusion & Reflection
          </h3>

          <p className="text-gray-700 mb-4">
            Reflect on the process of creating your slideshow and why communicating scientific findings effectively matters.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Why is communicating scientific findings effectively important?</label>
              <textarea
                value={answersData.wrap.whyCommMatters}
                onChange={(e) => setField('wrap.whyCommMatters', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="Why do clear visuals + clear writing matter in science?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">How can you use these skills in future projects (or everyday life)?</label>
              <textarea
                value={answersData.wrap.lookingAhead}
                onChange={(e) => setField('wrap.lookingAhead', e.target.value)}
                className="w-full border border-gray-300 rounded p-3"
                rows={3}
                placeholder="Future science projects, presentations, communicating evidence, etc."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Final Reflection: What did you learn from making your slideshow?</label>
            <textarea
              value={answersData.wrap.finalReflection}
              onChange={(e) => setField('wrap.finalReflection', e.target.value)}
              className="w-full border border-gray-300 rounded p-3"
              rows={4}
              placeholder="What went well? What would you do differently next time?"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg">
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

        {/* Page Nav */}
        <div className="flex justify-between">
          <Link
            to="/sections/day-4"
            className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            <i className="fa-solid fa-arrow-left mr-2" />
            Back to Day 4
          </Link>
          <button
            onClick={handleSave}
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium py-2 px-4 rounded-lg"
          >
            Save All
            <i className="fa-solid fa-floppy-disk ml-2" />
          </button>
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

export default Day5Page;

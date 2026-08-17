// src/components/interactions/StepFlow.js
import React, { useState } from 'react';

/**
 * StepFlow — progressive disclosure over a set of prompts that belong together.
 *
 * The pilot's K-coefficient was negative on every content category in the web
 * condition: students were scanning rather than processing. A wall of eight
 * textareas invites exactly that. Showing one prompt at a time keeps a single
 * cognitive task on screen, while the step rail keeps the whole shape of the
 * activity visible so nobody feels trapped in a wizard.
 *
 * Answers live in the parent's `answersData`, so moving between steps never
 * loses work and autosave is unaffected.
 */
function StepFlow({ steps, title, hint, allowJumpAll = true }) {
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];
  const doneCount = steps.filter((s) => s.isComplete).length;

  if (showAll) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            {title ? <h4 className="text-lg font-semibold">{title}</h4> : null}
            <p className="text-xs text-gray-600">Showing all {steps.length} prompts.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50"
          >
            One at a time
          </button>
        </div>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <div key={s.id ?? i}>
              <h5 className="font-medium mb-1">
                <span className="text-primary-700 mr-2">{i + 1}.</span>
                {s.title}
              </h5>
              {s.hint ? <p className="text-xs text-gray-600 mb-2">{s.hint}</p> : null}
              {s.render()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title || hint ? (
        <div className="mb-2">
          {title ? <h4 className="text-lg font-semibold">{title}</h4> : null}
          {hint ? <p className="text-xs text-gray-600">{hint}</p> : null}
        </div>
      ) : null}

      {/* Step rail and the escape hatch share one row, so "Show all" never sits
          on an orphan line of its own above the numbers. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        <ol className="flex flex-wrap gap-1.5 flex-1 min-w-0" aria-label="Steps">
          {steps.map((s, i) => {
            const current = i === safeIndex;
            return (
              <li key={s.id ?? i}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={current ? 'step' : undefined}
                  className={[
                    'min-w-[1.85rem] px-2 py-1 rounded-full text-xs border-2 transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    current
                      ? 'border-primary-500 bg-primary-500 text-stone-900 font-semibold'
                      : s.isComplete
                        ? 'border-primary-300 bg-primary-50 text-primary-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
                  ].join(' ')}
                >
                  {i + 1}
                  {s.isComplete && !current ? (
                    <i className="fa-solid fa-check ml-1" aria-hidden="true" />
                  ) : null}
                  <span className="sr-only">
                    {`. ${s.title}${s.isComplete ? ' (answered)' : ' (not answered yet)'}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {allowJumpAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="shrink-0 px-2.5 py-1 text-xs rounded-md border bg-white text-gray-700 hover:bg-gray-50"
          >
            Show all {steps.length}
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        Step {safeIndex + 1} of {steps.length}. {doneCount} answered.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h5 className="font-medium mb-1">{step.title}</h5>
        {step.hint ? <p className="text-xs text-gray-600 mb-3">{step.hint}</p> : null}
        {step.render()}
      </div>

      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={safeIndex === 0}
          className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40"
        >
          <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />
          Back
        </button>

        <span className="text-xs text-gray-600">
          {safeIndex + 1} of {steps.length}
        </span>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={safeIndex === steps.length - 1}
          className="px-4 py-2 text-sm rounded-lg bg-primary-500 hover:bg-primary-600 text-stone-900 font-medium disabled:opacity-40"
        >
          Next
          <i className="fa-solid fa-arrow-right ml-2" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default StepFlow;

// src/components/interactions/ScaleResponse.js
import React, { useId } from 'react';

/**
 * ScaleResponse — a segmented scale for questions whose answer is a *position*
 * (how loud, how aggressive, how confident) rather than a sentence.
 *
 * Data contract: stores the chosen step's label (a string), so the saved value
 * is human-readable in the teacher dashboard.
 */
function ScaleResponse({ legend, hint, steps, value, onChange, lowLabel, highLabel }) {
  const autoId = useId();
  const activeIndex = steps.findIndex((s) => (typeof s === 'string' ? s : s.label) === value);

  return (
    <fieldset className="border-0 p-0 m-0">
      {legend ? <legend className="text-sm font-medium text-gray-800 mb-1">{legend}</legend> : null}
      {hint ? <p className="text-xs text-gray-600 mb-2">{hint}</p> : null}

      <div
        className="flex flex-col sm:flex-row gap-2"
        role="radiogroup"
        aria-label={legend || 'Scale'}
        aria-describedby={hint ? `${autoId}-hint` : undefined}
      >
        {steps.map((step, idx) => {
          const label = typeof step === 'string' ? step : step.label;
          const description = typeof step === 'string' ? null : step.description;
          const on = idx === activeIndex;

          return (
            <button
              type="button"
              key={label}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? '' : label)}
              className={[
                'flex-1 rounded-lg border-2 px-3 py-2 text-sm text-left transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                on
                  ? 'border-primary-500 bg-primary-50 font-semibold text-primary-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={on ? 'text-primary-700' : 'text-transparent'}>
                  <i className="fa-solid fa-circle-check" />
                </span>
                <span>
                  <span className="block">{label}</span>
                  {description ? (
                    <span className="block text-xs font-normal text-gray-600 mt-0.5">{description}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {(lowLabel || highLabel) ? (
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      ) : null}
    </fieldset>
  );
}

export default ScaleResponse;

// src/components/interactions/ClozeChoice.js
import React from 'react';

/**
 * ClozeChoice — an inline fill-in-the-blank that shows its options.
 *
 * Replaces the `<select>` dropdowns used in the Day 1 narrative. A dropdown
 * hides the alternatives until it is opened and costs two interactions per
 * blank; with two-option contrasts like `transcription` / `translation` the
 * contrast *is* the question, so the options belong on the page.
 *
 * Data contract: stores the chosen option string, exactly as the select did.
 */
function ClozeChoice({ value, onChange, options, label, blankNumber }) {
  const accessibleLabel = label || (blankNumber ? `Blank ${blankNumber}` : 'Choose the correct word');

  return (
    <span
      className="inline-flex flex-wrap items-center gap-1 align-baseline mx-1 my-0.5"
      role="radiogroup"
      aria-label={accessibleLabel}
    >
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            type="button"
            key={opt}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? '' : opt)}
            className={[
              'px-2.5 py-0.5 rounded-full border-2 text-sm transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              on
                ? 'border-primary-500 bg-primary-500 text-stone-900 font-semibold'
                : 'border-dashed border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100',
            ].join(' ')}
          >
            {on ? (
              <i className="fa-solid fa-check mr-1 text-[10px]" aria-hidden="true" />
            ) : null}
            {opt}
          </button>
        );
      })}
    </span>
  );
}

export default ClozeChoice;

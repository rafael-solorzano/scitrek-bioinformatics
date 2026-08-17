// src/components/interactions/MatchPairs.js
import React from 'react';

/**
 * MatchPairs — assign each term the definition that belongs to it.
 *
 * For questions like "what are oncogenes / tumour suppressors / DNA repair
 * genes?", which were three consecutive text inputs. The real task is telling
 * three related categories apart, and that only happens when they are on screen
 * together.
 *
 * Each definition is written out ONCE in a lettered key, and the terms below
 * reference it by letter and short name. Repeating the full wording under every
 * term made the block several screens tall and buried the actual choice.
 *
 * Data contract: the caller maps the assignment back to whatever keys it
 * already persists — this component stays value-shape agnostic and reports
 * `{ termId, definitionId }`.
 */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function MatchPairs({ terms, definitions, values, onChange, legend, hint }) {
  const usedBy = (defId) => terms.find((t) => values?.[t.id] === defId);
  const shortOf = (def) => def.short || def.text;
  const letterOf = (defId) => LETTERS[definitions.findIndex((d) => d.id === defId)];

  return (
    <fieldset className="border-0 p-0 m-0">
      {legend ? <legend className="text-sm font-medium text-gray-800 mb-1">{legend}</legend> : null}
      {hint ? <p className="text-xs text-gray-600 mb-3">{hint}</p> : null}

      {/* The key — every definition, written once. */}
      <dl className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-3 space-y-1.5">
        {definitions.map((def, i) => (
          <div key={def.id} className="flex gap-2 text-sm">
            <dt className="shrink-0 font-bold text-gray-700 w-5">{LETTERS[i]}.</dt>
            <dd className="text-gray-700">
              {def.short ? <span className="font-semibold text-gray-900">{def.short} — </span> : null}
              {def.text}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-2">
        {terms.map((term) => {
          const chosen = values?.[term.id];
          return (
            <li
              key={term.id}
              className="rounded-xl border border-gray-200 bg-white p-3 sm:flex sm:items-center sm:gap-3"
            >
              <p className="font-semibold text-gray-900 text-sm mb-2 sm:mb-0 sm:w-48 sm:shrink-0">
                {term.label}
              </p>

              <div
                role="radiogroup"
                aria-label={`Definition for ${term.label}`}
                className="flex flex-wrap gap-2"
              >
                {definitions.map((def, i) => {
                  const on = chosen === def.id;
                  const takenBy = usedBy(def.id);
                  const takenElsewhere = takenBy && takenBy.id !== term.id;

                  return (
                    <button
                      type="button"
                      key={def.id}
                      role="radio"
                      aria-checked={on}
                      aria-label={`${term.label}: ${LETTERS[i]}, ${shortOf(def)}${
                        takenElsewhere ? `. Currently matched to ${takenBy.label}` : ''
                      }`}
                      onClick={() => onChange(term.id, on ? '' : def.id)}
                      className={[
                        'rounded-full border-2 pl-2 pr-3 py-1 text-sm transition inline-flex items-center gap-1.5',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                        on
                          ? 'border-primary-500 bg-primary-50 text-primary-900 font-semibold'
                          : takenElsewhere
                            ? 'border-gray-200 bg-gray-50 text-gray-500'
                            : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'w-5 h-5 shrink-0 rounded-full grid place-items-center text-xs font-bold',
                          on ? 'bg-primary-500 text-stone-900' : 'bg-gray-100 text-gray-600',
                        ].join(' ')}
                      >
                        {LETTERS[i]}
                      </span>
                      <span aria-hidden="true">{shortOf(def)}</span>
                      {on ? <i aria-hidden="true" className="fa-solid fa-check text-primary-700 ml-0.5" /> : null}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite">
        {terms.filter((t) => values?.[t.id]).length} of {terms.length} matched.
      </p>
      {terms.some((t) => values?.[t.id]) ? (
        <p className="text-xs text-gray-600 mt-2">
          Matched so far:{' '}
          {terms
            .filter((t) => values?.[t.id])
            .map((t) => `${t.label} → ${letterOf(values[t.id])}`)
            .join(' · ')}
        </p>
      ) : null}
    </fieldset>
  );
}

export default MatchPairs;

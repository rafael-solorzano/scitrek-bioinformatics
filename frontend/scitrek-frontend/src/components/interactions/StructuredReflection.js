// src/components/interactions/StructuredReflection.js
import React from 'react';
import SentenceStarters from './SentenceStarters';

/**
 * StructuredReflection — a response builder for prompts that already name the
 * parts of a good answer (a hypothesis needs groups + a measurement; an
 * experiment needs samples, method, control and a decision rule).
 *
 * These questions stay open-ended; only the frame is supplied. Students who
 * previously dropped two of four required elements now see all four.
 *
 * DATA COMPATIBILITY
 * ------------------
 * The composed prose is written back to the *existing* answer key, so the
 * teacher dashboard and any saved work keep the shape they already have. The
 * per-part values are stored under an additive sibling key so the builder can
 * restore exactly without re-parsing prose.
 */

export const composeParts = (parts, values) =>
  parts
    .map(({ key, label }) => {
      const v = (values?.[key] || '').trim();
      return v ? `${label}: ${v}` : '';
    })
    .filter(Boolean)
    .join('\n');

/**
 * Best-effort recovery of part values from a legacy free-text answer that was
 * saved before this builder existed. Anything we cannot attribute to a labelled
 * part is handed back under `carryOver` so the student never loses their words.
 */
export const decomposeText = (parts, text) => {
  if (!text) return { values: {}, carryOver: '' };
  const lines = String(text).split('\n');
  const values = {};
  const unmatched = [];
  let currentKey = null;

  lines.forEach((line) => {
    const hit = parts.find(({ label }) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    if (hit) {
      currentKey = hit.key;
      values[hit.key] = line.slice(hit.label.length + 1).trim();
    } else if (currentKey) {
      values[currentKey] = `${values[currentKey]}\n${line}`.trim();
    } else if (line.trim()) {
      unmatched.push(line);
    }
  });

  return { values, carryOver: unmatched.join('\n') };
};

function StructuredReflection({
  parts,
  values,
  onChange,
  legend,
  hint,
  carryOver,
  showPreview = true,
}) {
  const setPart = (key, next) => onChange({ ...(values || {}), [key]: next });
  const composed = composeParts(parts, values);
  const completed = parts.filter(({ key }) => (values?.[key] || '').trim()).length;

  return (
    <div>
      {legend ? <h5 className="text-sm font-medium text-gray-800 mb-1">{legend}</h5> : null}
      {hint ? <p className="text-xs text-gray-600 mb-2">{hint}</p> : null}

      <p className="text-xs text-gray-600 mb-3" aria-live="polite">
        <i className="fa-solid fa-list-check mr-1.5 text-primary-500" aria-hidden="true" />
        {completed} of {parts.length} parts written
      </p>

      {carryOver ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium mb-1">Your earlier answer</p>
          <p className="whitespace-pre-wrap">{carryOver}</p>
          <p className="text-xs mt-1">Keep it, or rewrite it into the parts below.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {parts.map(({ key, label, placeholder, hint: partHint, rows = 2, starters, options }) => {
          const fieldId = `sr-${key}`;

          // Parts whose answer is a choice rather than a sentence are tapped,
          // not typed. The stored value is still the option's text, so the
          // composed prose and the teacher dashboard are unchanged.
          if (options?.length) {
            const chosen = values?.[key] || '';
            return (
              <div key={key}>
                <p className="block text-sm font-medium text-gray-800 mb-1">{label}</p>
                {partHint ? <p className="text-xs text-gray-600 mb-1">{partHint}</p> : null}
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
                  {options.map((opt) => {
                    const on = chosen === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPart(key, on ? '' : opt)}
                        className={[
                          'px-3 py-2 rounded-lg border-2 text-sm text-left transition',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                          on
                            ? 'border-primary-500 bg-primary-50 font-semibold text-primary-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                        ].join(' ')}
                      >
                        <i
                          className={`fa-solid ${on ? 'fa-circle-check' : 'fa-circle'} mr-1.5 ${on ? '' : 'text-gray-300'}`}
                          aria-hidden="true"
                        />
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={key}>
              <label htmlFor={fieldId} className="block text-sm font-medium text-gray-800 mb-1">
                {label}
              </label>
              {partHint ? <p className="text-xs text-gray-600 mb-1">{partHint}</p> : null}
              <textarea
                id={fieldId}
                value={values?.[key] || ''}
                onChange={(e) => setPart(key, e.target.value)}
                rows={rows}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                placeholder={placeholder}
              />
              {starters?.length ? (
                <SentenceStarters
                  starters={starters}
                  onInsert={(text) =>
                    setPart(key, values?.[key] ? `${values[key]} ${text}` : text)
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {showPreview && composed ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Your full answer
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{composed}</p>
        </div>
      ) : null}
    </div>
  );
}

export default StructuredReflection;

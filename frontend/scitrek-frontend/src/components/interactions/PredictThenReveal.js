// src/components/interactions/PredictThenReveal.js
import React, { useState } from 'react';

/**
 * PredictThenReveal — commit an answer before seeing the expert one.
 *
 * The Inquiry & Discussion blocks on every day were `<details>` elements: the
 * question and its answer, one click apart. That is reading, not thinking, and
 * it is precisely the kind of surface the pilot's negative K-coefficient
 * describes. Requiring a prediction first turns the same content into retrieval
 * practice, then hands over the expert answer for comparison.
 *
 * The expert answer is never withheld permanently — students can always skip
 * ahead. The friction is a nudge, not a gate.
 */
function PredictThenReveal({ question, expertAnswer, value, onChange, placeholder }) {
  const [revealed, setRevealed] = useState(false);
  const hasPrediction = Boolean((value || '').trim());

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium mb-2">{question}</h4>

      <label className="block text-xs text-gray-600 mb-1">
        Your prediction first — one or two sentences is plenty.
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
        placeholder={placeholder || 'What do you think happens, and why?'}
      />

      {!revealed ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className={[
              'px-4 py-2 text-sm rounded-lg font-medium',
              hasPrediction
                ? 'bg-primary-500 hover:bg-primary-600 text-stone-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ].join(' ')}
          >
            <i className="fa-solid fa-eye mr-2" aria-hidden="true" />
            Compare with the expert answer
          </button>
          {!hasPrediction ? (
            <span className="text-xs text-gray-500">
              Write a prediction first — you will remember it better.
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1">
            <i className="fa-solid fa-lightbulb mr-1.5" aria-hidden="true" />
            Expert answer
          </p>
          <p className="text-sm text-gray-800">{expertAnswer}</p>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="mt-2 text-xs text-primary-700 underline underline-offset-2"
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}

export default PredictThenReveal;

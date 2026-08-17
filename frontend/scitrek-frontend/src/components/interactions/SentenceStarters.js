// src/components/interactions/SentenceStarters.js
import React from 'react';

/**
 * SentenceStarters — tappable openers for prompts that stay open-ended but where
 * a blank box is the thing that stops students writing at all.
 *
 * Appends to the existing answer rather than replacing it, so a starter can be
 * used mid-paragraph without destroying work.
 */
function SentenceStarters({ starters, onInsert, label = 'Need a way in? Tap a starter:' }) {
  if (!starters?.length) return null;

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-600 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {starters.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => onInsert(s)}
            className="px-3 py-1 rounded-full border border-primary-200 bg-primary-50 text-primary-800 text-xs hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <i className="fa-solid fa-plus mr-1.5 text-[10px]" aria-hidden="true" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SentenceStarters;

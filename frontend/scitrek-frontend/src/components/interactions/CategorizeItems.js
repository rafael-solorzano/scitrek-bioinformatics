// src/components/interactions/CategorizeItems.js
import React from 'react';

/**
 * CategorizeItems — sort items into named buckets.
 *
 * Rendered as one row per item with a segmented set of category buttons rather
 * than as drag-and-drop: the decision is "which bucket", and tapping is both
 * faster and keyboard-native. Supporting evidence (a gene card image, a hint)
 * sits on the row so the student never has to scroll away to decide.
 *
 * Data contract: the caller owns the value shape. Day 3 passes its existing
 * `compare.table` array of `{gene, category, notes}` straight through.
 */
function CategorizeItems({ items, categories, values, onChange, legend, hint, notesPlaceholder, onImageClick }) {
  return (
    <fieldset className="border-0 p-0 m-0">
      {legend ? <legend className="text-sm font-medium text-gray-800 mb-1">{legend}</legend> : null}
      {hint ? <p className="text-xs text-gray-600 mb-3">{hint}</p> : null}

      <ul className="space-y-3">
        {items.map((item, idx) => {
          const current = values[idx] || {};
          return (
            <li
              key={item.id ?? idx}
              className="rounded-xl border border-gray-200 bg-white p-3 md:p-4"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-3">
                {/* The evidence is a portrait card with readable text on it. A
                    112x96 thumbnail rendered it as an unreadable smudge, so it
                    keeps the card's 2:3 shape and opens full size on tap. */}
                {item.image ? (
                  <button
                    type="button"
                    onClick={onImageClick ? () => onImageClick(item) : undefined}
                    disabled={!onImageClick}
                    aria-label={onImageClick ? `Open larger view of ${item.imageAlt || item.label}` : undefined}
                    className="group relative w-32 md:w-40 shrink-0 self-start rounded-lg overflow-hidden bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-default"
                  >
                    <img
                      src={item.image}
                      alt={item.imageAlt || ''}
                      className="w-full aspect-[2/3] object-contain"
                      loading="lazy"
                    />
                    {onImageClick ? (
                      <span className="absolute bottom-1 right-1 rounded bg-gray-900/70 text-white text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <i className="fa-solid fa-magnifying-glass-plus mr-1" aria-hidden="true" />
                        Zoom
                      </span>
                    ) : null}
                  </button>
                ) : null}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  {item.hint ? <p className="text-xs text-gray-600 mt-0.5">{item.hint}</p> : null}
                </div>

                <div
                  className="flex gap-2 shrink-0"
                  role="radiogroup"
                  aria-label={`Category for ${item.label}`}
                >
                  {categories.map((cat) => {
                    const on = current.category === cat.value;
                    return (
                      <button
                        type="button"
                        key={cat.value}
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(idx, { ...current, category: on ? '' : cat.value })}
                        className={[
                          'px-3 py-2 rounded-lg border-2 text-sm transition',
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
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {current.category ? (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Why is {item.label} {categories.find((c) => c.value === current.category)?.label.toLowerCase()}?
                  </label>
                  <input
                    value={current.notes || ''}
                    onChange={(e) => onChange(idx, { ...current, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder={notesPlaceholder || 'One sentence of evidence…'}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export default CategorizeItems;

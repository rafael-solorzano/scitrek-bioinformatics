// src/components/interactions/CardSelect.js
import React, { useId } from 'react';

/**
 * CardSelect — tap-to-select cards for questions where the student is choosing
 * among concepts rather than composing prose.
 *
 * Data contract: stores option *labels* (strings), so a saved answer reads the
 * same way in the teacher dashboard as the old free-text answer did.
 *   - single select  -> value is a string
 *   - multi select   -> value is an array of strings
 *
 * Accessibility:
 *   - single select renders a real radiogroup, multi renders checkboxes
 *   - selection is signalled by a check icon + border weight + label text,
 *     never by colour alone
 */
function CardSelect({
  options,
  value,
  onChange,
  multi = false,
  max,
  legend,
  hint,
  columns = 2,
  name,
}) {
  const autoId = useId();
  const groupName = name || autoId;

  const selected = multi
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : (value ? [value] : []);

  const isSelected = (label) => selected.includes(label);
  const atLimit = multi && typeof max === 'number' && selected.length >= max;

  const toggle = (label) => {
    if (!multi) {
      onChange(isSelected(label) ? '' : label);
      return;
    }
    if (isSelected(label)) {
      onChange(selected.filter((v) => v !== label));
    } else {
      if (atLimit) return;
      onChange([...selected, label]);
    }
  };

  const gridCols =
    columns === 1 ? 'grid-cols-1'
      : columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';

  return (
    <fieldset className="border-0 p-0 m-0">
      {/* A <legend> does not lay out inside a flex row, so it stays on its own
          line and the hint and counter share the row beneath it. Two lines of
          meta text instead of four. */}
      {legend ? (
        <legend className="text-sm font-medium text-gray-800 mb-1">{legend}</legend>
      ) : null}

      {hint || (multi && typeof max === 'number') ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-2 text-xs text-gray-600">
          {hint ? <span className="min-w-0">{hint}</span> : <span />}
          {multi && typeof max === 'number' ? (
            <span aria-live="polite" className="font-medium text-gray-700 tabular-nums shrink-0">
              Chosen {selected.length} of {max}
              {atLimit ? ' — unselect one to change your mind.' : ''}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={`grid ${gridCols} gap-2.5`} role={multi ? 'group' : 'radiogroup'} aria-label={legend}>
        {options.map((opt) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const description = typeof opt === 'string' ? null : opt.description;
          const icon = typeof opt === 'string' ? null : opt.icon;
          const image = typeof opt === 'string' ? null : opt.image;
          const on = isSelected(label);
          const disabled = !on && atLimit;

          return (
            <button
              type="button"
              key={label}
              name={groupName}
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              aria-disabled={disabled || undefined}
              onClick={() => toggle(label)}
              className={[
                'text-left rounded-xl p-3 border-2 transition focus:outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary-400',
                on
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                disabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <span className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={[
                    'mt-0.5 shrink-0 w-5 h-5 grid place-items-center border-2 text-[11px]',
                    multi ? 'rounded' : 'rounded-full',
                    on ? 'border-primary-600 bg-primary-600 text-stone-900' : 'border-gray-300 bg-white text-transparent',
                  ].join(' ')}
                >
                  <i className="fa-solid fa-check" />
                </span>

                <span className="min-w-0">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="w-full h-28 object-contain mb-2 rounded bg-white"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="block font-medium text-gray-900">
                    {icon ? <i className={`${icon} text-primary-500 mr-2`} aria-hidden="true" /> : null}
                    {label}
                  </span>
                  {description ? (
                    <span className="block text-sm text-gray-600 mt-1">{description}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default CardSelect;

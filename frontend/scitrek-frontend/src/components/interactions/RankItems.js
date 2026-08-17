// src/components/interactions/RankItems.js
import React from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

/**
 * RankItems — build an ordered sequence out of a pool of options.
 *
 * Used for genuinely sequential content (the steps of gene expression, the
 * phases of mitosis, the parts used to build a protein in the PhET sim).
 *
 * Data contract: `{ available: string[], ordered: string[], orderSize: number }`
 * — the exact shape Day 1 already persists, so saved work loads unchanged.
 * `ordered` is padded with '' to `orderSize`.
 *
 * Accessibility: drag-and-drop is an enhancement, not the only route. Every
 * item carries Add / Remove / Move-up / Move-down buttons so the whole
 * interaction is completable from the keyboard.
 */

export const emptyRank = (pool, size) => ({
  available: [...pool],
  ordered: Array(size ?? pool.length).fill(''),
  orderSize: size ?? pool.length,
});

/** Normalise any saved shape into a usable {available, ordered, orderSize}. */
export const normalizeRank = (saved, pool, size) => {
  const orderSize = size ?? saved?.orderSize ?? pool.length;
  const ordered = Array.isArray(saved?.ordered) ? saved.ordered.filter(Boolean) : [];
  const kept = ordered.filter((item) => pool.includes(item)).slice(0, orderSize);
  const available = pool.filter((item) => !kept.includes(item));
  return {
    available,
    ordered: [...kept, ...Array(Math.max(0, orderSize - kept.length)).fill('')],
    orderSize,
  };
};

function RankItems({ value, onChange, legend, hint, poolLabel = 'Available steps', orderLabel = 'Your order' }) {
  const orderSize = value.orderSize ?? value.ordered.length;
  const filled = value.ordered.filter(Boolean);
  const available = value.available || [];

  const commit = (nextAvailable, nextFilled) => {
    onChange({
      available: nextAvailable,
      ordered: [...nextFilled, ...Array(Math.max(0, orderSize - nextFilled.length)).fill('')],
      orderSize,
    });
  };

  const addToOrder = (item, atIndex = filled.length) => {
    if (filled.length >= orderSize) return;
    const nextFilled = [...filled];
    nextFilled.splice(atIndex, 0, item);
    commit(available.filter((a) => a !== item), nextFilled);
  };

  const removeFromOrder = (item) => {
    commit([...available, item], filled.filter((f) => f !== item));
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= filled.length) return;
    const nextFilled = [...filled];
    const [moved] = nextFilled.splice(index, 1);
    nextFilled.splice(target, 0, moved);
    commit(available, nextFilled);
  };

  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    const from = source.droppableId;
    const to = destination.droppableId;

    if (from === 'rank-pool' && to === 'rank-order') {
      addToOrder(draggableId, destination.index);
    } else if (from === 'rank-order' && to === 'rank-pool') {
      removeFromOrder(draggableId);
    } else if (from === 'rank-order' && to === 'rank-order') {
      move(source.index, destination.index - source.index);
    }
  };

  return (
    <div>
      {legend ? <h5 className="text-sm font-medium text-gray-800 mb-1">{legend}</h5> : null}
      {hint ? <p className="text-xs text-gray-600 mb-3">{hint}</p> : null}

      <p className="sr-only" aria-live="polite">
        {filled.length} of {orderSize} placed.
      </p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pool */}
          <Droppable droppableId="rank-pool" type="RANK">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-white border border-gray-200 rounded-lg p-3 min-h-[200px]"
              >
                <h6 className="font-semibold mb-2 text-sm text-gray-700">{poolLabel}</h6>

                {available.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">All placed.</p>
                ) : null}

                {available.map((item, idx) => (
                  <Draggable key={item} draggableId={item} index={idx}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2 flex items-center gap-2"
                      >
                        <span
                          {...drag.dragHandleProps}
                          aria-label={`Drag ${item}`}
                          className="shrink-0 px-1 text-gray-500 cursor-grab focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                        >
                          <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-sm">{item}</span>
                        <button
                          type="button"
                          onClick={() => addToOrder(item)}
                          disabled={filled.length >= orderSize}
                          className="shrink-0 px-2 py-1 text-xs rounded border bg-white hover:bg-primary-50 disabled:opacity-40"
                          aria-label={`Add ${item} to your order`}
                        >
                          Add <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Order */}
          <Droppable droppableId="rank-order" type="RANK">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-primary-50 border-2 border-dashed border-primary-300 rounded-lg p-3 min-h-[200px]"
              >
                <h6 className="font-semibold mb-2 text-sm text-gray-700">{orderLabel}</h6>

                {filled.map((item, idx) => (
                  <Draggable key={item} draggableId={item} index={idx}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className="bg-white border border-gray-200 rounded-lg p-2 mb-2 flex items-center gap-2"
                      >
                        <span
                          {...drag.dragHandleProps}
                          aria-label={`Drag ${item}`}
                          className="shrink-0 px-1 text-gray-500 cursor-grab focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                        >
                          <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                        </span>
                        <span className="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-primary-500 text-stone-900 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm">{item}</span>
                        <span className="shrink-0 flex gap-1">
                          <button
                            type="button"
                            onClick={() => move(idx, -1)}
                            disabled={idx === 0}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-30"
                            aria-label={`Move ${item} earlier`}
                          >
                            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(idx, 1)}
                            disabled={idx === filled.length - 1}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-30"
                            aria-label={`Move ${item} later`}
                          >
                            <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromOrder(item)}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                            aria-label={`Remove ${item} from your order`}
                          >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}

                {Array.from({ length: Math.max(0, orderSize - filled.length) }).map((_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="rounded-lg p-2 mb-2 min-h-[40px] flex items-center justify-center bg-primary-100/40 text-gray-600 text-xs"
                  >
                    Position {filled.length + i + 1}
                  </div>
                ))}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}

export default RankItems;

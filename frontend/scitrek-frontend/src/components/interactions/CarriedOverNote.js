// src/components/interactions/CarriedOverNote.js
import React from 'react';

/**
 * CarriedOverNote — shows work a student typed before a question moved from a
 * text box to a selection.
 *
 * Nothing is deleted when an interaction changes: the old string is still in
 * `answers`. This surfaces it so the student can see what they wrote and decide
 * for themselves whether the new choice replaces it.
 */
function CarriedOverNote({ text, label = 'Your earlier answer' }) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  return (
    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="font-semibold">{label}:</span> {trimmed}
    </p>
  );
}

export default CarriedOverNote;

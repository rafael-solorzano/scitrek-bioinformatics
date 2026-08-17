// src/components/interactions/WorkPane.js
import React, { useState } from 'react';

/**
 * WorkPane — keeps the source material and the response space adjacent.
 *
 * This is the structural fix behind the whole redesign. The pilot eye-tracking
 * data showed the immersive build losing attention on production tasks
 * (17.8% vs 28.5% for the document condition), because answering meant
 * scrolling away from the video / simulation / cards the question was about.
 * A document keeps prompt, evidence and answer space on one page; this puts
 * them back on one screen.
 *
 * Desktop: two columns, source sticky so it stays in view while the student
 *          works down the prompts.
 * Mobile:  source first, then prompts, with a "Back to the source" control that
 *          returns without losing scroll context.
 */
function WorkPane({ source, sourceTitle, sourceNote, children, sourceFirstOnMobile = true }) {
  const [collapsed, setCollapsed] = useState(false);
  const paneId = `workpane-source-${String(sourceTitle || 'source').replace(/\W+/g, '-').toLowerCase()}`;

  return (
    // 5/7 rather than 50/50: the source is usually a fixed-ratio embed, while the
    // prompts need the room. An even split left the answer column cramped.
    // Note: no `items-start`. The source column has to stretch to the full row
    // height, otherwise its sticky child has no room to travel and the source
    // scrolls away — leaving a tall empty column instead of following the work.
    <div className="lg:grid lg:grid-cols-12 lg:gap-6">
      <div className={`lg:col-span-5 ${sourceFirstOnMobile ? '' : 'order-2'}`}>
        <div className="lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2 mb-2">
            {sourceTitle ? (
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <i className="fa-solid fa-thumbtack text-primary-500" aria-hidden="true" />
                {sourceTitle}
              </h4>
            ) : <span />}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls={paneId}
              className="lg:hidden px-3 py-1 text-xs rounded-md border bg-white hover:bg-gray-50"
            >
              {collapsed ? 'Show' : 'Hide'}
            </button>
          </div>

          <div id={paneId} className={collapsed ? 'hidden lg:block' : ''}>
            {source}
            {sourceNote ? <p className="text-xs text-gray-600 mt-2">{sourceNote}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 lg:mt-0 lg:col-span-7 lg:border-l lg:border-gray-200 lg:pl-6 space-y-6">
        {children}
      </div>
    </div>
  );
}

export default WorkPane;

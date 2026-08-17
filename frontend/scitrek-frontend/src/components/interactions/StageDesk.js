// src/components/interactions/StageDesk.js
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * StageDesk — the hybrid the pilot data actually argues for.
 *
 * The two conditions won at different things, so this stops splitting the
 * difference and gives each phase the layout it won with:
 *
 *   Stage (receptive)  — the video or simulation runs FULL WIDTH and large.
 *     Web led on exactly this content: +9.0 share on simulations, +7.2 on
 *     video, and 100% reach on every category. Shrinking media into a side
 *     rail throws that away.
 *
 *   Desk (production)  — prompts and answer fields sit in ONE readable column,
 *     prompt directly above its own answer box, document-style. Doc led here:
 *     +10.7 share and +10.0 VAI on exercises, because a page keeps prompt,
 *     source and answer space spatially adjacent.
 *
 * Adjacency is preserved without shrinking the stage: once the student scrolls
 * down to work, the stage docks into a corner player they can scrub, expand or
 * dismiss. Crucially the media element is never unmounted or re-parented — the
 * same node is repositioned with CSS, so a PhET sim keeps its state and a video
 * keeps its playhead.
 */
function StageDesk({
  media,
  mediaTitle,
  mediaNote,
  children,
  dockable = true,
  // Some embeds (the PhET and HHMI wrappers) carry their own title bar with the
  // reload / open-in-new-tab controls. Repeating the title above them just
  // prints the same words twice; the dock still needs it as a label.
  showTitleOnStage = true,
  // The desk fills its card by default. Narrowing it into a centre column left
  // a dead half-page of whitespace beside every paragraph on a laptop screen.
  deskWidth = 'w-full',
}) {
  const stageRef = useRef(null);
  const sentinelRef = useRef(null);
  const deskRef = useRef(null);
  const deskEndRef = useRef(null);
  const [docked, setDocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stageHeight, setStageHeight] = useState(0);
  const dockId = useId();

  // Dock only while the stage is off screen AND there is still work below it.
  useEffect(() => {
    if (!dockable) return undefined;
    // Watch the placeholder, not the stage itself: docking makes the stage
    // `fixed` and therefore visible again, which would immediately undock it.
    // The placeholder holds the stage's slot in normal flow, so it is a stable
    // signal for "the student has scrolled past the media".
    const stage = sentinelRef.current;
    const desk = deskRef.current;
    const deskEnd = deskEndRef.current;
    if (!stage || !desk || !deskEnd || typeof IntersectionObserver === 'undefined') return undefined;

    let stageVisible = true;
    let deskVisible = false;
    // The end marker sits just below the last control. Once it is on screen the
    // student has reached the save row, so the player retires instead of
    // hovering over the buttons — which is what let us drop the tall block of
    // reserved scroll room that used to sit under every docked activity.
    let deskEndVisible = false;
    const sync = () => setDocked(!stageVisible && deskVisible && !deskEndVisible);

    const stageObserver = new IntersectionObserver(
      ([e]) => { stageVisible = e.isIntersecting; sync(); },
      { threshold: 0.15 },
    );
    const deskObserver = new IntersectionObserver(
      ([e]) => { deskVisible = e.isIntersecting; sync(); },
      { threshold: 0 },
    );
    const deskEndObserver = new IntersectionObserver(
      ([e]) => { deskEndVisible = e.isIntersecting; sync(); },
      // Only count the marker as reached once it enters the bottom third of the
      // screen. Watching the whole viewport retired the player a full screen
      // early, which is most of the work on a long activity.
      { threshold: 0, rootMargin: '-67% 0px 0px 0px' },
    );
    stageObserver.observe(stage);
    deskObserver.observe(desk);
    deskEndObserver.observe(deskEnd);
    return () => {
      stageObserver.disconnect();
      deskObserver.disconnect();
      deskEndObserver.disconnect();
    };
  }, [dockable]);

  // Reserve the stage's height so docking never shifts the page under the reader.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      if (!docked) setStageHeight(stage.offsetHeight);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [docked]);

  const backToStage = useCallback(() => {
    setDismissed(false);
    // Scroll the slot, not the stage — while docked the stage is `fixed` and
    // scrollIntoView on it would do nothing.
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const isDocked = dockable && docked && !dismissed;

  return (
    <div>
      {/* Placeholder keeps the layout still while the stage is floating. */}
      <div ref={sentinelRef} style={isDocked && stageHeight ? { height: stageHeight } : undefined}>
        <div
          ref={stageRef}
          className={
            isDocked
              ? 'hidden lg:block fixed z-40 bottom-16 right-4 w-80 xl:w-[22rem] rounded-xl shadow-2xl ring-1 ring-gray-300 bg-white overflow-hidden'
              : ''
          }
        >
          {isDocked ? (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs">
              <span className="truncate font-medium">{mediaTitle || 'Still playing'}</span>
              <span className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={backToStage}
                  className="px-2 py-1 rounded hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <i className="fa-solid fa-up-right-and-down-left-from-center mr-1" aria-hidden="true" />
                  Expand
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  aria-label="Hide the floating player"
                  className="px-2 py-1 rounded hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </span>
            </div>
          ) : (
            <div className={showTitleOnStage || mediaNote ? 'mb-2' : ''}>
              {mediaTitle && showTitleOnStage ? (
                <h4 className="text-sm font-semibold text-gray-700">{mediaTitle}</h4>
              ) : null}
              {mediaNote ? <p className="text-xs text-gray-600">{mediaNote}</p> : null}
            </div>
          )}

          {/* The one and only mount of the media. Never re-parented — the wrapper
              only caps how tall the corner player may grow, because a stage sized
              in viewport heights (the Atlas, the HHMI sims) would otherwise dock
              as a full-height column down the side of the screen. */}
          <div className={isDocked ? 'max-h-[55vh] overflow-auto' : ''}>{media}</div>
        </div>
      </div>

      {/* Desk — one readable column, prompt directly above its answer. */}
      <div
        ref={deskRef}
        id={dockId}
        className={`${deskWidth} mx-auto mt-6 space-y-6`}
      >
        {children}
      </div>

      {/* Zero-height marker just past the last control: reaching it retires the
          floating player, so it never covers the save row. */}
      <div ref={deskEndRef} aria-hidden="true" className="h-px" />

      {/* Once dismissed, the student still needs a way back to the media. */}
      {dockable && docked && dismissed ? (
        <button
          type="button"
          onClick={backToStage}
          className="hidden lg:flex fixed z-40 bottom-16 right-4 items-center gap-2 px-3 py-2 rounded-full bg-gray-900 text-white text-xs shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <i className="fa-solid fa-arrow-up" aria-hidden="true" />
          Back to {mediaTitle || 'the media'}
        </button>
      ) : null}
    </div>
  );
}

export default StageDesk;

// src/components/interactions/index.js
//
// Shared question-delivery primitives for the Day 1–5 student experience.
//
// Each primitive writes back to the answer key the page already persisted, in
// the type it already used, so existing student work and the teacher dashboard
// are unaffected. See StructuredReflection for the one case that needs an
// additive sibling key.

export { default as CardSelect } from './CardSelect';
export { default as CarriedOverNote } from './CarriedOverNote';
export { default as CategorizeItems } from './CategorizeItems';
export { default as ClozeChoice } from './ClozeChoice';
export { default as MatchPairs } from './MatchPairs';
export { default as PredictThenReveal } from './PredictThenReveal';
export { default as RankItems, emptyRank, normalizeRank } from './RankItems';
export { default as ScaleResponse } from './ScaleResponse';
export { default as SentenceStarters } from './SentenceStarters';
export { default as StageDesk } from './StageDesk';
export { default as StepFlow } from './StepFlow';
export { default as StructuredReflection, composeParts, decomposeText } from './StructuredReflection';
export { default as WorkPane } from './WorkPane';

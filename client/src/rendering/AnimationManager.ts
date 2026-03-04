/**
 * @deprecated Use AnimationController instead — it is a drop-in superset.
 * This file is kept for backward compatibility and re-exports AnimationController
 * under the AnimationManager name so existing imports continue to work unchanged.
 */
export { AnimationController as AnimationManager } from './AnimationController.js';
export type { AnimationDef } from './AnimationController.js';

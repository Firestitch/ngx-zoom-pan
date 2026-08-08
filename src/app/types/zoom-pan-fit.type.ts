/**
 * Which axes a fit has to satisfy.
 *
 * `both` is the one that guarantees nothing is cut off: it takes whichever axis runs out of room
 * first, so the content ends up entirely inside the view. `width` and `height` each satisfy one
 * axis and let the other overflow.
 */
export type FsZoomPanFit = 'both' | 'width' | 'height';

/**
 * Where fitted content sits in the view.
 *
 * A named edge pins that edge and centres the other axis, so `top` is "pinned to the top, centred
 * across"; the corners pin both. On an axis the fit satisfied exactly, every value lands in the
 * same place — position only has something to say about an axis that is allowed to overflow, or
 * one with room to spare.
 */
export type FsZoomPanPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

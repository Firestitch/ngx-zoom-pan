/**
 * When the mouse wheel zooms the content.
 *
 * `always` is the historical behaviour: every wheel event is consumed, so a zoom-pan
 * placed inside a scrolling page becomes a scroll trap. `modifier` only zooms while
 * Ctrl/⌘ is held and leaves every other wheel event to the page — which also covers
 * trackpad pinch, since the browser reports that as a wheel event with `ctrlKey` set.
 */
export type FsZoomPanWheel = 'always' | 'modifier' | 'never';

import { FsZoomPanFit, FsZoomPanPosition } from '../types/zoom-pan-fit.type';


export interface IFsZoomPanFitOptions {
  /** Which axes must be satisfied. Defaults to the component's `fitMode`, itself `both`. */
  mode?: FsZoomPanFit;
  /** Where the fitted content sits. Defaults to the natural position for `mode` — see fit(). */
  position?: FsZoomPanPosition;
  /** Gap in pixels left between the content and the edges it is fitted against. */
  padding?: number;
  /**
   * Ceiling on the resulting scale. Content smaller than the view is otherwise magnified to fill
   * it, which is rarely wanted for a document figure — pass 1 to shrink oversized content and
   * leave everything else at its natural size.
   */
  maxScale?: number;
  /** Animate the move into place rather than jumping to it. */
  slide?: boolean;
}

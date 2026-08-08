import { FsZoomPanFit, FsZoomPanPosition } from '../types/zoom-pan-fit.type';
import { FsZoomPanWheel } from '../types/zoom-pan-wheel.type';


export interface IFsZoomPanConfig {
  zoomMin?: number;
  zoomMax?: number;
  zoomDefault?: number;
  zoomScale?: number;
  zoomFactor?: number;
  /** Hold the content fitted through every resize, until the user zooms or pans. */
  zoomFit?: boolean;
  /** Defaults for every fit — the held fit as well as a bare `fit()` call. */
  fitMode?: FsZoomPanFit;
  fitPosition?: FsZoomPanPosition;
  fitPadding?: number;
  fitMaxScale?: number;
  wheel?: FsZoomPanWheel;
}

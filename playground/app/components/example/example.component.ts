import { NgSwitch, NgSwitchCase } from '@angular/common';
import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, inject, ViewChild,
} from '@angular/core';

import { MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { FsZoomPanComponent } from '@firestitch/zoom-pan';

import { FsZoomPanComponent as FsZoomPanComponent_1 } from '../../../../src/app/components/zoom-pan/zoom-pan.component';
import { FsZoomPanFit, FsZoomPanPosition } from '../../../../src/app/types/zoom-pan-fit.type';
import { FsZoomPanWheel } from '../../../../src/app/types/zoom-pan-wheel.type';


/** 'default' stands in for "no fitPosition — let the mode pick", which is not a real position. */
type FitPositionChoice = FsZoomPanPosition | 'default';

@Component({
  selector: 'example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgSwitch,
    NgSwitchCase,
    MatIconButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIcon,
    MatTooltip,
    FsZoomPanComponent_1,
  ],
})
export class ExampleComponent {

  @ViewChild(FsZoomPanComponent)
  public zoomPan: FsZoomPanComponent;

  @ViewChild('zoomPanContaner', { static: true })
  public zoomPanContaner: ElementRef;

  public readonly contents = [
    { key: 'wide', label: 'wide', hint: 'Much wider than tall — width runs out of room first' },
    { key: 'tall', label: 'tall', hint: 'Much taller than wide — height runs out of room first' },
    { key: 'small', label: 'small', hint: 'Smaller than the canvas — the one maxScale is for' },
    { key: 'square', label: 'square', hint: 'Roughly square' },
  ];

  public readonly fitModes: FsZoomPanFit[] = ['both', 'width', 'height'];

  public readonly fitPositions: FitPositionChoice[] = [
    'default', 'center', 'top', 'bottom', 'left', 'right',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
  ];

  public readonly wheelModes: FsZoomPanWheel[] = ['always', 'modifier', 'never'];

  public content = 'wide';
  public fitMode: FsZoomPanFit = 'both';
  public fitPositionChoice: FitPositionChoice = 'default';
  public wheel: FsZoomPanWheel = 'always';
  public options: string[] = ['zoomFit'];
  public scaleLabel = '';
  public fitHeld = false;

  /**
   * Every fit input is read once when the ZoomPan is built, so a settings change has to rebuild the
   * element. Bumping this is what the template's @for tracks on.
   */
  public settingsKey = 0;

  private _cdRef = inject(ChangeDetectorRef);

  public get zoomFit(): boolean {
    return this.options.includes('zoomFit');
  }

  public get fitPadding(): number {
    return this.options.includes('padding') ? 20 : 0;
  }

  public get fitMaxScale(): number {
    return this.options.includes('maxScale') ? 1 : undefined;
  }

  public get fitPosition(): FsZoomPanPosition {
    return this.fitPositionChoice === 'default' ? undefined : this.fitPositionChoice;
  }

  /** Named separately so the template does not call a getter that narrows to undefined. */
  public get resolvedFitPosition(): FsZoomPanPosition {
    return this.fitPosition;
  }

  public setContent(content: string): void {
    this.content = content;
    this._rebuild();
  }

  public setFitMode(fitMode: FsZoomPanFit): void {
    this.fitMode = fitMode;
    this._rebuild();
  }

  public setFitPosition(fitPositionChoice: FitPositionChoice): void {
    this.fitPositionChoice = fitPositionChoice;
    this._rebuild();
  }

  public setOptions(options: string[]): void {
    this.options = options;
    this._rebuild();
  }

  public setWheel(wheel: FsZoomPanWheel): void {
    this.wheel = wheel;
    this._rebuild();
  }

  public zoomIn(): void {
    this.zoomPan.zoomIn();
    this._sync();
  }

  public zoomOut(): void {
    this.zoomPan.zoomOut();
    this._sync();
  }

  public fit(): void {
    this.zoomPan.fit();
    this._sync();
  }

  public reset(): void {
    this.zoomPan.reset();
    this._sync();
  }

  public moved(): void {
    this._sync();
  }

  public zoomed(scale: number): void {
    this.scaleLabel = `${Math.round(scale * 100)}%`;
    this._sync();
  }

  private _rebuild(): void {
    this.settingsKey++;
    this.scaleLabel = '';
    this._cdRef.markForCheck();
  }

  private _sync(): void {
    this.fitHeld = this.zoomPan?.fitHeld ?? false;

    if (this.zoomPan && !this.scaleLabel) {
      this.scaleLabel = `${Math.round(this.zoomPan.scale * 100)}%`;
    }

    this._cdRef.markForCheck();
  }
}

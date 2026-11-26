'use client';

import React, { useRef, useState } from 'react';
import { Eraser, PenTool, Undo2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

const VIEWBOX_WIDTH = 520;
const VIEWBOX_HEIGHT = 170;
const MIN_DISTANCE_SQ = 4; // 2px in viewBox coordinates

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function strokeToPathD(points: Point[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (points.length === 1) {
    const x = round1(first.x);
    const y = round1(first.y);
    return `M${x} ${y}L${round1(x + 0.5)} ${y}`;
  }
  const parts: string[] = [`M${round1(first.x)} ${round1(first.y)}`];
  for (let i = 1; i < points.length; i += 1) {
    parts.push(`L${round1(points[i].x)} ${round1(points[i].y)}`);
  }
  return parts.join('');
}

function buildCanonicalSignatureSvg(strokes: string[]): string | null {
  if (strokes.length === 0) return null;
  const paths = strokes
    .map(
      (d) =>
        `<path d="${d}" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" fill="none">${paths}</svg>`;
}

export function toSignatureDataUri(svg: string | null | undefined): string {
  if (!svg) return '';
  const trimmed = svg.trim();
  if (!trimmed.startsWith('<svg')) return '';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
}

export function SignaturePad({
  locale,
  onChange,
}: {
  locale: 'pt-BR' | 'en';
  onChange: (svg: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const activePointsRef = useRef<Point[]>([]);

  const [strokes, setStrokes] = useState<string[]>([]);
  const [activePath, setActivePath] = useState('');

  function getSvgPoint(e: React.PointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { x: 0, y: 0 };
    }
    const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;
    return {
      x: Math.max(0, Math.min(VIEWBOX_WIDTH, x)),
      y: Math.max(0, Math.min(VIEWBOX_HEIGHT, y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getSvgPoint(e);
    activePointsRef.current = [pt];
    setActivePath(strokeToPathD([pt]));
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pt = getSvgPoint(e);
    const pts = activePointsRef.current;
    const prev = pts[pts.length - 1];
    if (prev) {
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      if (dx * dx + dy * dy < MIN_DISTANCE_SQ) return;
    }
    pts.push(pt);
    setActivePath(strokeToPathD(pts));
  }

  function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = activePointsRef.current;
    activePointsRef.current = [];
    setActivePath('');
    if (pts.length === 0) return;
    const d = strokeToPathD(pts);
    if (!d) return;
    setStrokes((prev) => {
      const next = [...prev, d];
      onChange(buildCanonicalSignatureSvg(next));
      return next;
    });
  }

  function handleUndo() {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      onChange(buildCanonicalSignatureSvg(next));
      return next;
    });
  }

  function handleClear() {
    drawingRef.current = false;
    activePointsRef.current = [];
    setStrokes([]);
    setActivePath('');
    onChange(null);
  }

  const hasStrokes = strokes.length > 0 || activePath.length > 0;

  return (
    <div className="space-y-2">
      <div
        className={`relative h-36 w-full overflow-hidden rounded-xl border bg-white transition-colors ${
          hasStrokes
            ? 'border-blue-500 ring-2 ring-blue-500/10'
            : 'border-dashed border-slate-300'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-full w-full touch-none select-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        >
          {strokes.map((d, idx) => (
            <path
              key={`${idx}-${d.slice(0, 12)}`}
              d={d}
              stroke="#0F172A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {activePath && (
            <path
              d={activePath}
              stroke="#2563EB"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </svg>

        <div className="pointer-events-none absolute inset-x-5 bottom-6 border-b border-dashed border-slate-200" />

        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
            <PenTool className="h-4 w-4" />
            <span>
              {locale === 'en'
                ? 'Sign here (mouse, touch, or stylus)'
                : 'Assine aqui (mouse, toque ou caneta)'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {strokes.length > 0
            ? locale === 'en'
              ? 'Signature captured — included on receipt & A4 print'
              : 'Assinatura capturada — embutida no comprovante e PDF A4'
            : locale === 'en'
              ? 'Optional · embedded in the public receipt and A4 print'
              : 'Opcional · embutida no comprovante /receipt e impressão A4'}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <Undo2 className="h-3 w-3" />
            {locale === 'en' ? 'Undo' : 'Desfazer'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
          >
            <Eraser className="h-3 w-3" />
            {locale === 'en' ? 'Clear' : 'Limpar'}
          </button>
        </div>
      </div>
    </div>
  );
}

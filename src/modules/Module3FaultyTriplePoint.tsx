import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Crosshair, Gauge, Thermometer, Cpu } from 'lucide-react';
import { Lang, Translations } from '../i18n/translations';
import { ProgressiveSlider } from '../components/ProgressiveSlider';
import {
  faultyToTrueCelsius,
  getFaultyCoincidence,
  tempToColor,
  drawRoundedRect,
  drawCrispLabelBadge,
} from '../utils/thermalColor';

interface Module3Props {
  lang: Lang;
  t: Translations;
  resetSignal: number;
}

interface GasMolecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function createGasMolecules(count: number): GasMolecule[] {
  const arr: GasMolecule[] = [];
  for (let i = 0; i < count; i++) {
    const ang = ((i * 137.5) % 360) * (Math.PI / 180);
    const rad = 0.15 + ((i * 19) % 62) / 100;
    arr.push({
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      vx: Math.cos(ang + 1.1),
      vy: Math.sin(ang + 1.1),
    });
  }
  return arr;
}

export const Module3FaultyTriplePoint: React.FC<Module3Props> = ({ lang, t, resetSignal }) => {
  // Faulty thermometer states
  const [faultyIce, setFaultyIce] = useState(5);
  const [faultySteam, setFaultySteam] = useState(95);
  const [faultyReading, setFaultyReading] = useState(35);

  // Triple point single fixed-point states
  const [sensorMode, setSensorMode] = useState<'gas' | 'platinum'>('gas');
  const [pTr, setPTr] = useState(100); // kPa (reference pressure at triple point)
  const [pMeas, setPMeas] = useState(136.6); // kPa
  const [rTr, setRTr] = useState(100); // Ohms at triple point
  const [rMeas, setRMeas] = useState(136.6); // Ohms

  const [draggingLeft, setDraggingLeft] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef({
    faultyIce: 5,
    faultySteam: 95,
    faultyReading: 35,
    sensorMode: 'gas' as 'gas' | 'platinum',
    pTr: 100,
    pMeas: 136.6,
    rTr: 100,
    rMeas: 136.6,
    molecules: createGasMolecules(24),
    thermHitBox: { x: 0, y: 0, w: 0, h: 0, topY: 0, bottomY: 0 },
  });

  useEffect(() => {
    const s = simRef.current;
    s.faultyIce = faultyIce;
    s.faultySteam = faultySteam;
    s.faultyReading = faultyReading;
    s.sensorMode = sensorMode;
    s.pTr = pTr;
    s.pMeas = pMeas;
    s.rTr = rTr;
    s.rMeas = rMeas;
  }, [faultyIce, faultySteam, faultyReading, sensorMode, pTr, pMeas, rTr, rMeas]);

  const handleReset = useCallback(() => {
    setFaultyIce(5);
    setFaultySteam(95);
    setFaultyReading(35);
    setSensorMode('gas');
    setPTr(100);
    setPMeas(136.6);
    setRTr(100);
    setRMeas(136.6);
  }, []);

  useEffect(() => {
    if (resetSignal > 0) handleReset();
  }, [resetSignal, handleReset]);

  const trueC = faultyToTrueCelsius(faultyReading, faultyIce, faultySteam);
  const readingError = faultyReading - trueC;
  const fundamentalInterval = faultySteam - faultyIce;
  const coincidence = getFaultyCoincidence(faultyIce, faultySteam);

  const ratioTriple = sensorMode === 'gas' ? pMeas / pTr : rMeas / rTr;
  const kelvinTriple = 273.16 * ratioTriple;
  const celsiusTriple = kelvinTriple - 273.15;

  const handleJumpToCoincidence = () => {
    if (coincidence.status === 'unique') {
      const clamped = Math.max(-20, Math.min(130, Number(coincidence.value.toFixed(1))));
      setFaultyReading(clamped);
    }
  };

  // Dragging directly on the left thermometer comparison pair
  const updateFromPointer = (clientX: number, clientY: number, checkBounds: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const box = simRef.current.thermHitBox;
    if (
      checkBounds &&
      (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h)
    ) {
      return false;
    }
    const frac = Math.max(0, Math.min(1, (box.bottomY - y) / (box.bottomY - box.topY)));
    // True Celsius mapped from -20°C to +120°C along tube
    const targetTrueC = -20 + frac * 140;
    const newX =
      simRef.current.faultyIce +
      (targetTrueC / 100) * (simRef.current.faultySteam - simRef.current.faultyIce);
    const clampedX = Math.max(-20, Math.min(130, Number(newX.toFixed(1))));
    setFaultyReading(clampedX);
    return true;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (updateFromPointer(e.clientX, e.clientY, true)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingLeft(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingLeft) return;
    updateFromPointer(e.clientX, e.clientY, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraggingLeft(false);
  };

  // 60 FPS Split Dual-Experiment Workbench Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = Math.max(360, container.clientWidth);
      height = Math.max(520, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTs = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const s = simRef.current;
      const tSec = now / 1000;

      const curTrueC = faultyToTrueCelsius(s.faultyReading, s.faultyIce, s.faultySteam);
      const curCoinc = getFaultyCoincidence(s.faultyIce, s.faultySteam);
      const curRatio = s.sensorMode === 'gas' ? s.pMeas / s.pTr : s.rMeas / s.rTr;
      const curK = 273.16 * curRatio;

      // Animate gas bulb molecules inside normalized unit circle
      const molSpeed = 0.25 + Math.sqrt(Math.max(10, curK) / 300) * 0.65;
      for (let i = 0; i < s.molecules.length; i++) {
        const m = s.molecules[i];
        m.x += m.vx * molSpeed * dt;
        m.y += m.vy * molSpeed * dt;
        const dist = Math.hypot(m.x, m.y);
        if (dist > 0.78) {
          const nx = m.x / dist;
          const ny = m.y / dist;
          const dot = m.vx * nx + m.vy * ny;
          m.vx -= 2 * dot * nx;
          m.vy -= 2 * dot * ny;
          m.x = nx * 0.77;
          m.y = ny * 0.77;
        }
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        const pad = 12;
        const gap = 12;
        const isNarrow = width < 620;

        // Split into Left Half (Faulty + Graph) and Right Half (Triple Point Cell)
        const leftX = pad;
        const leftY = pad;
        const leftW = isNarrow ? width - pad * 2 : (width - pad * 2 - gap) * 0.52;
        const leftH = isNarrow ? (height - pad * 2 - gap) * 0.54 : height - pad * 2;

        const rightX = isNarrow ? pad : leftX + leftW + gap;
        const rightY = isNarrow ? leftY + leftH + gap : pad;
        const rightW = isNarrow ? width - pad * 2 : width - pad * 2 - gap - leftW;
        const rightH = isNarrow ? height - pad * 2 - gap - leftH : height - pad * 2;

        // ============================================================
        // LEFT HALF: FAULTY vs STANDARD THERMOMETER + CALIBRATION GRAPH
        // ============================================================
        drawRoundedRect(ctx, leftX, leftY, leftW, leftH, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Title bar
        ctx.fillStyle = '#020617';
        ctx.font = '800 12.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.mod3.faultySectionTitle, leftX + 12, leftY + 18);

        const topZoneY = leftY + 34;
        const topZoneH = leftH * 0.44;
        const graphZoneY = topZoneY + topZoneH + 10;
        const graphZoneH = leftY + leftH - graphZoneY - 10;

        // Thermometers sub-stage (extra top clearance so title never touches tube cap)
        const tubeTopY = topZoneY + 32;
        const tubeBottomY = topZoneY + topZoneH - 26;
        s.thermHitBox = {
          x: leftX,
          y: topZoneY,
          w: leftW,
          h: topZoneH,
          topY: tubeTopY,
          bottomY: tubeBottomY,
        };

        const cToTubeY = (cVal: number) => {
          const frac = (cVal - -20) / 140;
          return tubeBottomY - Math.max(0, Math.min(1, frac)) * (tubeBottomY - tubeTopY);
        };

        const yIce = cToTubeY(0);
        const ySteam = cToTubeY(100);
        const yCur = cToTubeY(curTrueC);

        // Ice and steam alignment guides
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(leftX + 16, yIce);
        ctx.lineTo(leftX + leftW - 16, yIce);
        ctx.stroke();

        ctx.strokeStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(leftX + 16, ySteam);
        ctx.lineTo(leftX + leftW - 16, ySteam);
        ctx.stroke();
        ctx.setLineDash([]);

        // Synced emerald level bar across both thermometers
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX + 14, yCur);
        ctx.lineTo(leftX + leftW - 14, yCur);
        ctx.stroke();
        ctx.restore();

        // Draw Standard & Faulty Thermometers side by side
        const cxStd = leftX + leftW * 0.3;
        const cxFlt = leftX + leftW * 0.7;

        const drawMiniTherm = (
          cx: number,
          title: string,
          color: string,
          darkTextColor: string,
          iceLabel: string,
          steamLabel: string,
          readingText: string
        ) => {
          ctx.fillStyle = '#020617';
          ctx.font = '800 12px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(title, cx, topZoneY + 10);

          // Outer glass tube
          drawRoundedRect(ctx, cx - 7, tubeTopY - 4, 14, tubeBottomY - tubeTopY + 14, 7);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Mercury column
          const mh = Math.max(4, tubeBottomY + 10 - yCur);
          drawRoundedRect(ctx, cx - 3.2, yCur, 6.4, mh, 3);
          ctx.fillStyle = color;
          ctx.fill();

          // Bulb
          ctx.beginPath();
          ctx.arc(cx, tubeBottomY + 14, 11, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Crisp white-backed Ice & Steam labels (dashed lines never cut through digits)
          drawCrispLabelBadge(ctx, iceLabel, cx + 11, yIce, {
            align: 'left',
            textColor: '#075985',
            borderColor: 'rgba(2, 132, 199, 0.65)',
            font: '800 11px "JetBrains Mono", monospace',
            padX: 5,
            height: 18,
          });
          drawCrispLabelBadge(ctx, steamLabel, cx + 11, ySteam, {
            align: 'left',
            textColor: '#991b1b',
            borderColor: 'rgba(220, 38, 38, 0.65)',
            font: '800 11px "JetBrains Mono", monospace',
            padX: 5,
            height: 18,
          });

          // Crisp white-backed live reading badge on left of tube (green level line never cuts through digits)
          drawCrispLabelBadge(ctx, readingText, cx - 11, yCur, {
            align: 'right',
            textColor: darkTextColor,
            borderColor: color,
            font: '800 11.5px "JetBrains Mono", monospace',
            padX: 6,
            height: 20,
          });
        };

        drawMiniTherm(
          cxStd,
          t.mod3.standardLabel,
          '#0284c7',
          '#075985',
          '0°C',
          '100°C',
          `${curTrueC.toFixed(1)}°C`
        );
        drawMiniTherm(
          cxFlt,
          t.mod3.faultyLabel,
          '#d97706',
          '#92400e',
          `${s.faultyIce}°`,
          `${s.faultySteam}°`,
          `${s.faultyReading.toFixed(1)}°X`
        );

        // === CALIBRATION LINE GRAPH (C_true vs X_faulty) ===
        const gx = leftX + 42;
        const gy = graphZoneY + 20;
        const gw = Math.max(80, leftW - 58);
        const gh = Math.max(80, graphZoneH - 42);

        ctx.fillStyle = '#020617';
        ctx.font = '800 11.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(t.mod3.calibrationGraphTitle, leftX + 12, graphZoneY + 8);

        // Plot box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(gx, gy, gw, gh);

        const axisMin = -30;
        const axisMax = 130;
        const toGX = (val: number) => gx + ((val - axisMin) / (axisMax - axisMin)) * gw;
        const toGY = (val: number) => gy + gh - ((val - axisMin) / (axisMax - axisMin)) * gh;

        // Grid ticks at 0, 50, 100
        ctx.font = '700 10.5px "JetBrains Mono", monospace';
        for (const tick of [0, 50, 100]) {
          const tx = toGX(tick);
          const ty = toGY(tick);
          ctx.strokeStyle = tick === 0 ? '#64748b' : '#cbd5e1';
          ctx.lineWidth = tick === 0 ? 1.25 : 0.9;
          ctx.beginPath();
          ctx.moveTo(tx, gy);
          ctx.lineTo(tx, gy + gh);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(gx, ty);
          ctx.lineTo(gx + gw, ty);
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.fillText(`${tick}`, tx, gy + gh + 12);
          ctx.textAlign = 'right';
          ctx.fillText(`${tick}`, gx - 5, ty + 3);
        }

        // Axis captions
        ctx.fillStyle = '#020617';
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('X (Faulty)', gx + gw / 2, gy + gh + 24);

        ctx.save();
        ctx.translate(leftX + 12, gy + gh / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('C_true (°C)', 0, 0);
        ctx.restore();

        // Clip lines inside plot area
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx, gy, gw, gh);
        ctx.clip();

        // 1. Identity line y = x (dashed slate)
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(toGX(axisMin), toGY(axisMin));
        ctx.lineTo(toGX(axisMax), toGY(axisMax));
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Calibration line C_true(X)
        const cAtMin = faultyToTrueCelsius(axisMin, s.faultyIce, s.faultySteam);
        const cAtMax = faultyToTrueCelsius(axisMax, s.faultyIce, s.faultySteam);
        ctx.beginPath();
        ctx.moveTo(toGX(axisMin), toGY(cAtMin));
        ctx.lineTo(toGX(axisMax), toGY(cAtMax));
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // 3. Coincidence Intersection Point (X* = C*)
        if (curCoinc.status === 'unique') {
          const cv = curCoinc.value;
          if (cv >= axisMin && cv <= axisMax) {
            const cxp = toGX(cv);
            const cyp = toGY(cv);
            ctx.beginPath();
            ctx.arc(cxp, cyp, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fef3c7';
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            const offX = cv > 65 ? -10 : 10;
            drawCrispLabelBadge(ctx, `(${cv.toFixed(1)}, ${cv.toFixed(1)})`, cxp + offX, cyp - 12, {
              align: cv > 65 ? 'right' : 'left',
              textColor: '#78350f',
              borderColor: '#d97706',
              bgColor: 'rgba(255, 251, 235, 0.96)',
              font: '800 10.5px "JetBrains Mono", monospace',
              padX: 5,
              height: 18,
            });
          }
        }

        // 4. Current Operating Point (X, C_true) with dashed drop lines
        const curPX = toGX(s.faultyReading);
        const curPY = toGY(curTrueC);

        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(curPX, gy + gh);
        ctx.lineTo(curPX, curPY);
        ctx.lineTo(gx, curPY);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(curPX, curPY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Compact graph legend
        ctx.font = '800 10.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#065f46';
        ctx.fillText(`— ${t.mod3.calibrationLine}`, gx + gw, graphZoneY + 8);

        // ============================================================
        // RIGHT HALF: TRIPLE POINT OF WATER CELL & MANOMETER / RTD
        // ============================================================
        drawRoundedRect(ctx, rightX, rightY, rightW, rightH, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Header
        ctx.fillStyle = '#020617';
        ctx.font = '800 12.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.mod3.tripleCellTitle, rightX + 12, rightY + 18);

        ctx.fillStyle = '#075985';
        ctx.font = '700 11.5px "JetBrains Mono", monospace';
        ctx.fillText(t.mod3.tripleCellNote, rightX + 12, rightY + 35);

        // Apparatus geometry
        const appTop = rightY + 52;
        const appBottom = rightY + rightH - 86;
        const appH = Math.max(180, appBottom - appTop);

        // Left side of Right Half: Triple-Point Glass Cell
        const cellW = Math.min(155, rightW * 0.46);
        const cellH = Math.min(250, appH * 0.84);
        const cellX = rightX + 16;
        const cellY = appTop + (appH - cellH) * 0.5 + 8;

        ctx.save();
        drawRoundedRect(ctx, cellX, cellY, cellW, cellH, 18);
        ctx.fillStyle = '#f0f9ff';
        ctx.fill();
        ctx.clip();

        // Vapor region (top 28%)
        const waterLineY = cellY + cellH * 0.3;
        const vapGrad = ctx.createLinearGradient(cellX, cellY, cellX, waterLineY);
        vapGrad.addColorStop(0, '#e0f2fe');
        vapGrad.addColorStop(1, '#f0f9ff');
        ctx.fillStyle = vapGrad;
        ctx.fillRect(cellX, cellY, cellW, waterLineY - cellY);

        // Liquid Water region (bottom 70%)
        const watGrad = ctx.createLinearGradient(cellX, waterLineY, cellX, cellY + cellH);
        watGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        watGrad.addColorStop(1, 'rgba(2, 132, 199, 0.42)');
        ctx.fillStyle = watGrad;
        ctx.fillRect(cellX, waterLineY, cellW, cellY + cellH - waterLineY);

        // Animated liquid meniscus wave
        ctx.beginPath();
        ctx.moveTo(cellX, waterLineY);
        for (let wx = 0; wx <= cellW; wx += 8) {
          const wy = waterLineY + Math.sin(tSec * 2.4 + wx * 0.08) * 2.2;
          ctx.lineTo(cellX + wx, wy);
        }
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Translucent Ice Crystals bobbing near meniscus & mantle
        const iceCoords = [
          { fx: 0.22, fy: 0.36, sz: 14, ph: 0 },
          { fx: 0.78, fy: 0.37, sz: 13, ph: 1.5 },
          { fx: 0.19, fy: 0.62, sz: 12, ph: 2.8 },
          { fx: 0.8, fy: 0.68, sz: 15, ph: 4.1 },
        ];
        for (const ic of iceCoords) {
          const ix = cellX + ic.fx * cellW;
          const iy = cellY + ic.fy * cellH + Math.sin(tSec * 1.6 + ic.ph) * 3;
          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(Math.sin(tSec * 0.9 + ic.ph) * 0.14);
          drawRoundedRect(ctx, -ic.sz / 2, -ic.sz / 2, ic.sz, ic.sz, 3.5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.fill();
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.restore();
        }

        // Rising vapor micro-bubbles
        for (let b = 0; b < 9; b++) {
          const prog = ((tSec * 0.38 + b * 0.13) % 1);
          const bx = cellX + 18 + ((b * 29) % Math.max(20, cellW - 36));
          const by = cellY + cellH - 12 - prog * (cellH * 0.68);
          ctx.beginPath();
          ctx.arc(bx + Math.sin(tSec * 3 + b) * 2, by, 2.2 + (b % 2), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore();

        // Outer glass wall of Triple-Point Cell
        drawRoundedRect(ctx, cellX, cellY, cellW, cellH, 18);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Phase labels inside cell with high-contrast white backing
        drawCrispLabelBadge(ctx, t.mod3.vaporPhase, cellX + 7, cellY + 15, {
          align: 'left',
          textColor: '#075985',
          borderColor: 'rgba(2, 132, 199, 0.45)',
          font: '800 10.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif',
          padX: 5,
          height: 17,
        });
        drawCrispLabelBadge(ctx, t.mod3.icePhase, cellX + 7, waterLineY + 16, {
          align: 'left',
          textColor: '#0c4a6e',
          borderColor: 'rgba(2, 132, 199, 0.5)',
          font: '800 10.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif',
          padX: 5,
          height: 17,
        });
        drawCrispLabelBadge(ctx, t.mod3.waterPhase, cellX + 7, cellY + cellH - 14, {
          align: 'left',
          textColor: '#0c4a6e',
          borderColor: 'rgba(2, 132, 199, 0.5)',
          font: '800 10.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif',
          padX: 5,
          height: 17,
        });

        // === IMMERSED SENSOR INSIDE CELL + RIGHT INSTRUMENT ===
        const bulbCx = cellX + cellW * 0.5;
        const bulbCy = cellY + cellH * 0.62;
        const bulbR = Math.min(28, cellW * 0.21);

        const instX = cellX + cellW + 16;
        const instW = Math.max(90, rightX + rightW - instX - 14);

        if (s.sensorMode === 'gas') {
          // Capillary stem rising from gas bulb to U-tube manometer
          const tubeTop = cellY - 12;
          const manoLeftX = instX + instW * 0.32;
          const manoRightX = instX + instW * 0.72;
          const manoTopY = cellY + 12;
          const manoBotY = cellY + cellH - 18;

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(bulbCx, bulbCy - bulbR);
          ctx.lineTo(bulbCx, tubeTop);
          ctx.lineTo(manoLeftX, tubeTop);
          ctx.lineTo(manoLeftX, manoTopY + 16);
          ctx.stroke();

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.4;
          ctx.stroke();

          // Constant-Volume Gas Bulb
          const bulbColor = tempToColor(curK - 273.15, -100, 250);
          ctx.beginPath();
          ctx.arc(bulbCx, bulbCy, bulbR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fill();
          ctx.strokeStyle = bulbColor;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Animated gas particles inside bulb
          for (let i = 0; i < s.molecules.length; i++) {
            const m = s.molecules[i];
            ctx.beginPath();
            ctx.arc(bulbCx + m.x * bulbR, bulbCy + m.y * bulbR, 2.1, 0, Math.PI * 2);
            ctx.fillStyle = bulbColor;
            ctx.fill();
          }

          // U-Tube Mercury Manometer
          const uRad = (manoRightX - manoLeftX) / 2;
          const uCenterX = (manoLeftX + manoRightX) / 2;
          const uBendY = manoBotY - uRad;

          // Glass U-tube outline
          ctx.beginPath();
          ctx.moveTo(manoLeftX, manoTopY);
          ctx.lineTo(manoLeftX, uBendY);
          ctx.arc(uCenterX, uBendY, uRad, Math.PI, 0, true);
          ctx.lineTo(manoRightX, manoTopY);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 8.5;
          ctx.stroke();

          // Fiducial constant-volume reference mark on left limb
          const refMercY = manoTopY + (uBendY - manoTopY) * 0.56;
          // Right limb mercury level shifts proportionally to P / P_tr
          const deltaPx = Math.max(
            -(uBendY - refMercY - 12),
            Math.min(refMercY - manoTopY - 8, (curRatio - 1) * 62)
          );
          const rightMercY = refMercY - deltaPx;

          // Draw mercury fill inside U-tube
          ctx.beginPath();
          ctx.moveTo(manoLeftX, refMercY);
          ctx.lineTo(manoLeftX, uBendY);
          ctx.arc(uCenterX, uBendY, uRad, Math.PI, 0, true);
          ctx.lineTo(manoRightX, rightMercY);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 6.5;
          ctx.lineCap = 'butt';
          ctx.stroke();

          // Reference index arrow on left limb
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(manoLeftX - 13, refMercY);
          ctx.lineTo(manoLeftX + 8, refMercY);
          ctx.stroke();

          // Height difference bracket Δh
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(manoLeftX + 8, refMercY);
          ctx.lineTo(manoRightX + 16, refMercY);
          ctx.moveTo(manoRightX + 4, rightMercY);
          ctx.lineTo(manoRightX + 16, rightMercY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Label manometer
          ctx.fillStyle = '#020617';
          ctx.font = '800 11.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(t.mod3.manometerLabel, uCenterX, manoBotY + 17);

          drawCrispLabelBadge(ctx, `P/P_tr = ${curRatio.toFixed(3)}`, uCenterX, manoTopY - 12, {
            align: 'center',
            textColor: '#065f46',
            borderColor: '#059669',
            bgColor: '#ecfdf5',
            font: '800 11px "JetBrains Mono", monospace',
            padX: 6,
            height: 19,
          });
        } else {
          // Platinum Resistance Coil immersed inside Triple-Point Cell + Digital Bridge Dial
          const wireTopY = cellY - 10;
          const meterCx = instX + instW * 0.5;
          const meterCy = cellY + cellH * 0.48;
          const meterR = Math.min(54, instW * 0.42);

          // Lead wires from coil to resistance bridge
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(bulbCx - 5, bulbCy - 18);
          ctx.lineTo(bulbCx - 5, wireTopY);
          ctx.lineTo(meterCx - 8, wireTopY);
          ctx.lineTo(meterCx - 8, meterCy - meterR);
          ctx.moveTo(bulbCx + 5, bulbCy - 18);
          ctx.lineTo(bulbCx + 5, wireTopY + 5);
          ctx.lineTo(meterCx + 8, wireTopY + 5);
          ctx.lineTo(meterCx + 8, meterCy - meterR);
          ctx.stroke();

          // Platinum resistor helical coil
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const cy = bulbCy - 16 + k * 6;
            const cx = bulbCx + (k % 2 === 0 ? -10 : 10);
            if (k === 0) ctx.moveTo(bulbCx - 5, cy);
            else ctx.lineTo(cx, cy);
          }
          ctx.stroke();

          // Analog / Digital Ohmmeter Dial
          ctx.beginPath();
          ctx.arc(meterCx, meterCy, meterR, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2.4;
          ctx.stroke();

          // Scale arc
          ctx.beginPath();
          ctx.arc(meterCx, meterCy, meterR - 9, Math.PI * 0.8, Math.PI * 2.2);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 5;
          ctx.stroke();

          // Needle angle from ratio (0.1 to 2.5)
          const normR = Math.max(0, Math.min(1, curRatio / 2.5));
          const ang = Math.PI * 0.8 + normR * Math.PI * 1.4;
          ctx.beginPath();
          ctx.moveTo(meterCx, meterCy);
          ctx.lineTo(
            meterCx + Math.cos(ang) * (meterR - 14),
            meterCy + Math.sin(ang) * (meterR - 14)
          );
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(meterCx, meterCy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();

          ctx.fillStyle = '#020617';
          ctx.font = '800 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${s.rMeas.toFixed(1)} Ω`, meterCx, meterCy + meterR * 0.52);

          ctx.fillStyle = '#020617';
          ctx.font = '800 11.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.fillText(t.mod3.platinumCoilLabel, meterCx, meterCy + meterR + 18);
        }

        // Bottom live Triple-Point Formula Plaque
        const plaqueY = rightY + rightH - 68;
        const plaqueH = 56;
        drawRoundedRect(ctx, rightX + 12, plaqueY, rightW - 24, plaqueH, 10);
        ctx.fillStyle = '#ecfdf5';
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const propSym = s.sensorMode === 'gas' ? 'P' : 'R';
        const valMeas = s.sensorMode === 'gas' ? s.pMeas : s.rMeas;
        const valRef = s.sensorMode === 'gas' ? s.pTr : s.rTr;

        ctx.fillStyle = '#022c22';
        ctx.font = '700 11.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `T = 273.16 × (${propSym} / ${propSym}_tr) = 273.16 × (${valMeas.toFixed(1)} / ${valRef.toFixed(1)})`,
          rightX + rightW / 2,
          plaqueY + 19
        );

        ctx.fillStyle = '#064e3b';
        ctx.font = '800 15.5px "JetBrains Mono", monospace';
        ctx.fillText(
          `T = ${curK.toFixed(2)} K   (${(curK - 273.15).toFixed(2)} °C)`,
          rightX + rightW / 2,
          plaqueY + 41
        );

        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [lang, t]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* LEFT CONTROL DOCK */}
      <aside className="w-full lg:w-[340px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        {/* Part 1: Faulty Thermometer Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-950">{t.mod3.faultySectionTitle}</h2>
          </div>

          <ProgressiveSlider
            id="slider-faulty-ice"
            label={t.mod3.faultyIce}
            value={faultyIce}
            min={-15}
            max={15}
            step={0.5}
            unit="°X"
            precision={1}
            onChange={setFaultyIce}
          />
          <ProgressiveSlider
            id="slider-faulty-steam"
            label={t.mod3.faultySteam}
            value={faultySteam}
            min={80}
            max={120}
            step={0.5}
            unit="°X"
            precision={1}
            onChange={setFaultySteam}
          />
          <ProgressiveSlider
            id="slider-faulty-reading"
            label={t.mod3.faultyReading}
            value={faultyReading}
            min={-20}
            max={130}
            step={0.5}
            unit="°X"
            precision={1}
            accentIndicator="#d97706"
            onChange={setFaultyReading}
          />

          <button
            type="button"
            disabled={coincidence.status !== 'unique'}
            onClick={handleJumpToCoincidence}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span>
              {coincidence.status === 'unique'
                ? `${t.mod3.jumpToCoincidence} (${coincidence.value.toFixed(1)}°)`
                : coincidence.status === 'identical'
                ? t.mod3.alreadyCalibrated
                : t.mod3.noCoincidence}
            </span>
          </button>
        </div>

        {/* Part 2: Single Fixed-Point (Triple Point) Controls */}
        <div className="border-t border-sky-100 pt-3.5 space-y-3">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-sky-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-950">{t.mod3.triplePointSectionTitle}</h3>
          </div>

          {/* Sensor Mode Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-sky-50 border border-sky-300 rounded-xl">
            <button
              type="button"
              onClick={() => setSensorMode('gas')}
              className={`px-2 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                sensorMode === 'gas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-900 hover:text-slate-950'
              }`}
            >
              {t.mod3.gasThermometer}
            </button>
            <button
              type="button"
              onClick={() => setSensorMode('platinum')}
              className={`px-2 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                sensorMode === 'platinum'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-900 hover:text-slate-950'
              }`}
            >
              {t.mod3.platinumThermometer}
            </button>
          </div>

          {sensorMode === 'gas' ? (
            <>
              <ProgressiveSlider
                id="slider-ptr"
                label={t.mod3.refPressure}
                value={pTr}
                min={20}
                max={200}
                step={1}
                unit=" kPa"
                precision={1}
                onChange={setPTr}
              />
              <ProgressiveSlider
                id="slider-pmeas"
                label={t.mod3.measuredPressure}
                value={pMeas}
                min={10}
                max={300}
                step={0.5}
                unit=" kPa"
                precision={1}
                accentIndicator="#0284c7"
                onChange={setPMeas}
              />
            </>
          ) : (
            <>
              <ProgressiveSlider
                id="slider-rtr"
                label={t.mod3.refResistance}
                value={rTr}
                min={20}
                max={200}
                step={1}
                unit=" Ω"
                precision={1}
                onChange={setRTr}
              />
              <ProgressiveSlider
                id="slider-rmeas"
                label={t.mod3.measuredResistance}
                value={rMeas}
                min={10}
                max={300}
                step={0.5}
                unit=" Ω"
                precision={1}
                accentIndicator="#059669"
                onChange={setRMeas}
              />
            </>
          )}
        </div>
      </aside>

      {/* CENTER CANVAS STAGE (SPLIT WORKBENCH) */}
      <section className="flex-1 min-w-0 bg-white border border-sky-200 shadow-sm rounded-2xl p-2 flex flex-col min-h-[540px] overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 w-full h-full min-h-[520px] rounded-xl overflow-hidden touch-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`block w-full h-full ${draggingLeft ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          />
        </div>
      </section>

      {/* RIGHT TELEMETRY PANEL */}
      <aside className="w-full lg:w-[330px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        {/* Faulty Thermometer Telemetry */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-extrabold text-slate-950">{t.mod3.trueTempTitle}</h2>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50 border border-sky-300 p-2.5">
              <div className="text-xs text-slate-900 font-bold">C_true</div>
              <div className="font-mono-num text-xl font-extrabold text-sky-900 mt-0.5">
                {trueC.toFixed(2)}°C
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-2.5">
              <div className="text-xs text-slate-900 font-bold">X_faulty</div>
              <div className="font-mono-num text-xl font-extrabold text-amber-900 mt-0.5">
                {faultyReading.toFixed(1)}°X
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-slate-900 font-bold">{t.mod3.errorLabel}</span>
              <span
                className={`font-mono-num font-extrabold ${
                  Math.abs(readingError) < 0.08 ? 'text-emerald-900' : 'text-rose-800'
                }`}
              >
                {readingError >= 0 ? '+' : ''}
                {readingError.toFixed(2)}°
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-slate-900 font-bold">{t.mod3.fundamentalInterval}</span>
              <span className="font-mono-num font-extrabold text-slate-950">
                {fundamentalInterval.toFixed(1)} div
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-900 font-bold">{t.mod3.coincidenceTemp}</span>
              <span className="font-mono-num font-extrabold text-emerald-900">
                {coincidence.status === 'unique'
                  ? `${coincidence.value.toFixed(2)}°`
                  : coincidence.status === 'identical'
                  ? 'All T'
                  : '∞ (None)'}
              </span>
            </div>
          </div>

          {/* Live Faulty Formula Substitution */}
          <div className="rounded-xl bg-sky-50 border border-sky-300 p-3 font-mono-num text-xs font-semibold space-y-1 text-slate-950">
            <div className="text-slate-800 font-bold">
              C_true / 100 = (X − X_ice) / (X_steam − X_ice)
            </div>
            <div>
              C_true = 100 × ({faultyReading.toFixed(1)} − {faultyIce}) / ({faultySteam} −{' '}
              {faultyIce})
            </div>
            <div className="font-extrabold text-sky-900 pt-1 border-t border-sky-300">
              C_true = {trueC.toFixed(2)} °C
            </div>
          </div>
        </div>

        {/* Single Fixed-Point (Triple Point) Telemetry */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-sm font-extrabold text-slate-950">{t.mod3.singlePointTitle}</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-2.5">
              <div className="text-xs text-emerald-950 font-bold">
                {t.mod3.kelvinOutput}
              </div>
              <div className="font-mono-num text-lg font-extrabold text-emerald-900 mt-0.5">
                {kelvinTriple.toFixed(2)} K
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-300 p-2.5">
              <div className="text-xs text-slate-900 font-bold">
                {t.mod3.celsiusOutput}
              </div>
              <div className="font-mono-num text-lg font-extrabold text-slate-950 mt-0.5">
                {celsiusTriple.toFixed(2)} °C
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-300 p-3 font-mono-num text-xs font-semibold space-y-1 text-slate-950">
            <div className="text-slate-800 font-bold">
              {sensorMode === 'gas'
                ? 'T = 273.16 × (P / P_tr)'
                : 'T = 273.16 × (R / R_tr)'}
            </div>
            <div>
              {t.mod3.ratioLabel}:{' '}
              {sensorMode === 'gas'
                ? `${pMeas.toFixed(1)} / ${pTr.toFixed(1)}`
                : `${rMeas.toFixed(1)} / ${rTr.toFixed(1)}`}{' '}
              = <span className="font-extrabold">{ratioTriple.toFixed(4)}</span>
            </div>
            <div className="font-extrabold text-emerald-900 pt-1 border-t border-slate-300">
              T = 273.16 × {ratioTriple.toFixed(4)} = {kelvinTriple.toFixed(2)} K
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MoveVertical, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Lang, Translations } from '../i18n/translations';
import { ProgressiveSlider } from '../components/ProgressiveSlider';
import {
  celsiusToFahrenheit,
  celsiusToKelvin,
  celsiusToCustom,
  tempToColor,
  drawRoundedRect,
  drawCrispLabelBadge,
} from '../utils/thermalColor';

interface Module2Props {
  lang: Lang;
  t: Translations;
  resetSignal: number;
}

interface BathBubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wobble: number;
}

function createBubbles(count: number): BathBubble[] {
  const arr: BathBubble[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: ((i * 37 + 11) % 94) / 100 + 0.03,
      y: ((i * 53 + 7) % 92) / 100 + 0.04,
      r: 2 + (i % 4) * 1.1,
      vy: 0.04 + (i % 5) * 0.015,
      wobble: i * 1.7,
    });
  }
  return arr;
}

export const Module2Scales: React.FC<Module2Props> = ({ lang, t, resetSignal }) => {
  const [tempC, setTempC] = useState(37);
  const [customIce, setCustomIce] = useState(20);
  const [customSteam, setCustomSteam] = useState(180);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    tempC: 37,
    customIce: 20,
    customSteam: 180,
    displayMaxC: 150,
    isDragging: false,
    tubeTopY: 70,
    tubeBottomY: 420,
    bubbles: createBubbles(34),
  });

  useEffect(() => {
    stateRef.current.tempC = tempC;
  }, [tempC]);

  useEffect(() => {
    stateRef.current.customIce = customIce;
  }, [customIce]);

  useEffect(() => {
    stateRef.current.customSteam = customSteam;
  }, [customSteam]);

  useEffect(() => {
    stateRef.current.isDragging = isDragging;
  }, [isDragging]);

  const handleReset = useCallback(() => {
    setTempC(37);
    setCustomIce(20);
    setCustomSteam(180);
  }, []);

  useEffect(() => {
    if (resetSignal > 0) handleReset();
  }, [resetSignal, handleReset]);

  const handleCustomIceChange = (v: number) => {
    setCustomIce(v);
    if (customSteam < v + 20) {
      setCustomSteam(v + 20);
    }
  };

  const handleCustomSteamChange = (v: number) => {
    setCustomSteam(v);
    if (customIce > v - 20) {
      setCustomIce(v - 20);
    }
  };

  // Pointer drag mapping directly on canvas
  const updateTempFromPointer = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = clientY - rect.top;
    const { tubeTopY, tubeBottomY, displayMaxC } = stateRef.current;
    const minC = -273.15;
    const frac = Math.max(0, Math.min(1, (tubeBottomY - y) / (tubeBottomY - tubeTopY)));
    const newC = minC + frac * (displayMaxC - minC);
    setTempC(Number(newC.toFixed(2)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateTempFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    updateTempFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  // 60 FPS Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = Math.max(340, container.clientWidth);
      height = Math.max(480, container.clientHeight);
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
      const st = stateRef.current;

      // Smoothly expand scale ceiling if Fahrenheit=Kelvin preset (301.10°C) is active
      const targetMaxC = st.tempC > 152 ? 330 : 150;
      st.displayMaxC += (targetMaxC - st.displayMaxC) * Math.min(1, dt * 8);

      const minC = -273.15;
      const maxC = st.displayMaxC;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);

        const padX = 22;
        const headerH = 54;
        const footerH = 74;
        const tubeTopY = headerH + 22;
        const tubeBottomY = height - footerH;
        st.tubeTopY = tubeTopY;
        st.tubeBottomY = tubeBottomY;

        const cToY = (c: number) => {
          const frac = (c - minC) / (maxC - minC);
          return tubeBottomY - frac * (tubeBottomY - tubeTopY);
        };

        // Background thermal bath chamber
        const bathColorLight = tempToColor(st.tempC, -100, 150, 0.1);
        const bathColorDeep = tempToColor(st.tempC, -100, 150, 0.22);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(0.2, bathColorLight);
        bgGrad.addColorStop(1, bathColorDeep);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Thermal bath glass tank outline
        const tankX = padX;
        const tankY = headerH - 4;
        const tankW = width - padX * 2;
        const tankH = height - headerH - 12;
        drawRoundedRect(ctx, tankX, tankY, tankW, tankH, 18);
        ctx.strokeStyle = tempToColor(st.tempC, -100, 150, 0.35);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Convective bath shimmer particles (speed drops to 0 at Absolute Zero!)
        const kelvin = Math.max(0, st.tempC + 273.15);
        const thermalActivity = Math.sqrt(kelvin / 373.15);
        ctx.save();
        drawRoundedRect(ctx, tankX, tankY, tankW, tankH, 18);
        ctx.clip();
        for (let i = 0; i < st.bubbles.length; i++) {
          const b = st.bubbles[i];
          b.y -= b.vy * thermalActivity * dt * 1.4;
          if (b.y < 0.02) {
            b.y = 0.98;
            b.x = ((i * 41 + Math.floor(now * 0.01)) % 92) / 100 + 0.04;
          }
          const bx = tankX + b.x * tankW + Math.sin(now * 0.002 + b.wobble) * 3 * thermalActivity;
          const by = tankY + b.y * tankH;
          ctx.beginPath();
          ctx.arc(bx, by, b.r, 0, Math.PI * 2);
          ctx.fillStyle = tempToColor(st.tempC, -100, 150, 0.16);
          ctx.fill();
        }
        ctx.restore();

        // Top instructional caption
        ctx.fillStyle = '#020617';
        ctx.font = '800 12.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.mod2.dragCanvasHint, padX + 4, 22);

        // Ice & Steam reference laser lines across the entire bath
        const yIce = cToY(0);
        const ySteam = cToY(100);
        const yAbsZero = cToY(-273.15);

        // Subtle shaded calibration band between Ice Point and Steam Point
        ctx.fillStyle = 'rgba(14, 165, 233, 0.055)';
        ctx.fillRect(tankX + 2, ySteam, tankW - 4, yIce - ySteam);

        const drawLaserLine = (
          yPos: number,
          lineColor: string,
          textColor: string,
          label: string,
          dashed = true
        ) => {
          ctx.save();
          ctx.beginPath();
          if (dashed) ctx.setLineDash([6, 4]);
          ctx.moveTo(tankX + 8, yPos);
          ctx.lineTo(tankX + tankW - 8, yPos);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.setLineDash([]);

          // Crisp high-contrast label tag on left side of laser line
          ctx.font = '800 11.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          const textW = ctx.measureText(label).width + 16;
          drawRoundedRect(ctx, tankX + 12, yPos - 23, textW, 20, 6);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
          ctx.fill();
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 1.25;
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, tankX + 20, yPos - 13);
          ctx.restore();
        };

        drawLaserLine(ySteam, '#dc2626', '#991b1b', `${t.mod2.steamPoint} (100°C)`);
        drawLaserLine(yIce, '#0284c7', '#075985', `${t.mod2.icePoint} (0°C)`);

        // Absolute zero baseline
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.moveTo(tankX + 8, yAbsZero);
        ctx.lineTo(tankX + tankW - 8, yAbsZero);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 4 Thermometer Definitions
        const scales = [
          {
            name: t.mod2.scaleCelsius,
            unit: '°C',
            val: st.tempC,
            ice: 0,
            steam: 100,
            div: 100,
            color: '#dc2626',
            format: (c: number) => `${c.toFixed(1)}°`,
          },
          {
            name: t.mod2.scaleFahrenheit,
            unit: '°F',
            val: celsiusToFahrenheit(st.tempC),
            ice: 32,
            steam: 212,
            div: 180,
            color: '#d97706',
            format: (c: number) => `${celsiusToFahrenheit(c).toFixed(1)}°`,
          },
          {
            name: t.mod2.scaleKelvin,
            unit: 'K',
            val: celsiusToKelvin(st.tempC),
            ice: 273.15,
            steam: 373.15,
            div: 100,
            color: '#0284c7',
            format: (c: number) => `${celsiusToKelvin(c).toFixed(1)}`,
          },
          {
            name: t.mod2.scaleCustom,
            unit: '°X',
            val: celsiusToCustom(st.tempC, st.customIce, st.customSteam),
            ice: st.customIce,
            steam: st.customSteam,
            div: st.customSteam - st.customIce,
            color: '#059669',
            format: (c: number) =>
              `${celsiusToCustom(c, st.customIce, st.customSteam).toFixed(1)}°`,
          },
        ];

        const colSpan = (tankW - 44) / 4;
        const mercuryY = cToY(st.tempC);

        scales.forEach((sc, idx) => {
          const cx = tankX + 22 + colSpan * (idx + 0.5);
          const tubeW = 16;
          const bulbR = 17;

          // Scale title header above tube
          ctx.fillStyle = '#020617';
          ctx.font = '800 13px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sc.name, cx, headerH + 8);

          // Glass capillary outer body
          ctx.save();
          drawRoundedRect(ctx, cx - tubeW / 2, tubeTopY - 8, tubeW, tubeBottomY - tubeTopY + 18, 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Inner bore groove
          ctx.fillStyle = '#f1f5f9';
          drawRoundedRect(ctx, cx - 3.5, tubeTopY, 7, tubeBottomY - tubeTopY + 12, 3.5);
          ctx.fill();

          // Mercury/Alcohol column
          const colHeight = Math.max(4, tubeBottomY + 12 - mercuryY);
          const colGrad = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
          colGrad.addColorStop(0, sc.color);
          colGrad.addColorStop(0.55, sc.color);
          colGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = colGrad;
          drawRoundedRect(ctx, cx - 3.6, mercuryY, 7.2, colHeight, 3.5);
          ctx.fill();

          // Specular highlight along glass stem
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.fillRect(cx - tubeW / 2 + 2.5, tubeTopY - 2, 2.2, tubeBottomY - tubeTopY);

          // Spherical thermometer bulb at bottom
          ctx.beginPath();
          ctx.arc(cx, tubeBottomY + bulbR + 2, bulbR, 0, Math.PI * 2);
          ctx.fillStyle = sc.color;
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Specular bulb highlight
          ctx.beginPath();
          ctx.arc(cx - 5, tubeBottomY + bulbR - 3, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.fill();

          // Division tick marks along right side of stem
          const tickLevelsC =
            maxC > 200
              ? [-273.15, -100, 0, 100, 200, 300]
              : [-273.15, -200, -100, -40, 0, 50, 100, 150];

          ctx.font = '600 9.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          for (const tc of tickLevelsC) {
            if (tc > maxC + 1) continue;
            const ty = cToY(tc);
            const isFixed = tc === 0 || tc === 100;
            ctx.beginPath();
            ctx.moveTo(cx + tubeW / 2, ty);
            ctx.lineTo(cx + tubeW / 2 + (isFixed ? 9 : 5), ty);
            ctx.strokeStyle = isFixed ? '#020617' : '#334155';
            ctx.lineWidth = isFixed ? 2 : 1.2;
            ctx.stroke();

            if (isFixed || tc === -273.15 || (tc === -40 && maxC < 200)) {
              drawCrispLabelBadge(ctx, sc.format(tc), cx + tubeW / 2 + 10, ty, {
                align: 'left',
                textColor: tc === 100 ? '#991b1b' : tc === 0 ? '#075985' : '#0f172a',
                borderColor:
                  tc === 100
                    ? 'rgba(185, 28, 28, 0.55)'
                    : tc === 0
                    ? 'rgba(3, 105, 161, 0.55)'
                    : 'rgba(100, 116, 139, 0.45)',
                font: isFixed
                  ? '800 11px "JetBrains Mono", monospace'
                  : '700 10.5px "JetBrains Mono", monospace',
                padX: 4,
                height: 17,
              });
            }
          }

          // Intermediate minor ticks between Ice & Steam
          for (let k = 1; k < 10; k++) {
            const ty = cToY(k * 10);
            ctx.beginPath();
            ctx.moveTo(cx + tubeW / 2, ty);
            ctx.lineTo(cx + tubeW / 2 + 4, ty);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Bottom live digital readout plate under bulb
          ctx.fillStyle = '#020617';
          ctx.font = '800 13.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${sc.val.toFixed(2)} ${sc.unit}`,
            cx,
            tubeBottomY + bulbR * 2 + 16
          );

          ctx.fillStyle = '#1e293b';
          ctx.font = '700 11px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
          ctx.fillText(
            `${sc.div} ${t.mod2.divisions}`,
            cx,
            tubeBottomY + bulbR * 2 + 32
          );
          ctx.restore();
        });

        // === INTERACTIVE HORIZONTAL TEMPERATURE CURSOR LINE ===
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tankX + 6, mercuryY);
        ctx.lineTo(tankX + tankW - 6, mercuryY);
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = st.isDragging ? 3 : 2.2;
        ctx.stroke();

        // Left & right tactile emerald drag handles
        const drawHandle = (hx: number) => {
          drawRoundedRect(ctx, hx - 10, mercuryY - 12, 20, 24, 7);
          ctx.fillStyle = st.isDragging ? '#047857' : '#059669';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Grip lines
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          for (const dy of [-3.5, 0, 3.5]) {
            ctx.beginPath();
            ctx.moveTo(hx - 4, mercuryY + dy);
            ctx.lineTo(hx + 4, mercuryY + dy);
            ctx.stroke();
          }
        };

        drawHandle(tankX + 12);
        drawHandle(tankX + tankW - 12);

        // Floating readout tag on cursor line (right-aligned inside tank)
        const tagText = `${st.tempC.toFixed(2)}°C`;
        ctx.font = '700 11.5px "JetBrains Mono", monospace';
        const tagW = ctx.measureText(tagText).width + 16;
        const tagX = tankX + tankW - 30 - tagW;
        const tagY = Math.max(tubeTopY + 4, Math.min(tubeBottomY - 22, mercuryY - 24));
        drawRoundedRect(ctx, tagX, tagY, tagW, 20, 6);
        ctx.fillStyle = '#059669';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, tagX + tagW / 2, tagY + 10.5);

        ctx.restore();
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

  const tempF = celsiusToFahrenheit(tempC);
  const tempK = celsiusToKelvin(tempC);
  const tempX = celsiusToCustom(tempC, customIce, customSteam);
  const customInterval = customSteam - customIce;
  const ratio = tempC / 100;

  const isCFCoincidence = Math.abs(tempC - -40) < 0.15;
  const isFKCoincidence = Math.abs(tempC - 301.1) < 0.2;
  const isAbsZero = Math.abs(tempC - -273.15) < 0.2;

  const sliderMax = tempC > 150 ? 320 : 150;

  const presets = [
    { label: t.mod2.presetAbsZero, value: -273.15 },
    { label: t.mod2.presetCFMatch, value: -40 },
    { label: t.mod2.presetIce, value: 0 },
    { label: t.mod2.presetSteam, value: 100 },
    { label: t.mod2.presetFKMatch, value: 301.1 },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* LEFT CONTROL DOCK */}
      <aside className="w-full lg:w-[340px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        <div>
          <h2 className="text-sm font-extrabold text-slate-950">{t.mod2.bathTemp}</h2>
          <p className="text-xs font-medium text-slate-800 mt-0.5">{t.mod2.subtitle}</p>
        </div>

        <ProgressiveSlider
          id="slider-bath-c"
          label={t.mod2.bathTemp}
          value={tempC}
          min={-273.15}
          max={sliderMax}
          step={0.05}
          unit="°C"
          precision={2}
          accentIndicator={tempToColor(tempC, -100, 150)}
          onChange={setTempC}
        />

        {/* Custom Scale X calibration */}
        <div className="border-t border-sky-100 pt-3.5 space-y-3.5">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-950">{t.mod2.customScaleTitle}</h3>
          </div>

          <ProgressiveSlider
            id="slider-x-ice"
            label={t.mod2.customIce}
            value={customIce}
            min={-50}
            max={80}
            step={1}
            unit="°X"
            precision={0}
            onChange={handleCustomIceChange}
          />
          <ProgressiveSlider
            id="slider-x-steam"
            label={t.mod2.customSteam}
            value={customSteam}
            min={100}
            max={400}
            step={1}
            unit="°X"
            precision={0}
            onChange={handleCustomSteamChange}
          />
        </div>

        {/* One-Click Landmark Presets */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-950">{t.mod2.presetsTitle}</h3>
          </div>
          <div className="space-y-1.5">
            {presets.map((p) => {
              const active = Math.abs(tempC - p.value) < 0.15;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setTempC(p.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-sky-50/70 border-sky-200 text-slate-800 hover:bg-sky-100/80'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CENTER CANVAS STAGE */}
      <section className="flex-1 min-w-0 bg-white border border-sky-200 shadow-sm rounded-2xl p-2 flex flex-col min-h-[500px] overflow-hidden">
        {(isCFCoincidence || isFKCoincidence || isAbsZero) && (
          <div className="px-3 py-2 mb-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-2">
            <MoveVertical className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isCFCoincidence
                ? t.mod2.coincidenceBannerCF
                : isFKCoincidence
                ? t.mod2.coincidenceBannerFK
                : t.mod2.absZeroBanner}
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          className="flex-1 w-full h-full min-h-[480px] rounded-xl overflow-hidden touch-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`block w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-ns-resize'}`}
          />
        </div>
      </section>

      {/* RIGHT TELEMETRY PANEL */}
      <aside className="w-full lg:w-[330px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        {/* Multi-scale comparison table */}
        <div>
          <h2 className="text-sm font-extrabold text-slate-950">{t.mod2.scaleTableTitle}</h2>
          <div className="mt-2.5 overflow-hidden rounded-xl border border-sky-300">
            <table className="w-full text-xs">
              <thead className="bg-sky-100/80 text-slate-900 border-b border-sky-300">
                <tr>
                  <th className="text-left font-extrabold px-2.5 py-2">{t.mod2.scaleCol}</th>
                  <th className="text-right font-extrabold px-2.5 py-2">{t.mod2.readingCol}</th>
                  <th className="text-right font-extrabold px-2.5 py-2">{t.mod2.intervalCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200 font-mono-num">
                <tr className="bg-white">
                  <td className="px-2.5 py-2 font-sans font-bold text-slate-950">
                    {t.mod2.scaleCelsius}
                  </td>
                  <td className="px-2.5 py-2 text-right font-extrabold text-rose-800">
                    {tempC.toFixed(2)} °C
                  </td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-800">100</td>
                </tr>
                <tr className="bg-sky-50/50">
                  <td className="px-2.5 py-2 font-sans font-bold text-slate-950">
                    {t.mod2.scaleFahrenheit}
                  </td>
                  <td className="px-2.5 py-2 text-right font-extrabold text-amber-900">
                    {tempF.toFixed(2)} °F
                  </td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-800">180</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-2.5 py-2 font-sans font-bold text-slate-950">
                    {t.mod2.scaleKelvin}
                  </td>
                  <td className="px-2.5 py-2 text-right font-extrabold text-sky-900">
                    {tempK.toFixed(2)} K
                  </td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-800">100</td>
                </tr>
                <tr className="bg-sky-50/50">
                  <td className="px-2.5 py-2 font-sans font-bold text-slate-950">
                    {t.mod2.scaleCustom}
                  </td>
                  <td className="px-2.5 py-2 text-right font-extrabold text-emerald-900">
                    {tempX.toFixed(2)} °X
                  </td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-800">{customInterval}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Proportion Verifier Card */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2.5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-950">{t.mod2.proportionTitle}</h3>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">{t.mod2.identicalRatio}</p>
          </div>

          <div className="rounded-xl bg-sky-50 border border-sky-300 p-3 space-y-2.5">
            {/* Symbolic equation */}
            <div className="grid grid-cols-4 gap-1 text-center font-mono-num text-[11px] font-bold text-slate-950 pb-2 border-b border-sky-300">
              <div>
                <div className="border-b border-slate-700 pb-0.5">C − 0</div>
                <div className="pt-0.5">100</div>
              </div>
              <div>
                <div className="border-b border-slate-700 pb-0.5">F − 32</div>
                <div className="pt-0.5">180</div>
              </div>
              <div>
                <div className="border-b border-slate-700 pb-0.5">K−273.15</div>
                <div className="pt-0.5">100</div>
              </div>
              <div>
                <div className="border-b border-slate-700 pb-0.5">X−X₀</div>
                <div className="pt-0.5">X₁₀₀−X₀</div>
              </div>
            </div>

            {/* Live substituted fractions */}
            <div className="space-y-1.5 font-mono-num text-xs">
              {[
                {
                  tag: '°C',
                  num: (tempC - 0).toFixed(2),
                  den: '100',
                  val: ((tempC - 0) / 100).toFixed(4),
                  color: 'text-rose-800',
                },
                {
                  tag: '°F',
                  num: (tempF - 32).toFixed(2),
                  den: '180',
                  val: ((tempF - 32) / 180).toFixed(4),
                  color: 'text-amber-900',
                },
                {
                  tag: 'K',
                  num: (tempK - 273.15).toFixed(2),
                  den: '100',
                  val: ((tempK - 273.15) / 100).toFixed(4),
                  color: 'text-sky-900',
                },
                {
                  tag: '°X',
                  num: (tempX - customIce).toFixed(2),
                  den: `${customInterval}`,
                  val: ((tempX - customIce) / customInterval).toFixed(4),
                  color: 'text-emerald-900',
                },
              ].map((item) => (
                <div
                  key={item.tag}
                  className="flex items-center justify-between text-xs py-0.5"
                >
                  <span className={`font-extrabold w-7 ${item.color}`}>{item.tag}</span>
                  <span className="font-semibold text-slate-900">
                    ({item.num}) / {item.den}
                  </span>
                  <span className="font-extrabold text-emerald-900">= {item.val}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-sky-300 flex items-center justify-between text-xs font-extrabold text-emerald-950">
              <span>{lang === 'bn' ? 'অভিন্ন অনুপাত (r)' : 'Common Ratio (r)'}</span>
              <span className="font-mono-num text-sm">{ratio.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Linear Thermometric Property Formula */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2">
          <h3 className="text-[13px] font-extrabold text-slate-950">{t.mod2.linearPrincipleTitle}</h3>
          <div className="rounded-xl bg-slate-50 border border-slate-300 p-3 font-mono-num text-xs font-semibold space-y-1.5 text-slate-950">
            <div className="text-slate-800 font-bold">
              X_θ = X₀ + [(X₁₀₀ − X₀) / 100] × θ
            </div>
            <div>
              X_θ = {customIce} + [({customSteam} − {customIce}) / 100] × {tempC.toFixed(2)}
            </div>
            <div className="font-extrabold text-emerald-900 pt-1 border-t border-slate-300">
              X_θ = {tempX.toFixed(2)} °X
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

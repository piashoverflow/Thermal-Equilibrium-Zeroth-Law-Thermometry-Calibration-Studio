import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  Flame,
  Shield,
  Zap,
} from 'lucide-react';
import { Lang, Translations } from '../i18n/translations';
import { ProgressiveSlider } from '../components/ProgressiveSlider';
import { tempToColor, tempToDarkTextColor, drawRoundedRect } from '../utils/thermalColor';

interface Module1Props {
  lang: Lang;
  t: Translations;
  resetSignal: number;
}

interface Particle {
  x: number; // normalized [0.06, 0.94] inside chamber
  y: number; // normalized [0.08, 0.92] inside chamber
  vx: number;
  vy: number;
  r: number;
}

interface HistoryPoint {
  time: number;
  tA: number;
  tB: number;
  tC: number;
}

interface TelemetryState {
  tA: number;
  tB: number;
  tC: number;
  qAC: number; // positive means A -> C
  qBC: number; // positive means B -> C
  qAB: number; // positive means A -> B (in direct contact)
  eqAC: boolean;
  eqBC: boolean;
  eqAB: boolean;
}

function createChamberParticles(count: number, seedOffset: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = ((i * 137.508 + seedOffset * 41) % 360) * (Math.PI / 180);
    arr.push({
      x: 0.1 + (((i * 29 + seedOffset * 17) % 80) / 100),
      y: 0.12 + (((i * 43 + seedOffset * 23) % 76) / 100),
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      r: 3.1 + (i % 3) * 0.55,
    });
  }
  return arr;
}

export const Module1ZerothLaw: React.FC<Module1Props> = ({ lang, t, resetSignal }) => {
  const [initTA, setInitTA] = useState(86);
  const [initTB, setInitTB] = useState(14);
  const [initTC, setInitTC] = useState(50);

  const [wallAC, setWallAC] = useState<'adiabatic' | 'diathermal'>('adiabatic');
  const [wallBC, setWallBC] = useState<'adiabatic' | 'diathermal'>('adiabatic');
  const [directContact, setDirectContact] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [demoStage, setDemoStage] = useState<0 | 1 | 2 | 3>(0);
  const [hoverWall, setHoverWall] = useState<null | 'AC' | 'BC'>(null);

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    tA: 86,
    tB: 14,
    tC: 50,
    qAC: 0,
    qBC: 0,
    qAB: 0,
    eqAC: false,
    eqBC: false,
    eqAB: false,
  });

  // Mutable simulation state ref for 60 FPS loop without React re-render overhead
  const simRef = useRef({
    tA: 86,
    tB: 14,
    tC: 50,
    qAC: 0,
    qBC: 0,
    qAB: 0,
    wallAC: 'adiabatic' as 'adiabatic' | 'diathermal',
    wallBC: 'adiabatic' as 'adiabatic' | 'diathermal',
    directContact: false,
    contactAnim: 0, // 0 = 3-chamber, 1 = A & B directly touching
    isPlaying: true,
    simSpeed: 1 as 1 | 2,
    demoStage: 0 as 0 | 1 | 2 | 3,
    simTime: 0,
    lastHistoryPush: 0,
    lastUiSync: 0,
    history: [{ time: 0, tA: 86, tB: 14, tC: 50 }] as HistoryPoint[],
    particlesA: createChamberParticles(42, 1),
    particlesC: createChamberParticles(42, 2),
    particlesB: createChamberParticles(42, 3),
    wallRects: {
      ac: { x: 0, y: 0, w: 0, h: 0 },
      bc: { x: 0, y: 0, w: 0, h: 0 },
    },
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep refs synced with state
  useEffect(() => {
    simRef.current.wallAC = wallAC;
  }, [wallAC]);

  useEffect(() => {
    simRef.current.wallBC = wallBC;
  }, [wallBC]);

  useEffect(() => {
    simRef.current.directContact = directContact;
  }, [directContact]);

  useEffect(() => {
    simRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    simRef.current.simSpeed = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    simRef.current.demoStage = demoStage;
  }, [demoStage]);

  const handleReset = useCallback(() => {
    setInitTA(86);
    setInitTB(14);
    setInitTC(50);
    setWallAC('adiabatic');
    setWallBC('adiabatic');
    setDirectContact(false);
    setDemoStage(0);
    setIsPlaying(true);

    const s = simRef.current;
    s.tA = 86;
    s.tB = 14;
    s.tC = 50;
    s.qAC = 0;
    s.qBC = 0;
    s.qAB = 0;
    s.wallAC = 'adiabatic';
    s.wallBC = 'adiabatic';
    s.directContact = false;
    s.demoStage = 0;
    s.simTime = 0;
    s.lastHistoryPush = 0;
    s.history = [{ time: 0, tA: 86, tB: 14, tC: 50 }];
    setTelemetry({
      tA: 86,
      tB: 14,
      tC: 50,
      qAC: 0,
      qBC: 0,
      qAB: 0,
      eqAC: false,
      eqBC: false,
      eqAB: false,
    });
  }, []);

  useEffect(() => {
    if (resetSignal > 0) {
      handleReset();
    }
  }, [resetSignal, handleReset]);

  const updateChamberTemp = (chamber: 'A' | 'B' | 'C', val: number) => {
    setDemoStage(0);
    simRef.current.demoStage = 0;
    if (chamber === 'A') {
      setInitTA(val);
      simRef.current.tA = val;
    } else if (chamber === 'B') {
      setInitTB(val);
      simRef.current.tB = val;
    } else {
      setInitTC(val);
      simRef.current.tC = val;
    }
    simRef.current.history.push({
      time: simRef.current.simTime,
      tA: simRef.current.tA,
      tB: simRef.current.tB,
      tC: simRef.current.tC,
    });
    if (simRef.current.history.length > 260) {
      simRef.current.history.shift();
    }
  };

  const startAutoDemo = () => {
    const s = simRef.current;
    // If temperatures are already almost identical, pick crisp contrasting values to demonstrate the law vividly
    if (Math.abs(s.tA - s.tC) < 4 && Math.abs(s.tB - s.tC) < 4) {
      s.tA = 90;
      s.tC = 50;
      s.tB = 12;
      setInitTA(90);
      setInitTC(50);
      setInitTB(12);
      s.simTime = 0;
      s.lastHistoryPush = 0;
      s.history = [{ time: 0, tA: 90, tB: 12, tC: 50 }];
    }
    setIsPlaying(true);
    setDirectContact(false);
    setWallAC('diathermal');
    setWallBC('adiabatic');
    setDemoStage(1);
    s.isPlaying = true;
    s.directContact = false;
    s.wallAC = 'diathermal';
    s.wallBC = 'adiabatic';
    s.demoStage = 1;
  };

  const toggleDirectContact = () => {
    setDemoStage(0);
    simRef.current.demoStage = 0;
    setDirectContact((prev) => {
      const next = !prev;
      simRef.current.directContact = next;
      return next;
    });
  };

  // Canvas hit testing for clicking walls directly
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || simRef.current.directContact) {
      setHoverWall(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { ac, bc } = simRef.current.wallRects;
    if (x >= ac.x - 8 && x <= ac.x + ac.w + 8 && y >= ac.y && y <= ac.y + ac.h) {
      setHoverWall('AC');
    } else if (x >= bc.x - 8 && x <= bc.x + bc.w + 8 && y >= bc.y && y <= bc.y + bc.h) {
      setHoverWall('BC');
    } else {
      setHoverWall(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || simRef.current.directContact) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { ac, bc } = simRef.current.wallRects;
    if (x >= ac.x - 8 && x <= ac.x + ac.w + 8 && y >= ac.y && y <= ac.y + ac.h) {
      setDemoStage(0);
      setWallAC((w) => (w === 'adiabatic' ? 'diathermal' : 'adiabatic'));
    } else if (x >= bc.x - 8 && x <= bc.x + bc.w + 8 && y >= bc.y && y <= bc.y + bc.h) {
      setDemoStage(0);
      setWallBC((w) => (w === 'adiabatic' ? 'diathermal' : 'adiabatic'));
    }
  };

  // Main 60 FPS animation & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = stageContainerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = Math.max(320, container.clientWidth);
      height = Math.max(460, container.clientHeight);
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

    const stepParticles = (list: Particle[], tempC: number, dt: number) => {
      // Speed scales smoothly with kinetic energy ~ sqrt(T_kelvin), amplified visually for 0..100°C
      const norm = Math.max(0, Math.min(1, tempC / 100));
      const speed = 0.11 + norm * 0.52;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.x += p.vx * speed * dt;
        p.y += p.vy * speed * dt;
        if (p.x < 0.06) {
          p.x = 0.06;
          p.vx = Math.abs(p.vx);
        } else if (p.x > 0.94) {
          p.x = 0.94;
          p.vx = -Math.abs(p.vx);
        }
        if (p.y < 0.08) {
          p.y = 0.08;
          p.vy = Math.abs(p.vy);
        } else if (p.y > 0.92) {
          p.y = 0.92;
          p.vy = -Math.abs(p.vy);
        }
      }
    };

    const drawChamber = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      tempC: number,
      label: string,
      subTag: string,
      particles: Particle[],
      isReference = false
    ) => {
      const baseColor = tempToColor(tempC, 0, 100);
      const fillTop = tempToColor(tempC, 0, 100, 0.14);
      const fillBottom = tempToColor(tempC, 0, 100, 0.28);

      // Chamber interior gradient
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, fillTop);
      grad.addColorStop(1, fillBottom);

      ctx.save();
      drawRoundedRect(ctx, x, y, w, h, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = grad;
      ctx.fill();

      // Clip interior for particles
      ctx.save();
      ctx.clip();

      // Subtle scientific grid inside chamber
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
      ctx.lineWidth = 1;
      const gridStep = 24;
      for (let gx = x + gridStep; gx < x + w; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }
      for (let gy = y + gridStep; gy < y + h; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
      }

      // Particles with subtle speed glow when warm
      const norm = Math.max(0, Math.min(1, tempC / 100));
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const px = x + p.x * w;
        const py = y + p.y * h;

        // Motion trail for energetic particles
        if (norm > 0.25) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - p.vx * (4 + norm * 8), py - p.vy * (4 + norm * 8));
          ctx.strokeStyle = tempToColor(tempC, 0, 100, 0.28);
          ctx.lineWidth = p.r * 0.9;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Specular highlight
        ctx.beginPath();
        ctx.arc(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fill();
      }

      // If System C (Reference Thermometer Block), draw a clean embedded glass thermometer gauge on right edge
      if (isReference && w > 110 && h > 130) {
        const tx = x + w - 26;
        const ty = y + 48;
        const th = h - 78;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, tx - 5, ty, 10, th, 5);
        ctx.fill();
        ctx.stroke();

        const mercFrac = Math.max(0.05, Math.min(1, tempC / 100));
        const mh = (th - 10) * mercFrac;
        ctx.fillStyle = baseColor;
        drawRoundedRect(ctx, tx - 2.5, ty + th - 5 - mh, 5, mh + 2, 2.5);
        ctx.fill();

        // Bulb
        ctx.beginPath();
        ctx.arc(tx, ty + th + 4, 8, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();

      // Crisp outer border of chamber
      drawRoundedRect(ctx, x, y, w, h, 14);
      ctx.strokeStyle = tempToColor(tempC, 0, 100, 0.65);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Header readout plate inside top of chamber
      const headerH = 38;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      drawRoundedRect(ctx, x + 8, y + 8, w - 16, headerH, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.font = '800 13.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 16, y + 20);

      ctx.fillStyle = '#334155';
      ctx.font = '700 11px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.fillText(subTag, x + 16, y + 36);

      ctx.fillStyle = tempToDarkTextColor(tempC, 0, 100);
      ctx.font = '800 16.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${tempC.toFixed(1)}°C`, x + w - 16, y + 27);

      ctx.restore();
    };

    const drawPartitionWall = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      mode: 'adiabatic' | 'diathermal',
      flux: number, // positive means Left -> Right
      timeSec: number,
      label: string
    ) => {
      ctx.save();
      drawRoundedRect(ctx, x, y, w, h, 6);

      if (mode === 'adiabatic') {
        // Thick hatched grey insulator barrier
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        for (let hy = y - w; hy < y + h + w; hy += 11) {
          ctx.beginPath();
          ctx.moveTo(x - 2, hy);
          ctx.lineTo(x + w + 2, hy + w);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Glowing copper/gold diathermal conductor
        const cGrad = ctx.createLinearGradient(x, y, x + w, y);
        cGrad.addColorStop(0, '#b45309');
        cGrad.addColorStop(0.5, '#fbbf24');
        cGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = cGrad;
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glowing thermal aura when heat is actively flowing
        const absFlux = Math.abs(flux);
        if (absFlux > 1.2) {
          const glowAlpha = Math.min(0.45, 0.12 + absFlux / 260);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = `rgba(245, 158, 11, ${glowAlpha + 0.35})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Animated heat flux arrows crossing the conductive wall
          const dir = flux > 0 ? 1 : -1;
          const arrowCount = Math.min(5, Math.max(2, Math.round(absFlux / 35) + 1));
          const phase = (timeSec * (1.2 + Math.min(2.2, absFlux / 50))) % 1;

          for (let i = 0; i < arrowCount; i++) {
            const ay = y + ((i + 0.8) / (arrowCount + 0.6)) * h;
            const travel = (phase - 0.5) * 34 * dir;
            const cx = x + w / 2 + travel;
            const arrowLen = 28;
            const xStart = cx - (arrowLen / 2) * dir;
            const xEnd = cx + (arrowLen / 2) * dir;

            ctx.beginPath();
            ctx.moveTo(xStart, ay);
            ctx.lineTo(xEnd, ay);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3.2;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(xEnd, ay);
            ctx.lineTo(xEnd - 8 * dir, ay - 5.5);
            ctx.lineTo(xEnd - 8 * dir, ay + 5.5);
            ctx.closePath();
            ctx.fillStyle = '#dc2626';
            ctx.fill();
          }
        }
      }

      // Label pill above wall
      ctx.fillStyle = mode === 'diathermal' ? '#fef3c7' : '#f1f5f9';
      ctx.strokeStyle = mode === 'diathermal' ? '#b45309' : '#475569';
      ctx.lineWidth = 1.25;
      const badgeW = 82;
      drawRoundedRect(ctx, x + w / 2 - badgeW / 2, y - 25, badgeW, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = mode === 'diathermal' ? '#78350f' : '#0f172a';
      ctx.font = '800 11px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y - 15);

      ctx.restore();
    };

    const drawHistoryPlot = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      history: HistoryPoint[],
      title: string
    ) => {
      ctx.save();
      drawRoundedRect(ctx, x, y, w, h, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const padL = 42;
      const padR = 16;
      const padT = 26;
      const padB = 22;
      const pw = Math.max(60, w - padL - padR);
      const ph = Math.max(40, h - padT - padB);
      const px = x + padL;
      const py = y + padT;

      // Title & legend
      ctx.fillStyle = '#020617';
      ctx.font = '800 12.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + 12, y + 13);

      // Legend inline top-right
      const legendItems = [
        { label: 'T_A', color: '#b91c1c' },
        { label: 'T_C', color: '#047857' },
        { label: 'T_B', color: '#0369a1' },
      ];
      let lx = x + w - 14;
      ctx.font = '800 11.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      for (let i = legendItems.length - 1; i >= 0; i--) {
        const item = legendItems[i];
        ctx.fillStyle = item.color;
        ctx.fillText(item.label, lx, y + 13);
        ctx.fillRect(lx - 38, y + 11.5, 11, 3.5);
        lx -= 50;
      }

      // Horizontal grid lines (0, 50, 100°C)
      const ticks = [0, 50, 100];
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      for (const tv of ticks) {
        const gy = py + ph - (tv / 100) * ph;
        ctx.beginPath();
        ctx.moveTo(px, gy);
        ctx.lineTo(px + pw, gy);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`${tv}°`, px - 6, gy + 1);
      }

      // Plot traces
      if (history.length >= 2) {
        const minT = history[0].time;
        const maxT = Math.max(minT + 6, history[history.length - 1].time);
        const span = maxT - minT;

        const drawTrace = (getter: (pt: HistoryPoint) => number, color: string) => {
          ctx.beginPath();
          for (let i = 0; i < history.length; i++) {
            const pt = history[i];
            const tx = px + ((pt.time - minT) / span) * pw;
            const ty = py + ph - (Math.max(0, Math.min(100, getter(pt))) / 100) * ph;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.2;
          ctx.lineJoin = 'round';
          ctx.stroke();
        };

        drawTrace((pt) => pt.tA, '#dc2626');
        drawTrace((pt) => pt.tB, '#0284c7');
        drawTrace((pt) => pt.tC, '#059669');
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const s = simRef.current;
      const dt = s.isPlaying ? rawDt * s.simSpeed : 0;

      // Animate direct contact glide
      const targetContact = s.directContact ? 1 : 0;
      s.contactAnim += (targetContact - s.contactAnim) * Math.min(1, rawDt * 8);

      // Physics: Fourier heat transfer with equal finite heat capacities (A, B, and C all change dynamically)
      const kCond = 0.24; // slow, smooth thermal conductance (~9–11 s to reach equilibrium)
      const capA = 1.0;
      const capB = 1.0;
      const capC = 1.0;
      const fluxDisplayGain = 3.5; // Watts per °C for readable telemetry & arrow scaling

      let qAC = 0;
      let qBC = 0;
      let qAB = 0;

      if (dt > 0) {
        s.simTime += dt;
        const tA0 = s.tA;
        const tB0 = s.tB;
        const tC0 = s.tC;

        if (!s.directContact) {
          let dQ_AC = 0;
          let dQ_BC = 0;

          if (s.wallAC === 'diathermal') {
            qAC = (tA0 - tC0) * fluxDisplayGain;
            dQ_AC = kCond * (tA0 - tC0) * dt;
          }
          if (s.wallBC === 'diathermal') {
            qBC = (tB0 - tC0) * fluxDisplayGain;
            dQ_BC = kCond * (tB0 - tC0) * dt;
          }

          s.tA = tA0 - dQ_AC / capA;
          s.tB = tB0 - dQ_BC / capB;
          s.tC = tC0 + (dQ_AC + dQ_BC) / capC;
        } else {
          // Direct contact between A and B across central diathermal bridge
          qAB = (tA0 - tB0) * fluxDisplayGain;
          const dQ_AB = kCond * (tA0 - tB0) * dt;
          s.tA = tA0 - dQ_AB / capA;
          s.tB = tB0 + dQ_AB / capB;
        }

        // Step-by-step Auto-Demo state machine (with dynamic finite-capacity System C)
        if (s.demoStage === 1 && Math.abs(s.tA - s.tC) < 0.35) {
          // Stage 1 complete: A and C reached shared intermediate equilibrium.
          // Open Wall B-C while keeping Wall A-C open so all three reach shared equilibrium via C.
          s.wallBC = 'diathermal';
          s.demoStage = 2;
          setWallBC('diathermal');
          setDemoStage(2);
        } else if (
          s.demoStage === 2 &&
          Math.abs(s.tA - s.tC) < 0.3 &&
          Math.abs(s.tB - s.tC) < 0.3
        ) {
          const tEq = (s.tA + s.tB + s.tC) / 3;
          s.tA = tEq;
          s.tB = tEq;
          s.tC = tEq;
          s.wallAC = 'adiabatic';
          s.wallBC = 'adiabatic';
          s.directContact = true;
          s.demoStage = 3;
          setWallAC('adiabatic');
          setWallBC('adiabatic');
          setDirectContact(true);
          setDemoStage(3);
        }

        if (s.simTime - s.lastHistoryPush > 0.12) {
          s.lastHistoryPush = s.simTime;
          s.history.push({ time: s.simTime, tA: s.tA, tB: s.tB, tC: s.tC });
          if (s.history.length > 320) s.history.shift();
        }
      }

      s.qAC = qAC;
      s.qBC = qBC;
      s.qAB = qAB;

      // Always animate particles even lightly when paused? When paused freeze them clearly
      if (s.isPlaying) {
        stepParticles(s.particlesA, s.tA, rawDt * s.simSpeed);
        stepParticles(s.particlesC, s.tC, rawDt * s.simSpeed);
        stepParticles(s.particlesB, s.tB, rawDt * s.simSpeed);
      }

      // Sync React telemetry at ~15 Hz
      if (now - s.lastUiSync > 65) {
        s.lastUiSync = now;
        setTelemetry({
          tA: s.tA,
          tB: s.tB,
          tC: s.tC,
          qAC: s.qAC,
          qBC: s.qBC,
          qAB: s.qAB,
          eqAC: Math.abs(s.tA - s.tC) < 0.4,
          eqBC: Math.abs(s.tB - s.tC) < 0.4,
          eqAB: Math.abs(s.tA - s.tB) < 0.4,
        });
      }

      // === RENDER CANVAS ===
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);

        // Soft scientific sky-slate backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#f0f9ff');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const padX = 20;
        const topY = 44;
        const plotH = Math.min(138, Math.max(108, height * 0.26));
        const appBottom = height - plotH - 22;
        const appH = Math.max(210, appBottom - topY);

        // Outer adiabatic laboratory enclosure frame
        drawRoundedRect(ctx, padX - 8, topY - 12, width - (padX - 8) * 2, appH + 24, 18);
        ctx.fillStyle = '#e0f2fe';
        ctx.fill();
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top canvas mode banner text
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 12px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          s.directContact ? t.mod1.chamberModeDirect : t.mod1.chamberModeNormal,
          padX,
          18
        );

        const innerW = width - padX * 2;
        const wallW = 20;
        const anim = s.contactAnim;

        // Calculate interpolated chamber geometry between 3-chamber mode (anim=0) and Direct Contact A<->B (anim=1)
        const chW3 = (innerW - wallW * 2) / 3;
        const chW2 = (innerW - wallW) / 2;
        const chW = chW3 + (chW2 - chW3) * anim;

        const chY = topY + 14;
        const chH = appH - 24;

        const xA = padX;
        const xB3 = padX + chW3 * 2 + wallW * 2;
        const xB2 = padX + chW2 + wallW;
        const xB = xB3 + (xB2 - xB3) * anim;

        // Draw System C (fades & lifts smoothly out when entering Direct Contact)
        if (anim < 0.96) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - anim * 1.45);
          const xC = padX + chW3 + wallW;
          const yC = chY - anim * 36;
          drawChamber(
            ctx,
            xC,
            yC,
            chW3,
            chH,
            s.tC,
            'System C',
            t.mod1.sysCLabel,
            s.particlesC,
            true
          );
          ctx.restore();
        }

        // Draw System A & System B
        drawChamber(
          ctx,
          xA,
          chY,
          chW,
          chH,
          s.tA,
          'System A',
          lang === 'bn' ? 'বাম প্রকোষ্ঠ' : 'Left Chamber',
          s.particlesA,
          false
        );

        drawChamber(
          ctx,
          xB,
          chY,
          chW,
          chH,
          s.tB,
          'System B',
          lang === 'bn' ? 'ডান প্রকোষ্ঠ' : 'Right Chamber',
          s.particlesB,
          false
        );

        const timeSec = now / 1000;

        if (anim < 0.5) {
          // Draw Wall 1 (A-C) and Wall 2 (B-C)
          const w1x = padX + chW3;
          const w2x = padX + chW3 * 2 + wallW;
          s.wallRects.ac = { x: w1x, y: chY, w: wallW, h: chH };
          s.wallRects.bc = { x: w2x, y: chY, w: wallW, h: chH };

          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - anim * 2);
          drawPartitionWall(
            ctx,
            w1x,
            chY,
            wallW,
            chH,
            s.wallAC,
            s.qAC,
            timeSec,
            s.wallAC === 'diathermal'
              ? lang === 'bn'
                ? 'সুপরিবাহী'
                : 'Conductor'
              : lang === 'bn'
              ? 'অন্তরক'
              : 'Insulator'
          );
          drawPartitionWall(
            ctx,
            w2x,
            chY,
            wallW,
            chH,
            s.wallBC,
            -s.qBC, // qBC positive means B->C (Right to Left), so Left->Right is -qBC
            timeSec,
            s.wallBC === 'diathermal'
              ? lang === 'bn'
                ? 'সুপরিবাহী'
                : 'Conductor'
              : lang === 'bn'
              ? 'অন্তরক'
              : 'Insulator'
          );
          ctx.restore();
        } else {
          // Direct Contact bridge between A and B
          const bridgeX = padX + chW;
          const isEqAB = Math.abs(s.tA - s.tB) < 0.4;

          ctx.save();
          ctx.globalAlpha = Math.min(1, (anim - 0.5) * 2);
          drawPartitionWall(
            ctx,
            bridgeX,
            chY,
            wallW,
            chH,
            'diathermal',
            s.qAB,
            timeSec,
            'A ↔ B'
          );

          // Equilibrium confirmation badge or active transfer banner
          const bannerW = Math.min(innerW - 24, 380);
          const bannerH = 54;
          const bx = width / 2 - bannerW / 2;
          const by = chY + chH / 2 - bannerH / 2;

          drawRoundedRect(ctx, bx, by, bannerW, bannerH, 14);
          if (isEqAB) {
            ctx.fillStyle = 'rgba(236, 253, 245, 0.96)';
            ctx.fill();
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.fillStyle = '#065f46';
            ctx.font = '800 13.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`✓ ${t.mod1.equilibriumAchieved}`, width / 2, by + 19);

            ctx.fillStyle = '#047857';
            ctx.font = '600 11.5px "JetBrains Mono", "Hind Siliguri", monospace';
            ctx.fillText(t.mod1.zeroNetHeat, width / 2, by + 38);
          } else {
            ctx.fillStyle = 'rgba(255, 251, 235, 0.95)';
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#92400e';
            ctx.font = '700 12.5px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.mod1.activeHeatFlow, width / 2, by + 19);

            const flowDir = s.tA > s.tB ? 'A → B' : 'B → A';
            ctx.font = '700 11.5px "JetBrains Mono", monospace';
            ctx.fillText(
              `${flowDir}   |   Q̇_AB = ${Math.abs(s.qAB).toFixed(1)} W`,
              width / 2,
              by + 38
            );
          }
          ctx.restore();
        }

        // Real-time Temperature History Graph at bottom of canvas
        drawHistoryPlot(
          ctx,
          padX - 8,
          height - plotH - 10,
          width - (padX - 8) * 2,
          plotH,
          s.history,
          t.mod1.tempHistory
        );

        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [lang, t]);

  const formatFluxDirection = (flux: number, leftName: string, rightName: string) => {
    if (Math.abs(flux) < 0.8) return t.mod1.directionNone;
    return flux > 0 ? `${leftName} → ${rightName}` : `${rightName} → ${leftName}`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* LEFT CONTROL DOCK (340px fixed on desktop) */}
      <aside className="w-full lg:w-[340px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        <div>
          <h2 className="text-sm font-extrabold text-slate-950">{t.mod1.initialTemps}</h2>
          <p className="text-xs font-medium text-slate-800 mt-0.5">{t.mod1.subtitle}</p>
        </div>

        <div className="space-y-4">
          <ProgressiveSlider
            id="slider-ta"
            label={t.mod1.sysA}
            value={telemetry.tA}
            min={0}
            max={100}
            step={1}
            unit="°C"
            precision={1}
            accentIndicator={tempToColor(telemetry.tA)}
            onChange={(v) => updateChamberTemp('A', v)}
          />
          <ProgressiveSlider
            id="slider-tc"
            label={t.mod1.sysC}
            value={telemetry.tC}
            min={0}
            max={100}
            step={1}
            unit="°C"
            precision={1}
            accentIndicator={tempToColor(telemetry.tC)}
            onChange={(v) => updateChamberTemp('C', v)}
          />
          <ProgressiveSlider
            id="slider-tb"
            label={t.mod1.sysB}
            value={telemetry.tB}
            min={0}
            max={100}
            step={1}
            unit="°C"
            precision={1}
            accentIndicator={tempToColor(telemetry.tB)}
            onChange={(v) => updateChamberTemp('B', v)}
          />
        </div>

        <div className="border-t border-sky-100 pt-3.5 space-y-3">
          <h3 className="text-sm font-bold text-slate-950">{t.mod1.wallControls}</h3>

          {/* Wall 1 Toggle */}
          <button
            type="button"
            disabled={directContact}
            onClick={() => {
              setDemoStage(0);
              setWallAC((w) => (w === 'adiabatic' ? 'diathermal' : 'adiabatic'));
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              wallAC === 'diathermal'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {wallAC === 'diathermal' ? (
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Shield className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-slate-950 truncate">{t.mod1.wallAC}</div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {wallAC === 'diathermal' ? t.mod1.diathermalDesc : t.mod1.adiabaticDesc}
                </div>
              </div>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md shrink-0 ${
                wallAC === 'diathermal'
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-slate-200 text-slate-900'
              }`}
            >
              {wallAC === 'diathermal' ? t.mod1.diathermal : t.mod1.adiabatic}
            </span>
          </button>

          {/* Wall 2 Toggle */}
          <button
            type="button"
            disabled={directContact}
            onClick={() => {
              setDemoStage(0);
              setWallBC((w) => (w === 'adiabatic' ? 'diathermal' : 'adiabatic'));
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              wallBC === 'diathermal'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {wallBC === 'diathermal' ? (
                <Flame className="w-4 h-4 text-amber-700 shrink-0" />
              ) : (
                <Shield className="w-4 h-4 text-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-slate-950 truncate">{t.mod1.wallBC}</div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {wallBC === 'diathermal' ? t.mod1.diathermalDesc : t.mod1.adiabaticDesc}
                </div>
              </div>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md shrink-0 ${
                wallBC === 'diathermal'
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-slate-200 text-slate-900'
              }`}
            >
              {wallBC === 'diathermal' ? t.mod1.diathermal : t.mod1.adiabatic}
            </span>
          </button>

          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{t.mod1.clickWallTip}</p>
        </div>

        {/* Guided Actions */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2.5">
          <button
            type="button"
            onClick={startAutoDemo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{demoStage > 0 && demoStage < 3 ? t.mod1.autoDemoRunning : t.mod1.autoDemo}</span>
          </button>

          <button
            type="button"
            onClick={toggleDirectContact}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              directContact
                ? 'bg-sky-700 border-sky-700 text-white hover:bg-sky-800'
                : 'bg-sky-50 border-sky-300 text-sky-950 hover:bg-sky-100'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span>{directContact ? t.mod1.exitContact : t.mod1.testContact}</span>
          </button>

          {/* Playback & Speed */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? t.common.pause : t.common.play}</span>
            </button>
            <div className="flex items-center bg-sky-50 border border-sky-200 rounded-xl p-0.5">
              {([1, 2] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSimSpeed(sp)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                    simSpeed === sp
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER CANVAS STAGE */}
      <section className="flex-1 min-w-0 bg-white border border-sky-200 shadow-sm rounded-2xl p-2 flex flex-col min-h-[500px] relative overflow-hidden">
        {demoStage > 0 && (
          <div className="px-3 py-2 mb-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2">
            <span>
              {demoStage === 1
                ? t.mod1.demoStep1
                : demoStage === 2
                ? t.mod1.demoStep2
                : t.mod1.demoStep3}
            </span>
            <span className="font-mono-num text-[11px] text-emerald-700 shrink-0">
              {demoStage}/3
            </span>
          </div>
        )}
        <div
          ref={stageContainerRef}
          className="flex-1 w-full h-full min-h-[460px] rounded-xl overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerLeave={() => setHoverWall(null)}
            onClick={handleCanvasClick}
            className={`block w-full h-full ${hoverWall ? 'cursor-pointer' : 'cursor-default'}`}
          />
        </div>
      </section>

      {/* RIGHT TELEMETRY PANEL (330px fixed on desktop) */}
      <aside className="w-full lg:w-[330px] shrink-0 bg-white/95 backdrop-blur-sm border border-sky-200 shadow-sm rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto lab-scroll">
        <div>
          <h2 className="text-sm font-bold text-slate-950">{t.common.telemetryTitle}</h2>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { id: 'A', val: telemetry.tA, label: 'T_A' },
              { id: 'C', val: telemetry.tC, label: 'T_C' },
              { id: 'B', val: telemetry.tB, label: 'T_B' },
            ].map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-sky-200 bg-sky-50/70 px-2.5 py-2 text-center"
              >
                <div className="text-xs font-mono-num font-bold text-slate-800">
                  {g.label}
                </div>
                <div
                  className="text-lg font-mono-num font-extrabold mt-0.5"
                  style={{ color: tempToDarkTextColor(g.val) }}
                >
                  {g.val.toFixed(1)}°
                </div>
                <div className="text-xs font-mono-num font-semibold text-slate-700">
                  {(g.val + 273.15).toFixed(1)} K
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heat Flux Monitor */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-700" />
            <h3 className="text-[13px] font-extrabold text-slate-950">{t.mod1.heatFluxTitle}</h3>
          </div>

          {!directContact ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="font-bold text-slate-900">{t.mod1.fluxAC}</span>
                <div className="text-right">
                  <div className="font-mono-num font-extrabold text-slate-950">
                    {Math.abs(telemetry.qAC).toFixed(1)} W
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {formatFluxDirection(telemetry.qAC, 'A', 'C')}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="font-bold text-slate-900">{t.mod1.fluxBC}</span>
                <div className="text-right">
                  <div className="font-mono-num font-extrabold text-slate-950">
                    {Math.abs(telemetry.qBC).toFixed(1)} W
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {formatFluxDirection(telemetry.qBC, 'B', 'C')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-slate-900">{t.mod1.fluxAB}</span>
              <div className="text-right">
                <div className="font-mono-num font-extrabold text-base text-slate-950">
                  {Math.abs(telemetry.qAB).toFixed(1)} W
                </div>
                <div className="text-xs text-emerald-900 font-bold">
                  {formatFluxDirection(telemetry.qAB, 'A', 'B')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zeroth Law Verification Checklist */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2.5">
          <h3 className="text-[13px] font-extrabold text-slate-950">{t.mod1.zerothLawTitle}</h3>
          <p className="text-xs font-medium text-slate-800 leading-relaxed">{t.mod1.zerothLawStatement}</p>

          <div className="space-y-2 pt-1">
            {[
              { label: t.mod1.conditionAC, ok: telemetry.eqAC, diff: Math.abs(telemetry.tA - telemetry.tC) },
              { label: t.mod1.conditionBC, ok: telemetry.eqBC, diff: Math.abs(telemetry.tB - telemetry.tC) },
              { label: t.mod1.conclusionAB, ok: telemetry.eqAB, diff: Math.abs(telemetry.tA - telemetry.tB) },
            ].map((row, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs ${
                  row.ok
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {row.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <CircleDashed className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="font-bold truncate">{row.label}</span>
                </div>
                <span className="font-mono-num text-xs font-bold shrink-0">
                  Δ={row.diff.toFixed(1)}°C
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formula Substitution */}
        <div className="border-t border-sky-100 pt-3.5 space-y-2">
          <h3 className="text-[13px] font-extrabold text-slate-950">{t.common.formulaCard}</h3>
          <div className="rounded-xl bg-sky-50 border border-sky-300 p-3 font-mono-num text-xs font-semibold space-y-1.5 text-slate-950">
            <div className="text-xs text-slate-800 font-sans font-bold">
              T_A = T_C &nbsp;∧&nbsp; T_B = T_C &nbsp;⟹&nbsp; T_A = T_B
            </div>
            <div>
              T_A − T_C = {(telemetry.tA - telemetry.tC).toFixed(2)} °C
            </div>
            <div>
              T_B − T_C = {(telemetry.tB - telemetry.tC).toFixed(2)} °C
            </div>
            <div className="pt-1 border-t border-sky-300 font-extrabold text-emerald-900">
              T_A − T_B = {(telemetry.tA - telemetry.tB).toFixed(2)} °C
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

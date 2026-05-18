"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  life: number; maxLife: number;
  color: string;
}

export default function JungleScene({ stage = "egg" }: { stage: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    function spawnParticle() {
      const w = canvas!.width;
      const h = canvas!.height;
      const colors = ["#FFFFFF", "#E8F8A0", "#C8E870", "#FFFDE0"];
      particles.push({
        x: w * 0.15 + Math.random() * w * 0.7,
        y: h * 0.35 + Math.random() * h * 0.45,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(Math.random() * 0.45 + 0.08),
        size: Math.random() * 2.2 + 0.4,
        alpha: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 200 + Math.random() * 280,
      });
    }

    for (let i = 0; i < 18; i++) spawnParticle();

    let frame = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);
      frame++;
      if (frame % 10 === 0 && particles.length < 28) spawnParticle();

      // Soft radial light from center-top (god rays feel)
      const cx = w * 0.5;
      const grad = ctx!.createRadialGradient(cx, -40, 0, cx, h * 0.35, h * 0.85);
      grad.addColorStop(0,   "rgba(255, 248, 180, 0.13)");
      grad.addColorStop(0.4, "rgba(255, 244, 160, 0.06)");
      grad.addColorStop(1,   "rgba(255, 244, 160, 0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin(p.life * 0.018 + i) * 0.28;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        p.alpha = t < 0.12 ? t / 0.12 : t > 0.78 ? (1 - t) / 0.22 : 1;

        ctx!.save();
        ctx!.globalAlpha = p.alpha * 0.65;
        ctx!.fillStyle = p.color;
        ctx!.shadowBlur = 4;
        ctx!.shadowColor = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

        if (p.life >= p.maxLife) particles.splice(i, 1);
      }
    }

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Biome-tint overlay color — will evolve with stage
  const tints: Record<string, string> = {
    egg:      "rgba(40, 120, 40, 0)",
    cracking: "rgba(60, 130, 50, 0)",
    hatching: "rgba(80, 150, 60, 0)",
    emerging: "rgba(20, 100, 80, 0)",
    self:     "rgba(20,  80, 80, 0)",
  };
  void tints[stage];

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      {/* ── SKY ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 5%, #EAF8E0 0%, #C8EAB8 25%, #A0D098 50%, #68A860 75%, #3A7840 100%)",
        }}
      />

      {/* ── MAIN SVG SCENE ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="#FFFFF0" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#F8F4C0" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#F0EAA0" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="clearingGrad" cx="48%" cy="38%" r="58%">
            <stop offset="0%"   stopColor="#C8EE70" />
            <stop offset="40%"  stopColor="#90CC48" />
            <stop offset="100%" stopColor="#58A028" />
          </radialGradient>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4A9830" />
            <stop offset="100%" stopColor="#1E5018" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#90D0D8" />
            <stop offset="100%" stopColor="#58A8B8" />
          </linearGradient>
          <filter id="leafBlur">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="deepBlur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* ── WARM CENTER GLOW ── */}
        <ellipse cx="720" cy="460" rx="480" ry="340" fill="url(#centerGlow)" />

        {/* ── DISTANT HAZY TREES (far back, blurred) ── */}
        <g filter="url(#deepBlur)" opacity="0.65">
          <rect x="580" y="180" width="9"  height="320" fill="#8ABE80" rx="4" />
          <ellipse cx="584" cy="165" rx="38" ry="50" fill="#9AC888" />
          <ellipse cx="565" cy="198" rx="24" ry="30" fill="#9AC888" />

          <rect x="650" y="148" width="11" height="360" fill="#78B070" rx="4" />
          <ellipse cx="655" cy="130" rx="48" ry="62" fill="#88C078" />
          <ellipse cx="628" cy="168" rx="30" ry="38" fill="#88C078" />
          <ellipse cx="682" cy="155" rx="34" ry="42" fill="#88C078" />

          <rect x="740" y="128" width="13" height="380" fill="#68A060" rx="4" />
          <ellipse cx="746" cy="108" rx="56" ry="72" fill="#78B070" />
          <ellipse cx="718" cy="152" rx="36" ry="46" fill="#78B070" />
          <ellipse cx="778" cy="140" rx="38" ry="48" fill="#78B070" />
          <ellipse cx="746" cy="175" rx="44" ry="55" fill="#88C078" />

          <rect x="835" y="142" width="10" height="355" fill="#78B070" rx="4" />
          <ellipse cx="840" cy="126" rx="42" ry="55" fill="#88C078" />
          <ellipse cx="818" cy="162" rx="26" ry="33" fill="#88C078" />

          <rect x="900" y="168" width="9"  height="335" fill="#8ABE80" rx="4" />
          <ellipse cx="904" cy="153" rx="36" ry="46" fill="#9AC888" />
        </g>

        {/* ── RIVER ── */}
        <ellipse cx="720" cy="490" rx="205" ry="42" fill="url(#waterGrad)" opacity="0.88" />
        <ellipse cx="720" cy="490" rx="205" ry="42" fill="none" stroke="#A0D8E0" strokeWidth="1.5" opacity="0.4" />
        {/* Water shimmer highlights */}
        <ellipse cx="685" cy="481" rx="65"  ry="11" fill="white" opacity="0.22" />
        <ellipse cx="750" cy="494" rx="30"  ry="6"  fill="white" opacity="0.15" />
        {/* Rocks */}
        <ellipse cx="542" cy="497" rx="24" ry="13" fill="#9A8A68" />
        <ellipse cx="530" cy="491" rx="17" ry="9"  fill="#B09A78" opacity="0.85" />
        <ellipse cx="900" cy="500" rx="20" ry="11" fill="#9A8A68" />
        <ellipse cx="916" cy="494" rx="14" ry="8"  fill="#B09A78" opacity="0.85" />

        {/* ── LEFT MAIN TREE ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-slow 8s ease-in-out infinite",
          }}
        >
          {/* Trunk */}
          <path d="M 72,900 C 75,700 80,560 85,450 C 90,340 88,260 82,200 C 85,270 92,360 95,455 C 98,550 102,700 105,900 Z" fill="#7A5A38" />
          {/* Root buttresses */}
          <path d="M 72,900 C 50,820 38,780 45,750 C 55,730 70,750 75,820 Z" fill="#6A4A28" />
          <path d="M 105,900 C 128,820 138,778 130,748 C 120,726 108,748 106,820 Z" fill="#6A4A28" />
          {/* Canopy — layered organic blobs */}
          <path d="M 88,440 C 20,415 -45,355 -15,272 C 15,190 72,162 108,185 C 144,208 152,255 145,295 C 172,262 198,252 208,288 C 218,324 194,368 158,392 C 172,418 160,440 128,450 Z" fill="#226A28" />
          <path d="M 88,440 C 38,428 -5,395 5,355 C 22,312 62,298 90,320 C 118,342 125,382 112,425 Z" fill="#2E8030" />
          <path d="M 78,390 C 28,368 -8,325 14,278 C 36,238 74,230 100,252 C 126,274 122,325 105,362 Z" fill="#3A9038" />
          {/* Highlight leaves */}
          <path d="M 55,310 C 30,290 18,265 28,245 C 38,228 56,232 65,252 C 72,270 68,295 55,310 Z" fill="#50A845" opacity="0.7" />
          <path d="M 110,250 C 88,235 80,215 90,200 C 100,186 115,192 120,208 C 124,222 120,242 110,250 Z" fill="#50A845" opacity="0.6" />
        </g>

        {/* ── LEFT SECONDARY TREE ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-slow 11s ease-in-out infinite",
            animationDelay: "1.8s",
          }}
        >
          <path d="M 245,900 C 248,680 252,540 255,430 C 258,530 262,672 265,900 Z" fill="#8A6A40" />
          <path d="M 255,418 C 195,398 152,358 168,296 C 184,238 228,215 260,238 C 292,261 300,305 278,348 C 302,326 326,330 332,362 C 338,394 312,422 280,432 Z" fill="#2C7A30" />
          <path d="M 250,420 C 208,405 180,375 195,338 C 210,302 242,292 264,310 C 284,328 285,366 268,396 Z" fill="#3A9038" />
          <path d="M 240,365 C 205,348 186,318 200,290 C 214,265 242,262 258,280 C 272,298 268,335 252,358 Z" fill="#4AA042" opacity="0.8" />
        </g>

        {/* ── RIGHT MAIN TREE ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-slow 9s ease-in-out infinite",
            animationDelay: "2.2s",
          }}
        >
          <path d="M 1335,900 C 1338,700 1342,560 1348,450 C 1354,340 1352,260 1358,200 C 1352,270 1348,360 1345,455 C 1342,550 1338,700 1336,900 Z" fill="#7A5A38" />
          <path d="M 1335,900 C 1312,820 1302,780 1310,750 C 1320,730 1334,750 1335,820 Z" fill="#6A4A28" />
          <path d="M 1368,900 C 1390,820 1400,778 1392,748 C 1382,726 1370,748 1368,820 Z" fill="#6A4A28" />
          <path d="M 1352,440 C 1420,415 1485,355 1455,272 C 1425,190 1368,162 1332,185 C 1296,208 1288,255 1295,295 C 1268,262 1242,252 1232,288 C 1222,324 1246,368 1282,392 C 1268,418 1280,440 1312,450 Z" fill="#226A28" />
          <path d="M 1352,440 C 1402,428 1445,395 1435,355 C 1418,312 1378,298 1350,320 C 1322,342 1315,382 1328,425 Z" fill="#2E8030" />
          <path d="M 1362,390 C 1412,368 1448,325 1426,278 C 1404,238 1366,230 1340,252 C 1314,274 1318,325 1335,362 Z" fill="#3A9038" />
          <path d="M 1385,310 C 1410,290 1422,265 1412,245 C 1402,228 1384,232 1375,252 C 1368,270 1372,295 1385,310 Z" fill="#50A845" opacity="0.7" />
          <path d="M 1330,250 C 1352,235 1360,215 1350,200 C 1340,186 1325,192 1320,208 C 1316,222 1320,242 1330,250 Z" fill="#50A845" opacity="0.6" />
        </g>

        {/* ── RIGHT SECONDARY TREE ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-slow 12s ease-in-out infinite",
            animationDelay: "3.5s",
          }}
        >
          <path d="M 1175,900 C 1178,680 1182,540 1185,430 C 1188,530 1192,672 1195,900 Z" fill="#8A6A40" />
          <path d="M 1185,418 C 1245,398 1288,358 1272,296 C 1256,238 1212,215 1180,238 C 1148,261 1140,305 1162,348 C 1138,326 1114,330 1108,362 C 1102,394 1128,422 1160,432 Z" fill="#2C7A30" />
          <path d="M 1190,420 C 1232,405 1260,375 1245,338 C 1230,302 1198,292 1176,310 C 1156,328 1155,366 1172,396 Z" fill="#3A9038" />
          <path d="M 1200,365 C 1235,348 1254,318 1240,290 C 1226,265 1198,262 1182,280 C 1168,298 1172,335 1188,358 Z" fill="#4AA042" opacity="0.8" />
        </g>

        {/* ── LEFT HANGING VINES ── */}
        <g opacity="0.9">
          <path
            d="M 148,0 C 142,70 155,145 143,220 C 131,295 146,358 138,418"
            stroke="#2A5C1A" strokeWidth="3" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 7s ease-in-out infinite" }}
          />
          <path
            d="M 198,0 C 192,58 206,122 194,195 C 182,268 196,332 185,390"
            stroke="#336A22" strokeWidth="2.5" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 10s ease-in-out infinite", animationDelay: "1.2s" }}
          />
          <path
            d="M 115,0 C 110,90 124,170 112,248"
            stroke="#2A5C1A" strokeWidth="2" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 13s ease-in-out infinite", animationDelay: "2.5s" }}
          />
          {/* Vine leaf clusters */}
          <ellipse cx="143" cy="225" rx="13" ry="9" fill="#3A7828" transform="rotate(-25 143 225)" />
          <ellipse cx="138" cy="330" rx="11" ry="7" fill="#3A7828" transform="rotate(18 138 330)" />
          <ellipse cx="185" cy="198" rx="12" ry="8" fill="#468030" transform="rotate(-12 185 198)" />
          <ellipse cx="194" cy="310" rx="10" ry="6" fill="#468030" transform="rotate(22 194 310)" />
        </g>

        {/* ── RIGHT HANGING VINES ── */}
        <g opacity="0.9">
          <path
            d="M 1292,0 C 1298,70 1285,145 1297,220 C 1309,295 1294,358 1302,418"
            stroke="#2A5C1A" strokeWidth="3" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 7s ease-in-out infinite", animationDelay: "0.6s" }}
          />
          <path
            d="M 1242,0 C 1248,58 1234,122 1246,195 C 1258,268 1244,332 1255,390"
            stroke="#336A22" strokeWidth="2.5" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 10s ease-in-out infinite", animationDelay: "1.8s" }}
          />
          <path
            d="M 1325,0 C 1330,90 1316,170 1328,248"
            stroke="#2A5C1A" strokeWidth="2" fill="none" strokeLinecap="round"
            style={{ animation: "sway-slow 13s ease-in-out infinite", animationDelay: "3s" }}
          />
          <ellipse cx="1297" cy="225" rx="13" ry="9" fill="#3A7828" transform="rotate(25 1297 225)" />
          <ellipse cx="1302" cy="330" rx="11" ry="7" fill="#3A7828" transform="rotate(-18 1302 330)" />
          <ellipse cx="1255" cy="198" rx="12" ry="8" fill="#468030" transform="rotate(12 1255 198)" />
          <ellipse cx="1246" cy="310" rx="10" ry="6" fill="#468030" transform="rotate(-22 1246 310)" />
        </g>

        {/* ── GROUND ── */}
        <path
          d="M 0,760 Q 180,740 360,748 Q 540,756 720,750 Q 900,744 1080,752 Q 1260,760 1440,748 L 1440,900 L 0,900 Z"
          fill="url(#groundGrad)"
        />
        {/* Ground surface wave */}
        <path
          d="M 0,762 Q 200,748 400,754 Q 600,760 720,752 Q 840,744 1040,756 Q 1240,768 1440,750"
          stroke="#5AB830" strokeWidth="2.5" fill="none" opacity="0.6"
        />

        {/* ── GRASS CLEARING ── */}
        <ellipse cx="720" cy="768" rx="365" ry="82" fill="url(#clearingGrad)" />
        <ellipse cx="710" cy="756" rx="195" ry="38" fill="#CCEE78" opacity="0.38" />
        {/* Nest / egg resting spot */}
        <ellipse cx="720" cy="785" rx="62"  ry="16" fill="#9AD850" opacity="0.55" />
        <ellipse cx="720" cy="788" rx="42"  ry="10" fill="#B8EE60" opacity="0.45" />
        {/* Grass blades in clearing */}
        {[608,642,672,700,728,758,786,816,848].map((x, i) => (
          <g key={i}>
            <path d={`M ${x},790 C ${x - 5},775 ${x - 2},764 ${x},758`} stroke="#7AC840" strokeWidth="2" fill="none" />
            <path d={`M ${x + 3},790 C ${x + 8},773 ${x + 9},762 ${x + 5},756`} stroke="#90D850" strokeWidth="2" fill="none" />
          </g>
        ))}

        {/* ── FOREGROUND LEFT — BIG TROPICAL LEAVES ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-fast 3.8s ease-in-out infinite",
          }}
        >
          {/* Leaf A — large, pointing upper-right */}
          <path d="M -20,900 C -10,768 45,660 22,548 C -1,436 52,370 98,392 C 144,414 152,490 128,610 C 104,730 68,826 38,900 Z" fill="#2E8828" />
          <path d="M -20,900 C 45,840 70,748 65,648 C 60,548 75,478 98,392" stroke="#1E6C1C" strokeWidth="2.5" fill="none" />
          {/* Leaf surface detail */}
          <path d="M 55,540 C 35,520 20,488 30,462 C 40,448 58,452 62,470 Z" fill="#3A9832" opacity="0.6" />

          {/* Leaf B */}
          <path d="M 42,900 C 65,792 138,705 115,595 C 92,485 138,418 182,436 C 218,454 222,530 194,648 C 166,766 122,848 85,900 Z" fill="#3A9832" />
          <path d="M 42,900 C 95,832 122,738 120,638 C 118,538 140,462 182,436" stroke="#2A8222" strokeWidth="2" fill="none" />

          {/* Leaf C — medium, lower */}
          <path d="M 148,900 C 168,838 202,782 196,718 C 190,654 215,610 248,622 C 275,634 272,688 252,758 C 232,828 195,872 162,900 Z" fill="#4AAA3A" />
          <path d="M 148,900 C 182,832 202,775 204,712 C 206,649 224,608 248,622" stroke="#32921E" strokeWidth="1.8" fill="none" />

          {/* Leaf D — extra large ground-cover leaf left */}
          <path d="M -40,900 C -15,852 38,828 80,808 C 45,830 -5,858 -40,900 Z" fill="#268020" />
          <path d="M 65,900 C 108,862 162,845 198,828 C 162,848 110,868 65,900 Z" fill="#308828" />
        </g>

        {/* ── FOREGROUND RIGHT — BIG TROPICAL LEAVES ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: "sway-fast 4.2s ease-in-out infinite",
            animationDelay: "1.4s",
          }}
        >
          {/* Leaf A mirror */}
          <path d="M 1460,900 C 1450,768 1395,660 1418,548 C 1441,436 1388,370 1342,392 C 1296,414 1288,490 1312,610 C 1336,730 1372,826 1402,900 Z" fill="#2E8828" />
          <path d="M 1460,900 C 1395,840 1370,748 1375,648 C 1380,548 1365,478 1342,392" stroke="#1E6C1C" strokeWidth="2.5" fill="none" />
          <path d="M 1385,540 C 1405,520 1420,488 1410,462 C 1400,448 1382,452 1378,470 Z" fill="#3A9832" opacity="0.6" />

          {/* Leaf B mirror */}
          <path d="M 1398,900 C 1375,792 1302,705 1325,595 C 1348,485 1302,418 1258,436 C 1222,454 1218,530 1246,648 C 1274,766 1318,848 1355,900 Z" fill="#3A9832" />
          <path d="M 1398,900 C 1345,832 1318,738 1320,638 C 1322,538 1300,462 1258,436" stroke="#2A8222" strokeWidth="2" fill="none" />

          {/* Leaf C mirror */}
          <path d="M 1292,900 C 1272,838 1238,782 1244,718 C 1250,654 1225,610 1192,622 C 1165,634 1168,688 1188,758 C 1208,828 1245,872 1278,900 Z" fill="#4AAA3A" />
          <path d="M 1292,900 C 1258,832 1238,775 1236,712 C 1234,649 1216,608 1192,622" stroke="#32921E" strokeWidth="1.8" fill="none" />

          {/* Ground-cover right */}
          <path d="M 1480,900 C 1455,852 1402,828 1360,808 C 1395,830 1445,858 1480,900 Z" fill="#268020" />
          <path d="M 1375,900 C 1332,862 1278,845 1242,828 C 1278,848 1330,868 1375,900 Z" fill="#308828" />
        </g>

        {/* ── INNER SIDE PLANTS ── */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "bottom center",
            animation: "sway-medium 4.8s ease-in-out infinite",
            animationDelay: "0.7s",
          }}
        >
          <path d="M 272,900 C 250,858 240,822 228,795 C 240,824 252,862 272,900 Z" fill="#2E8828" />
          <path d="M 295,900 C 282,852 288,815 300,788 C 290,817 285,856 295,900 Z" fill="#3A9832" />
          <path d="M 318,900 C 318,850 328,812 345,784 C 330,814 322,854 318,900 Z" fill="#2E8828" />
        </g>
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "bottom center",
            animation: "sway-medium 5.2s ease-in-out infinite",
            animationDelay: "2.2s",
          }}
        >
          <path d="M 1168,900 C 1190,858 1200,822 1212,795 C 1200,824 1188,862 1168,900 Z" fill="#2E8828" />
          <path d="M 1145,900 C 1158,852 1152,815 1140,788 C 1150,817 1155,856 1145,900 Z" fill="#3A9832" />
          <path d="M 1122,900 C 1122,850 1112,812 1095,784 C 1110,814 1118,854 1122,900 Z" fill="#2E8828" />
        </g>

        {/* ── BIRD ── */}
        <g
          transform="translate(752, 112)"
          opacity="0.55"
          style={{ animation: "sway-slow 18s ease-in-out infinite" }}
        >
          <path d="M 0,0 C -18,-10 -36,-5 -42,2 C -26,-1 -14,0 0,0 Z" fill="#1A4818" />
          <path d="M 0,0 C 18,-10 36,-5 42,2 C 26,-1 14,0 0,0 Z" fill="#1A4818" />
        </g>

        {/* ── CANOPY FRAME TOP — darkens upper corners ── */}
        <path
          d="M 0,0 L 0,380 C 40,340 80,290 60,220 C 40,150 0,100 0,0 Z"
          fill="#1A5020" opacity="0.55"
        />
        <path
          d="M 1440,0 L 1440,380 C 1400,340 1360,290 1380,220 C 1400,150 1440,100 1440,0 Z"
          fill="#1A5020" opacity="0.55"
        />
        <path
          d="M 0,0 C 120,20 280,60 380,30 C 460,8 520,0 600,10 L 600,0 Z"
          fill="#1E5822" opacity="0.45"
        />
        <path
          d="M 1440,0 C 1320,20 1160,60 1060,30 C 980,8 920,0 840,10 L 840,0 Z"
          fill="#1E5822" opacity="0.45"
        />
      </svg>

      {/* ── CANVAS (particles + god rays) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

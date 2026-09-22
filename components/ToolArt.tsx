"use client";

import { useId, type ReactElement } from "react";
import type { ToolGroupSlug, ToolSlug } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SceneProps = { uid: string };

function PdfDoc({
  x,
  y,
  width = 78,
  height = 96,
  rotate = 0,
  label = "PDF",
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
  label?: string;
}) {
  const fold = Math.max(6, Math.round(width * 0.26));
  const radius = Math.max(4, Math.round(width * 0.12));
  const compact = width < 50;
  const showLabel = Boolean(label) && !compact;
  const badgeHeight = showLabel ? 24 : compact ? Math.max(8, height * 0.18) : 0;
  const fontSize = Math.max(8, Math.min(13, width * 0.17));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${width / 2} ${height / 2})`}>
      <rect x="3" y="6" width={width} height={height} rx={radius} fill="#7a0d12" opacity="0.28" />
      <path
        d={`M${radius} 0h${width - fold - radius}l${fold} ${fold}v${height - fold - radius}a${radius} ${radius} 0 0 1-${radius} ${radius}H${radius}A${radius} ${radius} 0 0 1 0 ${height - radius}V${radius}A${radius} ${radius} 0 0 1 ${radius} 0z`}
        fill="#E1251B"
      />
      <path d={`M${width - fold} 0v${fold}h${fold}z`} fill="#FF8A82" />
      <path d={`M${width - fold} 0v${fold}h${fold}`} fill="none" stroke="#B31217" strokeWidth="1.2" />
      {compact ? null : (
        <>
          <rect x={width * 0.14} y={height * 0.22} width={width * 0.5} height="6" rx="3" fill="#fff" opacity="0.55" />
          <rect x={width * 0.14} y={height * 0.32} width={width * 0.38} height="5" rx="2.5" fill="#fff" opacity="0.32" />
        </>
      )}
      {showLabel || compact ? (
        <rect
          x={width * 0.12}
          y={height * (compact ? 0.58 : 0.52)}
          width={width * 0.76}
          height={badgeHeight}
          rx={compact ? 3 : 7}
          fill="#fff"
        />
      ) : null}
      {showLabel ? (
        <text
          x={width / 2}
          y={height * 0.52 + 17}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="800"
          fill="#E1251B"
          fontFamily="Outfit, ui-sans-serif, system-ui"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Photo({
  x,
  y,
  width = 92,
  height = 72,
  rotate = 0,
  sky = "#7ec8ea",
  ground = "#3fa36a",
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
  sky?: string;
  ground?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${width / 2} ${height / 2})`}>
      <rect x="4" y="6" width={width} height={height} rx="12" fill="#0f2744" opacity="0.18" />
      <rect width={width} height={height} rx="12" fill="#fff" />
      <rect x="6" y="6" width={width - 12} height={height - 18} rx="8" fill={sky} />
      <circle cx={width * 0.72} cy={height * 0.28} r="9" fill="#ffe08a" />
      <path
        d={`M6 ${height * 0.58} L${width * 0.38} ${height * 0.34} L${width * 0.58} ${height * 0.5} L${width - 6} ${height * 0.4} V${height - 18} H6 z`}
        fill={ground}
      />
      <rect x="6" y={height - 16} width={width - 12} height="10" fill="#f4f0ea" />
    </g>
  );
}

function WaveBars({
  x,
  y,
  color = "#7ee0d2",
  heights = [18, 34, 22, 42, 16, 30, 20],
}: {
  x: number;
  y: number;
  color?: string;
  heights?: number[];
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {heights.map((height, index) => (
        <rect
          key={`${height}-${index}`}
          x={index * 10}
          y={-height / 2}
          width="6"
          height={height}
          rx="3"
          fill={color}
          opacity={0.55 + (index % 3) * 0.15}
        />
      ))}
    </g>
  );
}

function ConvertOrb({ x, y, uid }: { x: number; y: number; uid: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="22" fill={`url(#${uid}-orb)`} />
      <circle r="22" fill="none" stroke="#fff" strokeOpacity="0.28" />
      <path
        d="M-9 -5.5h12l-3.5-3.5M8 0H-9M9 5.5H-3l3.5 3.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Mp4ToMp3Scene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffb14a" />
          <stop offset="55%" stopColor="#e35d6a" />
          <stop offset="100%" stopColor="#6b4dff" />
        </linearGradient>
        <linearGradient id={`${uid}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2ec4b6" />
          <stop offset="100%" stopColor="#7b5cff" />
        </linearGradient>
      </defs>
      <g transform="translate(18 28)">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <g key={row}>
            <rect x="0" y={row * 16} width="7" height="8" rx="2" fill="#f3c56b" />
            <rect x="118" y={row * 16} width="7" height="8" rx="2" fill="#f3c56b" />
          </g>
        ))}
        <rect x="10" y="0" width="108" height="96" rx="10" fill="#0b1524" />
        <rect x="16" y="8" width="96" height="62" rx="7" fill={`url(#${uid}-screen)`} />
        <circle cx="64" cy="39" r="13" fill="#fff" fillOpacity="0.92" />
        <path d="M60 32.5v13l12-6.5z" fill="#ff7a18" />
        <rect x="22" y="78" width="38" height="6" rx="3" fill="#fff" opacity="0.28" />
        <rect x="64" y="78" width="18" height="6" rx="3" fill="#ff7a18" opacity="0.8" />
      </g>
      <ConvertOrb x={158} y={80} uid={uid} />
      <g transform="translate(188 46)">
        <rect width="72" height="72" rx="18" fill="#ffffff" opacity="0.14" />
        <WaveBars x={10} y={36} heights={[16, 28, 22, 40, 18, 32]} />
        <path d="M54 22v28c0 6 8 6 8 0V30" fill="none" stroke="#ffe08a" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="6.5" fill="#ffe08a" />
      </g>
    </>
  );
}

function Mp3ToWavScene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffb14a" />
          <stop offset="100%" stopColor="#2ec4b6" />
        </linearGradient>
      </defs>
      <g transform="translate(28 34)">
        <rect width="86" height="92" rx="16" fill="#ff8a3d" />
        <text x="43" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          ANY
        </text>
        <WaveBars x={14} y={64} color="#fff" heights={[10, 22, 14, 28, 12, 20]} />
      </g>
      <ConvertOrb x={140} y={80} uid={uid} />
      <g transform="translate(166 34)">
        <rect width="86" height="92" rx="16" fill="#1a9b88" />
        <text x="43" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          OUT
        </text>
        <WaveBars x={14} y={64} color="#d9fff6" heights={[18, 12, 26, 14, 30, 16]} />
      </g>
    </>
  );
}

function AudioCutterScene() {
  return (
    <g transform="translate(24 48)">
      <rect width="232" height="64" rx="18" fill="#120f24" opacity="0.55" />
      <WaveBars x={18} y={32} color="#c4b5ff" heights={[18, 34, 22, 40, 16, 36, 20, 42, 18, 30, 22, 38, 16, 28, 20, 34, 18, 26]} />
      <rect x="78" y="8" width="76" height="48" rx="10" fill="#7b5cff" opacity="0.28" stroke="#c4b5ff" strokeWidth="2" />
      <g transform="translate(104  -18)">
        <circle cx="12" cy="8" r="8" fill="#ff7a18" />
        <circle cx="36" cy="8" r="8" fill="#ffd166" />
        <path d="M16 12l8 22 8-22" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    </g>
  );
}

function TempoPitchScene() {
  return (
    <g transform="translate(28 36)">
      <rect width="224" height="88" rx="18" fill="#0f1c22" opacity="0.7" />
      <WaveBars x={16} y={44} color="#7ee0d2" heights={[14, 28, 18, 36, 12, 30, 20, 38, 16, 26, 22, 34, 14, 28]} />
      <g transform="translate(150 10)">
        <circle cx="28" cy="28" r="26" fill="#2a9d8f" />
        <text x="28" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill="#d9fff6" fontFamily="Outfit, ui-sans-serif">
          TAP
        </text>
        <text x="28" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          BPM
        </text>
      </g>
      <text x="20" y="78" fontSize="11" fontWeight="700" fill="#9ad7ce" fontFamily="Outfit, ui-sans-serif">
        ±12 st · ±50¢
      </text>
    </g>
  );
}

function ImageCompressorScene() {
  return (
    <>
      <Photo x={28} y={34} width={118} height={92} />
      <g transform="translate(164 52)">
        <path d="M18 0v18H0" fill="none" stroke="#1a7f96" strokeWidth="5" strokeLinecap="round" />
        <path d="M8 8l10 10" stroke="#1a7f96" strokeWidth="5" strokeLinecap="round" />
        <Photo x={8} y={16} width={78} height={58} sky="#9ad2f0" ground="#62b57d" />
      </g>
    </>
  );
}

function WebpToJpgScene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e1251b" />
        </linearGradient>
      </defs>
      <g transform="translate(22 30)">
        <Photo x={0} y={8} width={96} height={74} rotate={-8} sky="#8fd3c0" />
        <rect x="18" y="86" width="58" height="20" rx="8" fill="#0f2744" />
        <text x="47" y="100" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          WEBP
        </text>
      </g>
      <ConvertOrb x={140} y={80} uid={uid} />
      <g transform="translate(164 30)">
        <Photo x={0} y={8} width={96} height={74} rotate={8} sky="#f4b267" ground="#d9763b" />
        <rect x="18" y="86" width="58" height="20" rx="8" fill="#e1251b" />
        <text x="47" y="100" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          JPG
        </text>
      </g>
    </>
  );
}

function ImageResizerScene() {
  return (
    <g transform="translate(58 28)">
      <Photo x={16} y={16} width={132} height={96} />
      <rect x="4" y="4" width="156" height="120" rx="10" fill="none" stroke="#1a7f96" strokeWidth="3" strokeDasharray="7 6" />
      {[
        [4, 4],
        [148, 4],
        [4, 112],
        [148, 112],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 5} y={y - 5} width="12" height="12" rx="2" fill="#fff" stroke="#1a7f96" strokeWidth="2.4" />
      ))}
    </g>
  );
}

function ColorPickerScene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-wheel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5d73" />
          <stop offset="25%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#2ec4b6" />
          <stop offset="75%" stopColor="#4d7cff" />
          <stop offset="100%" stopColor="#b44dff" />
        </linearGradient>
      </defs>
      <circle cx="92" cy="80" r="48" fill={`url(#${uid}-wheel)`} />
      <circle cx="92" cy="80" r="20" fill="#fff" />
      <g transform="translate(148 42) rotate(28)">
        <rect x="12" y="0" width="14" height="54" rx="7" fill="#d7dee8" />
        <rect x="8" y="46" width="22" height="28" rx="8" fill="#1a7f96" />
        <circle cx="19" cy="18" r="9" fill="#ff5d73" stroke="#fff" strokeWidth="3" />
      </g>
      <g transform="translate(196 92)">
        {["#E1251B", "#1A7F96", "#FFD166", "#6D5BFF"].map((color, index) => (
          <rect key={color} x={index * 18} width="16" height="16" rx="4" fill={color} />
        ))}
      </g>
    </>
  );
}

function PngToPdfScene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5aa7ff" />
          <stop offset="100%" stopColor="#E1251B" />
        </linearGradient>
      </defs>
      <Photo x={26} y={36} width={102} height={80} sky="#8ec6ff" />
      <ConvertOrb x={148} y={80} uid={uid} />
      <PdfDoc x={172} y={28} />
    </>
  );
}

function PdfCompressorScene() {
  return (
    <>
      <PdfDoc x={58} y={24} width={92} height={112} />
      <g transform="translate(168 48)">
        <circle cx="28" cy="28" r="28" fill="#fff" opacity="0.9" />
        <path d="M28 12v24M18 26l10 12 10-12" fill="none" stroke="#E1251B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <PdfDoc x={186} y={58} width={58} height={70} />
    </>
  );
}

function PdfMergerScene() {
  return (
    <>
      <PdfDoc x={36} y={34} rotate={-16} width={70} height={88} label="" />
      <PdfDoc x={78} y={28} rotate={-4} width={70} height={88} label="" />
      <g transform="translate(158 72)">
        <path d="M0 0h22" stroke="#E1251B" strokeWidth="5" strokeLinecap="round" />
        <path d="M14 -8l12 8-12 8" fill="none" stroke="#E1251B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <PdfDoc x={186} y={26} width={78} height={98} />
    </>
  );
}

function WordDoc({
  x,
  y,
  width = 78,
  height = 96,
  rotate = 0,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
}) {
  const fold = Math.max(6, Math.round(width * 0.26));
  const radius = Math.max(4, Math.round(width * 0.12));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${width / 2} ${height / 2})`}>
      <rect x="3" y="6" width={width} height={height} rx={radius} fill="#1b3a72" opacity="0.28" />
      <path
        d={`M${radius} 0h${width - fold - radius}l${fold} ${fold}v${height - fold - radius}a${radius} ${radius} 0 0 1-${radius} ${radius}H${radius}A${radius} ${radius} 0 0 1 0 ${height - radius}V${radius}A${radius} ${radius} 0 0 1 ${radius} 0z`}
        fill="#2B579A"
      />
      <path d={`M${width - fold} 0v${fold}h${fold}z`} fill="#8CB4FF" />
      <rect x={width * 0.14} y={height * 0.22} width={width * 0.5} height="6" rx="3" fill="#fff" opacity="0.55" />
      <rect x={width * 0.14} y={height * 0.32} width={width * 0.38} height="5" rx="2.5" fill="#fff" opacity="0.32" />
      <rect x={width * 0.12} y={height * 0.52} width={width * 0.76} height="24" rx="7" fill="#fff" />
      <text
        x={width / 2}
        y={height * 0.52 + 17}
        textAnchor="middle"
        fontSize={Math.max(8, Math.min(13, width * 0.17))}
        fontWeight="800"
        fill="#2B579A"
        fontFamily="Outfit, ui-sans-serif, system-ui"
      >
        DOC
      </text>
    </g>
  );
}

function PdfToWordScene() {
  return (
    <>
      <PdfDoc x={28} y={32} width={78} height={96} />
      <g transform="translate(122 72)">
        <path d="M0 0h28" stroke="#2B579A" strokeWidth="5" strokeLinecap="round" />
        <path d="M18 -8l12 8-12 8" fill="none" stroke="#2B579A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <WordDoc x={168} y={28} />
    </>
  );
}

function WordCounterScene() {
  return (
    <g transform="translate(58 24)">
      <rect x="8" y="8" width="164" height="112" rx="14" fill="#c9b89a" opacity="0.35" />
      <rect width="164" height="112" rx="14" fill="#fffaf2" />
      <rect x="18" y="22" width="92" height="8" rx="4" fill="#cfc3aa" />
      <rect x="18" y="40" width="118" height="7" rx="3.5" fill="#e4d9c4" />
      <rect x="18" y="54" width="108" height="7" rx="3.5" fill="#e4d9c4" />
      <rect x="18" y="68" width="96" height="7" rx="3.5" fill="#e4d9c4" />
      <g transform="translate(96 78)">
        <rect width="54" height="22" rx="11" fill="#1a7f96" />
        <text x="27" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          248
        </text>
      </g>
    </g>
  );
}

function Base64Scene({ uid }: SceneProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d7cff" />
          <stop offset="100%" stopColor="#6d5bff" />
        </linearGradient>
      </defs>
      <g transform="translate(24 42)">
        <rect width="96" height="76" rx="16" fill="#2b3558" />
        <text x="48" y="46" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          ABC
        </text>
      </g>
      <ConvertOrb x={140} y={80} uid={uid} />
      <g transform="translate(162 42)">
        <rect width="96" height="76" rx="16" fill="#4d7cff" />
        <text x="48" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" fontFamily="Outfit, ui-sans-serif">
          QUJD
        </text>
      </g>
    </>
  );
}

function QrMark({ x, y, size = 86, color = "#123024" }: { x: number; y: number; size?: number; color?: string }) {
  const pad = size * 0.12;
  const cell = (size - pad * 2) / 7;
  const gap = Math.max(0.6, cell * 0.12);
  const cells = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [4, 0],
    [5, 0],
    [6, 0],
    [4, 2],
    [5, 2],
    [6, 2],
    [6, 1],
    [4, 1],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 4],
    [1, 6],
    [2, 4],
    [2, 5],
    [2, 6],
    [4, 4],
    [5, 3],
    [6, 4],
    [4, 6],
    [6, 6],
    [3, 3],
    [5, 5],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={size} height={size} rx={Math.max(4, size * 0.16)} fill="#fff" />
      {cells.map(([cx, cy]) => (
        <rect
          key={`${cx}-${cy}`}
          x={pad + cx * cell}
          y={pad + cy * cell}
          width={cell - gap}
          height={cell - gap}
          rx={Math.max(0.6, cell * 0.18)}
          fill={color}
        />
      ))}
    </g>
  );
}

function QrGeneratorScene() {
  return (
    <>
      <QrMark x={86} y={28} size={108} />
      <circle cx="214" cy="46" r="10" fill="#2ec4b6" />
      <circle cx="58" cy="118" r="7" fill="#1a7f96" />
    </>
  );
}

function QrReaderScene() {
  return (
    <>
      <QrMark x={78} y={34} size={96} color="#16324a" />
      <rect x="62" y="22" width="128" height="116" rx="18" fill="none" stroke="#1a7f96" strokeWidth="5" />
      <path d="M62 50h128" stroke="#ff7a18" strokeWidth="4" opacity="0.9" />
      <rect x="54" y="14" width="22" height="22" rx="5" fill="none" stroke="#1a7f96" strokeWidth="5" />
      <rect x="176" y="14" width="22" height="22" rx="5" fill="none" stroke="#1a7f96" strokeWidth="5" />
      <rect x="54" y="124" width="22" height="22" rx="5" fill="none" stroke="#1a7f96" strokeWidth="5" />
      <rect x="176" y="124" width="22" height="22" rx="5" fill="none" stroke="#1a7f96" strokeWidth="5" />
    </>
  );
}

function PasswordScene() {
  return (
    <g transform="translate(78 22)">
      <path d="M62 18c0-18 18-30 38-30s38 12 38 30v18H62z" fill="#f0c14b" />
      <rect y="34" width="124" height="92" rx="22" fill="#2a210e" />
      <circle cx="62" cy="74" r="16" fill="#f0c14b" />
      <rect x="56" y="74" width="12" height="22" rx="6" fill="#2a210e" />
      <g transform="translate(28 108)">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <circle key={index} cx={index * 14} cy="0" r="4.5" fill="#f6e2a2" />
        ))}
      </g>
    </g>
  );
}

const scenes: Record<ToolSlug, (props: SceneProps) => ReactElement> = {
  "mp4-to-mp3": Mp4ToMp3Scene,
  "mp3-to-wav": Mp3ToWavScene,
  "audio-cutter": AudioCutterScene,
  "tempo-pitch": TempoPitchScene,
  "image-compressor": ImageCompressorScene,
  "webp-to-jpg": WebpToJpgScene,
  "image-resizer": ImageResizerScene,
  "color-picker": ColorPickerScene,
  "png-to-pdf": PngToPdfScene,
  "pdf-compressor": PdfCompressorScene,
  "pdf-merger": PdfMergerScene,
  "pdf-to-word": PdfToWordScene,
  "word-counter": WordCounterScene,
  base64: Base64Scene,
  "qr-generator": QrGeneratorScene,
  "qr-reader": QrReaderScene,
  "password-generator": PasswordScene,
};

export function ToolArt({
  slug,
  className,
}: {
  slug: ToolSlug;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const Scene = scenes[slug];

  return (
    <div dir="ltr" className="h-full w-full">
      <svg viewBox="0 0 280 160" className={cn("h-full w-full", className)} aria-hidden>
        <Scene uid={uid} />
      </svg>
    </div>
  );
}

export function CategoryMark({ category, className }: { category: ToolGroupSlug; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-full w-full", className)} aria-hidden>
      {category === "audio" ? (
        <>
          <rect x="6" y="12" width="18" height="24" rx="4" fill="#fff" opacity="0.92" />
          <path d="M12 21v6l5-3z" fill="#ff7a18" />
          <g transform="translate(28 16)">
            <rect x="0" y="8" width="3" height="10" rx="1.5" fill="#7ee0d2" />
            <rect x="5" y="4" width="3" height="18" rx="1.5" fill="#7ee0d2" />
            <rect x="10" y="7" width="3" height="12" rx="1.5" fill="#c4b5ff" />
          </g>
        </>
      ) : null}
      {category === "images" ? <Photo x={8} y={10} width={32} height={28} /> : null}
      {category === "pdf" ? <PdfDoc x={10} y={4} width={28} height={38} /> : null}
      {category === "text" ? (
        <>
          <rect x="10" y="8" width="28" height="32" rx="6" fill="#fff" />
          <rect x="15" y="15" width="18" height="3" rx="1.5" fill="#1a7f96" />
          <rect x="15" y="22" width="14" height="2.5" rx="1.2" fill="#cfc3aa" />
          <rect x="15" y="28" width="16" height="2.5" rx="1.2" fill="#cfc3aa" />
        </>
      ) : null}
      {category === "quick" ? <QrMark x={10} y={10} size={28} color="#123024" /> : null}
    </svg>
  );
}

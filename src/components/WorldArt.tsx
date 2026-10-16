import { useId, type ReactNode } from 'react'

const palettes = [
  ['#637d8b', '#d4aa91', '#c5a496', '#577675', '#345b59', '#223f3e', '#789790'],
  ['#737d9a', '#b5a2a4', '#948fa5', '#5d6b83', '#394e61', '#263e4b', '#6d8998'],
  ['#8b7e6f', '#dcb08a', '#b49d83', '#737b61', '#4b6550', '#2c493c', '#91a28a'],
]

export function Landscape({ variant = 0 }: { variant?: number }) {
  const id = useId()
  const [sky, horizon, mountain, far, middle, front, water] =
    palettes[variant % palettes.length]
  return (
    <svg
      className="landscape"
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor={sky} />
          <stop offset="1" stopColor={horizon} />
        </linearGradient>
        <linearGradient id={`${id}-water`} x2="0" y2="1">
          <stop stopColor={water} />
          <stop offset="1" stopColor={front} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h1200v420H0z" />
      <circle cx="955" cy="103" r="49" fill="#ffe1b3" opacity=".9" />
      <g fill="#f3ded1" opacity=".19">
        <path d="M80 62h120v12h80v15H80zM740 49h110v9h70v13H740zM1020 158h150v10h30v12h-180z" />
      </g>
      <path
        fill={mountain}
        d="M0 175h65v-28h65v-35h52V87h57v38h40v35h73v-27h67v-34h62v30h42v43h65v-28h60v-42h51v36h60v-26h53V83h43v-31h50v33h38v40h70v-24h55v32h77v-26h68v313H0z"
      />
      <path
        fill={far}
        d="M0 229h88v-21h60v-43h70v31h58v28h53v-24h52v-42h64v26h52v38h68v-18h66v-37h52v27h63v38h59v-23h79v-34h56v35h66v25h65v-45h70v28h59v202H0z"
      />
      <path fill={`url(#${id}-water)`} d="M0 249h1200v171H0z" />
      <path
        fill={middle}
        d="M0 233h86v-22h84v27h68v-20h60v27h68v38h61v35h-74v34h-91v37H0zM1200 235h-88v-24h-65v27h-60v-18h-67v31h-47v24h-64v36h-70v41h69v68h392z"
      />
      <path
        fill={front}
        d="M0 293h72v-19h77v35h77v30h69v36h-54v45H0zM1200 275h-76v-20h-54v26h-60v23h-65v27h-72v40h-51v49h378z"
      />
      <g fill="#abc5be" opacity=".28">
        <path d="M458 304h103v3H458zM610 278h72v2h-72zM475 347h169v3H475zM662 321h64v2h-64zM357 388h169v3H357zM649 375h134v3H649z" />
      </g>
      {[
        { x: 95, y: 191, s: 1.2 },
        { x: 210, y: 222, s: 0.85 },
        { x: 344, y: 201, s: 0.65 },
        { x: 1075, y: 180, s: 1.35 },
        { x: 968, y: 220, s: 0.8 },
        { x: 855, y: 235, s: 0.65 },
        { x: 38, y: 257, s: 1.6 },
        { x: 1140, y: 245, s: 1.7 },
      ].map(({ x, y, s }) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <path fill="#4b5142" d="M-4 20h8v47h-8z" />
          <path
            fill={front}
            d="M-12-43h24v18h11v18h10v19h9v21h-84V12h9V-7h10v-18h11z"
          />
          <path
            fill={middle}
            opacity=".55"
            d="M0-43h12v18h11v18h10v19h9v10H0z"
          />
        </g>
      ))}
      <g fill="#9eaf84" opacity=".45">
        <path d="M92 289h13v4H92zM238 338h16v3h-16zM1081 272h12v4h-12zM897 362h20v3h-20z" />
      </g>
    </svg>
  )
}

export function WorldIcon({ variant = 0 }: { variant?: number }) {
  const colors =
    variant % 3 === 1
      ? ['#82a6c0', '#566c81', '#38495d', '#a1bfd0']
      : variant % 3 === 2
        ? ['#bca67d', '#8c704c', '#65513b', '#d6bd8c']
        : ['#91bb62', '#6b7b47', '#465536', '#b1ce80']
  return (
    <svg className="block-icon" viewBox="0 0 64 68" aria-hidden="true">
      <path fill={colors[0]} d="M32 3 60 19 32 35 4 19z" />
      <path fill={colors[1]} d="M4 19 32 35v30L4 49z" />
      <path fill={colors[2]} d="m32 35 28-16v30L32 65z" />
      <path
        fill={colors[3]}
        opacity=".5"
        d="m15 17 8-4 8 4-8 5zm20-5 7-4 8 5-7 4z"
      />
      <path
        fill={colors[2]}
        opacity=".6"
        d="m8 31 7 4v7l-7-4zm11 16 8 5v6l-8-5z"
      />
      <path
        fill={colors[0]}
        opacity=".4"
        d="m39 42 7-4v6l-7 4zm10-13 7-4v9l-7 4z"
      />
      <path
        fill={colors[0]}
        d="m4 19 28 16v9l-7-4v-5l-6-3v6l-7-4v-6l-8-5zm28 16 28-16v6l-7 4v5l-7 4v-5l-7 4v8l-7 4z"
      />
    </svg>
  )
}

export function Badge({
  children,
  live = false,
}: {
  children: ReactNode
  live?: boolean
}) {
  return (
    <span className={`badge ${live ? 'live' : ''}`}>
      <i />
      {children}
    </span>
  )
}

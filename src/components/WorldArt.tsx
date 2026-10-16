import type { ReactNode } from 'react'

export function Landscape({ variant = 0 }: { variant?: number }) {
  const id = `land-${variant}`
  return (
    <svg
      className="landscape"
      viewBox="0 0 600 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor={variant % 2 ? '#42524e' : '#3d5142'} />
          <stop offset="1" stopColor="#9dada0" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M0 0h600v220H0z" />
      <circle cx="462" cy="54" r="24" fill="#e1dfb4" opacity=".68" />
      <path
        fill="#617364"
        d="M0 124h40v-24h50V80h60v20h40v34h70v-30h60v-34h60v24h45v35h65V92h50v27h60v101H0z"
      />
      <path
        fill="#405a47"
        d="M0 160h65v-24h65v16h56v-30h58v21h60v30h70v-25h56v-18h75v30h95v60H0z"
      />
      <path
        fill="#253e32"
        d="M0 185h75v-18h68v22h66v-22h73v24h61v-20h74v17h65v-20h60v20h58v32H0z"
      />
      {[42, 120, 356, 396, 524].map((x, i) => (
        <g key={x} transform={`translate(${x} ${100 + (i % 2) * 40})`}>
          <path fill="#233e31" d="M-12 0h24v16h8v20h-40V16h8z" />
          <path fill="#354431" d="M-3 36h6v20h-6z" />
        </g>
      ))}
      <path
        fill="#bdc6af"
        opacity=".35"
        d="M280 220v-17h30v-20h21v-15h16v-12h16v12h-9v15h-12v20h-9v17z"
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

import React, { useId } from 'react'

export interface SoldStampBadgeProps {
  text?: string
  colour?: string
  rotation?: number
  animate?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Authentic Rubber Stamp Sold Badge matching broadcast graphics.
 * Features a 36-point scalloped seal outer border, concentric rings,
 * top/bottom curved text with stars, and an angled grunge banner box.
 */
export const SoldStampBadge: React.FC<SoldStampBadgeProps> = ({
  text = 'SOLD',
  colour = '#EF4444',
  rotation = -15,
  animate = true,
  className = '',
  style = {},
}) => {
  const rawId = useId()
  const filterId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')

  // Generate 36-scallop outer seal points
  const points: string[] = []
  const cx = 100
  const cy = 100
  const totalPoints = 72
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i * 2 * Math.PI) / totalPoints
    const r = i % 2 === 0 ? 97 : 89
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  const polygonPoints = points.join(' ')

  const displayText = (text || 'SOLD').toUpperCase()

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <style>{`
        @keyframes stampSlamImpact {
          0% {
            transform: scale(2.6) rotate(${rotation - 25}deg);
            opacity: 0;
            filter: blur(5px);
          }
          60% {
            transform: scale(0.92) rotate(${rotation + 4}deg);
            opacity: 1;
            filter: blur(0px);
          }
          80% {
            transform: scale(1.06) rotate(${rotation - 2}deg);
          }
          100% {
            transform: scale(1) rotate(${rotation}deg);
            opacity: 1;
          }
        }
        .stamp-slam-effect {
          animation: stampSlamImpact 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transform-origin: center center;
        }
        .stamp-static-effect {
          transform: rotate(${rotation}deg);
          transform-origin: center center;
        }
      `}</style>

      <div
        className={`w-full h-full flex items-center justify-center ${animate ? 'stamp-slam-effect' : 'stamp-static-effect'}`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_8px_20px_rgba(239,68,68,0.55)]"
          style={{ color: colour, overflow: 'visible' }}
        >
          <defs>
            <filter id={`grunge-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <path id={`topArc-${filterId}`} d="M 32 100 A 68 68 0 0 1 168 100" fill="none" />
            <path id={`bottomArc-${filterId}`} d="M 168 100 A 68 68 0 0 1 32 100" fill="none" />
          </defs>

          <g filter={`url(#grunge-${filterId})`}>
            {/* Outer Scalloped Seal Edge */}
            <polygon
              points={polygonPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />

            {/* Concentric Circular Rings */}
            <circle cx="100" cy="100" r="83" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 2.5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" />

            {/* Top Arc Text */}
            <text fill="currentColor" fontSize="13" fontWeight="900" letterSpacing="4">
              <textPath href={`#topArc-${filterId}`} startOffset="50%" textAnchor="middle">
                ★ {displayText} ★
              </textPath>
            </text>

            {/* Top Arc Stars */}
            <g fill="currentColor">
              <circle cx="85" cy="58" r="2.5" />
              <circle cx="100" cy="54" r="3.5" />
              <circle cx="115" cy="58" r="2.5" />
            </g>

            {/* Bottom Arc Text */}
            <text fill="currentColor" fontSize="13" fontWeight="900" letterSpacing="4">
              <textPath href={`#bottomArc-${filterId}`} startOffset="50%" textAnchor="middle">
                ★ {displayText} ★
              </textPath>
            </text>

            {/* Bottom Arc Stars */}
            <g fill="currentColor">
              <circle cx="85" cy="142" r="2.5" />
              <circle cx="100" cy="146" r="3.5" />
              <circle cx="115" cy="142" r="2.5" />
            </g>

            {/* Center Banner Box */}
            <g>
              {/* Banner Background */}
              <rect
                x="4"
                y="74"
                width="192"
                height="52"
                rx="4"
                fill="rgba(15, 23, 42, 0.92)"
                stroke="currentColor"
                strokeWidth="4"
              />
              {/* Inner Border Lines */}
              <line x1="6" y1="79" x2="194" y2="79" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6" y1="121" x2="194" y2="121" stroke="currentColor" strokeWidth="1.5" />

              {/* Giant Central SOLD Text */}
              <text
                x="100"
                y="113"
                textAnchor="middle"
                fill="currentColor"
                fontSize={displayText.length > 5 ? '30' : '38'}
                fontWeight="1000"
                fontFamily="Impact, Arial Black, sans-serif"
                letterSpacing="4"
                stroke="currentColor"
                strokeWidth="0.8"
              >
                {displayText}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
export default SoldStampBadge

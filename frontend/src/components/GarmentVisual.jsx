/**
 * GarmentVisual.jsx
 * Authentic, editorial streetwear vector illustrations for garment products.
 * Used when no uploaded photography thumbnail is available, adhering to DESIGN.md
 * (authentic silhouette, subtle stitch lines, collar ribbing, drop-shoulder seams).
 */

export default function GarmentVisual({
  type = 'tshirt',
  name = '',
  color = '#222320',
  className = '',
}) {
  const lower = `${type} ${name}`.toLowerCase()
  const isHoodie = lower.includes('hoodie')
  const isOversized = lower.includes('oversize') || lower.includes('boxy')

  if (isHoodie) {
    return (
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ width: '100%', height: '100%', maxHeight: '340px' }}
      >
        <defs>
          <radialGradient id="hoodieLight" cx="45%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </radialGradient>
          <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1a1a18" floodOpacity="0.15" />
          </filter>
        </defs>

        <g filter="url(#subtleShadow)">
          {/* Main Body */}
          <path
            d="M80 120 L40 160 L12 210 L50 236 L72 195 L70 330 L250 330 L248 195 L270 236 L308 210 L280 160 L240 120 Z"
            fill={color}
          />
          <path
            d="M80 120 L40 160 L12 210 L50 236 L72 195 L70 330 L250 330 L248 195 L270 236 L308 210 L280 160 L240 120 Z"
            fill="url(#hoodieLight)"
          />

          {/* Kangaroo Pocket */}
          <path
            d="M102 250 L218 250 L232 305 L88 305 Z"
            fill={color}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
          <path
            d="M88 305 L102 250 M232 305 L218 250"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1.5"
          />

          {/* Ribbed Hem & Cuffs */}
          <rect x="70" y="322" width="180" height="12" fill="rgba(0,0,0,0.18)" rx="1" />
          <rect x="14" y="215" width="40" height="10" transform="rotate(-36 14 215)" fill="rgba(0,0,0,0.18)" rx="1" />
          <rect x="274" y="238" width="40" height="10" transform="rotate(36 274 238)" fill="rgba(0,0,0,0.18)" rx="1" />

          {/* Hood Structure */}
          <path
            d="M110 115 C110 50, 210 50, 210 115 C190 135, 130 135, 110 115 Z"
            fill={color}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1.5"
          />
          <path
            d="M125 105 C135 68, 185 68, 195 105 C180 118, 140 118, 125 105 Z"
            fill="rgba(0,0,0,0.2)"
          />

          {/* Drawstrings */}
          <path d="M142 125 L140 185" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M178 125 L180 178" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="140" cy="188" r="3" fill="#888" />
          <circle cx="180" cy="181" r="3" fill="#888" />

          {/* Subtle Seam lines */}
          <path d="M80 120 L115 130 M240 120 L205 130" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
          <path d="M72 195 L115 130 M248 195 L205 130" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeDasharray="3 2" />
        </g>
      </svg>
    )
  }

  if (isOversized) {
    return (
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ width: '100%', height: '100%', maxHeight: '340px' }}
      >
        <defs>
          <radialGradient id="teeLightOversized" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </radialGradient>
          <filter id="subtleTeeShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1a1a18" floodOpacity="0.15" />
          </filter>
        </defs>

        <g filter="url(#subtleTeeShadow)">
          {/* Oversized Boxy Tee Body with Drop Shoulder */}
          <path
            d="M112 75 C132 88, 188 88, 208 75 L288 122 L262 195 L228 178 L228 335 L92 335 L92 178 L58 195 L32 122 Z"
            fill={color}
          />
          <path
            d="M112 75 C132 88, 188 88, 208 75 L288 122 L262 195 L228 178 L228 335 L92 335 L92 178 L58 195 L32 122 Z"
            fill="url(#teeLightOversized)"
          />

          {/* Drop Shoulder Seam (characteristic streetwear look) */}
          <path d="M246 98 L228 178" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" strokeDasharray="4 2" />
          <path d="M74 98 L92 178" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Ribbed Crewneck Collar */}
          <path
            d="M112 75 C132 88, 188 88, 208 75 C198 62, 122 62, 112 75 Z"
            fill={color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M116 75 C134 85, 186 85, 204 75"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />

          {/* Sleeve & Hem Stitching Details */}
          <line x1="92" y1="326" x2="228" y2="326" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <line x1="38" y1="130" x2="62" y2="188" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <line x1="282" y1="130" x2="258" y2="188" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
        </g>
      </svg>
    )
  }

  // Regular Fit Crewneck T-Shirt
  return (
    <svg
      viewBox="0 0 320 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%', maxHeight: '340px' }}
    >
      <defs>
        <radialGradient id="teeLightRegular" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
        <filter id="subtleTeeRegShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1a1a18" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#subtleTeeRegShadow)">
        {/* Regular Fit Tee Silhouette */}
        <path
          d="M115 78 C135 90, 185 90, 205 78 L272 118 L248 174 L220 162 L220 330 L100 330 L100 162 L72 174 L48 118 Z"
          fill={color}
        />
        <path
          d="M115 78 C135 90, 185 90, 205 78 L272 118 L248 174 L220 162 L220 330 L100 330 L100 162 L72 174 L48 118 Z"
          fill="url(#teeLightRegular)"
        />

        {/* Armhole Seams */}
        <path d="M220 162 L210 102" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M100 162 L110 102" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" strokeDasharray="3 2" />

        {/* Ribbed Collar */}
        <path
          d="M115 78 C135 90, 185 90, 205 78 C197 66, 123 66, 115 78 Z"
          fill={color}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="1.5"
        />
        <path
          d="M119 78 C137 87, 183 87, 201 78"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.8"
        />

        {/* Hem & Cuff stitches */}
        <line x1="100" y1="322" x2="220" y2="322" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      </g>
    </svg>
  )
}


import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Snow } from '../types'

const SCENE = 'snowfall'
const GROW_MS = 3000
const MELT_MS = 7000

// Change the tag when Snow's fields change: it declines what an earlier
// version stored, which outlives a reload.
const snow = atom(
  { plugin: 'snowfall', key: 'snow' } as const,
  { level: 0, from: 0, isMelting: false, at: 0 },
  { shape: 'snow-1' },
)

const W = 1600
const H = 1000
const MAX_PILE = 310 // pile height at 100% context, in viewBox units

// A fixed seed, so the flakes and drifts stay put across redraws.
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const pileHeight = (level: number) => 18 + (level / 100) * MAX_PILE
const f = (n: number) => n.toFixed(1)

// A drift line across the whole width, its top at `h` above the bottom.
function pilePath(h: number, seed: number, wobble: number) {
  const r = rng(seed)
  const top = H - h
  let d = `M -40 ${H + 600} L -40 ${f(top + 10)}`
  const steps = 8
  for (let i = 0; i < steps; i++) {
    const x0 = -40 + ((W + 80) / steps) * i
    const x1 = x0 + (W + 80) / steps
    const lift = (r() - 0.5) * wobble
    d += ` Q ${f((x0 + x1) / 2)} ${f(top - lift)} ${f(x1)} ${f(top + (r() - 0.5) * wobble * 0.4)}`
  }
  return `${d} L ${W + 40} ${H + 600} Z`
}

function flakes(count: number) {
  const r = rng(7)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = r() * W
    const y = r() * H
    const size = 1.2 + r() * 2.6
    const fall = 9 + r() * 12
    const sway = 3 + r() * 4
    const delay = -r() * fall
    out +=
      `<g class="sw" style="animation-duration:${f(sway)}s;animation-delay:${f(-r() * sway)}s">` +
      `<circle class="fl" cx="${f(x)}" cy="${f(y)}" r="${f(size)}" opacity="${f(0.5 + r() * 0.5)}" ` +
      `style="animation-duration:${f(fall)}s;animation-delay:${f(delay)}s"/></g>`
  }
  return out
}

function stars() {
  const r = rng(3)
  let out = ''
  for (let i = 0; i < 70; i++) {
    out += `<circle class="st" cx="${f(r() * W)}" cy="${f(r() * 520)}" r="${f(0.6 + r() * 1.4)}" style="animation-delay:${f(-r() * 4)}s"/>`
  }
  return out
}

function scene(s: Snow, elapsed: number) {
  const isMoving = s.isMelting ? elapsed < MELT_MS : elapsed < GROW_MS
  const from = isMoving ? s.from : s.level
  const h = pileHeight(s.level)
  const drop = pileHeight(from) - h // positive: the pile starts higher
  const ms = s.isMelting ? MELT_MS : GROW_MS
  const count = s.isMelting ? 25 : 40 + Math.round(s.level * 1.6)
  const pileFill = s.isMelting ? '#c9d9ee' : '#eef4fb'
  const hot = s.level >= 80

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
<style>
.fl{fill:#fff;animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}
.sw{animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.st{fill:#fff;animation:tw 4s ease-in-out infinite}
.pile{animation:pile ${ms}ms ease-out both}
.drip{animation:drip 1.6s ease-in infinite}
.glow{animation:glow 3s ease-in-out infinite alternate}
@keyframes fall{from{transform:translateY(-1000px)}to{transform:translateY(1000px)}}
@keyframes sway{from{transform:translateX(-14px)}to{transform:translateX(14px)}}
@keyframes tw{0%,100%{opacity:.9}50%{opacity:.25}}
@keyframes pile{from{transform:translateY(${f(-drop)}px)}to{transform:translateY(0)}}
@keyframes drip{from{transform:translateY(0);opacity:.9}to{transform:translateY(60px);opacity:0}}
@keyframes glow{from{opacity:.75}to{opacity:1}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0b1330"/><stop offset=".6" stop-color="#1c2a5c"/><stop offset="1" stop-color="#34417a"/>
</linearGradient>
<radialGradient id="moonglow"><stop offset="0" stop-color="#fff6d8" stop-opacity=".45"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
<radialGradient id="window"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#f08a2c"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars()}
<circle cx="1390" cy="230" r="120" fill="url(#moonglow)"/>
<circle cx="1390" cy="230" r="38" fill="#fbf3dc"/>
<circle cx="1378" cy="220" r="6" fill="#e9dfc2"/><circle cx="1402" cy="242" r="4" fill="#e9dfc2"/>
<path d="M -40 ${H - 230} Q 300 ${H - 330} 640 ${H - 250} T 1300 ${H - 270} T 1700 ${H - 240} V ${H} H -40 Z" fill="#2b3a74"/>
<path d="M -40 ${H - 160} Q 400 ${H - 240} 820 ${H - 170} T 1700 ${H - 180} V ${H} H -40 Z" fill="#3a4a8a"/>
<g transform="translate(150 ${H - 120})">
<rect x="-9" y="-10" width="18" height="40" fill="#4a3324"/>
<path d="M 0 -250 L 70 -150 L 38 -150 L 90 -70 L 52 -70 L 110 10 L -110 10 L -52 -70 L -90 -70 L -38 -150 L -70 -150 Z" fill="#1d4a3a"/>
<path d="M 0 -250 L 40 -192 L -40 -192 Z M -70 -150 L 70 -150 L 58 -135 L -58 -135 Z M -90 -70 L 90 -70 L 78 -56 L -78 -56 Z" fill="#e8f0fa"/>
<path d="M 0 -278 l 7 16 17 1 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -1 Z" fill="#ffd86b"/>
<circle class="glow" cx="-30" cy="-110" r="6" fill="#ff6b6b"/><circle class="glow" cx="34" cy="-30" r="6" fill="#ffd86b" style="animation-delay:-1s"/>
<circle class="glow" cx="20" cy="-175" r="5" fill="#7ad1ff" style="animation-delay:-2s"/><circle class="glow" cx="-50" cy="-20" r="6" fill="#7ad1ff" style="animation-delay:-.5s"/>
</g>
<g transform="translate(1460 ${H - 130})">
<rect x="-80" y="-120" width="160" height="150" fill="#5a3a2a"/>
<path d="M -110 -110 L 0 -230 L 110 -110 Z" fill="#3b2418"/>
<path d="M -114 -106 L 0 -236 L 114 -106 L 96 -106 L 0 -212 L -96 -106 Z" fill="#eef4fb"/>
<rect x="45" y="-260" width="22" height="60" fill="#4a2e22"/><rect x="41" y="-266" width="30" height="10" fill="#eef4fb"/>
<rect class="glow" x="-55" y="-90" width="44" height="44" rx="3" fill="url(#window)"/>
<rect class="glow" x="12" y="-90" width="44" height="44" rx="3" fill="url(#window)" style="animation-delay:-1.4s"/>
<path d="M -33 -90 V -46 M -55 -68 H -11 M 34 -90 V -46 M 12 -68 H 56" stroke="#5a3a2a" stroke-width="4"/>
</g>
<g class="pile">
<path d="${pilePath(h + 26, 11, 70)}" fill="#b9c8e4" opacity=".55"/>
<path d="${pilePath(h, 5, 60)}" fill="${pileFill}"/>
<path d="${pilePath(h - 40, 19, 40)}" fill="#dde7f4" opacity=".6"/>
${
  s.isMelting
    ? Array.from({ length: 14 }, (_, i) => {
        const x = 60 + i * 113
        return `<circle class="drip" cx="${x}" cy="${f(H - h + 12)}" r="4" fill="#9cc3f0" style="animation-delay:${f(-(i * 0.37) % 1.6)}s"/>`
      }).join('')
    : ''
}
</g>
${flakes(count)}
<g transform="translate(60 40)">
<rect x="34" y="-8" width="6" height="34" fill="#6b4630"/><rect x="100" y="-8" width="6" height="34" fill="#6b4630"/>
<rect x="0" y="24" width="140" height="92" rx="10" fill="#7a4e33" stroke="#4e3020" stroke-width="4"/>
<text x="70" y="78" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" font-weight="700" fill="${hot ? '#ffcf6b' : '#fff7e6'}">${s.level}%</text>
<text x="70" y="102" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" fill="#f3dcc0">context</text>
<rect x="-4" y="18" width="148" height="12" rx="6" fill="#eef4fb"/>
<g transform="translate(96 4)">
<ellipse cx="0" cy="0" rx="17" ry="15" fill="#6b4a35"/>
<ellipse cx="4" cy="5" rx="11" ry="10" fill="#e2623e"/>
<circle cx="8" cy="-6" r="2.4" fill="#111"/>
<path d="M 16 -3 L 25 0 L 16 3 Z" fill="#f0b44a"/>
<path d="M -12 -10 Q 0 -40 16 -12 Z" fill="#d8323a"/><circle cx="-12" cy="-12" r="5" fill="#fff"/>
<rect x="-14" y="-14" width="31" height="6" rx="3" fill="#fff"/>
</g>
</g>
</svg>`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.theme.set({
      backdrop: { scene: SCENE, glass: { blur: 10, tint: '#0b1330', opacity: 0.35 } },
      overrideColorScheme: 'dark',
    })
    const { context } = await $.session.usage()
    if (context.percent !== undefined) {
      const level = clamp(context.percent)
      await update($, snow, s => ({ ...s, level, from: level }))
    }

    return next(e)
  })

  // /clear starts a fresh conversation with no session.start: clear the ground.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, snow, () => ({ level: 0, from: 0, isMelting: false, at: 0 }))
    }

    return next(e)
  })

  // After each main-thread turn: the pile grows (or shrinks) to the context fill.
  on('session.measure', async ($, e, next) => {
    const percent = e.context.percent
    if (e.changed.includes('context') && percent !== undefined) {
      const now = await $.clock.now()
      await update($, snow, s => {
        const level = clamp(percent)
        if (level === s.level) return s
        // A reading mid-melt keeps melting toward the new level.
        if (s.isMelting && now - s.at < MELT_MS) return { ...s, level }
        return { level, from: s.level, isMelting: false, at: now }
      })
    }

    return next(e)
  })

  // A compaction of the main conversation melts the pile down.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined || e.trigger === 'precompute' || result.messages === undefined) {
      return result
    }
    const { context } = await $.session.usage()
    const after = result.tokensAfter
    const level = after !== undefined && context.window > 0 ? clamp((100 * after) / context.window) : 0
    const now = await $.clock.now()
    await update($, snow, s => ({ level, from: s.level, isMelting: true, at: now }))
    $.clock.after(MELT_MS + 200, () => {
      void update($, snow, s => (s.isMelting ? { ...s, from: s.level, isMelting: false } : s))
    })

    return result
  }).catch(($, e, next) => next(e)) // a failure here never blocks the compaction

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== $.plugin.name || e.props.scene !== SCENE) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    const s = await read($, snow)
    const elapsed = (await $.clock.now()) - s.at

    return Svg({
      source: scene(s, elapsed),
      alt: `A snowy night; the snow is ${s.level}% deep${s.isMelting ? ' and melting' : ''}`,
      isInteractive: true,
    })
  })
}

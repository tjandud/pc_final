<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GLOBE_POLYS } from '@/data/globePolys'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    paused?: boolean
  }>(),
  {
    paused: false,
  },
)

const stageRef = ref<HTMLDivElement | null>(null)
const glCanvasRef = ref<HTMLCanvasElement | null>(null)
const ovCanvasRef = ref<HTMLCanvasElement | null>(null)
const themeStore = useThemeStore()

let rafId = 0
let arcTimerId = 0
let running = false
let gl: WebGLRenderingContext | null = null
let gCtx: CanvasRenderingContext2D | null = null

let gW = 560
let gH = 520
let gDpr = 1
let gYaw = -2.05
let gPitch = 0.26
let gVYaw = 0
let gVPitch = 0
let gDrag = false
let gPX = 0
let gPY = 0
let dragMoved = false
const devMem = typeof navigator !== 'undefined' ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) : 8
let lowGpu = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || devMem <= 4
let ecoTier = lowGpu
let frameCount = 0
let slowStreak = 0
let lastDrawMs = 0
let lastDrawTime = 0
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let gpSph: WebGLProgram | null = null
let gpGrat: WebGLProgram | null = null
let gpCst: WebGLProgram | null = null
let gbQuad: WebGLBuffer | null = null
let gbGrat: WebGLBuffer | null = null
let gbCst: WebGLBuffer | null = null
let gGratCnt = 0
let gCstCnt = 0
let gpSphLoc = -1
let gpGratAP = -1
let gpCstAP0 = -1
let gpCstAP1 = -1
let gpCstASE = -1

const guSph: Record<string, WebGLUniformLocation | null> = {}
const guGrat: Record<string, WebGLUniformLocation | null> = {}
const guCst: Record<string, WebGLUniformLocation | null> = {}

const GDEG = Math.PI / 180
function gLL2XYZ(loDeg: number, laDeg: number): [number, number, number] {
  const lo = loDeg * GDEG
  const la = laDeg * GDEG
  const cl = Math.cos(la)
  return [cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo)]
}

interface CountryHub {
  name: string
  lon: number
  lat: number
  x: number
  y: number
  z: number
  ex: number
  ez: number
  nx: number
  ny: number
  nz: number
  hit: number
}

const GCOUNTRIES: CountryHub[] = [
  { name: 'South Korea', lon: 127.0, lat: 37.5 },
  { name: 'Japan', lon: 138.3, lat: 36.2 },
  { name: 'China', lon: 104.2, lat: 35.9 },
  { name: 'Singapore', lon: 103.8, lat: 1.35 },
  { name: 'India', lon: 78.9, lat: 21.0 },
  { name: 'Australia', lon: 133.8, lat: -25.3 },
  { name: 'United States', lon: -98.5, lat: 39.8 },
  { name: 'Canada', lon: -106.3, lat: 56.1 },
  { name: 'Brazil', lon: -51.9, lat: -14.2 },
  { name: 'United Kingdom', lon: -2.0, lat: 54.0 },
  { name: 'Germany', lon: 10.4, lat: 51.2 },
  { name: 'UAE', lon: 54.4, lat: 24.4 },
].map((c) => {
  const p = gLL2XYZ(c.lon, c.lat)
  let ex = p[2]
  let ez = -p[0]
  const el = Math.hypot(ex, ez) || 1
  ex /= el
  ez /= el
  const nx = p[1] * ez
  const ny = p[2] * ex - p[0] * ez
  const nz = -p[1] * ex
  return { ...c, x: p[0], y: p[1], z: p[2], ex, ez, nx, ny, nz, hit: 0 }
})

const GSEGS = 22
interface GArc {
  pts: Float32Array
  prog: number
  speed: number
  gold: boolean
  to: CountryHub
  arrived: boolean
}
interface GRip {
  c: CountryHub
  age: number
  gold: boolean
}
const gArcs: GArc[] = []
const gRips: GRip[] = []

let gSpCyan: HTMLCanvasElement | null = null
let gSpGold: HTMLCanvasElement | null = null

function makeSprite(c1: string, c2: string): HTMLCanvasElement {
  const el = document.createElement('canvas')
  el.width = 32
  el.height = 32
  const c = el.getContext('2d')!
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.32, c1)
  g.addColorStop(0.72, c2)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g
  c.fillRect(0, 0, 32, 32)
  return el
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function spawnGArc(src?: CountryHub) {
  const a = src || GCOUNTRIES[(Math.random() * GCOUNTRIES.length) | 0]!
  const cs = GCOUNTRIES.filter((c) => {
    if (c === a) return false
    const dot = a.x * c.x + a.y * c.y + a.z * c.z
    return dot > -0.5 && dot < 0.93
  })
  const b = cs[(Math.random() * cs.length) | 0] || GCOUNTRIES[(GCOUNTRIES.indexOf(a) + 3) % GCOUNTRIES.length]!
  const dot = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -0.98, 0.98)
  const om = Math.acos(dot)
  const so = Math.sin(om) || 1e-4
  const pk = 0.09 + Math.min(0.17, om * 0.085)
  const pts = new Float32Array((GSEGS + 1) * 3)
  for (let i = 0; i <= GSEGS; i++) {
    const t = i / GSEGS
    const s0 = Math.sin((1 - t) * om) / so
    const s1 = Math.sin(t * om) / so
    const h = 1 + pk * Math.sin(Math.PI * t)
    pts[i * 3] = (a.x * s0 + b.x * s1) * h
    pts[i * 3 + 1] = (a.y * s0 + b.y * s1) * h
    pts[i * 3 + 2] = (a.z * s0 + b.z * s1) * h
  }
  gArcs.push({ pts, prog: 0, speed: 0.46 + Math.random() * 0.22, gold: Math.random() < 0.42, to: b, arrived: false })
  if (gArcs.length > 7) gArcs.shift()
}

const VS_SPH = `precision mediump float;
attribute vec2 p;
void main(){
  gl_Position=vec4(p,0.,1.);
}`

const FS_SPH = `precision mediump float;
uniform vec2 uRes;
uniform float uR,uLight;
void main(){
  vec2 px=gl_FragCoord.xy-0.5*uRes;
  float d=length(px);
  float maxD=uR*1.16;
  if(d>maxD)discard;
  float haloFade=smoothstep(maxD,uR,d);
  float hA=exp(-max(0.,d-uR)/(uR*0.09))*0.42*haloFade*mix(1.0,0.48,uLight);
  vec3 hCol=vec3(0.24,0.74,1.0);
  if(d>uR){
    if(hA<0.003)discard;
    gl_FragColor=vec4(hCol*hA,hA);
    return;
  }
  vec2 s=px/uR;
  float z=sqrt(max(0.,1.-dot(s,s)));
  vec3 n=vec3(s.x,s.y,z);
  float lt=clamp(dot(n,vec3(-0.35,0.38,0.85)),0.,1.);
  vec3 oc=mix(mix(vec3(0.014,0.048,0.125),vec3(0.036,0.14,0.31),lt*0.75),mix(vec3(0.03,0.13,0.34),vec3(0.08,0.35,0.75),lt*0.80),uLight);
  oc+=vec3(0.08,0.62,1.0)*pow(1.-z,3.0)*0.78+vec3(0.68,0.94,1.0)*pow(1.-z,8.5)*0.72;
  float edge=smoothstep(uR,uR-1.6,d);
  float a=mix(hA,0.96,edge);
  gl_FragColor=vec4(mix(hCol*hA,oc*0.96,edge),a);
}`

const VS_GRAT = `precision mediump float;
attribute vec3 aP;
uniform vec2 uRes;
uniform float uR,uYaw,uPitch;
varying float vZ;
void main(){
  float cy=cos(uYaw),sy=sin(uYaw);
  float x1=aP.x*cy+aP.z*sy,z1=-aP.x*sy+aP.z*cy;
  float cp=cos(uPitch),sp=sin(uPitch);
  float y2=aP.y*cp-z1*sp,z2=aP.y*sp+z1*cp;
  vZ=z2;
  gl_Position=vec4((vec2(x1,y2)*uR)/(0.5*uRes),0.,1.);
}`

const FS_GRAT = `precision mediump float;
varying float vZ;
void main(){
  float f=smoothstep(-0.08,0.2,vZ);
  float al=mix(0.028,0.12,f);
  gl_FragColor=vec4(vec3(0.22,0.74,0.98)*al,al);
}`

const VS_CST = `precision mediump float;
attribute vec3 aP0,aP1;
attribute vec2 aSE;
uniform vec2 uRes;
uniform float uR,uYaw,uPitch,uHalfW;
varying float vS,vZ;
vec3 rot(vec3 v){
  float cy=cos(uYaw),sy=sin(uYaw);
  float x1=v.x*cy+v.z*sy,z1=-v.x*sy+v.z*cy;
  float cp=cos(uPitch),sp=sin(uPitch);
  float y2=v.y*cp-z1*sp,z2=v.y*sp+z1*cp;
  return vec3(x1,y2,z2);
}
void main(){
  vec3 r0=rot(aP0),r1=rot(aP1);
  vec2 s0=r0.xy*uR,s1=r1.xy*uR;
  vec2 dir=s1-s0;
  float len=length(dir);
  vec2 nrm=len>0.01?vec2(-dir.y,dir.x)/len:vec2(0.,1.);
  vec3 cur=mix(r0,r1,aSE.y);
  vZ=cur.z;vS=aSE.x;
  float w=mix(uHalfW*0.45,uHalfW,smoothstep(-0.1,0.2,cur.z));
  gl_Position=vec4((mix(s0,s1,aSE.y)+nrm*(aSE.x*w))/(0.5*uRes),0.,1.);
}`

const FS_CST = `precision mediump float;
varying float vS,vZ;
void main(){
  float d=abs(vS),front=smoothstep(-0.08,0.16,vZ),back=(1.-front)*smoothstep(-0.85,-0.05,vZ);
  float bloom=exp(-d*d*4.5),core=smoothstep(0.32,0.03,d);
  vec3 c=(vec3(0.05,0.62,1.0)*bloom*0.58+vec3(0.78,0.96,1.0)*core*0.92)*front+vec3(0.06,0.52,0.92)*smoothstep(0.42,0.08,d)*0.11*back;
  float al=clamp(bloom*front*0.75+core*front+back*0.14,0.,1.);
  if(al<0.005)discard;
  gl_FragColor=vec4(c,al);
}`

function mkG(vsSrc: string, fsSrc: string): WebGLProgram | null {
  if (!gl) return null
  const sh = (t: number, src: string) => {
    const o = gl!.createShader(t)
    if (!o) return null
    gl!.shaderSource(o, src)
    gl!.compileShader(o)
    return o
  }
  const vs = sh(gl.VERTEX_SHADER, vsSrc)
  const fs = sh(gl.FRAGMENT_SHADER, fsSrc)
  if (!vs || !fs) return null
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p)
    return null
  }
  return p
}

let gmCy = 1
let gmSy = 0
let gmCx = 1
let gmSx = 0
let grx = 0
let gry = 0
let grz = 0
function gProj(x: number, y: number, z: number) {
  const x1 = x * gmCy + z * gmSy
  const z1 = -x * gmSy + z * gmCy
  const y2 = y * gmCx - z1 * gmSx
  grz = y * gmSx + z1 * gmCx
  grx = x1
  gry = -y2
}

function resizeGlobe() {
  const stage = stageRef.value
  const glCv = glCanvasRef.value
  const hudCv = ovCanvasRef.value
  if (!stage || !glCv || !hudCv) return
  const rc = stage.getBoundingClientRect()
  gW = Math.max(300, Math.round(rc.width || 560))
  gH = Math.max(300, Math.round(rc.height || 520))
  gDpr = ecoTier ? 0.78 : Math.min(window.devicePixelRatio || 1, 1.05)
  glCv.width = hudCv.width = Math.round(gW * gDpr)
  glCv.height = hudCv.height = Math.round(gH * gDpr)
  if (gl) gl.viewport(0, 0, glCv.width, glCv.height)
  if (gCtx) {
    gCtx.setTransform(gDpr, 0, 0, gDpr, 0, 0)
    gCtx.font = '700 13.5px Pretendard Variable, Pretendard, system-ui, sans-serif'
    gCtx.textBaseline = 'middle'
  }
}

function renderHeroGlobe(dt: number, lightVal: number) {
  const glCv = glCanvasRef.value
  if (!glCv) return
  if (!gDrag) {
    gYaw += gVYaw - dt * 0.18
    gPitch = clamp(gPitch + gVPitch, -1.05, 1.05)
    gVYaw *= 0.93
    gVPitch *= 0.93
  }
  const R = Math.min(gW, gH) * 0.415
  const cx = gW * 0.5
  const cy = gH * 0.5

  if (gl && gpSph && gpGrat && gpCst) {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)
    gl.useProgram(gpSph)
    gl.bindBuffer(gl.ARRAY_BUFFER, gbQuad)
    gl.enableVertexAttribArray(gpSphLoc)
    gl.vertexAttribPointer(gpSphLoc, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(guSph.uRes ?? null, glCv.width, glCv.height)
    gl.uniform1f(guSph.uR ?? null, R * gDpr)
    gl.uniform1f(guSph.uLight ?? null, lightVal)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.useProgram(gpGrat)
    gl.bindBuffer(gl.ARRAY_BUFFER, gbGrat)
    gl.enableVertexAttribArray(gpGratAP)
    gl.vertexAttribPointer(gpGratAP, 3, gl.FLOAT, false, 0, 0)
    gl.uniform2f(guGrat.uRes ?? null, glCv.width, glCv.height)
    gl.uniform1f(guGrat.uR ?? null, R * gDpr)
    gl.uniform1f(guGrat.uYaw ?? null, gYaw)
    gl.uniform1f(guGrat.uPitch ?? null, gPitch)
    gl.drawArrays(gl.LINES, 0, gGratCnt)

    gl.useProgram(gpCst)
    gl.bindBuffer(gl.ARRAY_BUFFER, gbCst)
    gl.enableVertexAttribArray(gpCstAP0)
    gl.vertexAttribPointer(gpCstAP0, 3, gl.FLOAT, false, 32, 0)
    gl.enableVertexAttribArray(gpCstAP1)
    gl.vertexAttribPointer(gpCstAP1, 3, gl.FLOAT, false, 32, 12)
    gl.enableVertexAttribArray(gpCstASE)
    gl.vertexAttribPointer(gpCstASE, 2, gl.FLOAT, false, 32, 24)
    gl.uniform2f(guCst.uRes ?? null, glCv.width, glCv.height)
    gl.uniform1f(guCst.uR ?? null, R * gDpr)
    gl.uniform1f(guCst.uYaw ?? null, gYaw)
    gl.uniform1f(guCst.uPitch ?? null, gPitch)
    gl.uniform1f(guCst.uHalfW ?? null, 3.8 * gDpr)
    gl.drawArrays(gl.TRIANGLES, 0, gCstCnt)
  }

  if (!gCtx) return
  gCtx.clearRect(0, 0, gW, gH)
  gmCy = Math.cos(gYaw)
  gmSy = Math.sin(gYaw)
  gmCx = Math.cos(gPitch)
  gmSx = Math.sin(gPitch)
  const isLt = lightVal > 0.5

  for (let i = gArcs.length - 1; i >= 0; i--) {
    const a = gArcs[i]!
    a.prog += dt * a.speed
    if (a.prog >= 1 && !a.arrived) {
      a.arrived = true
      a.to.hit = 1.0
      gRips.push({ c: a.to, age: 0, gold: a.gold })
    }
    if (a.prog >= 1.4) {
      gArcs.splice(i, 1)
      continue
    }
    const hd = Math.min(1, a.prog)
    const tl = Math.max(0, a.prog - 0.55)
    const i0 = Math.floor(tl * GSEGS)
    const i1 = Math.min(GSEGS, Math.ceil(hd * GSEGS))
    const fd = a.prog > 1 ? Math.max(0, 1 - (a.prog - 1) / 0.4) : 1

    gCtx.beginPath()
    let st = false
    let hx = 0
    let hy = 0
    let hVis = false
    let px = 0
    let py = 0
    let hp = false
    for (let k = i0; k <= i1; k++) {
      gProj(a.pts[k * 3]!, a.pts[k * 3 + 1]!, a.pts[k * 3 + 2]!)
      const sx = cx + grx * R
      const sy = cy + gry * R
      const beh = grz < 0 && grx * grx + gry * gry < 0.99
      if (!beh) {
        if (!st) {
          gCtx.moveTo(sx, sy)
          st = true
        } else {
          gCtx.lineTo(sx, sy)
        }
        if (k === i1) {
          hx = sx
          hy = sy
          hVis = true
        }
      } else {
        st = false
      }
      if (k === i1 - 1) {
        px = sx
        py = sy
        hp = true
      }
    }
    gCtx.lineWidth = 3.5
    gCtx.strokeStyle = a.gold
      ? `rgba(251,191,36,${(0.24 * fd).toFixed(2)})`
      : `rgba(${isLt ? '2,132,199' : '56,189,248'},${(0.26 * fd).toFixed(2)})`
    gCtx.stroke()
    gCtx.lineWidth = 1.55
    gCtx.strokeStyle = a.gold
      ? `rgba(${isLt ? '245,158,11' : '253,224,71'},${(0.94 * fd).toFixed(2)})`
      : `rgba(${isLt ? '56,189,248' : '125,224,255'},${(0.94 * fd).toFixed(2)})`
    gCtx.stroke()

    if (hVis && a.prog < 1.04) {
      const sp = a.gold ? gSpGold : gSpCyan
      if (sp) gCtx.drawImage(sp, hx - 10, hy - 10, 20, 20)
      if (hp) {
        const ag = Math.atan2(hy - py, hx - px)
        const sz = 5.5
        gCtx.fillStyle = a.gold ? '#FEF08A' : '#E0F2FE'
        gCtx.beginPath()
        gCtx.moveTo(hx + Math.cos(ag) * sz * 1.15, hy + Math.sin(ag) * sz * 1.15)
        gCtx.lineTo(hx + Math.cos(ag + 2.45) * sz, hy + Math.sin(ag + 2.45) * sz)
        gCtx.lineTo(hx + Math.cos(ag - 2.45) * sz, hy + Math.sin(ag - 2.45) * sz)
        gCtx.closePath()
        gCtx.fill()
      }
    }
  }

  for (let i = gRips.length - 1; i >= 0; i--) {
    const rp = gRips[i]!
    rp.age += dt
    if (rp.age > 1.2) {
      gRips.splice(i, 1)
      continue
    }
    gProj(rp.c.x, rp.c.y, rp.c.z)
    if (grz < 0) continue
    const u = rp.age / 1.2
    const rad = 0.018 + u * 0.11
    const al = (1 - u) * 0.85
    gCtx.strokeStyle = rp.gold ? `rgba(253,224,71,${al.toFixed(2)})` : `rgba(125,224,255,${al.toFixed(2)})`
    gCtx.lineWidth = 1.35
    gCtx.beginPath()
    for (let s = 0; s <= 10; s++) {
      const ag = (s / 10) * Math.PI * 2
      const ca = Math.cos(ag) * rad
      const sa = Math.sin(ag) * rad
      const wx = rp.c.x + rp.c.ex * ca + rp.c.nx * sa
      const wy = rp.c.y + rp.c.ny * sa
      const wz = rp.c.z + rp.c.ez * ca + rp.c.nz * sa
      const l = Math.hypot(wx, wy, wz)
      gProj(wx / l, wy / l, wz / l)
      const sx = cx + grx * R
      const sy = cy + gry * R
      if (s === 0) gCtx.moveTo(sx, sy)
      else gCtx.lineTo(sx, sy)
    }
    gCtx.stroke()
  }

  const drawn: Array<[number, number]> = []
  for (const c of GCOUNTRIES) {
    if (c.hit > 0) c.hit = Math.max(0, c.hit - dt * 1.1)
    gProj(c.x, c.y, c.z)
    if (grz < 0.15) continue
    const sx = cx + grx * R
    const sy = cy + gry * R
    const al = Math.round(Math.min(1, (grz - 0.15) * 2.5) * 20) / 20
    const pr = 2.6 + c.hit * 1.8
    gCtx.fillStyle = c.hit > 0.2 ? '#FDE047' : `rgba(125,224,255,${al})`
    gCtx.beginPath()
    gCtx.arc(sx, sy, pr, 0, Math.PI * 2)
    gCtx.fill()
    gCtx.strokeStyle =
      c.hit > 0.2 ? `rgba(253,224,71,${Math.round(al * 14) / 20})` : `rgba(56,189,248,${Math.round(al * 9) / 20})`
    gCtx.lineWidth = 1
    gCtx.beginPath()
    gCtx.arc(sx, sy, pr + 3.2, 0, Math.PI * 2)
    gCtx.stroke()
    if (grz > 0.22) {
      let cl = false
      for (let j = 0; j < drawn.length; j++) {
        if (Math.abs(sx - drawn[j]![0]) < 84 && Math.abs(sy - drawn[j]![1]) < 20) {
          cl = true
          break
        }
      }
      if (!cl) {
        drawn.push([sx, sy])
        const la = Math.min(1, (grz - 0.22) * 2.8) * (0.9 + c.hit * 0.1)
        gCtx.lineWidth = 3.2
        gCtx.strokeStyle = `rgba(2,8,24,${(la * 0.92).toFixed(2)})`
        gCtx.strokeText(c.name, sx + 8, sy)
        gCtx.fillStyle = c.hit > 0.35 ? `rgba(254,240,138,${la.toFixed(2)})` : `rgba(255,255,255,${la.toFixed(2)})`
        gCtx.fillText(c.name, sx + 8, sy)
      }
    }
  }
}

function startLoop() {
  if (running || props.paused || document.hidden || !gl) return
  if (reduceMotion) {
    renderHeroGlobe(0, themeStore.isWhite ? 1.0 : 0.0)
    return
  }
  running = true
  const tStart = performance.now()
  let last = tStart
  lastDrawTime = tStart
  const tick = (now: number) => {
    if (!running || props.paused || document.hidden) {
      running = false
      return
    }
    const dt = Math.min(0.06, (now - last) / 1000)
    last = now
    frameCount++
    if (!ecoTier && now - tStart > 1600) {
      if (dt > 0.032) slowStreak++
      else slowStreak = Math.max(0, slowStreak - 1)
      if (slowStreak >= 12) {
        ecoTier = true
        resizeGlobe()
      }
    }
    const minInterval = gDrag ? 0 : ecoTier ? 31 : 18
    if (now - lastDrawMs >= minInterval) {
      const renderDt = Math.min(0.08, (now - lastDrawTime) / 1000)
      lastDrawMs = now
      lastDrawTime = now
      renderHeroGlobe(renderDt, themeStore.isWhite ? 1.0 : 0.0)
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function onContextLost(e: Event) {
  e.preventDefault()
  stopLoop()
}

function stopLoop() {
  running = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function onPointerDown(e: PointerEvent) {
  gDrag = true
  dragMoved = false
  gPX = e.clientX
  gPY = e.clientY
  gVYaw = 0
  gVPitch = 0
}

function onPointerMove(e: PointerEvent) {
  if (!gDrag) return
  const dx = e.clientX - gPX
  const dy = e.clientY - gPY
  if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true
  gPX = e.clientX
  gPY = e.clientY
  const dyaw = dx * 0.006
  const dp = dy * 0.005
  gYaw += dyaw
  gPitch = clamp(gPitch + dp, -1.05, 1.05)
  gVYaw = dyaw * 0.6
  gVPitch = dp * 0.6
}

function onPointerUp() {
  gDrag = false
}

function onClick(e: MouseEvent) {
  if (dragMoved || !ovCanvasRef.value) return
  const rc = ovCanvasRef.value.getBoundingClientRect()
  const lx = e.clientX - rc.left
  const ly = e.clientY - rc.top
  const cx = gW * 0.5
  const cy = gH * 0.5
  const R = Math.min(gW, gH) * 0.415
  gmCy = Math.cos(gYaw)
  gmSy = Math.sin(gYaw)
  gmCx = Math.cos(gPitch)
  gmSx = Math.sin(gPitch)
  let best: CountryHub | null = null
  let bd = 26
  for (const c of GCOUNTRIES) {
    gProj(c.x, c.y, c.z)
    if (grz > 0.1) {
      const d = Math.hypot(lx - (cx + grx * R), ly - (cy + gry * R))
      if (d < bd) {
        bd = d
        best = c
      }
    }
  }
  if (best) {
    spawnGArc(best)
    gRips.push({ c: best, age: 0, gold: false })
  }
}

function onVisibility() {
  if (document.hidden) stopLoop()
  else startLoop()
}

onMounted(() => {
  const glCv = glCanvasRef.value
  const hudCv = ovCanvasRef.value
  if (!glCv || !hudCv) return

  gSpCyan = makeSprite('rgba(125,224,255,.95)', 'rgba(0,155,255,.26)')
  gSpGold = makeSprite('rgba(253,224,71,.95)', 'rgba(249,115,22,.26)')

  gl = glCv.getContext('webgl', {
    alpha: true,
    antialias: !lowGpu,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: lowGpu ? 'low-power' : 'default',
  })
  gCtx = hudCv.getContext('2d')
  if (!gl) return

  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  const ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : ''
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(ren)) {
    lowGpu = true
    ecoTier = true
  }
  glCv.addEventListener('webglcontextlost', onContextLost)

  gpSph = mkG(VS_SPH, FS_SPH)
  gpGrat = mkG(VS_GRAT, FS_GRAT)
  gpCst = mkG(VS_CST, FS_CST)
  if (!gpSph || !gpGrat || !gpCst) return

  gbQuad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, gbQuad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gpSphLoc = gl.getAttribLocation(gpSph, 'p')
  ;['uRes', 'uR', 'uLight'].forEach((k) => {
    guSph[k] = gl!.getUniformLocation(gpSph!, k)
  })

  const gr: number[] = []
  for (let la = -60; la <= 60; la += 30) {
    for (let i = 0; i < 44; i++) {
      const a = gLL2XYZ((i / 44) * 360, la)
      const b = gLL2XYZ(((i + 1) / 44) * 360, la)
      gr.push(...a, ...b)
    }
  }
  for (let lo = 0; lo < 180; lo += 30) {
    for (let i = 0; i < 32; i++) {
      const a = gLL2XYZ(lo, -82 + (i / 32) * 164)
      const b = gLL2XYZ(lo, -82 + ((i + 1) / 32) * 164)
      gr.push(...a, ...b)
    }
  }
  gGratCnt = gr.length / 3
  gbGrat = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, gbGrat)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gr), gl.STATIC_DRAW)
  gpGratAP = gl.getAttribLocation(gpGrat, 'aP')
  ;['uRes', 'uR', 'uYaw', 'uPitch'].forEach((k) => {
    guGrat[k] = gl!.getUniformLocation(gpGrat!, k)
  })

  // Build quad-extruded coastline segments from GLOBE_POLYS ([lon, lat][])
  const segs: number[] = []
  for (const poly of GLOBE_POLYS) {
    const n = poly.length
    for (let i = 0; i < n; i++) {
      const p0 = poly[i]
      const p1 = poly[(i + 1) % n]
      if (!p0 || !p1) continue
      const a = gLL2XYZ(p0[0] ?? 0, p0[1] ?? 0)
      const b = gLL2XYZ(p1[0] ?? 0, p1[1] ?? 0)
      if ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 > 0.25) continue
      const pv = (s: number, e: number) => segs.push(a[0], a[1], a[2], b[0], b[1], b[2], s, e)
      pv(-1, 0)
      pv(1, 0)
      pv(1, 1)
      pv(-1, 0)
      pv(1, 1)
      pv(-1, 1)
    }
  }
  gCstCnt = segs.length / 8
  gbCst = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, gbCst)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segs), gl.STATIC_DRAW)
  gpCstAP0 = gl.getAttribLocation(gpCst, 'aP0')
  gpCstAP1 = gl.getAttribLocation(gpCst, 'aP1')
  gpCstASE = gl.getAttribLocation(gpCst, 'aSE')
  ;['uRes', 'uR', 'uYaw', 'uPitch', 'uHalfW'].forEach((k) => {
    guCst[k] = gl!.getUniformLocation(gpCst!, k)
  })

  for (let i = 0; i < 4; i++) {
    spawnGArc()
    if (gArcs[i]) gArcs[i]!.prog = i * 0.18
  }
  if (!reduceMotion) {
    arcTimerId = window.setInterval(() => {
      if (!props.paused && !document.hidden) spawnGArc()
    }, 1200)
  }

  resizeGlobe()
  window.addEventListener('resize', resizeGlobe, { passive: true })
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (gCtx) {
        gCtx.font = '700 13.5px Pretendard Variable, Pretendard, system-ui, sans-serif'
        gCtx.textBaseline = 'middle'
      }
    })
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerUp)
  document.addEventListener('visibilitychange', onVisibility)
  startLoop()
})

watch(
  () => props.paused,
  (p) => {
    if (p) stopLoop()
    else startLoop()
  },
)

onBeforeUnmount(() => {
  stopLoop()
  glCanvasRef.value?.removeEventListener('webglcontextlost', onContextLost)
  if (arcTimerId) clearInterval(arcTimerId)
  window.removeEventListener('resize', resizeGlobe)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('visibilitychange', onVisibility)
  if (gl) {
    if (gbQuad) gl.deleteBuffer(gbQuad)
    if (gbGrat) gl.deleteBuffer(gbGrat)
    if (gbCst) gl.deleteBuffer(gbCst)
    if (gpSph) gl.deleteProgram(gpSph)
    if (gpGrat) gl.deleteProgram(gpGrat)
    if (gpCst) gl.deleteProgram(gpCst)
  }
  gl = null
  gCtx = null
})
</script>

<template>
  <div
    ref="stageRef"
    id="heroGlobe"
    class="globe-box"
    aria-label="글로벌 IT 공식 DB 3D 지구본"
  >
    <canvas ref="glCanvasRef" id="globeGl" />
    <canvas
      ref="ovCanvasRef"
      id="globeHud"
      @pointerdown="onPointerDown"
      @click="onClick"
    />
  </div>
</template>

<style scoped>
.globe-box {
  position: relative;
  width: 100%;
  height: clamp(430px, 58vh, 570px);
  overflow: visible;
  background: transparent;
}

.globe-box canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: transparent;
}

#globeHud {
  cursor: grab;
  touch-action: none;
}

#globeHud:active {
  cursor: grabbing;
}
</style>

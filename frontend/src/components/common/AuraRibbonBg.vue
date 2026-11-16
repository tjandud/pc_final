<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    scrollUv?: number
    paused?: boolean
  }>(),
  {
    scrollUv: 0,
    paused: false,
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const themeStore = useThemeStore()

let rafId = 0
let gl: WebGLRenderingContext | null = null
let ribProg: WebGLProgram | null = null
let ptsProg: WebGLProgram | null = null
let quadBuf: WebGLBuffer | null = null
let ptBuf: WebGLBuffer | null = null
let ptCount = 0

let ribLoc = -1
let ptsLoc = -1
const uRib: Record<string, WebGLUniformLocation | null> = {}
const uPts: Record<string, WebGLUniformLocation | null> = {}

let targetScroll = props.scrollUv
let currentScroll = props.scrollUv
let running = false
const devMem = typeof navigator !== 'undefined' ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) : 8
let lowGpu = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || devMem <= 4
let ecoTier = lowGpu
let frameCount = 0
let dprScale = 1
let slowStreak = 0
let lastDrawMs = 0
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const THEMES = {
  dark: { A: [0.0, 0.48, 1.0], B: [0.16, 0.78, 1.0], bg: [0.02, 0.027, 0.039], light: 0 },
  white: { A: [0.0, 0.36, 0.88], B: [0.05, 0.56, 0.96], bg: [0.929, 0.949, 0.976], light: 1 },
}
const TC = {
  A: (themeStore.isWhite ? THEMES.white.A : THEMES.dark.A).slice(),
  B: (themeStore.isWhite ? THEMES.white.B : THEMES.dark.B).slice(),
  bg: (themeStore.isWhite ? THEMES.white.bg : THEMES.dark.bg).slice(),
  light: themeStore.isWhite ? 1 : 0,
}
let themeLerp = false

const COMMON = `precision mediump float;
float h1(float n){return fract(sin(n*91.345)*47453.5453);}
float spineX(float wy){
  float c=(.14+1.95*wy*wy)*exp(-wy*wy*1.75);
  float w=.36*sin(wy*1.75+.1)+.10*cos(wy*3.1);
  float tail=max(0.,-wy-.12);
  return c+w*(1.-exp(-(tail*tail)*3.));
}`

const VS_RIB = `precision mediump float;
attribute vec2 p;
void main(){
  gl_Position=vec4(p,0.,1.);
}`

const FS_RIB = `${COMMON}
uniform vec2 uR;
uniform vec3 uA,uB,uBg;
uniform float uT,uScroll,uIntro,uLight;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uR)/uR.y;
  float wy=uv.y-uScroll*.58;
  float sx=spineX(wy),dx=(spineX(wy+.025)-spineX(wy-.025))*20.;
  float invN=inversesqrt(1.+dx*dx),qy=(uv.x-sx)*invN,qx=wy*1.25;
  float t=uT,asp=uR.x/uR.y,reach=uIntro*(asp+1.5);
  float vis=(1.-smoothstep(reach-.9,reach,length(gl_FragCoord.xy/uR.y-vec2(asp,1.))))*smoothstep(0.,.1,uIntro);
  float tw=cos(qx*.95+t*.14+.5),env=.26+.74*abs(tw);
  float heroHot=exp(-pow(wy+.10,2.)*12.),spread=(.20+.10*(1.-exp(-wy*wy*.75)))*(1.-.55*heroHot);
  float Ia=0.,Ib=0.,Ic=0.,minW=1.15/uR.y;
  for(int i=0;i<8;i++){
    float fi=float(i)/7.,hi=h1(float(i)+1.3);
    float y=(fi-.5)*spread*tw+.32*(.11*sin(qx*1.5+t*.24+fi*2.2)+.05*sin(qx*3.2-t*.32+hi*6.28))*(1.-.55*heroHot);
    float d=abs(qy-y),w=max(minW,.0009+.0015*hi);
    float core=smoothstep(w*1.9,0.,d),glow=w*2.2/(d+.0065);
    float flow=.5+.5*sin(qx*1.3-t*(.3+.38*hi)+fi*6.28);
    float I=(core*1.55+glow*.82)*(.48+.52*flow),sb=step(.58,hi);
    Ia+=I*(1.-sb);Ib+=I*sb;Ic+=core*.72*(.48+.52*flow);
  }
  float bright=mix(.84,.72,1.-exp(-wy*wy*1.5));
  Ia*=.78;Ib*=.78;Ic*=.82;
  float sp2=spread*env,band=exp(-qy*qy/(sp2*sp2*.55+.004));
  float n=.52+.48*sin(qx*1.8-t*.12)*cos(qy*4.5+t*.09),m=.5+.5*sin(qx*2.4+qy*3.1+t*.1);
  float caustic=heroHot*exp(-qy*qy/.0016)*.72;
  float H=band*n*.72;
  Ia+=H*.85*(1.-m)+caustic;Ib+=H*.65*m+caustic*.6;Ic+=caustic*.82;
  float k=vis*bright;Ia*=k;Ib*=k;Ic*=k;
  float vig=smoothstep(1.35,.22,length(uv*vec2(.8,1.)));
  vec3 dk=uA*Ia+uB*Ib+vec3(1.)*Ic;dk=1.-exp(-dk*1.12);dk=dk*mix(.52,1.,vig)+uBg;
  vec3 ab=((1.-uA)*Ia+(1.-uB)*Ib)*mix(1.,.36,uLight);
  gl_FragColor=vec4(mix(dk,uBg*exp(-ab*.92*mix(.7,1.,vig)),uLight),1.);
}`

const VS_PTS = `${COMMON}
attribute vec4 aS;
uniform vec2 uR;
uniform float uT,uScroll,uIntro,uDpr;
varying float vKind,vHue,vAlpha;
void main(){
  float asp=uR.x/uR.y,yCam=uScroll*.58;
  vKind=aS.w;vHue=aS.y;
  float wy,uvx;
  if(aS.w<1.5){
    float spd=aS.w<.5?(.055+.085*aS.y):(.018+.025*aS.y);
    float wBase=aS.x*1.32-uT*spd;
    wy=yCam+(fract((wBase-yCam)/1.32+.5)-.5)*1.32;
    float sx=spineX(wy),dx=(spineX(wy+.025)-spineX(wy-.025))*20.;
    float invN=max(.36,inversesqrt(1.+dx*dx)),qx=wy*1.25;
    float tw=cos(qx*.95+uT*.14+.5),heroHot=exp(-pow(wy+.10,2.)*12.);
    float spread=(.20+.10*(1.-exp(-wy*wy*.75)))*(1.-.55*heroHot);
    float wave=.32*(.11*sin(qx*1.5+uT*.24+aS.z*2.2)+.05*sin(qx*3.2-uT*.32+aS.y*6.28))*(1.-.55*heroHot);
    float lanew=aS.w<.5?(aS.z-.5)*spread*1.45*tw:(aS.z-.5)*spread*3.2;
    float qy=lanew+wave;
    uvx=sx+qy/invN;
    float edgeFade=smoothstep(.66,.46,abs(wy-yCam));
    vAlpha=edgeFade*(aS.w<.5?(.45+.55*sin(uT*3.2+aS.y*25.)):(.16+.16*sin(uT*1.2+aS.y*15.)));
    gl_PointSize=(aS.w<.5?(2.4+3.6*aS.z):(14.+24.*aS.y))*uDpr;
  }else{
    wy=yCam+(aS.x-.5)*1.08;
    uvx=(aS.z-.5)*asp*1.05;
    vAlpha=(.18+.42*(.5+.5*sin(uT*1.9+aS.y*28.)));
    gl_PointSize=(1.8+2.0*aS.y)*uDpr;
  }
  float uvy=wy-yCam;
  float reach=uIntro*(asp+1.5);
  float vis=(1.-smoothstep(reach-.9,reach,length(vec2((uvx/asp+.5)*asp,uvy+.5)-vec2(asp,1.))))*smoothstep(0.,.1,uIntro);
  vAlpha*=vis;
  gl_Position=vec4(2.*uvx/asp,2.*uvy,0.,1.);
}`

const FS_PTS = `precision mediump float;
uniform vec3 uA,uB;
uniform float uLight;
varying float vKind,vHue,vAlpha;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.)discard;
  float core=smoothstep(1.,0.,d);
  float alpha=vKind<1.5?(vKind<.5?pow(core,1.7):smoothstep(1.,.15,d)*.35):pow(core,2.2);
  alpha*=vAlpha;
  vec3 tint=mix(uA,uB,vHue);
  vec3 dk=mix(tint,vec3(1.),vKind<.5?core*.78:0.);
  vec3 lt=mix(uB,uA,.7);
  float lMul=vKind<.5?.5:.24;
  vec3 col=mix(dk,lt,uLight);
  gl_FragColor=vec4(col,alpha*mix(1.,lMul,uLight));
}`

function mkProgram(vsSrc: string, fsSrc: string): WebGLProgram | null {
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const o = gl!.createShader(type)
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

function resize() {
  const c = canvasRef.value
  if (!c || !gl) return
  const sc = ecoTier ? 0.42 : 0.66
  const maxW = ecoTier ? 480 : 940
  const w = Math.min(Math.round(window.innerWidth * sc), maxW)
  const h = Math.max(180, Math.round(w * (window.innerHeight / Math.max(1, window.innerWidth))))
  if (c.width !== w || c.height !== h) {
    c.width = w
    c.height = h
    dprScale = w / Math.max(1, window.innerWidth)
    gl.viewport(0, 0, w, h)
  }
}

function drawFrameOnce(t: number, easeIntro: number) {
  const c = canvasRef.value
  if (!c || !gl || !ribProg || !ptsProg) return

  gl.disable(gl.BLEND)
  gl.useProgram(ribProg)
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
  gl.enableVertexAttribArray(ribLoc)
  gl.vertexAttribPointer(ribLoc, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(uRib.uR ?? null, c.width, c.height)
  gl.uniform3fv(uRib.uA ?? null, TC.A)
  gl.uniform3fv(uRib.uB ?? null, TC.B)
  gl.uniform3fv(uRib.uBg ?? null, TC.bg)
  gl.uniform1f(uRib.uT ?? null, t)
  gl.uniform1f(uRib.uScroll ?? null, currentScroll * 2.2)
  gl.uniform1f(uRib.uIntro ?? null, easeIntro)
  gl.uniform1f(uRib.uLight ?? null, TC.light)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, TC.light > 0.5 ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE)
  gl.useProgram(ptsProg)
  gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf)
  gl.enableVertexAttribArray(ptsLoc)
  gl.vertexAttribPointer(ptsLoc, 4, gl.FLOAT, false, 0, 0)
  gl.uniform2f(uPts.uR ?? null, c.width, c.height)
  gl.uniform3fv(uPts.uA ?? null, TC.A)
  gl.uniform3fv(uPts.uB ?? null, TC.B)
  gl.uniform1f(uPts.uT ?? null, t)
  gl.uniform1f(uPts.uScroll ?? null, currentScroll * 2.2)
  gl.uniform1f(uPts.uIntro ?? null, easeIntro)
  gl.uniform1f(uPts.uLight ?? null, TC.light)
  gl.uniform1f(uPts.uDpr ?? null, Math.max(0.85, dprScale))
  gl.drawArrays(gl.POINTS, 0, ptCount)
}

function startLoop() {
  if (running || props.paused || document.hidden || !gl || !ribProg || !ptsProg) return
  if (reduceMotion) {
    drawFrameOnce(0, 1)
    return
  }
  running = true
  const start = performance.now()
  let lastNow = start
  const frame = (now: number) => {
    if (!running || !gl || !ribProg || !ptsProg || props.paused || document.hidden) {
      running = false
      return
    }
    const c = canvasRef.value
    if (!c) {
      running = false
      return
    }
    const dt = Math.min(0.06, (now - lastNow) / 1000)
    lastNow = now
    frameCount++
    const t = (now - start) / 1000
    const easeIntro = 1 - Math.pow(1 - Math.min(1, (t + 0.4) / 1.8), 3)

    // Continuously monitor sustained slow frames (handles battery unplug & thermal throttling)
    if (!ecoTier && t > 1.5) {
      if (dt > 0.032) slowStreak++
      else slowStreak = Math.max(0, slowStreak - 1)
      if (slowStreak >= 12) {
        ecoTier = true
        resize()
      }
    }

    currentScroll += (targetScroll - currentScroll) * 0.14

    if (themeLerp) {
      const th = themeStore.isWhite ? THEMES.white : THEMES.dark
      const f = 1 - Math.exp(-5.5 * dt)
      let done = true
      ;(['A', 'B', 'bg'] as const).forEach((k) => {
        TC[k] = TC[k].map((x, j) => {
          const target = th[k][j] ?? 0
          const n = x + (target - x) * f
          if (Math.abs(n - target) > 0.002) done = false
          return n
        })
      })
      TC.light = TC.light + (th.light - TC.light) * f
      if (Math.abs(TC.light - th.light) > 0.002) done = false
      if (done) {
        TC.A = th.A.slice()
        TC.B = th.B.slice()
        TC.bg = th.bg.slice()
        TC.light = th.light
        themeLerp = false
      }
    }

    const activeTransition = themeLerp || Math.abs(targetScroll - currentScroll) > 0.004
    const minInterval = ecoTier ? 31 : 18
    if (activeTransition || now - lastDrawMs >= minInterval) {
      lastDrawMs = now
      drawFrameOnce(t, easeIntro)
    }

    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)
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

function onVisibility() {
  if (document.hidden) stopLoop()
  else startLoop()
}

onMounted(() => {
  const c = canvasRef.value
  if (!c) return
  gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) return

  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  const ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : ''
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(ren)) {
    lowGpu = true
    ecoTier = true
  }
  c.addEventListener('webglcontextlost', onContextLost)

  ribProg = mkProgram(VS_RIB, FS_RIB)
  ptsProg = mkProgram(VS_PTS, FS_PTS)
  if (!ribProg || !ptsProg) return

  quadBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  ribLoc = gl.getAttribLocation(ribProg, 'p')
  ;['uR', 'uA', 'uB', 'uBg', 'uT', 'uScroll', 'uIntro', 'uLight'].forEach((n) => {
    uRib[n] = gl!.getUniformLocation(ribProg!, n)
  })

  const arr: number[] = []
  let seed = 17
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let i = 0; i < 105; i++) arr.push(rnd(), rnd(), rnd(), 0)
  for (let i = 0; i < 14; i++) arr.push(rnd(), rnd(), rnd(), 1)
  for (let i = 0; i < 36; i++) arr.push(rnd(), rnd(), rnd(), 2)
  ptCount = arr.length / 4
  ptBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW)
  ptsLoc = gl.getAttribLocation(ptsProg, 'aS')
  ;['uR', 'uA', 'uB', 'uT', 'uScroll', 'uIntro', 'uLight', 'uDpr'].forEach((n) => {
    uPts[n] = gl!.getUniformLocation(ptsProg!, n)
  })

  resize()
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  startLoop()
})

watch(
  () => props.scrollUv,
  (v) => {
    targetScroll = v
  },
)

watch(
  () => themeStore.isWhite,
  () => {
    themeLerp = true
  },
)

watch(
  () => props.paused,
  (p) => {
    if (p) stopLoop()
    else startLoop()
  },
)

onBeforeUnmount(() => {
  stopLoop()
  canvasRef.value?.removeEventListener('webglcontextlost', onContextLost)
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
  if (gl) {
    if (quadBuf) gl.deleteBuffer(quadBuf)
    if (ptBuf) gl.deleteBuffer(ptBuf)
    if (ribProg) gl.deleteProgram(ribProg)
    if (ptsProg) gl.deleteProgram(ptsProg)
  }
  gl = null
})
</script>

<template>
  <canvas ref="canvasRef" id="aura" class="aura-ribbon-canvas" aria-hidden="true" />
</template>

<style scoped>
.aura-ribbon-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  display: block;
}
</style>

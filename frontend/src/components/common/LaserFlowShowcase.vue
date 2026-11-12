<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Sparkles, Zap, Sliders, X, RotateCcw, Smartphone, Wifi, Battery, Radio } from 'lucide-vue-next'
import type { ProductSummaryRecord } from '@/types/api'
import TechIcon from '@/components/common/TechIcon.vue'

const props = defineProps<{
  product?: ProductSummaryRecord | null
  interactiveControls?: boolean
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const cardRef = ref<HTMLDivElement | null>(null)

// Control panel state
const panelOpen = ref(false)
const toastMsg = ref<string | null>(null)
let toastTimer: number | null = null

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMsg.value = null
  }, 2400)
}

// Shader settings
const settings = ref({
  beamPosition: 0.5,
  intensity: 1.8,
  beamWidth: 1.5,
  flare: 1.5,
  spread: 1.5,
  spill: 1.0,
  fog: 0.22,
  dust: 1.6,
  speed: 1.5,
  color: '#3847ff',
})

const colorThemes = [
  { name: 'Electric Blue', hex: '#3847ff' },
  { name: 'Cyber Cyan', hex: '#05ffa1' },
  { name: 'Neon Pink', hex: '#ff2a6d' },
  { name: 'Deep Purple', hex: '#bd00ff' },
  { name: 'Solar Amber', hex: '#ffaa00' },
]

function setLaserColor(hex: string) {
  settings.value.color = hex
  showToast(`레이저 컬러 변경: ${hex}`)
}

function triggerLaserPulse() {
  state.introTime = 0.5
  showToast('✦ 레이저 펄스 애니메이션 재실행!')
}

function resetDefaults() {
  settings.value.beamPosition = 0.5
  settings.value.intensity = 1.8
  settings.value.beamWidth = 1.5
  settings.value.flare = 1.5
  settings.value.spread = 1.5
  settings.value.spill = 1.0
  settings.value.fog = 0.22
  settings.value.dust = 1.6
  settings.value.speed = 1.5
  settings.value.color = '#3847ff'
  showToast('레이저 파라미터가 초기화되었습니다.')
}

// WebGL 2.0 Shader Source Code
const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uScale;
uniform float uTime;
uniform float uBeamX;
uniform vec4 uSurface;
uniform float uRadius;
uniform vec3 uIntro;
uniform vec4 uPour;
uniform vec2 uRun;
uniform vec4 uLens;
uniform float uAtmosphere;
uniform vec4 uAmount;
uniform vec4 uShape;
uniform vec4 uExtra;
uniform vec3 uTint[16];

#define BEAM uTint[0]
#define LEFT uTint[1]
#define RIGHT uTint[2]
#define CYAN uTint[3]
#define PINK uTint[4]
#define LILAC uTint[5]
#define SKY uTint[6]
#define PURPLE uTint[7]
#define DEEP uTint[8]
#define MIST uTint[9]
#define NAVY uTint[10]
#define WARM uTint[11]
#define EMBER uTint[12]
#define WHITE uTint[13]
#define HAZE uTint[14]
#define LAVENDER uTint[15]

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

float sq(float x) { return x * x; }

float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 spill(float e, float fall, float strength, float front, float t, out vec3 glow) {
    glow = vec3(0.0);
    if (strength < 0.0005) return vec3(0.0);
    float f = max(fall, 0.0);
    float d = max(e, 0.0);
    float u = d / (6.0 + 0.28 * f);
    float start = smoothstep(-6.0, 12.0, fall);
    float fade = exp(-sq(max(f - 125.0, 0.0) / 40.0));
    float streak = 0.88 + 0.24 * noise(vec2(u * 6.0, f / 22.0 - t * 1.7));
    float bright = pow(strength, 1.5);
    float soft = sqrt(strength);
    float warmth = smoothstep(90.0, 130.0, f);
    vec3 coreK = mix(WHITE, WARM, warmth * exp(-d / 9.0));
    float core = mix(9.0, 2.6, warmth) * exp(-sq(d / (3.5 + 0.04 * f))) * exp(-sq(max(f - 130.0, 0.0) / 38.0));
    float wall = 24.0 * exp(-sq(d / 1.1)) * exp(-sq(max(f - 100.0, 0.0) / 30.0));
    float bandCenter = 0.7 - 0.3 * smoothstep(30.0, 110.0, f);
    float offset = u - bandCenter;
    float decay = (1.05 - bandCenter) / 1.31;
    float profile = offset < 0.0 ? exp(-sq(offset / 0.3)) : exp(-offset / decay);
    profile *= 1.0 - smoothstep(1.0, 1.4, u);
    vec3 bandA = mix(CYAN, PINK, smoothstep(50.0, 75.0, f));
    bandA = mix(bandA, LILAC, smoothstep(100.0, 125.0, f));
    vec3 bandB = mix(SKY, PURPLE, smoothstep(50.0, 75.0, f));
    vec3 fanK = mix(bandA, bandB, smoothstep(0.06, 0.18, offset));
    fanK = mix(fanK, DEEP, smoothstep(0.22, 0.42, offset));
    vec3 thread = WHITE * wall * bright + coreK * core * streak * bright;
    glow += fanK * 4.5 * profile * fade * streak * bright;
    glow += MIST * 0.7 * exp(-max(u - 1.0, 0.0) / 0.9) * smoothstep(0.7, 1.2, u) * fade * soft;
    glow += EMBER * 0.35 * exp(-sq((f - 165.0) / 22.0)) * exp(-d / 25.0) * bright;
    float lag = u * (6.0 + 0.28 * f) * 0.35;
    float reveal = 1.0 - smoothstep(front - 70.0, front + 8.0, f + lag);
    glow *= start * reveal;
    return thread * start * reveal;
}

vec3 easeLight(vec3 light, float amount) {
    return -log(max(1.0 - amount * (1.0 - exp(-light)), vec3(0.0001)));
}

void main() {
    vec2 frag = vec2(gl_FragCoord.x, uResolution.y * uDpr - gl_FragCoord.y) / uDpr;
    vec2 p = frag / uScale;
    float t = uTime;
    float bx = uBeamX / uScale;
    float sl = uSurface.x / uScale;
    float sy = uSurface.y / uScale;
    float sr = uSurface.z / uScale;
    float sb = uSurface.w / uScale;
    float radius = uRadius / uScale;
    float dx = p.x - bx;
    float adx = abs(dx);
    float h = sy - p.y;
    float hp = max(h, 0.0);
    float above = smoothstep(-0.5, 0.5, h);
    float side = smoothstep(-24.0, 24.0, dx);
    vec3 sideK = mix(mix(LAVENDER, LEFT, smoothstep(40.0, 140.0, adx)), RIGHT, side);
    float beamWidth = uShape.x;
    float flare = uShape.y;
    float spread = 250.0 * uShape.z;
    float reachL = max(bx - sl, 1.0);
    float reachR = max(sr - bx, 1.0);
    float reach = dx < 0.0 ? reachL : reachR;
    float layerLen = clamp(0.29 * reach, 20.0, 100.0) * sqrt(uShape.z);
    float run = uRun.x;
    float runMask = 1.0 - smoothstep(run - 34.0, run + 6.0, adx);
    float bead = exp(-sq((adx - run + 16.0) / (18.0 + 0.04 * run))) * uRun.y;
    float flowMask = (1.0 - smoothstep(0.75 * spread, 1.1 * spread, adx)) * runMask;

    float bloom = uIntro.y;
    vec2 center = vec2((sl + sr) * 0.5, (sy + sb) * 0.5);
    vec2 halfSize = vec2((sr - sl) * 0.5, (sb - sy) * 0.5);
    float sd = roundBox(p - center, halfSize, radius);
    float outline = max(sd, 0.0);
    float below = max(p.y - sy - radius, 0.0);
    float hug = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 14.0));
    float hugWide = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 40.0));

    vec3 col = vec3(0.0);
    float breathe = 1.0 + uExtra.x * (0.12 * sin(t * 1.5708) + 0.08 * (noise(vec2(t * 0.5, 3.0)) - 0.5));
    float front = uIntro.x / uScale;
    float drop = smoothstep(front + 10.0, front - 110.0, p.y);
    float falling = 1.0 - smoothstep(sy - 24.0, sy, front);
    float top = mix(0.3, 1.0, smoothstep(0.0, 0.3 * sy, p.y));
    float beamCore = 24.0 * exp(-adx / (2.0 * beamWidth));
    float beamHalo = 1.3 * exp(-adx / (6.0 * beamWidth)) + 0.3 * exp(-adx / (22.0 * beamWidth));
    vec3 haloK = mix(BEAM, sideK, exp(-hp / 80.0));
    col += (BEAM * beamCore + haloK * beamHalo) * top * above * drop;

    float head = exp(-sq((p.y - front) / 24.0)) * falling;
    col += mix(WHITE, BEAM, 0.35) * head * (7.0 * exp(-adx / (2.6 * beamWidth)) + 1.0 * exp(-adx / (14.0 * beamWidth)));

    float psi = adx * (outline + 1.0);
    float rise = max(hp - 17.9 * flare, 0.0);
    float skirtAmp = 16.6 * (exp(-sq(rise / (11.8 * flare))) + 0.3 * exp(-rise / (60.0 * flare)));
    float skirtSpread = mix(134.0, 155.0, side) * breathe * flare * flare * mix(0.35, 1.0, min(bloom, 1.0)) * max(bloom, 1.0);
    float skirt = skirtAmp * exp(-psi / skirtSpread) * exp(-sq(adx / (max(layerLen, 60.0 * sqrt(uShape.z)) * 1.48))) * hug;
    col += sideK * skirt * flowMask * min(bloom, 1.0);

    float layer = 12.0 * exp(-adx / layerLen) * exp(-outline / (0.19 * layerLen)) * (1.0 + 0.4 * bead);
    col += sideK * layer * hug * flowMask * min(bloom, 1.0);
    float washMask = smoothstep(sl - 60.0, sl + 6.0, p.x) * (1.0 - smoothstep(sr - 6.0, sr + 45.0, p.x));
    float wash = 1.4 * exp(-adx / 100.0) * exp(-outline / 30.0);
    col += mix(BEAM, sideK, 0.25) * wash * hugWide * washMask * flowMask * min(bloom, 1.0);

    float sideSign = dx < 0.0 ? 0.0 : 1.0;
    float along = 0.5 * log((hp + 1.0) / (adx + 1.0));
    float lineScale = 6.0;
    float lp = log(max(psi, 1.0) / (120.0 * flare * flare)) * lineScale;
    float lineIndex = floor(lp) + sideSign * 97.0;
    float wobble = 0.22 * (noise(vec2(lineIndex * 3.7, t * 0.4 + along)) - 0.5);
    float lf = fract(lp + wobble) - 0.5;
    float gradient = lineScale * length(vec2(hp + 1.0, adx)) / max(psi, 1.0) / uScale;
    float halfWidth = max(0.35 * gradient, 0.0001);
    float drawWidth = max(halfWidth, 0.6 * gradient);
    float lineShape = exp(-lf * lf / (drawWidth * drawWidth)) * (halfWidth / drawWidth);
    float lineOn = step(0.3, hash(vec2(lineIndex, 1.3)));
    float lineFlow = smoothstep(0.25, 0.85, noise(vec2(lineIndex * 5.3 + 2.0, along * 3.0 + t * 1.1)));
    float flareArea = 120.0 * flare * flare;
    float lineEnvelope = smoothstep(0.85 * flareArea, 1.4 * flareArea, psi) * (1.0 - smoothstep(3.2 * flareArea, 7.5 * flareArea, psi));
    lineEnvelope *= exp(-adx / (layerLen * 1.5)) * hug * flowMask * (1.0 - smoothstep(35.0 * flare, 80.0 * flare, hp));
    float lineBright = mix(0.35, 1.0, hash(vec2(lineIndex, 4.0)));
    col += mix(sideK, WHITE, 0.6) * lineShape * lineOn * lineFlow * lineEnvelope * lineBright * 2.6 * uAmount.w * min(bloom, 1.0);

    float pour = uShape.w;
    float baseline = exp(-sq(130.0 / 150.0));
    float strengthR = exp(-sq(reachR / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachR)) / baseline * pour;
    float strengthL = exp(-sq(reachL / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachL)) / baseline * pour;
    float fallY = p.y - sy - 0.3 * radius;
    float rightHalf = smoothstep(center.x - 4.0, center.x + 4.0, p.x);
    float haloR = exp(-length(p - vec2(sr - 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthR);
    float haloL = exp(-length(p - vec2(sl + 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthL);
    vec3 glowR, glowL;
    col += spill(sd, fallY, strengthR, uPour.y, t, glowR) * rightHalf;
    col += spill(sd, fallY, strengthL, uPour.x, t, glowL) * (1.0 - rightHalf);
    col += easeLight(glowR * rightHalf + NAVY * 0.9 * haloR, uPour.w);
    col += easeLight(glowL * (1.0 - rightHalf) + NAVY * 0.9 * haloL, uPour.z);

    vec2 toLens = frag - uLens.xy;
    float lens = exp(-dot(toLens, toLens) / sq(uLens.z)) * uLens.w;
    col *= 1.0 + 0.35 * lens * hug;

    float fogAmount = uAmount.y * uAtmosphere;
    float near = exp(-adx / 150.0);
    float envelope = near * (0.3 + 0.4 * exp(-hp / 50.0) + 1.2 * exp(-p.y / 120.0));
    if (fogAmount > 0.001 && h > -2.0 && envelope * max(0.25, 6.0 * exp(-adx / 50.0)) > 0.002) {
        vec2 fq = vec2(dx / 1.7, h) / 85.0 + vec2(t * 0.012, -t * 0.03);
        vec2 fw = vec2(fbm(fq * 1.3 + vec2(1.7, 9.2) + t * 0.03), fbm(fq * 1.3 + vec2(8.3, 2.8) - t * 0.025));
        float cloud = fbm(fq + 1.4 * fw);
        float density = smoothstep(0.5, 0.78, cloud);
        float lit = exp(-adx / 50.0);
        float fogMask = smoothstep(-2.0, 20.0, h);
        float reached = smoothstep(front + 80.0, front - 40.0, p.y);
        vec3 fog = (HAZE * 0.45 + BEAM * 6.0 * lit * reached) * density * envelope * fogMask;
        float surfaceLit = exp(-adx / (layerLen * 1.3)) * exp(-outline / 28.0) * hugWide * flowMask * washMask * min(bloom, 1.0);
        fog += sideK * 2.2 * surfaceLit * (smoothstep(0.38, 0.72, cloud) - 0.35) * fogMask;
        float smoke = smoothstep(0.3, 0.75, cloud);
        fog += BEAM * 0.35 * exp(-adx / (22.0 * beamWidth)) * (0.35 + 0.9 * smoke) * fogMask * top * drop;
        col += fog * fogAmount * (1.0 + 1.2 * lens);
    }

    float dustAmount = uAmount.z;
    if (dustAmount > 0.001) {
        float dustLp = log(max(psi, 1.0) / (120.0 * flare * flare)) * 2.2;
        vec2 flowCell = vec2(dustLp / 1.1, (along + t * 0.22) / 0.06);
        vec2 cellId = floor(flowCell) + vec2(sideSign * 131.0, 0.0);
        vec2 cellJitter = vec2(hash(cellId + 1.7), hash(cellId + 8.3));
        vec2 particleFlow = (floor(flowCell) + 0.1 + cellJitter * 0.8) * vec2(1.1, 0.06);
        float particlePsi = 120.0 * flare * flare * exp(particleFlow.x / 2.2);
        float particleAlong = particleFlow.y - t * 0.22;
        float particleX = sqrt(particlePsi * exp(-2.0 * particleAlong)) - 1.0;
        float particleH = sqrt(particlePsi * exp(2.0 * particleAlong)) - 1.0;
        float particleDist = length(vec2(adx - particleX, hp - particleH)) * uScale;
        float particleOn = step(0.62, hash(cellId + 3.1));
        float particleTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(cellId + 9.2) * 6.283);
        float dustZone = exp(-sq(log(max(psi, 1.0) / (200.0 * flare * flare)) / 0.55)) * hug * flowMask * smoothstep(0.0, 6.0, outline);
        col += WHITE * exp(-particleDist * particleDist / 0.3) * particleOn * particleTwinkle * dustZone * 3.0 * dustAmount * min(bloom, 1.0);
    }

    col *= uAmount.x * (1.0 + uIntro.z * 0.9 * exp(-length(vec2(dx, h * 1.6)) / 70.0));
    col *= smoothstep(-0.75, 0.25, sd * uScale);

    vec3 emit = 1.0 - exp(-col);
    float peak = max(emit.r, max(emit.g, emit.b));
    outColor = vec4(emit, peak);
}
`

const TINTS: [number, number][] = [
  [0, 1], [-11.5, 0.77], [9.5, 0.95], [-53.5, 0.79], [39.5, 0.77],
  [16, 0.81], [-16.3, 0.92], [-16.3, 0.96], [3, 1.01], [1, 0.68],
  [1, 1.15], [142.5, 0.51], [113.6, 0.28], [-7.5, 0.13], [-2.7, 0.32], [7.5, 0.81]
]

const BASE_SATURATION = 0.78
const INTRO_DROP = 1.25
const INTRO_END = 5

const clampVal = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const spring = (time: number) => {
  const omega = 8
  const zeta = 0.62
  const damped = omega * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * omega * time) * (Math.cos(damped * time) + ((zeta * omega) / damped) * Math.sin(damped * time))
}

const toHsv = ([r, g, b]: [number, number, number]): [number, number] => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
  }
  return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0]
}

const fromHsv = (hue: number, saturation: number): [number, number, number] => {
  const h = (((hue % 360) + 360) % 360) / 60
  const c = saturation
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = 1 - c
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]
  return [r + m, g + m, b + m]
}

const buildTints = (hex: string) => {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const ctx = probe.getContext('2d')
  if (!ctx) return new Float32Array(TINTS.length * 3)
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  const rgb: [number, number, number] = [r / 255, g / 255, b / 255]

  const [hue, saturation] = toHsv(rgb)
  const strength = saturation / BASE_SATURATION
  const data = new Float32Array(TINTS.length * 3)
  TINTS.forEach(([shift, scale], index) => {
    data.set(fromHsv(hue + shift, clampVal(BASE_SATURATION * scale * strength, 0, 1)), index * 3)
  })
  return data
}

// Internal State
const state = {
  time: 0,
  introTime: 0,
  colorKey: '',
  tints: new Float32Array(TINTS.length * 3),
  pointer: { x: 0, y: 0, inside: false },
  lens: { x: 0, y: 0, vx: 0, vy: 0, strength: 0, placed: false },
}

let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let vao: WebGLVertexArrayObject | null = null
let buffer: WebGLBuffer | null = null
let uniforms: Record<string, WebGLUniformLocation | null> = {}
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = true

function initWebGL() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
  })
  if (!gl) return

  const compile = (type: number, src: string) => {
    const s = gl!.createShader(type)!
    gl!.shaderSource(s, src)
    gl!.compileShader(s)
    return s
  }

  program = gl.createProgram()!
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
  gl.linkProgram(program)

  const uniformNames = [
    'uResolution', 'uDpr', 'uScale', 'uTime', 'uBeamX', 'uSurface',
    'uRadius', 'uIntro', 'uPour', 'uRun', 'uLens', 'uAtmosphere',
    'uAmount', 'uShape', 'uExtra', 'uTint',
  ]
  uniformNames.forEach((name) => {
    uniforms[name] = gl!.getUniformLocation(program!, name)
  })

  vao = gl.createVertexArray()
  buffer = gl.createBuffer()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  state.tints = buildTints(settings.value.color)
  state.colorKey = settings.value.color
}

function handleResize() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas || !gl) return

  const width = Math.max(1, container.clientWidth)
  const height = Math.max(1, container.clientHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr
    canvas.height = height * dpr
  }
}

let lastTime = 0
function animate(now: number) {
  if (!isVisible) {
    animationFrameId = requestAnimationFrame(animate)
    return
  }

  if (!lastTime) lastTime = now
  const dt = Math.min(0.05, (now - lastTime) / 1000)
  lastTime = now

  const container = containerRef.value
  const canvas = canvasRef.value
  const card = cardRef.value

  if (gl && program && container && canvas && card) {
    state.time += dt * settings.value.speed
    if (state.introTime < INTRO_END) {
      state.introTime = Math.min(INTRO_END, state.introTime + dt)
    }

    if (settings.value.color !== state.colorKey) {
      state.colorKey = settings.value.color
      state.tints = buildTints(settings.value.color)
    }

    const width = container.clientWidth
    const height = container.clientHeight
    const scale = Math.max(0.2, Math.min(width / 585, height / 507))

    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const surface = {
      left: cardRect.left - containerRect.left,
      top: cardRect.top - containerRect.top,
      right: cardRect.right - containerRect.left,
      bottom: cardRect.bottom - containerRect.top,
      radius: 36,
    }

    const beamX = settings.value.beamPosition * width
    const dpr = canvas.width / width

    const active = state.pointer.inside
    if (active && !state.lens.placed) {
      state.lens.x = state.pointer.x
      state.lens.y = state.pointer.y
      state.lens.placed = true
    }
    const ax = 120 * (state.pointer.x - state.lens.x) - 19 * state.lens.vx
    const ay = 120 * (state.pointer.y - state.lens.y) - 19 * state.lens.vy
    state.lens.vx += ax * dt
    state.lens.vy += ay * dt
    state.lens.x += state.lens.vx * dt
    state.lens.y += state.lens.vy * dt
    const goal = active ? 1 : 0
    state.lens.strength += (goal - state.lens.strength) * (1 - Math.exp(-dt / (goal > state.lens.strength ? 0.3 : 0.55)))
    if (state.lens.strength < 0.001 && !active) state.lens.placed = false

    const startY = -0.15 * height
    const span = surface.top - startY + 0.3 * height
    const it = state.introTime
    const settled = it >= INTRO_END
    const front = settled ? surface.top + 0.3 * height : startY + span * Math.pow(clampVal(it / INTRO_DROP, 0, 1), 1.3)
    const impact = INTRO_DROP * Math.pow(Math.max(0, surface.top - startY) / span, 1 / 1.3)
    const tau = it - impact
    const bloom = settled ? 1 : tau <= 0 ? 0 : spring(tau)
    const flash = settled || tau <= 0 ? 0 : Math.exp(-tau / 0.35) * (1 - Math.exp(-tau / 0.05))
    const runRange = settings.value.spread * 250 * 1.3 + 80
    const runFront = settled ? 100000 : tau <= 0 ? -40 : runRange * (1 - Math.exp(-1.15 * tau))
    const beadStrength = settled || tau <= 0 ? 0 : Math.exp(-1.15 * tau) * (1 - Math.exp(-tau / 0.08))

    const pour = (reach: number) => {
      if (settled) return [1000, 1]
      if (tau <= 0) return [-reach, 0]
      const target = Math.min(reach, runRange * 0.97)
      const arrival = -Math.log(1 - target / runRange) / 1.15
      const elapsed = tau - arrival
      const ease = clampVal((elapsed + 0.15) / 0.8, 0, 1)
      const fill = ease * ease * ease * (ease * (ease * 6 - 15) + 10)
      if (elapsed <= 0) return [runFront - target, fill]
      const spd = 1.15 * (runRange - target)
      return [spd * elapsed + 260 * elapsed * elapsed, fill]
    }

    const [frontL, fillL] = pour((beamX - surface.left) / scale)
    const [frontR, fillR] = pour((surface.right - beamX) / scale)
    const atmosphere = settled ? 1 : tau <= 0 ? 0.3 * clampVal(it / INTRO_DROP, 0, 1) : 0.3 + 0.7 * (1 - Math.exp(-1.3 * tau))

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    if (uniforms.uResolution) gl.uniform2f(uniforms.uResolution, width, height)
    if (uniforms.uDpr) gl.uniform1f(uniforms.uDpr, dpr)
    if (uniforms.uScale) gl.uniform1f(uniforms.uScale, scale)
    if (uniforms.uTime) gl.uniform1f(uniforms.uTime, state.time)
    if (uniforms.uBeamX) gl.uniform1f(uniforms.uBeamX, beamX)
    if (uniforms.uSurface) gl.uniform4f(uniforms.uSurface, surface.left, surface.top, surface.right, surface.bottom)
    if (uniforms.uRadius) gl.uniform1f(uniforms.uRadius, surface.radius)
    if (uniforms.uIntro) gl.uniform3f(uniforms.uIntro, front, bloom, flash)
    if (uniforms.uPour) gl.uniform4f(uniforms.uPour, frontL, frontR, fillL, fillR)
    if (uniforms.uRun) gl.uniform2f(uniforms.uRun, runFront, beadStrength)
    if (uniforms.uLens) gl.uniform4f(uniforms.uLens, state.lens.x, state.lens.y, 95 * scale, state.lens.strength)
    if (uniforms.uAtmosphere) gl.uniform1f(uniforms.uAtmosphere, atmosphere)
    if (uniforms.uAmount) gl.uniform4f(uniforms.uAmount, settings.value.intensity, settings.value.fog, settings.value.dust, 1.5)
    if (uniforms.uShape) gl.uniform4f(uniforms.uShape, settings.value.beamWidth, settings.value.flare, settings.value.spread, settings.value.spill)
    if (uniforms.uExtra) gl.uniform4f(uniforms.uExtra, 1.5, 1.0, 34.34, 11.58)
    if (uniforms.uTint) gl.uniform3fv(uniforms.uTint, state.tints)

    if (vao) {
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

function onPointerMove(e: PointerEvent) {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  state.pointer.x = x
  state.pointer.y = y
  state.pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
}

function onPointerLeave() {
  state.pointer.inside = false
}

onMounted(() => {
  initWebGL()
  handleResize()

  const container = containerRef.value
  if (container) {
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)

    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)

    intersectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true
    })
    intersectionObserver.observe(container)
  }

  animationFrameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (toastTimer) clearTimeout(toastTimer)

  const container = containerRef.value
  if (container) {
    container.removeEventListener('pointermove', onPointerMove)
    container.removeEventListener('pointerleave', onPointerLeave)
  }

  if (resizeObserver) resizeObserver.disconnect()
  if (intersectionObserver) intersectionObserver.disconnect()

  if (gl) {
    if (vao) gl.deleteVertexArray(vao)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
  }
})

watch(() => props.product, () => {
  // Retrigger light beam pulse on device change
  state.introTime = 0.5
})
</script>

<template>
  <div ref="containerRef" class="laser-card glass-card">
    <!-- WebGL LaserFlow Canvas Overlay (Scoped to Card) -->
    <canvas ref="canvasRef" class="laser-canvas" aria-hidden="true"></canvas>

    <!-- Header bar with title & control toggles -->
    <div class="laser-head">
      <div class="laser-head__info">
        <span class="label tech-mono">REACT BITS × LASERFLOW SHOWCASE</span>
        <h3 class="laser-head__h3">
          <span>{{ product ? product.name : 'Quantum UI Smartphone' }}</span>
          <span class="badge-style tech-mono laser-badge">60FPS WebGL 2.0</span>
        </h3>
      </div>

      <div class="laser-head__actions">
        <!-- Laser Theme Color Switcher -->
        <div class="color-palette" title="레이저 컬러 테마 선택">
          <button
            v-for="c in colorThemes"
            :key="c.hex"
            type="button"
            class="palette-dot"
            :class="{ 'is-active': settings.color === c.hex }"
            :style="{ backgroundColor: c.hex }"
            :title="c.name"
            @click="setLaserColor(c.hex)"
          ></button>
        </div>

        <!-- Retrigger Pulse Button -->
        <button
          type="button"
          class="laser-icon-btn"
          title="레이저 펄스 재실행"
          @click="triggerLaserPulse"
        >
          <Zap :size="14" />
        </button>

        <!-- Toggle Parameter Panel -->
        <button
          v-if="interactiveControls !== false"
          type="button"
          class="laser-icon-btn"
          :class="{ 'is-active': panelOpen }"
          title="레이저 셰이더 상세 컨트롤"
          @click="panelOpen = !panelOpen"
        >
          <Sliders :size="14" />
        </button>
      </div>
    </div>

    <!-- Main Showcase Arena: Smartphone Mockup with Laser Landing Surface -->
    <div class="laser-stage">
      <div ref="cardRef" class="phone-mockup">
        <!-- Phone Speaker Notch / Island -->
        <div class="phone-speaker">
          <div class="phone-speaker__sensor"></div>
        </div>

        <!-- Phone Screen UI Content -->
        <div class="phone-screen">
          <!-- Status Bar -->
          <div class="phone-status-bar tech-mono">
            <span>09:41</span>
            <div class="phone-status-icons">
              <Radio :size="11" />
              <Wifi :size="12" />
              <Battery :size="12" />
            </div>
          </div>

          <!-- Dynamic Screen Content -->
          <div class="phone-content">
            <div class="phone-hero">
              <div class="phone-icon-box">
                <TechIcon v-if="product" :name="product.brand.slug" :size="20" />
                <Smartphone v-else :size="20" />
              </div>

              <div class="phone-titles">
                <span class="phone-category tech-mono">
                  {{ product ? `${product.brand.name} · ${product.category.name}` : 'PHOTONIC ARCHITECTURE' }}
                </span>
                <h4 class="phone-name">
                  {{ product ? product.name : 'Quantum UI' }}
                </h4>
                <p class="phone-desc">
                  {{ product
                    ? `${product.baseModelNumber} · ${product.releaseDate} 출시`
                    : '레이저 빛 입자가 표면과 모서리를 타고 자연스럽게 흘러내리는 WebGL 인터랙티브 쇼케이스'
                  }}
                </p>
              </div>
            </div>

            <!-- Dynamic Telemetry Widget -->
            <div class="phone-widget">
              <div class="phone-widget__top">
                <span class="phone-widget__label">Photon Laser Flow</span>
                <span class="phone-widget__val tech-mono" :style="{ color: settings.color }">99.8%</span>
              </div>
              <div class="phone-widget__bar">
                <div class="phone-widget__fill" :style="{ background: `linear-gradient(90deg, ${settings.color}, #05ffa1)` }"></div>
              </div>
              <div class="phone-widget__spec tech-mono">
                <span>120Hz ProMotion</span>
                <span>•</span>
                <span>HDR10+ Dynamic</span>
              </div>
            </div>

            <!-- Bottom Badge -->
            <div class="phone-foot">
              <span class="phone-foot__badge tech-mono">
                <Sparkles :size="11" />
                <span>TECHCOMPARE × REACT BITS</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Parameter Drawer Overlay -->
    <div v-if="panelOpen" class="laser-drawer glass-card">
      <div class="laser-drawer__head">
        <span class="laser-drawer__title tech-mono">✦ LASERFLOW PARAMETERS</span>
        <button type="button" class="laser-drawer__close" @click="panelOpen = false">
          <X :size="14" />
        </button>
      </div>

      <div class="laser-drawer__body">
        <div class="control-row">
          <div class="control-label">
            <span>빔 위치 (X)</span>
            <span class="tech-mono text-accent">{{ settings.beamPosition.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.beamPosition" type="range" min="0.1" max="0.9" step="0.05" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>빛 강도 (Intensity)</span>
            <span class="tech-mono text-accent">{{ settings.intensity.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.intensity" type="range" min="0.5" max="3.5" step="0.1" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>빔 폭 (Beam Width)</span>
            <span class="tech-mono text-accent">{{ settings.beamWidth.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.beamWidth" type="range" min="0.5" max="3.0" step="0.1" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>코너 흘림 (Corner Spill)</span>
            <span class="tech-mono text-accent">{{ settings.spill.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.spill" type="range" min="0.2" max="2.5" step="0.1" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>스모크/포그 (Atmospheric Fog)</span>
            <span class="tech-mono text-accent">{{ settings.fog.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.fog" type="range" min="0.0" max="0.8" step="0.05" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>글리터 더스트 (Dust Particles)</span>
            <span class="tech-mono text-accent">{{ settings.dust.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.dust" type="range" min="0.2" max="3.0" step="0.1" class="laser-slider" />
        </div>

        <div class="control-row">
          <div class="control-label">
            <span>애니메이션 속도 (Speed)</span>
            <span class="tech-mono text-accent">{{ settings.speed.toFixed(2) }}</span>
          </div>
          <input v-model.number="settings.speed" type="range" min="0.2" max="3.0" step="0.1" class="laser-slider" />
        </div>

        <button type="button" class="btn btn--secondary laser-drawer__reset" @click="resetDefaults">
          <RotateCcw :size="13" />
          <span>기본값 초기화</span>
        </button>
      </div>
    </div>

    <!-- Mini Toast Feedback -->
    <Transition name="toast-fade">
      <div v-if="toastMsg" class="laser-toast tech-mono">
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.laser-card {
  position: relative;
  overflow: hidden;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 440px;
  background: radial-gradient(circle at 50% 0%, rgba(56, 71, 255, 0.08) 0%, rgba(10, 14, 26, 0.7) 100%);
  border: 1px solid var(--card-border);
}

.laser-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.laser-head {
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.laser-head__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.laser-head__h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.laser-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(56, 71, 255, 0.15);
  color: #818cf8;
  border: 1px solid rgba(129, 140, 248, 0.3);
}

.laser-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-palette {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
}

.palette-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  padding: 0;
}

.palette-dot:hover {
  transform: scale(1.2);
}

.palette-dot.is-active {
  border-color: #ffffff;
  transform: scale(1.25);
  box-shadow: 0 0 10px currentColor;
}

.laser-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-sub);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.laser-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-main);
  border-color: var(--accent);
}

.laser-icon-btn.is-active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}

/* Stage Arena */
.laser-stage {
  position: relative;
  z-index: 15;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0 6px;
  perspective: 1000px;
}

/* Phone Mockup */
.phone-mockup {
  position: relative;
  width: 250px;
  height: 340px;
  border-radius: 36px;
  background: #09090d;
  border: 6px solid #202028;
  box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 71, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.phone-mockup:hover {
  transform: translateY(-4px);
}

.phone-speaker {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 14px;
  background: #16161c;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.phone-speaker__sensor {
  width: 32px;
  height: 3px;
  background: #050508;
  border-radius: 999px;
}

.phone-screen {
  flex: 1;
  padding: 24px 14px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, #12131c 0%, #08080c 100%);
  position: relative;
  z-index: 20;
}

.phone-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #94a3b8;
  padding: 0 4px;
}

.phone-status-icons {
  display: flex;
  align-items: center;
  gap: 5px;
}

.phone-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding-top: 8px;
}

.phone-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.phone-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(56, 71, 255, 0.15);
  border: 1px solid rgba(56, 71, 255, 0.35);
  color: #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-category {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #818cf8;
}

.phone-name {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
}

.phone-desc {
  font-size: 10px;
  line-height: 1.35;
  color: #94a3b8;
  max-width: 200px;
}

.phone-widget {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.phone-widget__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}

.phone-widget__label {
  color: #94a3b8;
}

.phone-widget__val {
  font-weight: 700;
}

.phone-widget__bar {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.phone-widget__fill {
  width: 85%;
  height: 100%;
  border-radius: 999px;
}

.phone-widget__spec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8px;
  color: #64748b;
  margin-top: 1px;
}

.phone-foot {
  display: flex;
  justify-content: center;
}

.phone-foot__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Control Drawer Overlay */
.laser-drawer {
  position: absolute;
  inset: 12px;
  z-index: 40;
  padding: 16px;
  border-radius: var(--r-md);
  background: rgba(14, 18, 30, 0.94);
  backdrop-filter: blur(14px);
  border: 1px solid var(--accent);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  animation: drawerSlide 0.2s ease-out;
}

@keyframes drawerSlide {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.laser-drawer__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider);
}

.laser-drawer__title {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
}

.laser-drawer__close {
  background: transparent;
  border: 0;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.laser-drawer__close:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.08);
}

.laser-drawer__body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-sub);
}

.laser-slider {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
  height: 4px;
}

.laser-drawer__reset {
  margin-top: 6px;
  height: 32px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Toast */
.laser-toast {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid var(--accent);
  color: #ffffff;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>

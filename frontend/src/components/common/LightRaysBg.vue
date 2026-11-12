<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    interactive?: boolean
  }>(),
  {
    interactive: true,
  },
)

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { isWhite } = storeToRefs(useThemeStore())

const PIXEL_BUDGET = 2.4e6
const MAX_PULSES = 4

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}
`

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[4];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    float level = clamp(light * 0.78, 0.0, 1.0);
    vec3 skyTint = mix(vec3(0.04, 0.52, 1.0), vec3(0.22, 0.76, 1.0), near);
    float density = clamp(level * 0.46 * uOpacity + grain, 0.0, 0.55);
    fragColor = vec4(skyTint * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}
`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const smoother = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

const parseColor = (value: string) => {
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || '').trim())
  if (!hex) return [1, 1, 1]
  const full = hex[1].length === 3 ? hex[1].replace(/./g, (d) => d + d) : hex[1]
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
}

let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let vao: WebGLVertexArrayObject | null = null
let uniforms: Record<string, WebGLUniformLocation | null> = {}
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = true

const pointer = { x: 0.5, y: 0.5, inside: false, seen: false }
const aim = { x: 0.5, y: 0.5 }
const shade = { x: 0.5, y: 0.5, presence: 0 }
const pulses: { age: number }[] = []
const pulseData = new Float32Array(MAX_PULSES * 4)
let time = 0
let opening = 0
let last = 0
let resizePending = true

function compileShader(glContext: WebGL2RenderingContext, type: number, source: string) {
  const s = glContext.createShader(type)
  if (!s) return null
  glContext.shaderSource(s, source)
  glContext.compileShader(s)
  if (!glContext.getShaderParameter(s, glContext.COMPILE_STATUS)) {
    glContext.deleteShader(s)
    return null
  }
  return s
}

function initGL() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
  })
  if (!gl) return

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vs || !fs) return

  program = gl.createProgram()
  if (!program) return
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

  const uniformNames = [
    'uResolution', 'uScale', 'uTime', 'uSource', 'uAim', 'uReach',
    'uColor', 'uSpread', 'uLength', 'uFade', 'uSaturation', 'uPulsating',
    'uNoise', 'uDistortion', 'uDensity', 'uSharpness', 'uGlow', 'uHaze',
    'uAtmosphere', 'uIntensity', 'uShadow', 'uPulses', 'uIntro', 'uLight', 'uOpacity',
  ]
  uniformNames.forEach((name) => {
    uniforms[name] = gl!.getUniformLocation(program!, name)
  })

  vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
}

function applyResize() {
  if (!canvasRef.value || !containerRef.value || !gl) return
  const rect = containerRef.value.getBoundingClientRect()
  const cssWidth = Math.max(1, rect.width)
  const cssHeight = Math.max(1, rect.height)
  const density = 1.15
  const sharpness = 0.35
  const detail = density * (0.35 + 0.65 * sharpness)
  const sampling = clamp(0.35 + 0.3 * detail, 0.5, 2)
  const ratio = Math.min(window.devicePixelRatio || 1, 2, sampling, Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight)))
  const width = Math.max(1, Math.round(cssWidth * ratio))
  const height = Math.max(1, Math.round(cssHeight * ratio))

  if (canvasRef.value.width !== width || canvasRef.value.height !== height) {
    canvasRef.value.width = width
    canvasRef.value.height = height
  }
}

function renderFrame(now: number) {
  if (!isVisible) {
    animationFrameId = requestAnimationFrame(renderFrame)
    return
  }

  if (resizePending) {
    resizePending = false
    applyResize()
  }

  const dt = clamp((now - last) / 1000 || 0, 0, 0.05)
  last = Math.max(last, now)
  time += dt * 1.0

  if (opening < 1) opening = Math.min(1, opening + dt / 1.8)

  const steer = 1 - Math.exp(-dt / 0.2)
  const aimX = pointer.seen ? pointer.x : 0.5
  const aimY = pointer.seen ? pointer.y : 0.5
  aim.x += (aimX - aim.x) * steer
  aim.y += (aimY - aim.y) * steer

  const glide = 1 - Math.exp(-dt / 0.08)
  shade.x += (pointer.x - shade.x) * glide
  shade.y += (pointer.y - shade.y) * glide
  const shading = pointer.inside
  shade.presence += ((shading ? 1 : 0) - shade.presence) * (1 - Math.exp(-dt / (shading ? 0.25 : 0.5)))

  for (let i = pulses.length - 1; i >= 0; i--) {
    pulses[i].age += dt
    if (pulses[i].age >= 2) pulses.splice(i, 1)
  }
  pulseData.fill(0)
  pulses.forEach((pulse, index) => {
    const t = pulse.age
    pulseData[index * 4] = 0.05 + t * 1.05
    pulseData[index * 4 + 1] = 0.14 + t * 0.14
    pulseData[index * 4 + 2] = 0.9 * smoother(t / 0.15) * (1 - smoother(t / 2))
  })

  if (gl && program && canvasRef.value && containerRef.value) {
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    const scale = canvasRef.value.width / width
    const sourceX = 0.5 * width
    const sourceY = -0.2 * height

    let dirX = 0
    let dirY = 1
    const mx = aim.x * width - sourceX
    const my = aim.y * height - sourceY
    const ml = Math.hypot(mx, my) || 1
    dirX = dirX + (mx / ml - dirX) * 0.14
    dirY = dirY + (my / ml - dirY) * 0.14
    const bl = Math.hypot(dirX, dirY) || 1
    dirX /= bl
    dirY /= bl

    const eased = 1 - Math.pow(1 - opening, 3)
    const activeColor = isWhite.value ? parseColor('#0A84FF') : parseColor('#58B8FF')

    gl.viewport(0, 0, canvasRef.value.width, canvasRef.value.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindVertexArray(vao)

    if (uniforms.uResolution) gl.uniform2f(uniforms.uResolution, canvasRef.value.width, canvasRef.value.height)
    if (uniforms.uScale) gl.uniform1f(uniforms.uScale, scale)
    if (uniforms.uTime) gl.uniform1f(uniforms.uTime, time)
    if (uniforms.uSource) gl.uniform2f(uniforms.uSource, sourceX, sourceY)
    if (uniforms.uAim) gl.uniform2f(uniforms.uAim, dirX, dirY)
    if (uniforms.uReach) gl.uniform1f(uniforms.uReach, Math.max(width, height))
    if (uniforms.uColor) gl.uniform3f(uniforms.uColor, activeColor[0], activeColor[1], activeColor[2])
    if (uniforms.uSpread) gl.uniform1f(uniforms.uSpread, 0.52)
    if (uniforms.uLength) gl.uniform1f(uniforms.uLength, 3.0)
    if (uniforms.uFade) gl.uniform1f(uniforms.uFade, 1.0)
    if (uniforms.uSaturation) gl.uniform1f(uniforms.uSaturation, 1.0)
    if (uniforms.uPulsating) gl.uniform1f(uniforms.uPulsating, 1.0)
    if (uniforms.uNoise) gl.uniform1f(uniforms.uNoise, 0.0)
    if (uniforms.uDistortion) gl.uniform1f(uniforms.uDistortion, 0.0)
    if (uniforms.uDensity) gl.uniform1f(uniforms.uDensity, 1.15)
    if (uniforms.uSharpness) gl.uniform1f(uniforms.uSharpness, 0.35)
    if (uniforms.uGlow) gl.uniform1f(uniforms.uGlow, 0.68)
    if (uniforms.uHaze) gl.uniform1f(uniforms.uHaze, 0.25)
    if (uniforms.uAtmosphere) gl.uniform1f(uniforms.uAtmosphere, 1.0)
    if (uniforms.uIntensity) gl.uniform1f(uniforms.uIntensity, 1.05)
    if (uniforms.uShadow) gl.uniform4f(uniforms.uShadow, shade.x * width, shade.y * height, shade.presence, 16)
    if (uniforms.uPulses) gl.uniform4fv(uniforms.uPulses, pulseData)
    if (uniforms.uIntro) gl.uniform2f(uniforms.uIntro, eased * 2.6, smoother(opening / 0.5))
    if (uniforms.uLight) gl.uniform1f(uniforms.uLight, isWhite.value ? 1 : 0)
    if (uniforms.uOpacity) gl.uniform1f(uniforms.uOpacity, 1.0)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  animationFrameId = requestAnimationFrame(renderFrame)
}

function onPointerMove(e: PointerEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  pointer.x = (e.clientX - rect.left) / Math.max(1, rect.width)
  pointer.y = (e.clientY - rect.top) / Math.max(1, rect.height)
  pointer.inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  pointer.seen = true
}

function onPointerDown() {
  if (pulses.length < MAX_PULSES) {
    pulses.push({ age: 0 })
  }
}

onMounted(() => {
  initGL()
  applyResize()

  const container = containerRef.value
  if (container) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })

    resizeObserver = new ResizeObserver(() => {
      resizePending = true
    })
    resizeObserver.observe(container)

    intersectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true
    })
    intersectionObserver.observe(container)
  }

  animationFrameId = requestAnimationFrame(renderFrame)
})

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  if (resizeObserver) resizeObserver.disconnect()
  if (intersectionObserver) intersectionObserver.disconnect()
  if (gl && program) gl.deleteProgram(program)
})
</script>

<template>
  <div ref="containerRef" class="light-rays-wrapper" aria-hidden="true">
    <canvas ref="canvasRef" class="light-rays-canvas"></canvas>
  </div>
</template>

<style scoped>
.light-rays-wrapper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.light-rays-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>

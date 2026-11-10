<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    height?: number
    baseWidth?: number
    glow?: number
    timeScale?: number
    bloom?: number
  }>(),
  {
    height: 3.4,
    baseWidth: 5.2,
    glow: 1.15,
    timeScale: 0.45,
    bloom: 1.1,
  },
)

const { isWhite } = storeToRefs(useThemeStore())
const canvasRef = ref<HTMLCanvasElement | null>(null)

let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = true
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let vertexBuffer: WebGLBuffer | null = null

// Cached uniform locations (ponytail-review #3)
let uRes: WebGLUniformLocation | null = null
let uTime: WebGLUniformLocation | null = null
let uHeight: WebGLUniformLocation | null = null
let uBase: WebGLUniformLocation | null = null
let uGlow: WebGLUniformLocation | null = null
let uBloom: WebGLUniformLocation | null = null
let uIsLight: WebGLUniformLocation | null = null

const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

// ReactBits Prism: Raymarched 3D rotating prism with spectral dispersion & volumetric glow
const FRAG_SRC = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_height;
uniform float u_base;
uniform float u_glow;
uniform float u_bloom;
uniform float u_isLight;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// Octahedral prism SDF
float sdOctaPrism(vec3 p, float h, float r) {
  p = abs(p);
  return (p.x + p.z + p.y * (r / h) - r) * 0.57735027;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time;

  vec3 ro = vec3(0.0, 0.0, -5.2);
  vec3 rd = normalize(vec3(uv, 1.45));

  // Hoist rotation matrices outside the raymarch loop (1x instead of 24x per pixel)
  mat2 rXZ = rot(t * 0.65);
  mat2 rXY = rot(sin(t * 0.4) * 0.32);
  mat2 rYZ = rot(cos(t * 0.35) * 0.25);

  vec3 col = vec3(0.0);
  float z = 0.2;

  for (int i = 0; i < 24; i++) {
    vec3 p = ro + rd * z;

    p.xz *= rXZ;
    p.xy *= rXY;
    p.yz *= rYZ;

    float d = abs(sdOctaPrism(p, u_height * 0.5, u_base * 0.32)) + 0.016;

    vec3 spectrum = 0.55 + 0.45 * cos(
      vec3(0.15, 0.85, 1.65) +
      p.y * 1.35 +
      length(p.xz) * 1.1 -
      t * 1.1
    );
    spectrum *= vec3(0.55, 0.88, 1.35);

    col += spectrum / (d * 24.0);
    z += d * 0.72;
    if (z > 8.5) break;
  }

  col = col * u_glow * 0.042;
  col = 1.0 - exp(-col * u_bloom);

  if (u_isLight > 0.5) {
    // Light Mode: zero background haze (strict smoothstep cutoff) + vivid #0A84FF / Indigo spectral facets
    float intensity = max(col.r, max(col.g, col.b));
    float alpha = smoothstep(0.18, 0.78, intensity) * 0.68;
    vec3 vividBlue = mix(vec3(0.04, 0.52, 1.0), vec3(0.18, 0.32, 0.95), clamp(col.r * 1.2, 0.0, 1.0));
    vividBlue = mix(vividBlue, vec3(0.0, 0.72, 0.96), clamp(col.g * 0.9, 0.0, 1.0));
    gl_FragColor = vec4(vividBlue * alpha, alpha);
  } else {
    // Dark Mode: unchanged
    float alpha = clamp(max(col.r, max(col.g, col.b)) * 0.95, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
}
`

function compileShader(ctx: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = ctx.createShader(type)
  if (!s) return null
  ctx.shaderSource(s, src)
  ctx.compileShader(s)
  if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) {
    ctx.deleteShader(s)
    return null
  }
  return s
}

function initWebGL() {
  const canvas = canvasRef.value
  if (!canvas) return
  gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false })
  if (!gl) return

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vs || !fs) return

  program = gl.createProgram()
  if (!program) return
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

  gl.useProgram(program)

  vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  const posLoc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  uRes = gl.getUniformLocation(program, 'u_res')
  uTime = gl.getUniformLocation(program, 'u_time')
  uHeight = gl.getUniformLocation(program, 'u_height')
  uBase = gl.getUniformLocation(program, 'u_base')
  uGlow = gl.getUniformLocation(program, 'u_glow')
  uBloom = gl.getUniformLocation(program, 'u_bloom')
  uIsLight = gl.getUniformLocation(program, 'u_isLight')
}

let lastFrameTime = 0

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.parentElement || !gl) return
  const rect = canvas.parentElement.getBoundingClientRect()
  // Soft volumetric glow needs only 0.45x resolution (~70% less GPU fillrate)
  const scale = 0.45
  canvas.width = Math.max(1, Math.floor(rect.width * scale))
  canvas.height = Math.max(1, Math.floor(rect.height * scale))
  gl.viewport(0, 0, canvas.width, canvas.height)
}

function render(now: number) {
  if (!isVisible || !gl || !program || !canvasRef.value) {
    rafId = null
    return
  }

  if (now - lastFrameTime >= 30) {
    lastFrameTime = now
    gl.useProgram(program)
    gl.uniform2f(uRes, canvasRef.value.width, canvasRef.value.height)
    gl.uniform1f(uTime, now * 0.001 * props.timeScale)
    gl.uniform1f(uHeight, props.height)
    gl.uniform1f(uBase, props.baseWidth)
    gl.uniform1f(uGlow, props.glow)
    gl.uniform1f(uBloom, props.bloom)
    gl.uniform1f(uIsLight, isWhite.value ? 1.0 : 0.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  rafId = requestAnimationFrame(render)
}

function startLoop() {
  if (rafId === null && isVisible) {
    rafId = requestAnimationFrame(render)
  }
}

onMounted(() => {
  initWebGL()
  resize()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render(1200)
    return
  }
  startLoop()

  const parent = canvasRef.value?.parentElement
  if (parent && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(parent)
  }
  if (parent && typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true
      if (isVisible) startLoop()
    })
    intersectionObserver.observe(parent)
  }
})

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  if (gl) {
    if (vertexBuffer) gl.deleteBuffer(vertexBuffer)
    if (program) gl.deleteProgram(program)
  }
})
</script>

<template>
  <div class="prism-bg" aria-hidden="true">
    <canvas ref="canvasRef" class="prism-bg__canvas"></canvas>
  </div>
</template>

<style scoped>
.prism-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  opacity: 0.78;
  mask-image: radial-gradient(ellipse 80% 75% at 50% 48%, #000 25%, transparent 92%);
  -webkit-mask-image: radial-gradient(ellipse 80% 75% at 50% 48%, #000 25%, transparent 92%);
}

:global(:root[data-theme='white']) .prism-bg {
  opacity: 0.92;
  mix-blend-mode: normal;
}

.prism-bg__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

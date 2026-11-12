<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { isWhite } = storeToRefs(useThemeStore())

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = true

let trophyGroup: THREE.Group | null = null
let centerPhone: THREE.Group | null = null
let leftPhone: THREE.Group | null = null
let rightPhone: THREE.Group | null = null
let outerRingMat: THREE.MeshBasicMaterial | null = null
let innerRingMat: THREE.MeshBasicMaterial | null = null

// Interaction state
let dragging = false
let prevX = 0
let userYaw = 0
let targetYaw = 0
let pointerX = 0
let pointerY = 0

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function createOLEDTexture(palette: string[], isUltra = false) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 1024
  const ctx = c.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, 512, 1024)
  bg.addColorStop(0, palette[0])
  bg.addColorStop(0.48, palette[1])
  bg.addColorStop(1, palette[2])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 1024)

  // 3D silk waves on OLED display
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.translate(256, 440 + i * 70)
    ctx.rotate((i - 1.5) * 0.28)
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 290)
    g.addColorStop(0, palette[3])
    g.addColorStop(0.5, palette[4])
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, 0, 280, 130, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Specular sheen
  const sheen = ctx.createLinearGradient(0, 0, 512, 720)
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.03)')
  sheen.addColorStop(0.5, 'transparent')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, 512, 1024)

  // Status bar
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  for (let b = 0; b < 4; b++) {
    ctx.fillRect(382 + b * 8, 52 - b * 3, 5, 8 + b * 3)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2.5
  ctx.strokeRect(426, 42, 36, 17)
  ctx.fillRect(429, 45, 27, 11)

  // Clock
  ctx.fillStyle = 'rgba(226,232,240,0.85)'
  ctx.font = '600 22px "Pretendard", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('THU · NOV 12', 256, 162)

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = isUltra ? '800 116px "Pretendard", sans-serif' : '800 124px "Pretendard", sans-serif'
  ctx.fillText('09:41', 256, 275)

  // Glassmorphic widgets
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.strokeStyle = 'rgba(255,255,255,0.24)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(86, 318, 158, 68, 22)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(264, 318, 80, 68, 22)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(358, 318, 68, 68, 22)
  ctx.fill()
  ctx.stroke()

  // Shortcuts
  ctx.beginPath()
  ctx.arc(102, 916, 30, 0, Math.PI * 2)
  ctx.arc(410, 916, 30, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.beginPath()
  ctx.roundRect(176, 986, 160, 10, 5)
  ctx.fill()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function createSmartphone3D(opts: {
  w?: number
  h?: number
  depth?: number
  radius?: number
  frameColor?: number
  backColor?: number
  style?: 'iphone' | 'ultra'
  wallpaperPalette: string[]
}) {
  const group = new THREE.Group()
  const {
    w = 1.68,
    h = 3.48,
    depth = 0.165,
    radius = 0.25,
    frameColor = 0xcbd5e1,
    backColor = 0x1e293b,
    style = 'iphone',
    wallpaperPalette,
  } = opts

  // 1. Titanium Frame
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, radius), {
    depth,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 0.034,
    bevelThickness: 0.034,
  })
  bodyGeo.center()

  const frameMat = new THREE.MeshPhysicalMaterial({
    color: frameColor,
    metalness: 0.94,
    roughness: 0.2,
    clearcoat: 0.45,
    clearcoatRoughness: 0.18,
    reflectivity: 1.0,
  })
  group.add(new THREE.Mesh(bodyGeo, frameMat))

  // Chrome Rim
  const rimShape = roundedRectShape(w + 0.01, h + 0.01, radius)
  const holeShape = roundedRectShape(w - 0.05, h - 0.05, Math.max(0.03, radius - 0.03))
  rimShape.holes.push(holeShape)
  const rimGeo = new THREE.ShapeGeometry(rimShape)
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 1.0,
    roughness: 0.08,
  })
  const frontRim = new THREE.Mesh(rimGeo, chromeMat)
  frontRim.position.z = depth / 2 + 0.0345
  group.add(frontRim)

  // 2. Frosted Matte Backplate
  const backGeo = new THREE.ShapeGeometry(roundedRectShape(w - 0.04, h - 0.04, Math.max(0.04, radius - 0.02)))
  const backMat = new THREE.MeshPhysicalMaterial({
    color: backColor,
    metalness: 0.42,
    roughness: 0.26,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  })
  const backPlate = new THREE.Mesh(backGeo, backMat)
  backPlate.position.z = -depth / 2 - 0.0345
  backPlate.rotation.y = Math.PI
  group.add(backPlate)

  // 3. Screen
  const sw = w - 0.095, sh = h - 0.095
  const screenGeo = new THREE.ShapeGeometry(roundedRectShape(sw, sh, Math.max(0.03, radius - 0.035)))
  const pos = screenGeo.attributes.position
  const uvs = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) + sw / 2) / sw
    uvs[i * 2 + 1] = (pos.getY(i) + sh / 2) / sh
  }
  screenGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

  const screenMat = new THREE.MeshPhysicalMaterial({
    map: createOLEDTexture(wallpaperPalette, style === 'ultra'),
    emissive: new THREE.Color(0x1e40af),
    emissiveIntensity: 0.25,
    roughness: 0.04,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 1.0,
  })
  const screen = new THREE.Mesh(screenGeo, screenMat)
  screen.position.z = depth / 2 + 0.036
  group.add(screen)

  // 4. Island / Notch
  const cutoutMat = new THREE.MeshBasicMaterial({ color: 0x010204 })
  const sensorGlassMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 })
  if (style === 'iphone') {
    const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(0.46, 0.115, 0.057)), cutoutMat)
    island.position.set(0, h / 2 - 0.19, depth / 2 + 0.038)
    group.add(island)

    const camEye = new THREE.Mesh(new THREE.CircleGeometry(0.032, 24), sensorGlassMat)
    camEye.position.set(0.145, h / 2 - 0.19, depth / 2 + 0.039)
    group.add(camEye)
  } else {
    const punch = new THREE.Mesh(new THREE.CircleGeometry(0.046, 24), cutoutMat)
    punch.position.set(0, h / 2 - 0.16, depth / 2 + 0.038)
    group.add(punch)
  }

  // Camera barrels
  const sapphireLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x040914,
    metalness: 0.15,
    roughness: 0.02,
    clearcoat: 1.0,
    reflectivity: 1.0,
  })

  function addCamera(cx: number, cy: number, r: number, bDepth: number) {
    const bg = new THREE.Group()
    const outerGeo = new THREE.CylinderGeometry(r, r * 1.04, bDepth, 36)
    outerGeo.rotateX(Math.PI / 2)
    bg.add(new THREE.Mesh(outerGeo, frameMat))

    const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.08, 16, 36), chromeMat)
    rimTorus.position.z = -bDepth / 2
    bg.add(rimTorus)

    const glassGeo = new THREE.CylinderGeometry(r * 0.66, r * 0.66, bDepth + 0.009, 32)
    glassGeo.rotateX(Math.PI / 2)
    bg.add(new THREE.Mesh(glassGeo, sapphireLensMat))

    bg.position.set(cx, cy, -depth / 2 - 0.034 - bDepth / 2)
    group.add(bg)
  }

  if (style === 'iphone') {
    const px = 0.28, py = h / 2 - 0.56
    addCamera(px + 0.19, py + 0.21, 0.168, 0.095)
    addCamera(px + 0.19, py - 0.21, 0.168, 0.095)
    addCamera(px - 0.18, py, 0.168, 0.095)
  } else {
    const gx = 0.44, gy = h / 2 - 0.34
    addCamera(gx, gy, 0.16, 0.09)
    addCamera(gx, gy - 0.37, 0.16, 0.09)
    addCamera(gx, gy - 0.74, 0.16, 0.09)
  }

  return group
}

function initThree() {
  const stage = stageRef.value
  const canvas = canvasRef.value
  if (!stage || !canvas) return

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.32

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
  camera.position.set(0, 0.55, 9.6)
  camera.lookAt(0, -0.22, 0)

  // Lights
  const ambient = new THREE.AmbientLight(0xe0f2fe, 1.15)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
  keyLight.position.set(2.5, 9, 6.5)
  scene.add(keyLight)

  const blueRimLeft = new THREE.PointLight(0x0096ff, 12, 16)
  blueRimLeft.position.set(-4.8, 2.4, 3.5)
  scene.add(blueRimLeft)

  const blueRimRight = new THREE.PointLight(0x38bdf8, 12, 16)
  blueRimRight.position.set(4.8, 2.4, 3.5)
  scene.add(blueRimRight)

  // Trophy Group
  trophyGroup = new THREE.Group()
  scene.add(trophyGroup)

  // 1. Center Phone (iPhone 17 Pro Max)
  centerPhone = createSmartphone3D({
    w: 1.74,
    h: 3.58,
    depth: 0.17,
    radius: 0.26,
    frameColor: 0xd6c7b2,
    backColor: 0x27272a,
    style: 'iphone',
    wallpaperPalette: ['#040b1a', '#0a2e6e', '#030712', 'rgba(0, 150, 255, 0.92)', 'rgba(251, 191, 36, 0.42)'],
  })
  centerPhone.position.set(0, 0.36, 0.65)
  trophyGroup.add(centerPhone)

  // 2. Left Phone (Galaxy S25 Ultra)
  leftPhone = createSmartphone3D({
    w: 1.66,
    h: 3.44,
    depth: 0.165,
    radius: 0.065,
    frameColor: 0x93c5fd,
    backColor: 0x1e293b,
    style: 'ultra',
    wallpaperPalette: ['#020617', '#0c4a6e', '#082f49', 'rgba(56, 189, 248, 0.92)', 'rgba(14, 165, 233, 0.45)'],
  })
  leftPhone.position.set(-2.22, -0.05, -0.15)
  trophyGroup.add(leftPhone)

  // 3. Right Phone (Pro Flagship Titanium Blue)
  rightPhone = createSmartphone3D({
    w: 1.64,
    h: 3.40,
    depth: 0.165,
    radius: 0.24,
    frameColor: 0x60a5fa,
    backColor: 0x0f172a,
    style: 'iphone',
    wallpaperPalette: ['#05070a', '#1e1b4b', '#090d16', 'rgba(96, 165, 250, 0.92)', 'rgba(129, 140, 248, 0.45)'],
  })
  rightPhone.position.set(2.22, -0.05, -0.15)
  trophyGroup.add(rightPhone)

  // Floor Rings
  outerRingMat = new THREE.MeshBasicMaterial({ color: 0x0096ff, transparent: true, opacity: 0.58 })
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.02, 16, 100), outerRingMat)
  outerRing.rotation.x = Math.PI / 2
  outerRing.position.y = -2.02
  trophyGroup.add(outerRing)

  innerRingMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.4 })
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.015, 16, 80), innerRingMat)
  innerRing.rotation.x = Math.PI / 2
  innerRing.position.y = -1.96
  trophyGroup.add(innerRing)

  syncTheme()
}

function syncTheme() {
  if (!renderer || !outerRingMat || !innerRingMat) return
  if (isWhite.value) {
    outerRingMat.color.setHex(0x0a84ff)
    outerRingMat.opacity = 0.42
    innerRingMat.color.setHex(0x0284c7)
    innerRingMat.opacity = 0.3
    renderer.toneMappingExposure = 1.42
  } else {
    outerRingMat.color.setHex(0x0096ff)
    outerRingMat.opacity = 0.58
    innerRingMat.color.setHex(0x7dd3fc)
    innerRingMat.opacity = 0.4
    renderer.toneMappingExposure = 1.32
  }
}

watch(isWhite, syncTheme)

function resize() {
  if (!stageRef.value || !renderer || !camera) return
  const rect = stageRef.value.getBoundingClientRect()
  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.position.z = w < 720 ? 11.8 : 9.2
  camera.lookAt(0, -0.05, 0)
  camera.updateProjectionMatrix()
}

const clock = new THREE.Clock()
function animate() {
  if (!isVisible) {
    animationFrameId = requestAnimationFrame(animate)
    return
  }

  const t = clock.getElapsedTime()
  userYaw += (targetYaw - userYaw) * 0.08

  if (centerPhone && leftPhone && rightPhone && renderer && scene && camera) {
    // 1. Center phone
    centerPhone.position.y = 0.34 + Math.sin(t * 1.6) * 0.1
    centerPhone.rotation.y = Math.sin(t * 0.85) * 0.42 + userYaw + pointerX * 0.22
    centerPhone.rotation.x = Math.cos(t * 0.7) * 0.05 - pointerY * 0.09
    centerPhone.rotation.z = Math.sin(t * 0.6) * 0.025

    // 2. Left phone
    leftPhone.position.y = -0.06 + Math.sin(t * 1.45 + 1.2) * 0.09
    leftPhone.rotation.y = 0.56 + Math.sin(t * 0.75 + 0.8) * 0.44 + userYaw + pointerX * 0.2
    leftPhone.rotation.x = 0.04 - pointerY * 0.08
    leftPhone.rotation.z = 0.06

    // 3. Right phone
    rightPhone.position.y = -0.06 + Math.sin(t * 1.5 + 2.5) * 0.09
    rightPhone.rotation.y = -2.46 + Math.cos(t * 0.8) * 0.44 + userYaw + pointerX * 0.2
    rightPhone.rotation.x = 0.04 - pointerY * 0.08
    rightPhone.rotation.z = -0.06

    renderer.render(scene, camera)
  }

  animationFrameId = requestAnimationFrame(animate)
}

function onPointerDown(e: PointerEvent) {
  dragging = true
  prevX = e.clientX
}

function onPointerUp() {
  dragging = false
}

function onPointerMove(e: PointerEvent) {
  if (!stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2
  pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2
  if (dragging) {
    const dx = e.clientX - prevX
    prevX = e.clientX
    targetYaw += dx * 0.012
  }
}

onMounted(() => {
  initThree()
  resize()

  const stage = stageRef.value
  if (stage) {
    stage.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(stage)

    intersectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true
    })
    intersectionObserver.observe(stage)
  }

  animationFrameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  const stage = stageRef.value
  if (stage) {
    stage.removeEventListener('pointerdown', onPointerDown)
  }
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointermove', onPointerMove)
  if (resizeObserver) resizeObserver.disconnect()
  if (intersectionObserver) intersectionObserver.disconnect()
  if (renderer) renderer.dispose()
})
</script>

<template>
  <div ref="stageRef" class="trophy-stage" title="드래그하여 3D 스마트폰 360° 회전">
    <div class="trophy-podium-glow"></div>
    <canvas ref="canvasRef" class="phone-3d-canvas"></canvas>
  </div>
</template>

<style scoped>
.trophy-stage {
  position: relative;
  z-index: 2;
  margin-top: 8px;
  width: 100%;
  max-width: 1120px;
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}

.trophy-stage:active {
  cursor: grabbing;
}

.phone-3d-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.trophy-podium-glow {
  position: absolute;
  bottom: 18px;
  width: 720px;
  height: 115px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(0, 150, 255, 0.52) 0%, rgba(0, 150, 255, 0.14) 50%, transparent 76%);
  transform: rotateX(76deg);
  filter: blur(14px);
  pointer-events: none;
}

:root[data-theme='white'] .trophy-podium-glow {
  background: radial-gradient(ellipse at center, rgba(10, 132, 255, 0.28) 0%, rgba(56, 189, 248, 0.12) 52%, transparent 78%);
}
</style>

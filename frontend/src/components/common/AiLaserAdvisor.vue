<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Sparkles, Zap, Bot, User, Sliders, X, RotateCcw, ArrowRight, ShieldCheck, Cpu } from 'lucide-vue-next'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const lightningCanvasRef = ref<HTMLCanvasElement | null>(null)
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

// Preset AI Questions & Answers
const presetQuestions = [
  {
    id: 's25-vs-17promax',
    category: '2025 최신 플래그십',
    tag: '스마트폰 1:1 대결',
    query: '아이폰 17 프로 맥스랑 갤럭시 S25 울트라 중 카메라랑 배터리 뭐가 더 좋아?',
    aiSummary:
      '고배율 줌(5배~100배)과 200MP 초고화소 풍경 사진은 Galaxy S25 Ultra가 압도적이며, 4K 120fps Dolby Vision 동영상 촬영 및 연속 실사용 배터리 수명은 A19 Pro 저전력 설계의 iPhone 17 Pro Max가 약 2시간 20분 더 우세합니다.',
    scores: [
      { label: '망원/줌 카메라', a: '9.6', b: '9.9', winner: 'B' },
      { label: '동영상 시네마틱', a: '10.0', b: '9.4', winner: 'A' },
      { label: '배터리 지속시간', a: '9.9', b: '9.3', winner: 'A' },
      { label: 'AI 사진 지우개/생성', a: '9.3', b: '9.8', winner: 'B' },
    ],
    verdict: '줌 촬영 & S펜 생산성 중심이라면 Galaxy S25 Ultra, 동영상 제작 & 장시간 배터리라면 iPhone 17 Pro Max 추천!',
  },
  {
    id: 'm4-vs-s10ultra',
    category: '대화면 플래그십 태블릿',
    tag: '태블릿 정밀 비교',
    query: 'iPad Pro 13 (M4) vs Galaxy Tab S10 Ultra 디스플레이와 휴대성 차이는?',
    aiSummary:
      'M4 iPad Pro는 탠덤 OLED로 1,000니트 전면 밝기와 5.1mm 경이로운 두께를 자랑하며, Galaxy Tab S10 Ultra는 14.6인치 거대한 Dynamic AMOLED 2X와 반사 방지 코팅으로 멀티태스킹 덱스 모드에 최적화되어 있습니다.',
    scores: [
      { label: '휴대성 (두께/무게)', a: '10.0', b: '8.8', winner: 'A' },
      { label: '화면 몰입감 & 비율', a: '9.2', b: '9.8', winner: 'B' },
      { label: '프로세서 (렌더링)', a: '10.0', b: '8.9', winner: 'A' },
      { label: 'S펜 기본 번들 가성비', a: '8.4', b: '9.9', winner: 'B' },
    ],
    verdict: '영상 편집 & 그래픽 전문가 = iPad Pro 13 (M4) / 영상 감상 & 다중 문서 작업 = Galaxy Tab S10 Ultra',
  },
  {
    id: 's11-vs-watch8',
    category: '스마트워치 플래그십',
    tag: '워치 헬스케어 비교',
    query: 'Apple Watch Series 11이랑 Galaxy Watch8 중 헬스케어와 배터리 수명은?',
    aiSummary:
      'Apple Watch S11은 수면 무호흡증 감지 및 심전도 정밀도와 워치OS 앱 생태계가 뛰어나며, Galaxy Watch8은 향상된 바이오액티브 센서의 항산화 지수 측정과 초고속 45W 무선 충전 편의성이 돋보입니다.',
    scores: [
      { label: '수면/심전도 정확도', a: '9.8', b: '9.5', winner: 'A' },
      { label: '배터리 충전 속도', a: '8.9', b: '9.6', winner: 'B' },
      { label: '손목 착용감/두께', a: '9.7', b: '9.3', winner: 'A' },
      { label: '안드로이드 생태계 호환', a: '6.0', b: '10.0', winner: 'B' },
    ],
    verdict: '아이폰 사용자라면 Apple Watch Series 11, 갤럭시 사용자라면 Galaxy Watch8이 완벽한 선택입니다.',
  },
]

const activeQuestionIndex = ref(0)
const activeData = computed(() => presetQuestions[activeQuestionIndex.value])

// Shader settings
const settings = ref({
  beamPosition: 0.5,
  intensity: 1.85,
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

function triggerPulse() {
  state.introTime = 0.5
  showToast('✦ 번개 & 레이저 펄스 재실행!')
}

function selectQuestion(idx: number) {
  activeQuestionIndex.value = idx
  state.introTime = 0.5
}

function resetDefaults() {
  settings.value.beamPosition = 0.5
  settings.value.intensity = 1.85
  settings.value.beamWidth = 1.5
  settings.value.flare = 1.5
  settings.value.spread = 1.5
  settings.value.spill = 1.0
  settings.value.fog = 0.22
  settings.value.dust = 1.6
  settings.value.speed = 1.5
  settings.value.color = '#3847ff'
  showToast('파라미터가 초기화되었습니다.')
}

// WebGL 2.0 LaserFlow Shader
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

// Living Lightning Arc Simulation
let lCtx: CanvasRenderingContext2D | null = null
let lightningRafId: number | null = null

function drawLightningArc(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, disp: number) {
  if (disp < 2.0) {
    ctx.lineTo(x2, y2)
    return
  }
  const mx = (x1 + x2) * 0.5 + (Math.random() - 0.5) * disp
  const my = (y1 + y2) * 0.5 + (Math.random() - 0.5) * disp
  drawLightningArc(ctx, x1, y1, mx, my, disp * 0.5)
  drawLightningArc(ctx, mx, my, x2, y2, disp * 0.5)
}

function tickLightning() {
  if (!isVisible) {
    lightningRafId = requestAnimationFrame(tickLightning)
    return
  }

  const canvas = lightningCanvasRef.value
  const card = cardRef.value
  const container = containerRef.value
  if (canvas && card && container) {
    lCtx = canvas.getContext('2d')
    if (lCtx) {
      const w = container.clientWidth
      const h = container.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      lCtx.clearRect(0, 0, w, h)

      const cardRect = card.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()
      const sx = cardRect.left - cRect.left
      const sy = cardRect.top - cRect.top
      const sw = cardRect.width

      // Top energy arcs
      if (Math.random() > 0.4) {
        lCtx.save()
        lCtx.beginPath()
        lCtx.strokeStyle = settings.value.color
        lCtx.lineWidth = 1.6
        lCtx.shadowColor = settings.value.color
        lCtx.shadowBlur = 12

        const startX = sx + 20 + Math.random() * (sw - 40)
        lCtx.moveTo(startX, Math.max(0, sy - 80))
        drawLightningArc(lCtx, startX, Math.max(0, sy - 80), startX + (Math.random() - 0.5) * 30, sy, 22)
        lCtx.stroke()
        lCtx.restore()
      }

      // Corner flare sparkles
      if (Math.random() > 0.6) {
        lCtx.save()
        lCtx.beginPath()
        lCtx.strokeStyle = '#ffffff'
        lCtx.lineWidth = 1.2
        lCtx.shadowColor = '#60bfff'
        lCtx.shadowBlur = 8
        const cx = Math.random() > 0.5 ? sx : sx + sw
        lCtx.moveTo(cx, sy + 30)
        drawLightningArc(lCtx, cx, sy + 30, cx + (Math.random() - 0.5) * 40, sy + 30 + (Math.random() - 0.5) * 40, 14)
        lCtx.stroke()
        lCtx.restore()
      }
    }
  }

  lightningRafId = requestAnimationFrame(tickLightning)
}

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
      radius: 40,
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
  lightningRafId = requestAnimationFrame(tickLightning)
})

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (lightningRafId) cancelAnimationFrame(lightningRafId)
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
</script>

<template>
  <section class="ai-laser-section">
    <div class="wrap">
      <!-- Section Header -->
      <div class="section-head">
        <div>
          <div class="ai-badge-row">
            <span class="badge-style tech-mono ai-pill">
              <Zap :size="13" class="pulse-icon" />
              <span>REACT BITS LASERFLOW × TECHCOMPARE AI ADVISOR</span>
            </span>
            <span class="ai-live-indicator tech-mono">
              <span class="pulse-dot"></span>
              <span>LIVE LIGHTNING &amp; SHADER ENGINE</span>
            </span>
          </div>
          <h2 class="section-title">
            살아 숨쉬는 번개와 레이저,<br />
            <span class="text-accent">차세대 AI 하드웨어 분석 엔진</span>
          </h2>
        </div>
        <p class="section-desc">
          아래로 스크롤하면 실시간 레이저 광선과 번개 아크가 스마트폰 표면 위로 쏟아져 내립니다. 사용자의 고민에 맞춰 12대 표준 사양과 실구매 가성비를 실시간 AI가 명쾌하게 분석합니다.
        </p>
      </div>

      <!-- Sample Query Selector Bar -->
      <div class="query-selector-bar">
        <button
          v-for="(item, idx) in presetQuestions"
          :key="item.id"
          type="button"
          class="query-chip"
          :class="{ 'is-active': activeQuestionIndex === idx }"
          @click="selectQuestion(idx)"
        >
          <span class="query-chip__tag tech-mono">{{ item.tag }}</span>
          <span class="query-chip__title">{{ item.query }}</span>
        </button>
      </div>

      <!-- Interactive Laser Arena -->
      <div ref="containerRef" class="laser-arena">
        <!-- LaserFlow Shader Canvas (Scoped) -->
        <canvas ref="canvasRef" class="laser-canvas" aria-hidden="true"></canvas>

        <!-- Lightning Canvas Overlay -->
        <canvas ref="lightningCanvasRef" class="lightning-canvas" aria-hidden="true"></canvas>

        <!-- Floating Controls Palette -->
        <div class="arena-top-bar">
          <div class="color-palette">
            <span class="palette-label tech-mono">LASER COLOR</span>
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

          <div class="arena-actions">
            <button type="button" class="action-btn" title="레이저 & 번개 펄스 재실행" @click="triggerPulse">
              <Zap :size="14" />
              <span class="tech-mono">PULSE</span>
            </button>
            <button
              type="button"
              class="action-btn"
              :class="{ 'is-active': panelOpen }"
              title="상세 파라미터 조정"
              @click="panelOpen = !panelOpen"
            >
              <Sliders :size="14" />
              <span class="tech-mono">PARAMS</span>
            </button>
          </div>
        </div>

        <!-- Center AI Smartphone Surface Stage -->
        <div class="arena-center">
          <div ref="cardRef" class="ai-phone-cockpit">
            <!-- Top Bezel / Dynamic Notch Island -->
            <div class="cockpit-island">
              <div class="cockpit-island__sensor"></div>
              <div class="cockpit-island__cam"></div>
            </div>

            <!-- Screen Area -->
            <div class="cockpit-screen">
              <!-- Status bar -->
              <div class="screen-status-bar tech-mono">
                <div class="status-left">
                  <Bot :size="13" class="text-accent" />
                  <span>AI HARDWARE CORE v2.5</span>
                </div>
                <div class="status-right">
                  <span class="latency-pill">12ms</span>
                  <span>99.8% PRECISION</span>
                </div>
              </div>

              <!-- User Question Speech Bubble -->
              <div class="chat-bubble user-bubble">
                <div class="bubble-header">
                  <div class="bubble-user-badge">
                    <User :size="13" />
                    <span>구매 고민 사용자</span>
                  </div>
                  <span class="bubble-time tech-mono">방금 전</span>
                </div>
                <p class="bubble-query">
                  "{{ activeData.query }}"
                </p>
              </div>

              <!-- AI Hardware Analysis Response Card -->
              <div class="chat-bubble ai-bubble">
                <div class="bubble-header">
                  <div class="bubble-ai-badge">
                    <Sparkles :size="13" class="text-accent" />
                    <span class="text-accent font-bold">TechCompare AI Advisor</span>
                  </div>
                  <span class="badge-style tech-mono ai-spec-badge">✦ 12개 스펙 심층 진단</span>
                </div>

                <!-- Core Summary -->
                <p class="ai-summary-text">
                  {{ activeData.aiSummary }}
                </p>

                <!-- Spec Comparison Score Matrix -->
                <div class="score-matrix">
                  <div
                    v-for="sc in activeData.scores"
                    :key="sc.label"
                    class="score-matrix__row tech-mono"
                  >
                    <span class="score-label">{{ sc.label }}</span>
                    <div class="score-values">
                      <span :class="{ 'is-winner': sc.winner === 'A' }">A {{ sc.a }}</span>
                      <span class="score-vs">vs</span>
                      <span :class="{ 'is-winner': sc.winner === 'B' }">B {{ sc.b }}</span>
                    </div>
                  </div>
                </div>

                <!-- Final Verdict -->
                <div class="ai-verdict-box">
                  <div class="verdict-title">
                    <ShieldCheck :size="14" class="text-accent" />
                    <span>AI 맞춤 구매 가이드</span>
                  </div>
                  <p class="verdict-text">{{ activeData.verdict }}</p>
                </div>
              </div>

              <!-- Footer Quick Action -->
              <div class="cockpit-footer">
                <RouterLink
                  :to="{ name: 'compare', query: { items: 'iphone-17-pro-max,galaxy-s25-ultra' } }"
                  class="btn btn--primary cockpit-cta-btn"
                >
                  <Cpu :size="15" />
                  <span>두 기기 전체 12개 스펙 대조표 보기</span>
                  <ArrowRight :size="14" />
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Parameters Drawer Overlay -->
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
                <span>스모크/포그 (Fog)</span>
                <span class="tech-mono text-accent">{{ settings.fog.toFixed(2) }}</span>
              </div>
              <input v-model.number="settings.fog" type="range" min="0.0" max="0.8" step="0.05" class="laser-slider" />
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>글리터 더스트 (Dust)</span>
                <span class="tech-mono text-accent">{{ settings.dust.toFixed(2) }}</span>
              </div>
              <input v-model.number="settings.dust" type="range" min="0.2" max="3.0" step="0.1" class="laser-slider" />
            </div>

            <button type="button" class="btn btn--secondary laser-drawer__reset" @click="resetDefaults">
              <RotateCcw :size="13" />
              <span>기본값 초기화</span>
            </button>
          </div>
        </div>

        <!-- Toast Notification -->
        <Transition name="toast-fade">
          <div v-if="toastMsg" class="laser-toast tech-mono">
            {{ toastMsg }}
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ai-laser-section {
  padding: 92px 0;
  border-bottom: 1px solid var(--divider);
  position: relative;
  overflow: hidden;
}

.ai-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ai-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(0, 150, 255, 0.14);
  color: #60bfff;
  border: 1px solid rgba(0, 150, 255, 0.35);
  font-size: 11px;
  font-weight: 700;
}

.pulse-icon {
  color: #38bdf8;
  animation: pulse-glow 1.8s infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

.ai-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-sub);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #00e676;
  box-shadow: 0 0 10px #00e676;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.section-title {
  font-size: clamp(26px, 2.2vw + 14px, 40px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.16;
}

.section-desc {
  color: var(--text-sub);
  font-size: 15px;
  max-width: 54ch;
}

/* Query Selector Bar */
.query-selector-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

@media (max-width: 860px) {
  .query-selector-bar {
    grid-template-columns: 1fr;
  }
}

.query-chip {
  padding: 14px 18px;
  border-radius: 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: all 0.25s ease;
  color: var(--text-main);
}

.query-chip:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -6px var(--accent-glow);
}

.query-chip.is-active {
  border-color: var(--accent);
  background: rgba(0, 150, 255, 0.1);
  box-shadow: 0 0 24px -4px var(--accent-glow);
}

.query-chip__tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
}

.query-chip__title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-main);
}

/* Laser Arena Container */
.laser-arena {
  position: relative;
  min-height: 720px;
  border-radius: 32px;
  border: 1px solid var(--card-border);
  background: radial-gradient(circle at 50% 30%, rgba(0, 150, 255, 0.12) 0%, rgba(5, 7, 10, 0.96) 80%);
  box-shadow: var(--card-shadow);
  padding: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

:root[data-theme='white'] .laser-arena {
  background: radial-gradient(circle at 50% 30%, rgba(10, 132, 255, 0.12) 0%, #edf2f9 80%);
}

.laser-canvas,
.lightning-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.laser-canvas {
  z-index: 10;
}

.lightning-canvas {
  z-index: 12;
}

/* Arena Top Bar */
.arena-top-bar {
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.color-palette {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(11, 15, 23, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
}

.palette-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-sub);
  margin-right: 4px;
}

.palette-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  padding: 0;
}

.palette-dot:hover {
  transform: scale(1.25);
}

.palette-dot.is-active {
  border-color: #ffffff;
  transform: scale(1.3);
  box-shadow: 0 0 12px currentColor;
}

.arena-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(11, 15, 23, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  color: var(--text-main);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--accent);
  background: rgba(0, 150, 255, 0.2);
}

.action-btn.is-active {
  background: var(--accent);
  color: #fff;
}

/* Arena Center & Cockpit */
.arena-center {
  position: relative;
  z-index: 15;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0 10px;
}

.ai-phone-cockpit {
  position: relative;
  width: min(100%, 540px);
  min-height: 560px;
  border-radius: 40px;
  background: #080b12;
  border: 8px solid #1a2233;
  box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 45px rgba(0, 150, 255, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.cockpit-island {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 105px;
  height: 18px;
  background: #101624;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  z-index: 30;
}

.cockpit-island__sensor {
  width: 42px;
  height: 3px;
  background: #04060a;
  border-radius: 999px;
}

.cockpit-island__cam {
  width: 8px;
  height: 8px;
  background: #0284c7;
  border-radius: 50%;
  box-shadow: 0 0 6px #0284c7;
}

.cockpit-screen {
  flex: 1;
  padding: 34px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(180deg, #0d1322 0%, #060910 100%);
  position: relative;
  z-index: 20;
}

.screen-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  padding: 0 4px;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.latency-pill {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 230, 118, 0.15);
  color: #00e676;
  font-size: 9px;
}

/* Chat Bubbles */
.chat-bubble {
  border-radius: 20px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bubble-user-badge,
.bubble-ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
}

.bubble-user-badge {
  color: #94a3b8;
}

.bubble-time {
  font-size: 10px;
  color: #64748b;
}

.user-bubble {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bubble-query {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.45;
}

.ai-bubble {
  background: rgba(0, 150, 255, 0.08);
  border: 1px solid rgba(0, 150, 255, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 150, 255, 0.2);
}

.ai-spec-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.ai-summary-text {
  font-size: 13px;
  line-height: 1.6;
  color: #e2e8f0;
}

/* Score Matrix */
.score-matrix {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.score-matrix__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 2px 4px;
}

.score-label {
  color: #94a3b8;
}

.score-values {
  display: flex;
  align-items: center;
  gap: 5px;
}

.score-values span.is-winner {
  color: #38bdf8;
  font-weight: 800;
}

.score-vs {
  color: #64748b;
  font-size: 9px;
}

/* Final Verdict Box */
.ai-verdict-box {
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(0, 150, 255, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%);
  border-left: 3px solid var(--accent);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.verdict-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
}

.verdict-text {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  line-height: 1.4;
}

/* Footer CTA */
.cockpit-footer {
  margin-top: auto;
}

.cockpit-cta-btn {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Control Drawer Overlay */
.laser-drawer {
  position: absolute;
  top: 70px;
  right: 24px;
  width: 280px;
  z-index: 40;
  padding: 16px;
  border-radius: 20px;
  background: rgba(11, 15, 23, 0.95);
  backdrop-filter: blur(14px);
  border: 1px solid var(--accent);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
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
}

.laser-drawer__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(11, 15, 23, 0.9);
  border: 1px solid var(--accent);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
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

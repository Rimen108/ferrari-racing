<script setup>
import Car from './Car.vue'
import { CARS } from '../game'
const props = defineProps({ players: Array, finish: { type: Number, default: 5 } })
const START = 16, END = 94
const x = (p) => START + (END - START) * Math.min(1, (p.pos || 0) / Math.max(1, props.finish))
</script>
<template>
  <div class="scene">
    <div class="stand"><span>SCUDERIA · RACING · LIVE</span></div>
    <div class="track">
      <div class="kerb"></div>
      <div class="lanes">
        <div class="marks">
          <div class="startline" :style="{ left: START + '%' }"></div>
          <div class="finishline" :style="{ left: END + '%' }"><b>FINISH</b></div>
        </div>
        <div v-for="p in players" :key="p.id" class="lane">
          <div class="runner" :style="{ left: x(p) + '%' }">
            <span class="nick">{{ p.name }}</span>
            <Car :color="CARS[p.car]?.color || '#dc0000'" :num="p.num" />
          </div>
        </div>
        <p v-if="!players.length" class="empty">Waiting for drivers…</p>
      </div>
      <div class="kerb"></div>
    </div>
    <div class="stand low"></div>
  </div>
</template>
<style scoped>
.scene { display: flex; flex-direction: column; height: 100%; min-height: 360px; border-radius: 12px; overflow: hidden; background: #0d3b14; box-shadow: 0 10px 40px rgba(0,0,0,.6); }
.stand {
  height: 34px; flex: none; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title); font-size: .7rem; letter-spacing: 6px; color: rgba(255,255,255,.7);
  background:
    radial-gradient(circle at 6px 6px, #ffd100 2.5px, transparent 3.5px) 0 0 / 16px 12px,
    radial-gradient(circle at 6px 6px, #fff 2.5px, transparent 3.5px) 8px 6px / 16px 12px,
    radial-gradient(circle at 6px 6px, #dc0000 2.5px, transparent 3.5px) 4px 3px / 16px 12px,
    linear-gradient(#2a2a2a, #151515);
}
.stand.low { height: 18px; }
.track { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.kerb { height: 10px; flex: none; background: repeating-linear-gradient(90deg, #dc0000 0 28px, #fff 28px 56px); }
.lanes { flex: 1; display: flex; flex-direction: column; position: relative; background: #1b1b1e; min-height: 0; }
.lane { flex: 1 1 0; min-height: 20px; position: relative; border-bottom: 1px dashed rgba(255,255,255,.12); }
.lane:nth-child(odd) { background: rgba(255,255,255,.03); }
.runner { position: absolute; top: 0; height: 100%; transform: translateX(-100%); display: flex; align-items: center; gap: 6px; padding: 2px 0; transition: left 1.4s cubic-bezier(.3,.8,.3,1); z-index: 2; }
.nick { font-weight: 700; font-size: clamp(.6rem, 1.1vw, .95rem); text-shadow: 0 1px 3px #000; white-space: nowrap; max-width: 14vw; overflow: hidden; text-overflow: ellipsis; }
.marks { position: absolute; inset: 0; pointer-events: none; }
.startline { position: absolute; top: 0; bottom: 0; width: 6px; background: #fff; opacity: .9; }
.finishline { position: absolute; top: 0; bottom: 0; width: 22px; background: repeating-conic-gradient(#fff 0 25%, #000 0 50%) 0 0 / 11px 11px; }
.finishline b { position: absolute; top: 2px; left: 28px; font-family: var(--font-title); font-size: .6rem; color: var(--yellow); }
.empty { margin: auto; color: var(--grey); font-family: var(--font-title); }
</style>

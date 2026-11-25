<script setup>
const colors = ['#dc0000', '#ffd100', '#ffffff', '#ff5a5a']
const bits = Array.from({ length: 90 }, () => ({
  left: Math.random() * 100 + '%',
  delay: Math.random() * 3 + 's',
  dur: 2.5 + Math.random() * 3 + 's',
  bg: colors[Math.floor(Math.random() * colors.length)],
  size: 6 + Math.random() * 8 + 'px',
}))
</script>
<template>
  <div class="confetti">
    <i v-for="(b, i) in bits" :key="i" :style="{ left: b.left, animationDelay: b.delay, animationDuration: b.dur, background: b.bg, width: b.size, height: b.size }"></i>
  </div>
</template>
<style scoped>
.confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 60; }
i { position: absolute; top: -20px; animation: fall linear infinite; border-radius: 2px; }
@keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
</style>

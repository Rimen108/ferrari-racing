<script setup>
defineProps({ color: String, num: [Number, String] })
</script>
<template>
  <svg viewBox="0 0 60 24" class="car" preserveAspectRatio="xMidYMid meet">
    <rect x="9" y="1" width="10" height="4.5" rx="1.5" fill="#111" />
    <rect x="9" y="18.5" width="10" height="4.5" rx="1.5" fill="#111" />
    <rect x="38" y="1" width="9" height="4.5" rx="1.5" fill="#111" />
    <rect x="38" y="18.5" width="9" height="4.5" rx="1.5" fill="#111" />
    <rect x="1" y="3" width="4" height="18" rx="1" fill="#222" />
    <rect x="53" y="2" width="5" height="20" rx="1" fill="#222" />
    <path d="M5 8 L30 7 L44 9.5 L53 11 L53 13 L44 14.5 L30 17 L5 16 Z" :fill="color" stroke="#000" stroke-width=".6" />
    <ellipse cx="29" cy="12" rx="4" ry="3" fill="#0b0b0b" />
    <circle cx="29" cy="12" r="1.8" fill="#fff" opacity=".85" />
    <text x="17" y="14.2" font-size="6" font-weight="900" text-anchor="middle" fill="#fff" stroke="#000" stroke-width=".4" font-family="Orbitron, sans-serif">{{ num }}</text>
  </svg>
</template>
<style scoped>
.car { height: 100%; aspect-ratio: 60 / 24; filter: drop-shadow(0 2px 2px rgba(0,0,0,.6)); }
</style>

<script setup lang="ts">
// LiteEditor logo; keep in sync with public/icon.svg
const id = `logo-bg-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient :id="id" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a268f" />
        <stop offset="1" stop-color="#111755" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" :fill="`url(#${id})`" />
    <g transform="translate(32 32) scale(.82) translate(-33.5 -32)">
      <path d="M19 11h10v31h19v11H19z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
      <rect x="38" y="15" width="5.5" height="19" rx="2.75" fill="#ffd84d" />
    </g>
  </svg>
</template>

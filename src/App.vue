<script setup lang="ts">
import { RouterView } from 'vue-router'
import DialogHost from '@/components/DialogHost.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <DialogHost />
</template>

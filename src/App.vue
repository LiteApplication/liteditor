<script setup lang="ts">
import { RouterView } from 'vue-router'
import DialogHost from '@/components/DialogHost.vue'
import NewPageDialog from '@/components/NewPageDialog.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <DialogHost />
  <NewPageDialog />
</template>

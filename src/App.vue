<template>
  <div class="min-h-screen flex flex-col">
    <TheHeader />
    <main class="flex-grow container mx-auto px-4 py-8">
      <router-view />
    </main>
    <TheFooter />
  </div>
</template>

<script setup>
import TheHeader from './components/layout/TheHeader.vue';
import TheFooter from './components/layout/TheFooter.vue';
</script>

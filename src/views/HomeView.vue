<template>
  <div class="home">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-6">Aves Audio Spectrum</h1>
      <div class="mb-8">
        <AudioVisualizer />
      </div>
    </div>
  </div>
</template>

<script>
import AudioVisualizer from '@/components/AudioVisualizer.vue'

export default {
  name: 'HomeView',
  components: {
    AudioVisualizer
  }
}
</script>

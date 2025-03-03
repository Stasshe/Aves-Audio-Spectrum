<template>
  <div class="app">
    <header class="bg-primary text-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-bold">Aves Audio Spectrum</h1>
          <nav>
            <ul class="flex space-x-4">
              <li>
                <router-link to="/" class="hover:underline">Home</router-link>
              </li>
              <li>
                <router-link to="/about" class="hover:underline">About</router-link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
    
    <main>
      <router-view />
    </main>
    
    <footer class="bg-gray-100 mt-auto">
      <div class="container mx-auto px-4 py-4 text-center text-gray-600">
        <p>&copy; 2023 Aves Audio Spectrum</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import TheHeader from './components/layout/TheHeader.vue';
import TheFooter from './components/layout/TheFooter.vue';
</script>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>

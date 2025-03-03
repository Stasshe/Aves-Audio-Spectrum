<template>
  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-4 py-4 flex justify-between items-center">
      <router-link to="/" class="flex items-center gap-2">
        <img src="@/assets/logo.svg" alt="Aves Logo" class="h-8" />
        <span class="text-xl font-bold text-primary">Aves Audio Spectrum</span>
      </router-link>
      <nav>
        <ul class="flex gap-6">
          <li><router-link to="/" class="hover:text-secondary">ホーム</router-link></li>
          <li><router-link to="/editor" class="hover:text-secondary">エディター</router-link></li>
          <li><router-link to="/about" class="hover:text-secondary">About</router-link></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

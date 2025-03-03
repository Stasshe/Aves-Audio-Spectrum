<template>
  <header class="bg-primary text-white shadow-md">
    <div class="container mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-xl font-bold">Aves Audio Spectrum</h1>
        <nav>
          <ul class="flex space-x-4">
            <li>
              <router-link to="/" class="hover:underline">エディター</router-link>
            </li>
            <li>
              <router-link to="/about" class="hover:underline">About</router-link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>

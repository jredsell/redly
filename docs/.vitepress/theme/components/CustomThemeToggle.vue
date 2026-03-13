<script setup>
import { useData } from 'vitepress'
import { computed, onMounted, ref } from 'vue'

const { isDark } = useData()
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<template>
  <button 
    v-if="mounted"
    class="custom-theme-toggle" 
    @click="toggleTheme"
    title="Toggle Theme"
  >
    <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  </button>
</template>

<style scoped>
.custom-theme-toggle {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 30px;
  height: 30px;
}

.custom-theme-toggle:hover {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
</style>

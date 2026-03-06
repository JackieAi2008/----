<template>
  <router-link
    :to="to"
    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
    :class="[
      active
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    ]"
  >
    <component :is="iconComponent" class="w-5 h-5" />
    <span>{{ label }}</span>
  </router-link>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 导航项组件
 */
import { computed, type Component } from 'vue'
import {
  Calendar,
  FolderKanban,
  FileText,
  Settings,
  Users,
  LayoutDashboard
} from 'lucide-vue-next'

const props = defineProps<{
  to: string
  icon: string
  label: string
  active?: boolean
}>()

// 图标映射
const iconMap: Record<string, Component> = {
  Calendar,
  FolderKanban,
  FileText,
  Settings,
  Users,
  LayoutDashboard
}

const iconComponent = computed(() => iconMap[props.icon] || Calendar)
</script>

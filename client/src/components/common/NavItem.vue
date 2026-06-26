<template>
  <router-link
    :to="to"
    class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden"
    :class="[
      active
        ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10'
        : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
    ]"
  >
    <!-- 活跃状态背景光效 -->
    <div
      v-if="active"
      class="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none"
    ></div>

    <component
      :is="iconComponent"
      class="w-5 h-5 transition-all duration-200 relative z-10"
      :class="{ 'scale-110 drop-shadow-sm': active }"
    />
    <span class="font-medium relative z-10">{{ label }}</span>

    <!-- 活跃指示器 -->
    <div
      v-if="active"
      class="ml-auto w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50 relative z-10"
    ></div>
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
  LayoutDashboard,
  Trash2,
  Building2,
  Bell
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
  LayoutDashboard,
  Trash2,
  Building2,
  Bell
}

const iconComponent = computed(() => iconMap[props.icon] || Calendar)
</script>

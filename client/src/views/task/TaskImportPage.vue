<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">批量导入任务</h1>
      <p class="text-sm text-gray-500">从 Excel 批量创建任务 (R0 §3)</p>
    </div>

    <!-- 这里直接复用 TaskImportDialog 作为页面内容 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <p class="text-sm text-gray-600 mb-4">
        点击下方按钮打开批量导入向导。也可通过页面顶部「批量导入」按钮访问。
      </p>
      <button
        @click="showDialog = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
      >
        <Upload class="w-4 h-4" />
        开始批量导入
      </button>
    </div>

    <TaskImportDialog
      v-if="showDialog"
      @close="showDialog = false"
      @imported="handleImported"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - R0 §3 任务批量导入页面
 *
 * 作为 dialog 模式的 fallback: 直接打开 /tasks/import 也能进入导入流程
 * (主路径仍是顶部「批量导入」按钮打开 dialog)
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Upload } from 'lucide-vue-next'
import TaskImportDialog from '@/components/task/TaskImportDialog.vue'

const router = useRouter()
const showDialog = ref(true)  // 进入页面默认打开 dialog

function handleImported(taskIds: string[]) {
  showDialog.value = false
  if (taskIds.length > 0) {
    // 导入成功后跳到任务页
    router.push('/calendar')
  } else {
    router.push('/dashboard')
  }
}
</script>

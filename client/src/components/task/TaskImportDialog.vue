<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800">批量导入任务</h3>
        <button
          @click="handleClose"
          class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="关闭"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 步骤指示器 -->
      <div class="px-6 pt-4 pb-2 border-b border-gray-100">
        <ol class="flex items-center w-full text-sm font-medium text-center text-gray-500 sm:text-base">
          <li
            v-for="(s, idx) in steps"
            :key="s.key"
            class="flex items-center"
            :class="[
              idx === currentStep ? 'text-blue-600' : '',
              idx < currentStep ? 'text-green-600' : ''
            ]"
          >
            <span
              class="flex items-center justify-center w-7 h-7 mr-2 rounded-full border-2 text-xs"
              :class="[
                idx === currentStep ? 'border-blue-600 bg-blue-50' : '',
                idx < currentStep ? 'border-green-600 bg-green-50' : '',
                idx > currentStep ? 'border-gray-300' : ''
              ]"
            >
              <Check v-if="idx < currentStep" class="w-4 h-4" />
              <span v-else>{{ idx + 1 }}</span>
            </span>
            <span class="hidden sm:inline">{{ s.label }}</span>
            <ChevronRight v-if="idx < steps.length - 1" class="w-4 h-4 mx-2 text-gray-400" />
          </li>
        </ol>
      </div>

      <!-- 主体内容 -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- 步骤 1: 下载模板 -->
        <div v-if="currentStep === 0" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 class="text-sm font-semibold text-blue-800 mb-2">使用说明</h4>
            <ol class="text-sm text-blue-700 list-decimal pl-5 space-y-1">
              <li>下载导入模板 (含 4 个下拉数据校验,直接填写即可)</li>
              <li>按列填写任务信息 (标题、项目、负责人、优先级、截止日期等)</li>
              <li>上传 Excel,系统会校验每一行</li>
              <li>预览无误后,确认导入 (任一行失败则整批回滚)</li>
            </ol>
          </div>

          <div class="space-y-2">
            <p class="text-sm text-gray-600">字段说明:</p>
            <ul class="text-xs text-gray-500 list-disc pl-5 space-y-1">
              <li>必填: 任务标题 / 项目ID / 负责人ID / 优先级 / 截止日期</li>
              <li>选填: 描述 / 交付成果 / 标签 / 分类ID</li>
              <li>优先级: 4 象限 (重要且紧急 / 重要不紧急 / 紧急不重要 / 不重要不紧急)</li>
              <li>截止日期: YYYY-MM-DD 格式,不能早于今天</li>
              <li>标签: 多个用逗号分隔; 用 <code class="bg-gray-100 px-1">@&lt;userId&gt;</code> 简写会自动添加为协作者</li>
            </ul>
          </div>

          <button
            @click="handleDownloadTemplate"
            :disabled="downloading"
            class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Loader2 v-if="downloading" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            {{ downloading ? '下载中...' : '下载导入模板' }}
          </button>
        </div>

        <!-- 步骤 2: 上传 -->
        <div v-else-if="currentStep === 1" class="space-y-4">
          <div
            @drop.prevent="handleDrop"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            ]"
          >
            <Upload class="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600 mb-2">拖拽 Excel 文件到这里,或</p>
            <label class="inline-block">
              <input
                type="file"
                accept=".xlsx"
                @change="handleFileSelect"
                class="hidden"
              />
              <span class="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm inline-block">
                选择文件
              </span>
            </label>
            <p class="text-xs text-gray-400 mt-3">仅支持 .xlsx,文件大小不超过 10MB</p>
          </div>

          <div v-if="selectedFile" class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div class="flex items-center gap-2 min-w-0">
              <FileSpreadsheet class="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div class="min-w-0">
                <p class="text-sm text-gray-700 truncate">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
            </div>
            <button
              @click="selectedFile = null"
              class="p-1 hover:bg-blue-100 rounded"
              title="移除"
            >
              <X class="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div v-if="uploadError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ uploadError }}</p>
          </div>
        </div>

        <!-- 步骤 3: 预览 -->
        <div v-else-if="currentStep === 2" class="space-y-4">
          <div v-if="previewing" class="py-12 text-center text-gray-500">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2" />
            正在解析 Excel...
          </div>

          <div v-else-if="previewResult" class="space-y-3">
            <!-- 统计 -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-gray-50 rounded-lg p-3 text-center">
                <p class="text-2xl font-semibold text-gray-700">{{ totalRows }}</p>
                <p class="text-xs text-gray-500 mt-1">总行数</p>
              </div>
              <div class="bg-green-50 rounded-lg p-3 text-center">
                <p class="text-2xl font-semibold text-green-600">{{ previewResult.valid.length }}</p>
                <p class="text-xs text-gray-500 mt-1">有效</p>
              </div>
              <div class="bg-red-50 rounded-lg p-3 text-center">
                <p class="text-2xl font-semibold text-red-600">{{ previewResult.invalid.length }}</p>
                <p class="text-xs text-gray-500 mt-1">错误</p>
              </div>
            </div>

            <!-- 错误明细 -->
            <div v-if="previewResult.invalid.length > 0" class="border border-red-200 rounded-lg overflow-hidden">
              <div class="px-3 py-2 bg-red-50 text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertCircle class="w-4 h-4" />
                错误行 ({{ previewResult.invalid.length }})
              </div>
              <div class="max-h-48 overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th class="px-3 py-2 text-left w-16">行</th>
                      <th class="px-3 py-2 text-left">错误原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in previewResult.invalid"
                      :key="`err-${row.row}`"
                      class="border-t border-gray-100"
                    >
                      <td class="px-3 py-2 text-red-600 font-mono text-xs">#{{ row.row }}</td>
                      <td class="px-3 py-2 text-red-700">
                        <div
                          v-for="(e, i) in row.errors"
                          :key="i"
                          class="text-xs"
                        >• {{ e }}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 有效预览 -->
            <div v-if="previewResult.valid.length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-green-600" />
                有效行预览 (最多展示前 10 行)
              </div>
              <div class="max-h-48 overflow-y-auto">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 text-gray-500">
                    <tr>
                      <th class="px-3 py-2 text-left w-12">行</th>
                      <th class="px-3 py-2 text-left">标题</th>
                      <th class="px-3 py-2 text-left">项目</th>
                      <th class="px-3 py-2 text-left">负责人</th>
                      <th class="px-3 py-2 text-left">优先级</th>
                      <th class="px-3 py-2 text-left">截止</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in previewResult.valid.slice(0, 10)"
                      :key="`ok-${row.row}`"
                      class="border-t border-gray-100"
                    >
                      <td class="px-3 py-2 text-gray-500 font-mono">#{{ row.row }}</td>
                      <td class="px-3 py-2 text-gray-700 truncate max-w-[180px]">{{ row.parsed.title }}</td>
                      <td class="px-3 py-2 text-gray-500 truncate max-w-[120px]">{{ row.parsed.projectId.slice(0, 8) }}…</td>
                      <td class="px-3 py-2 text-gray-500 truncate max-w-[120px]">{{ row.parsed.assigneeId.slice(0, 8) }}…</td>
                      <td class="px-3 py-2 text-gray-500">{{ priorityLabel(row.parsed.priority) }}</td>
                      <td class="px-3 py-2 text-gray-500">{{ row.parsed.dueDate.slice(0, 10) }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="previewResult.valid.length > 10" class="px-3 py-2 text-xs text-gray-400">
                  还有 {{ previewResult.valid.length - 10 }} 行未展示…
                </p>
              </div>
            </div>
          </div>

          <div v-if="previewError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ previewError }}</p>
          </div>
        </div>

        <!-- 步骤 4: 确认导入 -->
        <div v-else-if="currentStep === 3" class="space-y-4">
          <div v-if="importing" class="py-12 text-center text-gray-500">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2" />
            正在写入数据库,请稍候...
            <p class="text-xs text-gray-400 mt-2">任一行失败将导致整批回滚</p>
          </div>

          <div v-else-if="importResult">
            <!-- 成功 -->
            <div v-if="importResult.success" class="space-y-3">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 class="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p class="text-base font-medium text-green-800">导入成功</p>
                  <p class="text-sm text-green-700">已成功导入 {{ importResult.imported }} 个任务</p>
                </div>
              </div>
            </div>

            <!-- 失败 -->
            <div v-else class="space-y-3">
              <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle class="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
                <div class="flex-1">
                  <p class="text-base font-medium text-red-800">导入失败,整批回滚</p>
                  <p class="text-sm text-red-700 mt-1">
                    共 {{ importResult.failed }} 行错误,数据库无任何变更
                  </p>
                </div>
              </div>

              <div v-if="importResult.errors.length > 0" class="border border-red-200 rounded-lg overflow-hidden">
                <div class="px-3 py-2 bg-red-50 text-sm font-medium text-red-700">错误明细 (前 10 条)</div>
                <div class="max-h-40 overflow-y-auto">
                  <table class="w-full text-sm">
                    <tbody>
                      <tr
                        v-for="(e, idx) in importResult.errors.slice(0, 10)"
                        :key="`err-${idx}`"
                        class="border-t border-gray-100"
                      >
                        <td class="px-3 py-2 text-red-600 font-mono text-xs w-16">#{{ e.row || '-' }}</td>
                        <td class="px-3 py-2 text-red-700 text-xs">{{ e.message }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <a
                v-if="importResult.failureReportUrl"
                :href="importResult.failureReportUrl"
                download
                class="block w-full py-3 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-center text-sm font-medium flex items-center justify-center gap-2"
              >
                <Download class="w-4 h-4" />
                下载失败报告 (.xlsx)
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <button
          v-if="currentStep > 0 && !importing"
          @click="currentStep--"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-sm"
        >
          上一步
        </button>
        <div v-else></div>

        <div class="flex gap-2">
          <button
            @click="handleClose"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-sm"
          >
            {{ importResult?.success ? '完成' : '取消' }}
          </button>

          <button
            v-if="currentStep === 1"
            @click="handlePreview"
            :disabled="!selectedFile || previewing"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-1"
          >
            <Loader2 v-if="previewing" class="w-4 h-4 animate-spin" />
            上传并预览
          </button>

          <button
            v-else-if="currentStep === 2 && previewResult && previewResult.invalid.length === 0"
            @click="handleImport"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            确认导入 {{ previewResult.valid.length }} 个任务
          </button>

          <button
            v-else-if="currentStep === 2 && previewResult && previewResult.invalid.length > 0"
            disabled
            class="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm cursor-not-allowed"
            :title="`有 ${previewResult.invalid.length} 行错误,请修正后重新上传`"
          >
            有 {{ previewResult.invalid.length }} 行错误
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - R0 §3 任务批量导入对话框
 *
 * 4 步向导:
 *  1) 下载模板
 *  2) 上传 Excel
 *  3) 预览 (调用 preview 接口)
 *  4) 确认导入 (调用 import 接口)
 */
import { ref, computed } from 'vue'
import {
  X,
  ChevronRight,
  Check,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-vue-next'
import {
  downloadTaskTemplate,
  previewTaskImport,
  executeTaskImport,
  type PreviewResult,
  type ImportSuccess,
  type ImportFailure,
  type TaskPriority
} from '@/api/import'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported', taskIds: string[]): void
}>()

const toast = useToast()

const steps = [
  { key: 'download', label: '下载模板' },
  { key: 'upload', label: '上传文件' },
  { key: 'preview', label: '预览' },
  { key: 'confirm', label: '确认导入' }
] as const

const currentStep = ref(0)
const downloading = ref(false)
const selectedFile = ref<File | null>(null)
const dragOver = ref(false)
const uploadError = ref('')
const previewing = ref(false)
const previewResult = ref<PreviewResult | null>(null)
const previewError = ref('')
const importing = ref(false)
const importResult = ref<ImportSuccess | ImportFailure | null>(null)

const totalRows = computed(() => {
  if (!previewResult.value) return 0
  return previewResult.value.valid.length + previewResult.value.invalid.length
})

function handleClose() {
  emit('close')
}

async function handleDownloadTemplate() {
  downloading.value = true
  try {
    await downloadTaskTemplate()
    toast.success('模板已下载', '请按格式填写任务信息')
    // 自动跳到下一步
    currentStep.value = 1
  } catch (e) {
    console.error('下载模板失败', e)
    toast.error('下载失败', '请稍后重试')
  } finally {
    downloading.value = false
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) validateAndSetFile(file)
  // 清空 input 允许重复选同一文件
  input.value = ''
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) validateAndSetFile(file)
}

function validateAndSetFile(file: File) {
  uploadError.value = ''
  if (!/\.xlsx$/i.test(file.name)) {
    uploadError.value = '仅支持 .xlsx 文件'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = '文件大小不能超过 10MB'
    return
  }
  selectedFile.value = file
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function handlePreview() {
  if (!selectedFile.value) return
  previewing.value = true
  previewError.value = ''
  try {
    const result = await previewTaskImport(selectedFile.value)
    previewResult.value = result
    currentStep.value = 2
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失败'
    console.error('预览失败', e)
    previewError.value = msg
    toast.error('预览失败', msg)
  } finally {
    previewing.value = false
  }
}

async function handleImport() {
  if (!selectedFile.value) return
  importing.value = true
  try {
    const result = await executeTaskImport(selectedFile.value)
    importResult.value = result
    currentStep.value = 3
    if (result.success) {
      toast.success('导入成功', `已导入 ${result.imported} 个任务`)
      emit('imported', result.taskIds)
    } else {
      toast.error('导入失败', '已整批回滚,可下载失败报告')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '导入失败'
    console.error('导入失败', e)
    toast.error('导入失败', msg)
  } finally {
    importing.value = false
  }
}

function priorityLabel(p: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    IMPORTANT_URGENT: '重要且紧急',
    IMPORTANT_NOT_URGENT: '重要不紧急',
    URGENT_NOT_IMPORTANT: '紧急不重要',
    NOT_IMPORTANT_NOT_URGENT: '不重要不紧急'
  }
  return map[p] || p
}
</script>

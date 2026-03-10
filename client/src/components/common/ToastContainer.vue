<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
        >
          <!-- 图标 -->
          <div class="toast-icon">
            <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5" />
            <XCircle v-else-if="toast.type === 'error'" class="w-5 h-5" />
            <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5" />
            <Info v-else class="w-5 h-5" />
          </div>

          <!-- 内容 -->
          <div class="toast-content">
            <p class="toast-title">{{ toast.title }}</p>
            <p v-if="toast.message" class="toast-message">{{ toast.message }}</p>
          </div>

          <!-- 关闭按钮 -->
          <button
            @click="remove(toast.id)"
            class="toast-close"
          >
            <X class="w-4 h-4" />
          </button>

          <!-- 进度条 -->
          <div
            v-if="toast.duration && toast.duration > 0"
            class="toast-progress"
            :style="{ animationDuration: `${toast.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 中集智历 - Toast 通知容器组件
 */
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 320px;
  max-width: 420px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.toast-icon {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.01em;
}

.toast-message {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0 0;
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s;
  border-radius: 8px;
  margin: -2px -4px -2px 0;
}

.toast-close:hover {
  color: #475569;
  background: #f1f5f9;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  animation: progress linear forwards;
  border-radius: 0 0 16px 16px;
}

@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* 类型样式 */
.toast-success {
  border-left: 4px solid #10b981;
}
.toast-success .toast-icon {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}
.toast-success .toast-progress {
  background: #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}
.toast-error .toast-icon {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
.toast-error .toast-progress {
  background: #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}
.toast-warning .toast-icon {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}
.toast-warning .toast-progress {
  background: #f59e0b;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}
.toast-info .toast-icon {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}
.toast-info .toast-progress {
  background: #3b82f6;
}

/* 动画 */
.toast-enter-active {
  animation: slideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  animation: slideOut 0.25s ease-in;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

/* 移动端适配 */
@media (max-width: 480px) {
  .toast-container {
    left: 16px;
    right: 16px;
    top: 16px;
  }

  .toast-item {
    min-width: auto;
    max-width: none;
    padding: 14px 16px;
  }
}
</style>

<template>
  <div class="h-full flex flex-col animate-slide-up">
    <!-- 顶部工具栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
      <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
        <!-- 左箭头 -->
        <button
          @click="prevPeriod"
          class="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95"
        >
          <ChevronLeft class="w-5 h-5 text-gray-600" />
        </button>

        <!-- 年月选择器（仅在月/年视图显示） -->
        <DatePickerDropdown
          v-if="currentView === 'month' || currentView === 'year'"
          v-model:year="currentYear"
          v-model:month="currentMonth"
        />

        <!-- 周/日/甘特图视图显示日期范围 -->
        <h2
          v-else
          class="text-base sm:text-lg md:text-xl font-semibold"
          style="color: var(--color-text-primary)"
        >
          {{ periodTitle }}
        </h2>

        <!-- 右箭头 -->
        <button
          @click="nextPeriod"
          class="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95"
        >
          <ChevronRight class="w-5 h-5 text-gray-600" />
        </button>

        <!-- 今天按钮（桌面端显示） -->
        <button
          @click="goToToday"
          class="hidden sm:block px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          今天
        </button>
      </div>

      <!-- 右侧：视图切换和筛选 -->
      <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
        <!-- 视图切换 -->
        <div class="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            v-for="v in viewOptions"
            :key="v.value"
            @click="currentView = v.value"
            class="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap"
            :class="currentView === v.value ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'"
          >
            {{ v.label }}
          </button>
        </div>

        <!-- 项目筛选 -->
        <select
          v-model="selectedProjectId"
          class="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white flex-shrink-0"
        >
          <option value="">全部项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 移动端今天按钮 -->
    <button
      @click="goToToday"
      class="sm:hidden mb-4 w-full py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <Calendar class="w-4 h-4" />
      回到今天
    </button>

    <!-- 年历视图 -->
    <div v-if="currentView === 'year'" class="flex-1 bg-white rounded-2xl border border-gray-100 overflow-auto p-4 shadow-card">
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="month in 12"
          :key="month"
          class="border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
          @click="selectMonth(month)"
        >
          <!-- 月份标题 -->
          <div class="text-center font-semibold text-sm mb-2" :class="{ 'text-blue-600': isCurrentMonthOfYear(month) }">
            {{ month }}月
          </div>
          <!-- 星期标题 -->
          <div class="grid grid-cols-7 text-xs text-gray-400 mb-1">
            <div v-for="day in weekDaysShort" :key="day" class="text-center">{{ day }}</div>
          </div>
          <!-- 日期格子 -->
          <div class="grid grid-cols-7 text-xs">
            <div
              v-for="(date, index) in getYearMonthDays(month)"
              :key="index"
              class="text-center py-0.5 cursor-pointer hover:bg-gray-100 rounded"
              :class="{
                'text-gray-300': !isSameMonth(date, month),
                'text-blue-600 font-bold': isToday(date),
                'bg-blue-100 rounded': hasTask(date) && isSameMonth(date, month)
              }"
              @click="handleYearDateClick(date)"
            >
              {{ date.getDate() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 月视图 -->
    <div v-if="currentView === 'month'" class="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-card">
      <!-- 星期标题 -->
      <div class="grid grid-cols-7 bg-gray-50/50">
        <div
          v-for="day in weekDays"
          :key="day"
          class="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500"
        >
          <span class="hidden sm:inline">{{ day }}</span>
          <span class="sm:hidden">{{ day.slice(0, 1) }}</span>
        </div>
      </div>

      <!-- 日期格子 -->
      <div class="grid grid-cols-7 flex-1" style="grid-auto-rows: 1fr;">
        <div
          v-for="(date, index) in calendarDays"
          :key="index"
          class="border-b border-r border-gray-200 p-2 min-h-24 cursor-pointer hover:bg-gray-50 transition-colors"
          :class="{
            'bg-gray-50': !isCurrentMonth(date),
            'bg-blue-50': isToday(date),
            'bg-red-50': getLunarInfo(date).isHoliday && isCurrentMonth(date) && !isToday(date),
            'bg-green-100 ring-2 ring-green-400 ring-inset': isDragOver(date)
          }"
          @click="handleDateClick(date)"
          @dragover="handleDragOver($event, date)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, date)"
        >
          <!-- 日期和农历 -->
          <div class="flex items-start justify-between mb-1">
            <div class="flex flex-col">
              <span
                class="text-sm font-medium leading-tight"
                :class="{
                  'text-gray-400': !isCurrentMonth(date),
                  'text-blue-600': isToday(date),
                  'text-red-600': getLunarInfo(date).isHoliday && isCurrentMonth(date) && !isToday(date)
                }"
              >
                {{ getDateNumber(date) }}
              </span>
              <span
                class="text-[10px] leading-tight"
                :class="{
                  'text-gray-400': !isCurrentMonth(date),
                  'text-gray-500': isCurrentMonth(date) && !getLunarInfo(date).isHoliday && !getLunarInfo(date).solarTerm,
                  'text-red-500': getLunarInfo(date).isHoliday && isCurrentMonth(date),
                  'text-green-600': getLunarInfo(date).solarTerm && isCurrentMonth(date) && !getLunarInfo(date).isHoliday,
                  'text-orange-500': getLunarInfo(date).chineseHoliday && isCurrentMonth(date) && !getLunarInfo(date).isHoliday,
                  'text-blue-500': getLunarInfo(date).internationalHoliday && isCurrentMonth(date) && !getLunarInfo(date).chineseHoliday
                }"
              >
                {{ formatLunar(date) }}
              </span>
            </div>
            <!-- 任务数量角标 -->
            <span
              v-if="hasTask(date) && isCurrentMonth(date)"
              class="w-4 h-4 text-[10px] bg-blue-500 text-white rounded-full flex items-center justify-center"
            >
              {{ getTaskCount(date) }}
            </span>
          </div>

          <!-- 任务列表 -->
          <div class="space-y-1">
            <div
              v-for="task in getTasksForDate(date).slice(0, 3)"
              :key="task.id"
              class="text-xs p-1 rounded truncate cursor-pointer flex items-center gap-1"
              :style="{ backgroundColor: getTaskColor(task) + '20', color: getTaskColor(task) }"
              draggable="true"
              @dragstart="handleDragStart($event, task)"
              @dragend="handleDragEnd"
              @click.stop="handleTaskClick(task)"
            >
              <Repeat v-if="task.repeat" class="w-3 h-3 flex-shrink-0" />
              <span class="truncate">{{ task.title }}</span>
            </div>
            <div
              v-if="getTasksForDate(date).length > 3"
              class="text-xs text-gray-500"
            >
              +{{ getTasksForDate(date).length - 3 }} 更多
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 周视图 -->
    <div v-else-if="currentView === 'week'" class="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-card">
      <!-- 星期标题 -->
      <div class="grid grid-cols-7 bg-gray-50/50">
        <div
          v-for="(date, index) in weekDates"
          :key="index"
          class="p-2 sm:p-3 text-center border-r border-gray-100 last:border-r-0"
          :class="{ 'bg-blue-50/50': isToday(date) }"
        >
          <div class="text-xs text-gray-500">
            <span class="hidden sm:inline">{{ weekDays[index] }}</span>
            <span class="sm:hidden">{{ weekDays[index].slice(0, 1) }}</span>
          </div>
          <div
            class="text-base sm:text-lg font-semibold mt-1"
            :class="{ 'text-blue-600': isToday(date) }"
          >
            {{ date.getDate() }}
          </div>
        </div>
      </div>

      <!-- 周任务区域 -->
      <div class="grid grid-cols-7 flex-1 overflow-hidden">
        <div
          v-for="(date, index) in weekDates"
          :key="index"
          class="border-r border-gray-100 last:border-r-0 p-1.5 md:p-2 overflow-y-auto transition-colors"
          :class="{
            'bg-blue-50/30': isToday(date),
            'bg-green-100 ring-2 ring-green-400 ring-inset': isDragOver(date)
          }"
          @click="handleDateClick(date)"
          @dragover="handleDragOver($event, date)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, date)"
        >
          <div
            v-for="task in getTasksForDate(date)"
            :key="task.id"
            class="mb-2 p-2 rounded-xl border-l-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
            :style="{ borderLeftColor: getTaskColor(task) }"
            draggable="true"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @click.stop="handleTaskClick(task)"
          >
            <div class="text-xs md:text-sm font-medium text-gray-800 truncate flex items-center gap-1">
              <Repeat v-if="task.repeat" class="w-3 h-3 text-purple-500 flex-shrink-0" />
              <span class="truncate">{{ task.title }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-0.5">
              {{ formatTime(task.dueDate) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日视图 -->
    <div v-else-if="currentView === 'day'" class="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-card">
      <!-- 日期标题 -->
      <div class="p-4 md:p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div class="text-center">
          <div class="text-sm text-gray-500">{{ getWeekDayName(selectedDate) }}</div>
          <div
            class="text-2xl font-bold mt-1"
            :class="{ 'text-blue-600': isToday(selectedDate) }"
          >
            {{ selectedDate.getDate() }}日
          </div>
        </div>
      </div>

      <!-- 时间轴 -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="hour in hours"
          :key="hour"
          class="flex border-b border-gray-100 min-h-16"
        >
          <!-- 时间标签 -->
          <div class="w-16 p-2 text-xs text-gray-500 text-right flex-shrink-0">
            {{ hour.toString().padStart(2, '0') }}:00
          </div>
          <!-- 任务区域 -->
          <div
            class="flex-1 p-1 cursor-pointer hover:bg-gray-50"
            @click="handleTimeClick(hour)"
          >
            <div
              v-for="task in getTasksForHour(hour)"
              :key="task.id"
              class="p-2 rounded bg-blue-100 border-l-4 border-blue-500 mb-1 cursor-pointer hover:bg-blue-200"
              @click.stop="handleTaskClick(task)"
            >
              <div class="text-sm font-medium flex items-center gap-1">
                <Repeat v-if="task.repeat" class="w-3 h-3 text-purple-500 flex-shrink-0" />
                <span class="truncate">{{ task.title }}</span>
              </div>
              <div class="text-xs text-gray-600">{{ formatTime(task.dueDate) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else-if="currentView === 'list'" class="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <!-- 批量操作工具栏 -->
      <div
        v-if="selectedCount > 0"
        class="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-3"
      >
        <span class="text-sm font-medium text-blue-700">
          已选择 {{ selectedCount }} 个任务
        </span>
        <div class="flex-1"></div>
        <!-- 批量修改状态 -->
        <select
          class="input w-28 text-sm"
          @change="(e) => { const val = (e.target as HTMLSelectElement).value; if (val) handleBatchStatusChange(val as any); (e.target as HTMLSelectElement).value = '' }"
          :disabled="batchOperationLoading"
        >
          <option value="">修改状态</option>
          <option value="TODO">待办</option>
          <option value="IN_PROGRESS">进行中</option>
          <option value="DONE">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <!-- 批量修改优先级 -->
        <select
          class="input w-28 text-sm"
          @change="(e) => { const val = (e.target as HTMLSelectElement).value; if (val) handleBatchPriorityChange(val as any); (e.target as HTMLSelectElement).value = '' }"
          :disabled="batchOperationLoading"
        >
          <option value="">修改优先级</option>
          <option value="HIGH">高</option>
          <option value="MEDIUM">中</option>
          <option value="LOW">低</option>
        </select>
        <!-- 批量归档 -->
        <button
          @click="handleBatchArchive"
          :disabled="batchOperationLoading"
          class="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Archive class="w-4 h-4" />
          归档
        </button>
        <!-- 批量删除 -->
        <button
          @click="handleBatchDelete"
          :disabled="batchOperationLoading"
          class="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 class="w-4 h-4" />
          删除
        </button>
        <!-- 取消选择 -->
        <button
          @click="clearSelection"
          class="p-1.5 text-gray-500 hover:text-gray-700"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 筛选栏 -->
      <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
        <span class="text-sm text-gray-500">共 {{ filteredTasks.length }} 个任务</span>
        <div class="flex-1"></div>
        <!-- 状态筛选 -->
        <select
          v-model="selectedStatus"
          class="input w-32"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- 任务列表 -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
          <p class="text-lg">暂无任务</p>
          <p class="text-sm mt-2">点击"新建任务"按钮创建新任务</p>
        </div>
        <table v-else class="w-full">
          <thead class="bg-gray-50 sticky top-0">
            <tr class="text-left text-sm text-gray-600">
              <th class="px-4 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th class="px-4 py-3 font-medium">任务标题</th>
              <th class="px-4 py-3 font-medium w-32">所属项目</th>
              <th class="px-4 py-3 font-medium w-28">截止日期</th>
              <th class="px-4 py-3 font-medium w-24">状态</th>
              <th class="px-4 py-3 font-medium w-20">优先级</th>
              <th class="px-4 py-3 font-medium w-32">负责人</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in filteredTasks"
              :key="task.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              :class="{ 'bg-blue-50': isTaskSelected(task.id) }"
            >
              <td class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="isTaskSelected(task.id)"
                  @change="toggleTaskSelection(task.id)"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <div class="flex items-center gap-2">
                  <div
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: getTaskColor(task) }"
                  ></div>
                  <Repeat v-if="task.repeat" class="w-3 h-3 text-purple-500 flex-shrink-0" />
                  <span class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <span class="text-sm text-gray-600">{{ getProjectName(task) }}</span>
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <span
                  class="text-sm"
                  :class="{ 'text-red-600 font-medium': isOverdue(task) }"
                >
                  {{ formatDate(task.dueDate) }}
                </span>
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <span
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                  :class="getStatusClass(task.status)"
                >
                  {{ getStatusLabel(task.status) }}
                </span>
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <span
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                  :class="getPriorityClass(task.priority)"
                >
                  {{ getPriorityLabel(task.priority) }}
                </span>
              </td>
              <td class="px-4 py-3 cursor-pointer" @click="handleTaskClick(task)">
                <div v-if="task.assignee" class="flex items-center gap-1">
                  <span class="text-sm text-gray-700">{{ task.assignee.nickname }}</span>
                  <span v-if="task.assignee.department" class="text-xs text-gray-400">
                    [{{ task.assignee.department.name }}]
                  </span>
                </div>
                <span v-else class="text-sm text-gray-400">未分配</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 甘特图视图 -->
    <div v-else-if="currentView === 'gantt'" class="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <!-- 筛选栏 -->
      <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
        <span class="text-sm text-gray-500">共 {{ ganttTasks.length }} 个任务（需设置开始日期和截止日期）</span>
      </div>

      <!-- 甘特图区域 -->
      <div class="flex-1 overflow-auto">
        <div v-if="ganttTasks.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
          <p class="text-lg">暂无甘特图数据</p>
          <p class="text-sm mt-2">请为任务设置开始日期和截止日期</p>
        </div>

        <div v-else class="min-w-[800px]">
          <!-- 日期头部 -->
          <div class="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <!-- 任务名称列 -->
            <div class="w-64 flex-shrink-0 p-3 border-r border-gray-200 font-medium text-sm text-gray-600">
              任务名称
            </div>
            <!-- 日期列 -->
            <div class="flex-1 flex">
              <!-- 按周分组显示 -->
              <div
                v-for="(week, weekIndex) in ganttWeeks"
                :key="weekIndex"
                class="flex-1 border-r border-gray-200 last:border-r-0"
              >
                <div class="text-center text-xs text-gray-500 p-1 border-b border-gray-200 bg-gray-100">
                  第{{ weekIndex + 1 }}周 ({{ week[0].getMonth() + 1 }}/{{ week[0].getDate() }} - {{ week[6].getMonth() + 1 }}/{{ week[6].getDate() }})
                </div>
                <div class="flex">
                  <div
                    v-for="(date, dayIndex) in week"
                    :key="dayIndex"
                    class="flex-1 text-center text-xs p-1 border-r border-gray-100 last:border-r-0"
                    :class="{ 'bg-blue-50 text-blue-600 font-medium': isToday(date) }"
                  >
                    <div class="text-[10px] text-gray-400">{{ weekDays[date.getDay()] }}</div>
                    <div>{{ date.getDate() }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 任务列表 -->
          <div class="relative">
            <!-- 今日线 -->
            <div
              v-if="isGanttTodayVisible()"
              class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
              :style="{ left: `calc(256px + ${ganttTodayPosition}%)` }"
            >
              <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>

            <!-- 任务行 -->
            <div
              v-for="task in ganttTasks"
              :key="task.id"
              class="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              @click="handleTaskClick(task)"
            >
              <!-- 任务名称 -->
              <div class="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                <div class="flex items-center gap-2">
                  <div
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: getTaskColor(task) }"
                  ></div>
                  <Repeat v-if="task.repeat" class="w-3 h-3 text-purple-500 flex-shrink-0" />
                  <span class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ formatDate(task.startDate!) }} - {{ formatDate(task.dueDate) }}
                </div>
              </div>

              <!-- 甘特条区域 -->
              <div class="flex-1 relative py-3 px-2">
                <!-- 背景网格 -->
                <div class="absolute inset-0 flex pointer-events-none">
                  <div
                    v-for="(_, index) in ganttDateRange"
                    :key="index"
                    class="flex-1 border-r border-gray-100 last:border-r-0"
                    :class="{ 'bg-gray-50': index % 7 === 0 }"
                  ></div>
                </div>

                <!-- 任务条 -->
                <div
                  class="relative h-8 rounded-md overflow-hidden shadow-sm"
                  :style="{
                    marginLeft: `${getGanttTaskPosition(task).left}%`,
                    width: `${getGanttTaskPosition(task).width}%`,
                    backgroundColor: getTaskColor(task) + '30',
                    borderLeft: `3px solid ${getTaskColor(task)}`
                  }"
                >
                  <!-- 进度条 -->
                  <div
                    class="absolute inset-y-0 left-0 rounded-r-md transition-all duration-300"
                    :style="{
                      width: `${getGanttTaskProgress(task)}%`,
                      backgroundColor: getTaskColor(task) + '60'
                    }"
                  ></div>

                  <!-- 任务名称 -->
                  <div class="absolute inset-0 flex items-center px-2">
                    <span class="text-xs font-medium text-gray-700 truncate">{{ task.title }}</span>
                  </div>

                  <!-- 进度百分比 -->
                  <div class="absolute inset-y-0 right-2 flex items-center">
                    <span class="text-xs text-gray-500">{{ getGanttTaskProgress(task) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务创建/编辑弹窗 -->
    <TaskForm
      v-if="showCreateTask"
      :date="selectedDate"
      @close="showCreateTask = false"
      @saved="handleTaskSaved"
    />

    <!-- 浮动新建按钮 -->
    <FabButton @click="showCreateTask = true" />
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 日历页面
 * 支持年/月/周/日/列表/甘特图六种视图
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Repeat, Trash2, Archive, X, Calendar } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import { getTasks, updateTask, batchUpdateTasks, batchDeleteTasks, batchArchiveTasks } from '@/api/task'
import { getCalendarDays, isToday as checkIsToday, isSameDay, getWeekDayName, formatDateTime } from '@/utils/date'
import { getLunarInfo as getLunarInfoRaw, formatLunarDisplay, type LunarInfo } from '@/utils/lunar'
import { devLog } from '@/utils/logger'
import type { Task } from '@/types/task'
import TaskForm from '@/components/task/TaskForm.vue'
import DatePickerDropdown from '@/components/calendar/DatePickerDropdown.vue'
import FabButton from '@/components/common/FabButton.vue'

const router = useRouter()
const projectStore = useProjectStore()

// 视图选项
const viewOptions: Array<{ value: 'year' | 'month' | 'week' | 'day' | 'list' | 'gantt'; label: string }> = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'week', label: '周' },
  { value: 'day', label: '日' },
  { value: 'list', label: '列表' },
  { value: 'gantt', label: '甘特图' }
]

// 状态
const currentView = ref<'year' | 'month' | 'week' | 'day' | 'list' | 'gantt'>('month')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(new Date())
const selectedProjectId = ref('')
const selectedStatus = ref<string>('')
const tasks = ref<Task[]>([])
const showCreateTask = ref(false)

// 常量
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const weekDaysShort = ['日', '一', '二', '三', '四', '五', '六']
const hours = Array.from({ length: 24 }, (_, i) => i)

// 农历缓存
const lunarCache = new Map<string, LunarInfo>()

function getLunarInfo(date: Date): LunarInfo {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  if (!lunarCache.has(key)) {
    lunarCache.set(key, getLunarInfoRaw(date))
  }
  return lunarCache.get(key)!
}

function formatLunar(date: Date): string {
  const info = getLunarInfo(date)
  return formatLunarDisplay(info)
}

// 状态选项
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'DONE', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' }
]

// 优先级选项
const priorityOptions: Record<string, { label: string; color: string }> = {
  HIGH: { label: '高', color: 'text-red-600 bg-red-100' },
  MEDIUM: { label: '中', color: 'text-yellow-600 bg-yellow-100' },
  LOW: { label: '低', color: 'text-green-600 bg-green-100' }
}

// 拖拽相关状态
const draggedTask = ref<Task | null>(null)
const dragOverDate = ref<Date | null>(null)

// 批量操作相关状态
const selectedTaskIds = ref<Set<string>>(new Set())
const batchOperationLoading = ref(false)

// 计算属性
const projects = computed(() => projectStore.activeProjects)

const periodTitle = computed(() => {
  if (currentView.value === 'year') {
    return `${currentYear.value}年`
  } else if (currentView.value === 'month') {
    return `${currentYear.value}年${currentMonth.value}月`
  } else if (currentView.value === 'week') {
    const start = weekDates.value[0]
    const end = weekDates.value[6]
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
  } else if (currentView.value === 'gantt') {
    const start = ganttDateRange.value[0]
    const end = ganttDateRange.value[ganttDateRange.value.length - 1]
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
  } else {
    return `${selectedDate.value.getFullYear()}年${selectedDate.value.getMonth() + 1}月`
  }
})

const calendarDays = computed(() => {
  return getCalendarDays(currentYear.value, currentMonth.value)
})

const weekDates = computed(() => {
  const dates: Date[] = []
  const start = new Date(selectedDate.value)
  start.setDate(start.getDate() - start.getDay()) // 周日开始

  for (let i = 0; i < 7; i++) {
    dates.push(new Date(start))
    start.setDate(start.getDate() + 1)
  }
  return dates
})

// 甘特图视图：日期范围（4周）
const ganttDateRange = computed(() => {
  const dates: Date[] = []
  const start = new Date(selectedDate.value)
  // 从当前周的开始（周日）开始
  start.setDate(start.getDate() - start.getDay())

  // 显示4周（28天）
  for (let i = 0; i < 28; i++) {
    dates.push(new Date(start))
    start.setDate(start.getDate() + 1)
  }
  return dates
})

// 甘特图视图：按周分组的日期
const ganttWeeks = computed(() => {
  const weeks: Date[][] = []
  const dates = ganttDateRange.value
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7))
  }
  return weeks
})

// 甘特图视图：筛选有日期范围的任务
const ganttTasks = computed(() => {
  let result = tasks.value.filter(task => task.startDate && task.dueDate)

  // 按项目筛选
  if (selectedProjectId.value) {
    result = result.filter(task => task.projectId === selectedProjectId.value)
  }

  // 按开始日期排序
  result.sort((a, b) => {
    const dateA = new Date(a.startDate!).getTime()
    const dateB = new Date(b.startDate!).getTime()
    return dateA - dateB
  })

  return result
})

// 甘特图视图：今日位置百分比
const ganttTodayPosition = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = ganttDateRange.value[0]
  const totalDays = ganttDateRange.value.length
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return (diffDays / totalDays) * 100
})

// 列表视图：筛选后的任务
const filteredTasks = computed(() => {
  let result = [...tasks.value]

  // 按项目筛选
  if (selectedProjectId.value) {
    result = result.filter(task => task.projectId === selectedProjectId.value)
  }

  // 按状态筛选
  if (selectedStatus.value) {
    result = result.filter(task => task.status === selectedStatus.value)
  }

  // 按截止日期排序
  result.sort((a, b) => {
    const dateA = new Date(a.dueDate).getTime()
    const dateB = new Date(b.dueDate).getTime()
    return dateA - dateB
  })

  return result
})

// 批量操作相关计算属性
const isAllSelected = computed(() => {
  return filteredTasks.value.length > 0 && filteredTasks.value.every(task => selectedTaskIds.value.has(task.id))
})

const selectedCount = computed(() => selectedTaskIds.value.size)

// 批量操作方法
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedTaskIds.value.clear()
  } else {
    filteredTasks.value.forEach(task => selectedTaskIds.value.add(task.id))
  }
}

function toggleTaskSelection(taskId: string) {
  if (selectedTaskIds.value.has(taskId)) {
    selectedTaskIds.value.delete(taskId)
  } else {
    selectedTaskIds.value.add(taskId)
  }
}

function isTaskSelected(taskId: string): boolean {
  return selectedTaskIds.value.has(taskId)
}

function clearSelection() {
  selectedTaskIds.value.clear()
}

async function handleBatchStatusChange(status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED') {
  if (selectedTaskIds.value.size === 0) return

  batchOperationLoading.value = true
  try {
    await batchUpdateTasks({
      taskIds: Array.from(selectedTaskIds.value),
      status
    })
    clearSelection()
    await fetchTasks()
  } catch (error) {
    devLog.error('批量更新状态失败', error)
  } finally {
    batchOperationLoading.value = false
  }
}

async function handleBatchPriorityChange(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
  if (selectedTaskIds.value.size === 0) return

  batchOperationLoading.value = true
  try {
    await batchUpdateTasks({
      taskIds: Array.from(selectedTaskIds.value),
      priority
    })
    clearSelection()
    await fetchTasks()
  } catch (error) {
    devLog.error('批量更新优先级失败', error)
  } finally {
    batchOperationLoading.value = false
  }
}

async function handleBatchDelete() {
  if (selectedTaskIds.value.size === 0) return

  if (!confirm(`确定要删除选中的 ${selectedTaskIds.value.size} 个任务吗？`)) {
    return
  }

  batchOperationLoading.value = true
  try {
    await batchDeleteTasks(Array.from(selectedTaskIds.value))
    clearSelection()
    await fetchTasks()
  } catch (error) {
    devLog.error('批量删除失败', error)
  } finally {
    batchOperationLoading.value = false
  }
}

async function handleBatchArchive() {
  if (selectedTaskIds.value.size === 0) return

  if (!confirm(`确定要归档选中的 ${selectedTaskIds.value.size} 个任务吗？`)) {
    return
  }

  batchOperationLoading.value = true
  try {
    await batchArchiveTasks(Array.from(selectedTaskIds.value))
    clearSelection()
    await fetchTasks()
  } catch (error) {
    devLog.error('批量归档失败', error)
  } finally {
    batchOperationLoading.value = false
  }
}

// 方法
function prevPeriod() {
  if (currentView.value === 'year') {
    currentYear.value--
  } else if (currentView.value === 'month') {
    if (currentMonth.value === 1) {
      currentMonth.value = 12
      currentYear.value--
    } else {
      currentMonth.value--
    }
  } else if (currentView.value === 'week' || currentView.value === 'gantt') {
    const newDate = new Date(selectedDate.value)
    newDate.setDate(newDate.getDate() - 7)
    selectedDate.value = newDate
  } else {
    const newDate = new Date(selectedDate.value)
    newDate.setDate(newDate.getDate() - 1)
    selectedDate.value = newDate
  }
  fetchTasks()
}

function nextPeriod() {
  if (currentView.value === 'year') {
    currentYear.value++
  } else if (currentView.value === 'month') {
    if (currentMonth.value === 12) {
      currentMonth.value = 1
      currentYear.value++
    } else {
      currentMonth.value++
    }
  } else if (currentView.value === 'week' || currentView.value === 'gantt') {
    const newDate = new Date(selectedDate.value)
    newDate.setDate(newDate.getDate() + 7)
    selectedDate.value = newDate
  } else {
    const newDate = new Date(selectedDate.value)
    newDate.setDate(newDate.getDate() + 1)
    selectedDate.value = newDate
  }
  fetchTasks()
}

function goToToday() {
  const today = new Date()
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  selectedDate.value = today
  fetchTasks()
}

// 年历相关方法
function getYearMonthDays(month: number): Date[] {
  return getCalendarDays(currentYear.value, month)
}

function isSameMonth(date: Date, month: number): boolean {
  return date.getMonth() + 1 === month && date.getFullYear() === currentYear.value
}

function isCurrentMonthOfYear(month: number): boolean {
  const today = new Date()
  return today.getMonth() + 1 === month && today.getFullYear() === currentYear.value
}

function hasTask(date: Date): boolean {
  return tasks.value.some(task => {
    const taskDate = new Date(task.dueDate)
    return isSameDay(taskDate, date)
  })
}

function getTaskCount(date: Date): number {
  return tasks.value.filter(task => {
    const taskDate = new Date(task.dueDate)
    return isSameDay(taskDate, date)
  }).length
}

function selectMonth(month: number) {
  currentMonth.value = month
  currentView.value = 'month'
}

function isCurrentMonth(date: Date): boolean {
  return date.getMonth() + 1 === currentMonth.value && date.getFullYear() === currentYear.value
}

function isToday(date: Date): boolean {
  return checkIsToday(date)
}

function getDateNumber(date: Date): number {
  return date.getDate()
}

function getTaskColor(task: Task): string {
  return task.category?.color || '#3B82F6'
}

function formatTime(dateStr: string): string {
  return formatDateTime(dateStr, 'HH:mm')
}

function formatDate(dateStr: string): string {
  return formatDateTime(dateStr, 'YYYY-MM-DD')
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    CANCELLED: '已取消'
  }
  return statusMap[status] || status
}

function getStatusClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    TODO: 'text-gray-600 bg-gray-100',
    IN_PROGRESS: 'text-blue-600 bg-blue-100',
    DONE: 'text-green-600 bg-green-100',
    CANCELLED: 'text-red-600 bg-red-100'
  }
  return statusClassMap[status] || 'text-gray-600 bg-gray-100'
}

function getPriorityLabel(priority: string): string {
  return priorityOptions[priority]?.label || priority
}

function getPriorityClass(priority: string): string {
  return priorityOptions[priority]?.color || 'text-gray-600 bg-gray-100'
}

function getProjectName(task: Task): string {
  return task.project?.name || '未分类'
}

function isOverdue(task: Task): boolean {
  if (task.status === 'DONE' || task.status === 'CANCELLED') {
    return false
  }
  const dueDate = new Date(task.dueDate)
  const now = new Date()
  return dueDate < now
}

function getTasksForDate(date: Date): Task[] {
  return tasks.value.filter(task => {
    const taskDate = new Date(task.dueDate)
    return isSameDay(taskDate, date)
  })
}

function getTasksForHour(hour: number): Task[] {
  return tasks.value.filter(task => {
    const taskDate = new Date(task.dueDate)
    return isSameDay(taskDate, selectedDate.value) && taskDate.getHours() === hour
  })
}

// 甘特图相关方法
function getGanttTaskPosition(task: Task): { left: number; width: number } {
  const startDate = ganttDateRange.value[0]
  const totalDays = ganttDateRange.value.length

  const taskStart = new Date(task.startDate!)
  const taskEnd = new Date(task.dueDate)

  // 设置为当天开始时间
  taskStart.setHours(0, 0, 0, 0)
  taskEnd.setHours(23, 59, 59, 999)

  // 计算偏移天数
  const startDiff = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const endDiff = Math.floor((taskEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // 计算位置和宽度
  const left = Math.max(0, (startDiff / totalDays) * 100)
  const right = Math.min(100, ((endDiff + 1) / totalDays) * 100)
  const width = right - left

  return { left, width }
}

function getGanttTaskProgress(task: Task): number {
  if (task.status === 'DONE') {
    return 100
  } else if (task.status === 'CANCELLED') {
    return 0
  } else if (task.status === 'IN_PROGRESS') {
    // 根据时间计算进度
    const start = new Date(task.startDate!).getTime()
    const end = new Date(task.dueDate).getTime()
    const now = Date.now()

    if (now <= start) {
      return 0
    } else if (now >= end) {
      return 80 // 已过截止日期但未完成，显示80%
    } else {
      return Math.round(((now - start) / (end - start)) * 100)
    }
  }
  return 0
}

function isGanttTodayVisible(): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = ganttDateRange.value[0]
  const endDate = ganttDateRange.value[ganttDateRange.value.length - 1]
  return today >= startDate && today <= endDate
}

// 月视图/周视图点击日期格子 - 打开任务创建表单
function handleDateClick(date: Date) {
  selectedDate.value = date
  showCreateTask.value = true
}

// 日视图点击时间格子 - 打开任务创建表单
function handleTimeClick(hour: number) {
  const date = new Date(selectedDate.value)
  date.setHours(hour, 0, 0, 0)
  selectedDate.value = date
  showCreateTask.value = true
}

// 年视图点击日期数字 - 打开任务创建表单
function handleYearDateClick(date: Date) {
  selectedDate.value = date
  showCreateTask.value = true
}

function handleTaskClick(task: Task) {
  router.push(`/tasks/${task.id}`)
}

function handleTaskSaved() {
  showCreateTask.value = false
  fetchTasks()
}

// 拖拽相关方法
function handleDragStart(event: DragEvent, task: Task) {
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
  // 添加拖拽时的视觉效果
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '0.5'
  }
}

function handleDragEnd(event: DragEvent) {
  draggedTask.value = null
  dragOverDate.value = null
  // 恢复透明度
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '1'
  }
}

function handleDragOver(event: DragEvent, date: Date) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverDate.value = date
}

function handleDragLeave() {
  dragOverDate.value = null
}

async function handleDrop(event: DragEvent, targetDate: Date) {
  event.preventDefault()
  dragOverDate.value = null

  if (!draggedTask.value) return

  const task = draggedTask.value
  const originalDueDate = new Date(task.dueDate)

  // 保留原有时间部分，只更改日期
  const newDueDate = new Date(targetDate)
  newDueDate.setHours(
    originalDueDate.getHours(),
    originalDueDate.getMinutes(),
    originalDueDate.getSeconds(),
    originalDueDate.getMilliseconds()
  )

  // 检查是否真的需要更新（日期是否不同）
  if (isSameDay(originalDueDate, newDueDate)) {
    draggedTask.value = null
    return
  }

  try {
    // 调用 API 更新任务截止日期
    await updateTask(task.id, {
      dueDate: newDueDate.toISOString()
    })

    // 刷新任务列表
    await fetchTasks()
  } catch (error) {
    devLog.error('更新任务截止日期失败', error)
  } finally {
    draggedTask.value = null
  }
}

// 检查日期是否为拖拽目标
function isDragOver(date: Date): boolean {
  if (!dragOverDate.value) return false
  return isSameDay(dragOverDate.value, date)
}

async function fetchTasks() {
  try {
    const params: Record<string, string> = {}
    if (selectedProjectId.value) {
      params.projectId = selectedProjectId.value
    }
    const response = await getTasks(params)
    tasks.value = response
  } catch (error) {
    devLog.error('获取任务失败', error)
  }
}

// 监听视图变化
watch(currentView, () => {
  fetchTasks()
})

// 初始化
onMounted(async () => {
  await projectStore.fetchProjects()
  await fetchTasks()
})
</script>

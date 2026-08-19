<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <h2 class="admin-page__title">敏感词管理</h2>
    </div>

    <div class="admin-page__toolbar">
      <el-input
        v-model="searchWord"
        placeholder="搜索敏感词"
        clearable
        :prefix-icon="Search"
        class="admin-page__search"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增敏感词</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" stripe class="admin-table" row-key="id">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="word" label="敏感词" min-width="160" />
      <el-table-column prop="category" label="分类" width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="admin-page__pagination"
      @change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingWord ? '编辑敏感词' : '新增敏感词'"
      width="480px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="敏感词" prop="word">
          <el-input v-model="form.word" placeholder="请输入敏感词" maxlength="100" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="form.category" placeholder="分类标签（如 general / ad / political）" maxlength="50" />
        </el-form-item>
        <el-form-item v-if="editingWord" label="启用">
          <el-switch :model-value="form.isActive" @change="(v: unknown) => form.isActive = Boolean(v)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import * as adminApi from '@/api/admin'
import type { SensitiveWord } from '@/types/admin'
import { formatDateTime } from '@/utils/format'

const searchWord = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref<SensitiveWord[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const editingWord = ref<SensitiveWord | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  word: '',
  category: 'general',
  isActive: true,
})

const formRules: FormRules = {
  word: [{ required: true, message: '请输入敏感词', trigger: 'blur' }],
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await adminApi.getSensitiveWordList({
      page: page.value,
      pageSize: pageSize.value,
      word: searchWord.value || undefined,
    })
    tableData.value = res.list
    total.value = res.total
  } catch {
    /* 拦截器已统一显示后端错误消息 */
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  page.value = 1
  fetchList()
}

const handleCreate = () => {
  editingWord.value = null
  form.word = ''
  form.category = 'general'
  form.isActive = true
  dialogVisible.value = true
}

const handleEdit = (row: unknown) => {
  const item = row as SensitiveWord
  editingWord.value = item
  form.word = item.word
  form.category = item.category
  form.isActive = item.isActive
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (editingWord.value) {
      await adminApi.updateSensitiveWord(editingWord.value.id, {
        word: form.word,
        category: form.category,
        isActive: form.isActive,
      })
      ElMessage.success('更新成功')
    } else {
      await adminApi.createSensitiveWord({ word: form.word, category: form.category })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    /* error handled by interceptor */
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row: unknown) => {
  const item = row as SensitiveWord
  try {
    await ElMessageBox.confirm(`确定删除「${item.word}」吗？`, '删除敏感词', { type: 'warning' })
    await adminApi.deleteSensitiveWord(item.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    /* 取消或出错 */
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped lang="scss">
.admin-page {
  &__header { margin-bottom: 20px; }
  &__title { margin: 0; font-size: 20px; font-weight: 600; color: #f1f2f6; }
  &__toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  &__search { width: 240px; }
  &__pagination { margin-top: 16px; justify-content: flex-end; }
}

.admin-table {
  background: transparent;
  :deep(.el-table__header th) { background: rgba(255, 255, 255, 0.04); }
}
</style>

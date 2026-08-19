<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <h2 class="admin-page__title">模板管理</h2>
    </div>

    <div class="admin-page__toolbar">
      <el-input
        v-model="searchName"
        placeholder="搜索模板名称"
        clearable
        :prefix-icon="Search"
        class="admin-page__search"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-select
        v-model="channelFilter"
        placeholder="渠道筛选"
        clearable
        style="width: 160px"
        @change="onSearch"
      >
        <el-option label="小红书" value="xiaohongshu" />
        <el-option label="朋友圈" value="moments" />
        <el-option label="广告语" value="ad_slogan" />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增模板</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" stripe class="admin-table" row-key="id">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="模板名称" min-width="160" />
      <el-table-column prop="channel" label="渠道" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ CHANNEL_LABELS[row.channel as ChannelKey] || row.channel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容预览" min-width="300">
        <template #default="{ row }">
          <span class="admin-template-content">{{ truncate(row.content, 100) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.updatedAt) }}
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

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTemplate ? '编辑模板' : '新增模板'"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道" style="width: 100%">
            <el-option label="小红书" value="xiaohongshu" />
            <el-option label="朋友圈" value="moments" />
            <el-option label="广告语" value="ad_slogan" />
          </el-select>
        </el-form-item>
        <el-form-item label="Prompt" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            placeholder="请输入 Prompt 模板内容"
            :rows="8"
            maxlength="5000"
            show-word-limit
          />
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
import type { AdminTemplate } from '@/types/admin'
import { formatDateTime, truncate } from '@/utils/format'

type ChannelKey = 'xiaohongshu' | 'moments' | 'ad_slogan'

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  xiaohongshu: '小红书',
  moments: '朋友圈',
  ad_slogan: '广告语',
}

const searchName = ref('')
const channelFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref<AdminTemplate[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const editingTemplate = ref<AdminTemplate | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  channel: '',
  content: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  channel: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }],
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await adminApi.getTemplateList({
      page: page.value,
      pageSize: pageSize.value,
      name: searchName.value || undefined,
      channel: channelFilter.value || undefined,
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

const resetFormValues = () => {
  form.name = ''
  form.channel = ''
  form.content = ''
}

const handleCreate = () => {
  editingTemplate.value = null
  resetFormValues()
  dialogVisible.value = true
}

const handleEdit = (row: unknown) => {
  const template = row as AdminTemplate
  editingTemplate.value = template
  form.name = template.name
  form.channel = template.channel
  form.content = template.content
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingTemplate.value) {
      await adminApi.updateTemplate(editingTemplate.value.id, {
        name: form.name,
        channel: form.channel,
        content: form.content,
      })
      ElMessage.success('更新成功')
    } else {
      await adminApi.createTemplate({
        name: form.name,
        channel: form.channel,
        content: form.content,
      })
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
  const template = row as AdminTemplate
  try {
    await ElMessageBox.confirm(
      `确定要删除模板「${template.name}」吗？此操作不可撤销。`,
      '删除模板',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
    )
    await adminApi.deleteTemplate(template.id)
    ElMessage.success('删除成功')
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
  &__header {
    margin-bottom: 20px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #f1f2f6;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__search {
    width: 240px;
  }

  &__pagination {
    margin-top: 16px;
    justify-content: flex-end;
  }
}

.admin-table {
  background: transparent;

  :deep(.el-table__header th) {
    background: rgba(255, 255, 255, 0.04);
  }
}

.admin-template-content {
  color: rgba(241, 242, 246, 0.78);
  font-size: 13px;
}
</style>

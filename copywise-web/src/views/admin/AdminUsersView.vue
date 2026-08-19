<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <h2 class="admin-page__title">用户管理</h2>
    </div>

    <div class="admin-page__toolbar">
      <el-input
        v-model="searchEmail"
        placeholder="搜索邮箱"
        clearable
        :prefix-icon="Search"
        class="admin-page__search"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增用户</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" stripe class="admin-table" row-key="id">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="email" label="邮箱" min-width="200" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive === 1 ? 'success' : 'danger'" size="small">
            {{ row.isActive === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="primary" link size="small" @click="openResetPassword(row)">重置密码</el-button>
          <el-button
            v-if="row.id !== auth.user?.userId"
            type="danger"
            link
            size="small"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
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
      :title="editingUser ? '编辑用户' : '新增用户'"
      width="480px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <template v-if="!editingUser">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
          </el-form-item>
        </template>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editingUser" label="启用状态">
          <el-switch
            :model-value="form.isActive === 1"
            :disabled="editingUser?.id === auth.user?.userId"
            @change="onActiveChange"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="420px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetFormRules" label-width="80px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetSubmitting" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as adminApi from '@/api/admin'
import type { AdminUser } from '@/types/admin'
import { formatDate } from '@/utils/format'

const auth = useAuthStore()

const searchEmail = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref<AdminUser[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const editingUser = ref<AdminUser | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  email: '',
  password: '',
  role: 'user',
  isActive: 1,
})

const resetDialogVisible = ref(false)
const resetUserId = ref<number | null>(null)
const resetSubmitting = ref(false)
const resetFormRef = ref<FormInstance>()
const resetForm = reactive({
  newPassword: '',
})

const formRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效邮箱', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const resetFormRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await adminApi.getUserList({ page: page.value, pageSize: pageSize.value, email: searchEmail.value || undefined })
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
  form.email = ''
  form.password = ''
  form.role = 'user'
  form.isActive = 1
}

const handleCreate = () => {
  editingUser.value = null
  resetFormValues()
  dialogVisible.value = true
}

const handleEdit = (row: unknown) => {
  const user = row as AdminUser
  editingUser.value = user
  form.role = user.role
  form.isActive = user.isActive
  form.email = ''
  form.password = ''
  dialogVisible.value = true
}

const onActiveChange = (checked: unknown) => {
  form.isActive = checked ? 1 : 0
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingUser.value) {
      await adminApi.updateUser(editingUser.value.id, { role: form.role, isActive: form.isActive })
      ElMessage.success('更新成功')
    } else {
      await adminApi.createUser({ email: form.email, password: form.password, role: form.role })
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
  const user = row as AdminUser
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${user.email}」吗？此操作不可撤销。`,
      '删除用户',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
    )
    await adminApi.deleteUser(user.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {
    /* 取消或出错 */
  }
}

const openResetPassword = (row: unknown) => {
  const user = row as AdminUser
  resetUserId.value = user.id
  resetForm.newPassword = ''
  resetDialogVisible.value = true
}

const handleResetPassword = async () => {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid || resetUserId.value === null) return

  resetSubmitting.value = true
  try {
    await adminApi.resetUserPassword(resetUserId.value, { newPassword: resetForm.newPassword })
    ElMessage.success('密码重置成功')
    resetDialogVisible.value = false
  } catch {
    /* error handled by interceptor */
  } finally {
    resetSubmitting.value = false
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
    width: 280px;
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
</style>

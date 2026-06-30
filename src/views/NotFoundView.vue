<template>
  <div class="not-found">
    <el-result icon="warning" title="页面不存在" sub-title="您访问的页面可能已被删除或暂时不可用。">
      <template #extra>
        <el-button type="primary" @click="$router.replace('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

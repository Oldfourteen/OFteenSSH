<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>{{ isEditing ? '编辑连接' : '新建连接' }}</h3>
        <button class="btn-icon" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>连接名称</label>
          <input type="text" class="input" v-model="form.name" placeholder="例如: 生产服务器" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>主机地址</label>
            <input type="text" class="input" v-model="form.host" placeholder="192.168.1.1" />
          </div>
          <div class="form-group" style="width: 100px">
            <label>端口</label>
            <input type="number" class="input" v-model.number="form.port" placeholder="22" />
          </div>
        </div>

        <div class="form-group">
          <label>用户名</label>
          <input type="text" class="input" v-model="form.username" placeholder="root" />
        </div>

        <div class="form-group">
          <label>认证方式</label>
          <select class="select" v-model="form.authType">
            <option value="password">密码认证</option>
            <option value="privatekey">密钥认证</option>
          </select>
        </div>

        <div class="form-group" v-if="form.authType === 'password'">
          <label>密码</label>
          <input type="password" class="input" v-model="credential.password" :placeholder="isEditing ? '留空则保持原密码不变' : '输入密码（安全存储）'" />
        </div>

        <div class="form-group" v-if="form.authType === 'privatekey'">
          <label>密钥文件路径</label>
          <input type="text" class="input" v-model="form.privateKeyPath" placeholder="~/.ssh/id_rsa" />
        </div>

        <div class="form-group" v-if="form.authType === 'privatekey'">
          <label>密钥密码（可选）</label>
          <input type="password" class="input" v-model="credential.passphrase" :placeholder="isEditing ? '留空则保持原密码不变' : '密钥的 passphrase'" />
        </div>

        <div class="form-group">
          <label>网络分组</label>
          <select class="select" v-model="form.group">
            <option value="internal">内网</option>
            <option value="external">外网</option>
          </select>
        </div>

        <div class="form-group">
          <label>颜色标记</label>
          <div class="color-options">
            <button
              v-for="color in colorOptions"
              :key="color"
              class="color-btn"
              :style="{ backgroundColor: color }"
              :class="{ active: form.color === color }"
              @click="form.color = color"
            ></button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="save" :disabled="!isValid">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { SSHConnectionConfig } from '../../../shared/types'

const props = defineProps<{
  editConnection?: SSHConnectionConfig | null
}>()

const emit = defineEmits<{
  close: []
  save: [config: any, credential?: any, isEditing?: boolean]
}>()

const isEditing = computed(() => !!props.editConnection)

const form = ref({
  id: `conn_${Date.now()}`,
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password' as 'password' | 'privatekey',
  privateKeyPath: '',
  group: 'internal' as 'internal' | 'external',
  color: '#7aa2f7',
  order: 0
})

const credential = ref({
  password: '',
  passphrase: ''
})

const colorOptions = [
  '#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68',
  '#f7768e', '#7dcfff', '#ff9e64', '#73daca'
]

const isValid = computed(() =>
  form.value.name.trim() !== '' &&
  form.value.host.trim() !== '' &&
  form.value.username.trim() !== '' &&
  form.value.port > 0
)

onMounted(() => {
  // 如果是编辑模式，填充现有数据
  if (props.editConnection) {
    form.value = {
      id: props.editConnection.id,
      name: props.editConnection.name,
      host: props.editConnection.host,
      port: props.editConnection.port,
      username: props.editConnection.username,
      authType: props.editConnection.authType,
      privateKeyPath: props.editConnection.privateKeyPath || '',
      group: props.editConnection.group,
      color: props.editConnection.color || '#7aa2f7',
      order: props.editConnection.order
    }
  }
})

function save() {
  if (!isValid.value) return

  // 使用 JSON 序列化确保脱离 Vue Proxy，否则 Electron IPC 会报 "An object could not be cloned"
  const config = JSON.parse(JSON.stringify(form.value))

  const hasCredential = config.authType === 'password'
    ? credential.value.password
    : credential.value.passphrase

  const cred = hasCredential
    ? config.authType === 'password'
      ? { password: credential.value.password }
      : { passphrase: credential.value.passphrase }
    : undefined

  emit('save', config, cred, isEditing.value)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  width: 460px;
  max-height: 80vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-primary);
}

.dialog-header h3 {
  font-size: var(--text-xl);
  color: var(--fg-primary);
}

.dialog-body {
  padding: var(--spacing-lg);
}

.dialog-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-primary);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  margin-bottom: var(--spacing-xs);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.flex-1 {
  flex: 1;
}

.color-options {
  display: flex;
  gap: var(--spacing-sm);
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.color-btn:hover {
  border-color: var(--fg-muted);
}

.color-btn.active {
  border-color: var(--fg-primary);
}
</style>

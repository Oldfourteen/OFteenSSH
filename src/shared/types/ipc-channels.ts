// IPC 通道名常量 - 主进程与渲染进程通信的单一数据源

// ===== SSH 连接 =====
export const IPC_CHANNELS = {
  // SSH 连接操作
  SSH_CONNECT: 'ssh:connect',
  SSH_DISCONNECT: 'ssh:disconnect',
  SSH_TEST_CONNECTION: 'ssh:test-connection',
  SSH_GET_STATUS: 'ssh:get-status',

  // SSH 连接事件（主 -> 渲染）
  SSH_STATUS_CHANGED: 'ssh:status-changed',
  SSH_RECONNECTING: 'ssh:reconnecting',
  SSH_RECONNECTED: 'ssh:reconnected',

  // 终端操作
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',

  // 终端数据流（主 -> 渲染）
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // 系统监控
  MONITOR_START: 'monitor:start',
  MONITOR_STOP: 'monitor:stop',

  // 监控数据推送（主 -> 渲染）
  MONITOR_DATA: 'monitor:data',
  MONITOR_NETWORK_SPEED: 'monitor:network-speed',

  // 远程进程管理
  PROCESS_LIST: 'process:list',
  PROCESS_KILL: 'process:kill',
  PROCESS_START: 'process:start',

  // 进程守卫
  GUARD_LIST: 'guard:list',
  GUARD_ADD: 'guard:add',
  GUARD_UPDATE: 'guard:update',
  GUARD_REMOVE: 'guard:remove',
  GUARD_CHECK_NOW: 'guard:check-now',

  // 防火墙
  FIREWALL_STATUS: 'firewall:status',
  FIREWALL_ENABLE: 'firewall:enable',
  FIREWALL_DISABLE: 'firewall:disable',
  FIREWALL_ALLOW: 'firewall:allow',
  FIREWALL_DELETE: 'firewall:delete',

  // 端口转发
  FORWARD_LIST: 'forward:list',
  FORWARD_START: 'forward:start',
  FORWARD_STOP: 'forward:stop',
  FORWARD_REMOVE: 'forward:remove',

  // 凭证管理
  CREDENTIAL_SAVE: 'credential:save',
  CREDENTIAL_GET: 'credential:get',
  CREDENTIAL_DELETE: 'credential:delete',
  CREDENTIAL_LIST_IDS: 'credential:list-ids',

  // 连接配置
  CONFIG_GET_CONNECTIONS: 'config:get-connections',
  CONFIG_SAVE_CONNECTION: 'config:save-connection',
  CONFIG_DELETE_CONNECTION: 'config:delete-connection',
  CONFIG_UPDATE_CONNECTION: 'config:update-connection',

  // 主题
  THEME_GET_ALL: 'theme:get-all',
  THEME_GET_CURRENT: 'theme:get-current',
  THEME_SET_CURRENT: 'theme:set-current',
  THEME_SAVE_CUSTOM: 'theme:save-custom',
  THEME_DELETE_CUSTOM: 'theme:delete-custom',
  THEME_EXPORT: 'theme:export',
  THEME_IMPORT: 'theme:import',
  THEME_UPLOAD_BACKGROUND_IMAGE: 'theme:upload-background-image',
  THEME_GET_APP_BACKGROUND: 'theme:get-app-background',
  THEME_SET_APP_BACKGROUND: 'theme:set-app-background',
  THEME_GET_BACKGROUND_IMAGE_DIR: 'theme:get-background-image-dir',
  THEME_SET_BACKGROUND_IMAGE_DIR: 'theme:set-background-image-dir',

  // 远程目录树
  REMOTE_DIR_LIST: 'remote-dir:list',

  // 远程文件传输
  REMOTE_FILE_UPLOAD: 'remote-file:upload',
  REMOTE_FILE_DOWNLOAD: 'remote-file:download',

  // 原生对话框
  DIALOG_SELECT_FILES: 'dialog:select-files',
  DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',

  // 应用
  APP_GET_VERSION: 'app:get-version'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

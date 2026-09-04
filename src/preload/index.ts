import { contextBridge, ipcRenderer } from 'electron'
import { exposeAPI } from './api'

// 通过 contextBridge 安全地暴露 API 到渲染进程
exposeAPI()

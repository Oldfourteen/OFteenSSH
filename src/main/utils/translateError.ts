/**
 * 将 SSH 连接错误信息翻译为中文（主进程端）
 * ssh2 库的报错是英文的，在返回给渲染进程前做统一翻译
 */
export function translateSSHError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()

  const translations: Array<[RegExp, string]> = [
    [/connection refused/i, '连接被拒绝，请检查目标地址和端口是否正确'],
    [/connection timed?out/i, '连接超时，请检查网络是否可达'],
    [/timed out while waiting for handshake/i, 'SSH 握手超时，请检查目标是否为 SSH 服务'],
    [/authentication(?:\s+failure|\s+failed)?/i, '认证失败，请检查用户名和密码/密钥是否正确'],
    [/permission denied/i, '权限被拒绝，请检查认证信息'],
    [/host key verification failed/i, '主机密钥验证失败'],
    [/network is unreachable/i, '网络不可达，请检查网络连接'],
    [/no route to host/i, '无法到达目标主机，请检查地址是否正确'],
    [/econnreset/i, '连接被重置，对方可能已关闭连接'],
    [/econnrefused/i, '连接被拒绝，目标服务可能未运行'],
    [/enotfound/i, '无法解析主机名，请检查地址是否正确'],
    [/etimedout/i, '连接超时，请检查网络是否通畅'],
    [/socket hang up/i, '连接被中断'],
    [/read econnreset/i, '连接被对方重置'],
    [/unable to (exchange|negotiate) key/i, '无法协商密钥，服务端可能不支持当前加密算法'],
    [/bad mac/i, '数据校验失败，连接可能被篡改或中断'],
    [/key exchange failed/i, '密钥交换失败'],
    [/channel open failed/i, '通道打开失败'],
    [/enclosure is not a valid private key/i, '密钥文件格式无效'],
    [/invalid private key/i, '私钥格式无效，请检查密钥文件'],
    [/cannot parse privateKey/i, '无法解析私钥文件，请检查格式是否正确'],
    [/privatekey is encrypted but passphrase/i, '密钥需要密码但未提供'],
    [/config is missing/i, '缺少必要的连接配置'],
    [/unsupported private key type/i, '不支持的密钥类型'],
    [/handshake failed/i, 'SSH 握手失败'],
    [/disconnected before/i, '在握手前断开连接'],
  ]

  for (const [regex, translation] of translations) {
    if (regex.test(msg)) {
      return translation
    }
  }

  // 如果原始信息已经是中文，直接返回
  if (/[\u4e00-\u9fff]/.test(msg)) {
    return err instanceof Error ? err.message : String(err)
  }

  // 未匹配到翻译规则，返回原文并加前缀
  return `连接失败: ${err instanceof Error ? err.message : String(err)}`
}

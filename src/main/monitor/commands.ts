// 远程服务器监控命令定义

export const MONITOR_COMMANDS = {
  /** 内存信息 */
  MEMORY: 'free -b',
  /** 磁盘信息 */
  DISK: 'df -B1 --output=source,size,used,avail,target 2>/dev/null | grep -v tmpfs | grep -v devtmpfs | grep -v udev',
  /** 网络流量 */
  NETWORK: 'cat /proc/net/dev',
  /** CPU 负载 */
  CPU_LOAD: 'cat /proc/loadavg',
  /** CPU 型号 */
  CPU_MODEL: 'cat /proc/cpuinfo | grep "model name" | head -1',
  /** CPU 核数 */
  CPU_CORES: 'nproc',
  /** 系统信息 */
  SYSTEM: 'echo "HOSTNAME=$(hostname)"; echo "KERNEL=$(uname -r)"; echo "ARCH=$(uname -m)"; echo "UPTIME=$(cat /proc/uptime | awk \'{print $1}\')"; cat /etc/os-release 2>/dev/null | head -4',
  /** Top 进程 */
  TOP_PROCESSES: 'ps aux --sort=-%mem | head -6'
} as const

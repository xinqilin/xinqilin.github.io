---
title: "Ubuntu 系統管理完整指南：Linux 入門到進階實戰"
author: Bill.Lin
date: 2022-10-29T00:10:56+08:00
draft: false
tags: ["Ubuntu", "Linux", "System Administration", "Package Management", "Docker", "Server", "Command Line"]
Description: "深入解析 Ubuntu 系統的完整使用方法，包含安裝配置、套件管理、系統維護與 Docker 容器化應用"
Categories: ["Tools"]
DisableComments: false
---

## 概述

Ubuntu 是基於 Debian 的 Linux 發行版，以其穩定性、易用性和豐富的軟體生態系統而聞名。它是雲端運算、伺服器部署和開發環境的首選平台，提供長期支援（LTS）版本和定期更新的標準版本。

### 核心特徵

- **穩定可靠**：基於 Debian 穩定分支，經過嚴格測試
- **套件豐富**：APT 套件管理系統，數萬個軟體包
- **社群支援**：活躍的開發者和使用者社群
- **容器友好**：優秀的 Docker 和容器化支援
- **雲端整合**：原生支援各大雲端平台

## 系統安裝與初始設置

### 基本安裝

```bash
# 檢查系統版本
lsb_release -a
cat /etc/os-release

# 檢查硬體資訊
uname -a
lscpu
free -h
df -h

# 檢查網路狀態
ip addr show
netstat -tuln
```

### 系統更新

```bash
# 更新套件列表
sudo apt update

# 升級已安裝的套件
sudo apt upgrade -y

# 完整系統升級
sudo apt full-upgrade -y

# 清理不需要的套件
sudo apt autoremove -y
sudo apt autoclean

# 檢查可升級的套件
apt list --upgradable
```

### 時區和語言設定

```bash
# 設定時區
sudo timedatectl set-timezone Asia/Taipei
timedatectl status

# 語言和地區設定
sudo locale-gen zh_TW.UTF-8
sudo update-locale LANG=zh_TW.UTF-8

# 檢查當前語言設定
locale
```

## 套件管理系統

### APT 基本操作

```bash
# 搜尋套件
apt search keyword
apt-cache search keyword

# 查看套件資訊
apt show package-name
apt-cache show package-name

# 安裝套件
sudo apt install package-name
sudo apt install package1 package2 package3

# 重新安裝套件
sudo apt reinstall package-name

# 移除套件
sudo apt remove package-name           # 保留配置檔案
sudo apt purge package-name            # 完全移除

# 檢查依賴關係
apt depends package-name
apt rdepends package-name

# 列出已安裝套件
dpkg -l
apt list --installed
```

### 套件庫管理

```bash
# 添加 PPA 套件庫
sudo add-apt-repository ppa:user/ppa-name
sudo apt update

# 移除 PPA
sudo add-apt-repository --remove ppa:user/ppa-name

# 管理套件庫金鑰
wget -qO - https://example.com/key.gpg | sudo apt-key add -
sudo apt-key list
sudo apt-key del KEY_ID

# 編輯套件來源
sudo nano /etc/apt/sources.list
ls /etc/apt/sources.list.d/
```

### DEB 套件處理

```bash
# 安裝本地 DEB 套件
sudo dpkg -i package.deb

# 修復依賴問題
sudo apt install -f

# 移除 DEB 套件
sudo dpkg -r package-name

# 查詢 DEB 套件內容
dpkg -L package-name
dpkg -c package.deb

# 查詢檔案屬於哪個套件
dpkg -S /path/to/file
```

## 必備軟體安裝

### 開發工具

```bash
# 基本開發工具
sudo apt install build-essential git vim curl wget htop tree

# 程式語言環境
sudo apt install python3 python3-pip nodejs npm default-jdk

# 版本控制
sudo apt install git subversion

# 編輯器和 IDE
sudo apt install vim neovim emacs code

# 資料庫工具
sudo apt install mysql-client postgresql-client redis-tools
```

### 系統監控工具

```bash
# 系統監控
sudo apt install htop iotop iftop nethogs

# 系統資訊
sudo apt install neofetch screenfetch inxi

# 網路工具
sudo apt install net-tools traceroute nmap tcpdump wireshark

# 效能分析
sudo apt install sysstat dstat glances

# 日誌分析
sudo apt install logwatch fail2ban
```

### 媒體和辦公軟體

```bash
# 媒體播放
sudo apt install vlc audacity gimp

# 辦公軟體
sudo apt install libreoffice thunderbird firefox

# 壓縮工具
sudo apt install zip unzip rar unrar 7zip

# 文件處理
sudo apt install pandoc texlive-full
```

## Docker 環境設置

### Docker 安裝與配置

```bash
# 移除舊版本
sudo apt remove docker docker-engine docker.io containerd runc

# 安裝依賴
sudo apt update
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 金鑰
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加套件庫
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安裝 Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 啟動並啟用 Docker 服務
sudo systemctl start docker
sudo systemctl enable docker

# 將使用者加入 docker 群組
sudo usermod -aG docker $USER
newgrp docker

# 驗證安裝
docker --version
docker run hello-world
```

### Ubuntu Docker 容器設置

```bash
# 拉取 Ubuntu 映像
docker pull ubuntu:latest
docker pull ubuntu:20.04
docker pull ubuntu:22.04

# 建立 Docker 網路
docker network create ubuntu-network

# 啟動 Ubuntu 容器
docker run -dit \
  --name ubuntu-container \
  --network ubuntu-network \
  -p 2222:22 \
  -p 8080:8080 \
  -v $(pwd)/workspace:/workspace \
  ubuntu:latest

# 進入容器
docker exec -it ubuntu-container bash

# 容器內初始化
apt update && apt upgrade -y
yes | unminimize

# 安裝基本工具
apt install -y \
  curl \
  wget \
  git \
  vim \
  nano \
  htop \
  tree \
  less \
  man-db \
  openssh-server \
  sudo \
  zip \
  unzip \
  jq \
  python3 \
  python3-pip \
  nodejs \
  npm

# 設定 SSH 服務
echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config
echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config
service ssh start

# 建立使用者
useradd -m -s /bin/bash developer
echo 'developer:password' | chpasswd
usermod -aG sudo developer
```

### 容器管理腳本

```bash
#!/bin/bash
# ubuntu_container_manager.sh - Ubuntu 容器管理腳本

CONTAINER_NAME="ubuntu-dev"
NETWORK_NAME="ubuntu-network"
IMAGE="ubuntu:22.04"

start_container() {
    echo "Starting Ubuntu development container..."
    
    # 檢查網路是否存在
    if ! docker network ls | grep -q "$NETWORK_NAME"; then
        echo "Creating network: $NETWORK_NAME"
        docker network create "$NETWORK_NAME"
    fi
    
    # 檢查容器是否已存在
    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        echo "Starting existing container..."
        docker start "$CONTAINER_NAME"
    else
        echo "Creating new container..."
        docker run -dit \
            --name "$CONTAINER_NAME" \
            --network "$NETWORK_NAME" \
            -p 2222:22 \
            -p 8080:8080 \
            -p 3000:3000 \
            -v "$(pwd)/workspace:/workspace" \
            -v "$(pwd)/config:/config" \
            "$IMAGE"
        
        # 初始化容器
        echo "Initializing container..."
        docker exec "$CONTAINER_NAME" bash -c "
            apt update && apt upgrade -y
            yes | unminimize
            apt install -y curl wget git vim htop tree less man-db openssh-server sudo zip unzip jq python3 python3-pip nodejs npm
            echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config
            echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config
            service ssh start
            useradd -m -s /bin/bash developer
            echo 'developer:developer' | chpasswd
            usermod -aG sudo developer
        "
    fi
    
    echo "Container started successfully!"
    echo "SSH: ssh -p 2222 developer@localhost"
    echo "Enter: docker exec -it $CONTAINER_NAME bash"
}

stop_container() {
    echo "Stopping container..."
    docker stop "$CONTAINER_NAME"
}

remove_container() {
    echo "Removing container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
}

status_container() {
    echo "Container status:"
    docker ps -a | grep "$CONTAINER_NAME" || echo "Container not found"
}

case "$1" in
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    remove)
        remove_container
        ;;
    status)
        status_container
        ;;
    restart)
        stop_container
        sleep 2
        start_container
        ;;
    *)
        echo "Usage: $0 {start|stop|remove|status|restart}"
        exit 1
        ;;
esac
```

## 系統管理與維護

### 服務管理

```bash
# 檢查服務狀態
sudo systemctl status service-name
sudo systemctl list-units --type=service

# 啟動/停止/重啟服務
sudo systemctl start service-name
sudo systemctl stop service-name
sudo systemctl restart service-name
sudo systemctl reload service-name

# 啟用/停用服務
sudo systemctl enable service-name
sudo systemctl disable service-name

# 檢查服務日誌
sudo journalctl -u service-name
sudo journalctl -u service-name -f  # 即時日誌

# 檢查開機啟動的服務
sudo systemctl list-unit-files --state=enabled
```

### 使用者和權限管理

```bash
# 使用者管理
sudo useradd -m -s /bin/bash username
sudo passwd username
sudo userdel username
sudo usermod -aG group username

# 群組管理
sudo groupadd groupname
sudo groupdel groupname
groups username

# 權限管理
chmod 755 file
chmod u+x file
chown user:group file
sudo chown -R user:group directory/

# 查看使用者資訊
id username
who
w
last
```

### 系統監控

```bash
# CPU 和記憶體使用率
top
htop
free -h
cat /proc/meminfo

# 磁碟使用情況
df -h
du -sh directory/
lsblk
fdisk -l

# 網路狀態
netstat -tuln
ss -tuln
iftop
nethogs

# 系統負載
uptime
cat /proc/loadavg
vmstat 1 5
iostat 1 5
```

### 日誌管理

```bash
# 系統日誌
sudo journalctl
sudo journalctl -f                    # 即時日誌
sudo journalctl --since "1 hour ago"
sudo journalctl --until "2023-01-01"

# 日誌大小管理
sudo journalctl --disk-usage
sudo journalctl --vacuum-size=100M
sudo journalctl --vacuum-time=30d

# 傳統日誌檔案
tail -f /var/log/syslog
tail -f /var/log/auth.log
tail -f /var/log/apache2/access.log

# 日誌輪轉
sudo logrotate -d /etc/logrotate.conf
sudo logrotate -f /etc/logrotate.conf
```

## 網路配置

### 網路接口管理

```bash
# 檢查網路接口
ip addr show
ip link show
ifconfig

# 網路配置（Netplan）
sudo nano /etc/netplan/00-installer-config.yaml

# 範例 Netplan 配置
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]

# 應用網路配置
sudo netplan try
sudo netplan apply

# 重啟網路服務
sudo systemctl restart networking
sudo systemctl restart systemd-networkd
```

### 防火牆設定

```bash
# UFW 防火牆
sudo ufw status
sudo ufw enable
sudo ufw disable

# 開放連接埠
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 192.168.1.0/24

# 拒絕連接
sudo ufw deny 23/tcp
sudo ufw deny from 192.168.2.100

# 檢查規則
sudo ufw status numbered
sudo ufw delete 1

# 重設防火牆
sudo ufw --force reset
```

### SSH 配置

```bash
# 安裝和啟動 SSH
sudo apt install openssh-server
sudo systemctl start ssh
sudo systemctl enable ssh

# SSH 配置
sudo nano /etc/ssh/sshd_config

# 重要 SSH 設定
Port 22
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AllowUsers username

# 重啟 SSH 服務
sudo systemctl restart ssh

# SSH 金鑰管理
ssh-keygen -t rsa -b 4096
ssh-copy-id user@host
```

## 安全加固

### 系統安全設定

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝安全工具
sudo apt install fail2ban ufw rkhunter chkrootkit

# 設定 fail2ban
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

sudo systemctl restart fail2ban

# 檢查安全狀態
sudo rkhunter --check
sudo chkrootkit
```

### 檔案系統安全

```bash
# 設定適當的檔案權限
sudo chmod 644 /etc/passwd
sudo chmod 600 /etc/shadow
sudo chmod 644 /etc/group

# 查找具有特殊權限的檔案
find / -perm -4000 -type f 2>/dev/null  # SUID
find / -perm -2000 -type f 2>/dev/null  # SGID
find / -perm -1000 -type d 2>/dev/null  # Sticky bit

# 檔案系統掃描
sudo find / -nouser -print 2>/dev/null
sudo find / -nogroup -print 2>/dev/null
```

## 效能調整與最佳化

### 系統效能監控

```bash
# 系統效能監控腳本
#!/bin/bash
# system_monitor.sh

echo "=== System Performance Monitor ==="
echo "Timestamp: $(date)"
echo

echo "=== CPU Information ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print "CPU Load: " $2}'

echo -e "\nCPU Cores:"
nproc

echo "=== Memory Information ==="
free -h

echo -e "\n=== Disk Usage ==="
df -h | grep -E '^/dev/'

echo -e "\n=== Network Statistics ==="
ss -tuln | wc -l | awk '{print "Active Connections: " $1}'

echo -e "\n=== System Load ==="
uptime

echo -e "\n=== Top Processes by CPU ==="
ps aux --sort=-%cpu | head -6

echo -e "\n=== Top Processes by Memory ==="
ps aux --sort=-%mem | head -6
```

### 系統清理

```bash
#!/bin/bash
# system_cleanup.sh - 系統清理腳本

echo "Starting system cleanup..."

# 清理套件快取
echo "Cleaning package cache..."
sudo apt autoclean
sudo apt autoremove -y

# 清理日誌檔案
echo "Cleaning log files..."
sudo journalctl --vacuum-time=30d

# 清理暫存檔案
echo "Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# 清理使用者暫存
echo "Cleaning user cache..."
rm -rf ~/.cache/*
rm -rf ~/.local/share/Trash/*

# 清理舊核心
echo "Cleaning old kernels..."
dpkg -l | grep linux-image | awk '{print $2}' | sort -V | head -n -2 | xargs sudo apt purge -y

# 檢查磁碟空間
echo "Disk space after cleanup:"
df -h

echo "System cleanup completed!"
```

## 備份與恢復

### 系統備份

```bash
#!/bin/bash
# backup_system.sh - 系統備份腳本

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

mkdir -p "$BACKUP_DIR"

echo "Starting system backup..."

# 備份重要配置檔案
echo "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config_$HOSTNAME_$DATE.tar.gz" \
    /etc \
    /var/log \
    /home \
    --exclude=/home/*/.cache \
    --exclude=/home/*/Downloads

# 備份已安裝套件列表
echo "Backing up package list..."
dpkg --get-selections > "$BACKUP_DIR/packages_$HOSTNAME_$DATE.txt"
apt-mark showmanual > "$BACKUP_DIR/manual_packages_$HOSTNAME_$DATE.txt"

# 備份系統資訊
echo "Backing up system information..."
{
    echo "=== System Information ==="
    uname -a
    lsb_release -a
    echo -e "\n=== Hardware Information ==="
    lscpu
    free -h
    df -h
    echo -e "\n=== Network Configuration ==="
    ip addr show
} > "$BACKUP_DIR/system_info_$HOSTNAME_$DATE.txt"

echo "Backup completed: $BACKUP_DIR"
ls -la "$BACKUP_DIR"/*$DATE*
```

### 系統恢復

```bash
#!/bin/bash
# restore_system.sh - 系統恢復腳本

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will restore system files from backup."
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting system restore..."

# 備份當前配置
echo "Backing up current configuration..."
sudo tar -czf "/tmp/current_config_$(date +%Y%m%d_%H%M%S).tar.gz" /etc

# 恢復檔案
echo "Restoring files..."
sudo tar -xzf "$BACKUP_FILE" -C /

echo "Restore completed. Please reboot the system."
```

## 自動化腳本

### 系統初始化腳本

```bash
#!/bin/bash
# ubuntu_setup.sh - Ubuntu 系統初始化腳本

set -e

echo "=== Ubuntu System Setup Script ==="

# 更新系統
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 安裝基本工具
echo "Installing essential tools..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    tree \
    unzip \
    zip \
    jq \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# 安裝開發工具
echo "Installing development tools..."
sudo apt install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    default-jdk \
    golang-go

# 安裝 Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 配置 Git
echo "Configuring Git..."
read -p "Enter your Git username: " git_username
read -p "Enter your Git email: " git_email
git config --global user.name "$git_username"
git config --global user.email "$git_email"

# 設定 SSH
echo "Setting up SSH..."
sudo systemctl enable ssh
sudo systemctl start ssh

# 安裝常用軟體
echo "Installing common applications..."
sudo apt install -y \
    firefox \
    vlc \
    gimp \
    libreoffice \
    thunderbird

# 清理
echo "Cleaning up..."
sudo apt autoremove -y
sudo apt autoclean

echo "=== Setup completed! ==="
echo "Please reboot the system to ensure all changes take effect."
```

## 故障排除

### 常見問題解決

```bash
# 套件管理問題
sudo apt update --fix-missing
sudo dpkg --configure -a
sudo apt install -f

# 網路連接問題
sudo systemctl restart networking
sudo systemctl restart systemd-resolved
sudo dhclient -r && sudo dhclient

# SSH 連接問題
sudo systemctl status ssh
sudo systemctl restart ssh
sudo tail -f /var/log/auth.log

# 磁碟空間不足
sudo du -sh /* | sort -hr
sudo find / -type f -size +100M
sudo apt autoremove
sudo apt autoclean

# 記憶體不足
free -h
sudo swapoff -a && sudo swapon -a
echo 3 | sudo tee /proc/sys/vm/drop_caches
```

## 總結

### 核心優勢

1. **穩定可靠**：企業級穩定性和長期支援
2. **易於使用**：友好的使用者介面和豐富的文檔
3. **套件豐富**：強大的 APT 套件管理系統
4. **社群支援**：活躍的開發者和使用者社群
5. **容器化友好**：優秀的 Docker 和雲端支援

### 最佳實踐

1. **定期更新**：保持系統和軟體包的最新狀態
2. **安全加固**：配置防火牆、fail2ban 和適當的使用者權限
3. **監控系統**：定期檢查系統效能和資源使用情況
4. **備份重要資料**：建立定期備份策略
5. **文檔記錄**：記錄系統配置和變更

### 學習路徑

```bash
# 初學者階段
sudo apt update && sudo apt upgrade    # 系統更新
sudo apt install package-name          # 軟體安裝
systemctl status service-name          # 服務管理

# 進階階段
docker run -it ubuntu:latest           # 容器化應用
sudo ufw allow 80/tcp                  # 防火牆配置
sudo journalctl -u service-name        # 日誌分析

# 專家階段
netplan apply                           # 網路配置
systemctl edit service-name            # 服務自定義
crontab -e                             # 自動化任務
```

Ubuntu 是現代 Linux 發行版的代表，掌握其使用技巧能夠大幅提升系統管理和開發效率。記住：理解 Linux 基礎概念是有效使用 Ubuntu 的關鍵，善用社群資源和文檔可以解決大部分問題。

## 參考資料

- [Ubuntu Official Documentation](https://ubuntu.com/server/docs)
- [Ubuntu Community Help Wiki](https://help.ubuntu.com/)
- [APT User's Guide](https://www.debian.org/doc/manuals/apt-guide/)
- [systemd Documentation](https://systemd.io/)
- [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
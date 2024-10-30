#!/bin/bash

# 检查是否安装了Go环境
if ! command -v go &> /dev/null
then
    echo "未找到Go语言环境, 请先安装Go语言环境后再尝试。"
    exit
fi

# 创建 /opt/sms 目录
sudo mkdir -p /opt/sms

# 编译 Go 应用
go build -o get_message_code_server get_message_code_server.go

# 将可执行文件移动到 /opt/sms
sudo mv get_message_code_server /opt/sms/

# 赋予执行权限
sudo chmod +x /opt/sms/get_message_code_server

# 创建 plist 文件
PLIST_FILE="$HOME/Library/LaunchAgents/com.getmessagecode.launcher.plist"

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.getmessagecode.launcher</string>

    <key>ProgramArguments</key>
    <array>
        <!-- 直接指定可执行文件的完整路径 -->
        <string>/opt/sms/get_message_code_server</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/get_message_code.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/get_message_code.err</string>
</dict>
</plist>
EOF

# 重新加载 plist
launchctl unload "$PLIST_FILE" &> /dev/null
launchctl load "$PLIST_FILE"

echo "部署完成, 服务已启动。"
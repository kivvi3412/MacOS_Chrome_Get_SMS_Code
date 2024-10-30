
## 介绍

本项目是一个用于 macOS 的 SMS 验证码自动填写工具。它通过监听系统的 Messages 应用, 获取最新的验证码短信, 并在网页上自动填写验证码, 简化用户的操作。

## 部署步骤
1. 脚本部署
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
2. 配置
    - 在 `setting > Privacy & Security > Full Disk Access` 给 `/opt/sms/get_message_code_server` 全盘访问权限
    - 在 `setting > general > Login Items & Extensions` 打开 `get_message_code_server` 服务
3. 安装Chrome Extension  
   - 安装 Chrome 扩展程序
   - 打开 Chrome 浏览器, 输入 chrome://extensions/ 进入扩展程序管理页面。
   - 打开右上角的 “开发者模式” 开关。
   - 点击左上角的 “加载已解压的扩展程序” 。
   - 选择项目中的 chrome-extension 文件夹
- 如果没有Go环境的 Apple Silicon 可以直接使用二进制文件
- `sudo mv get_message_code_server /opt/sms/`

## 效果如图

![](https://github.com/user-attachments/assets/a97dd9ec-4e88-4424-9f61-c7d10118a71a)

## 卸载方法

如果您不再需要使用该工具, 可以按照以下步骤卸载:

1. **卸载服务**

   ```bash
   launchctl unload "$HOME/Library/LaunchAgents/com.getmessagecode.launcher.plist"
   rm "$HOME/Library/LaunchAgents/com.getmessagecode.launcher.plist"
   sudo rm -rf /opt/sms
   ```

2. **移除 Chrome 扩展程序**

    - 打开 `chrome://extensions/`。
    - 找到 **SMS Auto Fill** 扩展, 点击 **“移除”** 按钮。

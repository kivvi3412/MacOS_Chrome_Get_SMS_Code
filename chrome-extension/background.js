// background.js
// 后台脚本, 负责与服务器通信, 获取验证码。

/**
 * 监听来自 content script 的消息, 处理获取验证码的请求。
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCode') {
        // 当收到获取验证码的请求时, 尝试从服务器获取验证码。
        fetchCodeFromServer()
            .then((code) => {
                // 成功获取验证码, 发送给 content script。
                sendResponse({success: true, code: code});
            })
            .catch((error) => {
                // 获取验证码失败, 发送错误信息给 content script。
                sendResponse({success: false, error: error.message});
            });
        // 返回 true, 表示 sendResponse 是异步的。
        return true;
    }
});

/**
 * 从服务器获取验证码, 设置超时时间为 0.5 秒。
 * @returns {Promise<string>} 返回包含验证码的 Promise。
 */
function fetchCodeFromServer() {
    return new Promise((resolve, reject) => {
        // 创建一个 AbortController, 用于实现请求超时。
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            // 请求超时, 终止请求。
            controller.abort();
        }, 500); // 0.5 秒超时

        // 发送请求到服务器获取验证码。
        fetch('http://localhost:65530/get_code', {signal: controller.signal})
            .then((response) => {
                clearTimeout(timeoutId); // 请求成功, 清除超时计时器。
                if (!response.ok) {
                    // 响应状态不为 2xx, 抛出错误。
                    throw new Error(`网络响应不正常: ${response.statusText}`);
                }
                return response.json(); // 解析响应 JSON 数据。
            })
            .then((data) => {
                if (data.sms_code && data.sms_code !== -1) {
                    // 成功获取验证码, 解析并返回。
                    resolve(data.sms_code);
                } else {
                    // 未获取到验证码, 抛出错误。
                    reject(new Error('No code available'));
                }
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    // 请求超时, 服务器不可用。
                    reject(new Error('Server is unavailable'));
                } else {
                    // 其他错误, 抛出错误信息。
                    reject(error);
                }
            });
    });
}
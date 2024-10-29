// content.js
// 内容脚本, 负责页面交互和验证码填写。
/**
 * 自执行匿名函数, 避免污染全局命名空间。
 */
(function () {
    // 定义全局变量, 跟踪轮询状态和当前输入框。
    let pollingActive = false;       // 是否正在轮询
    let pollingIntervalId = null;    // 轮询的定时器ID
    let currentInput = null;         // 当前聚焦的输入框
    let usedCode = null;             // 已使用的验证码
    let codeUsedTimestamp = null;    // 验证码使用的时间戳
    let popup = null;                // 弹窗元素
    let styleElement = null;         // 样式元素
    const CODE_REUSE_INTERVAL = 60 * 1000; // 1分钟, 单位为毫秒

    // 定义识别验证码输入框的关键字列表
    const codeKeywords = ['验证码', '驗證碼', 'verification code', 'sms code', 'code']; // 可根据需要添加

    /**
     * 当输入框获得焦点时触发, 判断是否为验证码输入框, 如果是则开始轮询获取验证码。
     * @param {FocusEvent} event - 焦点事件对象。
     */
    function onFocus(event) {
        const input = event.target;
        // 检查输入元素是否有效且仍在 DOM 中
        if (!input || !input.isConnected) return;

        currentInput = input; // 更新当前输入框

        if (!isCodeInput(input)) {
            // 如果不是验证码输入框, 则不进行操作
            return;
        }

        if (!pollingActive) {
            // 开始轮询
            pollingActive = true;
            pollingIntervalId = setInterval(() => {
                // 向后台脚本发送消息, 获取验证码
                chrome.runtime.sendMessage({ action: 'getCode' }, (response) => {
                    if (response && response.success) {
                        const code = response.code;
                        // 检查是否是已使用的验证码且在1分钟内
                        if (code === usedCode) {
                            const now = Date.now();
                            if (now - codeUsedTimestamp < CODE_REUSE_INTERVAL) {
                                // 在一段时间内, 不显示已使用的验证码
                                return;
                            } else {
                                // 超过了限制时间, 清除已使用的验证码记录
                                usedCode = null;
                                codeUsedTimestamp = null;
                            }
                        }
                        // 成功获取到验证码, 显示弹窗
                        showPopup(currentInput, code);
                        // 停止轮询
                        stopPolling();
                    } else if (response && !response.success) {
                        if (response.error === 'Server is unavailable') {
                            // 如果服务器不可用, 显示错误弹窗
                            showErrorPopup(currentInput, '无法连接到服务器');
                        }
                        // 如果未获取到验证码且服务器可用, 则不进行任何操作
                    }
                });
            }, 1000); // 每秒轮询一次
        }

        // 当输入框失去焦点时, 进行清理
        input.addEventListener('blur', onBlur);
    }

    /**
     * 判断输入框是否为验证码输入框
     * @param {HTMLInputElement} input - 目标输入框元素。
     * @returns {boolean} 是否为验证码输入框
     */
    function isCodeInput(input) {
        // 检查输入元素是否有效且仍在 DOM 中
        if (!input || !input.isConnected) return false;

        // 检查输入框的 placeholder, aria-label, name, id 是否包含关键字
        const attributesToCheck = ['placeholder', 'aria-label', 'name', 'id', 'autocomplete'];
        for (const attr of attributesToCheck) {
            const value = input.getAttribute(attr);
            if (value && containsKeyword(value)) {
                return true;
            }
        }

        // 检查输入框关联的标签元素的文本
        const labels = getInputLabels(input);
        for (const label of labels) {
            if (label && containsKeyword(label.textContent)) {
                return true;
            }
        }

        // 检查输入框的上一个兄弟节点或父节点的文本
        if (input.previousElementSibling && containsKeyword(input.previousElementSibling.textContent)) {
            return true;
        }
        if (input.parentElement && containsKeyword(input.parentElement.textContent)) {
            return true;
        }

        // 其他可能需要的检查...

        return false;
    }

    /**
     * 检查字符串中是否包含关键字列表中的任何一个
     * @param {string} text - 要检查的文本
     * @returns {boolean} 是否包含关键字
     */
    function containsKeyword(text) {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return codeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }

    /**
     * 获取输入框关联的标签元素
     * @param {HTMLInputElement} input - 目标输入框元素。
     * @returns {HTMLLabelElement[]} 关联的标签元素数组
     */
    function getInputLabels(input) {
        if (!input || !input.isConnected) return [];
        if (input.labels && input.labels.length > 0) {
            return Array.from(input.labels);
        }
        // 如果没有关联的 label 元素, 尝试根据父元素查找
        const labels = [];
        let parent = input.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'label') {
                labels.push(parent);
                break;
            }
            parent = parent.parentElement;
        }
        return labels;
    }

    /**
     * 当输入框失去焦点时触发, 停止轮询, 清理相关状态和弹窗。
     * @param {FocusEvent} event - 焦点事件对象。
     */
    function onBlur(event) {
        stopPolling();
        removePopup();

        if (currentInput) {
            currentInput.removeEventListener('blur', onBlur); // 移除事件监听器
            currentInput = null;
        }
    }

    /**
     * 停止轮询获取验证码。
     */
    function stopPolling() {
        if (pollingActive && pollingIntervalId !== null) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
            pollingActive = false;
        }
    }

    /**
     * 显示验证码弹窗, 允许用户点击填充验证码。
     * @param {HTMLInputElement} input - 目标输入框元素。
     * @param {string} code - 获取到的验证码。
     */
    function showPopup(input, code) {
        if (!input || !input.isConnected) return;
        // 移除现有弹窗 (如果存在) 。
        removePopup();

        // 创建弹窗元素。
        popup = document.createElement('div');
        popup.className = 'sms-code-popup';
        popup.innerHTML = `
          <div class="sms-code-text">
            Fill Code: <span class="sms-code">${code}</span>
          </div>
        `;

        // 添加样式。
        addStyles();

        // 定位弹窗位置。
        positionPopup(input);

        // 点击弹窗时, 填充验证码并移除弹窗。
        popup.addEventListener('mousedown', (event) => {
            event.preventDefault(); // 防止输入框失去焦点。
            fillCodeIntoInput(input, code);
            removePopup();
            // 记录已使用的验证码和时间戳
            usedCode = code;
            codeUsedTimestamp = Date.now();
        });

        // 将弹窗添加到页面。
        document.body.appendChild(popup);
    }

    /**
     * 显示错误弹窗, 提示服务器不可用等信息。
     * @param {HTMLInputElement} input - 目标输入框元素。
     * @param {string} message - 错误信息。
     */
    function showErrorPopup(input, message) {
        if (!input || !input.isConnected) return;
        // 移除现有弹窗 (如果存在) 。
        removePopup();

        // 创建错误弹窗元素。
        popup = document.createElement('div');
        popup.className = 'sms-code-popup error';
        popup.innerHTML = `<div class="sms-code-text">${message}</div>`;

        // 添加样式。
        addStyles();

        // 定位弹窗位置。
        positionPopup(input);

        // 点击弹窗时, 移除弹窗。
        popup.addEventListener('mousedown', (event) => {
            event.preventDefault(); // 防止输入框失去焦点。
            removePopup();
        });

        // 将弹窗添加到页面。
        document.body.appendChild(popup);
    }

    /**
     * 移除弹窗。
     */
    function removePopup() {
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
            popup = null;
        }
    }

    /**
     * 添加弹窗所需的样式。
     */
    function addStyles() {
        if (styleElement) {
            return; // 如果样式已添加, 直接返回。
        }
        styleElement = document.createElement('style');
        styleElement.textContent = `
          .sms-code-popup {
            background-color: #4a4a4a;
            color: white;
            padding: 10px 15px;
            border-radius: 10px;
            display: inline-block;
            cursor: pointer;
            font-size: 14px;
            position: absolute;
            z-index: 9999;
          }
          .sms-code-popup.error {
            background-color: #ff4d4d;
          }
          .sms-code-popup .sms-code-text {
            display: flex;
            align-items: center;
          }
          .sms-code-popup .sms-code {
            font-weight: bold;
            margin-left: 5px;
          }
        `;
        document.head.appendChild(styleElement);
    }

    /**
     * 定位弹窗到输入框下方。
     * @param {HTMLInputElement} input - 目标输入框元素。
     */
    function positionPopup(input) {
        if (!input || !input.isConnected || !popup) return;

        const rect = input.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        popup.style.left = `${window.scrollX + rect.left}px`;
    }

    /**
     * 将验证码填入输入框, 并触发相关事件。
     * @param {HTMLInputElement} input - 目标输入框元素。
     * @param {string} code - 要填入的验证码。
     */
    function fillCodeIntoInput(input, code) {
        if (!input || !input.isConnected) return;

        input.value = code;
        // 触发输入事件, 确保页面的其他逻辑可以检测到。
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
    }

    /**
     * 监听页面中所有输入框的聚焦事件, 处理验证码自动填写。
     */
    document.addEventListener('focusin', (event) => {
        try {
            if (
                event.target.tagName.toLowerCase() === 'input' &&
                ['text', 'tel', 'number', 'password'].includes(event.target.type)
            ) {
                onFocus(event);
            }
        } catch (error) {
            console.error('Error in focusin event handler:', error);
        }
    });

    /**
     * 在页面卸载时, 清理资源, 移除弹窗和样式。
     */
    window.addEventListener('unload', () => {
        stopPolling();
        removePopup();
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
        }
    });
})();
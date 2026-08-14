# AI Auto Continue Privacy Policy

**Effective date:** July 29, 2026  
**Policy website:** `https://www.oppanda.com/ai-auto-continue/privacy/`

This Privacy Policy applies to the **AI Auto Continue** browser extension. The policy is published on `www.oppanda.com`. The extension is local-first and does not send AI conversation content to `www.oppanda.com` or any developer-operated server.

## 1. What the extension handles

After the user explicitly starts a run on a supported AI website, the extension temporarily reads the minimum page state needed to provide its user-facing function, including:

- the latest AI reply and its visible text;
- whether the AI is currently generating;
- native “Continue generating” controls;
- the chat input field and its current contents;
- message and submission state needed to verify that a follow-up was sent;
- the current supported AI website and conversation context.

This information may include website content, personal communications, form data and user-generated content. It is processed locally in the browser for the extension’s disclosed single purpose: continuing the current AI conversation after the user starts automation.

## 2. Local settings

The extension stores the following settings in browser-local extension storage:

- automatic or custom continuation mode;
- custom continuation text, when provided by the user;
- preferred prompt language;
- follow-up count;
- delay and native-continuation preferences;
- other safety and interface preferences.

Complete AI replies and complete conversation histories are not stored by the extension.

## 3. Automatic language detection

When automatic prompt language is enabled, immediately before the first follow-up message the extension reads a bounded sample from the latest completed AI reply and asks the browser’s built-in extension language detector to identify its language.

The sample:

- is processed locally;
- is not persisted;
- is not sent to `www.oppanda.com`, `muhook.com` or any other server;
- is used only to select the continuation message for the active run.

## 4. Data the extension does not collect or transmit

The extension does not:

- upload AI conversations, prompts or page content to the developer;
- sell, rent or share user data;
- use user data for advertising, profiling or credit decisions;
- collect analytics or telemetry;
- request or read browser history, cookies, downloads or clipboard data;
- intercept network traffic;
- load remote executable code, remote advertising scripts or remote promotion configuration.

The extension does not contact `www.oppanda.com` during normal automation. `www.oppanda.com` hosts this privacy policy and related publisher information.

## 5. Publisher link to muhook.com

The extension Popup contains one clearly labeled promotional link to `https://muhook.com/` with the text “Find your next favorite song hook.”

- The link opens only after the user clicks it.
- The extension does not automatically open the website.
- The URL contains no affiliate, referral or analytics parameters.
- The extension does not transmit AI conversations, prompts, settings or browsing activity to `muhook.com`.
- After the user opens the website, activity on that website is governed by the website’s own privacy policy.

## 6. Permissions

The Chrome build uses only the following extension permissions:

- **activeTab:** access the current supported AI tab after user interaction;
- **scripting:** inject the bundled local automation controller into the current supported AI tab;
- **storage:** save extension settings locally.

The extension does not request broad access to all websites. It runs only on AI websites explicitly supported by this project after the user starts it.

## 7. Retention and deletion

Transient page content used during a run is not retained after it is no longer needed for the active automation state.

Users can delete locally stored settings by:

- uninstalling the extension; or
- clearing the extension’s local storage through the browser’s extension controls.

## 8. Third-party AI services

AI Auto Continue interacts with the normal web interfaces of supported third-party AI services. Use of those services remains subject to each service’s own terms and privacy policy.

The extension does not bypass sign-in requirements, CAPTCHAs, rate limits, usage quotas, safety guardrails or other protective measures. It pauses when it detects blocking, verification or usage-limit states.

## 9. Security and Limited Use

The extension follows a local-first, minimum-permission design. Any use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## 10. Changes to this policy

This policy may be updated when extension functionality or data practices change. The effective date at the top of this page will be updated when material changes are published.

## 11. Contact

For privacy questions about AI Auto Continue, use the publisher contact information provided on `https://www.oppanda.com/`.

---

# AI Auto Continue 隐私政策

**生效日期：** 2026年7月29日  
**政策网页：** `https://www.oppanda.com/ai-auto-continue/privacy/`

本隐私政策适用于 **AI Auto Continue** 浏览器扩展。隐私政策发布于 `www.oppanda.com`。扩展采用本地优先设计，不会把 AI 对话内容发送到 `www.oppanda.com` 或开发者运营的任何服务器。

## 1. 扩展会处理哪些信息

只有用户在受支持的 AI 网站上明确点击开始后，扩展才会临时读取实现功能所必需的最少页面状态，包括：

- 最新 AI 回答及其可见文本；
- AI 当前是否正在生成；
- 页面原生的“继续生成”控件；
- 对话输入框及其当前内容；
- 用于确认续接消息是否发送成功的消息与提交状态；
- 当前受支持的 AI 网站和对话上下文。

这些信息可能包含网站内容、个人通信、表单数据和用户生成内容。所有信息只在浏览器本地处理，用于扩展公开说明的单一用途：在用户启动自动化后继续当前 AI 对话。

## 2. 本地设置

扩展会在浏览器本地扩展存储中保存：

- 自动或自定义续接模式；
- 用户填写的自定义续接内容；
- 首选提示词语言；
- 自动续接次数；
- 延迟和原生续写设置；
- 其他安全与界面偏好。

扩展不会保存完整 AI 回答或完整对话历史。

## 3. 自动语言检测

启用自动提示词语言时，扩展会在第一次发送续接消息前，从最新一条已完成的 AI 回答中读取一段有限长度的文本，并调用浏览器内置的扩展语言检测功能。

该文本：

- 只在本地处理；
- 不会持久保存；
- 不会发送到 `www.oppanda.com`、`muhook.com` 或任何其他服务器；
- 只用于为当前运行选择续接消息语言。

## 4. 扩展不会收集或传输的信息

扩展不会：

- 向开发者上传 AI 对话、提示词或网页内容；
- 出售、出租或共享用户数据；
- 将用户数据用于广告画像、个性化广告或信用判断；
- 收集分析或遥测数据；
- 请求或读取浏览器历史记录、Cookie、下载记录或剪贴板数据；
- 拦截网络流量；
- 加载远程可执行代码、远程广告脚本或远程推广配置。

扩展在正常自动化过程中不会访问 `www.oppanda.com`。`www.oppanda.com` 仅用于发布本隐私政策及相关开发者信息。

## 5. muhook.com 推广链接

扩展 Popup 底部包含一个明确标记的 `https://muhook.com/` 推广链接，文案为“Find your next favorite song hook.”。

- 只有用户主动点击后才会打开；
- 扩展不会自动打开该网站；
- 链接不包含联盟、推荐或分析参数；
- 扩展不会向 `muhook.com` 发送 AI 对话、提示词、设置或浏览活动；
- 用户打开该网站后，网站上的活动适用该网站自身的隐私政策。

## 6. 权限

Chrome 版本仅使用以下权限：

- **activeTab：** 用户操作后访问当前受支持的 AI 标签页；
- **scripting：** 把扩展随包提供的本地自动化控制器注入当前受支持的 AI 标签页；
- **storage：** 在本地保存扩展设置。

扩展不会申请对所有网站的宽泛访问权限。只有用户启动后，才会在官方支持的 AI 网站运行。

## 7. 保留与删除

运行期间临时读取的页面内容，在当前自动化状态不再需要后不会被扩展保留。

用户可以通过以下方式删除本地设置：

- 卸载扩展；或
- 使用浏览器扩展管理功能清除该扩展的本地存储。

## 8. 第三方 AI 服务

AI Auto Continue 通过受支持第三方 AI 服务的正常网页界面工作。用户使用这些服务仍需遵守各服务自身的条款和隐私政策。

扩展不会绕过登录、验证码、速率限制、使用配额、安全防护或其他保护措施。检测到阻断、验证或使用限制状态时，扩展会暂停。

## 9. 安全与有限使用

扩展采用本地优先和最小权限设计。对通过 Chrome API 获得的信息的使用将遵守 Chrome Web Store 用户数据政策，包括 Limited Use（有限使用）要求。

## 10. 政策更新

扩展功能或数据处理方式发生变化时，本政策可能更新。发生重要修改时，页面顶部的生效日期会同步更新。

## 11. 联系方式

有关 AI Auto Continue 的隐私问题，请使用 `https://www.oppanda.com/` 上公布的开发者联系方式。

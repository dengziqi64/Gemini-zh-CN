# Antigravity 简体中文全量汉化包 (`antigravity-zh-cn`)

Google Antigravity 桌面客户端深度简体中文汉化词库与实时 DOM 注入引擎。

## 文件说明

* `full_i18n_data.json`：全量简体中文词条映射表（涵盖菜单栏、常规设置、模型设置、思考强度提示、SSH 主机选择器、语音模式、MCP/插件面板等 1,780+ 词条）。
* `i18n_runner.js`：高性能前端 DOM 实时翻译注入引擎，具备以下特性：
  * 严格隔离代码块、终端、编辑器、消息正文与技术标识符，绝不误伤代码与路径；
  * 支持 `INPUT` / `TEXTAREA` 的 `placeholder` 占位符翻译；
  * 内置受控组件反向映射保护（`Map.prototype.has` / `get` 兼容 Radix / Base UI）。

## 目录结构

```text
.
├── full_i18n_data.json   # 汉化词条库
├── i18n_runner.js        # 前端汉化注入引擎
└── README.md
```

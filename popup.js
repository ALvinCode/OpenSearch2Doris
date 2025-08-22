// 弹出窗口脚本 - 处理UI交互
// 全局变量，解决作用域问题
let currentSQLs = [];
let renderSQLList;

document.addEventListener("DOMContentLoaded", () => {
  const sqlList = document.getElementById("sqlList");
  const statusText = document.getElementById("statusText");
  const lastConvertTime = document.getElementById("lastConvertTime");
  const exportBtn = document.getElementById("exportBtn");
  const debugBtn = document.getElementById("debugBtn");

  // 监听来自内容脚本的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "convertComplete") {
      // 更新状态信息
      statusText.textContent = `成功转换 ${request.queryCount} 个查询 | 检测到 ${request.transformCount} 个Transform操作`;

      const now = new Date();
      lastConvertTime.textContent = `上次转换时间: ${now.toLocaleString()}`;

      // 保存SQL列表
      currentSQLs = request.sqlList;

      // 渲染SQL列表
      renderSQLList(request.sqlList);
    }
  });

  // 更新状态栏
  function updateStatusBar() {
    if (window.conversionResults) {
      const { sqlList, queryCount, transformCount, lastConvertTime } =
        window.conversionResults;

      // 更新状态文本
      const statusText = document.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = `成功转换 ${queryCount} 个查询 | 检测到 ${transformCount} 个Transform操作`;
      }

      // 更新最后转换时间
      const lastConvertTimeElement =
        document.querySelector(".last-convert-time");
      if (lastConvertTimeElement) {
        const time = new Date(lastConvertTime);
        lastConvertTimeElement.textContent = `上次转换时间: ${time.toLocaleString()}`;
      }
    }
  }

  // 监听来自content script的消息
  window.addEventListener("message", (event) => {
    if (event.data.type === "conversionResults") {
      console.log("📥 收到转换结果:", event.data.data);
      const { sqlList, queryNames, queryCount, transformCount, lastConvertTime } =
        event.data.data;

      // 存储转换结果
      window.conversionResults = {
        sqlList: sqlList || [],
        queryNames: queryNames || [],
        queryCount: queryCount || 0,
        transformCount: transformCount || 0,
        lastConvertTime: lastConvertTime || new Date().toISOString(),
      };

      // 渲染SQL列表
      renderSQLList();

      // 更新状态栏
      updateStatusBar();
    }
  });

  // 渲染SQL列表
  renderSQLList = function (sqlData) {
    // 如果没有传入sqlData，从全局变量获取
    if (!sqlData && window.conversionResults) {
      sqlData = window.conversionResults.sqlList || [];
    }

    // 如果仍然没有数据，使用空数组
    if (!sqlData) {
      sqlData = [];
    }

    sqlList.innerHTML = "";

    // 控制清除按钮的显示/隐藏
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.style.display = sqlData.length > 0 ? "flex" : "none";
    }

    if (sqlData.length === 0) {
      sqlList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <p>没有生成任何SQL语句</p>
          <p>请确保在Grafana编辑页面点击了转换按钮</p>
        </div>
      `;
      return;
    }

    sqlData.forEach((sql, index) => {
      const sqlItem = document.createElement("div");
      sqlItem.className = "sql-item";
      // 解码SQL
      sql = decodeHtmlEntities(sql);
      
      // 获取查询名称，如果没有则使用默认名称
      const queryName = window.conversionResults?.queryNames?.[index] || `查询 ${index + 1}`;
      
      sqlItem.innerHTML = `
        <div class="sql-header">
          <div class="sql-title">
            <button class="collapse-toggle" data-index="${index}">
              <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6cf7" stroke-width="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span class="title-text">${queryName}</span>
            <button class="copy-title-btn" data-index="${index}" title="复制标题">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
          <div class="sql-actions">
            <button class="sql-action-btn copy" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 0 2 2v1"></path>
              </svg>
              复制SQL
            </button>
            <button class="sql-action-btn fullscreen" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h6V2H2v8h2V4zm16 0v6h2V2h-8v2h6zm0 16h-6v2h8v-8h-2v6zm-16 0v-6H2v8h8v-2H4z"></path>
              </svg>
              全屏
            </button>
          </div>
        </div>
        <div class="sql-content collapsed" data-index="${index}"></div>
      `;
      // 折叠/展开按钮事件
      const collapseToggle = sqlItem.querySelector(".collapse-toggle");
      collapseToggle.addEventListener("click", function () {
        const sqlContent = sqlItem.querySelector(".sql-content");
        const collapseIcon = this.querySelector(".collapse-icon");
        
        if (sqlContent.classList.contains("collapsed")) {
          // 展开
          sqlContent.classList.remove("collapsed");
          collapseIcon.style.transform = "rotate(180deg)";
          this.title = "收起";
        } else {
          // 折叠
          sqlContent.classList.add("collapsed");
          collapseIcon.style.transform = "rotate(0deg)";
          this.title = "展开";
        }
      });

      // 复制标题按钮事件
      const copyTitleBtn = sqlItem.querySelector(".copy-title-btn");
      copyTitleBtn.addEventListener("click", function () {
        const titleText = sqlItem.querySelector(".title-text").textContent;
        handleCopyTitle(titleText, this);
      });

      // 全屏/恢复按钮事件
      sqlItem
        .querySelector(".sql-action-btn.fullscreen")
        .addEventListener("click", function () {
          sqlItem.classList.toggle("fullscreen");
          if (sqlItem.classList.contains("fullscreen")) {
            this.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h6V2H2v8h2V4zm16 0v6h2V2h-8v2h6zm0 16h-6v2h8v-8h-2v6zm-16 0v-6H2v8h8v-2H4z"></path>
              </svg>
              分屏
            `;
            this.title = "分屏";
          } else {
            this.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h6V2H2v8h2V4zm16 0v6h2V2h-8v2h6zm0 16h-6v2h8v-8h-2v6zm-16 0v-6H2v8h8v-2H4z"></path>
              </svg>
              全屏
            `;
            this.title = "全屏";
          }
        });

      // 为代码编辑器添加拖拽调整大小功能
      const sqlContent = sqlItem.querySelector(".sql-content");
      if (sqlContent) {
        makeResizable(sqlContent);
      }

      sqlList.appendChild(sqlItem);
    });

    // 为每个SQL内容创建代码编辑器
    document.querySelectorAll(".sql-content").forEach((container, index) => {
      const editor = new CodeEditor(container, {
        value: sqlData[index],
        language: "sql",
        onChange: (value) => {
          currentSQLs[index] = value;
        },
      });

      // 保存编辑器实例以便后续使用
      container._editor = editor;

      // 自动格式化SQL（静默模式，不显示提示）
      setTimeout(() => {
        editor.format(true);
      }, 100); // 延迟一下确保编辑器完全初始化
    });

    // 添加事件监听器
    const copyButtons = document.querySelectorAll(".sql-action-btn.copy");

    console.log("🔍 找到复制按钮数量:", copyButtons.length);

    copyButtons.forEach((btn, index) => {
      console.log(`🔍 绑定复制按钮 ${index}:`, btn);
      btn.addEventListener("click", handleCopySQL);
    });
  };

  // 处理复制SQL
  function handleCopySQL(event) {
    console.log("🔍 复制按钮被点击");
    const index = event.currentTarget.getAttribute("data-index");
    const sql = currentSQLs[index];

    console.log("🔍 复制SQL:", { index, sql, currentSQLs });

    if (sql) {
      console.log("🔍 开始复制SQL到剪贴板");
      // 使用现代Clipboard API
      navigator.clipboard
        .writeText(sql)
        .then(() => {
          console.log("🔍 复制成功");
          // 复制成功，显示反馈
          const originalText = event.currentTarget.innerHTML;
          event.currentTarget.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已复制
        `;

          setTimeout(() => {
            event.currentTarget.innerHTML = originalText;
          }, 2000);
        })
        .catch((error) => {
          console.log("🔍 现代API复制失败，使用降级方法:", error);
          // 降级到旧方法
          const textarea = document.createElement("textarea");
          textarea.value = sql;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);

          console.log("🔍 降级方法复制完成");

          const originalText = event.currentTarget.innerHTML;
          event.currentTarget.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已复制
        `;
          setTimeout(() => {
            event.currentTarget.innerHTML = originalText;
          }, 2000);
        });
    } else {
      console.warn("⚠️ 没有找到SQL内容，无法复制");
    }
  }

  // 显示反馈消息
  function showFeedback(message, color = "#4a6cf7") {
    const feedback = document.createElement("div");
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 8px 16px;
      border-radius: 30px;
      font-size: 0.9rem;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(feedback);

    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
    }, 2000);
  }

  // 处理导出所有SQL
  exportBtn.addEventListener("click", () => {
    if (currentSQLs.length === 0) {
      alert("没有可导出的SQL内容");
      return;
    }

    const combinedSQL = currentSQLs.join(
      "\n\n-- ================================================ --\n\n"
    );

    // 创建下载
    const blob = new Blob([combinedSQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doris_sql_export_${new Date()
      .toISOString()
      .slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 显示反馈
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      已导出
    `;

    setTimeout(() => {
      exportBtn.innerHTML = originalText;
    }, 2000);
  });

  // 处理清除结果按钮
  const clearBtn = document.getElementById("clearBtn");
  clearBtn.addEventListener("click", async () => {
    // 确认对话框
    if (!confirm("确定要清除所有转换结果吗？")) {
      return;
    }

    const originalText = clearBtn.innerHTML;
    clearBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      清除中...
    `;
    clearBtn.disabled = true;

    try {
      // 清除本地存储
      await chrome.storage.local.remove(["conversionResults"]);

      // 重置UI状态
      currentSQLs = [];
      renderSQLList([]);
      statusText.textContent = "就绪，点击转换按钮开始";
      lastConvertTime.textContent = "上次转换时间: 无";

      // 隐藏清除按钮
      clearBtn.style.display = "none";

      showFeedback("已清除所有结果", "#4a6cf7");
    } catch (error) {
      console.error("清除结果失败:", error);
      showFeedback("清除失败，请稍后重试", "#ef4444");
    } finally {
      clearBtn.innerHTML = originalText;
      clearBtn.disabled = false;
    }
  });

  // 处理检测日志按钮
  debugBtn.addEventListener("click", async () => {
    const originalText = debugBtn.innerHTML;
    debugBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      检测中...
    `;
    debugBtn.disabled = true;

    try {
      const debugInfo = await collectDebugInfo();
      showDebugModal(debugInfo);
    } catch (error) {
      console.error("收集调试信息失败:", error);
      showFeedback("检测失败，请稍后重试", "#ef4444");
    } finally {
      debugBtn.innerHTML = originalText;
      debugBtn.disabled = false;
    }
  });

  // 尝试获取上次的转换结果
  chrome.runtime.sendMessage({ action: "getConversionResults" }, (response) => {
    if (chrome.runtime.lastError) {
      console.log("获取转换结果失败:", chrome.runtime.lastError);
      return;
    }
    if (response && response.sqlList) {
      currentSQLs = response.sqlList;
      renderSQLList(response.sqlList);
      statusText.textContent = `已加载上次转换结果 | ${response.queryCount} 个查询`;
      const convertTime = response.lastConvertTime
        ? new Date(response.lastConvertTime).toLocaleString()
        : "未知";
      lastConvertTime.textContent = `上次转换时间: ${convertTime}`;
    }
  });
});

// 监听存储变化，实时更新UI
chrome.storage.onChanged.addListener((changes) => {
  if (changes.conversionResults && changes.conversionResults.newValue) {
    const results = changes.conversionResults.newValue;

    // 安全获取DOM元素
    const statusTextElement = document.getElementById("statusText");
    const lastConvertTimeElement = document.getElementById("lastConvertTime");

    if (statusTextElement) {
      statusTextElement.textContent = `已更新转换结果 | ${
        results.queryCount || 0
      } 个查询`;
    }

    if (results.lastConvertTime && lastConvertTimeElement) {
      const convertTime = new Date(results.lastConvertTime).toLocaleString();
      lastConvertTimeElement.textContent = `上次转换时间: ${convertTime}`;
    }

    // 更新SQL列表
    currentSQLs = results.sqlList || [];
    if (typeof renderSQLList === "function") {
      renderSQLList(currentSQLs);
    }
  }
});

// 收集SQL转换必要条件的检查信息
async function collectDebugInfo() {
  const checkResults = {
    isReady: false,
    checks: {
      pageEnvironment: { status: false, message: "" },
      contentScript: { status: false, message: "" },
      grafanaData: { status: false, message: "" },
      requiredParams: { status: false, message: "" },
    },
    summary: "",
  };

  try {
    // 1. 检查页面环境
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs[0]) {
      const isGrafanaPage = tabs[0].url.includes("grafana");
      const isEditPage = tabs[0].url.includes("editPanel=");

      checkResults.checks.pageEnvironment.status = isGrafanaPage && isEditPage;
      checkResults.checks.pageEnvironment.message = checkResults.checks
        .pageEnvironment.status
        ? "✅ 在Grafana编辑页面"
        : "❌ 需要在Grafana面板编辑页面";
    }

    // 2. 检查Content Script连接和数据
    if (tabs[0]) {
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getDebugInfo" },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            }
          );
        });

        if (response && response.success) {
          checkResults.checks.contentScript.status = true;
          checkResults.checks.contentScript.message = "✅ Content Script已连接";

          // 3. 检查Grafana数据
          const debugInfo = response.debugInfo || {};

          const hasQueryConfigs =
            debugInfo.queryConfigs && debugInfo.queryConfigs.length > 0;
          const hasGlobalVars =
            debugInfo.globalVars &&
            Object.keys(debugInfo.globalVars).length > 0;

          console.log("debugInfo", debugInfo);

          checkResults.checks.grafanaData.status = hasQueryConfigs;
          checkResults.checks.grafanaData.message = hasQueryConfigs
            ? `✅ 找到 ${debugInfo.queryConfigs.length} 个查询配置`
            : "❌ 未找到查询配置";

          // 4. 检查必要参数
          if (hasGlobalVars) {
            const requiredParams = [
              "dashBoardVariables",
              "queryTimeRange",
              "panelType",
            ];
            const missingParams = requiredParams.filter(
              (param) => !debugInfo.globalVars[param]
            );

            checkResults.checks.requiredParams.status =
              missingParams.length === 0;
            checkResults.checks.requiredParams.message = checkResults.checks
              .requiredParams.status
              ? "✅ 所有必要参数已就绪"
              : `❌ 缺少参数: ${missingParams.join(", ")}`;
          } else {
            checkResults.checks.requiredParams.status = false;
            checkResults.checks.requiredParams.message = "❌ 无法获取全局变量";
          }
        } else {
          checkResults.checks.contentScript.status = false;
          checkResults.checks.contentScript.message =
            "❌ Content Script响应异常";
        }
      } catch (error) {
        checkResults.checks.contentScript.status = false;
        checkResults.checks.contentScript.message = "❌ Content Script未连接";
      }
    }

    // 汇总结果
    const allChecksPass = Object.values(checkResults.checks).every(
      (check) => check.status
    );
    checkResults.isReady = allChecksPass;
    checkResults.summary = allChecksPass
      ? "✅ 所有检查通过，可以进行SQL转换"
      : "❌ 存在问题，请修复后再试";
  } catch (error) {
    checkResults.summary = `❌ 检查过程出错: ${error.message}`;
  }

  return checkResults;
}

// 显示SQL转换条件检查结果
function showDebugModal(checkResults) {
  const modal = document.createElement("div");
  modal.className = "debug-modal";

  const statusClass = checkResults.isReady ? "success" : "error";
  const statusIcon = checkResults.isReady
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  modal.innerHTML = `
    <div class="debug-modal-content">
      <div class="debug-modal-header">
        <h3>SQL转换条件检查</h3>
        <button class="debug-modal-close">×</button>
      </div>
      <div class="debug-modal-body">
        <div class="check-summary ${statusClass}">
          ${statusIcon}
          <span>${checkResults.summary}</span>
        </div>
        <div class="check-items">
          ${Object.entries(checkResults.checks)
            .map(
              ([key, check]) => `
            <div class="check-item">
              <span class="check-icon ${check.status ? "success" : "error"}">
                ${check.status ? "✓" : "✗"}
              </span>
              <span class="check-message">${check.message}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      <div class="debug-modal-footer">
        <button class="btn btn-secondary close-modal">关闭</button>
      </div>
    </div>
  `;

  // 添加样式
  const style = document.createElement("style");
  style.textContent = `
    .check-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      font-weight: 500;
    }
    .check-summary.success {
      background-color: #dcfce7;
      color: #166534;
    }
    .check-summary.error {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .check-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #f9fafb;
      border-radius: 6px;
    }
    .check-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 14px;
      font-weight: bold;
    }
    .check-icon.success {
      background-color: #10b981;
      color: white;
    }
    .check-icon.error {
      background-color: #ef4444;
      color: white;
    }
    .close-modal {
      width: 100%;
    }
  `;

  if (!document.querySelector("#check-modal-styles")) {
    style.id = "check-modal-styles";
    document.head.appendChild(style);
  }

  // 添加事件监听器
  const closeBtn = modal.querySelector(".debug-modal-close");
  const closeModalBtn = modal.querySelector(".close-modal");

  [closeBtn, closeModalBtn].forEach((btn) => {
    btn.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  document.body.appendChild(modal);
}

// 在顶部添加解码函数
function decodeHtmlEntities(str) {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// 使元素可拖拽调整大小
function makeResizable(element) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  const handleMouseDown = (e) => {
    // 检查是否点击在右下角区域
    const rect = element.getBoundingClientRect();
    const cornerSize = 20;
    const isInCorner =
      e.clientX > rect.right - cornerSize &&
      e.clientY > rect.bottom - cornerSize;

    if (!isInCorner) return;

    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = element.offsetWidth;
    startHeight = element.offsetHeight;

    element.style.cursor = "se-resize";
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // 检查是否在全屏模式
    const isFullscreen = element
      .closest(".sql-item")
      ?.classList.contains("fullscreen");

    let maxWidth, maxHeight;

    if (isFullscreen) {
      // 全屏模式下使用视口边界
      maxWidth = window.innerWidth - 40; // 留出边距
      maxHeight = window.innerHeight - 100; // 留出头部空间
    } else {
      // 普通模式下使用父容器边界
      const parentRect = element.parentElement.getBoundingClientRect();
      maxWidth = parentRect.width - 20;
      maxHeight = parentRect.height - 20;
    }

    const newWidth = Math.max(300, Math.min(maxWidth, startWidth + deltaX)); // 最小宽度300px，最大不超过边界
    const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY)); // 最小高度200px，最大不超过边界

    element.style.width = newWidth + "px";
    element.style.height = newHeight + "px";

    // 如果元素有编辑器实例，通知编辑器更新
    if (element._editor) {
      element._editor.updateHighlight();
      element._editor.updateLineNumbers();
    }
  };

  const handleMouseUp = () => {
    if (isResizing) {
      isResizing = false;
      element.style.cursor = "default";
    }
  };

  element.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

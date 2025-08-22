// 内容脚本 - 核心转换逻辑（完整实现）
let globalVars = {};
let queryConfigs = [];
let transformConfigs = [];
let dorisSQLs = [];

// 移除ES6模块导入，直接使用全局类
// import { SQL_TEMPLATES, KNOWN_FIELDS, DEFAULT_CONFIG } from './sql-templates.js';

// 使用全局配置（通过script标签加载）
// 检查配置是否已加载
function checkSQLTemplates() {
  if (window.SQL_TEMPLATES && window.KNOWN_FIELDS && window.DEFAULT_CONFIG) {
    console.log("✅ SQL模板配置已加载");
    return true;
  } else {
    console.warn("⚠️ SQL模板配置未加载，使用内联配置");
    return false;
  }
}

// 获取SQL模板配置
function getSQLTemplates() {
  if (checkSQLTemplates()) {
    return {
      SQL_TEMPLATES: window.SQL_TEMPLATES,
      KNOWN_FIELDS: window.KNOWN_FIELDS,
      DEFAULT_CONFIG: window.DEFAULT_CONFIG,
      PANEL_STRATEGIES: window.PANEL_STRATEGIES
    };
  }
  
  // 如果没有外部模板配置，抛出错误
  throw new Error("SQL模板配置未加载，请确保 sql-templates.js 已正确加载");
}

// 获取配置
const config = getSQLTemplates();
const SQL_TEMPLATES = config.SQL_TEMPLATES;
const KNOWN_FIELDS = config.KNOWN_FIELDS;
const DEFAULT_CONFIG = config.DEFAULT_CONFIG;

// 立即执行的测试代码
console.log("🚀 content.js 脚本已加载");
console.log("🔍 检查InlinePopup类:", typeof window.InlinePopup);
console.log(
  "🔍 检查chrome API:",
  typeof chrome !== "undefined" ? "可用" : "不可用"
);

// 检查chrome API可用性
const isChromeAPIAvailable =
  typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

// 调试助手函数
window.debugGrafanaConverter = {
  // 获取当前状态
  getStatus: () => {
    console.log("📊 当前扩展程序状态:");
    console.log("- 页面检测:", isGrafanaEditPanelPage());
    console.log("- 全局变量:", globalVars);
    console.log("- 查询配置:", queryConfigs);
    console.log("- 转换配置:", transformConfigs);
    console.log("- 生成的SQL:", dorisSQLs);
    return { globalVars, queryConfigs, transformConfigs, dorisSQLs };
  },

  // 测试DOM选择器
  testSelectors: () => {
    console.log("🔍 测试DOM选择器:");
    const queryEditorRows = document.querySelector(
      '[data-testid="query-editor-rows"]'
    );
    console.log("- 查询编辑器容器:", queryEditorRows);

    const queryItems = document.querySelectorAll(".query-editor-row");
    console.log("- 查询项数量:", queryItems.length);

    queryItems.forEach((item, index) => {
      console.log(`- 查询项 ${index + 1}:`, item);
      const textarea = item.querySelector("textarea");
      console.log(`  查询内容:`, textarea?.value);
    });

    return { queryEditorRows, queryItems };
  },

  // 强制重新解析
  forceReparse: async () => {
    console.log("🔄 强制重新解析...");
    globalVars = {
      dashBoardVariables: getDashboardVariables(),
      queryTimeRange: getQueryDateRange(),
      panelType: getPanelType(),
      dorisSources: "doris_log_table",
      interval: "1h",
      limit: 100,
    };
    queryConfigs = getQueryConfigs();
    transformConfigs = await getTransformConfigs();
    console.log("✅ 重新解析完成");
    return window.debugGrafanaConverter.getStatus();
  },

  // 紧急修复：手动提取查询
  emergencyExtract: () => {
    console.log("🚨 紧急查询提取...");
    const allTextareas = document.querySelectorAll("textarea");
    const foundQueries = [];

    allTextareas.forEach((ta, index) => {
      if (ta.value && ta.value.trim().length > 10) {
        // 至少10个字符
        foundQueries.push({
          index: index + 1,
          content: ta.value.trim(),
          element: ta,
          placeholder: ta.placeholder,
          parentClass: ta.parentElement?.className,
        });
        console.log(
          `找到查询 ${index + 1}:`,
          ta.value.substring(0, 50) + "..."
        );
      }
    });

    if (foundQueries.length > 0) {
      // 直接生成简单的SQL
      const emergencySQL = foundQueries.map((query, index) => {
        return `-- 紧急提取的查询 ${index + 1}
-- 原始查询: ${query.content.substring(0, 100)}...
SELECT 
  timestamp as time,
  message
FROM logs.doris_log_table 
WHERE message LIKE '%${query.content.split(" ")[0]}%'
  AND timestamp >= now() - interval 1 hour
ORDER BY timestamp DESC
LIMIT 100;`;
      });

      console.log("🆘 生成紧急SQL:", emergencySQL);

      // 直接复制到剪贴板
      const combinedSQL = emergencySQL.join("\n\n");
      navigator.clipboard.writeText(combinedSQL).then(() => {
        console.log("✅ SQL已复制到剪贴板");
        alert(
          "🆘 紧急SQL提取成功！\n已复制到剪贴板，共 " +
            foundQueries.length +
            " 个查询"
        );
      });

      return { success: true, queries: foundQueries, sql: emergencySQL };
    } else {
      console.log("❌ 未找到任何查询内容");
      alert("❌ 页面上未找到任何查询内容");
      return { success: false, queries: [] };
    }
  },
};

// 检查是否在Grafana面板编辑页面
function isGrafanaEditPanelPage() {
  const currentUrl = window.location.href;
  const requiredDomain = "grafana-atome.advai.net";
  const hasEditPanel = currentUrl.includes("editPanel=");
  const hasGrafana = currentUrl.includes("grafana");

  console.log("🔍 检查Grafana页面条件:");
  console.log("  - 当前URL:", currentUrl);
  console.log("  - 包含域名:", currentUrl.includes(requiredDomain));
  console.log("  - 包含editPanel:", hasEditPanel);
  console.log("  - 包含grafana:", hasGrafana);

  // 更宽松的条件：只要在Grafana域名下就显示按钮
  const result = currentUrl.includes(requiredDomain);

  console.log("  - 最终结果:", result);
  return result;
}

// 获取Dashboard变量
function getDashboardVariables() {
  const urlParams = new URLSearchParams(window.location.search);
  const variables = {};

  for (const [key, value] of urlParams) {
    if (key.startsWith("var-")) {
      const varName = key.substring(4);
      variables[varName] = value;
    }
  }

  return variables;
}

// 获取查询日期
function getQueryDateRange() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    from: urlParams.get("from") || "",
    to: urlParams.get("to") || "",
  };
}

// 获取图表类型
function getPanelType() {
  const vizPicker = document.querySelector('[aria-label="toggle-viz-picker"]');
  if (vizPicker && vizPicker.children.length > 1) {
    return vizPicker.children[1].textContent.trim();
  }
  return "";
}

// 解析查询配置部分 (按照PDF文档实现)
function parseConfigSection(SectionName, row) {
  const section = [];

  // 定位配置组标题行
  const header = [...row.querySelectorAll(".css-ld20k8o")].find((e1) =>
    e1.textContent.includes(SectionName)
  );

  if (!header) return section;

  // 提取同级操作按钮
  const buttons = header
    .closest(".css-9doeo5-InlineFieldRow")
    .querySelectorAll("button:not(.gf-form-label-btn)");

  // 解析按钮序列：类型->字段->参数
  const config = {
    type: buttons[0]?.textContent.trim(),
  };

  if (buttons[1]) config.field = buttons[1].textContent.trim();

  // 解析参数按钮（class包含query-part）
  config.parameters = [...buttons].slice(2).map((btn) => {
    const [name, value] = btn.textContent.split(":").map((s) => s.trim());
    return { name, value: value || "" };
  });

  return [config];
}

// 安全获取元素文本内容
function safeGetText(element) {
  return element?.textContent?.trim() || "";
}

// 安全获取输入值
function safeGetValue(element) {
  return element?.value?.trim() || "";
}

// 获取查询配置 (完整实现，增强错误检查)
function getQueryConfigs() {
  console.log("🚀 开始解析查询配置...");
  try {
    // 尝试多种选择器查找查询编辑器容器
    const containerSelectors =
      '[data-testid="query-editor-rows"][data-rbd-droppable-id="transformations-list"]';

    let queryEditorRows = null;

    queryEditorRows = document.querySelector(containerSelectors);
    if (queryEditorRows) {
      console.log(
        `✅ 找到查询编辑器容器 (${containerSelectors}):`,
        queryEditorRows
      );
    }

    if (!queryEditorRows) {
      console.warn("⚠️ 查询编辑器容器未找到，尝试直接查找查询行...");
      // 如果找不到容器，直接在整个文档中查找查询行
      queryEditorRows = document;
    }

    const configs = extractAndFormatGrafanaConfigs(queryEditorRows);
    console.log("🔍 提取的配置:", configs);

    return configs?.raw || [];
  } catch (error) {
    console.error("获取查询配置失败:", error);
    return [];
  }
}

// 解析Transform配置 (按照PDF文档实现)
function parseTransformations(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items = [];

  // 定位所有转换操作项
  const rows = doc.querySelectorAll("[data-rbd-draggable-id]");

  rows.forEach((row) => {
    const id = row.getAttribute("data-rbd-draggable-id");
    const titleElement = row.querySelector(
      '[aria-label="Query operation row title"]'
    );
    const type = titleElement ? titleElement.textContent.trim() : "";

    // 根据操作类型选择解析策略
    const config = {};

    if (type.includes("field from calculation")) {
      config.Mode = "Binary operation"; // 默认模式
      config.Operation = ""; // 实际需要从展开面板获取
      config.Alias = ""; // 实际需要从展开面板获取
      config["Replace all fields"] = "false"; // 默认值
    } else if (type.includes("Filter by name")) {
      config.Identifier = "";
    }

    items.push({ id, type, config });
  });

  return items;
}

// 提取Transform详细配置
function extractTransformConfigs(container) {
  const transforms = [];
  const rows = container.querySelectorAll("[data-rbd-draggable-id]");

  rows.forEach((row) => {
    const id = row.getAttribute("data-rbd-draggable-id");
    const titleElement = row.querySelector(
      '[aria-label="Query operation row title"]'
    );
    const type = titleElement ? titleElement.textContent.trim() : "";

    const config = {};

    if (type.includes("field from calculation")) {
      // 尝试获取具体配置，如果获取不到则使用默认值
      const operationInput =
        row.querySelector('input[placeholder*="operation"]') ||
        row.querySelector('input[value*="|"]');
      const aliasInput =
        row.querySelector('input[placeholder*="alias"]') ||
        row.querySelector('input[placeholder*="name"]');

      console.log("🔧 提取Transform配置:", {
        type,
        operationInput: operationInput?.value,
        aliasInput: aliasInput?.value,
      });

      config.Mode = "Binary operation";
      config.Operation = operationInput?.value || ""; // 移除硬编码默认值
      config.Alias = aliasInput?.value || "calculated_field";
      config["Replace all fields"] = "false";
    } else if (type.includes("Filter by name")) {
      const identifierInput =
        row.querySelector('input[placeholder*="identifier"]') ||
        row.querySelector('input[placeholder*="pattern"]');

      console.log("🔧 提取Filter配置:", {
        type,
        identifierInput: identifierInput?.value,
      });

      config.Identifier = identifierInput?.value || "";
    }

    transforms.push({ id, type, config });
  });

  return transforms;
}

// 获取Transform配置 (完整实现)
function getTransformConfigs() {
  const transformTab = document.querySelector('[aria-label="Tab Transform"]');
  if (!transformTab) return Promise.resolve([]);

  // 模拟点击Transform标签
  transformTab.click();

  // 等待内容加载
  return new Promise((resolve) => {
    setTimeout(() => {
      const transformationsContainer = document.querySelector(
        '[data-rbd-droppable-id="transformations-list"]'
      );

      if (!transformationsContainer) {
        // 切换回查询标签
        const queryTab = document.querySelector('[aria-label="Tab Query"]');
        if (queryTab) queryTab.click();
        resolve([]);
        return;
      }

      // 获取HTML结构并尝试展开配置面板获取详细信息
      const transforms = extractTransformConfigs(transformationsContainer);

      // 切换回查询标签
      const queryTab = document.querySelector('[aria-label="Tab Query"]');
      if (queryTab) queryTab.click();

      resolve(transforms);
    }, 800); // 增加等待时间以确保内容完全加载
  });
}

// Doris SQL转换函数 (完全按照PDF文档实现)
function convertToDorisSQL(globalVars, queryConfigs, transformConfigs) {
  console.log("🔄 开始转换到Doris SQL...");
  console.log("📊 全局变量:", globalVars);
  console.log("🔍 查询配置:", queryConfigs);
  console.log("🔧 转换配置:", transformConfigs);
  
  // 使用全局的KNOWN_FIELDS，不再需要本地定义
  // const knownFields = [
  //   "datetime_local",
  //   "timestamp",
  //   "application_name",
  //   "project_name",
  //   "logger",
  //   "thread",
  //   "level",
  //   "bj_timestamp",
  // ];

  // SQL安全转义函数
  function escapeSQLValue(value) {
    if (typeof value !== "string") return "";
    // 转义单引号，防止SQL注入
    return value.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  // 验证字段名安全性
  function isValidFieldName(fieldName) {
    // 只允许字母、数字、下划线和点号
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(fieldName);
  }

  // 在convertToDorisSQL前添加解码函数
  function decodeHtmlEntities(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  // 将OpenSearch查询转换为Doris条件
  function convertQueryToCondition(query) {
    if (!query) return "";
    
    console.log("🔍 开始转换查询条件:", query);

    // 使用全局的已知字段列表
    // const knownFields = [
    //   "datetime_local",
    //   "timestamp",
    //   "application_name",
    //   "project_name",
    //   "logger",
    //   "thread",
    //   "level",
    //   "bj_timestamp",
    // ];

    // 处理变量替换（保留Grafana宏）
    const processedQuery = query.replace(/\$\{(\w+)\}/g, "${$1}");

    // 解析复杂的逻辑查询
    function parseLogicalQuery(queryStr) {
      console.log("🔍 解析逻辑查询:", queryStr);
      
      // 处理括号内的OR逻辑
      const orPattern = /\(([^()]+)\)/g;
      let processedQuery = queryStr;
      let match;
      
      // 先处理所有括号内的OR逻辑
      while ((match = orPattern.exec(queryStr)) !== null) {
        const bracketContent = match[1];
        console.log("🔍 发现括号内容:", bracketContent);
        
        // 检查括号内是否包含OR
        if (bracketContent.includes(" OR ")) {
          const orConditions = bracketContent.split(" OR ").map(c => c.trim());
          console.log("🔍 OR条件:", orConditions);
          
          // 检查括号前是否有字段名（如 msg:("value1" OR "value2")）
          // 使用更可靠的方法：从当前匹配位置向前查找最近的字段名
          let fieldName = null;
          
          // 从括号开始位置向前查找最近的冒号
          const beforeBracket = queryStr.substring(0, match.index);
          const lastColonIndex = beforeBracket.lastIndexOf(":");
          
          if (lastColonIndex !== -1) {
            // 从冒号前开始，向前查找最后一个完整的字段名
            const beforeColon = beforeBracket.substring(0, lastColonIndex).trim();
            
            // 如果beforeColon为空，说明冒号就在开头，没有字段名
            if (beforeColon) {
              // 查找最后一个空格，如果找到则取空格后的部分作为字段名
              const lastSpaceIndex = beforeColon.lastIndexOf(" ");
              if (lastSpaceIndex !== -1) {
                fieldName = beforeColon.substring(lastSpaceIndex + 1).trim();
              } else {
                fieldName = beforeColon;
              }
              
              // 验证字段名是否有效（不包含冒号等特殊字符）
              if (fieldName && (fieldName.includes(":") || fieldName.includes(" ") || fieldName.includes("("))) {
                // 如果字段名包含特殊字符，说明提取错误，重新处理
                const parts = beforeColon.split(" ");
                fieldName = parts[parts.length - 1] || null;
                
                // 再次验证
                if (fieldName && (fieldName.includes(":") || fieldName.includes(" ") || fieldName.includes("("))) {
                  fieldName = null; // 如果还是无效，设为null
                }
              }
            }
            
            console.log("🔍 检测到括号前的字段名:", fieldName);
          }
          
          // 构建Doris条件
          let replacement;
          if (fieldName) {
            // 如果有字段名，优先使用REGEXP，否则使用OR组合
            const values = orConditions.map(cond => {
              // 去除引号
              if (cond.startsWith('"') && cond.endsWith('"')) {
                return cond.substring(1, cond.length - 1);
              }
              return cond;
            });
            
            // 检查是否可以使用REGEXP（所有值都不包含特殊字符）
            const canUseRegexp = values.every(val => 
              !val.includes('*') && !val.includes('?') && !val.includes('+') && 
              !val.includes('[') && !val.includes(']') && !val.includes('|')
            );
            
            if (canUseRegexp) {
              // 使用REGEXP，用|分隔多个值
              const regexpValue = values.join('|');
              replacement = `${fieldName} REGEXP "${regexpValue}"`;
              console.log("🔍 使用REGEXP:", replacement);
            } else {
              // 使用OR组合
              const dorisOrConditions = values.map(value => 
                `${fieldName} MATCH_PHRASE("${value}")`
              );
              replacement = `(${dorisOrConditions.join(" OR ")})`;
              console.log("🔍 使用OR组合:", replacement);
            }
          } else {
            // 没有字段名，使用OR组合
            const dorisOrConditions = orConditions.map(condition => {
              const { field, value } = parseFieldValue(condition);
              return buildDorisCondition(field, value);
            }).filter(Boolean);
            replacement = `(${dorisOrConditions.join(" OR ")})`;
          }
          
          // 将括号内容替换为Doris条件
          // 关键修复：替换时确保不包含字段名和冒号
          const originalBracket = match[0];
          
          // 找到字段名的开始位置（冒号前最后一个空格的位置，如果没有空格则从开头开始）
          const beforeBracketForReplacement = queryStr.substring(0, match.index);
          const lastColonIndexForReplacement = beforeBracketForReplacement.lastIndexOf(":");
          
          if (lastColonIndexForReplacement !== -1) {
              // 找到字段名的开始位置
              const beforeColon = beforeBracketForReplacement.substring(0, lastColonIndexForReplacement).trim();
              let fieldStartIndex;
              
              if (beforeColon === "") {
                  // 字段名从开头开始，如 "msg:"
                  fieldStartIndex = 0;
              } else {
                  // 字段名前面有内容，找到最后一个空格
                  const lastSpaceIndex = beforeColon.lastIndexOf(" ");
                  fieldStartIndex = lastSpaceIndex !== -1 ? lastSpaceIndex + 1 : 0;
              }
              
              // 从字段名开始位置到括号结束位置，全部替换
              const beforeField = queryStr.substring(0, fieldStartIndex);
              const afterBracketText = queryStr.substring(match.index + originalBracket.length);
              
              // 重新构建查询字符串，确保字段名不重复
              processedQuery = beforeField + replacement + afterBracketText;
              
              // 调试日志
              console.log("🔍 字段名替换调试:");
              console.log("  - lastColonIndexForReplacement:", lastColonIndexForReplacement);
              console.log("  - fieldStartIndex:", fieldStartIndex);
              console.log("  - beforeField:", `"${beforeField}"`);
              console.log("  - replacement:", `"${replacement}"`);
              console.log("  - afterBracketText:", `"${afterBracketText}"`);
              console.log("  - 最终结果:", `"${processedQuery}"`);
          } else {
              // 如果没有找到字段名，使用原来的替换逻辑
              const beforeBracketText = queryStr.substring(0, match.index);
              const afterBracketText = queryStr.substring(match.index + originalBracket.length);
              processedQuery = beforeBracketText + replacement + afterBracketText;
          }
          
          console.log("🔍 替换括号内容:", replacement);
          console.log("🔍 替换后的查询:", processedQuery);
        }
      }
      
      // 处理剩余的AND逻辑
      const andConditions = processedQuery.split(" AND ");
      const dorisConditions = [];
      
      andConditions.forEach((cond) => {
        const trimmedCond = cond.trim();
        if (!trimmedCond) return;
        
        // 如果条件已经被处理过（包含Doris语法），直接添加
        if (trimmedCond.includes("MATCH_PHRASE") || trimmedCond.includes("REGEXP") || trimmedCond.includes("=") || trimmedCond.startsWith("(")) {
          dorisConditions.push(trimmedCond);
          return;
        }
        
        // 检查是否包含冒号（可能是未处理的字段:值格式）
        if (trimmedCond.includes(":")) {
          // 解析字段和值
          const { field, value } = parseFieldValue(trimmedCond);
          const dorisCondition = buildDorisCondition(field, value);
          if (dorisCondition) {
            dorisConditions.push(dorisCondition);
          }
        } else {
          // 没有冒号，可能是纯值，使用默认字段
          const dorisCondition = buildDorisCondition(null, trimmedCond);
          if (dorisCondition) {
            dorisConditions.push(dorisCondition);
          }
        }
      });
      
      return dorisConditions.join(" AND ");
    }
    
    // 解析字段和值的函数
    function parseFieldValue(condition) {
      // 匹配模式：field:"value" 或 field:value
      const colonIndex = condition.indexOf(":");
      if (colonIndex === -1) {
        // 没有字段名，整个条件作为值
        return { field: null, value: condition };
      }

      const field = condition.substring(0, colonIndex).trim();
      let value = condition.substring(colonIndex + 1).trim();

      // 检查值是否被引号包围
      if (value.startsWith('"') && value.endsWith('"')) {
        // 去除引号并处理转义字符
        value = value.substring(1, value.length - 1);
        // 处理转义字符：将 \\ 转换为 \，将 \" 转换为 "
        value = value.replace(/\\\\/g, "\\").replace(/\\"/g, '"');
      } else {
        // 没有引号，检查是否为正则表达式
        if (
          value.includes("*") ||
          value.includes("?") ||
          value.includes("+") ||
          value.includes("[") ||
          value.includes("]")
        ) {
          // 可能是正则表达式，保持原样
          console.log("🔍 检测到可能的正则表达式:", value);
        }
      }

      return { field, value };
    }
    
    // 构建Doris条件的函数
    function buildDorisCondition(field, value) {
      console.log("🔍 构建Doris条件:", { field, value });

      // 验证字段名安全性
      if (field && !isValidFieldName(field)) {
        console.warn(`⚠️ 无效字段名: ${field}`);
        return null;
      }

      // 如果没有字段名，使用默认字段
      const targetField = field || "message";

      // 检查是否为正则表达式
      if (
        value.includes("*") ||
        value.includes("?") ||
        value.includes("+") ||
        value.includes("[") ||
        value.includes("]") ||
        value.includes("|")
      ) {
        // 使用REGEXP
        return `${targetField} REGEXP "${value}"`;
      }

      // 检查是否为已知字段
      if (KNOWN_FIELDS.includes(targetField)) {
        // 已知字段使用等号
        return `${targetField} = "${value}"`;
      }

      // 检查字段是否为 msg 或 message
      if (targetField === "msg" || targetField === "message") {
        // 使用MATCH_PHRASE
        return `${targetField} MATCH_PHRASE("${value}")`;
      }

      // 对于其他非已知字段，使用 message 字段进行 MATCH_PHRASE
      // 将整个字段字符串作为值，例如：region:"SG" -> message MATCH_PHRASE('region:"SG"')
      const fullFieldString = `${targetField}:"${value}"`;
      
      // 处理引号问题：避免引号冲突
      let wrappedValue;
      if (fullFieldString.startsWith('"') && fullFieldString.endsWith('"')) {
        // 如果最外层是双引号，则使用单引号包裹
        wrappedValue = `'${fullFieldString}'`;
      } else if (fullFieldString.startsWith("'") && fullFieldString.endsWith("'")) {
        // 如果最外层是单引号，则使用双引号包裹
        wrappedValue = `"${fullFieldString}"`;
      } else {
        // 默认使用双引号包裹
        wrappedValue = `'${fullFieldString}'`;
      }
      
      return `message MATCH_PHRASE(${wrappedValue})`;
    }

    // 使用新的解析逻辑
    const result = parseLogicalQuery(processedQuery);
    console.log("🔍 最终转换结果:", result);
    return result;
  }

  // 应用transform配置
  function applyTransforms(baseSQL, transforms) {
    let transformedSQL = baseSQL;

    transforms.forEach((transform) => {
      if (
        transform.type.includes("field from calculation") &&
        transform.config?.Operation
      ) {
        const operationParts = transform.config.Operation.split(/\s*\|\s*/);
        if (operationParts.length === 3) {
          const [operand1, operator, operand2] = operationParts;
          const alias = transform.config.Alias || "calculated_field";

          // 在SELECT子句中添加计算字段
          transformedSQL = transformedSQL.replace(
            /SELECT\s+(.*?)\s+FROM/i,
            `SELECT $1, (${operand1} ${operator} ${operand2}) AS "${alias}" FROM`
          );
        }
      } else if (
        transform.type.includes("Filter by name") &&
        transform.config?.Identifier
      ) {
        const identifier = transform.config.Identifier;
        // 添加字段过滤条件
        transformedSQL = transformedSQL.replace(
          /WHERE\s+(.*?)(\s+AND\s+|\s+ORDER\s+|\s+GROUP\s+|$)/i,
          `WHERE $1 AND ${identifier}$2`
        );
      }
    });

    return transformedSQL;
  }

  // 生成Doris SQL列表
  const dorisSQLs = [];

  queryConfigs.forEach((queryConfig) => {
    console.log("🔍 处理查询配置:", queryConfig);
    console.log("🔍 查询内容:", queryConfig.query);
    console.log("🔍 查询内容类型:", typeof queryConfig.query);

    // 验证和清理配置值
    function validateAndCleanValue(value, defaultValue, type = "string") {
      if (value === null || value === undefined) return defaultValue;

      if (type === "number") {
        const num = parseInt(value, 10);
        return isNaN(num) || num <= 0 ? defaultValue : num;
      }

      if (type === "identifier") {
        // 验证标识符（表名、字段名等）
        return typeof value === "string" &&
          /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
          ? value
          : defaultValue;
      }

      return typeof value === "string" ? value : String(value || defaultValue);
    }

    // 提取 Size 值的函数
    function extractSizeFromRawData(rawData) {
      if (!rawData || !rawData.buttons) return null;
      
      for (const button of rawData.buttons) {
        if (button.includes("Size:")) {
          const sizeMatch = button.match(/Size:\s*(\d+)/);
          if (sizeMatch) {
            return parseInt(sizeMatch[1], 10);
          }
        }
      }
      return null;
    }

    // 准备替换变量（只替换需要转换的变量，保留Dashboard变量）
    const replacements = {
      // 只替换需要转换的变量，不替换Dashboard变量
      queryCondition:
        convertQueryToCondition(
          queryConfig.query?.content || queryConfig.query
        ) || "",
      alias: validateAndCleanValue(
        queryConfig.alias,
        "query_result",
        "string"
      ),
      deviceIdField: validateAndCleanValue(
        (queryConfig.metrics?.[0]?.field || "deviceId").replace(".keyword", ""),
        "deviceId",
        "identifier"
      ),
      groupByField: validateAndCleanValue(
        (queryConfig.groupBy?.[0]?.field || "@timestamp").replace(
          ".keyword",
          ""
        ),
        "timestamp",
        "identifier"
      ),
      limit: extractSizeFromRawData(queryConfig.rawData) || DEFAULT_CONFIG.limit,
    };

    // 调试日志：检查 limit 值
    console.log("🔍 调试 limit 值:");
    console.log("  - queryConfig.rawData:", queryConfig.rawData);
    console.log("  - 提取的 Size 值:", extractSizeFromRawData(queryConfig.rawData));
    console.log("  - DEFAULT_CONFIG.limit:", DEFAULT_CONFIG.limit);
    console.log("  - 最终 limit 值:", replacements.limit);

    // 使用策略模式获取模板
    const strategy = window.PANEL_STRATEGIES?.[globalVars.panelType] || 
                    config.PANEL_STRATEGIES?.[globalVars.panelType];
    
    if (!strategy) {
      throw new Error(`Unsupported panel type: ${globalVars.panelType}`);
    }
    
    // 获取基础模板
    let template = strategy.getTemplate(replacements);

    console.log("🔍 替换变量:", replacements);

    // 对所有变量值做HTML实体解码
    for (const key in replacements) {
      replacements[key] = decodeHtmlEntities(replacements[key]);
    }

    console.log("🔍 解码后的变量:", replacements);
    console.log("🔍 queryCondition转换结果:", replacements.queryCondition);

    // 验证必需变量（只验证需要转换的变量）
    const requiredVars = ["alias"];
    for (const varName of requiredVars) {
      if (!replacements[varName]) {
        throw new Error(`缺少必需的配置变量: ${varName}`);
      }
    }

    // 变量替换（只替换特定变量，保留Dashboard变量）
    let sql = template;
    console.log("🔍 原始SQL模板:", sql);

    for (const [key, value] of Object.entries(replacements)) {
      const beforeReplace = sql;
      sql = sql.split(`\${${key}}`).join(value);
      if (beforeReplace !== sql) {
        console.log(`🔍 替换变量 ${key}: "${value}"`);
      }
    }

    console.log("🔍 替换后的SQL（保留Dashboard变量）:", sql);
    console.log(
      "�� 保留的Dashboard变量: ${DorisSources}, ${interval}, ${limit}"
    );

    // 应用transform配置
    sql = applyTransforms(sql, transformConfigs);
    
    // 使用策略模式处理模板
    const currentIndex = queryConfigs.findIndex(qc => qc === queryConfig);
    sql = strategy.processTemplate(sql, replacements, queryConfigs, currentIndex);
    
    console.log(`🔍 ${globalVars.panelType} 模板处理完成:`, sql);
    
    // 策略处理完成后，再次进行变量替换（处理新模板中的变量）
    console.log("🔍 策略处理后再次进行变量替换...");
    for (const [key, value] of Object.entries(replacements)) {
      const beforeReplace = sql;
      sql = sql.split(`\${${key}}`).join(value);
      if (beforeReplace !== sql) {
        console.log(`🔍 策略处理后替换变量 ${key}: "${value}"`);
      }
    }
    
    console.log("🔍 最终SQL:", sql);
    
    // 在SQL开头添加查询名称注释
    // const queryName = queryConfig.name || `查询 ${queryConfig.index + 1}`;
    // const commentHeader = `-- 查询名称: ${queryName}\n-- 原始查询: ${queryConfig.query?.content || queryConfig.query}\n\n`;
    // sql = commentHeader + sql;
    
    dorisSQLs.push(sql);
  });

  return dorisSQLs;
}

// 确保调试助手在转换按钮显示时也可用
function ensureDebugHelper() {
  if (typeof window.debugGrafanaConverter === "undefined") {
    console.warn("⚠️ 调试助手未加载，重新初始化...");
    // 重新定义调试助手的简化版本
    window.debugGrafanaConverter = {
      getStatus: () => ({ message: "调试助手已重新加载" }),
      testSelectors: () => {
        const container = document.querySelector(
          '[data-testid="query-editor-rows"]'
        );
        const items = document.querySelectorAll(".query-editor-row");
        console.log("容器:", container, "项目:", items);
        return { container, items };
      },
      emergencyExtract: () => {
        const allTextareas = document.querySelectorAll("textarea");
        const allInputs = document.querySelectorAll("input");
        const allEditables = document.querySelectorAll(
          '[contenteditable="true"]'
        );
        console.log(
          "Textareas:",
          allTextareas.length,
          "Inputs:",
          allInputs.length,
          "Editables:",
          allEditables.length
        );
        return {
          textareas: allTextareas,
          inputs: allInputs,
          editables: allEditables,
        };
      },
    };
  }
}

// 全局InlinePopup实例
let inlinePopupInstance = null;

// 在页面上显示转换按钮
function showConvertButton() {
  console.log("🚀 showConvertButton 被调用");

  // 确保调试助手可用
  ensureDebugHelper();

  // 创建InlinePopup实例
  if (!inlinePopupInstance) {
    console.log("📦 创建新的InlinePopup实例");
    try {
      inlinePopupInstance = new InlinePopup();
      console.log("📦 InlinePopup实例创建完成:", inlinePopupInstance);
    } catch (error) {
      console.error("❌ 创建InlinePopup实例失败:", error);
      return;
    }
  } else {
    console.log("📦 使用现有的InlinePopup实例");
  }

  // 检查InlinePopup类是否可用
  if (typeof InlinePopup === 'undefined') {
    console.error("❌ InlinePopup类未定义！");
    return;
  }

  console.log("🚀 开始初始化InlinePopup...");
  try {
    inlinePopupInstance.init();
    console.log("✅ InlinePopup初始化完成");
    console.log("🔍 按钮引用:", inlinePopupInstance.button);
    console.log("🔍 弹窗引用:", inlinePopupInstance.popup);
  } catch (error) {
    console.error("❌ InlinePopup初始化失败:", error);
    return;
  }

  // 获取按钮引用以便添加转换逻辑
  const convertButton = document.getElementById("doris-convert-btn");
  console.log("🔍 按钮查找结果:", !!convertButton);

  if (!convertButton) {
    console.error("❌ 无法找到转换按钮！");
    return;
  }

  // 监听dorisConvert事件
  document.addEventListener("dorisConvert", async (event) => {
    if (event.detail.action === "convert") {
      console.log("🚀 收到转换事件，开始执行转换...");
      await performConversion();
    }
  });

  // 执行转换的函数
  async function performConversion() {
    // 防止重复点击
    const leftButton = convertButton.querySelector("#convert-left-btn");
    if (leftButton.disabled) return;

    leftButton.disabled = true;
    const originalHTML = leftButton.innerHTML;

    // 显示加载状态
    leftButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span>转换中...</span>
    `;

    try {
      console.log("📋 开始收集页面信息...");
      // 获取全局变量
      globalVars = {
        dashBoardVariables: getDashboardVariables(),
        queryTimeRange: getQueryDateRange(),
        panelType: getPanelType(),
        dorisSources: "doris_log_table",
        interval: "1h",
        limit: 100,
      };
      console.log("🌐 全局变量收集完成:", globalVars);

      // 获取查询配置
      console.log("🔍 开始获取查询配置...");
      queryConfigs = getQueryConfigs();
      console.log(`📝 获取到 ${queryConfigs.length} 个查询配置:`, queryConfigs);

      // 获取Transform配置 (异步)
      console.log("🔧 开始获取Transform配置...");
      transformConfigs = await getTransformConfigs();
      console.log(
        `⚙️ 获取到 ${transformConfigs.length} 个Transform配置:`,
        transformConfigs
      );

      // 转换SQL
      console.log("🔄 开始转换为Doris SQL...");
      dorisSQLs = convertToDorisSQL(globalVars, queryConfigs, transformConfigs);
      console.log(`✅ 生成了 ${dorisSQLs.length} 个SQL语句:`, dorisSQLs);

      // 存储转换结果
      if (isChromeAPIAvailable && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          conversionResults: {
            sqlList: dorisSQLs,
            queryCount: queryConfigs.length,
            transformCount: transformConfigs.length,
            lastConvertTime: new Date().toISOString(),
          },
        });
      } else {
        console.warn("⚠️ chrome.storage.local 不可用，跳过存储操作");
      }

      // 显示右侧按钮（查看结果按钮）
      if (inlinePopupInstance) {
        inlinePopupInstance.showRightButton();
      }

      // 显示内嵌popup
      if (!inlinePopupInstance) {
        inlinePopupInstance = new InlinePopup();
      }
      inlinePopupInstance.showPopup();

      // 等待iframe加载完成后发送数据
      setTimeout(() => {
        const iframe = inlinePopupInstance.popup.querySelector("iframe");
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "conversionResults",
              data: {
                sqlList: dorisSQLs,
                queryNames: queryConfigs.map(config => config.name || `查询 ${config.index + 1}`),
                queryCount: queryConfigs.length,
                transformCount: transformConfigs.length,
                lastConvertTime: new Date().toISOString(),
              },
            },
            "*"
          );
        }
      }, 100);

      // 显示成功提示
      leftButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22,4 12,14.01 9,11.01"></polyline>
        </svg>
        <span>转换成功</span>
      `;
      setTimeout(() => {
        leftButton.innerHTML = originalHTML;
        leftButton.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("转换错误:", error);
      // 显示错误提示
      leftButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>转换失败</span>
      `;
      setTimeout(() => {
        leftButton.innerHTML = originalHTML;
        leftButton.disabled = false;
      }, 2000);
    }
  }
}

// 初始化插件
console.log("🔧 开始初始化插件...");
console.log("🔍 检查页面条件:", isGrafanaEditPanelPage());
console.log("🔍 当前URL:", window.location.href);
console.log("🔍 页面状态:", document.readyState);
console.log("🔍 InlinePopup类是否可用:", typeof InlinePopup);

// 等待页面完全加载后再执行初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("📄 DOM加载完成，开始初始化...");
    console.log("🔍 InlinePopup类是否可用:", typeof InlinePopup);
    if (isGrafanaEditPanelPage()) {
      console.log("✅ 页面条件满足，调用showConvertButton");
      showConvertButton();
    } else {
      console.log("❌ 页面条件不满足，跳过按钮创建");
    }
  });
} else {
  // 页面已经加载完成，直接执行
  console.log("📄 页面已加载完成，直接初始化...");
  console.log("🔍 InlinePopup类是否可用:", typeof InlinePopup);
  if (isGrafanaEditPanelPage()) {
    console.log("✅ 页面条件满足，调用showConvertButton");
    showConvertButton();
  } else {
    console.log("❌ 页面条件不满足，跳过按钮创建");
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "regenerateSQL") {
    try {
      // 重新获取当前页面配置
      globalVars = {
        dashBoardVariables: getDashboardVariables(),
        queryTimeRange: getQueryDateRange(),
        panelType: getPanelType(),
        dorisSources: "doris_log_table",
        interval: "1h",
        limit: 100,
      };

      // 重新获取查询配置
      const newQueryConfigs = getQueryConfigs();

      if (newQueryConfigs[request.index]) {
        // 获取Transform配置并重新生成单个SQL
        getTransformConfigs()
          .then((newTransformConfigs) => {
            const newSQL = convertToDorisSQL(
              globalVars,
              [newQueryConfigs[request.index]],
              newTransformConfigs
            );

            // 更新存储的SQL列表
            if (dorisSQLs[request.index]) {
              dorisSQLs[request.index] = newSQL[0];

              // 更新存储
              if (
                isChromeAPIAvailable &&
                chrome.storage &&
                chrome.storage.local
              ) {
                chrome.storage.local.set({
                  conversionResults: {
                    sqlList: dorisSQLs,
                    queryCount: newQueryConfigs.length,
                    transformCount: newTransformConfigs.length,
                    lastConvertTime: new Date().toISOString(),
                  },
                });
              } else {
                console.warn("⚠️ chrome.storage.local 不可用，跳过存储操作");
              }
            }

            sendResponse({ success: true, newSQL: newSQL[0] });
          })
          .catch(() => {
            sendResponse({ success: false });
          });
      } else {
        sendResponse({ success: false });
      }
    } catch (error) {
      console.error("重新生成SQL错误:", error);
      sendResponse({ success: false });
    }
    return true; // 保持消息通道开启以支持异步响应
  } else if (request.action === "getDebugInfo") {
    // 收集详细的调试信息
    try {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        pageInfo: {
          url: window.location.href,
          title: document.title,
          isGrafanaPage: isGrafanaEditPanelPage(),
          hasConvertButton: !!document.getElementById("doris-convert-btn"),
        },
        globalVars: globalVars,
        queryConfigs: queryConfigs,
        transformConfigs: transformConfigs,
        dorisSQLs: dorisSQLs,
        domInfo: {
          queryEditorContainer: !!document.querySelector(
            '[data-testid="query-editor-rows"]'
          ),
          queryRows: document.querySelectorAll(".query-editor-row").length,
          allTextareas: document.querySelectorAll("textarea").length,
          possibleQueryInputs: document.querySelectorAll(
            'textarea[placeholder*="query"], textarea[aria-label*="Query"]'
          ).length,
        },
        debugHelperStatus: {
          hasWindowDebugHelper:
            typeof window.debugGrafanaConverter !== "undefined",
          hasGrafanaDebugger: typeof window.grafanaDebugger !== "undefined",
          hasDebugFunctions: typeof window.debug !== "undefined",
        },
        lastErrors: [],
      };

      // 尝试运行一些基本检查
      try {
        const testQueryConfigs = getQueryConfigs();
        debugInfo.testResults = {
          canGetQueryConfigs: true,
          foundQueries: testQueryConfigs.length,
          sampleQuery: testQueryConfigs.length > 0 ? testQueryConfigs[0] : null,
        };
      } catch (error) {
        debugInfo.testResults = {
          canGetQueryConfigs: false,
          error: error.message,
        };
        debugInfo.lastErrors.push(`获取查询配置失败: ${error.message}`);
      }

      // 尝试获取Transform配置
      try {
        getTransformConfigs()
          .then((transforms) => {
            debugInfo.testResults.transforms = transforms;
            sendResponse({ success: true, debugInfo });
          })
          .catch((error) => {
            debugInfo.lastErrors.push(
              `获取Transform配置失败: ${error.message}`
            );
            sendResponse({ success: true, debugInfo });
          });
      } catch (error) {
        debugInfo.lastErrors.push(
          `Transform配置同步获取失败: ${error.message}`
        );
        sendResponse({ success: true, debugInfo });
      }

      return true; // 保持异步响应
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message,
        basicInfo: {
          url: window.location.href,
          isGrafanaPage: window.location.href.includes("grafana"),
          hasElements: document.querySelectorAll("textarea").length,
        },
      });
    }
  }
});

// 监听页面变化（SPA应用）- 使用防抖优化性能
let lastUrl = location.href;
let urlCheckTimeout;

const observer = new MutationObserver(() => {
  // 防抖处理，避免频繁检查
  clearTimeout(urlCheckTimeout);
  urlCheckTimeout = setTimeout(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (isGrafanaEditPanelPage()) {
        showConvertButton();
      } else {
        const button = document.getElementById("doris-convert-btn");
        if (button) button.remove();
      }
    }
  }, 200); // 200ms 防抖延迟
});

// 监听URL变化，但限制监听范围以提升性能
observer.observe(document, {
  subtree: false, // 不监听所有子节点
  childList: true,
  attributes: false, // 不监听属性变化
});

// 页面卸载时清理资源
window.addEventListener("beforeunload", () => {
  if (urlCheckTimeout) {
    clearTimeout(urlCheckTimeout);
  }
  if (observer) {
    observer.disconnect();
  }
});

/**
 * Grafana查询配置提取器
 * 用于从Grafana查询编辑器的HTML结构中提取配置信息
 * 特点：通用、幂等、可复用
 */

/**
 * 提取查询配置的主函数
 * @param {Element|string} container - 包含查询编辑器的容器元素或HTML字符串
 * @returns {Array} 提取的配置数组
 */
function extractQueryConfigs(container) {
  // 如果传入的是字符串，先转换为DOM元素
  let containerElement;
  if (typeof container === "string") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(container, "text/html");
    containerElement =
      doc.querySelector('[data-testid="query-editor-rows"]') || doc.body;
  } else {
    containerElement = container;
  }

  // 查找所有查询编辑器行
  const queryRows = containerElement.querySelectorAll(
    '[data-testid="query-editor-row"][aria-label="Query editor row"]'
  );

  const configs = [];

  queryRows.forEach((row, index) => {
    try {
      const config = extractSingleQueryConfig(row, index);
      if (config) {
        configs.push(config);
      }
    } catch (error) {
      console.warn(`提取第${index + 1}个查询配置时出错:`, error);
    }
  });

  return configs;
}

/**
 * 提取单个查询配置
 * @param {Element} row - 查询编辑器行元素
 * @param {number} index - 查询索引
 * @returns {Object} 查询配置对象
 */
function extractSingleQueryConfig(row, index) {
  const config = {
    index: index,
    id: null,
    name: null,
    query: {
      type: null,
      content: null,
    },
    alias: null,
    queryType: null,
    metrics: [],
    groupBy: [],
    rawData: {},
  };

  // 提取查询ID
  config.id = extractQueryId(row);

  // 提取查询名称
  config.name = extractQueryName(row);

  // 提取查询内容
  const queryInfo = extractQueryContent(row);
  config.query = queryInfo;

  // 提取别名
  config.alias = extractAlias(row);

  // 提取查询类型
  config.queryType = extractQueryType(row);

  // 提取指标配置
  config.metrics = extractMetrics(row);

  // 提取分组配置
  config.groupBy = extractGroupBy(row);

  // 提取其他可能的配置（为了适应未来的扩展）
  config.rawData = extractAdditionalConfigs(row);

  return config;
}

/**
 * 提取查询ID
 */
function extractQueryId(row) {
  // 从draggable属性中提取ID
  const draggableId = row
    .querySelector("[data-rbd-draggable-id]")
    ?.getAttribute("data-rbd-draggable-id");

  // 从控制属性中提取ID
  const controlsId = row
    .querySelector("[aria-controls]")
    ?.getAttribute("aria-controls");

  // 从查询行ID中提取
  const queryRowElement = row.querySelector(".query-editor-row[id]");
  const rowId = queryRowElement?.id;

  return draggableId || controlsId || rowId || null;
}

/**
 * 提取查询名称
 */
function extractQueryName(row) {
  const nameButton = row.querySelector('[data-testid="query-name-div"] span');
  return nameButton?.textContent?.trim() || null;
}

/**
 * 提取查询内容
 */
function extractQueryContent(row) {
  const queryInfo = {
    type: null,
    content: null,
  };

  // 提取查询类型（如Lucene）
  const queryTypeButton = row.querySelector(".css-10tssb0 button label");
  queryInfo.type = queryTypeButton?.textContent?.trim() || null;

  // 提取查询内容
  const queryContentElement = row.querySelector('[data-slate-string="true"]');
  queryInfo.content = queryContentElement?.textContent?.trim() || null;

  return queryInfo;
}

/**
 * 提取别名
 */
function extractAlias(row) {
  const aliasInput = row.querySelector('input[placeholder*="Alias"]');
  return aliasInput?.value?.trim() || null;
}

/**
 * 提取查询类型
 */
function extractQueryType(row) {
  // 查找"Lucene Query Type"相关的配置
  const labels = row.querySelectorAll("span");
  let nextSibling = null;

  for (let label of labels) {
    if (label.textContent?.includes("Lucene Query Type")) {
      // 找到下一个按钮
      let current = label.parentElement;
      while (current && !nextSibling) {
        current = current.nextElementSibling;
        if (current) {
          nextSibling = current.querySelector("button label");
        }
      }
      break;
    }
  }

  return nextSibling?.textContent?.trim() || null;
}

/**
 * 提取指标配置
 */
function extractMetrics(row) {
  const metrics = [];

  // 查找指标相关的行
  const metricRows = row.querySelectorAll(".css-9doeo5-InlineFieldRow");

  metricRows.forEach((metricRow) => {
    const text = metricRow.textContent;
    if (text.includes("Metric (")) {
      const metric = {
        type: null,
        field: null,
        settings: {},
      };

      // 提取指标类型和字段
      const buttons = metricRow.querySelectorAll("button label");
      if (buttons.length >= 2) {
        metric.type = buttons[0]?.textContent?.trim();
        metric.field = buttons[1]?.textContent?.trim();
      }

      // 提取精度阈值等设置
      const settingButtons = metricRow.querySelectorAll(".gf-form-label");
      settingButtons.forEach((btn) => {
        const btnText = btn.textContent?.trim();
        if (btnText?.includes("Precision threshold:")) {
          metric.settings.precisionThreshold = btnText
            .replace("Precision threshold:", "")
            .trim();
        }
      });

      if (metric.type || metric.field) {
        metrics.push(metric);
      }
    }
  });

  return metrics;
}

/**
 * 提取分组配置
 */
function extractGroupBy(row) {
  const groupBy = [];

  // 查找分组相关的行
  const groupRows = row.querySelectorAll(".css-9doeo5-InlineFieldRow");

  groupRows.forEach((groupRow) => {
    const text = groupRow.textContent;
    if (text.includes("Group By")) {
      const group = {
        type: null,
        field: null,
        settings: {},
      };

      // 提取分组类型和字段
      const buttons = groupRow.querySelectorAll("button label");
      if (buttons.length >= 2) {
        group.type = buttons[0]?.textContent?.trim();
        group.field = buttons[1]?.textContent?.trim();
      }

      // 提取间隔等设置
      const settingButtons = groupRow.querySelectorAll(".gf-form-label");
      settingButtons.forEach((btn) => {
        const btnText = btn.textContent?.trim();
        if (btnText?.includes("Interval:")) {
          group.settings.interval = btnText.replace("Interval:", "").trim();
        }
      });

      if (group.type || group.field) {
        groupBy.push(group);
      }
    }
  });

  return groupBy;
}

/**
 * 提取其他额外配置
 */
function extractAdditionalConfigs(row) {
  const rawData = {};

  // 提取所有可能的按钮文本
  const allButtons = row.querySelectorAll("button");
  const buttonTexts = Array.from(allButtons)
    .map((btn) => btn.textContent?.trim())
    .filter(Boolean);

  // 提取所有标签文本
  const allLabels = row.querySelectorAll("label");
  const labelTexts = Array.from(allLabels)
    .map((label) => label.textContent?.trim())
    .filter(Boolean);

  // 提取所有输入框值
  const allInputs = row.querySelectorAll("input");
  const inputValues = Array.from(allInputs)
    .map((input) => ({
      placeholder: input.placeholder,
      value: input.value,
    }))
    .filter((item) => item.value);

  rawData.buttons = buttonTexts;
  rawData.labels = labelTexts;
  rawData.inputs = inputValues;

  return rawData;
}

/**
 * 格式化配置为可读格式
 * @param {Array} configs - 配置数组
 * @returns {string} 格式化的配置字符串
 */
function formatConfigs(configs) {
  return configs
    .map((config) => {
      let result = `${config.name || "Unnamed Query"}\n`;

      if (config.query.content) {
        result += `- Query / ${config.query.type || "Unknown"} / ${
          config.query.content
        }\n`;
      }

      if (config.alias) {
        result += `- Alias / ${config.alias}\n`;
      }

      if (config.queryType) {
        result += `- Lucene Query Type / ${config.queryType}\n`;
      }

      config.metrics.forEach((metric, index) => {
        result += `- Metric(${index + 1}) / ${metric.type}`;
        if (metric.field) result += ` / ${metric.field}`;
        if (metric.settings.precisionThreshold !== undefined) {
          result += ` / Precision threshold: ${metric.settings.precisionThreshold}`;
        }
        result += "\n";
      });

      config.groupBy.forEach((group) => {
        result += `- Group By / ${group.type}`;
        if (group.field) result += ` / ${group.field}`;
        if (group.settings.interval)
          result += ` / Interval: ${group.settings.interval}`;
        result += "\n";
      });

      return result;
    })
    .join("\n");
}

/**
 * 主要导出函数 - 从HTML提取并格式化配置
 * @param {Element|string} htmlContainer - HTML容器
 * @returns {Object} 包含原始配置和格式化字符串的对象
 */
function extractAndFormatGrafanaConfigs(htmlContainer) {
  const configs = extractQueryConfigs(htmlContainer);
  const formatted = formatConfigs(configs);

  return {
    raw: configs,
    formatted: formatted,
    count: configs.length,
  };
}

// 导出函数
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    extractQueryConfigs,
    extractAndFormatGrafanaConfigs,
    formatConfigs,
  };
} else {
  // 在浏览器环境中，将函数暴露到全局作用域
  window.extractQueryConfigs = extractQueryConfigs;
  window.extractAndFormatGrafanaConfigs = extractAndFormatGrafanaConfigs;
  window.formatConfigs = formatConfigs;
}

// 使用示例:
/*
// 方式1: 传入HTML字符串
const htmlString = '您的HTML字符串';
const result = extractAndFormatGrafanaConfigs(htmlString);
console.log(result.formatted);

// 方式2: 传入DOM元素
const container = document.querySelector('[data-testid="query-editor-rows"]');
const result = extractAndFormatGrafanaConfigs(container);
console.log(result.formatted);
*/

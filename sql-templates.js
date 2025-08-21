// SQL模板配置文件
// 包含所有Grafana图表类型对应的Doris SQL模板

// 基础模板定义
const BASE_TEMPLATES = {
  // 时间序列基础模板
  TIME_SERIES_BASE: `SELECT * FROM (SELECT
  $__timeGroup(timestamp, \${interval}, 0) as time,
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS "\${alias}"
FROM
  logs.\${DorisSources}
WHERE
  \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY
  time
UNION ALL SELECT 0,0) temp
ORDER BY
  time ASC;`,

  // 饼图基础模板
  PIE_CHART_BASE: `SELECT
  get_json_string(message, '$.\${groupByField}') AS "\${groupByField}",
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS deviceId
FROM logs.\${DorisSources}
WHERE \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY \${groupByField}
ORDER BY deviceId DESC
LIMIT \${limit};`,

  // Bar chart 原始数据模板
  BAR_CHART_RAW_DATA: `SELECT
  timestamp AS time,
  *
FROM
  logs.\${DorisSources}
WHERE
  \${queryCondition}
  AND $__timeFilter(timestamp)
ORDER BY
  time DESC
LIMIT
  \${limit};`,

  // Bar chart 聚合数据模板
  BAR_CHART_AGGREGATE: `SELECT * FROM (SELECT
  $__timeGroup(timestamp, \${interval}, 0) as time,
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS "\${alias}"
FROM
  logs.\${DorisSources}
WHERE
  \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY
  time
UNION ALL SELECT 0,0) temp
ORDER BY
  time ASC;`,

  // Stat 基础模板
  STAT_BASE: `SELECT * FROM (SELECT
  $__timeGroup(timestamp, \${interval}, 0) as time,
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS "\${alias}"
FROM
  logs.\${DorisSources}
WHERE
  \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY
  time
UNION ALL SELECT 0,0) temp
ORDER BY
  time ASC;`,

  // Stat 带 LIMIT 模板
  STAT_WITH_LIMIT: `SELECT * FROM (SELECT
  $__timeGroup(timestamp, \${interval}, 0) as time,
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS "\${alias}"
FROM
  logs.\${DorisSources}
WHERE
  \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY
  time
UNION ALL SELECT 0,0) temp
ORDER BY
  time ASC
LIMIT
  \${sizeLimit};`
};

// 策略模式：面板类型处理器
const PANEL_STRATEGIES = {
  // Time series 策略
  "Time series": {
    getTemplate: (replacements) => BASE_TEMPLATES.TIME_SERIES_BASE,
    processTemplate: (template, replacements) => template
  },

  // Stat 策略
  "Stat": {
    getTemplate: (replacements) => BASE_TEMPLATES.STAT_BASE,
    processTemplate: (template, replacements, queryConfigs, currentIndex) => {
      // 检查是否有 Size 配置
      let hasSizeLimit = false;
      let sizeValue = null;
      
      queryConfigs.forEach((queryConfig, index) => {
        if (queryConfig.size && queryConfig.size > 0) {
          hasSizeLimit = true;
          sizeValue = queryConfig.size;
        }
      });
      
      if (hasSizeLimit && sizeValue) {
        // 使用带 LIMIT 的模板
        return BASE_TEMPLATES.STAT_WITH_LIMIT
          .replace(/\${sizeLimit}/g, sizeValue);
      }
      
      return template;
    }
  },

  // Pie chart 策略
  "Pie chart": {
    getTemplate: (replacements) => BASE_TEMPLATES.PIE_CHART_BASE,
    processTemplate: (template, replacements) => template
  },

  // Echarts 策略
  "Echarts": {
    getTemplate: (replacements) => BASE_TEMPLATES.TIME_SERIES_BASE,
    processTemplate: (template, replacements) => template
  },

  // Bar chart 策略
  "Bar chart": {
    getTemplate: (replacements) => BASE_TEMPLATES.BAR_CHART_AGGREGATE, // 默认模板
    processTemplate: (template, replacements, queryConfigs, currentIndex) => {
      console.log('barchart 进入processTemplate')
      // 检查当前查询配置的 Metric 类型
      const currentConfig = queryConfigs[currentIndex];
      const isRawData1 = currentConfig?.rawData;

      const currentMetrics = currentConfig?.metrics || [];
      const isRawData2 = currentMetrics.some(metric => 
        metric.type === "raw Data" || metric.type === "rawData"
      );
      
      if (isRawData1 || isRawData2) {
        console.log('barchart 使用原始数据模板')
        // 使用原始数据模板
        return BASE_TEMPLATES.BAR_CHART_RAW_DATA;
      }
      
      console.log('barchart 使用了默认的聚合数据模板')
      // 使用聚合数据模板
      return BASE_TEMPLATES.BAR_CHART_AGGREGATE;
    }
  }
};

// 将配置导出到全局window对象，供其他脚本使用
window.SQL_TEMPLATES = BASE_TEMPLATES;
window.PANEL_STRATEGIES = PANEL_STRATEGIES;

// 已知字段列表
window.KNOWN_FIELDS = [
  "datetime_local",
  "timestamp",
  "application_name",
  "project_name",
  "logger",
  "thread",
  "level",
  "bj_timestamp",
];

// 默认配置值
window.DEFAULT_CONFIG = {
  interval: "1m",
  limit: 100,
  deviceIdField: "deviceId",
  groupByField: "category",
  alias: "Device Count",
};

// 模板变量说明
window.TEMPLATE_VARIABLES = {
  interval: "时间间隔，如：1m, 5m, 1h, 1d",
  deviceIdField: "设备ID字段名，用于去重统计",
  alias: "显示别名",
  DorisSources: "Doris数据源名称",
  queryCondition: "查询条件，由OpenSearch查询转换而来",
  groupByField: "分组字段名，用于饼图等分组图表",
  limit: "结果数量限制",
  panelType: "图表类型，决定使用哪个SQL模板",
};

// 兼容性：同时支持ES6模块导出（如果环境支持）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SQL_TEMPLATES: window.SQL_TEMPLATES,
    KNOWN_FIELDS: window.KNOWN_FIELDS,
    DEFAULT_CONFIG: window.DEFAULT_CONFIG,
    TEMPLATE_VARIABLES: window.TEMPLATE_VARIABLES,
  };
}

// 输出加载成功信息
console.log("✅ SQL模板配置加载成功");
console.log("📊 可用模板:", Object.keys(window.SQL_TEMPLATES));
console.log("🔍 已知字段:", window.KNOWN_FIELDS.length, "个");
console.log("⚙️ 默认配置:", window.DEFAULT_CONFIG);

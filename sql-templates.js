// SQL模板配置文件
// 包含所有Grafana图表类型对应的Doris SQL模板

// 将配置导出到全局window对象，供其他脚本使用
window.SQL_TEMPLATES = {
  "Time series": `SELECT * FROM (SELECT
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

  Stat: `SELECT * FROM (SELECT
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

  "Pie chart": `SELECT
  get_json_string(message, '$.\${groupByField}') AS "\${groupByField}",
  NDV(get_json_string(message, '$.\${deviceIdField}')) AS deviceId
FROM logs.\${DorisSources}
WHERE \${queryCondition}
  AND $__timeFilter(timestamp)
GROUP BY \${groupByField}
ORDER BY deviceId DESC
LIMIT \${limit};`,

  "Echarts": `SELECT * FROM (SELECT
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

  // 可以在这里添加更多图表类型的模板
  // "Bar chart": `...`,
  // "Table": `...`,
  // "Heatmap": `...`,
};

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

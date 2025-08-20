# SQL模板配置文件说明

## 📁 文件结构

```
grafana-doris-converter-v2/
├── sql-templates.js          # SQL模板配置文件（新增）
├── content.js               # 主逻辑文件（已更新）
├── manifest.json            # 扩展清单（已更新）
└── ...其他文件
```

## 🎯 配置文件内容

### `sql-templates.js`

这个文件包含了所有Grafana图表类型对应的Doris SQL模板配置：

#### 1. SQL模板库 (`SQL_TEMPLATES`)
- **Time series**: 时间序列图表模板
- **Stat**: 统计图表模板（支持时间分组，根据查询配置中的Size自动添加LIMIT）
- **Pie chart**: 饼图模板

#### 2. 已知字段列表 (`KNOWN_FIELDS`)
包含预定义的字段名，用于查询条件转换：
```javascript
[
  "datetime_local",
  "timestamp", 
  "application_name",
  "project_name",
  "logger",
  "thread",
  "level",
  "bj_timestamp"
]
```

#### 3. 默认配置值 (`DEFAULT_CONFIG`)
提供常用配置的默认值：
```javascript
{
  interval: "1m",
  limit: 100,
  deviceIdField: "deviceId",
  groupByField: "category",
  alias: "Device Count"
}
```

#### 4. 模板变量说明 (`TEMPLATE_VARIABLES`)
详细说明每个模板变量的用途和格式。

## 🔧 如何修改配置

### 添加新的图表类型

在 `sql-templates.js` 的 `SQL_TEMPLATES` 对象中添加新的键值对：

```javascript
export const SQL_TEMPLATES = {
  // ... 现有模板 ...
  
  "Bar chart": `SELECT
    get_json_string(message, '$.\${groupByField}') AS category,
    COUNT(*) AS count
  FROM logs.\${DorisSources}
  WHERE \${queryCondition}
    AND $__timeFilter(timestamp)
  GROUP BY category
  ORDER BY count DESC
  LIMIT \${limit};`,
  
  "Table": `SELECT
    timestamp AS time,
    get_json_string(message, '$.\${deviceIdField}') AS device_id,
    get_json_string(message, '$.\${groupByField}') AS category
  FROM logs.\${DorisSources}
  WHERE \${queryCondition}
    AND $__timeFilter(timestamp)
  ORDER BY time DESC
  LIMIT \${limit};`
};
```

### 修改现有模板

直接编辑 `sql-templates.js` 中对应的SQL语句即可。

### 添加新的已知字段

在 `KNOWN_FIELDS` 数组中添加新的字段名：

```javascript
export const KNOWN_FIELDS = [
  // ... 现有字段 ...
  "new_field_name",
  "another_field"
];
```

### 修改默认配置

更新 `DEFAULT_CONFIG` 对象中的值：

```javascript
export const DEFAULT_CONFIG = {
  interval: "5m",        // 改为5分钟间隔
  limit: 200,           // 改为200条记录
  deviceIdField: "userId", // 改为userId字段
  // ... 其他配置
};
```

## 📝 模板变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `${interval}` | 时间间隔 | "1m", "5m", "1h", "1d" |
| `${deviceIdField}` | 设备ID字段名 | "deviceId", "userId" |
| `${alias}` | 显示别名 | "Device Count", "User Count" |
| `${DorisSources}` | Doris数据源名称 | "logs", "events" |
| `${queryCondition}` | 查询条件 | 由OpenSearch查询转换而来 |
| `${groupByField}` | 分组字段名 | "category", "status" |
| `${limit}` | 结果数量限制 | 100, 500, 1000 |
| `${panelType}` | 图表类型 | "Time series", "Stat", "Pie chart" |

## 🔧 特殊处理说明

### Stat类型图表
- **时间分组**: 使用`$__timeGroup`函数按时间间隔分组
- **子查询结构**: 使用子查询和UNION ALL确保时间序列的连续性
- **LIMIT处理**: 自动检查查询配置中的Size配置，如果有则添加`LIMIT ${size}`子句
- **条件**: 只有当查询配置中存在`size`且大于0时才会添加LIMIT子句

## 🚀 使用方式

### 1. 自动加载
`sql-templates.js` 通过 `<script>` 标签自动加载到页面中，配置会自动挂载到 `window` 对象上。

### 2. 配置检查
`content.js` 会自动检查配置是否已加载：
- **配置已加载**：使用外部配置文件中的设置
- **配置未加载**：自动使用内联配置作为备选方案

### 3. 热更新
修改 `sql-templates.js` 后，刷新Chrome扩展页面即可生效。

### 4. 配置访问
在浏览器控制台中可以直接访问配置：
```javascript
// 查看所有可用模板
console.log(window.SQL_TEMPLATES);

// 查看已知字段
console.log(window.KNOWN_FIELDS);

// 查看默认配置
console.log(window.DEFAULT_CONFIG);
```

## ⚠️ 注意事项

1. **文件路径**: 确保 `sql-templates.js` 在正确的目录中
2. **语法检查**: 修改SQL模板后请检查语法正确性
3. **变量一致性**: 确保模板中使用的变量在代码中有对应的处理逻辑
4. **备份**: 修改前建议备份原始配置文件

## 🔍 调试

如果遇到问题，请检查浏览器控制台的日志输出：
- 成功导入：会显示配置信息
- 导入失败：会显示警告信息并使用备选配置
- 模板使用：会显示使用的模板和变量替换过程

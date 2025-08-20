# Grafana查询配置提取器

这是一个通用的、幂等的、可复用的Grafana查询编辑器HTML配置提取工具。

## 功能特点

- ✅ **通用性**: 适用于各种Grafana查询编辑器HTML结构
- ✅ **幂等性**: 多次运行结果一致，不依赖运行时状态
- ✅ **可复用**: 模块化设计，易于集成到其他项目
- ✅ **容错性**: 包含错误处理，单个查询解析失败不影响其他查询
- ✅ **可扩展**: 支持提取未知的额外配置项

## 支持的配置项

- 查询ID和名称
- 查询类型和内容（Lucene查询等）
- 别名（Alias）
- 查询类型（Query Type）
- 指标配置（Metrics）
  - 类型（如Unique Count）
  - 字段（如deviceId.keyword）
  - 设置（如Precision threshold）
- 分组配置（Group By）
  - 类型（如Date Histogram）
  - 字段（如@timestamp）
  - 设置（如Interval）

## 使用方法

### 1. 浏览器环境

```html
<!DOCTYPE html>
<html>
<head>
    <title>Grafana配置提取器测试</title>
</head>
<body>
    <script src="grafana-config-extractor.js"></script>
    <script>
        // 从DOM元素提取配置
        const container = document.querySelector('[data-testid="query-editor-rows"]');
        const result = extractAndFormatGrafanaConfigs(container);
        
        console.log('提取的配置:');
        console.log(result.formatted);
        
        // 或者从HTML字符串提取配置
        const htmlString = '您的HTML字符串';
        const result2 = extractAndFormatGrafanaConfigs(htmlString);
        console.log(result2.formatted);
    </script>
</body>
</html>
```

### 2. Node.js环境

```javascript
const { extractAndFormatGrafanaConfigs } = require('./grafana-config-extractor.js');

// 从HTML字符串提取配置
const htmlString = '您的HTML字符串';
const result = extractAndFormatGrafanaConfigs(htmlString);

console.log('提取的配置:');
console.log(result.formatted);
console.log('原始数据:', result.raw);
```

### 3. 在浏览器控制台中直接使用

```javascript
// 步骤1: 复制 grafana-config-extractor.js 的内容到控制台运行

// 步骤2: 获取当前页面的查询编辑器HTML
const container = document.querySelector('[data-testid="query-editor-rows"]');
const result = extractAndFormatGrafanaConfigs(container);

// 步骤3: 查看结果
console.log(result.formatted);
```

## API 文档

### extractAndFormatGrafanaConfigs(htmlContainer)

主要函数，提取并格式化配置。

**参数:**
- `htmlContainer` (Element|string): DOM元素或HTML字符串

**返回值:**
```javascript
{
    raw: Array,      // 原始配置数组
    formatted: string, // 格式化的配置字符串
    count: number    // 配置项数量
}
```

### extractQueryConfigs(container)

底层提取函数，返回原始配置数组。

**参数:**
- `container` (Element|string): DOM元素或HTML字符串

**返回值:**
- `Array`: 配置对象数组

### formatConfigs(configs)

格式化配置为可读字符串。

**参数:**
- `configs` (Array): 配置对象数组

**返回值:**
- `string`: 格式化的配置字符串

## 配置对象结构

每个查询配置对象的结构：

```javascript
{
    index: 0,                    // 查询索引
    id: "KYC_Success_64",        // 查询ID
    name: "KYC_Success",         // 查询名称
    query: {
        type: "Lucene",          // 查询类型
        content: "project_name:..." // 查询内容
    },
    alias: "KYC_Success",        // 别名
    queryType: "Metric",         // 查询类型
    metrics: [
        {
            type: "Unique Count",
            field: "deviceId.keyword",
            settings: {
                precisionThreshold: ""
            }
        }
    ],
    groupBy: [
        {
            type: "Date Histogram",
            field: "@timestamp",
            settings: {
                interval: "1h"
            }
        }
    ],
    rawData: {                   // 原始数据，用于扩展
        buttons: [...],
        labels: [...],
        inputs: [...]
    }
}
```

## 示例输出

根据您提供的HTML，提取器会生成如下格式的配置：

```
KYC_Success
- Query / Lucene / project_name:"fe-log-aaclub_hybrid_offline" AND msg:"kyc submit success business: $business"
- Alias / KYC_Success
- Lucene Query Type / Metric
- Metric(1) / Unique Count / deviceId.keyword / Precision threshold: 
- Group By / Date Histogram / @timestamp / Interval: 1h

KYC_Fail
- Query / Lucene / project_name:"fe-log-aaclub_hybrid_offline" AND msg:"kyc submit api error business: $business"
- Alias / KYC_Fail
- Lucene Query Type / Metric
- Metric(1) / Unique Count / deviceId.keyword / Precision threshold: 
- Group By / Date Histogram / @timestamp / Interval: 1h

KYC
- Query / Lucene / project_name:"fe-log-aaclub_hybrid_offline" AND msg:"KYC_SUBMIT total business: $business"
- Alias / KYC
- Lucene Query Type / Metric
- Metric(1) / Unique Count / deviceId.keyword / Precision threshold: 
- Group By / Date Histogram / @timestamp / Interval: 1h
```

## 错误处理

提取器包含完善的错误处理机制：

1. **输入验证**: 自动检测并处理字符串或DOM元素输入
2. **容错解析**: 单个查询解析失败不影响其他查询
3. **降级处理**: 缺少某些配置项时提供默认值
4. **错误日志**: 在控制台输出详细的错误信息

## 扩展性

提取器设计为可扩展的：

1. **新配置项**: 通过修改 `extractAdditionalConfigs` 函数添加新的配置项支持
2. **新格式**: 通过修改 `formatConfigs` 函数改变输出格式
3. **新选择器**: 通过修改各个提取函数的选择器适配HTML结构变化

## 注意事项

1. **幂等性保证**: 本提取器使用静态DOM选择器，不依赖动态生成的内容
2. **浏览器兼容性**: 使用现代JavaScript语法，建议在支持ES6+的环境中使用
3. **性能**: 对于大量查询的页面，提取器会逐个解析，性能优良
4. **定制化**: 可根据实际的HTML结构调整选择器策略

## 测试

运行测试文件验证功能：

```javascript
// 在浏览器中
// 1. 加载 grafana-config-extractor.js
// 2. 加载 test-extractor.js
// 3. 运行测试
testExtractor();
```

## 许可证

本项目为开源项目，可自由使用和修改。
// 修复版本的查询解析器测试
console.log("🧪 开始测试修复版本的查询解析器...\n");

// 修复版本的解析器函数
function parseLogicalQuery(queryStr) {
  console.log("🔍 开始解析复杂逻辑查询:", queryStr);
  
  // 递归解析嵌套括号结构
  function parseNestedBrackets(query) {
    console.log("🔍 解析嵌套括号:", query);
    
    // 如果没有括号，直接返回
    if (!query.includes('(') && !query.includes(')')) {
      return query;
    }
    
    let result = query;
    let hasChanges = true;
    let iteration = 0;
    const maxIterations = 20; // 增加最大迭代次数
    
    // 迭代处理，直到没有变化或达到最大迭代次数
    while (hasChanges && iteration < maxIterations) {
      iteration++;
      hasChanges = false;
      console.log(`🔍 第${iteration}次迭代:`, result);
      
      // 找到最内层的括号（没有嵌套的括号）
      const innerBracketPattern = /\(([^()]+)\)/g;
      let match;
      let processedInThisIteration = false;
      
      while ((match = innerBracketPattern.exec(result)) !== null && !processedInThisIteration) {
        const bracketContent = match[1];
        const bracketStart = match.index;
        const bracketEnd = match.index + match[0].length;
        
        console.log(`🔍 发现内层括号 [${bracketStart}-${bracketEnd}]:`, bracketContent);
        
        // 查找括号前的字段名
        const fieldInfo = findFieldBeforeBracket(result, bracketStart);
        console.log("🔍 括号前字段信息:", fieldInfo);
        
        if (fieldInfo) {
          // 有字段名，需要特殊处理
          const { field, startIndex, endIndex } = fieldInfo;
          
          // 解析括号内的逻辑关系
          const parsedBracket = parseBracketContent(bracketContent, field);
          console.log("🔍 解析后的括号内容:", parsedBracket);
          
          // 替换整个字段:()部分
          const beforeField = result.substring(0, startIndex);
          const afterBracket = result.substring(bracketEnd);
          const newResult = beforeField + parsedBracket + afterBracket;
          
          console.log("🔍 替换完成，新结果:", newResult);
          
          // 更新结果并标记有变化
          result = newResult;
          hasChanges = true;
          processedInThisIteration = true; // 标记本次迭代已处理
          break; // 退出内层循环，重新开始外层循环
        } else {
          // 没有字段名，检查括号内容是否包含逻辑运算符
          if (bracketContent.includes(' OR ') || bracketContent.includes(' AND ')) {
            // 包含逻辑运算符，需要进一步解析
            const parsedBracket = parseBracketContentWithoutField(bracketContent);
            const beforeBracket = result.substring(0, bracketStart);
            const afterBracket = result.substring(bracketEnd);
            const newResult = beforeBracket + parsedBracket + afterBracket;
            
            console.log("🔍 无字段名解析完成，新结果:", newResult);
            result = newResult;
            hasChanges = true;
            processedInThisIteration = true;
            break;
          } else {
            // 简单内容，保持原样
            console.log("🔍 简单括号内容，保持原样");
          }
        }
      }
      
      // 如果没有处理任何内容，退出循环
      if (!processedInThisIteration) {
        hasChanges = false;
      }
    }
    
    if (iteration >= maxIterations) {
      console.warn("⚠️ 达到最大迭代次数，可能存在循环依赖");
    }
    
    return result;
  }
  
  // 查找括号前的字段名
  function findFieldBeforeBracket(query, bracketIndex) {
    // 从括号位置向前查找最近的冒号
    for (let i = bracketIndex - 1; i >= 0; i--) {
      if (query[i] === ':') {
        // 找到冒号，向前查找字段名
        let fieldStart = i - 1;
        while (fieldStart >= 0 && query[fieldStart] !== ' ' && query[fieldStart] !== '(' && query[fieldStart] !== ')') {
          fieldStart--;
        }
        fieldStart++; // 调整到字段名开始位置
        
        const field = query.substring(fieldStart, i).trim();
        if (field && !field.includes('(') && !field.includes(')')) {
          return { field, startIndex: fieldStart, endIndex: i + 1 }; // +1 包含冒号
        }
      }
    }
    return null;
  }
  
  // 解析括号内容，生成Doris查询条件
  function parseBracketContent(content, field) {
    console.log(`🔍 解析括号内容，字段: ${field}, 内容: ${content}`);
    
    // 检查是否包含逻辑运算符
    if (content.includes(' OR ')) {
      return parseOrLogic(content, field);
    } else if (content.includes(' AND ')) {
      return parseAndLogic(content, field);
    } else {
      // 单个值
      return parseSingleValue(content, field);
    }
  }
  
  // 解析无字段名的括号内容
  function parseBracketContentWithoutField(content) {
    console.log(`🔍 解析无字段名括号内容: ${content}`);
    
    if (content.includes(' OR ')) {
      const orConditions = content.split(' OR ').map(c => c.trim()).filter(c => c);
      const conditions = orConditions.map(val => {
        const cleanVal = val.replace(/^["']|["']$/g, '');
        return `MATCH_PHRASE("${cleanVal}")`;
      });
      return `(${conditions.join(' OR ')})`;
    } else if (content.includes(' AND ')) {
      const andConditions = content.split(' AND ').map(c => c.trim()).filter(c => c);
      const conditions = andConditions.map(val => {
        const cleanVal = val.replace(/^["']|["']$/g, '');
        return `MATCH_PHRASE("${cleanVal}")`;
      });
      return `(${conditions.join(' AND ')})`;
    } else {
      const cleanVal = content.replace(/^["']|["']$/g, '');
      return `MATCH_PHRASE("${cleanVal}")`;
    }
  }
  
  // 解析OR逻辑
  function parseOrLogic(content, field) {
    const orConditions = content.split(' OR ').map(c => c.trim()).filter(c => c);
    console.log("🔍 OR条件:", orConditions);
    
    // 检查是否可以使用REGEXP
    const canUseRegexp = orConditions.every(val => {
      const cleanVal = val.replace(/^["']|["']$/g, '');
      return !cleanVal.includes('*') && !cleanVal.includes('?') && !cleanVal.includes('+') && 
             !cleanVal.includes('[') && !cleanVal.includes(']') && !cleanVal.includes('|') &&
             !cleanVal.includes('"') && !cleanVal.includes("'");
    });
    
    if (canUseRegexp) {
      // 使用REGEXP，用|分隔多个值
      const values = orConditions.map(val => val.replace(/^["']|["']$/g, ''));
      const regexpValue = values.join('|');
      return `${field} REGEXP "${regexpValue}"`;
    } else {
      // 使用OR组合
      const conditions = orConditions.map(val => {
        const cleanVal = val.replace(/^["']|["']$/g, '');
        return `${field} MATCH_PHRASE("${cleanVal}")`;
      });
      return `(${conditions.join(' OR ')})`;
    }
  }
  
  // 解析AND逻辑
  function parseAndLogic(content, field) {
    const andConditions = content.split(' AND ').map(c => c.trim()).filter(c => c);
    console.log("🔍 AND条件:", andConditions);
    
    const conditions = andConditions.map(val => {
      const cleanVal = val.replace(/^["']|["']$/g, '');
      return `${field} MATCH_PHRASE("${cleanVal}")`;
    });
    return `(${conditions.join(' AND ')})`;
  }
  
  // 解析单个值
  function parseSingleValue(content, field) {
    const cleanVal = content.replace(/^["']|["']$/g, '');
    return `${field} MATCH_PHRASE("${cleanVal}")`;
  }
  
  // 开始解析
  const parsedQuery = parseNestedBrackets(queryStr);
  console.log("🔍 嵌套括号解析完成:", parsedQuery);
  
  return parsedQuery;
}

// 测试用例
const testCases = [
  // 简单情况
  'msg:("error")',
  'msg:("value1" OR "value2")',
  'msg:("value1" AND "value2")',
  
  // 复杂嵌套情况
  'msg:(("creditOrderStatus is error,creditOrderStatus") OR (("kyc handleSubmit occur error") AND ("isFinalSubmit:true")))',
  
  // 多层嵌套
  'field:((("level1" OR "level1_alt") AND ("level2" OR "level2_alt")) OR "simple")',
  
  // 无字段名的情况
  '("value1" OR "value2")',
  '(("cond1" AND "cond2") OR "cond3")',
  
  // 混合情况
  'msg:("error") AND ("warning" OR "critical")',
  'status:("active" OR "pending") AND level:("high" OR "medium")'
];

console.log("📋 测试用例列表:");
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase}`);
});

console.log("\n" + "=".repeat(80) + "\n");

// 执行测试
testCases.forEach((testCase, index) => {
  console.log(`🧪 测试用例 ${index + 1}:`);
  console.log(`输入: ${testCase}`);
  console.log(`输出: ${parseLogicalQuery(testCase)}`);
  console.log("-".repeat(60));
});

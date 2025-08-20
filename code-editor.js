// 简单但功能完整的代码编辑器组件
class CodeEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.language = options.language || "sql";
    this.value = options.value || "";
    this.onChange = options.onChange || (() => {});

    this.init();
  }

  init() {
    // 创建编辑器结构
    this.container.innerHTML = `
      <div class="code-editor">
        <div class="editor-toolbar">
          <select class="language-selector">
            <option value="sql">SQL</option>
            <option value="javascript">JavaScript</option>
            <option value="json">JSON</option>
          </select>
          <button class="format-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h7"></path>
            </svg>
            格式化
          </button>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers"></div>
          <textarea class="editor-textarea" spellcheck="false"></textarea>
          <pre class="editor-highlight"><code></code></pre>
        </div>
      </div>
    `;

    // 获取元素引用
    this.textarea = this.container.querySelector(".editor-textarea");
    this.highlight = this.container.querySelector(".editor-highlight code");
    this.lineNumbers = this.container.querySelector(".line-numbers");
    this.languageSelector = this.container.querySelector(".language-selector");
    this.formatBtn = this.container.querySelector(".format-btn");

    // 设置初始值
    this.textarea.value = this.value;
    this.languageSelector.value = this.language;

    // 绑定事件
    this.bindEvents();

    // 初始渲染
    this.updateHighlight();
    this.updateLineNumbers();
  }

  bindEvents() {
    // 输入事件
    this.textarea.addEventListener("input", () => {
      this.value = this.textarea.value;
      this.updateHighlight();
      this.updateLineNumbers();
      this.onChange(this.value);
    });

    // 滚动同步
    this.textarea.addEventListener("scroll", () => {
      this.highlight.parentElement.scrollTop = this.textarea.scrollTop;
      this.highlight.parentElement.scrollLeft = this.textarea.scrollLeft;
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    });

    // Tab键支持
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        this.textarea.value =
          value.substring(0, start) + "  " + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.updateHighlight();
      }
    });

    // 语言切换
    this.languageSelector.addEventListener("change", () => {
      this.language = this.languageSelector.value;
      this.updateHighlight();
    });

    // 格式化按钮
    this.formatBtn.addEventListener("click", () => {
      this.format();
    });
  }

  updateHighlight() {
    const code = this.textarea.value;
    const highlighted = this.highlightCode(code, this.language);
    this.highlight.innerHTML = highlighted + "\n";
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split("\n").length;
    const lineNumbersHTML = Array.from(
      { length: lines },
      (_, i) => `<span>${i + 1}</span>`
    ).join("");
    this.lineNumbers.innerHTML = lineNumbersHTML;
  }

  highlightCode(code, language) {
    // 简单的语法高亮实现
    let highlighted = this.escapeHtml(code);

    if (language === "sql") {
      // SQL关键字
      const sqlKeywords =
        /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|COLUMN|PRIMARY KEY|FOREIGN KEY|REFERENCES|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|IF|THEN|ELSE|END|CASE|WHEN|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|TRUE|FALSE)\b/gi;
      highlighted = highlighted.replace(
        sqlKeywords,
        '<span class="keyword">$1</span>'
      );

      // 字符串
      highlighted = highlighted.replace(
        /'([^']*)'/g,
        "<span class=\"string\">'$1'</span>"
      );

      // 数字
      highlighted = highlighted.replace(
        /\b(\d+)\b/g,
        '<span class="number">$1</span>'
      );

      // 注释
      highlighted = highlighted.replace(
        /--(.*)$/gm,
        '<span class="comment">--$1</span>'
      );
    } else if (language === "javascript") {
      // JavaScript关键字
      const jsKeywords =
        /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|async|await|yield|typeof|instanceof|in|of|delete|void|this|super|true|false|null|undefined)\b/g;
      highlighted = highlighted.replace(
        jsKeywords,
        '<span class="keyword">$1</span>'
      );

      // 字符串
      highlighted = highlighted.replace(
        /"([^"]*)"/g,
        '<span class="string">"$1"</span>'
      );
      highlighted = highlighted.replace(
        /'([^']*)'/g,
        "<span class=\"string\">'$1'</span>"
      );
      highlighted = highlighted.replace(
        /`([^`]*)`/g,
        '<span class="string">`$1`</span>'
      );

      // 数字
      highlighted = highlighted.replace(
        /\b(\d+)\b/g,
        '<span class="number">$1</span>'
      );

      // 注释
      highlighted = highlighted.replace(
        /\/\/(.*)$/gm,
        '<span class="comment">//$1</span>'
      );
      highlighted = highlighted.replace(
        /\/\*[\s\S]*?\*\//g,
        (match) => `<span class="comment">${match}</span>`
      );
    } else if (language === "json") {
      // 属性名
      highlighted = highlighted.replace(
        /"([^"]+)":/g,
        '<span class="property">"$1"</span>:'
      );

      // 字符串值
      highlighted = highlighted.replace(
        /:\s*"([^"]*)"/g,
        ': <span class="string">"$1"</span>'
      );

      // 数字
      highlighted = highlighted.replace(
        /:\s*(\d+)/g,
        ': <span class="number">$1</span>'
      );

      // 布尔值和null
      highlighted = highlighted.replace(
        /:\s*(true|false|null)/g,
        ': <span class="keyword">$1</span>'
      );
    }

    return highlighted;
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  format(silent = false) {
    try {
      if (this.language === "sql") {
        this.textarea.value = this.formatSQL(this.textarea.value);
      } else if (this.language === "json") {
        this.textarea.value = JSON.stringify(
          JSON.parse(this.textarea.value),
          null,
          2
        );
      } else if (this.language === "javascript") {
        // 简单的JavaScript格式化
        this.textarea.value = this.formatJavaScript(this.textarea.value);
      }

      this.value = this.textarea.value;
      this.updateHighlight();
      this.updateLineNumbers();
      this.onChange(this.value);

      // 显示成功提示（除非是静默模式）
      if (!silent) {
        this.showToast("格式化成功", "success");
      }
    } catch (error) {
      if (!silent) {
        this.showToast("格式化失败: " + error.message, "error");
      }
    }
  }

  formatSQL(sql) {
    // 预处理：移除多余的空白字符，但保留换行符
    sql = sql.replace(/[ \t]+/g, " ").trim();

    // 定义主要SQL关键字（按优先级排序）
    const mainKeywords = [
      "SELECT",
      "FROM",
      "WHERE",
      "JOIN",
      "LEFT JOIN",
      "RIGHT JOIN",
      "INNER JOIN",
      "FULL JOIN",
      "GROUP BY",
      "ORDER BY",
      "HAVING",
      "LIMIT",
      "OFFSET",
      "UNION",
      "UNION ALL",
    ];

    // 定义逻辑操作符（只在WHERE子句中处理）
    const logicalOperators = ["AND", "OR"];

    // 第一步：将SQL按主要关键字分割成语句块
    let formatted = sql;

    // 为主要关键字添加换行（保持语句完整性）
    mainKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\s+${keyword}\\s+`, "gi");
      formatted = formatted.replace(regex, `\n${keyword}\n`);
    });

    // 第二步：为逻辑操作符添加换行和缩进（只在WHERE子句中）
    logicalOperators.forEach((operator) => {
      const regex = new RegExp(`\\s+${operator}\\s+`, "gi");
      formatted = formatted.replace(regex, `\n  ${operator} `);
    });

    // 第三步：处理逗号分隔的字段列表（保持在同一行）
    const lines = formatted.split("\n");
    const processedLines = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // 如果是SELECT行，处理字段列表的换行
      if (line.toUpperCase().startsWith("SELECT")) {
        // 检查是否包含复杂的函数调用
        const hasComplexFunctions = /\([^)]*\([^)]*\)[^)]*\)/.test(line);

        if (hasComplexFunctions || line.length > 100) {
          // 复杂SELECT语句，分行处理
          const selectMatch = line.match(/^SELECT\s+(.+)$/i);
          if (selectMatch) {
            const fieldsPart = selectMatch[1];
            // 按逗号分割，但保持函数调用的完整性
            const fields = [];
            let currentField = "";
            let parenCount = 0;

            for (let char of fieldsPart) {
              if (char === "(") parenCount++;
              if (char === ")") parenCount--;

              if (char === "," && parenCount === 0) {
                fields.push(currentField.trim());
                currentField = "";
              } else {
                currentField += char;
              }
            }
            if (currentField.trim()) {
              fields.push(currentField.trim());
            }

            processedLines.push("SELECT");
            fields.forEach((field, index) => {
              const prefix = index === fields.length - 1 ? "" : ",";
              processedLines.push(`  ${field}${prefix}`);
            });
          } else {
            processedLines.push(line);
          }
        } else {
          // 简单SELECT语句，分行处理
          const selectMatch = line.match(/^SELECT\s+(.+)$/i);
          if (selectMatch) {
            const fieldsPart = selectMatch[1];
            const fields = fieldsPart.split(",").map((f) => f.trim());

            processedLines.push("SELECT");
            fields.forEach((field, index) => {
              const prefix = index === fields.length - 1 ? "" : ",";
              processedLines.push(`  ${field}${prefix}`);
            });
          } else {
            processedLines.push(line);
          }
        }
      } else if (line.toUpperCase().startsWith("FROM")) {
        // FROM语句处理
        const fromMatch = line.match(/^FROM\s+(.+)$/i);
        if (fromMatch) {
          processedLines.push("FROM");
          processedLines.push(`  ${fromMatch[1]}`);
        } else {
          processedLines.push(line);
        }
      } else if (line.toUpperCase().startsWith("WHERE")) {
        // WHERE语句处理
        const whereMatch = line.match(/^WHERE\s+(.+)$/i);
        if (whereMatch) {
          processedLines.push("WHERE");
          processedLines.push(`  ${whereMatch[1]}`);
        } else {
          processedLines.push(line);
        }
      } else if (line.toUpperCase().startsWith("GROUP BY")) {
        // GROUP BY语句处理
        const groupMatch = line.match(/^GROUP BY\s+(.+)$/i);
        if (groupMatch) {
          processedLines.push("GROUP BY");
          processedLines.push(`  ${groupMatch[1]}`);
        } else {
          processedLines.push(line);
        }
      } else if (line.toUpperCase().startsWith("ORDER BY")) {
        // ORDER BY语句处理
        const orderMatch = line.match(/^ORDER BY\s+(.+)$/i);
        if (orderMatch) {
          processedLines.push("ORDER BY");
          processedLines.push(`  ${orderMatch[1]}`);
        } else {
          processedLines.push(line);
        }
      } else if (line.toUpperCase().startsWith("LIMIT")) {
        // LIMIT语句处理
        const limitMatch = line.match(/^LIMIT\s+(.+)$/i);
        if (limitMatch) {
          processedLines.push("LIMIT");
          processedLines.push(`  ${limitMatch[1]}`);
        } else {
          processedLines.push(line);
        }
      } else if (line.toUpperCase().includes("JOIN")) {
        // JOIN语句处理
        const joinMatch = line.match(/^(.*?JOIN.*?)\s+(.+)$/i);
        if (joinMatch) {
          processedLines.push(joinMatch[1]);
          processedLines.push(`  ${joinMatch[2]}`);
        } else {
          processedLines.push(line);
        }
      } else {
        // 其他行，保持原样
        processedLines.push(line);
      }
    }

    // 第四步：处理缩进
    let indentLevel = 0;
    const finalLines = [];

    for (let line of processedLines) {
      line = line.trim();
      if (!line) continue;

      // 减少缩进
      if (line.startsWith(")")) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // 添加缩进
      const indentedLine = "  ".repeat(indentLevel) + line;
      finalLines.push(indentedLine);

      // 增加缩进
      if (line.endsWith("(")) {
        indentLevel++;
      }

      // 特殊处理：子查询后的缩进
      if (line.toUpperCase().includes("SELECT") && line.includes("(")) {
        indentLevel++;
      }

      // 特殊处理：JOIN语句的缩进
      if (line.toUpperCase().includes("JOIN")) {
        indentLevel++;
      }
    }

    // 第五步：清理和优化
    const cleanedLines = [];
    for (let line of finalLines) {
      line = line.trim();
      if (!line) continue;

      // 合并过短的函数调用行
      if (line.includes("(") && line.includes(")") && line.length < 80) {
        line = line.replace(/\s*,\s*/g, ", ");
      }

      cleanedLines.push(line);
    }

    return cleanedLines.join("\n");
  }

  formatJavaScript(js) {
    // 简单的JavaScript格式化
    let formatted = js;
    let indent = 0;
    const lines = formatted.split("\n");
    const formattedLines = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // 减少缩进
      if (
        trimmed.startsWith("}") ||
        trimmed.startsWith("]") ||
        trimmed.startsWith(")")
      ) {
        indent = Math.max(0, indent - 1);
      }

      // 添加缩进
      formattedLines.push("  ".repeat(indent) + trimmed);

      // 增加缩进
      if (
        trimmed.endsWith("{") ||
        trimmed.endsWith("[") ||
        trimmed.endsWith("(")
      ) {
        indent++;
      }
    }

    return formattedLines.join("\n");
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `editor-toast ${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2000);
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
    this.textarea.value = value;
    this.updateHighlight();
    this.updateLineNumbers();
  }

  setLanguage(language) {
    this.language = language;
    this.languageSelector.value = language;
    this.updateHighlight();
  }
}

// 导出到全局
window.CodeEditor = CodeEditor;

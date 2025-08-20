// 内嵌popup弹窗管理
class InlinePopup {
  constructor() {
    this.popup = null;
    this.button = null;
    this.isResizing = false;
    this.currentResizer = null;
  }

  // 初始化
  init() {
    this.createButton();
    this.createPopup();
    // 移除positionPopup调用，让popup在showPopup时自然居中显示
  }

  // 创建按钮
  createButton() {
    this.button = document.createElement("div");
    this.button.id = "doris-convert-btn";
    this.button.innerHTML = `
      <div class="button-content">
        <div class="left-btn" id="convert-left-btn">
          <span>转换</span>
        </div>
        <div class="right-btn" id="convert-right-btn" style="display: none;">
          <span>查看结果</span>
        </div>
      </div>
    `;

    // 从localStorage读取保存的位置
    const savedPosition = localStorage.getItem("doris-button-position");
    let bottom = 20,
      right = 20;
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        bottom = pos.bottom || 20;
        right = pos.right || 20;
      } catch (e) {
        console.warn("解析保存的按钮位置失败，使用默认位置");
        bottom = 20;
        right = 20;
      }
    }

    // 确保按钮不会超出屏幕边界
    bottom = Math.max(20, Math.min(window.innerHeight - 80, bottom));
    right = Math.max(20, Math.min(window.innerWidth - 220, right));

    this.button.style.cssText = `
      position: fixed;
      bottom: ${bottom}px;
      right: ${right}px;
      width: 220px;
      height: 56px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 30px;
      cursor: move;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      transition: box-shadow 0.3s ease;
      user-select: none;
    `;

    // 添加按钮样式
    const style = document.createElement("style");
    style.textContent = `
      #doris-convert-btn .button-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        padding: 8px;
        box-sizing: border-box;
      }
      
      #doris-convert-btn .left-btn,
      #doris-convert-btn .right-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        padding: 6px 12px;
        flex: auto;
        border-radius: 20px;
        width: 45%;
        height: 100%;
        transition: background-color 0.2s ease;
        white-space: nowrap;
        justify-content: center;
      }

      #doris-convert-btn .left-btn:hover,
      #doris-convert-btn .right-btn:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      #doris-convert-btn .right-btn {
        background-color: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);

    // 添加按钮点击事件监听器
    this.button.addEventListener("click", (e) => {
      // 检查事件是否被阻止
      if (e.defaultPrevented) {
        console.log("🚫 事件被阻止，忽略点击");
        return;
      }
      
      // 检查是否正在拖拽或处于待定状态
      if (this.button.dataset.dragging === 'true' || this.button.dataset.dragging === 'pending') {
        console.log("🚫 拖拽中或待定状态，忽略点击事件");
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // 检查是否点击在按钮的子元素上
      const target = e.target;
      if (target.closest('.left-btn')) {
        // 转换按钮被点击
        console.log("🔄 转换按钮被点击");
        document.dispatchEvent(new CustomEvent("dorisConvert"));
        return;
      }
      
      if (target.closest('.right-btn')) {
        // 查看结果按钮被点击
        console.log("👁️ 查看结果按钮被点击");
        this.showPopup();
        return;
      }
      
      // 如果点击在按钮的其他区域，不执行任何操作
      console.log("📍 点击在按钮非功能区域");
    });

    // 左侧转换按钮点击事件
    const leftBtn = this.button.querySelector("#convert-left-btn");
    leftBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // 触发自定义事件，让content.js处理转换逻辑
      document.dispatchEvent(
        new CustomEvent("dorisConvert", {
          detail: { action: "convert" },
        })
      );
    });

    // 右侧查看结果按钮点击事件
    const rightBtn = this.button.querySelector("#convert-right-btn");
    rightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showPopup();
    });

    this.button.addEventListener("mouseenter", () => {
      this.button.style.boxShadow = "0 6px 25px rgba(102, 126, 234, 0.6)";
    });

    this.button.addEventListener("mouseleave", () => {
      this.button.style.boxShadow = "0 4px 20px rgba(102, 126, 234, 0.4)";
    });

    // 添加拖拽提示
    const dragHint = document.createElement("div");
    dragHint.style.cssText = `
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 10000;
    `;
    dragHint.textContent = "拖拽移动";
    this.button.appendChild(dragHint);

    // 添加悬停效果显示拖拽提示
    this.button.addEventListener("mouseenter", () => {
      dragHint.style.opacity = "1";
    });

    this.button.addEventListener("mouseleave", () => {
      dragHint.style.opacity = "0";
    });

    document.body.appendChild(this.button);
    this.makeDraggable(this.button);
  }

  // 使按钮可拖动
  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startRight, startBottom;
    let dragTimeout = null;
    const dragThreshold = 8; // 降低拖拽阈值，让拖拽更容易启动

    const handleMouseDown = (e) => {
      // 记录鼠标按下位置，不限制拖拽区域
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      
      // 设置一个短暂的延迟，用于区分拖拽和点击
      dragTimeout = setTimeout(() => {
        if (!isDragging) {
          element.dataset.dragging = 'pending'; // 标记为待定状态
        }
      }, 50);
      
      // 阻止事件冒泡，避免触发其他事件处理器
      e.stopPropagation();
    };

    const handleMouseMove = (e) => {
      if (!startX && !startY) return;

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      // 清除延迟定时器
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }

      // 只有当移动距离超过阈值时才开始拖拽
      if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
        isDragging = true;
        element.dataset.dragging = 'true'; // 设置拖拽状态标记
        console.log("🎯 开始拖拽，距离:", Math.max(deltaX, deltaY));
        element.style.cursor = "grabbing";
        element.style.transition = "none";
        element.style.userSelect = "none";
        
        // 添加拖拽时的视觉反馈
        element.style.boxShadow = "0 8px 30px rgba(102, 126, 234, 0.6)";
        element.style.transform = "scale(1.02)";
        
        // 阻止后续事件冒泡
        e.preventDefault();
        e.stopPropagation();
        
        // 临时禁用按钮的点击功能
        element.style.pointerEvents = 'none';
        
        // 延迟恢复点击功能，确保拖拽完全结束
        setTimeout(() => {
          if (element.dataset.dragging === 'false') {
            element.style.pointerEvents = 'auto';
          }
        }, 150);
      }

      if (isDragging) {
        // 拖拽过程中阻止所有事件
        e.preventDefault();
        e.stopPropagation();
        
        const deltaRight = startX - e.clientX;
        const deltaBottom = startY - e.clientY;

        let newRight = startRight + deltaRight;
        let newBottom = startBottom + deltaBottom;

        // 边界限制
        newRight = Math.max(20, Math.min(window.innerWidth - 20, newRight));
        newBottom = Math.max(20, Math.min(window.innerHeight - 20, newBottom));

        // 自动吸附到屏幕边缘
        const snapThreshold = 50;
        if (newRight < snapThreshold) {
          newRight = 20;
        } else if (newRight > window.innerWidth - snapThreshold) {
          newRight = window.innerWidth - 20;
        }

        // 更新按钮位置
        element.style.right = newRight + "px";
        element.style.bottom = newBottom + "px";

        // 如果popup打开，即时更新其位置
        if (this.popup && this.popup.style.display !== "none") {
          this.positionPopup();
        }
      }
    };

    const handleMouseUp = (e) => {
      // 清除延迟定时器
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }
      
      if (isDragging) {
        isDragging = false;
        element.dataset.dragging = 'false'; // 清除拖拽状态标记
        console.log("✅ 拖拽结束");
        element.style.cursor = "move";
        element.style.transition = "box-shadow 0.3s ease";
        element.style.userSelect = "auto";
        
        // 恢复拖拽时的视觉反馈
        element.style.boxShadow = "0 4px 20px rgba(102, 126, 234, 0.4)";
        element.style.transform = "none";
        
        // 立即恢复点击功能
        element.style.pointerEvents = 'auto';

        // 保存位置到localStorage
        const rect = element.getBoundingClientRect();
        const position = {
          bottom: window.innerHeight - rect.bottom,
          right: window.innerWidth - rect.right,
        };
        localStorage.setItem("doris-button-position", JSON.stringify(position));
        
        // 阻止事件冒泡，避免触发点击事件
        e.preventDefault();
        e.stopPropagation();
        
        // 延迟重置拖拽状态，确保点击事件不会误触发
        setTimeout(() => {
          element.dataset.dragging = 'false';
        }, 100);
      } else {
        // 如果没有拖拽，清除待定状态
        element.dataset.dragging = 'false';
      }

      // 重置拖拽状态
      startX = null;
      startY = null;
    };

    element.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // 使popup可拖动
  makePopupDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const handleMouseDown = (e) => {
      // 如果点击的是关闭按钮，不启动拖动
      if (e.target.closest(".close-popup-btn")) {
        return;
      }

      // 检查是否点击在顶部拖拽区域（顶部50px高度）
      const rect = element.getBoundingClientRect();
      const clickY = e.clientY - rect.top;

      // 只有点击在顶部50px区域内才允许拖拽
      if (clickY > 50) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      initialLeft = rect.left;
      initialTop = rect.top;

      element.style.cursor = "grabbing";
      element.style.transition = "none";
      element.style.userSelect = "none";

      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // 计算新位置，拖拽中心定位在鼠标处
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // 获取popup的尺寸
      const popupWidth = element.offsetWidth;
      const popupHeight = element.offsetHeight;

      // 边界限制：确保popup始终有足够部分可见
      // 左侧边界：popup不能完全移出屏幕左侧，至少保留200px可见
      const minLeft = -popupWidth + 200;

      // 右侧边界：popup不能完全移出屏幕右侧，至少保留200px可见
      const maxLeft = window.innerWidth - 200;

      // 顶部边界：popup不能完全移出屏幕顶部，至少保留100px可见
      const minTop = -popupHeight + 100;

      // 底部边界：popup不能完全移出屏幕底部，至少保留100px可见
      const maxTop = window.innerHeight - 100;

      // 应用边界限制
      newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      newTop = Math.max(minTop, Math.min(maxTop, newTop));

      // 更新popup位置
      element.style.left = newLeft + "px";
      element.style.top = newTop + "px";
      element.style.right = "auto";
      element.style.bottom = "auto";
      element.style.transform = "none";
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      element.style.cursor = "default";
      element.style.transition = "box-shadow 0.3s ease";
      element.style.userSelect = "auto";

      // 保存位置到localStorage
      const rect = element.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top,
      };
      localStorage.setItem("doris-popup-position", JSON.stringify(position));
    };

    element.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // 切换popup显示/隐藏
  togglePopup() {
    if (this.popup.style.display === "none") {
      this.showPopup();
    } else {
      this.hidePopup();
    }
  }

  // 创建popup
  createPopup() {
    // 动态注入CSS样式，确保样式生效
    if (!document.getElementById("doris-popup-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "doris-popup-styles";
      styleElement.textContent = `
        #doris-popup .close-popup-btn {
          position: absolute !important;
          top: 8px !important;
          right: 12px !important;
          width: 34px !important;
          height: 34px !important;
          background: #ff4757 !important;
          border: none !important;
          border-radius: 50% !important;
          color: white !important;
          font-size: 18px !important;
          font-weight: bold !important;
          cursor: pointer !important;
          z-index: 10002 !important;
          pointer-events: auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3) !important;
          transition: all 0.2s ease !important;
          line-height: 1 !important;
        }
        
        #doris-popup .popup-header {
          position: relative;
          height: 50px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 1px solid #e2e8f0;
          border-radius: 12px 12px 0 0;
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }
      `;
      document.head.appendChild(styleElement);
    }

    this.popup = document.createElement("div");
    this.popup.id = "doris-popup";
    this.popup.style.cssText = `
      position: fixed;
      width: 760px;
      height: 85vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 9998;
      display: none;
      overflow: hidden;
      cursor: default;
      left: 50%;
      top: 50%;
      right: auto;
      bottom: auto;
      transform: translate(-50%, -50%);
    `;

    // 创建顶部拖拽区域
    const header = document.createElement("div");
    header.className = "popup-header";

    // 添加拖拽指示器
    const dragIndicator = document.createElement("div");
    dragIndicator.textContent = "⋮⋮";
    dragIndicator.style.cssText = `
      color: #94a3b8;
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      pointer-events: none;
    `;

    // 添加悬停效果
    header.addEventListener("mouseenter", () => {
      header.style.background =
        "linear-gradient(135deg, #f1f5f9 0%, #dbeafe 100%)";
      dragIndicator.style.color = "#64748b";
    });

    header.addEventListener("mouseleave", () => {
      header.style.background =
        "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";
      dragIndicator.style.color = "#94a3b8";
    });

    header.appendChild(dragIndicator);

    // 创建关闭按钮
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-popup-btn";
    closeBtn.innerHTML = "×";

    // 添加悬停和点击效果
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#ff3742";
      closeBtn.style.transform = "scale(1.1)";
      closeBtn.style.boxShadow = "0 4px 12px rgba(255, 71, 87, 0.4)";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "#ff4757";
      closeBtn.style.transform = "scale(1)";
      closeBtn.style.boxShadow = "0 2px 8px rgba(255, 71, 87, 0.3)";
    });

    closeBtn.addEventListener("mousedown", () => {
      closeBtn.style.transform = "scale(0.95)";
    });

    closeBtn.addEventListener("mouseup", () => {
      closeBtn.style.transform = "scale(1.1)";
    });

    closeBtn.addEventListener("click", () => this.hidePopup());

    // 创建iframe容器
    const iframeContainer = document.createElement("div");
    iframeContainer.style.cssText = `
      width: 100%;
      height: calc(100% - 50px);
      overflow: hidden;
    `;

    // 创建iframe
    const iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("popup.html");
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      pointer-events: auto;
    `;

    // 组装popup
    iframeContainer.appendChild(iframe);
    this.popup.appendChild(header);
    this.popup.appendChild(closeBtn);
    this.popup.appendChild(iframeContainer);

    // 添加调整大小的手柄
    this.addResizeHandles();

    // 使popup可拖动
    this.makePopupDraggable(this.popup);

    // 添加ESC键关闭功能
    this.popup.keydownHandler = (e) => {
      if (e.key === "Escape") {
        this.hidePopup();
      }
    };
    document.addEventListener("keydown", this.popup.keydownHandler);

    // 添加窗口大小改变监听器，确保popup不会超出边界
    this.popup.resizeHandler = () => {
      if (this.popup && this.popup.style.display !== "none") {
        this.positionPopup();
      }
    };
    window.addEventListener("resize", this.popup.resizeHandler);

    document.body.appendChild(this.popup);
  }

  // 添加调整大小的手柄
  addResizeHandles() {
    const handles = [
      { position: 'n', cursor: 'ns-resize', style: 'top: 0; left: 50%; transform: translateX(-50%); width: 100%; height: 6px;' },
      { position: 's', cursor: 'ns-resize', style: 'bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; height: 6px;' },
      { position: 'e', cursor: 'ew-resize', style: 'right: 0; top: 50%; transform: translateY(-50%); width: 6px; height: 100%;' },
      { position: 'w', cursor: 'ew-resize', style: 'left: 0; top: 50%; transform: translateY(-50%); width: 6px; height: 100%;' },
      { position: 'nw', cursor: 'nw-resize', style: 'top: 0; left: 0; width: 10px; height: 10px;' },
      { position: 'ne', cursor: 'ne-resize', style: 'top: 0; right: 0; width: 10px; height: 10px;' },
      { position: 'sw', cursor: 'sw-resize', style: 'bottom: 0; left: 0; width: 10px; height: 10px;' },
      { position: 'se', cursor: 'se-resize', style: 'bottom: 0; right: 0; width: 10px; height: 10px;' }
    ];

    handles.forEach(handle => {
      const handleElement = document.createElement('div');
      handleElement.className = `resize-handle resize-${handle.position}`;
      handleElement.style.cssText = `
        position: absolute;
        background: transparent;
        cursor: ${handle.cursor};
        z-index: 1000;
        ${handle.style}
      `;
      
      // 添加拖拽事件
      this.addResizeEvents(handleElement, handle.position);
      
      this.popup.appendChild(handleElement);
    });
  }

  // 添加调整大小的事件处理
  addResizeEvents(handleElement, position) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.popup.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      this.popup.style.transition = 'none';
      this.popup.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      // 根据手柄位置调整大小和位置
      switch (position) {
        case 'n':
          newHeight = Math.max(400, startHeight - deltaY);
          newTop = startTop + (startHeight - newHeight);
          break;
        case 's':
          newHeight = Math.max(400, startHeight + deltaY);
          break;
        case 'e':
          newWidth = Math.max(400, startWidth + deltaX);
          break;
        case 'w':
          newWidth = Math.max(400, startWidth - deltaX);
          newLeft = startLeft + (startWidth - newWidth);
          break;
        case 'nw':
          newWidth = Math.max(400, startWidth - deltaX);
          newHeight = Math.max(400, startHeight - deltaY);
          newLeft = startLeft + (startWidth - newWidth);
          newTop = startTop + (startHeight - newHeight);
          break;
        case 'ne':
          newWidth = Math.max(400, startWidth + deltaX);
          newHeight = Math.max(400, startHeight - deltaY);
          newTop = startTop + (startHeight - newHeight);
          break;
        case 'sw':
          newWidth = Math.max(400, startWidth - deltaX);
          newHeight = Math.max(400, startHeight + deltaY);
          newLeft = startLeft + (startWidth - newWidth);
          break;
        case 'se':
          newWidth = Math.max(400, startWidth + deltaX);
          newHeight = Math.max(400, startHeight + deltaY);
          break;
      }
      
      // 应用新的尺寸和位置
      this.popup.style.width = newWidth + 'px';
      this.popup.style.height = newHeight + 'px';
      
      if (position.includes('w')) {
        this.popup.style.left = newLeft + 'px';
        this.popup.style.right = 'auto';
      }
      if (position.includes('n')) {
        this.popup.style.top = newTop + 'px';
        this.popup.style.bottom = 'auto';
      }
      
      // 清除transform，因为我们现在使用绝对定位
      this.popup.style.transform = 'none';
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      
      isResizing = false;
      this.popup.style.transition = '';
      this.popup.style.userSelect = '';
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 保存新的位置和尺寸
      const rect = this.popup.getBoundingClientRect();
      localStorage.setItem('doris-popup-position', JSON.stringify({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }));
    };

    handleElement.addEventListener('mousedown', handleMouseDown);
  }

  // 获取调整手柄样式
  getResizerStyle(position) {
    const base = `
      position: absolute;
      background: transparent;
      z-index: 10;
    `;

    const styles = {
      top: `${base} top: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize;`,
      right: `${base} top: 10px; right: 0; bottom: 10px; width: 5px; cursor: ew-resize;`,
      bottom: `${base} bottom: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize;`,
      left: `${base} top: 10px; left: 0; bottom: 10px; width: 5px; cursor: ew-resize;`,
      "top-left": `${base} top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize;`,
      "top-right": `${base} top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize;`,
      "bottom-left": `${base} bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize;`,
      "bottom-right": `${base} bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize;`,
    };

    return styles[position];
  }

  // 开始调整大小
  startResize(e, position) {
    this.isResizing = true;
    this.currentResizer = position;

    const rect = this.popup.getBoundingClientRect();
    this.resizeData = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top,
    };

    document.addEventListener("mousemove", this.handleResize.bind(this));
    document.addEventListener("mouseup", this.stopResize.bind(this));

    e.preventDefault();
  }

  // 处理调整大小
  handleResize(e) {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.resizeData.startX;
    const deltaY = e.clientY - this.resizeData.startY;

    let newWidth = this.resizeData.startWidth;
    let newHeight = this.resizeData.startHeight;
    let newLeft = this.resizeData.startLeft;
    let newTop = this.resizeData.startTop;

    switch (this.currentResizer) {
      case "right":
        newWidth = this.resizeData.startWidth + deltaX;
        break;
      case "left":
        newWidth = this.resizeData.startWidth - deltaX;
        newLeft = this.resizeData.startLeft + deltaX;
        break;
      case "bottom":
        newHeight = this.resizeData.startHeight + deltaY;
        break;
      case "top":
        newHeight = this.resizeData.startHeight - deltaY;
        newTop = this.resizeData.startTop + deltaY;
        break;
      case "bottom-right":
        newWidth = this.resizeData.startWidth + deltaX;
        newHeight = this.resizeData.startHeight + deltaY;
        break;
      case "bottom-left":
        newWidth = this.resizeData.startWidth - deltaX;
        newHeight = this.resizeData.startHeight + deltaY;
        newLeft = this.resizeData.startLeft + deltaX;
        break;
      case "top-right":
        newWidth = this.resizeData.startWidth + deltaX;
        newHeight = this.resizeData.startHeight - deltaY;
        newTop = this.resizeData.startTop + deltaY;
        break;
      case "top-left":
        newWidth = this.resizeData.startWidth - deltaX;
        newHeight = this.resizeData.startHeight - deltaY;
        newLeft = this.resizeData.startLeft + deltaX;
        newTop = this.resizeData.startTop + deltaY;
        break;
    }

    // 最小尺寸限制
    newWidth = Math.max(400, newWidth);
    newHeight = Math.max(300, newHeight);

    this.popup.style.width = newWidth + "px";
    this.popup.style.height = newHeight + "px";

    // 更新位置（针对从左侧或顶部调整的情况）
    if (this.currentResizer.includes("left")) {
      this.popup.style.left = newLeft + "px";
    }
    if (this.currentResizer.includes("top")) {
      this.popup.style.top = newTop + "px";
    }
  }

  // 停止调整大小
  stopResize() {
    this.isResizing = false;
    this.currentResizer = null;
    document.removeEventListener("mousemove", this.handleResize.bind(this));
    document.removeEventListener("mouseup", this.stopResize.bind(this));
  }

  // 显示popup
  showPopup() {
    console.log("🚀 showPopup 被调用");

    // 从localStorage读取保存的弹窗位置
    const savedPopupPosition = localStorage.getItem("doris-popup-position");
    console.log("📍 保存的位置:", savedPopupPosition);

    let left = "50%";
    let top = "50%";
    let right = "auto";
    let bottom = "auto";
    let transform = "translate(-50%, -50%)";

    // 只有在有有效保存位置时才使用保存的位置
    if (savedPopupPosition) {
      console.log("savedPopupPosition", savedPopupPosition);
      try {
        const pos = JSON.parse(savedPopupPosition);
        console.log("📋 解析的位置:", pos);
        if (pos.left >= 0 && pos.top >= 0) {
          if (
            pos.left !== undefined &&
            pos.top !== undefined &&
            typeof pos.left === "number" &&
            typeof pos.top === "number"
          ) {
            // 检查保存的位置是否在边界内
            const popupWidth = pos.width || 760; // 使用保存的宽度或默认宽度
            const popupHeight = pos.height || window.innerHeight * 0.85; // 使用保存的高度或默认高度

            // 计算边界限制
            const minLeft = -popupWidth + 200;
            const maxLeft = window.innerWidth - 200;
            const minTop = -popupHeight + 100;
            const maxTop = window.innerHeight - 100;

            console.log("🔒 边界限制:", { minLeft, maxLeft, minTop, maxTop });

            // 应用边界限制
            let adjustedLeft = Math.max(minLeft, Math.min(maxLeft, pos.left));
            let adjustedTop = Math.max(minTop, Math.min(maxTop, pos.top));

            console.log("📐 调整后的位置:", { adjustedLeft, adjustedTop });

            // 如果调整后的位置仍然有效，使用保存的位置
            if (
              adjustedLeft >= minLeft &&
              adjustedLeft <= maxLeft &&
              adjustedTop >= minTop &&
              adjustedTop <= maxTop
            ) {
              left = adjustedLeft + "px";
              top = adjustedTop + "px";
              right = "auto";
              bottom = "auto";
              transform = "none";
              console.log("✅ 使用保存的位置");
            } else {
              console.log("❌ 调整后位置无效，使用居中位置");
            }
            // 如果调整后位置无效，保持居中位置
          } else {
            console.log("❌ 位置数据无效，使用居中位置");
          }
        }
      } catch (e) {
        console.warn("解析保存的弹窗位置失败，使用默认居中位置");
        // 使用默认居中位置
        left = "50%";
        top = "50%";
        right = "auto";
        bottom = "auto";
        transform = "translate(-50%, -50%)";
      }
    } else {
      console.log("📍 没有保存的位置，使用居中位置");
    }

    console.log("🎯 最终位置设置:", { left, top, transform });

    // 获取保存的尺寸
    let width = "760px";
    let height = "85vh";
    if (savedPopupPosition) {
      try {
        const pos = JSON.parse(savedPopupPosition);
        if (pos.width && pos.height) {
          width = pos.width + "px";
          height = pos.height + "px";
        }
      } catch (e) {
        // 忽略错误，使用默认尺寸
      }
    }

    this.popup.style.cssText = `
      position: fixed;
      width: ${width};
      height: ${height};
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 9998;
      display: block;
      overflow: hidden;
      cursor: default;
      left: ${left};
      top: ${top};
      right: ${right};
      bottom: ${bottom};
      transform: ${transform};
    `;

    console.log("�� popup样式已设置");
  }

  // 隐藏popup
  hidePopup() {
    this.popup.style.display = "none";

    // 清理键盘事件监听器
    if (this.popup.keydownHandler) {
      document.removeEventListener("keydown", this.popup.keydownHandler);
      this.popup.keydownHandler = null;
    }

    // 清理resize事件监听器
    if (this.popup.resizeHandler) {
      window.removeEventListener("resize", this.popup.resizeHandler);
      this.popup.resizeHandler = null;
    }
  }

  // 定位popup
  positionPopup() {
    if (!this.popup) return;

    console.log("📍 positionPopup 被调用");

    // 如果popup有保存的位置，使用保存的位置
    const savedPopupPosition = localStorage.getItem("doris-popup-position");
    if (savedPopupPosition) {
      try {
        const pos = JSON.parse(savedPopupPosition);
        if (pos.left !== undefined && pos.top !== undefined) {
          // 检查保存的位置是否在边界内
          const popupWidth = pos.width || 760; // 使用保存的宽度或默认宽度
          const popupHeight = pos.height || window.innerHeight * 0.85; // 使用保存的高度或默认高度

          // 计算边界限制
          const minLeft = -popupWidth + 200;
          const maxLeft = window.innerWidth - 200;
          const minTop = -popupHeight + 100;
          const maxTop = window.innerHeight - 100;

          // 应用边界限制
          let adjustedLeft = Math.max(minLeft, Math.min(maxLeft, pos.left));
          let adjustedTop = Math.max(minTop, Math.min(maxTop, pos.top));

          this.popup.style.left = adjustedLeft + "px";
          this.popup.style.top = adjustedTop + "px";
          this.popup.style.right = "auto";
          this.popup.style.bottom = "auto";
          this.popup.style.transform = "none";
          
          // 应用保存的尺寸
          if (pos.width) this.popup.style.width = pos.width + "px";
          if (pos.height) this.popup.style.height = pos.height + "px";

          // 如果位置被调整了，保存新的位置
          if (adjustedLeft !== pos.left || adjustedTop !== pos.top) {
            localStorage.setItem(
              "doris-popup-position",
              JSON.stringify({
                left: adjustedLeft,
                top: adjustedTop,
                width: pos.width,
                height: pos.height
              })
            );
          }
          console.log("✅ positionPopup: 使用保存的位置");
          return;
        }
      } catch (e) {
        console.warn("解析保存的弹窗位置失败，使用默认居中位置");
      }
    }

    // 默认居中显示 - 确保popup居中
    this.popup.style.left = "50%";
    this.popup.style.top = "50%";
    this.popup.style.right = "auto";
    this.popup.style.bottom = "auto";
    this.popup.style.transform = "translate(-50%, -50%)";

    // 清除可能存在的无效位置
    localStorage.removeItem("doris-popup-position");
    console.log("✅ positionPopup: 使用居中位置");
  }

  // 显示右侧查看结果按钮
  showRightButton() {
    const rightBtn = this.button.querySelector("#convert-right-btn");
    if (rightBtn) {
      rightBtn.style.display = "flex";
    }
  }

  // 将popup居中显示
  centerPopup() {
    if (!this.popup) return;

    this.popup.style.left = "50%";
    this.popup.style.top = "50%";
    this.popup.style.right = "auto";
    this.popup.style.bottom = "auto";
    this.popup.style.transform = "translate(-50%, -50%)";
    
    // 重置为默认尺寸
    this.popup.style.width = "760px";
    this.popup.style.height = "85vh";

    // 清除保存的位置和尺寸，下次显示时使用居中位置
    localStorage.removeItem("doris-popup-position");
  }
}

// 导出到全局
window.InlinePopup = InlinePopup;

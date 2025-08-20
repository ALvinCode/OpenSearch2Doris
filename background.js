// 后台脚本 - 处理浏览器操作
chrome.runtime.onInstalled.addListener(() => {
  console.log("Grafana OpenSearch to Doris SQL Converter installed");
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openPopup") {
    // 打开扩展弹出窗口
    chrome.action.openPopup();
  } else if (request.action === "getConversionResults") {
    // 从存储中获取转换结果
    chrome.storage.local.get(["conversionResults"], (result) => {
      sendResponse(result.conversionResults || null);
    });
    return true; // 保持消息通道开启以支持异步响应
  }
  return true;
});

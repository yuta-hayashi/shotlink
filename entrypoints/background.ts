export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    getScreenShot().then((image) => {
      sendResponse({ action: 'getScreenShot', image });
    });
    return true;
  });

});

async function getScreenShot() {
  const screenshotDataUrl = await browser.tabs.captureVisibleTab({ format: 'png' });
  return screenshotDataUrl;
}

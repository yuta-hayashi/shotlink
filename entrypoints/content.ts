export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'selectArea') {
        selectArea(sender.id);
      }
      sendResponse({ message: 'Hello from content' });
      return true;
    });
  },
});

async function selectArea(senderId?: string) {
  const selectionBox = document.createElement('div');
  selectionBox.id = 'selection-box';
  selectionBox.style.cssText = `
      position: absolute !important;
      border: 2px dashed light-dark(#039be5, #81d4fa) !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      backgroud-color: none !important;
      `
  const overlay = document.createElement('div');
  overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 9999 !important;
      user-select: none !important;
      cursor: crosshair !important;
      `
  document.body.appendChild(overlay);
  document.body.appendChild(selectionBox);

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  const handleMouseDown = (e: MouseEvent) => {
    isDragging = true;
    startX = e.pageX;
    startY = e.pageY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const currentX = e.pageX;
    const currentY = e.pageY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${Math.min(currentX, startX)}px`;
    selectionBox.style.top = `${Math.min(currentY, startY)}px`;
  }

  const handleMouseUp = async (e: MouseEvent) => {
    if (isDragging) {
      isDragging = false;
      const area = {
        x: parseInt(selectionBox.style.left, 10),
        y: parseInt(selectionBox.style.top, 10),
        width: parseInt(selectionBox.style.width, 10),
        height: parseInt(selectionBox.style.height, 10),
      }
      selectionBox.style.display = 'none';

      // wait for selection box is hidden
      await new Promise((resolve) => setTimeout(resolve, 10));

      browser.runtime.sendMessage(senderId, { action: 'getScreenShot' }, async (response) => {
        const croppedDataUrl = await cropImage(response.image, area);
        const imageBlob = dataUriToBlob(croppedDataUrl);
        const item = new ClipboardItem({
          'text/plain': new Blob([window.location.toString() || ''], { type: 'text/plain' }),
          'image/png': imageBlob,
        })
        await navigator.clipboard.write([item]);
      })

      // cleanup
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      selectionBox.remove();
      overlay.remove();
    }
  }

  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}


async function cropImage(dataUrl: string, area: { x: number, y: number, width: number, height: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      canvas.width = area.width * dpr;
      canvas.height = area.height * dpr;
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      ctx.drawImage(img, area.x * dpr, area.y * dpr, area.width * dpr, area.height * dpr, 0, 0, area.width * dpr, area.height * dpr);
      resolve(canvas.toDataURL());
    };

    img.onerror = (err) => reject(new Error('Image could not be loaded'));
    img.src = dataUrl;
  });
}

function dataUriToBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const match = dataURI.match(/:([a-z\/\-]+);/);
  const mimeType = match ? match[1] : '';

  let buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
}

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
  document.body.appendChild(selectionBox);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'crosshair';

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
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
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
      canvas.width = area.width;
      canvas.height = area.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
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
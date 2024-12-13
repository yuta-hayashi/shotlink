function main() {
  browser.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id!, { action: 'selectArea' }, (response) => {
    });
  });
  window.close();
}

main();

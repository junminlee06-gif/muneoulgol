(() => {
'use strict';
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
loadScript('bgm_core.js?v=20260611c')
  .then(() => loadScript('chapter3.js?v=20260611a'))
  .then(() => loadScript('chapter3_patch.js?v=20260611b'))
  .catch(() => {
    const mark = document.createElement('div');
    mark.textContent = '확장 스크립트 로드 실패';
    mark.style.cssText = 'position:fixed;left:10px;bottom:30px;z-index:99999;background:#2a120f;color:#f0d0b0;border:1px solid #8b5a42;padding:4px 6px;font:12px system-ui';
    document.body.appendChild(mark);
  });
})();

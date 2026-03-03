(function () {
  "use strict";

  document.addEventListener(
    "keydown",
    function (e) {
      const allowedKeys = [
        "Tab",
        "Enter",
        "Escape",
        "Backspace",
        "Delete",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "@",
        ".",
        "-",
        "_",
        "+",
        "=",
        "(",
        ")",
        " ",
        "/",
      ];

      if (e.key.startsWith("F") && !isNaN(e.key.slice(1))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const blockedSpecialKeys = [
        "PrintScreen",
        "ScrollLock",
        "Pause",
        "Insert",
        "ContextMenu",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
      ];

      if (blockedSpecialKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    true,
  );

  document.addEventListener(
    "contextmenu",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true,
  );

  document.addEventListener(
    "mousedown",
    function (e) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    true,
  );

  if (window.console) {
    const methods = ["log", "info", "warn", "error", "debug", "dir"];
    methods.forEach((method) => {
      Object.defineProperty(window.console, method, {
        get: function () {
          return function () {};
        },
      });
    });
  }

  setInterval(function () {
    const start = performance.now();
    debugger;
    const end = performance.now();
    if (end - start > 50) {
      document.documentElement.innerHTML =
        '<h1 style="color: red; text-align: center; margin-top: 50px;">Доступ запрещен</h1>';
      window.location.href = "/";
    }
  }, 500);

  let lastWidth = window.outerWidth;
  let lastHeight = window.outerHeight;

  setInterval(function () {
    const widthDiff = Math.abs(window.outerWidth - lastWidth);
    const heightDiff = Math.abs(window.outerHeight - lastHeight);

    if (widthDiff > 200 || heightDiff > 200) {
      document.documentElement.innerHTML =
        '<h1 style="color: red; text-align: center; margin-top: 50px;">Доступ запрещен</h1>';
      window.location.href = "/";
    }

    lastWidth = window.outerWidth;
    lastHeight = window.outerHeight;
  }, 1000);

  document.addEventListener(
    "selectstart",
    function (e) {
      if (!e.target.matches("input, textarea")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    true,
  );

  document.addEventListener(
    "copy",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true,
  );

  document.addEventListener(
    "cut",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true,
  );

  document.addEventListener(
    "paste",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true,
  );

  setInterval(function () {
    console.clear();
  }, 100);

  function debugProtection() {
    try {
      let start = performance.now();
      (function () {}).constructor("debugger")();
      let end = performance.now();
      if (end - start > 50) {
        window.location.href = "/";
      }
    } catch (e) {}
  }

  setInterval(debugProtection, 1000);

  console.log("🔒 Защита активирована (агрессивный режим)");
})();

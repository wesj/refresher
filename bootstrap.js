const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function isNativeUI() {
  return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

function isPhone(window) {
  return !window.BrowserApp.isTablet;
}

var refreshItem = null;

function loadIntoWindow(window) {
  if (!window)
    return;

  if (isNativeUI() && isPhone(window)) {
    refreshItem = window.NativeWindow.pageactions.add({
      title: "Refresh",
      icon: window.resolveGeckoURI("chrome://refresher/content/refresh.png"),

      clickCallback: function() {
        const reloadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
        BrowserReloadWithFlags(window, reloadFlags);
      },

      longClickCallback: function() {
        const reloadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY | Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE;
        BrowserReloadWithFlags(window, reloadFlags);
      }

    });
  }
}

function BrowserReloadWithFlags(window, flags) {
  var webNav = window.BrowserApp.selectedTab.browser.webNavigation;
  try {
    var sh = webNav.sessionHistory;
    if (sh)
      webNav = sh.QueryInterface(Ci.nsIWebNavigation);
  } catch (e) {
    window.console.log("error getting session history " + e);
  }

  try {
    webNav.reload(flags);
  } catch (e) {
    window.console.log("error reloading " + e);
  }
}

function unloadFromWindow(window) {
  if (!window)
    return;

  if (isNativeUI() && refreshItem) {
    window.NativeWindow.pageactions.remove(refreshItem);
  }
}

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {
  },
  
  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN)
    return;

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}

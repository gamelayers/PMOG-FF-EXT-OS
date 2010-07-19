const EXPORTED_SYMBOLS = ['PMOG'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://pmog/log4moz.js");
Cu.import("resource://pmog/constants.js");
Cu.import("resource://pmog/util.js");

let PMOG = {};
Cu.import("resource://pmog/constants.js", PMOG);
Cu.import("resource://pmog/util.js", PMOG);
Cu.import("resource://pmog/service.js", PMOG);

Utils.lazy(PMOG, 'Service', PmogSvc);


/*
* Service singleton
* Main entry point into PMOG's framework
*/

function PmogSvc() {
  this._startupFinished = false;
  this._initLogs();
  this._log.info("PMOG Service Initializing");

  // Other misc startup
  this._os.addObserver(this, "quit-application", true);

  if (!this.enabled) {
    this._log.info("PMOG disabled");
  }
}

PmogSvc.prototype = {

  _osPrefix: "pmog:service:",

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
    .getService(Ci.nsIObserverService);
    return this.__os;
  },

  __dirSvc: null,
  get _dirSvc() {
    if (!this.__dirSvc)
      this.__dirSvc = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties);
    return this.__dirSvc;
  },

  __json: null,
  get _json() {
    if (!this.__json)
      this.__json = Cc["@mozilla.org/dom/json;1"].
    createInstance(Ci.nsIJSON);
    return this.__json;
  },

  get enabled() Utils.prefs.getBoolPref("playing"),

  _initLogs: function PmogSvc__initLogs() {
    this._log = Log4Moz.Service.getLogger("PMOG.Service.Main");
    this._log.level =
    Log4Moz.Level[Utils.prefs.getCharPref("log.logger.service.main")];

    let formatter = new Log4Moz.BasicFormatter();
    let root = Log4Moz.Service.rootLogger;
    root.level = Log4Moz.Level[Utils.prefs.getCharPref("log.rootLogger")];

    let capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level[Utils.prefs.getCharPref("log.appender.console")];
    root.addAppender(capp);

    let dapp = new Log4Moz.DumpAppender(formatter);
    dapp.level = Log4Moz.Level[Utils.prefs.getCharPref("log.appender.dump")];
    root.addAppender(dapp);

    let brief = this._dirSvc.get("ProfD", Ci.nsIFile);
    brief.QueryInterface(Ci.nsILocalFile);
    brief.append("pmog");
    brief.append("logs");
    brief.append("brief-log.txt");
    if (!brief.exists())
      brief.create(brief.NORMAL_FILE_TYPE, PERMS_FILE);

    let verbose = brief.parent.clone();
    verbose.append("verbose-log.txt");
    if (!verbose.exists())
      verbose.create(verbose.NORMAL_FILE_TYPE, PERMS_FILE);

    this._briefApp = new Log4Moz.RotatingFileAppender(brief, formatter);
    this._briefApp.level = Log4Moz.Level[Utils.prefs.getCharPref("log.appender.briefLog")];
    root.addAppender(this._briefApp);
    this._debugApp = new Log4Moz.RotatingFileAppender(verbose, formatter);
    this._debugApp.level = Log4Moz.Level[Utils.prefs.getCharPref("log.appender.debugLog")];
    root.addAppender(this._debugApp);

    // let chainsaw = this._dirSvc.get("ProfD", Ci.nsIFile);
    // chainsaw.QueryInterface(Ci.nsILocalFile);
    // chainsaw.append("pmog");
    // chainsaw.append("chainsaw.ptr");
    // if (chainsaw.exists()) {
    //   let data = Utils.loadFileToString(chainsaw);
    //   //data = data.trim();
    //   let [host, port] = data.split(":");
    //   let xf = new Log4Moz.XMLFormatter();
    //   let sapp = new Log4Moz.SocketAppender(host, Number(port), xf);
    //   sapp.level = Log4Moz.Level.All;
    //   root.addAppender(sapp);
    // }

  },

  clearLogs: function PmogSvc_clearLogs() {
    this._briefApp.clear();
    this._debugApp.clear();
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
  Ci.nsISupportsWeakReference]),

  // nsIObserver

  observe: function PmogSvc__observe(subject, topic, data) {
    switch (topic) {
    case "quit-application":
      this._onQuitApplication();
      break;
    }
  },

  _onQuitApplication: function PmogSvc__onQuitApplication() {
    this._log.info("Quitting Application");
  },
};

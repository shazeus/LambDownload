function CSInterface() {}

CSInterface.prototype.evalScript = function (script, callback) {
  if (window.__adobe_cep__ && typeof window.__adobe_cep__.evalScript === "function") {
    window.__adobe_cep__.evalScript(script, callback);
    return;
  }

  callback(
    JSON.stringify({
      ok: false,
      host: "browser-demo",
      target: "project-bin",
      path: "",
      message: "CEP bridge is only available inside an Adobe host.",
    }),
  );
};

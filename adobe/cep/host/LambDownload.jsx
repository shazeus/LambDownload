var LambDownload = LambDownload || {};

LambDownload.importAsset = function (filePath, target) {
  try {
    var file = new File(filePath);
    if (!file.exists) {
      throw new Error("File does not exist: " + filePath);
    }

    if (app.name.indexOf("After Effects") !== -1) {
      var options = new ImportOptions(file);
      var item = app.project.importFile(options);
      if (target === "timeline" && app.project.activeItem && app.project.activeItem.layers) {
        app.project.activeItem.layers.add(item);
      }
      return JSON.stringify({
        ok: true,
        host: "after-effects",
        target: target,
        path: filePath,
        message: "Imported into After Effects",
      });
    }

    if (app.project && app.project.importFiles) {
      app.project.importFiles([filePath], true, app.project.rootItem, false);
      return JSON.stringify({
        ok: true,
        host: "premiere",
        target: target,
        path: filePath,
        message: "Imported into Premiere Pro",
      });
    }

    throw new Error("Unsupported Adobe host");
  } catch (error) {
    return JSON.stringify({
      ok: false,
      host: "browser-demo",
      target: target,
      path: filePath,
      message: error.message,
    });
  }
};

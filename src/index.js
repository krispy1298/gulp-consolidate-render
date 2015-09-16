var consolidate = require("consolidate-p");
var _ = require("lodash");
var path = require("path");
var through = require("through2");
var fs = require("fs");
var Promise = require("q").Promise;
var gutil = require('gulp-util');

function basicCompileData(sources) {
  return _.merge.apply(_, sources);
}

function templateFileExists(templatePath) {
  return new Promise(function promisifyExists(resolve, reject) {
    fs.exists(templatePath, function onExists(exists) {
      if (!exists) {
        return new gutil.PluginError('gulp-consolidate-render-safe', "Template does not exist at " + templatePath);
      }
      resolve(true);
    });
  });
}

function templates(options) {
  var compiledOptions = _.merge({
    templateDir: "templates",
    defaultTemplate: "post",
    extension: '.html'
  }, options);

  var globals = compiledOptions.globals || {};

  var compileData = compiledOptions.compileData || basicCompileData;

  if (!compiledOptions.engine) {
    return new gutil.PluginError('gulp-consolidate-render-safe', "Missing required `engine` parameter");
  }

  return through.obj(function onData(file, enc, callback) {
    if (!file.frontMatter) {
      new gutil.PluginError('gulp-consolidate-render-safe', "Missing frontMatter");
      return;
    }

    if (!file.frontMatter.template) {
      new gutil.PluginError('gulp-consolidate-render-safe', path + 'missing template setting');
      return;
    }

    var templateName = file.frontMatter.template || compiledOptions.defaultTemplate;

    var templatePath = path.join(
      "./",
      compiledOptions.templateDir,
      templateName + compiledOptions.extension
    );

    templateFileExists(templatePath)
      .then(function () {
        var data = compileData([
          {},
          globals,
          file.frontMatter || {},
          {
            contents: file.contents.toString()
          },
          file
        ]);

        return consolidate[compiledOptions.engine](templatePath, data);
      })
      .then(function (html) {
        file.contents = new Buffer(html, "utf-8");

        return file;
      })
      .catch(function (err) {
        return new gutil.PluginError('gulp-consolidate-render-safe', err);
      });
  });
}

module.exports = templates;

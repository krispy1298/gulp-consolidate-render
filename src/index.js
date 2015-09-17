var consolidate = require('consolidate-p');
var _ = require('lodash');
var path = require('path');
var through = require('through2');
var fs = require('fs');
var Q = require('q');
var gutil = require('gulp-util');

function basicCompileData(sources) {
  return _.merge.apply(_, sources);
}

function templateFileExists(templatePath) {
  return Q.Promise(function promisifyExists(resolve, reject) {
    fs.exists(templatePath, function onExists(exists) {
      if (!exists) {
        return gutil.log('Template does not exist at ' + templatePath);
      }
      resolve(true);
    });
  });
}

function templates(options) {
  var compiledOptions = _.merge({
    templateDir: 'templates',
    defaultTemplate: 'post',
    extension: '.html'
  }, options);

  var globals = compiledOptions.globals || {};

  var compileData = compiledOptions.compileData || basicCompileData;

  if (!compiledOptions.engine) {
    gutil.log('Missing required `engine` parameter');
    return callback();
  }

  return through.obj(function onData(file, enc, callback) {
    if (_.isEmpty(file.frontMatter)) {
      return callback();
    }

    if (!file.frontMatter.template) {
      return callback();
    }

    var templateName = file.frontMatter.template || compiledOptions.defaultTemplate;

    var templatePath = path.join(
      './',
      compiledOptions.templateDir,
      templateName + compiledOptions.extension
    );

    var frontMatter = file.frontMatter;
    var contents = file.contents;

    templateFileExists(templatePath)
      .then(function () {
        var data = compileData([
          {},
          globals,
          frontMatter || {},
          {
            contents: contents.toString()
          },
          file
        ]);

        return consolidate[compiledOptions.engine](templatePath, data);
      })
      .then(function (html) {
        file.contents = Buffer(html, 'utf-8');

        return callback(null, file);
      })
      .catch(function (err) {
        gutil.log(err);
        return callback(null, file);
      });

  });
}

module.exports = templates;

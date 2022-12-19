const withTM = require('next-transpile-modules')(['@koale/useworker']);

module.exports = withTM({
    assetPrefix: ".",
});
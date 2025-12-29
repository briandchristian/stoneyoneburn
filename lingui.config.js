/** @type {import('@lingui/conf').LinguiConfig} */
module.exports = {
  locales: ["en-US"],
  sourceLocale: "en-US",
  catalogs: [{
    path: "<rootDir>/src/locales/{locale}/messages",
    include: ["<rootDir>/src"],
  }],
  format: "po",
};
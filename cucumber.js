module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    format: [
      '@cucumber/pretty-formatter',
      'json:test-results/cucumber-report.json',
      'html:test-results/cucumber-report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true
  }
};
# Allure Test Reporting

## Overview

This project uses Allure Framework for beautiful, interactive test reports. Reports are automatically generated and published to GitHub Pages after each test run.

## 📊 View Reports

### Production Reports
- **URL**: [https://BTShift.github.io/btshift-bdd/](https://BTShift.github.io/btshift-bdd/)
- Updated automatically on every push to master
- Historical data preserved for trend analysis

### Local Development

Run tests and generate report locally:
```bash
# Run tests with Allure
npm run test:allure

# Or step by step:
npm run test:api           # Run tests
npm run allure:generate     # Generate report
npm run allure:open        # Open in browser

# Quick serve (generates and opens)
npm run allure:serve
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

The workflow automatically:
1. Runs all API tests on push/PR
2. Generates Allure reports with history
3. Deploys to GitHub Pages
4. Comments on PRs with report links
5. Preserves last 20 reports for history

### GitHub Pages Setup (One-time)

1. Go to repository Settings → Pages
2. Source: Deploy from branch
3. Branch: `gh-pages` (created automatically by CI)
4. Wait for first workflow run to complete

## 📁 Project Structure

```
btshift-bdd/
├── allure-results/       # Raw test results (gitignored)
├── allure-report/        # Generated HTML report (gitignored)
├── allure-history/       # Historical data (in gh-pages branch)
└── .github/workflows/
    └── test-and-report.yml  # CI/CD configuration
```

## 🛠️ Configuration

### Playwright Config
The Allure reporter is configured in `playwright.config.ts`:
- Captures test details, screenshots, and traces
- Adds environment information
- Categorizes tests automatically

### Available Scripts

```bash
npm run allure:generate  # Generate report from results
npm run allure:open     # Open report in browser
npm run allure:serve    # Generate and serve report
npm run allure:clean    # Clean old reports
npm run test:allure     # Run tests and open report
```

## 📈 Report Features

### What's Included
- **Test Suites**: Organized by feature/category
- **Timeline**: Visual test execution timeline
- **Graphs**: Pass/fail trends, duration charts
- **Categories**: Auto-categorized failures
- **History**: Test execution history and trends
- **Retries**: Flaky test detection
- **Attachments**: Screenshots, traces, logs

### Report Sections
- **Overview**: Summary dashboard
- **Suites**: Test hierarchy view
- **Graphs**: Visual analytics
- **Timeline**: Execution timeline
- **Behaviors**: BDD-style grouping
- **Packages**: Technical grouping

## 🔧 Troubleshooting

### Report Not Generating
```bash
# Check if allure-results exists
ls -la allure-results/

# Clean and regenerate
npm run allure:clean
npm run test:api
npm run allure:generate
```

### GitHub Pages Not Working
1. Check Settings → Pages → Source is set to `gh-pages`
2. Wait 5-10 minutes after first deployment
3. Check Actions tab for workflow status

### Missing History
History is stored in `gh-pages` branch. First run won't have history.

## 🔗 Useful Links

- [Allure Documentation](https://docs.qameta.io/allure/)
- [GitHub Pages](https://pages.github.com/)
- [Playwright Allure Reporter](https://www.npmjs.com/package/allure-playwright)

## 💡 Tips

1. **Local Testing**: Use `npm run allure:serve` for quick local reports
2. **CI Reports**: Check PR comments for direct links
3. **History**: Each push preserves history for trend analysis
4. **Categories**: Tests are auto-categorized by type/status
5. **Environment**: Environment info shown in report header

## 🏆 Best Practices

1. **Test Naming**: Use descriptive test names for better reports
2. **Steps**: Use `test.step()` for detailed test breakdown
3. **Attachments**: Screenshots and traces auto-attached on failure
4. **Categories**: Tests auto-categorized as API/UI/Integration
5. **Retries**: Flaky tests automatically detected and marked
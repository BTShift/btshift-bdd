# GitHub Pages Setup Instructions

## Enable GitHub Pages for Allure Reports

Follow these steps to enable GitHub Pages for viewing your Allure test reports:

### 1. Wait for First Workflow Run
- The GitHub Actions workflow must run at least once to create the `gh-pages` branch
- Check Actions tab: https://github.com/BTShift/btshift-bdd/actions
- Wait for "API Tests with Allure Report" to complete

### 2. Enable GitHub Pages

1. Go to Repository Settings:
   - Navigate to: https://github.com/BTShift/btshift-bdd/settings/pages

2. Configure Source:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` (should appear after first workflow run)
   - **Folder**: `/ (root)`
   - Click **Save**

3. Wait for Deployment:
   - GitHub Pages takes 5-10 minutes to deploy initially
   - Check deployment status in Settings → Pages
   - You'll see a green checkmark when ready

### 3. Access Your Reports

Once deployed, your Allure reports will be available at:
- **Latest Report**: https://BTShift.github.io/btshift-bdd/
- **Specific Run**: https://BTShift.github.io/btshift-bdd/{run_number}/

### 4. Configure Repository Secrets (if needed)

Go to Settings → Secrets and variables → Actions:

Add these secrets if not already present:
- `SUPER_ADMIN_EMAIL`: Email for test authentication
- `SUPER_ADMIN_PASSWORD`: Password for test authentication
- `PLATFORM_ADMIN_URL`: Platform admin portal URL
- `API_GATEWAY_URL`: API gateway URL

### 5. Verify Setup

1. Check workflow status:
   ```bash
   gh run list --repo BTShift/btshift-bdd
   ```

2. View latest report:
   - Open: https://BTShift.github.io/btshift-bdd/

3. Check Pages deployment:
   - Go to: https://github.com/BTShift/btshift-bdd/deployments

## Troubleshooting

### Pages Not Working
- Ensure `gh-pages` branch exists
- Check Settings → Pages → Source is configured
- Wait 10 minutes after configuration
- Check Actions tab for deployment status

### Workflow Failing
- Check Actions tab for error messages
- Verify all secrets are configured
- Ensure test credentials are valid

### Report Not Updating
- Check if workflow is running successfully
- Verify `gh-pages` branch is being updated
- Clear browser cache and refresh

## Features

Once setup is complete, you'll have:
- ✅ Automatic report generation on every push
- ✅ Historical test data and trends
- ✅ Beautiful interactive HTML reports
- ✅ PR comments with report links
- ✅ Test failure analysis
- ✅ Performance metrics and graphs
import { Page, Locator } from '@playwright/test';

export class TenantPage {
  private page: Page;
  private createTenantButton: Locator;
  
  // Step 1: Basic Info
  private tenantNameInput: Locator;
  private companyNameInput: Locator;
  private domainInput: Locator;
  private adminFirstNameInput: Locator;
  private adminLastNameInput: Locator;
  private adminEmailInput: Locator;
  
  // Navigation buttons
  private nextButton: Locator;
  private previousButton: Locator;
  private createButton: Locator;
  
  // Feedback elements
  private successMessage: Locator;
  private errorMessage: Locator;
  private tenantsList: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation to create tenant - use the button in main content area, not sidebar
    this.createTenantButton = page.getByRole('main').getByRole('link', { name: 'Add Tenant' });
    
    // Step 1: Basic Info fields
    this.tenantNameInput = page.getByRole('textbox', { name: 'Tenant Name *' });
    this.companyNameInput = page.getByRole('textbox', { name: 'Company Name *' });
    this.domainInput = page.getByRole('textbox', { name: 'Domain *' });
    this.adminFirstNameInput = page.getByRole('textbox', { name: 'Admin First Name *' });
    this.adminLastNameInput = page.getByRole('textbox', { name: 'Admin Last Name *' });
    this.adminEmailInput = page.getByRole('textbox', { name: 'Admin Email *' });
    
    // Navigation buttons
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.previousButton = page.getByRole('button', { name: 'Previous' });
    this.createButton = page.getByRole('button', { name: 'Create Tenant' });
    
    // Feedback
    this.successMessage = page.locator('[role="status"]:has-text("success"), [role="alert"]:has-text("success")');
    this.errorMessage = page.locator('[role="alert"]:has-text("error")');
    this.tenantsList = page.locator('table tbody tr');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/tenants');
  }

  async clickCreateTenant(): Promise<void> {
    await this.createTenantButton.click();
    // Wait for the form to load
    await this.page.waitForURL('**/tenants/new');
  }

  async fillTenantFormMultiStep(data: {
    name: string;
    companyName: string;
    domain: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
  }): Promise<void> {
    // Step 1: Basic Information
    await this.tenantNameInput.fill(data.name);
    await this.companyNameInput.fill(data.companyName);
    await this.domainInput.fill(data.domain);
    await this.adminFirstNameInput.fill(data.adminFirstName);
    await this.adminLastNameInput.fill(data.adminLastName);
    await this.adminEmailInput.fill(data.adminEmail);
    
    // Click Next to go to Fiscal Info
    await this.nextButton.click();
    await this.page.waitForTimeout(500); // Small wait for transition
    
    // Step 2: Fiscal Info - Skip (optional)
    await this.nextButton.click();
    await this.page.waitForTimeout(500);
    
    // Step 3: Legal & Banking - Skip (optional)
    await this.nextButton.click();
    await this.page.waitForTimeout(500);
    
    // Step 4: Subscription - Plan is pre-selected as "Starter"
    // Review info should be visible here
  }

  async submitForm(): Promise<void> {
    // Click Create Tenant button on the final step
    await this.createButton.click();
  }

  async waitForSuccess(): Promise<boolean> {
    try {
      // Wait for either success message or redirect to tenants list
      await Promise.race([
        this.successMessage.waitFor({ state: 'visible', timeout: 10000 }),
        this.page.waitForURL('**/tenants', { timeout: 10000 })
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async findTenantByName(name: string): Promise<boolean> {
    try {
      const tenant = this.page.locator(`tr:has-text("${name}")`);
      await tenant.waitFor({ state: 'visible', timeout: 5000 });
      return await tenant.isVisible();
    } catch {
      return false;
    }
  }

  async activateTenant(name: string): Promise<void> {
    const tenantRow = this.page.locator(`tr:has-text("${name}")`);
    const menuButton = tenantRow.locator('button:has-text("Open menu")');
    await menuButton.click();
    
    const activateButton = this.page.locator('[role="menuitem"]:has-text("Activate")');
    await activateButton.click();
    
    // Confirm activation if there's a dialog
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
  }

  async resendWelcomeEmail(name: string): Promise<void> {
    const tenantRow = this.page.locator(`tr:has-text("${name}")`);
    const menuButton = tenantRow.locator('button:has-text("Open menu")');
    await menuButton.click();
    
    const resendButton = this.page.locator('[role="menuitem"]:has-text("Resend")');
    await resendButton.click();
  }
}
import { Page, Locator } from '@playwright/test';

export class TenantPage {
  private page: Page;
  private createTenantButton: Locator;
  private tenantNameInput: Locator;
  private companyNameInput: Locator;
  private domainInput: Locator;
  private planSelect: Locator;
  private adminEmailInput: Locator;
  private adminFirstNameInput: Locator;
  private adminLastNameInput: Locator;
  private phoneInput: Locator;
  private addressInput: Locator;
  private countryInput: Locator;
  private submitButton: Locator;
  private successMessage: Locator;
  private errorMessage: Locator;
  private tenantsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createTenantButton = page.locator('button:has-text("Create"), button:has-text("New Tenant"), a:has-text("Create Tenant")');
    this.tenantNameInput = page.locator('input[name="name"], input[name="tenantName"]');
    this.companyNameInput = page.locator('input[name="companyName"]');
    this.domainInput = page.locator('input[name="domain"]');
    this.planSelect = page.locator('select[name="plan"], [role="combobox"][name="plan"]');
    this.adminEmailInput = page.locator('input[name="primaryContactEmail"], input[name="adminEmail"]');
    this.adminFirstNameInput = page.locator('input[name="primaryContactFirstName"], input[name="adminFirstName"]');
    this.adminLastNameInput = page.locator('input[name="primaryContactLastName"], input[name="adminLastName"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.addressInput = page.locator('input[name="address"]');
    this.countryInput = page.locator('input[name="country"], select[name="country"]');
    this.submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');
    this.successMessage = page.locator('[role="alert"]:has-text("success"), .success-message, [data-testid="success-message"]');
    this.errorMessage = page.locator('[role="alert"]:has-text("error"), .error-message, [data-testid="error-message"]');
    this.tenantsList = page.locator('table tbody tr, [data-testid="tenant-item"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/tenants');
  }

  async clickCreateTenant(): Promise<void> {
    await this.createTenantButton.click();
    // Wait for form to be visible
    await this.page.waitForSelector('form', { state: 'visible' });
  }

  async fillTenantForm(data: {
    name: string;
    companyName: string;
    domain: string;
    plan: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    phone?: string;
    address?: string;
    country?: string;
  }): Promise<void> {
    await this.tenantNameInput.fill(data.name);
    await this.companyNameInput.fill(data.companyName);
    await this.domainInput.fill(data.domain);
    
    // Handle plan selection (could be select or combobox)
    const isSelect = await this.planSelect.evaluate(el => el.tagName === 'SELECT');
    if (isSelect) {
      await this.planSelect.selectOption(data.plan);
    } else {
      await this.planSelect.click();
      await this.page.locator(`[role="option"]:has-text("${data.plan}")`).click();
    }
    
    await this.adminEmailInput.fill(data.adminEmail);
    await this.adminFirstNameInput.fill(data.adminFirstName);
    await this.adminLastNameInput.fill(data.adminLastName);
    
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
    
    if (data.address) {
      await this.addressInput.fill(data.address);
    }
    
    if (data.country) {
      const countryIsSelect = await this.countryInput.evaluate(el => el.tagName === 'SELECT');
      if (countryIsSelect) {
        await this.countryInput.selectOption(data.country);
      } else {
        await this.countryInput.fill(data.country);
      }
    }
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  async waitForSuccess(): Promise<boolean> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  async getTenantCount(): Promise<number> {
    await this.page.waitForSelector('table, [data-testid="tenant-list"]', { state: 'visible' });
    return await this.tenantsList.count();
  }

  async findTenantByName(name: string): Promise<boolean> {
    const tenant = this.page.locator(`tr:has-text("${name}"), [data-testid="tenant-item"]:has-text("${name}")`);
    return await tenant.isVisible();
  }

  async activateTenant(name: string): Promise<void> {
    const tenantRow = this.page.locator(`tr:has-text("${name}")`);
    const activateButton = tenantRow.locator('button:has-text("Activate")');
    await activateButton.click();
    
    // Handle confirmation dialog if present
    const confirmButton = this.page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
  }

  async resendWelcomeEmail(name: string): Promise<void> {
    const tenantRow = this.page.locator(`tr:has-text("${name}")`);
    const actionsButton = tenantRow.locator('button[aria-label="Actions"], button:has-text("...")');
    await actionsButton.click();
    
    const resendOption = this.page.locator('button:has-text("Resend Welcome Email"), [role="menuitem"]:has-text("Resend")');
    await resendOption.click();
  }
}
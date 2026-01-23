import { chromium } from "playwright";

export const renderHtmlToPdf = async (html: string) => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });
    return Buffer.from(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist") || message.includes("playwright install")) {
      throw new Error("Playwright browsers not installed. Run: npx playwright install");
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export const renderUrlToPdf = async (url: string) => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`Print page error: ${response?.status() ?? "no response"} ${response?.statusText() ?? ""}`.trim());
    }
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });
    await context.close();
    return Buffer.from(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist") || message.includes("playwright install")) {
      throw new Error("Playwright browsers not installed. Run: npx playwright install");
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

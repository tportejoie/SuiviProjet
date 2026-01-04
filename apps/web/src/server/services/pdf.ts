import { chromium } from "playwright";

export const renderHtmlToPdf = async (html: string) => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
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
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
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

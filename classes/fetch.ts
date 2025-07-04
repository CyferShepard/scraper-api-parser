import { launch, connect } from "jsr:@astral/astral";
import { ScraperPayload } from "../models/ScraperPayload.ts";

class Fetch {
  static ws: string | null = null;
  static token: string | null = null;

  static setWs(ws: string): void {
    this.ws = ws;
  }

  static setToken(token: string): void {
    this.token = token;
  }

  static async fetch(payload: ScraperPayload): Promise<Response> {
    if (payload.waitForPageLoad || payload.waitForElement) {
      // Use Puppeteer if waitFor is set
      return await this.fetchWithPuppeteer(payload);
    } else {
      // Use Deno's native fetch otherwise
      return await this.fetchWithNative(payload);
    }
  }

  private static async fetchWithPuppeteer(payload: ScraperPayload): Promise<Response> {
    const isWsConfigured: boolean = this.ws !== null && this.token !== null;
    const ws = `ws://${this.ws}?token=${this.token}`;
    const browser = isWsConfigured
      ? await connect({ wsEndpoint: ws })
      : await launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });

    try {
      // Navigate to the URL
      const page = await browser.newPage(payload.url);
      await page.waitForNetworkIdle({ idleConnections: 0, idleTime: payload.waitDuration });
      //   await page.goto(payload.url, { waitUntil: payload.waitForPageLoad ? "networkidle0" : "load" });
      // await Promise.resolve(payload.waitDuration); // Wait for x miliseconds to ensure the page is fully loaded
      await page.evaluate(async () => {
        // Scroll in steps to allow content to load
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await new Promise((res) => setTimeout(res, 500));
        }
      });
      const body = await page.content(); // Get the response from Puppeteer
      if (!body) {
        console.error(`Failed to load page: ${payload.url}`);
        await browser.close();
        return new Response(null, { status: 500 });
      }

      // Wait for the specified element
      if (payload.waitForElement) {
        await page.waitForSelector(payload.waitForElement, { timeout: 2000 });
      }

      const response = new Response(body, {
        status: 200, // Astral doesn't provide HTTP status, so assume 200
        statusText: "OK",
        headers: new Headers(), // Astral doesn't provide headers, so leave empty
      });

      await browser.close();
      return response;
    } catch (error) {
      console.error(`Error fetching URL with Puppeteer: ${error}`);
      await browser.close();
      return new Response(null, { status: 500 });
    }
  }

  private static async fetchWithNative(payload: ScraperPayload): Promise<Response> {
    let response;
    let headers: HeadersInit = {};
    let body: string | null = null;
    switch (payload.bodyType) {
      case "FORM_DATA":
        headers = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        body = new URLSearchParams(payload.body as Record<string, string>).toString(); // Assuming the first query contains the data to be sent
        break;
      case "JSON":
        headers = {
          "Content-Type": "application/json",
        };
        body = JSON.stringify(payload.body); // Assuming the first query contains the data to be sent
        break;
      default:
        headers = {};
    }
    switch (payload.type) {
      case "POST":
        response = await fetch(payload.url, {
          method: "POST",
          headers: headers,
          body: body, // Assuming the first query contains the data to be sent
        });
        break;
      default:
        response = await fetch(payload.url);
        break;
    }

    return response;
  }
}

export default Fetch;

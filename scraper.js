const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();

const app = express();
app.use(express.json());

let browser;

const generateRequestId = () => {
  // Implement a function to generate a unique request ID
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

app.post('/scrape', async (req, res) => {
  if (!browser) {
    console.log('Launching a new browser instance...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--incognito',
      ],
    });
  }

  const requestId = generateRequestId();
  console.log(`[Request ${requestId}] Start scraping...`);

  const { url, query } = req.body;

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    );

    await page.setViewport({ width: 800, height: 600 });

    const searchUrl = `${url}?query=${query}`;
    console.log(`[Request ${requestId}] Going to URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 0 });
    console.log(`[Request ${requestId}] Page load complete.`);

    const products = await page.evaluate(() => {
      const productList = [];

      for (let i = 0; i < 10; i++) {
        const priceEl = document.querySelectorAll('.b-list-advert__price-base .qa-advert-price')[i];
        if (!priceEl) break;

        const price = priceEl.innerText.trim();
        const titleEl = document.querySelectorAll('.b-advert-title-inner.qa-advert-title')[i];
        if (!titleEl) break;

        const title = titleEl.innerText.trim();
        const linkEl = document.querySelectorAll('.b-list-advert-base.qa-advert-list-item')[i];
        if (!linkEl) break;

        const link = linkEl.getAttribute('href');

        productList.push({
          Product: title,
          Price: price,
          Link: `https://jiji.com.et${link}`,
        });
      }

      return productList;
    });

    console.log(`[Request ${requestId}] Scraping completed.`);

    await page.close();

    console.log(`[Request ${requestId}] Response sent.`);
    res.status(200).json({ products });
  } catch (err) {
    if (browser) {
      await browser.close();
      browser = null;
    }

    console.error(`[Request ${requestId}] Error:`, err);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
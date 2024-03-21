const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

let browserPool = [];

app.use(express.json());

app.post('/scrape', (req, res) => {
  const { url, query } = req.body;

  if (!url || !query) {
    return res.status(400).json({ error: 'URL and query are required.' });
  }

  if (browserPool.length === 0) {
    // If there are no available browsers, wait for a new one to become available
    return new Promise((resolve) => {
      const checkBrowserAvailability = setInterval(async () => {
        if (browserPool.length > 0) {
          // A new browser became available, use it to process the request
          const browser = browserPool.shift();
          clearInterval(checkBrowserAvailability);
          processRequest(browser, url, query, res);
          resolve();
        }
      }, 100);
    });
  } else {
    // Process the request using an available browser
    const browser = browserPool.shift();
    processRequest(browser, url, query, res);
  }
});

const processRequest = async (browser, url, query, res) => {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const products = await page.evaluate(() => {
      const productList = [];

      for (let i = 0; i < 6; i++) {
        const price = document.querySelectorAll('.b-list-advert__price-base .qa-advert-price')[i].innerText.trim();
        const title = document.querySelectorAll('.b-advert-title-inner.qa-advert-title')[i].innerText.trim();
        const link = document.querySelectorAll('.b-list-advert-base.qa-advert-list-item')[i].getAttribute('href');

        productList.push({
          Product: title,
          Price: price,
          Link: `https://jiji.com.et${link}`,
        });
      }

      return productList;
    });

    console.log(`[${req.id}] Scraping success: 200 OK `);
    res.status(200).json({ products });

    // Add the browser back to the pool
    browserPool.push(browser);
    browser.close();

  } catch (err) {
    console.error(`[${req.id}] Scraping error: ${err.message}`);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });

    // Add the browser back to the pool
    browserPool.push(browser);
    browser.close();
  }
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
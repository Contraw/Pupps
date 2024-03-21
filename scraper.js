const puppeteer = require('puppeteer');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const BROWSER_POOL_SIZE = 5;
let browserPool = [];

(async () => {
  for (let i = 0; i < BROWSER_POOL_SIZE; i++) {
    const browser = await puppeteer.launch();
    browserPool.push(browser);
  }
})();

app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, query } = req.body;
  const requestId = uuidv4();

  console.log(`[${requestId}] Scraping data for query: ${query}`);

  const browser = browserPool.shift();
  const page = await browser.newPage();

  try {
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

    res.status(200).json({ products });
  } catch (err) {
    console.error(`[${requestId}] Scraping error: ${err.message}`);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });
  } finally {
    browserPool.push(browser);
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
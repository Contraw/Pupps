const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

let browser;

// Launch browser with error handling
async function launchBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x664) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--remote-debugging-port=0',
        '--autoplay-policy=user-gestures-required',
        '--disable-infobars',
        '--hide-scrollbars',
        '--mute-audio',
        '--headless',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling'
      ]
    });
    console.log('Browser launched successfully.');
  } catch (err) {
    console.error('Error launching browser:', err);
    process.exit(1);
  }
}

// Set up Express app
app.post('/scrape', async (req, res) => {
  const { url, query } = req.body;
  if (!url || !query) {
    return res.status(400).json({ error: 'URL and query are required.' });
  }

  try {
    const startTime = Date.now();

    // Create a new page
    const page = await browser.newPage();

    // Set default navigation timeout
    page.setDefaultNavigationTimeout(15000);

    // Set up request interception
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to the URL with query
    const searchUrl = `${url}?${query}`;
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded'
    });

    // Extract data from the page
    const products = await page.$$eval('.b-list-advert__price-base .qa-advert-price', (prices) => {
      const result = [];
      for (let i = 0; i < 5 && i < prices.length; i++) {
        const price = prices[i].innerText.trim();
        const titleEl = document.querySelectorAll('.b-advert-title-inner.qa-advert-title')[i];
        if (!titleEl) break;

        const product = titleEl.innerText.trim();
        const linkEl = document.querySelectorAll('.b-list-advert-base.qa-advert-list-item')[i];
        if (!linkEl) break;

        const link = `https://jiji.com.et` + linkEl.getAttribute('href');
        result.push({ product, price, link });
      }
      return result;
    });

    // Close the page
    await page.close();

    // Calculate time taken
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    console.log(`Scraping took ${timeTaken} seconds.`);

    // Send response
    res.status(200).json({ products, timeTaken });
  } catch (err) {
    console.error('Scraping error:', err);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });
  }
});

// Start the server and launch the browser
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await launchBrowser();
});
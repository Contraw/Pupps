const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
    args: ['--no-sandbox',
           '--disable-setuid-sandbox',
           '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x664) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
          //  '--disable-dev-shm-usage',
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
}


let browserPromise = launchBrowser();

app.post('/scrape', async (req, res) => {
  const { url, query } = req.body;
  if (!url || !query) {
    return res.status(400).json({ error: 'URL and query are required.' });
  }

  try {
    const startTime = Date.now();
    const browser = await browserPromise;
    const page = await browser.newPage();
    const searchUrl = `${url}?${query}`;
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'sub_frame', 'script'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    const products = await page.evaluate(() => {
      const result = [];
      for (let i = 0; i < 5; i++) {
          const priceEl = document.querySelectorAll('.b-list-advert__price-base .qa-advert-price')[i];
          if (!priceEl) break;
  
          const price = priceEl.innerText.trim();
          const titleEl = document.querySelectorAll('.b-advert-title-inner.qa-advert-title')[i];
          if (!titleEl) break;
  
          const product = titleEl.innerText.trim();
          const linkEl = document.querySelectorAll('.b-list-advert-base.qa-advert-list-item')[i];
          if (!linkEl) break;
  
          const link =`https://jiji.com.et`+linkEl.getAttribute('href');
          result.push({ product, price, link });
      }
      return result;
    });

    await page.close();

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    console.log(`Scraping took ${timeTaken} seconds.`);

    res.status(200).json({ products, timeTaken });
  } catch (err) {
    console.error('Scraping error:', err);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, query } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: true,
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

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    );

    await page.setViewport({ width: 800, height: 600 });

    const searchUrl = `${url}?query=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
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

    await browser.close();

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while scraping the data.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, query } = req.body;

  try {
    // Launch a headless instance of Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Construct the search URL with the query parameter
    const searchUrl = `${url}?query=${encodeURIComponent(query)}`;

    // Go to the search URL and wait for the page to load completely
    await page.goto(searchUrl);

    // Scrape product data from the page
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

    // Close the Puppeteer instance
    await browser.close();

    // Send the scraped data back to the client in JSON format
    res.status(200).json(data);
  } catch (err) {
    console.error(err);res.status(500).json({ error: 'An error occurred while scraping the data.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
 Puppeteer-Q

 ```const url = 'https://jiji.com.et/search';
    const query = 'iphonex';

    const payload = {
        url,
        query,
    };

    fetch('http://localhost:3000/scrape', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
 body: JSON.stringify(payload),
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));```
    
    ```node file_name.js ```

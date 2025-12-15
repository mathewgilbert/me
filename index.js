const express = require('express');
const axios = require('axios');

const app = express();

const backends = [
  { url: 'https://2mathewww.github.io', alive: false },
  { url: 'https://2www.netlify.app', alive: false },
];

let index = 0;

async function checkBackend(b) {
  try {
    const r = await axios.get(b.url, {
      timeout: 5000,
      validateStatus: () => true,
    });
    b.alive = r.status >= 200 && r.status < 500;
  } catch {
    b.alive = false;
  }
}

async function checkAll() {
  for (const b of backends) await checkBackend(b);
}

setInterval(checkAll, 30000);
checkAll();

function getBackend() {
  const alive = backends.filter(b => b.alive);
  if (!alive.length) return null;
  const b = alive[index % alive.length];
  index++;
  return b.url;
}

app.use(async (req, res) => {
  const base = getBackend();
  if (!base) return res.status(503).end();

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    const r = await axios({
      url: base + req.originalUrl,
      method: req.method,
      headers,
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: () => true,
    });

    res.status(r.status);

    for (const [k, v] of Object.entries(r.headers)) {
      if (k !== 'content-encoding') res.setHeader(k, v);
    }

    res.send(r.data);
  } catch {
    res.status(502).end();
  }
});

app.get('/stats.json', (req, res) => {
  res.json({
    backends: backends.map(b => ({
      url: b.url,
      alive: b.alive
    }))
  });
});

app.listen(3000);
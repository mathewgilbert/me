const express = require('express');
const axios = require('axios');

const app = express();

const backends = [
  { url: 'https://2mathewww.github.io', alive: true },
  { url: 'https://2www.netlify.app', alive: true },
];

let index = 0;

const stats = {};
backends.forEach(b => {
  stats[b.url] = { hits: 0, errors: 0, last: null };
});

function nextBackend() {
  const alive = backends.filter(b => b.alive);
  if (!alive.length) return null;
  const b = alive[index % alive.length];
  index++;
  return b;
}

setInterval(async () => {
  for (const b of backends) {
    try {
      await axios.get(b.url, { timeout: 5000 });
      b.alive = true;
    } catch {
      b.alive = false;
    }
  }
}, 30000);

app.get('/stats.json', (req, res) => {
  res.json(stats);
});

app.use(async (req, res) => {
  const backend = nextBackend();
  if (!backend) return res.status(503).end();

  const target = backend.url + req.originalUrl;

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    const r = await axios({
      url: target,
      method: req.method,
      headers,
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: () => true,
    });

    stats[backend.url].hits++;
    stats[backend.url].last = Date.now();

    res.status(r.status);
    for (const [k, v] of Object.entries(r.headers)) {
      if (k !== 'content-encoding') res.setHeader(k, v);
    }

    res.send(r.data);
  } catch {
    stats[backend.url].errors++;
    res.status(502).end();
  }
});

app.listen(3000);

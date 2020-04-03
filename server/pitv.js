/* eslint-disable no-console */

const path = require('path');
const http = require('http');
const express = require('express');
const iptv = require('./iptv.js');

const port = 8080;

async function main() {
  const app = express();
  const options = { dotfiles: 'ignore', etag: false, extensions: ['html'], index: 'pitv.html', maxAge: '0', redirect: false };

  app.use((req, res, next) => { // default callback
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.on('finish', () => console.info(`${req.protocol}/${req.httpVersion} code:${res.statusCode} src:${req.client.remoteFamily}/${req.ip} ${req.method} ${req.headers.host}${req.url}`));
    next();
  });

  app.use((err, req, res, next) => { // callback with error function signature
    console.warn(`${req.protocol}/${req.httpVersion} error:${err.status} src:${req.client.remoteFamily}/${req.ip} ${req.method} ${req.headers.host}${req.url} Message:${err.message}`);
    res.status(err.status || 500).send(`<p style="background:#555555; color: lightcoral; font-family: roboto; font-size: 20px; padding: 10px"> error code: ${err.status} ${err.message} </p>`);
    next(err);
  });

  app.use(express.static(path.join(__dirname, '../public'), options));
  app.get('/iptv', async (req, res) => res.json(await iptv.list()));
  app.get('*', (req, res) => res.status(404).send(`<p style="background:#555555; color: lightcoral; font-family: roboto; font-size: 20px; padding: 10px"> error code 404: ${req.url} </p>`));

  const server = http.createServer(app);
  server.on('listening', () => console.log(`Server HTTP listening on ${server.address().family} ${server.address().address}:${server.address().port}`));
  server.listen(port);
}

main();

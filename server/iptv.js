/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable guard-for-in */

const fs = require('fs');
const path = require('path');
const M3U8FileParser = require('m3u8-file-parser');

let urls = [];

async function log(txt) {
  if (!module.parent) console.log(txt);
}

async function processItem(item, data) {
  // const groups = [];
  // const errors = [];
  // const channels = [];
  if (!item.inf) {
    data.errors.push({ name: 'unknown', text: 'missing inf section' });
    return;
  }
  if (!item.inf.title) {
    data.errors.push({ name: 'unknown', text: 'missing channel title' });
    return;
  }
  if (!item.url || !item.url.startsWith('http')) {
    data.errors.push({ name: item.inf.title, url: item.url, text: 'invalid url' });
    return;
  }
  if (urls.includes(item.url)) {
    data.errors.push({ name: item.inf.title, url: item.url, text: 'duplicate' });
    return;
  }
  let group = item.inf.groupTitle || '';
  let name = item.inf.title.replace(/([[(])(.+?)([\])])/g, '').replace('VIP ', '').trim() || '';
  if (name.includes('SD ')) name = name.replace('SD ', '');
  if (name.includes('HD ')) name = name.replace('HD ', '');
  if (name.includes(': ')) {
    const partial = name.split(': ');
    group = partial[0].trim();
    name = partial[1].replace(group, '').trim();
  }
  const logo = item.inf.tvgLogo || '';
  if (!data.groups.includes(group)) {
    data.groups.push(group);
  }
  urls.push(item.url);
  data.channels.push({ name, group, logo, url: item.url, verified: false, valid: true });
}

async function processFile(file, data) {
  const content = fs.readFileSync(file, { encoding: 'utf-8' });
  const reader = new M3U8FileParser();
  reader.read(content);
  const m3u = reader.getResult();
  reader.reset();
  data.entries = m3u.segments.length;
  for (const item of m3u.segments) await processItem(item, data);
}

async function processFolder() {
  const iptv = [];
  urls = [];
  const files = fs.readdirSync('lists', 'utf-8');
  for (const file of files) {
    if (file.toLowerCase().endsWith('m3u')) {
      log(`processing file: ${file}`);
      const data = { channels: [], groups: [], errors: [] };
      await processFile(path.join('lists', file), data);
      data.channels.sort((a, b) => (`${a.group}${a.name}` > `${b.group}${b.name}` ? 1 : -1));
      iptv.push({ file, entries: data.entries, groups: data.groups, channels: data.channels, errors: data.errors });
      log(`channels: ${data.channels.length} groups: ${data.groups.length} errors: ${data.errors.length}`);
    } else {
      log(`skipping file: ${file}`);
    }
  }
  return iptv;
}

async function generateM3U(data) {
  const out = 'out.m3u';
  let text = '';
  let total = 0;
  for (const file of data) {
    for (const channel of file.channels) {
      total += 1;
      text += `#EXTINF:-1 tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}\n${channel.url}\n\n`;
    }
  }
  fs.writeFileSync(out, text);
  log(`created m3u: ${out} channel ${total}`);
}

async function diag() {
  if (!module.parent) {
    const data = await processFolder();
    generateM3U(data);
  }
}

if (!module.parent) diag();
exports.list = processFolder;
exports.m3u = generateM3U;

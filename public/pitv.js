/* global Hls */

let iptv = [];
let state = {};
let hls;

function ok(str, bool) {
  return `<span style="color: black; background-color: ${bool ? 'lightgreen' : 'lightgray'}">&nbsp${str.toUpperCase()}&nbsp</span>&nbsp`;
}

function color(obj) {
  let text = '';
  for (const [key, value] of Object.entries(obj)) {
    text += `<span style="color: black; background-color: ${value ? 'lightgreen' : 'lightcoral'}">&nbsp${key.toUpperCase()}&nbsp</span>&nbsp`;
  }
  return text;
}

async function updateStats() {
  if (state.playing) state.error = null;
  let text = `
    ${color(state)} ${ok('network', hls.media.readyState === 4)}
    <span style="color: black; background-color: lightgray">&nbspResolution: ${hls.media.videoWidth} x ${hls.media.videoHeight}&nbsp</span>&nbsp`;
  if (state.error) {
    text += `
    <br><span style="color: black; background-color: lightcoral">
    <b>Last error:</b> ${state.error.time.toISOString()} &nbsp ${state.error.type} ${state.error.details} &nbsp ${state.error.response ? state.error.response.code : ''} ${state.error.response ? state.error.response.text : ''}
    </span>`;
  }
  document.getElementById('status').innerHTML = text;
  setTimeout(updateStats, 1000);
}

async function highlightChannel(url) {
  for (const div of document.getElementById('channels').children) {
    if (div.tag === url) div.style = 'background: #555555';
    else div.style = 'background: #333333';
  }
}

async function play(channel) {
  highlightChannel(channel.url);
  const video = document.getElementById('video');
  hls = new Hls();
  hls.loadSource(channel.url);
  hls.attachMedia(video);
  state = { metadata: false, data: false, ready: false, playing: false, buffering: false, stalled: false, paused: false, ended: false };
  hls.on(Hls.Events.ERROR, (ev, data) => { state.error = data; state.error.time = new Date(); });
  hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  updateStats();
  const m3u = `#EXTINF:-1 tvg-logo="${channel.url}" group-title="${channel.group}",${channel.name}\n${channel.url}\n\n`;
  navigator.clipboard.writeText(m3u)
    .then(() => {
      // document.getElementById('url').innerHTML = m3u;
    });
}

async function channels(source = 0, group = '') {
  const div = document.getElementById('channels');
  div.innerHTML = 'Channels';
  const filtered = group !== '' ? iptv[source].channels.filter((channel) => channel.group === group) : iptv[source].channels;
  const sorted = filtered.sort((a, b) => (a.name > b.name ? 1 : -1));
  sorted.forEach((channel, i) => {
    const logo = channel.logo || 'icon.png';
    const elem = document.createElement('div');
    elem.className = 'channel';
    elem.id = `channel-${i}`;
    elem.tag = channel.url;
    elem.addEventListener('click', () => play(channel));
    elem.innerHTML = `<img src="${logo}" width=64 height=32 style="padding: 4px"></img><span tag=${i}>${channel.name}</span><br>`;
    div.appendChild(elem);
  });
}

async function groups(source = 0) {
  const div = document.getElementById('groups');
  div.innerHTML = 'Channel Groups';
  // div.addEventListener('click', () => { for (const child of div.children) child.hidden = !child.hidden; });
  iptv[source].groups.forEach((group, i) => {
    const elem = document.createElement('div');
    elem.className = 'group';
    elem.id = `group-${i}`;
    elem.addEventListener('click', () => channels(source, group));
    elem.innerHTML = `<span tag=${i}>${group || 'Default'}</span>`;
    div.appendChild(elem);
  });
  document.getElementById('channels').innerHTML = 'Channels';
  channels(source);
}

async function errors(source = 0) {
  const div = document.getElementById('errors');
  div.innerHTML = 'Errors';
  // div.addEventListener('click', () => { for (const child of div.children) child.hidden = !child.hidden; });
  iptv[source].errors.forEach((error, i) => {
    const elem = document.createElement('div');
    elem.className = 'channel';
    elem.id = `error-${i}`;
    elem.style = 'font-size: 0.8rem';
    elem.innerHTML = `
      <span style="color: lightyellow" tag=${i}>${error.name}</span><br>
      <span style="color: lightgray" tag=${i}>${error.url}</span><br>
      <span style="color: lightcoral" tag=${i}>${error.text}</span>`;
    div.appendChild(elem);
  });
}

async function sources() {
  const div = document.getElementById('sources');
  div.innerHTML = 'Playlists';
  // div.addEventListener('click', () => { for (const child of div.children) child.hidden = !child.hidden; });
  iptv.forEach((source, i) => {
    const elem = document.createElement('div');
    elem.className = 'group';
    elem.id = `source-${i}`;
    elem.addEventListener('click', () => {
      groups(i);
      errors(i);
    });
    const verified = source.channels.filter((channel) => channel.verified === true).length;
    const valid = source.channels.filter((channel) => channel.valid === true).length;
    elem.innerHTML = `
          <span style="color: lightblue" tag=${i}>${source.file.replace('lists/', '')}</span><br>
          <span style="color: lightgray">${source.entries} channels | ${valid} valid | ${verified} verified | ${source.errors.length} failed</span><br>
        `;
    document.getElementById('sources').appendChild(elem);
  });
  groups();
  errors();
}

async function init() {
  const video = document.getElementById('video');
  video.onplay = () => { state = { metadata: false, data: false, ready: false, playing: false, buffering: false, stalled: false, paused: false, ended: false, error: null }; };
  video.onloadedmetadata = () => { state.metadata = true; };
  video.onloadeddata = () => { state.data = true; };
  video.oncanplay = () => { state.ready = true; };
  video.onended = () => { state.ended = false; state.playing = false; };
  video.onpause = () => { state.paused = true; state.playing = false; };
  video.onstalled = () => { state.stalled = true; state.playing = false; };
  video.onwaiting = () => { state.buffering = true; state.playing = false; };
  video.onplaying = () => { state.playing = true; state.buffering = false; state.stalled = false; state.paused = false; };
}

async function main() {
  const res = await fetch('/iptv');
  if (res && res.ok) iptv = await res.json();
  sources();
  init();
}

window.onload = main;

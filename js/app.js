// ===== Player Module =====
var Player = (function () {
  var audio = document.getElementById('audioPlayer');

  var callbacks = { onTimeUpdate: null, onEnded: null, onLoaded: null };

  audio.addEventListener('timeupdate', function () {
    if (callbacks.onTimeUpdate) callbacks.onTimeUpdate(audio.currentTime, audio.duration);
  });
  audio.addEventListener('ended', function () {
    if (callbacks.onEnded) callbacks.onEnded();
  });
  audio.addEventListener('loadedmetadata', function () {
    if (callbacks.onLoaded) callbacks.onLoaded(audio.duration);
  });

  return {
    load: function (src) { audio.src = src; audio.load(); },
    play: function () {
      var p = audio.play();
      if (p) p.catch(function (e) { console.warn('Play failed:', e); });
    },
    pause: function () { audio.pause(); },
    togglePlay: function () { audio.paused ? this.play() : this.pause(); },
    isPlaying: function () { return !audio.paused; },
    seek: function (t) { audio.currentTime = t; },
    setVolume: function (v) { audio.volume = Math.max(0, Math.min(1, v)); },
    getVolume: function () { return audio.volume; },
    getCurrentTime: function () { return audio.currentTime; },
    getDuration: function () { return audio.duration || 0; },
    on: function (ev, cb) { callbacks[ev] = cb; }
  };
})();

// ===== Playlist Module =====
var Playlist = (function () {
  var list = [];
  var currentIndex = -1;
  var playMode = 'list-loop';

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function parseName(fileName) {
    var name = fileName.replace(/\.[^.]+$/, '');
    var m = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '\u672A\u77E5\u6B4C\u624B', title: name };
  }

  return {
    add: function (files) {
      var items = Array.from(files).map(function (f) {
        var p = parseName(f.name);
        return { id: genId(), title: p.title, artist: p.artist, duration: 0, blobUrl: URL.createObjectURL(f), fileName: f.name, file: f };
      });
      list = list.concat(items);
      if (currentIndex === -1 && list.length > 0) currentIndex = 0;
      return items;
    },
    remove: function (i) {
      if (i < 0 || i >= list.length) return;
      if (list[i].blobUrl) URL.revokeObjectURL(list[i].blobUrl);
      list.splice(i, 1);
      if (list.length === 0) currentIndex = -1;
      else if (i < currentIndex) currentIndex--;
      else if (i === currentIndex) currentIndex = Math.min(currentIndex, list.length - 1);
    },
    clear: function () {
      list.forEach(function (t) { if (t.blobUrl) URL.revokeObjectURL(t.blobUrl); });
      list = []; currentIndex = -1;
    },
    getList: function () { return list; },
    getCurrent: function () { return (currentIndex >= 0 && currentIndex < list.length) ? list[currentIndex] : null; },
    getCurrentIndex: function () { return currentIndex; },
    setCurrent: function (i) { if (i >= 0 && i < list.length) currentIndex = i; },
    next: function () {
      if (list.length === 0) return null;
      if (playMode === 'list-loop') currentIndex = (currentIndex + 1) % list.length;
      else if (playMode === 'shuffle') currentIndex = Math.floor(Math.random() * list.length);
      return this.getCurrent();
    },
    prev: function () {
      if (list.length === 0) return null;
      if (playMode === 'list-loop') currentIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
      else if (playMode === 'shuffle') currentIndex = Math.floor(Math.random() * list.length);
      return this.getCurrent();
    },
    cycleMode: function () {
      var modes = ['list-loop', 'single-loop', 'shuffle'];
      playMode = modes[(modes.indexOf(playMode) + 1) % modes.length];
      return playMode;
    },
    getMode: function () { return playMode; },
    updateDuration: function (i, d) { if (i >= 0 && i < list.length) list[i].duration = d; },
    count: function () { return list.length; }
  };
})();

// ===== UI Module =====
var UI = (function () {
  var el = {
    playerContainer: document.getElementById('playerContainer'),
    coverImage: document.getElementById('coverImage'),
    trackTitle: document.getElementById('trackTitle'),
    trackArtist: document.getElementById('trackArtist'),
    timeCurrent: document.getElementById('timeCurrent'),
    timeDuration: document.getElementById('timeDuration'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    progressThumb: document.getElementById('progressThumb'),
    btnPlay: document.getElementById('btnPlay'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    btnShuffle: document.getElementById('btnShuffle'),
    btnRepeat: document.getElementById('btnRepeat'),
    btnVolumeIcon: document.getElementById('btnVolumeIcon'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeFill: document.getElementById('volumeFill'),
    volumeThumb: document.getElementById('volumeThumb'),
    btnImport: document.getElementById('btnImport'),
    fileInput: document.getElementById('fileInput'),
    playlist: document.getElementById('playlist'),
    playlistEmpty: document.getElementById('playlistEmpty'),
    btnClear: document.getElementById('btnClear'),
    footerCount: document.getElementById('footerCount'),
    footerMode: document.getElementById('footerMode'),
    audioPlayer: document.getElementById('audioPlayer')
  };

  function fmt(sec) {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function esc(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  return {
    getElements: function () { return el; },
    updateProgress: function (t, d) {
      el.timeCurrent.textContent = fmt(t);
      el.timeDuration.textContent = fmt(d);
      el.progressFill.style.width = d > 0 ? (t / d * 100) + '%' : '0%';
      el.progressThumb.style.left = d > 0 ? (t / d * 100) + '%' : '0%';
    },
    updateVolume: function (v, muted) {
      var lv = muted ? 0 : v;
      el.volumeFill.style.width = (lv * 100) + '%';
      el.volumeThumb.style.left = (lv * 100) + '%';
      el.btnVolumeIcon.textContent = lv === 0 ? '\uD83D\uDD07' : lv < 0.5 ? '\uD83D\uDD09' : '\uD83D\uDD0A';
    },
    updateTrackInfo: function (t) {
      if (t) {
        el.trackTitle.textContent = t.title;
        el.trackArtist.textContent = t.artist;
      } else {
        el.trackTitle.textContent = '\u672A\u9009\u62E9\u6B4C\u66F2';
        el.trackArtist.textContent = '\u8BF7\u5BFC\u5165\u6216\u9009\u62E9\u97F3\u4E50\u5F00\u59CB\u64AD\u653E';
      }
    },
    updatePlayButton: function (playing) {
      var icon = el.btnPlay.querySelector('.icon-play');
      if (icon) icon.textContent = playing ? '\u23F8' : '\u25B6';
    },
    updatePlayMode: function (mode) {
      var map = {
        'list-loop': { btn: el.btnRepeat, icon: '\uD83D\uDD01', label: '\u5217\u8868\u5FAA\u73AF' },
        'single-loop': { btn: el.btnRepeat, icon: '\uD83D\uDD02', label: '\u5355\u66F2\u5FAA\u73AF' },
        'shuffle': { btn: el.btnShuffle, icon: '\uD83D\uDD00', label: '\u968F\u673A\u64AD\u653E' }
      };
      el.btnShuffle.classList.remove('active');
      el.btnRepeat.classList.remove('active');
      var cfg = map[mode];
      if (cfg) { cfg.btn.classList.add('active'); cfg.btn.textContent = cfg.icon; el.footerMode.textContent = cfg.label; }
    },
    renderPlaylist: function (pl, ci) {
      if (pl.length === 0) {
        el.playlistEmpty.style.display = 'flex';
        el.footerCount.textContent = '\u5171 0 \u9996';
        el.btnClear.style.display = 'none';
        Array.from(el.playlist.children).forEach(function (c) { if (!c.classList.contains('playlist-empty')) c.remove(); });
        return;
      }
      el.playlistEmpty.style.display = 'none';
      el.footerCount.textContent = '\u5171 ' + pl.length + ' \u9996';
      el.btnClear.style.display = 'block';
      var exist = el.playlist.querySelectorAll('.playlist-item');
      exist.forEach(function (it) { it.remove(); });
      pl.forEach(function (t, i) {
        var li = document.createElement('li');
        li.className = 'playlist-item' + (i === ci ? ' active' : '');
        li.dataset.index = i;
        li.innerHTML = '<span class="playlist-item-index">' + (i + 1) + '</span>' +
          '<div class="playlist-item-info"><div class="playlist-item-title">' + esc(t.title) + '</div><div class="playlist-item-artist">' + esc(t.artist) + '</div></div>' +
          '<span class="playlist-item-duration">' + fmt(t.duration) + '</span>' +
          '<button class="playlist-item-remove" data-index="' + i + '">\u2715</button>';
        el.playlist.appendChild(li);
      });
    },
    highlightItem: function (ci) {
      el.playlist.querySelectorAll('.playlist-item').forEach(function (it, i) {
        if (i === ci) { it.classList.add('active'); it.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        else it.classList.remove('active');
      });
    },
    resetProgress: function () {
      el.progressFill.style.width = '0%';
      el.progressThumb.style.left = '0%';
      el.timeCurrent.textContent = '00:00';
      el.timeDuration.textContent = '00:00';
    },
    setDragOver: function (on) {
      el.playerContainer.classList[on ? 'add' : 'remove']('drag-over');
    }
  };
})();

// ===== Main App =====
(function () {
  var el = UI.getElements();
  var seeking = false, volBefore = 0.7;

  Player.on('onTimeUpdate', function (t, d) { if (!seeking) UI.updateProgress(t, d); });
  Player.on('onEnded', function () {
    var n = Playlist.next();
    if (n) playTrack(n); else UI.updatePlayButton(false);
  });
  Player.on('onLoaded', function (d) {
    var cur = Playlist.getCurrent();
    if (cur) { Playlist.updateDuration(Playlist.getCurrentIndex(), d); UI.renderPlaylist(Playlist.getList(), Playlist.getCurrentIndex()); }
  });

  function playTrack(track) {
    Player.load(track.blobUrl); Player.play();
    UI.updateTrackInfo(track); UI.updatePlayButton(true);
    UI.resetProgress(); UI.highlightItem(Playlist.getCurrentIndex());
  }

  function importFiles(files) {
    if (!files || files.length === 0) return;
    var added = Playlist.add(files);
    UI.renderPlaylist(Playlist.getList(), Playlist.getCurrentIndex());
    var cur = Playlist.getCurrent();
    if (cur && Playlist.count() === added.length) playTrack(cur);
  }

  el.btnImport.addEventListener('click', function () { el.fileInput.click(); });
  el.fileInput.addEventListener('change', function (e) { importFiles(e.target.files); el.fileInput.value = ''; });

  el.btnPlay.addEventListener('click', function () {
    if (!Playlist.getCurrent()) return;
    Player.togglePlay(); UI.updatePlayButton(Player.isPlaying());
  });

  el.btnPrev.addEventListener('click', function () { var t = Playlist.prev(); if (t) playTrack(t); });
  el.btnNext.addEventListener('click', function () { var t = Playlist.next(); if (t) playTrack(t); });
  el.btnShuffle.addEventListener('click', function () { UI.updatePlayMode(Playlist.cycleMode()); });
  el.btnRepeat.addEventListener('click', function () { UI.updatePlayMode(Playlist.cycleMode()); });

  el.progressBar.addEventListener('mousedown', function (e) {
    seeking = true; seekPos(e);
    document.addEventListener('mousemove', onPMove);
    document.addEventListener('mouseup', onPUp);
  });
  function onPMove(e) { seekPos(e); }
  function onPUp() { seeking = false; document.removeEventListener('mousemove', onPMove); document.removeEventListener('mouseup', onPUp); }
  function seekPos(e) {
    var r = el.progressBar.querySelector('.progress-track').getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    var dur = Player.getDuration();
    if (dur > 0) { Player.seek(pct * dur); UI.updateProgress(pct * dur, dur); }
  }

  el.volumeSlider.addEventListener('mousedown', function (e) {
    setVol(e);
    document.addEventListener('mousemove', onVMove);
    document.addEventListener('mouseup', onVUp);
  });
  function onVMove(e) { setVol(e); }
  function onVUp() { document.removeEventListener('mousemove', onVMove); document.removeEventListener('mouseup', onVUp); }
  function setVol(e) {
    var r = el.volumeSlider.querySelector('.volume-track').getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    Player.setVolume(pct); UI.updateVolume(pct, false); volBefore = pct;
  }

  el.btnVolumeIcon.addEventListener('click', function () {
    var v = Player.getVolume();
    if (v > 0) { volBefore = v; Player.setVolume(0); UI.updateVolume(0, true); }
    else { Player.setVolume(volBefore); UI.updateVolume(volBefore, false); }
  });

  el.playlist.addEventListener('click', function (e) {
    var rm = e.target.closest('.playlist-item-remove');
    if (rm) {
      e.stopPropagation();
      var idx = parseInt(rm.dataset.index), ci = Playlist.getCurrentIndex();
      Playlist.remove(idx);
      if (Playlist.count() === 0) { Player.pause(); UI.updatePlayButton(false); UI.updateTrackInfo(null); UI.resetProgress(); }
      else if (idx === ci) { var cur = Playlist.getCurrent(); if (cur) playTrack(cur); }
      UI.renderPlaylist(Playlist.getList(), Playlist.getCurrentIndex());
      return;
    }
    var it = e.target.closest('.playlist-item');
    if (it) {
      var idx = parseInt(it.dataset.index);
      if (idx === Playlist.getCurrentIndex() && Player.isPlaying()) return;
      Playlist.setCurrent(idx);
      var cur = Playlist.getCurrent();
      if (cur) playTrack(cur);
    }
  });

  el.btnClear.addEventListener('click', function () {
    Player.pause(); Playlist.clear();
    UI.updatePlayButton(false); UI.updateTrackInfo(null); UI.resetProgress();
    UI.renderPlaylist(Playlist.getList(), Playlist.getCurrentIndex());
  });

  var container = el.playerContainer;
  container.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); UI.setDragOver(true); });
  container.addEventListener('dragleave', function (e) { e.preventDefault(); e.stopPropagation(); UI.setDragOver(false); });
  container.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation(); UI.setDragOver(false);
    var audioFiles = Array.from(e.dataTransfer.files).filter(function (f) { return f.type.startsWith('audio/'); });
    if (audioFiles.length > 0) importFiles(audioFiles);
  });

  Player.setVolume(0.7); UI.updateVolume(0.7, false); UI.updatePlayMode(Playlist.getMode());
})();
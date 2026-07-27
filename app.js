(function(){

  // ---------- mobile & capabilities detection ----------
  function handleMobileDeviceCapabilities(){
    var isMobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 800);
    var lacksDisplayMedia = !(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    if(isMobileOS || lacksDisplayMedia){
      // Hide live recording controls & show fallback banner
      var recAudioOptions = document.getElementById('recAudioOptions');
      var recControlsRow = document.getElementById('recControlsRow');
      var recHintText = document.getElementById('recHintText');
      var mobileRecFallback = document.getElementById('mobileRecFallback');

      if(recAudioOptions) recAudioOptions.hidden = true;
      if(recControlsRow) recControlsRow.hidden = true;
      if(recHintText) recHintText.hidden = true;
      if(mobileRecFallback) mobileRecFallback.hidden = false;

      // Hide live screenshot capture buttons & show fallback banner
      var shotButtonsRow = document.getElementById('shotButtonsRow');
      var shotHintText = document.getElementById('shotHintText');
      var mobileShotFallback = document.getElementById('mobileShotFallback');

      if(shotButtonsRow) shotButtonsRow.hidden = true;
      if(shotHintText) shotHintText.hidden = true;
      if(mobileShotFallback) mobileShotFallback.hidden = false;
    }
  }
  
  handleMobileDeviceCapabilities();

  // ---------- mobile menu ----------
  var hamburgerBtn = document.getElementById('hamburgerBtn');
  var mobileNav = document.getElementById('mobileNav');
  if(hamburgerBtn){
    hamburgerBtn.addEventListener('click', function(){
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobileNav.classList.remove('open'); });
    });
  }

  // ---------- scroll reveal ----------
  if('IntersectionObserver' in window){
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function(el){ revealObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ---------- side nav active link ----------
  var sideLinks = document.querySelectorAll('.side-nav a');
  if(sideLinks.length && 'IntersectionObserver' in window){
    var sectionMap = {};
    sideLinks.forEach(function(a){ sectionMap[a.dataset.target] = a; });
    var navObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var link = sectionMap[entry.target.id];
        if(!link) return;
        if(entry.isIntersecting){
          sideLinks.forEach(function(a){ a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    document.querySelectorAll('.tool-section').forEach(function(sec){ navObserver.observe(sec); });
  }

  function fmt(t){
    if(!isFinite(t)) return '0:00';
    var m = Math.floor(t/60), s = Math.floor(t%60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------- dark mode ----------
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var sunIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var moonIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('ss-theme', t); }catch(e){}
    if(themeToggleBtn) themeToggleBtn.innerHTML = t === 'dark' ? sunIcon : moonIcon;
  }
  var savedTheme = 'light';
  try{ savedTheme = localStorage.getItem('ss-theme') || 'light'; }catch(e){}
  applyTheme(savedTheme);
  if(themeToggleBtn){
    themeToggleBtn.addEventListener('click', function(){
      var cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------- hero word stagger ----------
  var heroTitle = document.getElementById('heroTitle');
  if(heroTitle){
    var heroWords = heroTitle.querySelectorAll('.hero-word');
    heroWords.forEach(function(w, i){ w.style.transitionDelay = (i * 0.045) + 's'; });
    if('IntersectionObserver' in window){
      var heroObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            heroObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      heroObserver.observe(heroTitle);
    } else {
      heroTitle.classList.add('is-visible');
    }
  }

  // ---------- local visit counter ----------
  var visitCounterEl = document.getElementById('visitCounter');
  if(visitCounterEl){
    try{
      var visits = parseInt(localStorage.getItem('ss-visits') || '0', 10) + 1;
      localStorage.setItem('ss-visits', visits);
      visitCounterEl.textContent = 'Opened on this device ' + visits + (visits === 1 ? ' time' : ' times');
    }catch(e){
      visitCounterEl.textContent = '';
    }
  }

  // ================= RECORD TAB =================
  var mediaRecorder, recordedChunks = [], recordedBlobUrl = null;
  var startRecBtn = document.getElementById('startRecBtn');
  var stopRecBtn = document.getElementById('stopRecBtn');
  var recStatus = document.getElementById('recStatus');
  var recResultPanel = document.getElementById('recResultPanel');
  var recDownloadLink = document.getElementById('recDownloadLink');
  var sendToEditorBtn = document.getElementById('sendToEditorBtn');

  var recSystemAudioEl = document.getElementById('recSystemAudio');
  var recMicAudioEl = document.getElementById('recMicAudio');

  if(startRecBtn){
    startRecBtn.addEventListener('click', async function(){
      try{
        var wantsSystemAudio = recSystemAudioEl && recSystemAudioEl.checked;
        var wantsMicAudio = recMicAudioEl && recMicAudioEl.checked;

        // 1. Get Screen / Tab Video (and System Audio if requested)
        var displayMediaOptions = {
          video: true,
          audio: wantsSystemAudio ? { echoCancellation: true, noiseSuppression: true } : false
        };
        var displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

        // 2. Get External / Built-in Microphone Audio if requested
        var micStream = null;
        if(wantsMicAudio){
          try{
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
              video: false
            });
          }catch(micErr){
            alert('Could not access microphone: ' + micErr.message + '\nContinuing without microphone audio.');
          }
        }

        // 3. Combine Video & Audio Tracks into a Single Stream
        var combinedStream = new MediaStream();
        displayStream.getVideoTracks().forEach(function(track){ combinedStream.addTrack(track); });

        var audioTracksToMix = [];
        if(displayStream.getAudioTracks().length > 0) audioTracksToMix.push(displayStream.getAudioTracks()[0]);
        if(micStream && micStream.getAudioTracks().length > 0) audioTracksToMix.push(micStream.getAudioTracks()[0]);

        var audioCtx = null;
        if(audioTracksToMix.length === 1){
          combinedStream.addTrack(audioTracksToMix[0]);
        } else if(audioTracksToMix.length > 1){
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var dest = audioCtx.createMediaStreamDestination();
          audioTracksToMix.forEach(function(track){
            var source = audioCtx.createMediaStreamSource(new MediaStream([track]));
            source.connect(dest);
          });
          if(dest.stream.getAudioTracks().length > 0){
            combinedStream.addTrack(dest.stream.getAudioTracks()[0]);
          }
        }

        recordedChunks = [];
        var mimeType = 'video/webm;codecs=vp9';
        if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType });
        
        mediaRecorder.ondataavailable = function(e){ if(e.data.size > 0) recordedChunks.push(e.data); };
        
        mediaRecorder.onstop = function(){
          var blob = new Blob(recordedChunks, { type: 'video/webm' });
          recordedBlobUrl = URL.createObjectURL(blob);
          recDownloadLink.href = recordedBlobUrl;
          recResultPanel.hidden = false;
          recStatus.innerHTML = '';
          
          displayStream.getTracks().forEach(function(t){ t.stop(); });
          if(micStream) micStream.getTracks().forEach(function(t){ t.stop(); });
          combinedStream.getTracks().forEach(function(t){ t.stop(); });
          if(audioCtx && audioCtx.state !== 'closed') { try{ audioCtx.close(); }catch(e){} }
        };

        displayStream.getVideoTracks()[0].addEventListener('ended', function(){
          if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        });

        mediaRecorder.start();
        startRecBtn.disabled = true;
        stopRecBtn.disabled = false;
        recStatus.innerHTML = '<span class="rec-dot pulsing"></span>Recording...';
      }catch(err){
        recStatus.textContent = 'Could not start recording: ' + err.message;
      }
    });
  }

  if(stopRecBtn){
    stopRecBtn.addEventListener('click', function(){
      if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      startRecBtn.disabled = false;
      stopRecBtn.disabled = true;
    });
  }

  if(sendToEditorBtn){
    sendToEditorBtn.addEventListener('click', function(){
      if(recordedBlobUrl){
        loadVideoIntoEditor(recordedBlobUrl);
        document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ================= EDITOR TAB =================
  var videoFileInput = document.getElementById('videoFileInput');
  var sourceVideo = document.getElementById('sourceVideo');
  var editCanvas = document.getElementById('editCanvas');
  var ctx = editCanvas ? editCanvas.getContext('2d') : null;
  var editorEmpty = document.getElementById('editorEmpty');
  var editorWork = document.getElementById('editorWork');

  var trimStart = document.getElementById('trimStart');
  var trimEnd = document.getElementById('trimEnd');
  var scrub = document.getElementById('scrub');
  var trimStartLabel = document.getElementById('trimStartLabel');
  var trimEndLabel = document.getElementById('trimEndLabel');
  var scrubLabel = document.getElementById('scrubLabel');

  var regions = []; // {type:'mark'|'blur', x, y, w, h, startTime, endTime}
  var regionList = document.getElementById('regionList');
  var activeTool = null;
  var drawing = false, drawStart = null, liveRect = null;

  if(videoFileInput){
    videoFileInput.addEventListener('change', function(){
      var f = videoFileInput.files[0];
      if(f) loadVideoIntoEditor(URL.createObjectURL(f));
    });
  }

  function loadVideoIntoEditor(url){
    regions = [];
    renderRegionList();
    sourceVideo.src = url;
    sourceVideo.onloadedmetadata = function(){
      editCanvas.width = sourceVideo.videoWidth;
      editCanvas.height = sourceVideo.videoHeight;
      var readoutRes = document.getElementById('readoutRes');
      if(readoutRes) readoutRes.textContent = sourceVideo.videoWidth + ' × ' + sourceVideo.videoHeight;
      trimStart.max = trimEnd.max = scrub.max = sourceVideo.duration;
      trimStart.value = 0;
      trimEnd.value = sourceVideo.duration;
      scrub.value = 0;
      updateLabels();
      editorEmpty.hidden = true;
      editorWork.hidden = false;
      sourceVideo.currentTime = 0;
      sourceVideo.addEventListener('seeked', drawCurrentFrame, { once: false });
      drawCurrentFrame();
    };
  }

  function updateLabels(){
    if(trimStartLabel) trimStartLabel.textContent = fmt(parseFloat(trimStart.value));
    if(trimEndLabel) trimEndLabel.textContent = fmt(parseFloat(trimEnd.value));
    if(scrubLabel) scrubLabel.textContent = fmt(parseFloat(scrub.value));
  }

  if(trimStart){
    trimStart.addEventListener('input', function(){
      if(parseFloat(trimStart.value) > parseFloat(trimEnd.value)) trimStart.value = trimEnd.value;
      updateLabels();
      sourceVideo.currentTime = parseFloat(trimStart.value);
    });
  }
  if(trimEnd){
    trimEnd.addEventListener('input', function(){
      if(parseFloat(trimEnd.value) < parseFloat(trimStart.value)) trimEnd.value = trimStart.value;
      updateLabels();
      sourceVideo.currentTime = parseFloat(trimEnd.value);
    });
  }
  if(scrub){
    scrub.addEventListener('input', function(){
      updateLabels();
      sourceVideo.currentTime = parseFloat(scrub.value);
    });
  }

  function drawCurrentFrame(){
    if(!ctx) return;
    ctx.filter = 'none';
    ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
    drawRegionsOnCanvas(ctx);
    if(liveRect) drawLiveRectPreview();
    var readoutTime = document.getElementById('readoutTime');
    if(readoutTime) readoutTime.textContent = fmt(sourceVideo.currentTime) + ' / ' + fmt(sourceVideo.duration);
  }

  function drawRegionsOnCanvas(targetCtx){
    var curTime = sourceVideo.currentTime;

    // Draw active blur regions
    regions.forEach(function(r){
      if(r.type === 'blur' && curTime >= r.startTime && curTime <= r.endTime){
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.rect(r.x, r.y, r.w, r.h);
        targetCtx.clip();
        targetCtx.filter = 'blur(18px)';
        targetCtx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
        targetCtx.restore();
      }
    });

    // Draw active mark regions
    regions.forEach(function(r){
      if(r.type === 'mark' && curTime >= r.startTime && curTime <= r.endTime){
        targetCtx.save();
        targetCtx.filter = 'none';
        targetCtx.strokeStyle = '#2563eb';
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(r.x, r.y, r.w, r.h);
        targetCtx.restore();
      }
    });
  }

  function drawLiveRectPreview(){
    ctx.save();
    ctx.strokeStyle = activeTool === 'blur' ? '#d97706' : '#2563eb';
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 3;
    ctx.strokeRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
    ctx.restore();
  }

  var markToolBtn = document.getElementById('markToolBtn');
  var blurToolBtn = document.getElementById('blurToolBtn');
  var noToolBtn = document.getElementById('noToolBtn');

  if(markToolBtn) markToolBtn.addEventListener('click', function(){ setTool('mark'); });
  if(blurToolBtn) blurToolBtn.addEventListener('click', function(){ setTool('blur'); });
  if(noToolBtn) noToolBtn.addEventListener('click', function(){ setTool(null); });

  function setTool(tool){
    activeTool = tool;
    if(markToolBtn) markToolBtn.classList.remove('toggled');
    if(blurToolBtn) blurToolBtn.classList.remove('toggled', 'blur-mode');
    if(tool === 'mark' && markToolBtn) markToolBtn.classList.add('toggled');
    if(tool === 'blur' && blurToolBtn) blurToolBtn.classList.add('toggled', 'blur-mode');
  }

  function canvasCoords(e){
    var rect = editCanvas.getBoundingClientRect();
    var scaleX = editCanvas.width / rect.width;
    var scaleY = editCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  if(editCanvas){
    editCanvas.addEventListener('mousedown', function(e){
      if(!activeTool) return;
      drawing = true;
      drawStart = canvasCoords(e);
      liveRect = { x: drawStart.x, y: drawStart.y, w: 0, h: 0 };
    });
    editCanvas.addEventListener('mousemove', function(e){
      if(!drawing) return;
      var p = canvasCoords(e);
      liveRect = {
        x: Math.min(p.x, drawStart.x),
        y: Math.min(p.y, drawStart.y),
        w: Math.abs(p.x - drawStart.x),
        h: Math.abs(p.y - drawStart.y)
      };
      drawCurrentFrame();
    });
    window.addEventListener('mouseup', function(){
      if(!drawing) return;
      drawing = false;
      if(liveRect && liveRect.w > 6 && liveRect.h > 6){
        regions.push({ 
          type: activeTool, 
          x: liveRect.x, 
          y: liveRect.y, 
          w: liveRect.w, 
          h: liveRect.h,
          startTime: 0,
          endTime: sourceVideo.duration || 100
        });
        renderRegionList();
      }
      liveRect = null;
      drawCurrentFrame();
    });
  }

  function renderRegionList(){
    if(!regionList) return;
    regionList.innerHTML = '';
    regions.forEach(function(r, i){
      var div = document.createElement('div');
      div.className = 'region-item';
      div.innerHTML = 
        '<span class="swatch" style="background:' + (r.type === 'blur' ? '#d97706' : '#2563eb') + '"></span>' +
        '<span class="label">' + (r.type === 'blur' ? 'Blur box' : 'Mark box') + ' ' + (i + 1) + '</span>' +
        '<div class="region-time-controls">' +
          '<div class="region-time-group">' +
            'Start: <input type="number" class="region-time-input start-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (r.startTime.toFixed(1)) + '">s' +
          '</div>' +
          '<div class="region-time-group">' +
            'End: <input type="number" class="region-time-input end-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (r.endTime.toFixed(1)) + '">s' +
          '</div>' +
          '<button class="remove-btn" data-i="' + i + '">Remove</button>' +
        '</div>';
      regionList.appendChild(div);
    });

    regionList.querySelectorAll('.start-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        regions[idx].startTime = Math.max(0, Math.min(val, regions[idx].endTime));
        inp.value = regions[idx].startTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    regionList.querySelectorAll('.end-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        var maxDur = sourceVideo.duration || 100;
        regions[idx].endTime = Math.max(regions[idx].startTime, Math.min(val, maxDur));
        inp.value = regions[idx].endTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    regionList.querySelectorAll('.remove-btn').forEach(function(b){
      b.addEventListener('click', function(){
        regions.splice(parseInt(b.dataset.i), 1);
        renderRegionList();
        drawCurrentFrame();
      });
    });
  }

  // ---- export ----
  var exportBtn = document.getElementById('exportBtn');
  var exportProgressWrap = document.getElementById('exportProgressWrap');
  var exportProgressBar = document.getElementById('exportProgressBar');
  var exportResult = document.getElementById('exportResult');

  if(exportBtn){
    exportBtn.addEventListener('click', async function(){
      exportBtn.disabled = true;
      exportResult.innerHTML = '';
      exportProgressWrap.classList.add('show');
      exportProgressBar.style.width = '0%';

      var start = parseFloat(trimStart.value);
      var end = parseFloat(trimEnd.value);
      var duration = end - start;

      var stream = editCanvas.captureStream(30);
      
      var removeAudioEl = document.getElementById('exportRemoveAudio');
      var shouldRemoveAudio = removeAudioEl && removeAudioEl.checked;

      if(!shouldRemoveAudio){
        try{
          var vidStream = sourceVideo.captureStream ? sourceVideo.captureStream() : (sourceVideo.mozCaptureStream ? sourceVideo.mozCaptureStream() : null);
          if(vidStream && vidStream.getAudioTracks().length > 0){
            vidStream.getAudioTracks().forEach(function(track){
              stream.addTrack(track);
            });
          }
        }catch(err){
          console.warn('Could not copy audio track:', err);
        }
      }

      var mimeType = 'video/webm;codecs=vp9';
      if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      var rec = new MediaRecorder(stream, { mimeType: mimeType });
      var chunks = [];
      rec.ondataavailable = function(e){ if(e.data.size > 0) chunks.push(e.data); };

      var finished = new Promise(function(resolve){
        rec.onstop = function(){ resolve(new Blob(chunks, { type: 'video/webm' })); };
      });

      sourceVideo.currentTime = start;
      await new Promise(function(res){ sourceVideo.onseeked = res; });

      rec.start();
      sourceVideo.play();

      function step(){
        ctx.filter = 'none';
        ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
        drawRegionsOnCanvas(ctx);
        var progress = Math.min(100, ((sourceVideo.currentTime - start) / duration) * 100);
        exportProgressBar.style.width = progress + '%';
        var readoutTime = document.getElementById('readoutTime');
        if(readoutTime) readoutTime.textContent = fmt(sourceVideo.currentTime) + ' / ' + fmt(sourceVideo.duration);
        if(sourceVideo.currentTime < end && !sourceVideo.paused){
          requestAnimationFrame(step);
        } else {
          sourceVideo.pause();
          rec.stop();
        }
      }
      requestAnimationFrame(step);

      var blob = await finished;
      var url = URL.createObjectURL(blob);
      var dlName = shouldRemoveAudio ? 'muted-video.webm' : 'edited-video.webm';
      exportResult.innerHTML = '<a class="link-btn" href="' + url + '" download="' + dlName + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ' + (shouldRemoveAudio ? 'muted' : 'edited') + ' video</a>';
      exportProgressBar.style.width = '100%';
      exportBtn.disabled = false;
    });
  }

  // ================= AUDIO TAB =================
  var audioFileInput = document.getElementById('audioFileInput');
  var audioEmpty = document.getElementById('audioEmpty');
  var audioWork = document.getElementById('audioWork');
  var audioStart = document.getElementById('audioStart');
  var audioEnd = document.getElementById('audioEnd');
  var audioStartLabel = document.getElementById('audioStartLabel');
  var audioEndLabel = document.getElementById('audioEndLabel');
  var audioResult = document.getElementById('audioResult');
  var audioCtx = null, audioBuffer = null, playingSource = null;

  if(audioFileInput){
    audioFileInput.addEventListener('change', async function(){
      var f = audioFileInput.files[0];
      if(!f) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var arrayBuf = await f.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
      audioStart.max = audioEnd.max = audioBuffer.duration;
      audioStart.value = 0;
      audioEnd.value = audioBuffer.duration;
      updateAudioLabels();
      audioEmpty.hidden = true;
      audioWork.hidden = false;
      audioResult.innerHTML = '';
    });
  }

  function updateAudioLabels(){
    if(audioStartLabel) audioStartLabel.textContent = fmt(parseFloat(audioStart.value));
    if(audioEndLabel) audioEndLabel.textContent = fmt(parseFloat(audioEnd.value));
  }
  if(audioStart){
    audioStart.addEventListener('input', function(){
      if(parseFloat(audioStart.value) > parseFloat(audioEnd.value)) audioStart.value = audioEnd.value;
      updateAudioLabels();
    });
  }
  if(audioEnd){
    audioEnd.addEventListener('input', function(){
      if(parseFloat(audioEnd.value) < parseFloat(audioStart.value)) audioEnd.value = audioStart.value;
      updateAudioLabels();
    });
  }

  var audioPreviewBtn = document.getElementById('audioPreviewBtn');
  if(audioPreviewBtn){
    audioPreviewBtn.addEventListener('click', function(){
      if(!audioBuffer) return;
      if(playingSource){ try{ playingSource.stop(); }catch(e){} }
      var s = parseFloat(audioStart.value), e = parseFloat(audioEnd.value);
      playingSource = audioCtx.createBufferSource();
      playingSource.buffer = audioBuffer;
      playingSource.connect(audioCtx.destination);
      playingSource.start(0, s, e - s);
    });
  }

  var audioExportBtn = document.getElementById('audioExportBtn');
  if(audioExportBtn){
    audioExportBtn.addEventListener('click', function(){
      if(!audioBuffer) return;
      var s = parseFloat(audioStart.value), e = parseFloat(audioEnd.value);
      var sampleRate = audioBuffer.sampleRate;
      var startSample = Math.floor(s * sampleRate);
      var endSample = Math.floor(e * sampleRate);
      var frameCount = endSample - startSample;
      var numChannels = audioBuffer.numberOfChannels;

      var trimmed = audioCtx.createBuffer(numChannels, frameCount, sampleRate);
      for(var ch = 0; ch < numChannels; ch++){
        var srcData = audioBuffer.getChannelData(ch).subarray(startSample, endSample);
        trimmed.copyToChannel(srcData, ch);
      }

      var wavBlob = encodeWAV(trimmed);
      var url = URL.createObjectURL(wavBlob);
      audioResult.innerHTML = '<a class="link-btn" href="' + url + '" download="trimmed-audio.wav"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download trimmed WAV</a>';
    });
  }

  function encodeWAV(buffer){
    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var length = buffer.length * numChannels * 2 + 44;
    var arrBuf = new ArrayBuffer(length);
    var view = new DataView(arrBuf);

    function writeString(offset, str){
      for(var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, buffer.length * numChannels * 2, true);

    var offset = 44;
    var channels = [];
    for(var ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

    for(var i = 0; i < buffer.length; i++){
      for(var ch = 0; ch < numChannels; ch++){
        var sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  // ================= SCREENSHOT & ANNOTATE TAB =================
  var captureShotBtn = document.getElementById('captureShotBtn');
  var captureAreaBtn = document.getElementById('captureAreaBtn');
  var shotFileInput = document.getElementById('shotFileInput');
  var shotFileInputMobile = document.getElementById('shotFileInputMobile');
  var shotEmpty = document.getElementById('shotEmpty');
  var shotWork = document.getElementById('shotWork');
  var shotCanvas = document.getElementById('shotCanvas');
  var sctx = shotCanvas ? shotCanvas.getContext('2d') : null;

  var shotImage = null;
  var shotAnnotations = [];
  var shotColor = '#e35d5d';
  var shotTool = null;
  var shotDrawing = false, shotStart = null, shotLive = null;

  async function captureFullFrame(){
    var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    var track = stream.getVideoTracks()[0];
    var tempVideo = document.createElement('video');
    tempVideo.srcObject = stream;
    tempVideo.muted = true;
    await tempVideo.play();
    await new Promise(function(res){ setTimeout(res, 250); });
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = tempVideo.videoWidth;
    tmpCanvas.height = tempVideo.videoHeight;
    tmpCanvas.getContext('2d').drawImage(tempVideo, 0, 0);
    track.stop();
    stream.getTracks().forEach(function(t){ t.stop(); });
    return tmpCanvas.toDataURL('image/png');
  }

  if(captureShotBtn){
    captureShotBtn.addEventListener('click', async function(){
      try{
        var dataUrl = await captureFullFrame();
        var img = new Image();
        img.onload = function(){ loadShotImage(img); };
        img.src = dataUrl;
      }catch(err){
        alert('Could not capture the screen: ' + err.message);
      }
    });
  }

  // ---- capture then select an area ----
  var areaPicker = document.getElementById('shotAreaPicker');
  var areaCanvas = document.getElementById('areaPickCanvas');
  var actx = areaCanvas ? areaCanvas.getContext('2d') : null;
  var areaImage = null, areaDrawing = false, areaStart = null, areaRect = null;

  if(captureAreaBtn){
    captureAreaBtn.addEventListener('click', async function(){
      try{
        var dataUrl = await captureFullFrame();
        var img = new Image();
        img.onload = function(){
          areaImage = img;
          areaCanvas.width = img.width;
          areaCanvas.height = img.height;
          areaRect = null;
          drawAreaPicker();
          areaPicker.hidden = false;
          areaPicker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        img.src = dataUrl;
      }catch(err){
        alert('Could not capture the screen: ' + err.message);
      }
    });
  }

  function drawAreaPicker(){
    if(!areaImage || !actx) return;
    actx.clearRect(0, 0, areaCanvas.width, areaCanvas.height);
    actx.drawImage(areaImage, 0, 0);
    if(areaRect){
      actx.save();
      actx.strokeStyle = '#2563eb';
      actx.lineWidth = 3;
      actx.setLineDash([8,5]);
      actx.strokeRect(areaRect.x, areaRect.y, areaRect.w, areaRect.h);
      actx.restore();
    }
  }
  function areaCoords(e){
    var rect = areaCanvas.getBoundingClientRect();
    var scaleX = areaCanvas.width / rect.width;
    var scaleY = areaCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  if(areaCanvas){
    areaCanvas.addEventListener('mousedown', function(e){
      areaDrawing = true;
      areaStart = areaCoords(e);
      areaRect = { x: areaStart.x, y: areaStart.y, w: 0, h: 0 };
    });
    areaCanvas.addEventListener('mousemove', function(e){
      if(!areaDrawing) return;
      var p = areaCoords(e);
      areaRect = { x: Math.min(p.x, areaStart.x), y: Math.min(p.y, areaStart.y), w: Math.abs(p.x - areaStart.x), h: Math.abs(p.y - areaStart.y) };
      drawAreaPicker();
    });
    window.addEventListener('mouseup', function(){
      if(!areaDrawing) return;
      areaDrawing = false;
    });
  }

  var areaConfirmBtn = document.getElementById('areaConfirmBtn');
  var areaCancelBtn = document.getElementById('areaCancelBtn');

  if(areaConfirmBtn){
    areaConfirmBtn.addEventListener('click', function(){
      if(!areaRect || areaRect.w < 6 || areaRect.h < 6){ alert('Drag out an area first.'); return; }
      var cropped = document.createElement('canvas');
      cropped.width = areaRect.w; cropped.height = areaRect.h;
      cropped.getContext('2d').drawImage(areaImage, areaRect.x, areaRect.y, areaRect.w, areaRect.h, 0, 0, areaRect.w, areaRect.h);
      var img = new Image();
      img.onload = function(){ loadShotImage(img); areaPicker.hidden = true; };
      img.src = cropped.toDataURL('image/png');
    });
  }
  if(areaCancelBtn){
    areaCancelBtn.addEventListener('click', function(){
      areaPicker.hidden = true;
    });
  }

  function handleImageUpload(f){
    if(!f) return;
    var img = new Image();
    img.onload = function(){ loadShotImage(img); };
    img.src = URL.createObjectURL(f);
  }

  if(shotFileInput){
    shotFileInput.addEventListener('change', function(){ handleImageUpload(shotFileInput.files[0]); });
  }
  if(shotFileInputMobile){
    shotFileInputMobile.addEventListener('change', function(){ handleImageUpload(shotFileInputMobile.files[0]); });
  }

  function loadShotImage(img){
    shotImage = img;
    shotAnnotations = [];
    shotCanvas.width = img.width;
    shotCanvas.height = img.height;
    shotEmpty.hidden = true;
    shotWork.hidden = false;
    redrawShot();
  }

  function redrawShot(){
    if(!shotImage || !sctx) return;
    sctx.clearRect(0, 0, shotCanvas.width, shotCanvas.height);
    sctx.drawImage(shotImage, 0, 0, shotCanvas.width, shotCanvas.height);
    shotAnnotations.forEach(function(a){ drawShotAnnotation(sctx, a); });
    if(shotLive) drawShotAnnotation(sctx, shotLive, true);
  }

  function drawShotAnnotation(targetCtx, a, isPreview){
    targetCtx.save();
    targetCtx.strokeStyle = a.color;
    targetCtx.fillStyle = a.color;
    targetCtx.lineWidth = 4;
    targetCtx.lineCap = 'round';
    if(isPreview){ targetCtx.globalAlpha = 0.7; }

    if(a.type === 'rect'){
      targetCtx.strokeRect(Math.min(a.x1,a.x2), Math.min(a.y1,a.y2), Math.abs(a.x2-a.x1), Math.abs(a.y2-a.y1));
    } else if(a.type === 'circle'){
      var cx = (a.x1 + a.x2) / 2, cy = (a.y1 + a.y2) / 2;
      var rx = Math.abs(a.x2 - a.x1) / 2, ry = Math.abs(a.y2 - a.y1) / 2;
      targetCtx.beginPath();
      targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if(a.type === 'arrow'){
      drawArrow(targetCtx, a.x1, a.y1, a.x2, a.y2);
    } else if(a.type === 'text'){
      targetCtx.font = '600 26px -apple-system, sans-serif';
      targetCtx.textBaseline = 'top';
      targetCtx.fillText(a.text, a.x1, a.y1);
    }
    targetCtx.restore();
  }

  function drawArrow(targetCtx, x1, y1, x2, y2){
    var headLen = 16;
    var angle = Math.atan2(y2 - y1, x2 - x1);
    targetCtx.beginPath();
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(x2, y2);
    targetCtx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
    targetCtx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
    targetCtx.closePath();
    targetCtx.fill();
  }

  function setShotTool(tool){
    shotTool = tool;
    ['shotArrowBtn','shotRectBtn','shotCircleBtn','shotTextBtn'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.classList.remove('toggled');
    });
    var map = { arrow: 'shotArrowBtn', rect: 'shotRectBtn', circle: 'shotCircleBtn', text: 'shotTextBtn' };
    if(tool && map[tool] && document.getElementById(map[tool])){
      document.getElementById(map[tool]).classList.add('toggled');
    }
  }

  var shotArrowBtn = document.getElementById('shotArrowBtn');
  var shotRectBtn = document.getElementById('shotRectBtn');
  var shotCircleBtn = document.getElementById('shotCircleBtn');
  var shotTextBtn = document.getElementById('shotTextBtn');
  var shotNoToolBtn = document.getElementById('shotNoToolBtn');

  if(shotArrowBtn) shotArrowBtn.addEventListener('click', function(){ setShotTool('arrow'); });
  if(shotRectBtn) shotRectBtn.addEventListener('click', function(){ setShotTool('rect'); });
  if(shotCircleBtn) shotCircleBtn.addEventListener('click', function(){ setShotTool('circle'); });
  if(shotTextBtn) shotTextBtn.addEventListener('click', function(){ setShotTool('text'); });
  if(shotNoToolBtn) shotNoToolBtn.addEventListener('click', function(){ setShotTool(null); });

  var shotColorRow = document.getElementById('shotColorRow');
  if(shotColorRow){
    shotColorRow.querySelectorAll('.color-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){
        shotColor = btn.dataset.color;
        shotColorRow.querySelectorAll('.color-swatch').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  var shotUndoBtn = document.getElementById('shotUndoBtn');
  var shotClearBtn = document.getElementById('shotClearBtn');

  if(shotUndoBtn){
    shotUndoBtn.addEventListener('click', function(){
      shotAnnotations.pop();
      redrawShot();
    });
  }
  if(shotClearBtn){
    shotClearBtn.addEventListener('click', function(){
      shotAnnotations = [];
      redrawShot();
    });
  }

  function shotCanvasCoords(e){
    var rect = shotCanvas.getBoundingClientRect();
    var scaleX = shotCanvas.width / rect.width;
    var scaleY = shotCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  if(shotCanvas){
    shotCanvas.addEventListener('mousedown', function(e){
      if(!shotTool || !shotImage) return;
      var p = shotCanvasCoords(e);
      if(shotTool === 'text'){
        var text = window.prompt('Type the label to place here:');
        if(text){
          shotAnnotations.push({ type: 'text', x1: p.x, y1: p.y, color: shotColor, text: text });
          redrawShot();
        }
        return;
      }
      shotDrawing = true;
      shotStart = p;
      shotLive = { type: shotTool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: shotColor };
    });
    shotCanvas.addEventListener('mousemove', function(e){
      if(!shotDrawing) return;
      var p = shotCanvasCoords(e);
      shotLive.x2 = p.x; shotLive.y2 = p.y;
      redrawShot();
    });
    window.addEventListener('mouseup', function(){
      if(!shotDrawing) return;
      shotDrawing = false;
      var dist = Math.hypot(shotLive.x2 - shotLive.x1, shotLive.y2 - shotLive.y1);
      if(dist > 6) shotAnnotations.push(shotLive);
      shotLive = null;
      redrawShot();
    });
  }

  var shotDownloadOriginalBtn = document.getElementById('shotDownloadOriginalBtn');
  var shotDownloadEditedBtn = document.getElementById('shotDownloadEditedBtn');

  if(shotDownloadOriginalBtn){
    shotDownloadOriginalBtn.addEventListener('click', function(){
      if(!shotImage) return;
      var c = document.createElement('canvas');
      c.width = shotImage.width; c.height = shotImage.height;
      c.getContext('2d').drawImage(shotImage, 0, 0);
      downloadCanvas(c, 'screenshot-original.png');
    });
  }
  if(shotDownloadEditedBtn){
    shotDownloadEditedBtn.addEventListener('click', function(){
      downloadCanvas(shotCanvas, 'screenshot-edited.png');
    });
  }

  function downloadCanvas(canvasEl, filename){
    canvasEl.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 'image/png');
  }

})();
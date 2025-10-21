// === CONFIG ===
const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com';
const MAX_RETRIES = 5;
const PAGE_LIMIT = 50;

// === ELEMENTS ===
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const progressBar = document.getElementById('progressBar');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

// === STATE ===
let page = 0;
let loading = false;
let wakeLock = null;

// Upload queue tracking { file, url, status, attempts }
let uploadQueue = [];

// === WAKE LOCK ===
async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); }
  catch (err) { console.warn('Wake lock failed', err); }
}
async function releaseWakeLock() { if (wakeLock) await wakeLock.release(); wakeLock = null; }

// === LOCAL STORAGE PERSISTENCE ===
function saveQueue() {
  localStorage.setItem('uploadQueue', JSON.stringify(uploadQueue.map(f => ({
    name: f.file.name,
    size: f.file.size,
    url: f.url,
    status: f.status,
    attempts: f.attempts
  }))));
}

function loadQueue() {
  const saved = JSON.parse(localStorage.getItem('uploadQueue') || '[]');
  uploadQueue = saved.map(f => ({
    file: new File([], f.name), // placeholder for tracking
    url: f.url,
    status: f.status,
    attempts: f.attempts
  }));
}

// === FILE SELECTION ===
fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  for (let file of files) {
    if (!uploadQueue.some(f => f.file.name === file.name && f.file.size === file.size)) {
      uploadQueue.push({ file, url: null, status: 'pending', attempts: 0 });
    }
  }
  saveQueue();
});

// === UPLOAD ===
uploadBtn.addEventListener('click', async () => {
  const pendingFiles = uploadQueue.filter(f => f.status !== 'success');
  if (!pendingFiles.length) return alert('No files to upload');

  uploadBtn.disabled = true;
  await requestWakeLock();

  let completed = 0;
  for (let item of pendingFiles) {
    try {
      item.url = await uploadSingleFile(item.file, MAX_RETRIES);
      item.status = 'success';
    } catch {
      item.status = 'failed';
    }
    item.attempts++;
    completed++;
    uploadStatus.textContent = `Uploading: ${completed}/${pendingFiles.length}`;
    progressBar.style.width = `${(completed / pendingFiles.length) * 100}%`;
    saveQueue();
  }

  uploadStatus.textContent = 'Upload finished';
  progressBar.style.width = '0%';
  fileInput.value = '';
  uploadBtn.disabled = false;
  releaseWakeLock();

  page = 0;
  gallery.innerHTML = '';
  fetchGallery();
});

// === SINGLE FILE UPLOAD WITH RETRIES ===
async function uploadSingleFile(file, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.warn(`Upload failed: ${file.name}, attempt ${attempt}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// === FETCH GALLERY ===
async function fetchGallery() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(`${API_URL}/images?page=${page}&limit=${PAGE_LIMIT}`);
    const images = await res.json();
    if (!images.length) { loading = false; return; }

    images.forEach(imgObj => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<img data-src="${imgObj.thumbnail}" data-original="${imgObj.original}" alt="photo">
                       <input type="checkbox" class="checkbox" value="${imgObj.original}">`;
      gallery.appendChild(div);

      const img = div.querySelector('img');
      const checkbox = div.querySelector('.checkbox');

      // Lazy load thumbnail
      new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { img.src = img.dataset.src; obs.unobserve(img); }
        });
      }).observe(img);

      // Click div to toggle selection
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') checkbox.checked = !checkbox.checked;
        div.classList.toggle('selected', checkbox.checked);
        saveSelection();
      });

      checkbox.addEventListener('change', () => {
        div.classList.toggle('selected', checkbox.checked);
        saveSelection();
      });
    });

    loadSelection(); // restore selection
    page++;
    loading = false;
  } catch (err) {
    console.error('Error fetching gallery:', err);
    loading = false;
  }
}

// === SELECTION SAVE/LOAD ===
function saveSelection() {
  const selected = Array.from(document.querySelectorAll('.checkbox:checked')).map(c => c.value);
  localStorage.setItem('selectedImages', JSON.stringify(selected));
}

function loadSelection() {
  const selected = JSON.parse(localStorage.getItem('selectedImages') || '[]');
  document.querySelectorAll('.checkbox').forEach(c => {
    c.checked = selected.includes(c.value);
    c.closest('.gallery-item').classList.toggle('selected', c.checked);
  });
}

// === INFINITE SCROLL ===
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) fetchGallery();
});

// === DOWNLOAD SELECTED ===
downloadBtn.addEventListener('click', async () => {
  const selected = Array.from(document.querySelectorAll('.checkbox:checked')).map(c => c.value);
  if (!selected.length) return alert('Select files');

  downloadBtn.disabled = true;
  await requestWakeLock();

  let downloaded = 0;
  uploadStatus.textContent = `Downloading: ${downloaded}/${selected.length}`;

  for (let url of selected) {
    const filename = url.split('/').pop();
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    const urlObj = window.URL.createObjectURL(blob);
    a.href = urlObj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(urlObj);

    downloaded++;
    uploadStatus.textContent = `Downloading: ${downloaded}/${selected.length}`;
  }

  uploadStatus.textContent = 'Download finished!';
  downloadBtn.disabled = false;
  releaseWakeLock();
});

// === SELECT ALL / DESELECT ALL ===
selectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.checkbox').forEach(c => { c.checked = true; c.closest('.gallery-item').classList.add('selected'); });
  saveSelection();
});

deselectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.checkbox').forEach(c => { c.checked = false; c.closest('.gallery-item').classList.remove('selected'); });
  saveSelection();
});

// === INITIALIZE ===
window.addEventListener('load', () => {
  loadQueue();
  fetchGallery();
});


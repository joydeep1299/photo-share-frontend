const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com';

let page = 0;
const limit = 50;
let loading = false;

let wakeLock = null;
async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock.request('screen'); }
  catch (err) { console.warn('Wake lock not supported', err); }
}
async function releaseWakeLock() { if (wakeLock) await wakeLock.release(); }

// Regular upload
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) return alert('Select files first');

  uploadBtn.disabled = true;
  await requestWakeLock();

  let uploadedFiles = 0;
  const totalFiles = files.length;
  uploadStatus.textContent = `Uploading: ${uploadedFiles}/${totalFiles}`;

  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData
      });

      uploadedFiles++;
      uploadStatus.textContent = `Uploading: ${uploadedFiles}/${totalFiles}`;
    }
    uploadStatus.textContent = `Uploaded ${totalFiles} files`;
    fileInput.value = '';
    page = 0;
    gallery.innerHTML = '';
    fetchGallery();
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = 'Upload failed!';
  } finally {
    uploadBtn.disabled = false;
    releaseWakeLock();
  }
});

// Fetch gallery
async function fetchGallery() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(`${API_URL}/images?page=${page}&limit=${limit}`);
    const images = await res.json();
    if (!images.length) { loading = false; return; }

    images.forEach(imgObj => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<img data-src="${imgObj.thumbnail}" data-original="${imgObj.original}" alt="photo">
                       <input type="checkbox" class="checkbox" value="${imgObj.original}">`;
      gallery.appendChild(div);

      const checkbox = div.querySelector('.checkbox');
      const img = div.querySelector('img');

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { img.src = img.dataset.src; obs.unobserve(img); }
        });
      });
      observer.observe(img);

      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') checkbox.checked = !checkbox.checked;
        div.classList.toggle('selected', checkbox.checked);
      });

      checkbox.addEventListener('change', () => {
        div.classList.toggle('selected', checkbox.checked);
      });
    });

    page++;
    loading = false;
  } catch (err) {
    console.error('Error fetching gallery:', err);
    loading = false;
  }
}

// Infinite scroll
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) fetchGallery();
});

// Download selected
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
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    downloaded++;
    uploadStatus.textContent = `Downloading: ${downloaded}/${selected.length}`;
  }

  uploadStatus.textContent = 'Download finished!';
  downloadBtn.disabled = false;
  releaseWakeLock();
});

// Select All / Deselect All
selectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.checkbox').forEach(c => { c.checked = true; c.closest('.gallery-item').classList.add('selected'); });
});

deselectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.checkbox').forEach(c => { c.checked = false; c.closest('.gallery-item').classList.remove('selected'); });
});

// Initial load
window.addEventListener('load', fetchGallery);

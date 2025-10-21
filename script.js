const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');
const uploadProgressBar = document.getElementById('uploadProgress');
const downloadProgressBar = document.getElementById('downloadProgress');

const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com';

let page = 0;
const limit = 50; // load 50 images per scroll
let loading = false;

// --- Upload files with background support ---
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) return alert('Select files first');

  uploadStatus.textContent = 'Uploading...';
  uploadProgressBar.style.width = '0%';

  const uploadPromises = Array.from(files).map(file => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          uploadProgressBar.style.width = `${percent}%`;
        }
      });

      xhr.onload = () => resolve();
      xhr.onerror = () => reject();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);
      xhr.send(formData);
    });
  });

  await Promise.all(uploadPromises);
  uploadProgressBar.style.width = '100%';
  uploadStatus.textContent = `Uploaded ${files.length} files`;
  fileInput.value = '';
  page = 0;
  gallery.innerHTML = '';
  fetchGallery();
});

// --- Fetch images (lazy load, 50 per batch) ---
async function fetchGallery() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(`${API_URL}/images?page=${page}&limit=${limit}`);
    const images = await res.json();
    if (!images.length) {
      loading = false;
      return;
    }

    images.forEach(url => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<img data-src="${url}" alt="photo"><input type="checkbox" class="checkbox" value="${url}">`;
      gallery.appendChild(div);

      const checkbox = div.querySelector('.checkbox');
      const img = div.querySelector('img');

      // Lazy load image
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = img.dataset.src;
            obs.unobserve(img);
          }
        });
      });
      observer.observe(img);

      // Click div to toggle selection
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') { // only toggle if not checkbox directly
          checkbox.checked = !checkbox.checked;
        }
        div.classList.toggle('selected', checkbox.checked);
      });

      // Checkbox change updates selection
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

// --- Infinite scroll to fetch more images ---
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
    fetchGallery();
  }
});

// --- Download images individually (background support) ---
downloadBtn.addEventListener('click', async () => {
  const selected = Array.from(document.querySelectorAll('.checkbox:checked')).map(c => c.value);
  if (!selected.length) return alert('Select files');

  uploadStatus.textContent = 'Downloading...';
  downloadProgressBar.style.width = '0%';

  for (let i = 0; i < selected.length; i++) {
    const url = selected[i];
    const filename = url.split('/').pop();
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    const percent = Math.round(((i + 1) / selected.length) * 100);
    downloadProgressBar.style.width = `${percent}%`;
  }

  uploadStatus.textContent = 'Download finished!';
});

// --- Initial gallery load ---
window.addEventListener('load', fetchGallery);

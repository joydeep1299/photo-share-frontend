const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');
const uploadProgressBar = document.getElementById('uploadProgress');
const downloadProgressBar = document.getElementById('downloadProgress');

// Replace with your Cloudinary & backend
const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com';

// --- Upload files with progress ---
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
  fetchGallery();
});

// --- Fetch and render gallery ---
async function fetchGallery() {
  try {
    const res = await fetch(`${API_URL}/images`);
    const images = await res.json();

    gallery.innerHTML = '';
    images.forEach(url => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<img src="${url}" alt="photo"><input type="checkbox" class="checkbox" value="${url}">`;
      gallery.appendChild(div);

      const checkbox = div.querySelector('.checkbox');
      const img = div.querySelector('img');

      // Clicking image toggles checkbox
      img.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        div.classList.toggle('selected', checkbox.checked);
      });

      // Checkbox change updates border
      checkbox.addEventListener('change', () => {
        div.classList.toggle('selected', checkbox.checked);
      });
    });
  } catch (err) {
    console.error('Error fetching gallery:', err);
  }
}

// --- Download selected images individually ---
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

    // Update download progress
    const percent = Math.round(((i + 1) / selected.length) * 100);
    downloadProgressBar.style.width = `${percent}%`;
  }

  uploadStatus.textContent = 'Download finished!';
});

// --- Initial gallery load ---
window.addEventListener('load', fetchGallery);

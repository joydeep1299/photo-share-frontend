const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');

// Your Cloudinary and backend
const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com';

// Upload files concurrently and update gallery after each upload
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) return alert('Select files first');

  uploadStatus.textContent = 'Uploading...';

  // Concurrent uploads
  const uploadPromises = Array.from(files).map(file => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    return fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method:'POST', body:formData });
  });

  await Promise.all(uploadPromises);

  uploadStatus.textContent = `Uploaded ${files.length} files`;
  fileInput.value = '';
  fetchGallery(); // update gallery
});

// Fetch gallery and render
async function fetchGallery() {
  try {
    const res = await fetch(`${API_URL}/images`);
    const images = await res.json();

    gallery.innerHTML = ''; // clear existing gallery

    images.forEach(url => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<input type="checkbox" class="checkbox" value="${url}"><img src="${url}" alt="photo">`;
      gallery.appendChild(div);
    });
  } catch (err) {
    console.error('Error fetching gallery:', err);
  }
}


// Multi-download selected images
downloadBtn.addEventListener('click', async () => {
  const selected = Array.from(document.querySelectorAll('.checkbox:checked')).map(c=>c.value);
  if (!selected.length) return alert('Select files');

  uploadStatus.textContent = 'Preparing download...';

  fetch(`${API_URL}/download`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ files: selected })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photos.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    uploadStatus.textContent = '';
  });
});

// Initial gallery load
fetchGallery();

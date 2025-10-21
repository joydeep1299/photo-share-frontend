const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const gallery = document.getElementById('gallery');
const downloadBtn = document.getElementById('downloadBtn');

// Replace with your Cloudinary and Render backend
const CLOUD_NAME = 'dj5gimioa';
const UPLOAD_PRESET = 'unsigned_upload';
const API_URL = 'https://photo-share-backend-z4vu.onrender.com/';

// Upload files
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) return alert('Select files first');

  uploadStatus.textContent = 'Uploading...';

  for (let file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', ''); // optional, leave empty for root

    // Upload each file
    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method:'POST', body:formData });
    
    // Update gallery after each file uploaded
    fetchGallery();
  }

  uploadStatus.textContent = `Uploaded ${files.length} files`;
  fileInput.value = '';
});

// Fetch and render gallery
async function fetchGallery() {
  try {
    const res = await fetch(`${API_URL}/images`);
    const images = await res.json();

    gallery.innerHTML = '';
    images.forEach(url => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `<input type="checkbox" class="checkbox" value="${url}"><img src="${url}">`;
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

  const res = await fetch(`${API_URL}/download`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ files: selected })
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'photos.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Initial gallery load
fetchGallery();

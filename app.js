const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadForm = document.getElementById('uploadForm');

const resultsSection = document.getElementById('resultsSection');
const loading = document.getElementById('loading');
const analysisDetails = document.getElementById('analysisDetails');

dropZone.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.src = event.target.result;
      previewContainer.classList.remove('hidden');
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = imageInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  resultsSection.classList.remove('hidden');
  loading.classList.remove('hidden');
  analysisDetails.classList.add('hidden');

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    loading.classList.add('hidden');

    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }

    // Populate data
    document.getElementById('fishName').textContent = data.fish_name || 'Unknown Species';
    document.getElementById('estWeight').textContent = data.estimated_weight_g || 'N/A';
    document.getElementById('calories').textContent = `${data.nutritional_facts?.calories_per_100g || 0} kcal`;
    document.getElementById('protein').textContent = `${data.nutritional_facts?.protein_g || 0} g`;
    document.getElementById('fats').textContent = `${data.nutritional_facts?.fat_g || 0}g Fat (${data.nutritional_facts?.omega_3_mg || 0}mg Omega-3)`;
    document.getElementById('freshness').textContent = data.freshness_assessment || 'N/A';
    document.getElementById('description').textContent = data.description || '';

    const vitList = document.getElementById('vitaminsList');
    vitList.innerHTML = '';
    (data.nutritional_facts?.vitamins_minerals || []).forEach(v => {
      const li = document.createElement('li');
      li.textContent = v;
      vitList.appendChild(li);
    });

    analysisDetails.classList.remove('hidden');

  } catch (err) {
    loading.classList.add('hidden');
    alert('Failed to connect to the server.');
    console.error(err);
  }
});
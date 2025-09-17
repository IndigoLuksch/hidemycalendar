const submitBtn = document.getElementById('submit-btn');
const resultDiv = document.getElementById('result');
const newLinkInput = document.getElementById('new-link');
const copyBtn = document.getElementById('copy-btn');

// !!! PASTE YOUR WORKER URL HERE !!!
const workerUrl = 'YOUR_WORKER_URL_HERE'; 

submitBtn.addEventListener('click', () => {
    const icalUrlInput = document.getElementById('ical-url');
    const originalUrl = icalUrlInput.value;

    if (!originalUrl) {
        alert('Please enter a valid iCal URL.');
        return;
    }

    // Construct the new URL by passing the original URL as a query parameter
    const newUrl = `${workerUrl}?url=${encodeURIComponent(originalUrl)}`;

    // Display the result
    newLinkInput.value = newUrl;
    resultDiv.classList.remove('hidden');
});

copyBtn.addEventListener('click', () => {
    newLinkInput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
});

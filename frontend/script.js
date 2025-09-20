const API_BASE_URL = 'https://hidemycalendar.indigoluksch.workers.dev';

// --- Get references to HTML elements ---
const submitBtn = document.getElementById('submit-btn');
const icalUrlInput = document.getElementById('ical-url');
const resultDiv = document.getElementById('result');
const newLinkInput = document.getElementById('new-link');
const copyBtn = document.getElementById('copy-btn');
const resultParagraph = resultDiv.querySelector('p');

/**
 * Handles the link generation process
 */
async function generateLink() {
    const originalUrl = icalUrlInput.value;
    
    // Simple validation
    if (!originalUrl || (!originalUrl.startsWith('http') && !originalUrl.startsWith('webcal'))) {
        resultParagraph.textContent = 'Error: Please enter a valid iCal URL.';
        resultDiv.classList.remove('hidden');
        return;
    }

    // Update UI to show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';
    resultDiv.classList.add('hidden');

    try {
        // --- Start of new delay logic ---
        // 1. Create a timer promise that resolves after 1 second (1000ms)
        const timerPromise = new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. Create the fetch promise without awaiting it yet
        const fetchPromise = fetch(`${API_BASE_URL}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: originalUrl }),
        });

        // 3. Wait for both the timer and the fetch request to complete
        const [_, response] = await Promise.all([timerPromise, fetchPromise]);
        // --- End of new delay logic ---

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create link.');
        }

        // Success: display the new link
        newLinkInput.value = data.privateUrl;
        resultParagraph.textContent = 'Your new private link is:';
        resultDiv.classList.remove('hidden');

/**
 * Copies the generated link to the clipboard
 */
function copyLinkToClipboard() {
    if (!newLinkInput.value) return;

    navigator.clipboard.writeText(newLinkInput.value).then(() => {
        // Provide user feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000); // Revert after 2 seconds
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// --- Attach event listeners ---
submitBtn.addEventListener('click', generateLink);
copyBtn.addEventListener('click', copyLinkToClipboard);

// Allow pressing Enter in the input field to trigger the button click
icalUrlInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission if it's in a form
        submitBtn.click();
    }
});

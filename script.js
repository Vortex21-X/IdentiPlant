const apiKey = ${{ secrets.SuperSecret }};
let dragDropArea; // Declare dragDropArea in a higher scope

let tokensLeft = localStorage.getItem('tokensLeft') || 30;
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();
let unlimitedTokens = localStorage.getItem('unlimitedTokens') === 'true' || false;

let chatHistory = []; // Store chat history

// Token management functions
function initializeTokens() {
    const currentTime = new Date().getTime();
    const lastResetTime = parseInt(localStorage.getItem('lastResetTime')) || 0;
    const storedTokens = localStorage.getItem('tokensLeft');
    const unlimitedTokens = localStorage.getItem('unlimitedTokens') === 'true';
    
    // Check if 24 hours have passed since last reset
    if (currentTime - lastResetTime > 24 * 60 * 60 * 1000) {
        // Reset tokens to 30 and update last reset time
        localStorage.setItem('tokensLeft', '30');
        localStorage.setItem('lastResetTime', currentTime.toString());
        localStorage.setItem('unlimitedTokens', 'false');
        return 30;
    }
    
    // If unlimited tokens, return infinity symbol
    if (unlimitedTokens) {
        return '∞';
    }
    
    // If within 24 hours, return stored tokens or default to 30
    return storedTokens ? parseInt(storedTokens) : 30;
}

function updateTokenDisplay() {
    const tokenDisplay = document.getElementById('tokens-left');
    const unlimitedTokens = localStorage.getItem('unlimitedTokens') === 'true';
    
    if (unlimitedTokens) {
        tokenDisplay.textContent = '∞';
    } else {
        const tokens = localStorage.getItem('tokensLeft') || '30';
        tokenDisplay.textContent = tokens;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const uploadButton = document.getElementById('uploadIdentifyButton');
    const fileInput = document.getElementById('plantPhoto');
    dragDropArea = document.querySelector('.drag-drop-area'); // Initialize here

    // Menu functionality
    const menuIcon = document.querySelector('.menu-icon');
    const sideMenu = document.querySelector('.side-menu');

    // Toggle the side menu when the menu icon is clicked
    menuIcon.addEventListener('click', function() {
        sideMenu.classList.toggle('open');
    });

    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    dragDropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
    });

    dragDropArea.addEventListener('dragleave', function() {
        dragDropArea.classList.remove('dragover');
    });

    dragDropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // Initialize tokens and update display
    initializeTokens();
    updateTokenDisplay();

    // Check tokens every minute (optional, for active sessions)
    setInterval(() => {
        initializeTokens();
        updateTokenDisplay();
    }, 60000);

    // Token modal buttons
    document.getElementById('ok-button').addEventListener('click', function() {
        document.getElementById('token-modal').style.display = 'none';
    });

    document.getElementById('code-button').addEventListener('click', function() {
        document.getElementById('code-input-section').classList.remove('hidden');
    });

    document.getElementById('submit-code').addEventListener('click', function() {
        const codeInput = document.getElementById('code-input');
        if (codeInput.value === 'Marchbaby#13') {
            localStorage.setItem('unlimitedTokens', 'true');
            updateTokenDisplay();
            document.getElementById('token-modal').style.display = 'none';
        } else {
            alert('Incorrect password');
        }
        codeInput.value = '';
    });

    // Updated handleFile function without retry logic
    async function handleFile(file) {
        const unlimitedTokens = localStorage.getItem('unlimitedTokens') === 'true';
        let tokens = parseInt(localStorage.getItem('tokensLeft'));

        if (!unlimitedTokens && tokens <= 0) {
            showTokenModal();
            return;
        }

        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        
        if (!validImageTypes.includes(file.type)) {
            displayError("Please upload a valid image file (JPEG, PNG, GIF).");
            return; // Prevent further processing
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Image = event.target.result.split(',')[1];
            const imageUrl = event.target.result; // Get the full data URL for the image

            const payload = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "What plant is in this image? Please include both the name of the plant and its scientific name. That should be the first sentence. Then you should describe the condition of the plant. If the plant is in bad condition then talk about how to change that. Also please talk about the price of the plant and where it can be bought. Then add some additional information about the plant. All in all, the response should be exactly seven sentences. IF THE PROVIDED IMAGE IS NOT A PLANT, SIMPLY SAY THAT. DO NOT PROVIDE ADDITIONAL INFORMATION ABOUT THE PLANT. MAKE SURE NOT TO BOLD OR ITALICIZE ANYTHING. NO MATTER WHAT THE IMAGE ENTAILS, YOU HAVR TO PTOVIDE ALL DETAILS. EVEN IF ONLY ONE IMAGE IS PROVIDED." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            };

            console.log(JSON.stringify(payload, null, 2)); // Log the payload

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    const description = data.choices[0].message.content; // Extract the description

                    // Redirect to a new page with the AI's description and image URL
                    window.location.href = `description.html?description=${encodeURIComponent(description)}&image=${encodeURIComponent(imageUrl)}`;
                } else {
                    const errorText = await response.text(); // Get error details
                    console.error(`Error: ${response.status} - ${errorText}`); // Log error
                    displayError(`Error: ${response.statusText}`);
                }
            } catch (error) {
                displayError(`Fetch error: ${error.message}`);
            }

            // After successful processing, decrease token count if not unlimited
            if (!unlimitedTokens) {
                tokens--;
                localStorage.setItem('tokensLeft', tokens.toString());
                updateTokenDisplay();
            }
        };

        reader.onerror = function() {
            console.error("Error reading file:", reader.error);
            displayError("Error reading file. Please try again.");
        };

        reader.readAsDataURL(file);
    }

    function displayResult(content) {
        const resultContainer = document.querySelector('.result-container');
        const infoBox = document.querySelector('.info-box');
        const uploadedImage = document.getElementById('uploadedImage');

        resultContainer.classList.remove('hidden');
        infoBox.textContent = content;
        uploadedImage.src = URL.createObjectURL(file);
    }

    function displayError(message) {
        // Check if an error message already exists and remove it
        const existingError = dragDropArea.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message'; // Add class for styling
        errorMessage.textContent = message;

        // Insert the error message below the existing text
        dragDropArea.appendChild(errorMessage); // Append to drag-drop area
        setTimeout(() => errorMessage.remove(), 5000); // Remove after 5 seconds
    }

    // Function to show loading indicator
    function showLoadingIndicator() {
        const loadingElement = document.getElementById('loading'); // Ensure this element exists on the index page
        loadingElement.style.display = 'block'; // Show loading indicator
    }

    // Function to handle chat with AI
    async function chatWithAI(userMessage) {
        try {
            // Add user message to chat
            addMessageToChat(userMessage, true);

            // Prepare the chat history for context
            const messages = [
                {
                    role: "system",
                    content: "You are a helpful assistant specializing in plant care and identification. The user is asking about a plant they've identified using IdentiPlant."
                },
                ...chatHistory,
                {
                    role: "user",
                    content: userMessage
                }
            ];

            // Make API request
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: messages,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // Add AI response to chat
            addMessageToChat(aiResponse, false);

            // Update chat history
            chatHistory.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: aiResponse }
            );

        } catch (error) {
            console.error('Chat error:', error);
            addMessageToChat("Sorry, I couldn't process your message. Please try again.", false);
        }
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            alert("No file selected!");
            return;
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG, GIF).");
            return;
        }

        // Proceed with upload
        const formData = new FormData();
        formData.append('image', file);

        fetch('file:///C:/Users/Esha%20Kothari/Documents/IdPlant/project/description.html', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Handle success
            console.log(data);
        })
        .catch(error => {
            console.error('There was a problem with the upload:', error);
        });
    }
});
// Reusable function for fetch requests
function makeFetchRequest(endpoint) {
    fetch(endpoint)
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error(error));

}

async function randomizefetch(endpoint) {
    await fetch(endpoint)
        .then(response => response.json())
        .then(data => {
            const overlays = data;
            const buttonContainer = document.getElementById('overlay-buttons');
            buttonContainer.innerHTML = '';

            for (let i = 0; i < overlays.length; i++) {
                const overlay = overlays[i];
                const switchLabel = document.createElement('label');
                switchLabel.classList.add('switch');

                const switchInput = document.createElement('input');
                switchInput.type = 'checkbox';
                switchInput.id = 'onOffSwitch';
                switchInput.checked = true;

                const slider = document.createElement('span');
                slider.classList.add('slider');

                switchLabel.appendChild(switchInput);
                switchLabel.appendChild(slider);

                

                // Add event listeners to capture the overlay for each button
                slider.addEventListener('click', async function () {
                    // Capture the overlay for this specific button
                    const clickedOverlay = overlay;

                    // Send the overlay to the server
                    await fetch('/toggleOverlay', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ overlay: clickedOverlay })
                    })
                        .then(response => response.json())
                        .then(data => console.log(data))
                        .catch(error => console.error(error));
                    makeFetchRequest('/getstate');
                });

                buttonContainer.appendChild(switchLabel);
            }
        })
        .catch(error => console.error(error));
    makeFetchRequest('/getstate');
}



// Event listeners
document.getElementById('connectButton').addEventListener('click', function () {
    makeFetchRequest('/connect');
});

document.getElementById('statebutton').addEventListener('click', function () {
    makeFetchRequest('/getstate');
});

document.getElementById('randomize').addEventListener('click', function () {
    randomizefetch('randomize');
});
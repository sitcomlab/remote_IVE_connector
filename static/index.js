async function submit() {
    // Get the selected values from the dropdown menus
    const video = document.getElementById("Videos").value;
    const privacy = document.getElementById("Privacy").value;

    const data ={
        video: video,
        privacy: privacy
    }

     // Make a POST request using the Fetch API
     fetch('/demo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        // Handle the response from the server if needed
        console.log(result);
    })
    .catch(error => {
        console.error('Error:', error);
    });

    alert("Video Selected: " + video + "\ Privacy Selected: " + privacy);
}

async function deleteOverlays(){
    fetch('/deleteOverlays')
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error(error));
}


const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(express.static('static'));
const io = require('socket.io-client');

// Define socket and state in the global scope 
let socket;
let state;

const url = 'http://giv-sitcomdev.uni-muenster.de:5000';
const scenarioIDs = [823, 783, 888];

/* const url = 'http://localhost:5000'
const scenarioIDs = [0, 41] */


app.get("/", (req, res) => {
    res.set({
        "Allow-access-Allow-Origin": '*'
    });
    return res.redirect('index.html');
});


app.get('/connect', (req, res) => {
    socket = io.connect(url);
    socket.on('connect', function () {
        console.log('connected');
        // Listen for the '/get/state' event when the socket is connected
        socket.on('/get/state', function (currentState) {
            state = currentState;
            console.log("state updated!");
            console.log(currentState);
        });
    });
    res.send('Connected successfully');
});


app.get('/getstate', (req, res) => {
    socket.emit('/get/state');
    res.send('Requesting state data... ');
});

app.post('/toggleOverlay', (req, res) => {
    //get ID of the overlay that will be toggeled
    const ID = req.body.overlay;
    let data =  {
        "overlay_id" : ID,
        "display" : !state.overlay[ID].display,
        "type" : state.overlay[ID].category
    }
    console.log(data);

    socket.emit('/toggle/overlay', data);
    res.json({ message: 'Overlay toggled successfully' }); 
});



app.get('/randomize', (req, res) => {
    let scenarioID = scenarioIDs[Math.floor(Math.random() * scenarioIDs.length)];
    let scenario_name, location, video, videooverlays, scenariooverlays, scenarionames, videonames, overlaynames, overlays;

    fetch(`${url}/api/scenarios/${scenarioID}`)
        .then(response => response.json())
        .then(body => {
            scenario_name = body.name;
            console.log("scenario: " + scenario_name);

            return fetch(`${url}/api/scenarios/${scenarioID}/locations/`);
        })
        .then(response => response.json())
        .then(body => {
            location = body[Math.floor(Math.random() * body.length)];
            console.log("location " + location.name);

            return fetch(`${url}/api/locations/${location.location_id}/videos/`);
        })
        .then(response => response.json())
        .then(body => {
            video = body[Math.floor(Math.random() * body.length)];
            console.log("video: " + video.name);

            return fetch(`${url}/api/videos/${video.video_id}/overlays/`);
        })
        .then(response => response.json())
        .then(body => {
            videooverlays = body;
            return fetch(`${url}/api/scenarios/${scenarioID}/overlays/`)
        })
        .then(response => response.json())
        .then(body => {
            scenariooverlays = body;
            scenarionames = scenariooverlays.map(item => item.overlay_id);
            videonames = videooverlays.map(item => item.overlay_id); 
            overlaynames = scenarionames.filter(name => videonames.includes(name));
            //remove duplicates
            overlaynames = [...new Set(overlaynames)];
            console.log(overlaynames)
            //empty the array
            overlays = [];
            //fin the overlays with common names and get all the info about them
            for (let i = 0; i < overlaynames.length; i++) {
                for (let j = 0; j < scenariooverlays.length; j++) {
                    if (scenariooverlays[j].overlay_id == overlaynames[i]) {
                        //needed?
                        scenariooverlays[j].display = "true";
                        overlays.push(scenariooverlays[j]);
                        break;
                    }
                }
            }
            socket.emit('/set/scenario', { "scenario_id": scenarioID, "scenario_name": scenario_name });
            socket.emit('/set/location', { "location_id": location.location_id, "location_type": location.location_type, "location_name": location.name });
            socket.emit('/set/video', { "video_id": video.video_id, "video_name": video.name, "overlays": overlays });
            //send this to the client and make him create buttons
            res.send(overlaynames);
        })
        .catch(error => {
            console.error('Fetch error:', error);
            res.status(500).send('An error occurred');
        });
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

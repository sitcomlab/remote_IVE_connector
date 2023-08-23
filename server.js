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
//define posssible scenarios here
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
    //Listen for connection
    socket.on('connect', function () {
        console.log('connected');
        // Listen for the '/get/state' event when the socket is connected and update the state
        socket.on('/get/state', function (currentState) {
            state = currentState;
            console.log("state updated!");
            //Log the state here if desired
            //console.log(currentState);
        });
    });
    res.send('Connected successfully');
});


app.get('/getstate', (req, res) => {
    //request state from the IVE '/get/state' socket
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

    //Send overlay toggle request to IVE
    socket.emit('/toggle/overlay', data);
    res.json({ message: 'Overlay toggled successfully' }); 
});



app.get('/randomize', (req, res) => {
    let scenarioID = scenarioIDs[Math.floor(Math.random() * scenarioIDs.length)];
    let scenario_name, location, video, videooverlays, scenariooverlays, scenarionames, videonames, overlaynames, overlays;
    //get scenarioID of randomly chosen scenario
    fetch(`${url}/api/scenarios/${scenarioID}`)
        .then(response => response.json())
        .then(body => {
            scenario_name = body.name;
            console.log("scenario: " + scenario_name);
            //get locations by scenario
            return fetch(`${url}/api/scenarios/${scenarioID}/locations/`);
        })
        .then(response => response.json())
        .then(body => {
            location = body[Math.floor(Math.random() * body.length)];
            console.log("location " + location.name);
            //get videos by location
            return fetch(`${url}/api/locations/${location.location_id}/videos/`);
        })
        .then(response => response.json())
        .then(body => {
            video = body[Math.floor(Math.random() * body.length)];
            console.log("video: " + video.name);
            //get overlays by video
            return fetch(`${url}/api/videos/${video.video_id}/overlays/`);
        })
        .then(response => response.json())
        .then(body => {
            videooverlays = body;
            //get overlays by scenario
            return fetch(`${url}/api/scenarios/${scenarioID}/overlays/`)
        })
        .then(response => response.json())
        .then(body => {
            //Find overlays that are related to both video and scenario
            scenariooverlays = body;
            scenarionames = scenariooverlays.map(item => item.overlay_id);
            videonames = videooverlays.map(item => item.overlay_id); 
            overlaynames = scenarionames.filter(name => videonames.includes(name));
            //remove duplicates
            overlaynames = [...new Set(overlaynames)];
            console.log(overlaynames)
            //empty the array
            overlays = [];
            //find the overlays with common names and push them into overlays[] 
            for (let i = 0; i < overlaynames.length; i++) {
                for (let j = 0; j < scenariooverlays.length; j++) {
                    if (scenariooverlays[j].overlay_id == overlaynames[i]) {
                        scenariooverlays[j].display = "true";
                        overlays.push(scenariooverlays[j]);
                        break;
                    }
                }
            }
            /*IVE TODO: OVERLAYS are not related to LOCATIONS. This can lead to problems. 
            Consider:
                                        scenario_1
                            location_1              location_2
                            video_1                 video_1
                        overlay_1 overlay_2      overlay_3 overlay_4
            
            Here scenario_1 has to be related to overlays 1 to 4.
            video_1 is related to overlays 1 and 2 because of its instance in location_1
            video_1 is also related to overlays 3 and 4 because of its instance in location_2

            Now if  video_1 is displayed in any location of scenario_1 all 4 overlays will be available.
            */

            //emit chosen scenatio, location and video to the IVE and include the overlays array created earlier 
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

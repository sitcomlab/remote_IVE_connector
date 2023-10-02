const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(express.static('static'));
const io = require('socket.io-client');

// Define socket and state in the global scope 
let socket;
let state;
let temporary = [];
let token;

const url = 'http://giv-sitcomdev.uni-muenster.de:5000';
const constScenario = "1484"


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
            //console.log(currentState);
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
    let data = {
        "overlay_id": ID,
        "display": !state.overlay[ID].display,
        "type": state.overlay[ID].category
    }
    console.log(data);

    socket.emit('/toggle/overlay', data);
    res.json({ message: 'Overlay toggled successfully' });
});



app.get('/randomize', (req, res) => {
    let scenarioID = constScenario;
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
            //add video id here 
            video = body.find(vid => vid.video_id === 132);
            console.log("video: ", video.video_id)
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

app.post('/demo', async (req, res) => {
    if (temporary.length) {
        deleteOverlays();
    }
    let loc_id, loc_name;

    privacy = req.body.privacy;

    const video = overlaydata.videos.find(video => video.title === req.body.video);
    if (req.body.video == "Frauenstraße") {
        loc_id = 1485;
        loc_name = "Frauenstraße";
    } else {
        loc_id = 1733;
        loc_name = "Hauptbahnhof";
    }

    settings = video.privacySettings[privacy];
    //loop over overlays
    for (const property in settings) {
        if (settings.hasOwnProperty(property)) {
            let embeddingdata = settings[property];
            var myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");
            myHeaders.append("Authorization", `bearer ${token}`);

            //embedd overlay into video
            var raw = embeddingdata
            var requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify(raw),
                redirect: 'follow'
            };
            await fetch(`${url}/api/relationship/embedded_in/`, requestOptions)
                .then(response => response.json())
                .then(result => {
                    console.log("embedded: ", result.relationship_id)
                    temporary.push(result.relationship_id)
                })
                .catch(error => console.log('error', error));

        }
    }
    socket.emit('/set/scenario', { "scenario_id": 1484, "scenario_name": "simport demo" });
    socket.emit('/set/location', { "location_id": loc_id, "location_type": "outdoor", "location_name": loc_name });

})


app.get('/deleteOverlays', (req, res) => {
    deleteOverlays();
});

function deleteOverlays() {
    console.log("delete: ", temporary);
    var myHeaders = new Headers();
    myHeaders.append("Authorization", `bearer ${token}`);
    var requestOptions = {
        method: 'DELETE',
        headers: myHeaders,
        redirect: 'follow'
    };
    for (const id in temporary) {
        fetch(`${url}/api/relationships/${temporary[id]}`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error));
    }
    temporary = [];
}

async function login() {
    //login and get token

    await fetch(`${url}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'pass',
        }),
        redirect: 'follow'
    })
        .then(response => response.json())
        .then(result => {
            console.log("logged in!")
            token = result.token
        })
        .catch(error => console.log('error', error));

    socket = io.connect(url);
    socket.on('connect', function () {
        console.log('connected');
    });
}
login();

const overlaydata = {
    "videos": [
        {
            "title": "Frauenstraße",
            "privacySettings": {
                "low": {
                    1: {
                        "overlay_id": "1481",
                        "url": "/images/blue-bubble.png",
                        "video_id": "455",
                        "description": "",
                        "w": 3.8745,
                        "h": 2,
                        "d": 0,
                        "x": 8.0247,
                        "y": -0.7917,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1478",
                        "url": "/images/blue-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 2.0537,
                        "h": 1.2487,
                        "d": 0,
                        "x": 3.3722,
                        "y": -1.9564,
                        "z": 1.247,
                        "rx": 0.0808,
                        "ry": -0.098,
                        "rz": -0.165,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1482",
                        "url": "/images/green-bubble.png",
                        "video_id": "455",
                        "description": "",
                        "w": 5.6374,
                        "h": 2.0476,
                        "d": 0,
                        "x": 15.5413,
                        "y": -1.1156,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    4: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "455",
                        "description": "asd",
                        "w": 0.5,
                        "h": 0.5,
                        "d": 0,
                        "x": 18.8353,
                        "y": -3.2028,
                        "z": 0,
                        "rx": 0,
                        "ry": -0.4977993185953187,
                        "rz": -0.052400020132625756,
                        "display": true
                    },
                    5: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "455",
                        "description": "asd",
                        "w": 0.5323,
                        "h": 0.6638,
                        "d": 0,
                        "x": 15.9932,
                        "y": -2.9868,
                        "z": 0,
                        "rx": 0.1048,
                        "ry": -0.4248,
                        "rz": -3.121,
                        "display": true
                    },
                    6: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "455",
                        "description": "asd",
                        "w": 0.4264,
                        "h": 0.3163,
                        "d": 0,
                        "x": 8.0992,
                        "y": -1.7564,
                        "z": 1.9535,
                        "rx": 0.367,
                        "ry": -0.5379,
                        "rz": -1.3277,
                        "display": true
                    },
                    7: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 0.7853,
                        "h": 0.7401,
                        "d": 0,
                        "x": 9.6355,
                        "y": -2.6314,
                        "z": 0.3733,
                        "rx": -2.768,
                        "ry": 0.2478,
                        "rz": 0.167,
                        "display": true
                    },
                    8: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 1.0793,
                        "h": 0.6409,
                        "d": 0,
                        "x": 7.485,
                        "y": -2.9509,
                        "z": 0,
                        "rx": 3.1269,
                        "ry": 0.313,
                        "rz": 2.9182,
                        "display": true
                    },
                    9: {
                        "overlay_id": "1483",
                        "url": "/images/orange-bubble.png",
                        "video_id": "455",
                        "description": "",
                        "w": 4.9071,
                        "h": 3.0185,
                        "d": 0,
                        "x": -0.9368,
                        "y": 1.4754,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    10: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 1.028,
                        "h": 0.8099,
                        "d": 0,
                        "x": 2.2648,
                        "y": -1.7273,
                        "z": -0.1189,
                        "rx": -1.2904,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    11: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 0.7917,
                        "h": 0.8907,
                        "d": 0,
                        "x": 0.9716,
                        "y": -1.0796,
                        "z": 0,
                        "rx": -1.3511,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    12: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 0.4475,
                        "h": 0.3799,
                        "d": 0,
                        "x": 1.2235,
                        "y": -0.5442,
                        "z": 0,
                        "rx": -1.0401,
                        "ry": -0.2952,
                        "rz": -0.4603,
                        "display": true
                    },
                    13: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 0.4372,
                        "h": 0.2202,
                        "d": 0,
                        "x": 1.2738,
                        "y": -0.1744,
                        "z": 0.659,
                        "rx": -1.1867,
                        "ry": -0.4718,
                        "rz": -0.8439,
                        "display": true
                    },
                    14: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "455",
                        "description": "",
                        "w": 0.6488,
                        "h": 0.328,
                        "d": 0,
                        "x": 1.6981,
                        "y": -0.0426,
                        "z": 0.7285,
                        "rx": 1.9087,
                        "ry": -0.0756,
                        "rz": -0.8945,
                        "display": true
                    }


                },
                "medium": {
                    1: {
                        "overlay_id": "1741",
                        "url": "/images/blue-bubble-medium.png",
                        "video_id": "455",
                        "description": "asdf",
                        "w": 5.2056,
                        "h": 1.6222,
                        "d": 0,
                        "x": -16.7594,
                        "y": 1.1599,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1742",
                        "url": "/images/green-bubble-medium.png",
                        "video_id": "455",
                        "description": "asdf",
                        "w": 5.1642,
                        "h": 1.4422,
                        "d": 0,
                        "x": -16.7644,
                        "y": -0.477,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1743",
                        "url": "/images/orange-bubble-medium.png",
                        "video_id": "455",
                        "description": "sdfg",
                        "w": 5.0827,
                        "h": 1.7456,
                        "d": 0,
                        "x": -16.7934,
                        "y": 2.9193,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }


                },
                "high": {
                    1: {
                        "overlay_id": "1736",
                        "url": "/images/blue-bubble-high.png",
                        "video_id": "455",
                        "description": "asdf",
                        "w": 5.2022,
                        "h": 1.6628,
                        "d": 0,
                        "x": -16.7743,
                        "y": 1.1648,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1738",
                        "url": "/images/green-bubble-high.png",
                        "video_id": "455",
                        "description": "asdf",
                        "w": 5.3233,
                        "h": 1.6172,
                        "d": 0,
                        "x": -16.8999,
                        "y": -0.4982,
                        "z": -0.031,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1737",
                        "url": "/images/orange-bubble-high.png",
                        "video_id": "455",
                        "description": "asdf",
                        "w": 5.1369,
                        "h": 1.4267,
                        "d": 0,
                        "x": -16.7436,
                        "y": 2.7253,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }

                }
            }
        },
        {
            "title": "Hauptbahnhof",
            "privacySettings": {
                "low": {
                    1: {
                        "overlay_id": "1478",
                        "url": "/images/blue-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 0.9187,
                        "h": 0.8696,
                        "d": 0,
                        "x": 0.6245,
                        "y": -1.3137,
                        "z": 0.8364,
                        "rx": -1.0754,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 0.9314,
                        "h": 0.8595,
                        "d": 0,
                        "x": -0.3581,
                        "y": -1.7571,
                        "z": 0.3051,
                        "rx": -1.1546,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 0.869,
                        "h": 0.9291,
                        "d": 0,
                        "x": -1.1876,
                        "y": -2.2673,
                        "z": 0.3974,
                        "rx": 1.7159,
                        "ry": -0.0575,
                        "rz": -3.1416,
                        "display": true
                    },
                    4: {
                        "overlay_id": "1479",
                        "url": "/images/green-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 1.1892,
                        "h": 1.0176,
                        "d": 0,
                        "x": -2.1953,
                        "y": -3.131,
                        "z": 0,
                        "rx": -1.6622,
                        "ry": 0.0584,
                        "rz": 2.5749,
                        "display": true
                    },
                    5: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": -0.4432,
                        "h": 0.3259,
                        "d": 0,
                        "x": 1.7274,
                        "y": 0.0537,
                        "z": 0.1831,
                        "rx": -1.0731,
                        "ry": -0.068,
                        "rz": 3.0173,
                        "display": true
                    },
                    6: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 0.6827,
                        "h": 0.6212,
                        "d": 0,
                        "x": 2.1233,
                        "y": -0.1799,
                        "z": 0,
                        "rx": 1.9098,
                        "ry": 0.0909,
                        "rz": -1.0621,
                        "display": true
                    },
                    7: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": -0.6973,
                        "h": 1.0925,
                        "d": 0,
                        "x": 2.2673,
                        "y": -0.5768,
                        "z": 0,
                        "rx": 1.8027,
                        "ry": 0.3921,
                        "rz": 2.9612,
                        "display": true
                    },
                    8: {
                        "overlay_id": "1480",
                        "url": "/images/orange-dot.png",
                        "video_id": "248",
                        "description": "",
                        "w": 1.1661,
                        "h": 0.5104,
                        "d": 0,
                        "x": 1.7286,
                        "y": -1.1362,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }, 9: {
                        "overlay_id": "1739",
                        "url": "/images/blue-bubble2.png",
                        "video_id": "248",
                        "description": "",
                        "w": 4.8,
                        "h": 2,
                        "d": 0,
                        "x": -3.2614,
                        "y": 0.1807,
                        "z": -2.5471,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    10: {
                        "overlay_id": "1482",
                        "url": "/images/green-bubble.png",
                        "video_id": "248",
                        "description": "",
                        "w": 3,
                        "h": 2,
                        "d": 0,
                        "x": 3.7068,
                        "y": -2.2494,
                        "z": -0.2149,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    11: {
                        "overlay_id": "1740",
                        "url": "/images/orange-bubble2.png",
                        "video_id": "248",
                        "description": "",
                        "w": 2.6003,
                        "h": 1.4355,
                        "d": 0,
                        "x": 3.9948,
                        "y": 1.7274,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }

                },
                "medium": {
                    1: {
                        "overlay_id": "1741",
                        "url": "/images/blue-bubble-medium.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.2022,
                        "h": 1.6628,
                        "d": 0,
                        "x": -16.7743,
                        "y": 1.1648,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1742",
                        "url": "/images/green-bubble-medium.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.3233,
                        "h": 1.6172,
                        "d": 0,
                        "x": -16.8999,
                        "y": -0.4982,
                        "z": -0.031,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1744",
                        "url": "/images/orange-bubble-medium2.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.1369,
                        "h": 1.4267,
                        "d": 0,
                        "x": -16.7436,
                        "y": 2.7253,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }

                },
                "high": {
                    1: {
                        "overlay_id": "1736",
                        "url": "/images/blue-bubble-high.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.2022,
                        "h": 1.6628,
                        "d": 0,
                        "x": -16.7743,
                        "y": 1.1648,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    2: {
                        "overlay_id": "1738",
                        "url": "/images/green-bubble-high.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.3233,
                        "h": 1.6172,
                        "d": 0,
                        "x": -16.8999,
                        "y": -0.4982,
                        "z": -0.031,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    },
                    3: {
                        "overlay_id": "1737",
                        "url": "/images/orange-bubble-high.png",
                        "video_id": "248",
                        "description": "asdf",
                        "w": 5.1369,
                        "h": 1.4267,
                        "d": 0,
                        "x": -16.7436,
                        "y": 2.7253,
                        "z": 0,
                        "rx": 0,
                        "ry": 0,
                        "rz": 0,
                        "display": true
                    }

                }
            }
        }
    ]
}


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

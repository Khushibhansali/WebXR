var checkerboard;
var ctx;
var canvas;
var running = false;

var thumbstickMoving = false;

var responses = [];
var position = [0, 0, -150];
var stimulusOn = -1, stimulusOff = -1;

var randomPositionFactor = 70;
var acceptingResponses = false;
var doubleQuit = false;
var backgroundColor = "#7F7F7F";

//variable that ensures the targets are distanced correctly in case shift value is changed 
var locationAdjusted = false;

//the default locations we want the target to go
var defaultLoc = [[0,0], [-1, 1], [0, 1],[1, 1], [-1, 0], [1, 0], [-1,-1], [0, -1], [1, -1]];

// a variable to store new locations in case the shift or distance between targets is changed
var loc = [[0,0], [-1, 1], [0, 1],[1, 1], [-1, 0], [1, 0], [-1,-1], [0, -1], [1, -1]];

//the default orientations we want the target to rotate to
var angleOrientation = [0, -45, 90, 45, 0, 0, 45, 90, -45];

//increments the angle orientation and the loc variable
var counter = 0;

//current angle from angleOrientation
var angle = 0;

//default values for all the fields from the menu on the website 
var frequency = 0.5;
var std = 12;
var maxFrequency = 0.5;
var stepFrequency= 0.5;

//factors that help scale and calculate trials
var frequencyFactor = 26;
var cyclesPerDegreeFactor = 1/78;
var stddevFactor = 30;

//The size of the target in pixels
var targetResolution = 300;

// Number of shifts in contrast 
var convergenceThreshold = 7;

// add 0 back if you want to have first target as trials
var targetPositions = [1, 2, 3, 4, 5, 6, 7, 8];

//dictionary to monitor contrast history per position
var positionContrastHistory = {
    "center": [1],
    "topLeft": [1],
    "topCenter": [1],
    "topRight": [1],
    "middleLeft": [1],
    "middleRight": [1],
    "bottomLeft": [1],
    "bottomCenter":[1],
    "bottomRight": [1]
};

//dictionary to monitor contrast high in 1st element and low in 2nd element per position
var Imax ={
    "center": 256,
    "topLeft": 256,
    "topCenter": 256,
    "topRight": 256,
    "middleLeft": 256,
    "middleRight": 256,
    "bottomLeft": 256,
    "bottomCenter": 256,
    "bottomRight": 256 
}


//dictionary to monitor contrast high in 1st element and low in 2nd element per position
var Imin = {
    "center": 0,
    "topLeft": 0,
    "topCenter": 0,
    "topRight": 0,
    "middleLeft": 0,
    "middleRight": 0,
    "bottomLeft": 0,
    "bottomCenter": 0,
    "bottomRight": 0 
}

//dictionary to monitor yes per position 
var positionDelta= {
    "center": 128,
    "topLeft": 128,
    "topCenter": 128,
    "topRight": 128,
    "middleLeft": 128,
    "middleRight": 128,
    "bottomLeft": 128,
    "bottomCenter": 128,
    "bottomRight": 128
};

//dictionary to monitor yes per position 
var positionYes = {
    "center": 0,
    "topLeft": 1,
    "topCenter": 1,
    "topRight": 1,
    "middleLeft": 1,
    "middleRight": 1,
    "bottomLeft": 1,
    "bottomCenter": 1,
    "bottomRight": 1
};

//dictionary to monitor shifts per position
var positionShifts = {
    "center": 0,
    "topLeft": 0,
    "topCenter": 0,
    "topRight": 0,
    "middleLeft": 0,
    "middleRight": 0,
    "bottomLeft": 0,
    "bottomCenter":0,
    "bottomRight": 0
};

// boolean to help keep track of shifts
var shiftDirections = {
    "center": [],
    "topLeft": [],
    "topCenter": [],
    "topRight": [],
    "middleLeft": [],
    "middleRight": [],
    "bottomLeft": [],
    "bottomCenter": [],
    "bottomRight": [] 
}

//keeps track of the last key
var prev_key = Object.keys(positionContrastHistory)[counter];

/*Registers controller button pressed */
AFRAME.registerComponent('button-listener', {
    init: function () {
        var el = this.el;

        el.addEventListener('abuttondown', function (evt) {
            curr_key = Object.keys(positionContrastHistory)[counter];
            positionYes[curr_key] += 1;

            if(positionYes[curr_key] == 2){
                currContrast = updateGaborContrast(true);
                positionYes[curr_key] = 0;
            }
            newTrial();
        });

        el.addEventListener('bbuttondown', function (evt) {
            curr_key = Object.keys(positionContrastHistory)[counter];
            if (shiftDirections[curr_key].length >= 2 && shiftDirections[curr_key].slice(-2).every(direction => direction === "up")) {
                if (!($("#9-position").prop("checked"))) {
                    pushResponses(positionContrastHistory[prev_key], prev_key);
                    
                    if (frequency > maxFrequency){
                        endExperiment();
                    }else{

                        frequency += maxFrequency; 
                        
                        //reset variables
                        positionShifts.center = 0;
                        positionContrastHistory.center = [1];
                        positionYes.center = 0;
                        Imax.center = 256;
                    }
                }else{
                    currContrast = updateGaborContrast(true);
                    positionYes[curr_key] = 0;
                    newTrial();
                }
            }else{
                currContrast = updateGaborContrast(false);
                positionYes[curr_key] = 0;
                newTrial();
            }
        });
      
        el.addEventListener('gripdown', function (evt) {
            if (doubleQuit == false) {
                doubleQuit = true;
                setTimeout(function () {
                    doubleQuit = false;
                }, 1000);
            }
            else {
                document.querySelector('a-scene').exitVR();
                location.reload();
            }
        });
    }
});

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

$(document).ready(function () {
    addAlignmentSquares();


    $("#fullscreen").click(function (event) {
        toggleFullScreen();
    });

    $("#main").append('<a-plane id="noise-vr" material="transparent:true;opacity:0" width="200" height="200" position="0 0 -150.1"></a-plane>');

    $("#main").append('<a-plane id="opaque-vr" material="color:' + backgroundColor + '; transparent:true;opacity:1" width="200" height="200" visible="false" position="0 0 -49.1"></a-plane>');
    
    /* Adjusting the frequency, max frequency, std, and step frequency based on depth of 150m*/
    frequency = Math.ceil(parseFloat($("#frequency").val()) * cyclesPerDegreeFactor * 100)/100;
    std = parseFloat($("#size-std").val()) * stddevFactor;
    maxFrequency = Math.ceil(parseFloat($("#max-frequency").val()) * cyclesPerDegreeFactor * 100)/100;
    stepFrequency= Math.ceil(parseFloat($("#step-frequency").val())* cyclesPerDegreeFactor * 100)/100;
    convergenceThreshold = parseFloat($("#convergenceThreshold").val());

    //this gabor changes the size of the gabor in the menu
    var gabor = createGabor(targetResolution, frequency, 0, std, 0.5, 1);

    $("#gabor").append(gabor);
    rr = gabor.toDataURL("image/png").split(';base64,')[1];
    $("#main").append('<a-plane id="gabor-vr" material="src:url(data:image/png;base64,' + rr + ');transparent:true;opacity:1" width="10" height="10" position="0 0 -150"></a-plane>');

    // cues around target
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 -7 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 7 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="7 0 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="-7 0 -150"></a-plane>');


    stimulusOn = Date.now();
    acceptingResponses = true;
    
    $("#info").on("keypress", function (e) {
        e.stopPropagation();
    });

    /* Registers keyboard input a->97 and up arrow (increase contrast) and b->98 and down arrow(decrease contrast) */
    $(document).on('keydown keyup keypress', function (event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);

        if (acceptingResponses) {
            curr_key = Object.keys(positionContrastHistory)[counter];
            if (keycode == 97 || keycode == 65 || keycode == 38) {
                positionYes[curr_key] += 1;

                if(positionYes[curr_key] == 2){
                    currContrast = updateGaborContrast(true);
                    positionYes[curr_key] = 0;
                }
                newTrial();
            } else if (keycode == 98 || keycode == 66 || keycode == 40) {
     
                if (shiftDirections[curr_key].length >= 2 && shiftDirections[curr_key].slice(-2).every(direction => direction === "up")) {
                    
                    if (!($("#9-position").prop("checked"))) {
                        pushResponses(positionContrastHistory[prev_key], prev_key);
                        
                        if (frequency > maxFrequency){
                            endExperiment();
                        }else{

                            frequency += maxFrequency; 
                            
                            //reset variables
                            positionShifts.center = 0;
                            positionContrastHistory.center = [1];
                            positionYes.center = 0;
                            Imax.center = 256;
                        }
                    }else{
                        currContrast = updateGaborContrast(true);
                        positionYes[curr_key] = 0;
                        newTrial();
                    }
                }else{
                    currContrast = updateGaborContrast(false);
                    positionYes[curr_key] = 0;
                    newTrial();
                }
            }
        }
    });

    $("#myEnterVRButton").click(function () {
        stimulusOn = Date.now();
    });

    /* If target st dev changed, we update the angle of the target based on current location 
    and type of experiment (9 loc, random loc, or static loc). We also
    convert new st dev value to units we want and redraw target gabor */
    $("#size-std").change(function () {
        if ($("#9-position").prop("checked")) {
            angle = angleOrientation[counter];
        }
        std = parseFloat($("#size-std").val())* stddevFactor;
        var gabor = createGabor(targetResolution, frequency, angle, std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

    /* If frequency changed, we update the angle of the target based on current location 
    and type of experiment (9 loc, random loc, or static loc). We also
    convert new frequency value to units we want, recalculate total trials, and redraw target gabor */
    $("#frequency").change(function () {
        if ($("#9-position").prop("checked")) {
            angle = angleOrientation[counter];
        }
        frequency = Math.ceil(parseFloat($("#frequency").val()) * cyclesPerDegreeFactor * 100)/100;
        var gabor = createGabor(targetResolution, frequency, angle, std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

    /* If max freq changed we recalculate total trials and convert new max frequency to units we want  */
    $("#max-frequency").change(function () {
        maxFrequency = Math.ceil(parseFloat($("#max-frequency").val()) * cyclesPerDegreeFactor * 100)/100;
    });

    /* If step freq changed we recalculate total trials and convert new step frequency to units we want  */
    $("#step-frequency").change(function () {
        stepFrequency= Math.ceil(parseFloat($("#step-frequency").val()) * cyclesPerDegreeFactor * 100)/100;
    });

    /* If distance between targets is updated, recalculate target positions */
    $("#distance").change(function () {
        updateLocation();
    });

    /* If convergence Threshold between targets is updated, recalculate */
    $("#convergenceThreshold").change(function () {
        convergenceThreshold = parseFloat($("#convergenceThreshold").val());
    });

    $("#background-noise").change(function () {
        showNoise();
        if ($("#background-noise").prop("checked")){
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        }
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $("#gaussian-sigma").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked")){
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        }else{
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
        }
    });

    $("#noise-params").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked")){
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        }
        else{
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
        }
    });

});

/* Calculates new location based on distance */
function updateLocation(){
    distance = parseFloat($("#distance").val());
    index = 0;
    loc = structuredClone(defaultLoc);
    while (index < loc.length){
        loc[index][0] *= distance;
        loc[index][1] = loc[index][1] * distance;
        index+=1;    
    }

    locationAdjusted = true;
}
/* Adjusts contrast*/
function updateGaborContrast(canSee){
    const curr_key = Object.keys(positionContrastHistory)[counter];
    const objArray = positionContrastHistory[curr_key];
    let contrast = objArray[objArray.length - 1] * 256;  // Scale up to work on original scale
    const last = shiftDirections[curr_key].length - 1;

    if (positionDelta[curr_key] <= 1) {
        console.log("Skipping trial due to small delta:", positionDelta[curr_key]);
        positionContrastHistory[curr_key].push(contrast / 256); 
        return; 
    }

    if (canSee){
        // Simply halve the current contrast
        contrast /= 2;
        shiftDirections[curr_key].push("down");
    } else {
        // Determine positionDelta adjustment based on shift directions
        if (last >= 1 && shiftDirections[curr_key][last] == "down" && shiftDirections[curr_key][last - 1] == "down") {
            positionDelta[curr_key] *= 2;
        } else if (last >= 1 && shiftDirections[curr_key][last] == "up" && shiftDirections[curr_key][last - 1] == "down") {
            positionDelta[curr_key] /= 4;
        } else if (last >= 1 && shiftDirections[curr_key][last] == "up" && shiftDirections[curr_key][last - 1] == "up") {
            positionDelta[curr_key] /= 2;
        }

        // Average of the last two contrasts if available, else halve
        if (objArray.length > 1) {
            contrast = (objArray[objArray.length - 1] * 256 + objArray[objArray.length - 2] * 256) / 2;
        } else {
            contrast /= 2;  // Fallback if not enough history
        }
        shiftDirections[curr_key].push("up");
    }

    // Adjust Imax and Imin based on the new contrast
    Imax[curr_key] = Imin[curr_key] + contrast;
    Imin[curr_key] = Imax[curr_key] - contrast;

    contrast /= 256;  // Normalize the contrast for storing
    positionContrastHistory[curr_key].push(contrast);
}

async function showNoise() {

    if ($("#background-noise").prop("checked"))
        var noise = await createNoiseField(1000, 128, parseFloat($("#noise-sigma").val()), parseFloat($("#gaussian-sigma").val()));
   
    return new Promise(resolve => {
        if ($("#background-noise").prop("checked")) {
            $("#noise-params").show();
            rr = noise.toDataURL("image/png").split(';base64,')[1];
            document.getElementById("noise-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
        } else {
            $("#noise-params").hide();
        }
        resolve();
    });
}

function addAlignmentSquares(n = 10) {
    for (row = 0; row < n / 2; row++) {
        for (col = 0; col < n / 2; col++) {
            x = col * 0.05;
            y = row * 0.05;
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ x + ' ' + y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ -x + ' ' + y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ x + ' ' + -y + ' -1" ></a-entity>');
            $("#alignment").append('<a-entity class="alignment-square" material="color: white; " geometry="primitive: plane; width: .02; height: .02; "\
            position = "'+ -x + ' ' + -y + ' -1" ></a-entity>');
        }
    }
}

function createNoiseField(side, mean, stdev, gaussian) {
    return new Promise(resolve => {
        var noise = document.createElement("canvas");
        noise.setAttribute("id", "noise");
        noise.width = side;
        noise.height = side;
        var buff = new Uint8Array(noise.width * noise.height * 4);
        var ctx = noise.getContext("2d");
        ctx.createImageData(side, side);
        idata = ctx.getImageData(0, 0, side, side);

        for (var x = 0; x < side; x++) {
            for (var y = 0; y < side; y++) {
                amp = (Math.random() - 0.5) * stdev;
                buff[(y * side + x) * 4] = mean + amp;     // red
                buff[(y * side + x) * 4 + 1] = mean + amp; // green
                buff[(y * side + x) * 4 + 2] = mean + amp; // blue
                buff[(y * side + x) * 4 + 3] = 255;
            }
        }

        // Set pixel data using the TypedArray
        idata.data.set(buff);

        if (gaussian > 0) {
            kernel = makeGaussKernel(gaussian);
            for (var ch = 0; ch < 3; ch++) {
                gauss_internal(idata, kernel, ch, false);
            }
        }
        ctx.putImageData(idata, 0, 0);

        resolve(noise);
    });
}

function makeGaussKernel(sigma) {
    const GAUSSKERN = 6.0;
    var dim = parseInt(Math.max(3.0, GAUSSKERN * sigma));
    var sqrtSigmaPi2 = Math.sqrt(Math.PI * 2.0) * sigma;
    var s2 = 2.0 * sigma * sigma;
    var sum = 0.0;

    var kernel = new Float32Array(dim - !(dim & 1)); // Make it odd number
    for (var j = 0, i = -parseInt(kernel.length / 2); j < kernel.length; i++, j++) {
        kernel[j] = Math.exp(-(i * i) / (s2)) / sqrtSigmaPi2;
        sum += kernel[j];
    }
    // Normalize the gaussian kernel to prevent image darkening/brightening
    for (var i = 0; i < dim; i++) {
        kernel[i] /= sum;
    }
    return kernel;
}

/**
* Internal helper method
* @param pixels - the Canvas pixels
* @param kernel - the Gaussian blur kernel
* @param ch - the color channel to apply the blur on
* @param gray - flag to show RGB or Grayscale image
*/
function gauss_internal(pixels, kernel, ch, gray) {
    var data = pixels.data;
    var w = pixels.width;
    var h = pixels.height;
    var buff = new Uint8Array(w * h);
    var mk = Math.floor(kernel.length / 2);
    var kl = kernel.length;

    // Precalculate offsets and indices
    var offset, off, rowOffset, colOffset, row, col;
    var hw, row, sum;

    // First step process columns
    for (var j = 0; j < h; j++) {
        hw = j * w;
        rowOffset = hw * 4;
        for (var i = 0; i < w; i++) {
            sum = 0;
            for (var k = 0; k < kl; k++) {
                col = i + (k - mk);
                col = (col < 0) ? 0 : ((col >= w) ? w - 1 : col);
                sum += data[(hw + col) * 4 + ch] * kernel[k];
            }
            buff[hw + i] = sum;
        }
    }

    // Second step process rows
    for (var j = 0; j < h; j++) {
        offset = j * w;
        for (var i = 0; i < w; i++) {
            sum = 0;
            for (k = 0; k < kl; k++) {
                row = j + (k - mk);
                row = (row < 0) ? 0 : ((row >= h) ? h - 1 : row);
                sum += buff[(row * w + i)] * kernel[k];
            }
            off = (offset + i) * 4;
            (!gray) ? data[off + ch] = sum :
                data[off] = data[off + 1] = data[off + 2] = sum;
        }
    }
}


function createGabor(side, freq, orientation, stdev, phase, contrast) {
    /*
        Generates and returns a Gabor patch canvas.
        Arguments:
        side            --  The size of the patch in pixels.
        frequency       --  The spatial frequency of the patch.
        orientation     --  The orientation of the patch in degrees.
        std         --  The standard deviation of the Gaussian envelope.
        phase       --  The phase of the patch.
    */
    var gabor = document.createElement("canvas");
    gabor.setAttribute("id", "gabor");
    gabor.width = side;
    gabor.height = side;
    orientation = orientation * (Math.PI / 180);
    var ctx = gabor.getContext("2d");
    ctx.createImageData(side, side);
    idata = ctx.getImageData(0, 0, side, side);
    var amp, f, dx, dy;
    
    
    for (var x = 0; x < side; x++) {
        for (var y = 0; y < side; y++) {
            // The dx from the center
            dx = x - 0.5 * side;
            // The dy from the center
            dy = y - 0.5 * side;
            t = 0.001 + Math.atan2(dy, dx) + orientation;
            r = Math.sqrt(dx * dx + dy * dy);
            xx = (r * Math.cos(t));
            yy = (r * Math.sin(t));

            amp = 0.5 + 0.5 * Math.cos(2 * Math.PI * (xx * freq + phase));
            f = Math.exp(-0.5 * Math.pow((xx) /(stdev), 2) - 0.5 * Math.pow((yy) / (stdev), 2));

            var intensity = 255 * amp;
            idata.data[(y * side + x) * 4] = intensity;     // red
            idata.data[(y * side + x) * 4 + 1] = intensity; // green
            idata.data[(y * side + x) * 4 + 2] = intensity; // blue
            idata.data[(y * side + x) * 4 + 3] = 255 * f * contrast;   // alpha
        }
    }

    ctx.putImageData(idata, 0, 0);
    var originalGabor = document.createElement("canvas");
    originalGabor.width = side;
    originalGabor.height = side;
    var originalCtx = originalGabor.getContext("2d");

    //render at double resolution then scale down
    originalCtx.drawImage(gabor, 0, 0, side, side, 0, 0, side, side);
    
    return originalGabor;
}

//checks if all positions have shifted the threshold number of times
function isConverged(obj) {
    return Object.values(obj).every(value => value >= convergenceThreshold);
}

//randomizes the target position 
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    
    // While there remain elements to shuffle
    while (currentIndex > 0) {
    
        // Pick a remaining element
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        // And swap it with the current element
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    
    return array;
}

function makeGabor(objArray){
    //target follows the 9 fixed positions
    angle = angleOrientation[counter];
    position = [loc[counter][0], loc[counter][1],-150];
    var cuePosition=[[position[0], position[1]-7, position[2]], 
                        [position[0], position[1]+7, position[2]], 
                        [position[0]-7, position[1], position[2]],
                        [position[0]+7, position[1], position[2]]];
    var index = 0;
    Array.from(document.getElementsByClassName("cue")).forEach(function (e) { 
                e.setAttribute("material", "opacity", "1");
                e.setAttribute("position", cuePosition[index].join(" "));
                index+=1;
    });

    document.getElementById("gabor-vr").setAttribute("material", "opacity", "1");
    gabor = createGabor(targetResolution, frequency, angle, std, 0.5, objArray[objArray.length-1]);
    rr = gabor.toDataURL("image/png").split(';base64,')[1];

    setTimeout(() => {
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
        document.getElementById("gabor-vr").setAttribute("visible", "true");
        document.getElementById("gabor-vr").setAttribute("position", position.join(" "));
        $("#gabor").html(gabor);
    }, 750);

    document.getElementById("gabor-vr").setAttribute("material", "opacity", "0");
    document.getElementById("gabor-vr").setAttribute("visible", "false");
}

function pushResponses(objArray, key_to_push){

    if (!responses.some(item => item.targetName === key_to_push && item.frequency === frequency)) {
        responses.push({
            targetName: key_to_push,
            contrast: objArray.slice(0, -1),
            frequency: Math.round(frequency * frequencyFactor*100)/100,
            maxFrequency: maxFrequency*frequencyFactor, 
            size_std: std/10,
            position: position,
            trialTime: stimulusOff - stimulusOn,
        });
    }

    //reset variables
    if (!$("#9-position").prop("checked") && frequency < maxFrequency && positionShifts.center == convergenceThreshold){
        frequency += stepFrequency;
        positionShifts.center = 0;
        positionContrastHistory.center = [1];
        positionYes.center = 0;
        Imax.center = [1];
    }

    if(isConverged(positionShifts)){
        //console.log("experiment finished!");
        if(frequency < maxFrequency){
            frequency += stepFrequency;
            for (var i = 0; i < 9; i++){
                key = Object.keys(positionShifts)[i];
                positionShifts[key] = 0;
                positionContrastHistory[key] = [1];
                positionYes[key] = 0;
                Imax[key] = [1]
            }
        }
    }
}

async function newTrial() {
    stimulusOff = Date.now();
    acceptingResponses = false;

    if(locationAdjusted==false){
        updateLocation();
    }
  
    $("#opaque-vr").attr("visible", "true");
    document.getElementById("bottom-text").setAttribute("visible", "false");
    document.getElementById("gabor-vr").setAttribute("material", "opacity", "1");
    Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "1") });
    document.getElementById("sky").setAttribute("color", "rgb(0,0,0)");
    document.getElementById("noise-vr").setAttribute("material", "opacity", "0");

    await showNoise();
    setTimeout(async function () {

        if ((frequency >= maxFrequency && isConverged(positionShifts))|| 
        (frequency >= maxFrequency && positionShifts[prev_key] == convergenceThreshold && !$("#9-position").prop("checked"))){
        
            console.log(convergenceThreshold, frequency >= maxFrequency, isConverged(positionShifts));
            for (var i = 0; i < 9; i++){
                key = Object.keys(positionShifts)[i];
                pushResponses(positionContrastHistory[key], key);
            }
        
            endExperiment();
        } else {
            // NEW TRIAL INFO

            acceptingResponses = true;
            if ($("#9-position").prop("checked")) {

                //if all nine locations are complete then restart counter
                if (targetPositions.length == 0){
                    
                    // Filter out the converged positions from TARGET and add the remaining positions to targetPositions
                    if (Object.values(positionShifts).some(shift => shift >= convergenceThreshold)) {

                        targetPositions = Object.keys(positionShifts).filter(key => positionShifts[key] < convergenceThreshold);
                        targetPositions = targetPositions.map(key => Object.keys(positionShifts).indexOf(key));                        
            
                    }else {
                        targetPositions = Array.from({ length: 9 }, (_, index) => index);
                    }
                    shuffle(targetPositions);
                }
                
                prev_key = Object.keys(positionContrastHistory)[counter];
                angle = angleOrientation[counter];
                position = [loc[counter][0], loc[counter][1],-150];

                counter = targetPositions.pop();
                key = Object.keys(positionContrastHistory)[counter];
                objArray = positionContrastHistory[key];
                trials_remaining = (8 - targetPositions.length) ;

                const bold = "font-weight: bold";
                console.log("%c %s #yes: %d #shifts: %d contrast:", bold, key, positionYes[key], positionShifts[key], positionContrastHistory[key]);

                makeGabor(objArray);
                
            }
            else{
                if (positionShifts.center == convergenceThreshold){
                    key = Object.keys(positionContrastHistory)[0];
                    pushResponses(positionContrastHistory.center, key);
                } 

                const bold = "font-weight: bold";
                console.log("%c%s #yes: %d #shifts: %d contrast:", bold, "center", positionYes.center, positionShifts.center, positionContrastHistory.center);

                makeGabor(positionContrastHistory.center);
            }   

            //Make target flash
            setTimeout(() => {
            
                if ($("#background-noise").prop("checked"))
                    document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
                else
                    document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
                document.getElementById("gabor-vr").setAttribute("material", "opacity", "1");
                $("#opaque-vr").attr("visible", "false");
                document.getElementById("sky").setAttribute("color", backgroundColor);
                stimulusOn = Date.now();
            
                //Set the opacity to 0 after 250 milliseconds
                setTimeout(() => {
                    document.getElementById("gabor-vr").setAttribute("material", "opacity", "0");
                    Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "0"); });
                }, 1000);
            
            }, 250);              
        
    }
       
    }, 1000);
}


function endExperiment(){
    document.getElementById("bottom-text").setAttribute("text", "value", "EXPERIMENT FINISHED!\n\nThanks for playing :)");
    json = {};
    $("#info").find(".input").each(function () {
        if ($(this).attr("type") == "checkbox")
            json[$(this).attr("id")] = $(this).prop("checked");
        else
            json[$(this).attr("id")] = isNaN($(this).val()) ? $(this).val() : parseFloat($(this).val())
    });
    json["responses"] = responses;

    downloadObjectAsJson(json, json["participant-id"] + "-" + Date.now());
}

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

var checkerboard;
var ctx;
var canvas;
var running = false;

var thumbstickMoving = false;

var prev_time = 0;

var responses = [];
var contrast = 1, position = [0, 0, -150];
var stimulusOn = -1, stimulusOff = -1;

var positionVariation = 70;

var acceptingResponses = false;

var doubleQuit = false;

var backgroundColor = "#7F7F7F";

// default locations we want the target to go
var defaultLoc = [[0,0], [-1, 1], [0, 1],[1, 1], [-1, 0], [1, 0], [-1,-1], [0, -1], [1, -1]];

// stores new locations in case the shift or distance between targets is changed
var loc = [[0,0], [-1, 1], [0, 1],[1, 1], [-1, 0], [1, 0], [-1,-1], [0, -1], [1, -1]];

//the default orientations we want the target to rotate to
var angleOrientation = [0, -45, 90, 45, 0, 0, 45, 90, -45];

//current angle from angleOrientation
var angle = 0;

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

//dictionary to monitor yes per position 
var positionYes = {
    "center": 0,
    "topLeft": 0,
    "topCenter": 0,
    "topRight": 0,
    "middleLeft": 0,
    "middleRight": 0,
    "bottomLeft": 0,
    "bottomCenter": 0,
    "bottomRight": 0
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

//dictionary to monitor contrast high in 1st element and low in 2nd element per position
var positionHigh ={
    "center": [1],
    "topLeft": [1],
    "topCenter": [1],
    "topRight": [1],
    "middleLeft": [1],
    "middleRight": [1],
    "bottomLeft": [1],
    "bottomCenter": [1],
    "bottomRight": [1] 
}

// Number of shifts in contrast 
var convergenceThreshold = 7;

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

// add 0 back if you want to have first target as trials
var targetPositions = [1, 2, 3, 4, 5, 6, 7, 8];

// acts as index for all dictionarys
var counter = 0;

var trials = 10;
var location_adjusted = false;
var canSee = false;


//default values for all the fields from the menu on the website 
var frequency = 0.5;
var std = 12;
var maxFrequency = 1.5;
var stepFrequency= 0.5;

//factors that help scale and calculate trials
var frequencyFactor = 26;
var cyclesPerDegreeFactor = 1/78;
var stddevFactor = 30;


//The size of the target in pixels
var targetResolution = 300;

//code for Quest controller
AFRAME.registerComponent('button-listener', {
    init: function () {
        var el = this.el;
        el.addEventListener('abuttondown', function (evt) {
            if (acceptingResponses){
                key = Object.keys(positionContrastHistory)[counter];
                positionYes[key] += 1;

                if(positionYes[key] == 3){
                    updateGaborContrast(true);
                    positionYes[key] = 0;
                }
                
                newTrial();
            }
               
        });

        el.addEventListener('bbuttondown', function (evt) {
            if (acceptingResponses){
                canSee = false;
                key = Object.keys(positionContrastHistory)[counter];
                positionYes[key] = 0;
                updateGaborContrast(canSee);
            }
        });

        el.addEventListener('trackpadchanged', function (evt) {
            if (acceptingResponses){
                currentContrast = 1;
                newTrial(true);
            }
        });

        el.addEventListener('triggerdown', function (evt) {
            if (acceptingResponses){
                currentContrast = 1;
                newTrial(true);
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

    $("#main").append('<a-plane id="noise-vr" material="transparent:true;opacity:0" width="100" height="100" position="0 0 -150.1"></a-plane>');

    $("#main").append('<a-plane id="opaque-vr" material="color:' + backgroundColor + '; transparent:true;opacity:1" width="200" height="200" visible="false" position="0 0 -49.1"></a-plane>');

    /* Adjusting the frequency, max frequency, std, and step frequency based on depth of 150m*/
    frequency = parseFloat($("#frequency").val()) * cyclesPerDegreeFactor;
    std = parseFloat($("#size-std").val()) * stddevFactor;
    maxFrequency = parseFloat($("#max-frequency").val()) * cyclesPerDegreeFactor;
    stepFrequency = parseFloat($("#step-frequency").val()) * cyclesPerDegreeFactor;

    convergenceThreshold = parseFloat($("#convergenceThreshold").val());

    //this gabor changes the size of the gabor in the menu
    var gabor = createGabor(targetResolution, frequency, 0, std, 0.5, 1);

    //randomized the target positions
    shuffle(targetPositions);
  
    $("#gabor").append(gabor);
    rr = gabor.toDataURL("image/png").split(';base64,')[1];
    $("#main").append('<a-plane id="gabor-vr" material="src:url(data:image/png;base64,' + rr + ');transparent:true;opacity:1" width="10" height="10" position="0 -10 -150"></a-plane>');

    // cues
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 -17 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width=".5" height="3" position="0 -3 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="-7 -10 -150"></a-plane>');
    $("#main").append('<a-plane class="cue" material="color:black; transparent:true" width="3" height=".5" position="7 -10 -150"></a-plane>');

    stimulusOn = Date.now();
    acceptingResponses = true;
    
    $("#info").on("keypress", function (e) {
        e.stopPropagation();
    });
    $(document).on('keypress', function (event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);

        if (acceptingResponses) {
           if (keycode == '97') {
        
                key = Object.keys(positionContrastHistory)[counter];
                positionYes[key] += 1;

                if(positionYes[key] == 3){
                    updateGaborContrast(true, key);
                    positionYes[key] = 0;
                }
                newTrial();
            }
                
            if (keycode == "98") {
               
                key = Object.keys(positionContrastHistory)[counter];
                updateGaborContrast(false, key);
                positionYes[key] = 0;
                newTrial();
            }
        }
    });

    $("#myEnterVRButton").click(function () {
        stimulusOn = Date.now();
    });

    $("#size-std").keyup(function () {
        if ($("#9-position").prop("checked")) {
            angle = angleOrientation[counter];
        }
        std = parseFloat($("#size-std").val())* stddevFactor;
        var gabor = createGabor(targetResolution, frequency, angle, std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

    $("#frequency").change(function () {
        if ($("#9-position").prop("checked")) {
            angle = angleOrientation[counter];
        }
        frequency = parseFloat($("#frequency").val()) * cyclesPerDegreeFactor;
        //trial_num();

        var gabor = createGabor(targetResolution, frequency, angle, std, 0.5, 1);
        $("#gabor").html(gabor);
        rr = gabor.toDataURL("image/png").split(';base64,')[1];
        document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    });

    /* If max freq changed we recalculate total trials and convert new max frequency to units we want  */
    $("#max-frequency").change(function () {
        maxFrequency = parseFloat($("#max-frequency").val()) * cyclesPerDegreeFactor;
       //trial_num();
    });

/* If step freq changed we recalculate total trials and convert new step frequency to units we want  */
    $("#step-frequency").change(function () {
        stepFrequency = parseFloat($("#step-frequency").val()) * cyclesPerDegreeFactor;
       // trial_num();
    });

    $("#distance").change(function () {
        updateLocation()
    });

    $("#convergenceThreshold").change(function () {
        convergenceThreshold = parseFloat($("#convergenceThreshold").val());
    });

    $("#9-position").change(function () {
       // trial_num();
     });
       
    $("#background-noise").change(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $("#gaussian-sigma").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
    });

    $("#noise-params").keyup(function () {
        showNoise();
        if ($("#background-noise").prop("checked"))
            document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
        else
            document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
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

function updateGaborContrast(canSee, currKey){
    key = Object.keys(positionContrastHistory)[counter];
    contrast = positionContrastHistory[currKey][positionContrastHistory[currKey].length-1];

    if (canSee==true){
        positionHigh[currKey][0] = contrast;
        contrast = (positionHigh[currKey][0])/2;
        shiftDirections[currKey].push("down");
    }else{
      
        contrast = (positionHigh[currKey][0] + contrast) /2;
        shiftDirections[currKey].push("up");
    }

    last = shiftDirections[currKey].length - 1;
   
    if (last - 1 >=0 && shiftDirections[currKey][last] != shiftDirections[currKey][last-1]){
        positionShifts[currKey] += 1;
     }
     
    positionContrastHistory[currKey].push(contrast);
    // gabor = createGabor(targetResolution, frequency, angle, std, 0.5, positionContrastHistory[currKey][positionContrastHistory[currKey].length-1]);
    // rr = gabor.toDataURL("image/png").split(';base64,')[1];
    // document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
    // document.getElementById("bottom-text").setAttribute("text", "value", "Press A if you can see, B if you can't see");
    // document.getElementById("bottom-text").setAttribute("position", "0 -50 -148");

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

function createNoiseField(side, mean, std, gaussian) {
    return new Promise(resolve => {
        var noise = document.createElement("canvas");
        noise.setAttribute("id", "noise");
        noise.width = side;
        noise.height = side;
        var ctx = noise.getContext("2d");
        ctx.createImageData(side, side);
        idata = ctx.getImageData(0, 0, side, side);
        for (var x = 0; x < side; x++) {
            for (var y = 0; y < side; y++) {
                amp = (Math.random() - 0.5) * std;
                idata.data[(y * side + x) * 4] = mean + amp;     // red
                idata.data[(y * side + x) * 4 + 1] = mean + amp; // green
                idata.data[(y * side + x) * 4 + 2] = mean + amp; // blue
                idata.data[(y * side + x) * 4 + 3] = 255;
            }
        }

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

    // First step process columns
    for (var j = 0, hw = 0; j < h; j++, hw += w) {
        for (var i = 0; i < w; i++) {
            var sum = 0;
            for (var k = 0; k < kl; k++) {
                var col = i + (k - mk);
                col = (col < 0) ? 0 : ((col >= w) ? w - 1 : col);
                sum += data[(hw + col) * 4 + ch] * kernel[k];
            }
            buff[hw + i] = sum;
        }
    }

    // Second step process rows
    for (var j = 0, offset = 0; j < h; j++, offset += w) {
        for (var i = 0; i < w; i++) {
            var sum = 0;
            for (k = 0; k < kl; k++) {
                var row = j + (k - mk);
                row = (row < 0) ? 0 : ((row >= h) ? h - 1 : row);
                sum += buff[(row * w + i)] * kernel[k];
            }
            var off = (j * w + i) * 4;
            (!gray) ? data[off + ch] = sum :
                data[off] = data[off + 1] = data[off + 2] = sum;
        }
    }
}

function createGabor(side, frequency, orientation, std, phase, contrast) {
    /*
        Generates and returns a Gabor patch canvas.
        Arguments:
        side    		--	The size of the patch in pixels.
        frequency		--	The spatial frequency of the patch.
        orientation		--	The orientation of the patch in degrees.
        std 		--	The standard deviation of the Gaussian envelope.
        phase		--	The phase of the patch.
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
    var c = 0
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

            amp = 0.5 + 0.5 * Math.cos(2 * Math.PI * (xx * frequency + phase));
            f = Math.exp(-0.5 * Math.pow((xx) /(std), 2) - 0.5 * Math.pow((yy) / (std), 2));

            c+=1;
            idata.data[(y * side + x) * 4] = 255 * (amp);     // red
            idata.data[(y * side + x) * 4 + 1] = 255 * (amp); // green
            idata.data[(y * side + x) * 4 + 2] = 255 * (amp); // blue
            idata.data[(y * side + x) * 4 + 3] = 255 * f * contrast;
        }
    }
    ctx.putImageData(idata, 0, 0);
    return gabor;
}


//checks if all positions have shifted the threshold number of times
function isConverged(obj) {
    return Object.values(obj).every(value => value >= convergenceThreshold);
}

//randomizes the target position 
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
    
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    
    return array;
}


function contrastImage(imageData, contrast) {

    var data = imageData.data;
    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (var i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    return imageData;
}

async function newTrial(response) {
    stimulusOff = Date.now();
    acceptingResponses = false;

    if(location_adjusted==false){
        updateLocation();
    }

    // document.getElementById("opaque-vr").setAttribute("material", "opacity", "1");
    $("#opaque-vr").attr("visible", "true");
  
   // document.getElementById("bottom-text").setAttribute("text", "value", "\n\n" + (responses.length) + "/" + trials);
    document.getElementById("bottom-text").setAttribute("position", "0 0 -49");
    document.getElementById("gabor-vr").setAttribute("material", "opacity", "0");
    Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "0") });
    document.getElementById("sky").setAttribute("color", "rgb(0,0,0)");
    document.getElementById("noise-vr").setAttribute("material", "opacity", "0");


    await showNoise();
    setTimeout(async function () {
        
        if(frequency > maxFrequency && targetPositions.length == 0 && isConverged(positionShifts)) {
            // END EXPERIMENT!
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
        else {
            // NEW TRIAL INFO
            if ($("#9-position").prop("checked")){
                angle = angleOrientation[counter];
            }
            
            acceptingResponses = true;
            if ($("#9-position").prop("checked")) {
                position = [loc[counter][0], loc[counter][1],-150];
                const bold = "font-weight: bold";
                console.log("%c%s #yes: %d #shifts: %d contrast:", bold, key, positionYes[key], positionShifts[key], positionContrastHistory[key]);

                //reset target positions once all have been visited
                if (targetPositions.length == 0){

                    //remove the target indexes that have converged
                    if ([positionShifts].some(e => e.key1 == convergenceThreshold)) {
                        for (var i = 0; i < 9; i++){
                            keyForUpdatingTargets = Object.keys(positionShifts)[i];

                            //only add target indexes if they haven't converged
                            if (positionShifts[keyForUpdatingTargets] < convergenceThreshold){
                                targetPositions.push(i);
                            }
                           console.log("targets to converge: ", targetPositions);
                        }
                    }else{
                        targetPositions = Array.from({ length: 9 }, (_, index) => index);
                    }

                    shuffle(targetPositions);        
                    console.log("next round");
                }
    
                counter = targetPositions.pop();
                key = Object.keys(positionContrastHistory)[counter];

                gabor = createGabor(targetResolution, frequency, angle, std, 0.5, positionContrastHistory[key][positionContrastHistory[key].length-1]);
                rr = gabor.toDataURL("image/png").split(';base64,')[1];
                document.getElementById("gabor-vr").setAttribute("material", "src", "url(data:image/png;base64," + rr + ")");
                document.getElementById("bottom-text").setAttribute("text", "value", "Press A if you can see, B if you can't see");
                document.getElementById("bottom-text").setAttribute("position", "0 -50 -148");
                                                              
                document.getElementById("gabor-vr").setAttribute("position", position.join(" "));

                //target follows the 9 fixed positions
                var cuePosition=[[position[0], position[1]-7, position[2]], [position[0], position[1]+7, position[2]], [position[0]-7, position[1], position[2]], [position[0]+7, position[1], position[2]]];
                var index = 0;
                Array.from(document.getElementsByClassName("cue")).forEach(function (e) { 
                                        e.setAttribute("material", "opacity", "1");
                                        e.setAttribute("position", cuePosition[index].join(" "));
                                        index+=1;
                                        });

            }   
          
            Array.from(document.getElementsByClassName("cue")).forEach(function (e) { e.setAttribute("material", "opacity", "1") });
            
            if ($("#background-noise").prop("checked"))
                document.getElementById("noise-vr").setAttribute("material", "opacity", "1");
            else
                document.getElementById("noise-vr").setAttribute("material", "opacity", "0");
            document.getElementById("gabor-vr").setAttribute("material", "opacity", "1");
            // document.getElementById("opaque-vr").setAttribute("material", "opacity", "0");
            $("#opaque-vr").attr("visible", "false");
            document.getElementById("sky").setAttribute("color", backgroundColor);
            stimulusOn = Date.now();
        }
    }, 1000);
 
    //if there is at least one target that has converged check if all have
    if ([positionShifts].some(e => e.key1 == convergenceThreshold)) {

        if(isConverged(positionShifts)){
            
            Object.keys(positionContrastHistory).forEach((key)=>{
                responses.push({
                    targetName: key,
                    contrast: positionContrastHistory[key],
                    frequency: Math.round(frequency * frequencyFactor*100)/100,
                    maxFrequency: maxFrequency*frequencyFactor, 
                    size_std: std/10,
                    position: position,
                    trialTime: stimulusOff - stimulusOn,
                });
            });

            frequency += stepFrequency;
            console.log(frequency)

            // reset all variables per position 
            for (var i = 0; i < 9; i++){
                key = Object.keys(positionShifts)[i];
                positionShifts[key] = 0;
                positionContrastHistory[key] = [1];
                positionYes[key] = 0;
                positionHigh[key] = [1]
            }

        }
    }

    //Debug purpose only
    if(!$("#9-position").prop("checked")){
        const bold = "font-weight: bold";
        console.log("%c%s #yes: %d #shifts: %d contrast:", bold, key, positionYes[key], positionShifts[key], positionContrastHistory[key]);
    }
    // if experiment is random location or static location, we update frequency with every trial
    if (positionShifts.center == convergenceThreshold && !$("#9-position").prop("checked")){

        responses.push({
            targetName: key,
            contrast: positionContrastHistory.center,
            frequency: Math.round(frequency * frequencyFactor*100)/100,
            maxFrequency: maxFrequency*frequencyFactor, 
            size_std: std/10,
            position: position,
            trialTime: stimulusOff - stimulusOn,
        });
     
        frequency += stepFrequency;
        
        //reset variables
        positionShifts.center = 0;
        for (var i = 0; i < 9; i++){
            key = Object.keys(positionYes)[i];
            positionContrastHistory[key] = [1];
            positionYes[key] = 0;
            positionHigh[key] = [1];
        }
    } 
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

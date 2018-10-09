"use strict";

var canvas, bvh, easycam, counter, fps;

function preload() {
    bvh = new BVHLoader("./files/Jackson.bvh");
}

function setup() {
  pixelDensity(1);
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  setAttributes('antialias', true);

  easycam = createEasyCam();
  bvh.setup();
  counter = 0;
  fps = 1.0 / 30.0;
} 

function draw(){
	rotateX(-0.5);
	rotateY(-0.5);
	scale(10);
  
  	background(50, 0, 50);
	strokeWeight(1);
	fill(255, 64, 0);

	var time = parseFloat(millis()) / 1000.0;
	var lastTime = 0;

	for (var i=0; i<bvh.bones.length; i++) {
		try {
			var bone = bvh.bones[i];
			var frame = bone.frames[counter];
			var position = frame.position;
			var rotation = frame.rotation;
			lastTime = frame.time;
			
			push();
			translate(position.x + bone.offset.x, position.y + bone.offset.y, position.z + bone.offset.z);
			box(1);
			pop();
		} catch (err) { } 
	}

	if (time > lastTime + fps) {
		if (counter < bvh.frameCount) {
			counter ++;
		} else {
			counter = 0;
		}
	}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  easycam.setViewport([0,0,windowWidth, windowHeight]);
}

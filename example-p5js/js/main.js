"use strict";

var canvas, easycam, counter, fps;
var bvh, skeleton;
var rotOffset;

function preload() {
    bvh = new BVHLoader("./files/Brekel_03_11_2016_15_47_42_body1.bvh");
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  setAttributes("antialias", true);

  easycam = createEasyCam();
  skeleton = new Skeleton(bvh);
  counter = 0;
  fps = 1.0 / 30.0;
  rotOffset = createVector(-0.5, -0.5, 0);
} 

function rotate3D(rot) {
	rotateX(rot.x);
	rotateY(rot.y);
	rotateZ(rot.z);
}

function draw(){
	rotate3D(rotOffset);
	scale(10);
  
  	background(50, 0, 50);
	strokeWeight(1);

	var time = parseFloat(millis()) / 1000.0;
	var lastTime = 0;

	for (var i=0; i<skeleton.limbs.length; i++) {
		var limb = skeleton.limbs[i];
		for (var j=0; j<limb.bones.length; j++) {
			var bone = limb.bones[j];
			var frame = bone.frames[counter];
			var position = frame.position;
			var rotation = frame.rotation.toEuler();
			lastTime = frame.time;
		
			if (j === 0) push();
			translate(position.x + bone.offset.x, position.y + bone.offset.y, position.z + bone.offset.z);
			rotate3D(rotation);
			if (bone.name === "Head") {
				fill(10, 64, 255);
				box(4);
			} else if (bone.name === "Hips") {
				fill(255);
				box(4);
			} else if (bone.name === "LeftHand") {
				fill(10, 255, 64);
				box(4);
			} else if (bone.name === "RightHand") {
				fill(255, 64, 10);
				box(4);
			} else {
				fill(155);
				box(2);
			}
			if (j === limb.bones.length - 1) pop();
		}
	}

	if (time > lastTime + fps) {
		if (counter < skeleton.frameCount - 1) {
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

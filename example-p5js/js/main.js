"use strict";

var canvas, bvh, easycam;

function preload() {
    bvh = new BVHLoader("./files/Jackson.bvh");
}

function setup() {
  pixelDensity(1);
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  setAttributes('antialias', true);

  easycam = createEasyCam();
  bvh.setup();
} 

function draw(){
	rotateX(-0.5);
	rotateY(-0.5);
	scale(10);
  
  	background(50, 0, 50);
	strokeWeight(1);
	fill(255, 64, 0);

	/*
	fill(255, 64, 0);
	box(15);
  
	push();
	translate(0, 0, 20);
	fill(0, 64, 255);
	box(5);
	pop();
  
  	push();
	translate(0, 0, -20);
	fill(64, 255, 0);
	box(5);
	pop();
	*/

	for (var i=0; i<bvh.bones.length; i++) {
		try {
			var bone = bvh.bones[i];
			var frame = bone.frames[100];
			var position = frame.position;
			push();
			translate(position.x, position.y, position.z);
			box(1);
			pop();
		} catch (err) { } 
	}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  easycam.setViewport([0,0,windowWidth, windowHeight]);
}

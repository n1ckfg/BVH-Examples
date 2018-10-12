"use strict";

var canvas, easycam, counter, fps;
var motion, skel;
var rotOffset;
var url = "./files/Jackson.bvh";
var ready = false;

function preload() {
	BVH.read(url, function(motion) {
		skel = new Skeleton(motion);
		ready = true;
	});	
}

function setup() {
    canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    pixelDensity(1);
    setAttributes("antialias", true);

    easycam = createEasyCam();
    rotOffset = createVector(-0.5, -0.5, 0);
} 

function rotate3D(rot) {
	rotateX(rot.x);
	rotateY(rot.y);
	rotateZ(rot.z);
}

function draw() {
	rotate3D(rotOffset);
	scale(10);
  
  	background(50, 0, 50);

	if (ready) {
		skel.update();
	}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  easycam.setViewport([0,0,windowWidth, windowHeight]);
}

class Skeleton {

	constructor(motion) {
		this.motion = motion;
		this.fps = 1.0 / this.motion.frameTime;
	  	this.frameCount = this.motion.numFrames;
		this.lastTime = 0;
  		this.counter = 1; // starts from 1
  		this.bones = [];

		for (var i=0; i<this.motion.nodeList.length; i++) {
			this.bones.push(this.motion.of(this.motion.nodeList[i].id));
		}
		
		console.log("____________________________________");
		console.log("bones: " + this.bones.length + "   frames: " + this.frameCount + "   fps: " + this.fps);
	}

	drawBone(bone) {
		bone.at(this.counter);
		var position = createVector(bone.offsetX, bone.offsetY, bone.offsetZ);
		var position_end = createVector(bone.endOffsetX, bone.endOffsetY, bone.endOffsetZ);
		var rotation = createVector(bone.rotationX, bone.rotationY, bone.rotationZ);
		
		strokeWeight(1);
		stroke(255);
		line(bone.offsetX, bone.offsetY, bone.offsetZ, bone.endOffsetX, bone.endOffsetY, bone.endOffsetZ);

		stroke(0);
		push();
		translate(position.x, position.y, position.z);
		rotate3D(rotation);
		if (bone.id === "Head") {
			fill(10, 64, 255);
			box(4);
		} else if (bone.id === "Hips") {
			fill(255);
			box(4);
		} else if (bone.id === "LeftHand") {
			fill(10, 255, 64);
			box(4);
		} else if (bone.id === "RightHand") {
			fill(255, 64, 10);
			box(4);
		} else {
			fill(155);
			box(2);
		}
		pop();
	}

	drawBones() {
		for (var i=0; i<this.bones.length; i++) {
			this.drawBone(this.bones[i]);
		}
	}

	update() {
		this.drawBones();

		this.time = parseFloat(millis()) / 1000.0;

		if (this.time > this.lastTime + this.motion.frameTime) {
			if (this.counter < this.frameCount - 1) {
				this.counter++;
			} else {
				this.counter = 1;
			}
			//console.log("time: " + this.time + "   lastTime: " + this.lastTime + "   counter: " + this.counter);
			this.lastTime = this.time;
		}
	}

}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

function test() {
	var url = "./files/Jackson.bvh";

	BVH.read(url, function(motion) {
	  // basic infomation about motion data
	  console.log("fps: " + 
	  1.0 / motion.frameTime + "   frames: " +
	  motion.numFrames + "\nnodes: \n" +

	  // get lists of nodes
	  motion.nodeList);

	  var id = "Neck";
	  var index = 4;

	  // get a node by id
	  var node = motion.of(id)

	  // change node's internal state to n-th frame
	  node.at(index)

	  // you can exchange the order of method "at" and "of"
	  var state = motion.at(index)
	  node = state.of(id)

	  // node properties
	  node.offsetX
	  node.offsetY
	  node.offsetZ
	  node.rotationX
	  node.rotationY
	  node.rotationZ

	  // node adjacent to "End Site" has properties about endOffset
	  if (node.hasEnd) {
	    node.endOffsetX
	    node.endOffsetY
	    node.endOffsetZ
	  }

	  console.log("\"" + id + "\"" + " frame " + index + ": pos (" + 				  
	  node.offsetX + ", " +
	  node.offsetY + ", " +
	  node.offsetZ + "), rot (" +
	  node.rotationX + ", " +
	  node.rotationY + ", " +
	  node.rotationZ + ")");

	});
}

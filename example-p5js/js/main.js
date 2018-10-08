"use strict";

var bvh;

function preload() {
    bvh = loadStrings("./files/pirouette.bvh");
}

function setup() {
	createCanvas(800, 600);
	console.log(bvh);
}

function draw() {
	background(50, 0, 50);
}
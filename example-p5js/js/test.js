"use strict";

var bvh, skeleton;

function main() {
    bvh = new BVHLoader("./files/Brekel_03_11_2016_15_47_42_body1.bvh");
    //bvh = new BVHLoader("./files/Jackson.bvh");
    //bvh = new BVHLoader("./files/pirouette.bvh");
} 

window.onload = main;
/**
* @author herzig / http://github.com/herzig
* @author n1ckfg / http://fox-gieg.com
*
* Currently only supports bvh files containing a single root.
*
**/

class BVHLoader {

	constructor(filepath) {
		this.lines = loadStrings(filepath);
		this.bones;
	}

	setup() {
		this.bones = this.readBvh(this.lines);
		console.log(this.bones);
	}

	nextLine(lines) {
		var line;
		// skip empty lines
		while ((line = lines.shift().trim()).length === 0) { }
		return line;
	}

	/*
	 Recursively parses the HIERACHY section of the BVH file

	 - lines: all lines of the file. lines are consumed as we go along.
	 - firstline: line containing the node type and name e.g. "JOINT hip"
	 - list: collects a flat list of nodes

	 returns: a BVH node including children
	*/
	readNode(lines, firstline, list) {
		var node = { name: "", type: "", frames: [] };
		list.push(node);

		// parse node type and name.
		var tokens = firstline.split(/[\s]+/);

		if (tokens[ 0 ].toUpperCase() === "END" && tokens[ 1 ].toUpperCase() === "SITE") {
			node.type = "ENDSITE";
			node.name = "ENDSITE"; // bvh end sites have no name
		} else {
			node.name = tokens[ 1 ];
			node.type = tokens[ 0 ].toUpperCase();
		}

		if (this.nextLine(lines) != "{") {
			throw "Expected opening { after type & name";
		}

		// parse OFFSET
		tokens = this.nextLine(lines).split(/[\s]+/);

		if (tokens[ 0 ] !== "OFFSET") {
			throw "Expected OFFSET, but got: " + tokens[ 0 ];
		}

		if (tokens.length != 4) {
			throw "OFFSET: Invalid number of values";
		}

		var offset = {
			x: parseFloat(tokens[ 1 ]),
			y: parseFloat(tokens[ 2 ]),
			z: parseFloat(tokens[ 3 ])
		};

		if (isNaN(offset.x) || isNaN(offset.y) || isNaN(offset.z)) {
			throw "OFFSET: Invalid values";
		}

		node.offset = offset;

		// parse CHANNELS definitions
		if (node.type != "ENDSITE") {
			tokens = this.nextLine(lines).split(/[\s]+/);
			if (tokens[ 0 ] != "CHANNELS") {
				throw "Expected CHANNELS definition";
			}

			var numChannels = parseInt(tokens[ 1 ]);
			node.channels = tokens.splice(2, numChannels);
			node.children = [];
		}

		// read children
		while (true) {
			var line = this.nextLine(lines);
			if (line === "}") {
				return node;
			} else {
				node.children.push(this.readNode(lines, line, list));
			}
		}
	}

	/*
		Recursively reads data from a single frame into the bone hierarchy.
		The passed bone hierarchy has to be structured in the same order as the BVH file.
		keyframe data is stored in bone.frames.

		- data: splitted string array (frame values), values are shift()ed so
		this should be empty after parsing the whole hierarchy.
		- frameTime: playback time for this keyframe.
		- bone: the bone to read frame data from.
	*/
	readFrameData(data, frameTime, bone) {
		// end sites have no motion data
		if (bone.type === "ENDSITE") {
			return;
		}

		// add keyframe
		var keyframe = {
			time: frameTime,
			position: { x: 0, y: 0, z: 0 },
			rotation: this.createQuaternion(0, 0, 0, 0)
		};

		bone.frames.push(keyframe);

		var quat = this.createQuaternion(0, 0, 0, 0);

		var vx = createVector(1, 0, 0);
		var vy = createVector(0, 1, 0);
		var vz = createVector(0, 0, 1);

		// parse values for each channel in node
		for (var i = 0; i < bone.channels.length; ++ i) {
			switch (bone.channels[ i ]) {
				case "Xposition":
					keyframe.position.x = parseFloat(data.shift().trim());
					break;
				case "Yposition":
					keyframe.position.y = parseFloat(data.shift().trim());
					break;
				case "Zposition":
					keyframe.position.z = parseFloat(data.shift().trim());
					break;
				case "Xrotation":
					quat.setFromAxisAngle(vx, parseFloat(data.shift().trim()) * Math.PI / 180);
					keyframe.rotation.multiply(quat);
					break;
				case "Yrotation":
					quat.setFromAxisAngle(vy, parseFloat(data.shift().trim()) * Math.PI / 180);
					keyframe.rotation.multiply(quat);
					break;
				case "Zrotation":
					quat.setFromAxisAngle(vz, parseFloat(data.shift().trim()) * Math.PI / 180);
					keyframe.rotation.multiply(quat);
					break;
				default:
					throw "invalid channel type";
			}
		}

		// parse child nodes
		for (var i = 0; i < bone.children.length; ++ i) {
			this.readFrameData(data, frameTime, bone.children[ i ]);
		}
	}

	/*
		reads a string array (lines) from a BVH file
		and outputs a skeleton structure including motion data

		returns thee root node:
		{ name: "", channels: [], children: [] }
	*/
	readBvh() {
		// read model structure
		if (this.nextLine(this.lines) !== "HIERARCHY") {
			throw "HIERARCHY expected";
		}

		var list = []; // collects flat array of all bones
		var root = this.readNode(this.lines, this.nextLine(this.lines), list);

		// read motion data
		if (this.nextLine(this.lines) != "MOTION") {
			throw "MOTION  expected";
		}

		// number of frames
		var tokens = this.nextLine(this.lines).split(/[\s]+/);
		var numFrames = parseInt(tokens[ 1 ]);
		if (isNaN(numFrames)) {
			throw "Failed to read number of frames.";
		}

		// frame time
		tokens = this.nextLine(this.lines).split(/[\s]+/);
		var frameTime = parseFloat(tokens[ 2 ]);
		if (isNaN(frameTime)) {
			throw "Failed to read frame time.";
		}

		// read frame data line by line
		for (var i = 0; i < numFrames; ++ i) {
			tokens = this.nextLine(this.lines).split(/[\s]+/);
			this.readFrameData(tokens, i * frameTime, root, list);
		}

		return list;
	}

	createQuaternion(x, y, z, w) {
		return new Quaternion(x, y, z, w);
	}

}

class Quaternion {

	constructor(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	setFromAxisAngle(axis, angle) {
		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
		// assumes axis is normalized

		var halfAngle = angle / 2;
		var s = Math.sin(halfAngle);
		this.x = axis.x * s;
		this.y = axis.y * s;
		this.z = axis.z * s;
		this.w = Math.cos(halfAngle);

		return this;
	}

	multiply(q, p) {
		if (p !== undefined) {
			return this.multiplyQuaternions(q, p);
		} else {
			return this.multiplyQuaternions(this, q);
		}
	}

	multiplyQuaternions(a, b) {
		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

		var qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
		var qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

		this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		return this;
	}

}
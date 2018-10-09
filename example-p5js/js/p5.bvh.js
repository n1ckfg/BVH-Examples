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

	parse() {
		this.bones = this.readBvh(this.lines);
		console.log(this.bones);
		return this;
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

		if (tokens[0].toUpperCase() === "END" && tokens[1].toUpperCase() === "SITE") {
			node.type = "ENDSITE";
			node.name = "ENDSITE"; // bvh end sites have no name
		} else {
			node.name = tokens[1];
			node.type = tokens[0].toUpperCase();
		}

		if (this.nextLine(lines) != "{") {
			throw "Expected opening { after type & name";
		}

		// parse OFFSET
		tokens = this.nextLine(lines).split(/[\s]+/);

		if (tokens[0] !== "OFFSET") {
			throw "Expected OFFSET, but got: " + tokens[0];
		}

		if (tokens.length != 4) {
			throw "OFFSET: Invalid number of values";
		}

		var offset = {
			x: parseFloat(tokens[1]),
			y: parseFloat(tokens[2]),
			z: parseFloat(tokens[3])
		};

		if (isNaN(offset.x) || isNaN(offset.y) || isNaN(offset.z)) {
			throw "OFFSET: Invalid values";
		}

		node.offset = offset;

		// parse CHANNELS definitions
		if (node.type != "ENDSITE") {
			tokens = this.nextLine(lines).split(/[\s]+/);
			if (tokens[0] != "CHANNELS") {
				throw "Expected CHANNELS definition";
			}

			var numChannels = parseInt(tokens[1]);
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
			switch (bone.channels[i]) {
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
			this.readFrameData(data, frameTime, bone.children[i]);
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
		var numFrames = parseInt(tokens[1]);
		if (isNaN(numFrames)) {
			throw "Failed to read number of frames.";
		}

		// frame time
		tokens = this.nextLine(this.lines).split(/[\s]+/);
		var frameTime = parseFloat(tokens[2]);
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

class Matrix4 {

	constructor() {
		this.elements = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	}

	set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
		this.elements[0] = n11;
		this.elements[1] = n21;
		this.elements[2] = n31; 
		this.elements[3] = n41; 

		this.elements[4] = n12;
		this.elements[5] = n22;
		this.elements[6] = n32; 
		this.elements[7] = n42; 

		this.elements[8] = n13;
		this.elements[9] = n23;
		this.elements[10] = n33;
		this.elements[11] = n43;

		this.elements[12] = n14;
		this.elements[13] = n24;
		this.elements[14] = n34;
		this.elements[15] = n44;
	}

	makeRotationFromQuaternion(q) {
		var zero = createVector(0, 0, 0);
		var one = createVector(1, 1, 1);

		return this.compose(zero, q, one);
	}


	compose(position, quaternion, scale) {
		var x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
		var x2 = x + x,	y2 = y + y, z2 = z + z;
		var xx = x * x2, xy = x * y2, xz = x * z2;
		var yy = y * y2, yz = y * z2, zz = z * z2;
		var wx = w * x2, wy = w * y2, wz = w * z2;

		var sx = scale.x, sy = scale.y, sz = scale.z;

        this.elements[0] = (1 - (yy + zz)) * sx;
        this.elements[1] = (xy + wz) * sx;
        this.elements[2] = (xz - wy) * sx;
        this.elements[3] = 0;

        this.elements[4] = (xy - wz) * sy;
        this.elements[5] = (1 - (xx + zz)) * sy;
        this.elements[6] = (yz + wx) * sy;
        this.elements[7] = 0;

        this.elements[8] = (xz + wy) * sz;
        this.elements[9] = (yz - wx) * sz;
        this.elements[10] = (1 - (xx + yy)) * sz;
        this.elements[11] = 0;

        this.elements[12] = position.x;
        this.elements[13] = position.y;
        this.elements[14] = position.z;
        this.elements[15] = 1;

        return this;
	}

}

class Quaternion {

	constructor(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		//euler
		this._x;
		this._y;
		this._z;
		this._order = "XYZ";
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

	clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	toEuler() {
		return this.setFromQuaternion(this, this._order);
	}

	setFromQuaternion(q, order) {
		var matrix = new Matrix4();
		matrix.makeRotationFromQuaternion(q);
		return this.setFromRotationMatrix(matrix, order);
	}

	setFromRotationMatrix(m, order) {
		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
		var te = m.elements;
		var m11 = te[0], m12 = te[4], m13 = te[8];
		var m21 = te[1], m22 = te[5], m23 = te[9];
		var m31 = te[2], m32 = te[6], m33 = te[10];

		order = order || this._order;

		if (order === 'XYZ') {
			this._y = Math.asin(this.clamp(m13, - 1, 1));

			if (Math.abs(m13) < 0.99999) {
				this._x = Math.atan2(- m23, m33);
				this._z = Math.atan2(- m12, m11);
			} else {
				this._x = Math.atan2(m32, m22);
				this._z = 0;
			}
		} else if (order === 'YXZ') {
			this._x = Math.asin(- this.clamp(m23, - 1, 1));

			if (Math.abs(m23) < 0.99999) {
				this._y = Math.atan2(m13, m33);
				this._z = Math.atan2(m21, m22);
			} else {
				this._y = Math.atan2(- m31, m11);
				this._z = 0;
			}
		} else if (order === 'ZXY') {
			this._x = Math.asin(this.clamp(m32, - 1, 1));

			if (Math.abs(m32) < 0.99999) {
				this._y = Math.atan2(- m31, m33);
				this._z = Math.atan2(- m12, m22);
			} else {
				this._y = 0;
				this._z = Math.atan2(m21, m11);
			}
		} else if (order === 'ZYX') {
			this._y = Math.asin(- this.clamp(m31, - 1, 1));

			if (Math.abs(m31) < 0.99999) {
				this._x = Math.atan2(m32, m33);
				this._z = Math.atan2(m21, m11);
			} else {
				this._x = 0;
				this._z = Math.atan2(- m12, m22);
			}
		} else if (order === 'YZX') {
			this._z = Math.asin(this.clamp(m21, - 1, 1));

			if (Math.abs(m21) < 0.99999) {
				this._x = Math.atan2(- m23, m22);
				this._y = Math.atan2(- m31, m11);
			} else {
				this._x = 0;
				this._y = Math.atan2(m13, m33);
			}
		} else if (order === 'XZY') {
			this._z = Math.asin(- this.clamp(m12, - 1, 1));

			if (Math.abs(m12) < 0.99999) {
				this._x = Math.atan2(m32, m22);
				this._y = Math.atan2(m13, m11);
			} else {
				this._x = Math.atan2(- m23, m33);
				this._y = 0;
			}
		} else {
			console.warn('setFromRotationMatrix() given unsupported order: ' + order);
		}

		this._order = order;

		return createVector(this._x, this._y, this._z);
	}

}

class Skeleton {

	constructor(bvh) {
		this.bvh = bvh.parse();
		this.frameCount = 0;
		this.bones = [];
		this.limbs = [];
		this.setup();

		console.log("all bones: " + this.bvh.bones.length + "   usable bones: " + this.bones.length + "   limbs: " + this.limbs.length + "   frames: " + this.frameCount);
	}

	setup() {
		for (var i=0; i<this.bvh.bones.length; i++) {
			try {
				var bone = this.bvh.bones[i];
				if (bone.frames[0].position !== undefined || bone.frames[0].rotation !== undefined) {
					this.bones.push(bone);
				}
			} catch (err) { } 
		}	

		this.frameCount = this.bones[0].frames.length;

		for (var i=0; i<this.bones.length; i++) {
			this.limbs.push(this.bones[i]);
		}	
	}

}
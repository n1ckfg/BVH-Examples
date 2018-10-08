/**
* @author herzig / http://github.com/herzig
* @author n1ckfg / http://fox-gieg.com
*
* Currently only supports bvh files containing a single root.
*
**/

class BVHLoader {

	constructor(filepath) {
		this.bvhRaw = loadStrings(filepath);
	}

	parse() {
		console.log(this.bvhRaw);
	}

}
﻿
// A helper library to maintain shader compilation into a program 
// and automatic extraction of uniform and attribute variables


var gl; // global WebGL context
var glprog; // global GLSL program
var glmat;			// global model matrix
var glmatnew;		// true, if the matrix is modified, but not sent to the shader
var glvmat;			// global view point matrix
var glstack = [];	// model matrix stack


var FLOATS = Float32Array.BYTES_PER_ELEMENT;


function getContext( id )
{
    var canvas = document.getElementById( id );
    if (!canvas)
	{
        alert( "Missing canvas with id=\"" + id + "\"" );
        return null;
    }

    var context = canvas.getContext( "webgl" );
    if (!context) {
        alert( "Missing WebGL context" );
    }

    return context;
}


function getShader( id, type )
{
    var source = document.getElementById( id ).text,
		shader = gl.createShader( type );

    gl.shaderSource( shader, source );
	
    gl.compileShader( shader );
    if (!gl.getShaderParameter( shader, gl.COMPILE_STATUS ))
	{
        alert( gl.getShaderInfoLog(shader) );
        return null;
    }

    return shader;
}


function getProgram( idv, idf )
{
    var vShader = getShader( idv, gl.VERTEX_SHADER ),
		fShader = getShader( idf, gl.FRAGMENT_SHADER );

    if (!vShader || !fShader)
        return null;

    var shaderProgram = gl.createProgram();
		gl.attachShader( shaderProgram, vShader );
		gl.attachShader( shaderProgram, fShader );
		gl.linkProgram( shaderProgram );

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
	{
        alert( gl.getProgramInfoLog(shaderProgram) );
        return null;
    }

    gl.useProgram( shaderProgram );
	
	getVariables( shaderProgram );
	
    return shaderProgram;
}


function getVariables( glprog )
{
	// Extract uniform and attribute variables from a GLSL program
	// and decrate global JavaScript variables with the same names
	
    for (var i = 0; i < gl.getProgramParameter(glprog, gl.ACTIVE_UNIFORMS); i++)
	{
        var name = gl.getActiveUniform( glprog, i ).name;
		name = name.replace('[0]','')
		//console.log(name);
        window[name] = gl.getUniformLocation( glprog, name );
    }

    for (var i = 0; i < gl.getProgramParameter(glprog, gl.ACTIVE_ATTRIBUTES); i++)
	{
        var name = gl.getActiveAttrib( glprog, i ).name;
		name = name.replace('[0]','')
        window[name] = gl.getAttribLocation( glprog, name );
    }
}



function random(a,b)
{
	return a+(b-a)*Math.random();
}


function radians(degrees)
{
	return degrees*Math.PI/180;
}


function orthoMatrix(width, height, near, far)
{
	var matrix = [
		2.0/width, 0, 0, 0,
		0, 2.0/height, 0, 0,
		0, 0, 2.0/(near-far), 0,
		0, 0, (far+near)/(near-far), 1];
	return new Float32Array(matrix);
}



function perspMatrix(angle, aspect, near, far)
{
	var fov = 1/Math.tan(radians(angle)/2);
	var matrix = [
		fov/aspect, 0, 0, 0,
		0, fov, 0, 0,
		0, 0, (far+near)/(near-far), -1,
		0, 0, 2.0*near*far/(near-far), 0];
	return new Float32Array(matrix);
}


function perspective(angle,aspect,near,far)
{
	var proj = perspMatrix(angle,aspect,near,far);
	gl.uniformMatrix4fv(uProjectionMatrix,false,proj);
}


function unitVector(x)
{
	var len = 1/Math.sqrt( x[0]*x[0]+x[1]*x[1]+x[2]*x[2] );
	return [ len*x[0], len*x[1], len*x[2] ];
}


function vectorProduct(x,y)
{
	return [
		x[1]*y[2]-x[2]*y[1],
		x[2]*y[0]-x[0]*y[2],
		x[0]*y[1]-x[1]*y[0] ];
}


function scalarProduct(x,y)
{
	return x[0]*y[0] + x[1]*y[1] + x[2]*y[2];
}


function vectorPoints(x,y)
{
	return [ x[0]-y[0], x[1]-y[1], x[2]-y[2] ];
}


function viewMatrix (eye, focus, up)
{
	var z = unitVector(vectorPoints(eye,focus));
	var x = unitVector(vectorProduct(up,z));
	var y = unitVector(vectorProduct(z,x));
	
	var matrix = [
		x[0], y[0], z[0], 0,
		x[1], y[1], z[1], 0,
		x[2], y[2], z[2], 0,
		-scalarProduct(x,eye),
		-scalarProduct(y,eye),
		-scalarProduct(z,eye), 1 ];
	return new Float32Array(matrix);
};


function multiplyMatrix(a, b) {
	var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
	var out=[];
	var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
	out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
	out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
	out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
	out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	return out;
};



function calculateNormalMatrix(a) {
	var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

		b00 = a00 * a11 - a01 * a10,
		b01 = a00 * a12 - a02 * a10,
		b02 = a00 * a13 - a03 * a10,
		b03 = a01 * a12 - a02 * a11,
		b04 = a01 * a13 - a03 * a11,
		b05 = a02 * a13 - a03 * a12,
		b06 = a20 * a31 - a21 * a30,
		b07 = a20 * a32 - a22 * a30,
		b08 = a20 * a33 - a23 * a30,
		b09 = a21 * a32 - a22 * a31,
		b10 = a21 * a33 - a23 * a31,
		b11 = a22 * a33 - a23 * a32,

		det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	det = 1.0 / det;

	var out=[];
	out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	out[3] = 0;
	
	out[4] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	out[6] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	out[7] = 0;

	out[8] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	out[9] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	out[11] = 0;
	
	out[12] = 0;
	out[13] = 0;
	out[14] = 0;
	out[15] = 1;

	return out;
};


function lookAt(eye,target,up)
{
	glvmat = viewMatrix(eye,target,up);
	gl.uniformMatrix4fv(uViewMatrix,false,glvmat);
}


function unitMatrix()
{
	var matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}

function translateMatrix(v)
{
	var matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		v[0], v[1], v[2], 1];
	return new Float32Array(matrix);
}


function scaleMatrix(v)
{
	var matrix = [
		v[0], 0, 0, 0,
		0, v[1], 0, 0,
		0, 0, v[2], 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}


function zRotateMatrix(a)
{
	a = radians(a);
	var c = Math.cos(a);
	var s = Math.sin(a);
	var matrix = [
		c, s, 0, 0,
	   -s, c, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}


function xRotateMatrix(a)
{
	a = radians(a);
	var c = Math.cos(a);
	var s = Math.sin(a);
	var matrix = [
		1, 0, 0, 0,
		0, c, s, 0,
		0,-s, c, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}


function yRotateMatrix(a)
{
	a = radians(a);
	var c = Math.cos(a);
	var s = Math.sin(a);
	var matrix = [
		c, 0, s, 0,
		0, 1, 0, 0,
	   -s, 0, c, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}


function rotateMatrix(a, v)
{
	a = radians(a);
	v = unitVector(v);
	
	var c = Math.cos(a);
	var s = Math.sin(a);
	
	var xx = v[0]*v[0]*(1-c);
	var xy = v[0]*v[1]*(1-c);
	var xz = v[0]*v[2]*(1-c);
	var yy = v[1]*v[1]*(1-c);
	var yz = v[1]*v[2]*(1-c);
	var zz = v[2]*v[2]*(1-c);
	
	var matrix = [
		xx+c,      xy-v[2]*s, xz+v[1]*s, 0,
		xy+v[2]*s, yy+c,      yz-v[0]*s, 0,
		xz-v[1]*s, yz+v[0]*s, zz+c,      0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}


function identity()
{
	glmatnew = true;
	glmat = new Float32Array( [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] );
}


function translate(v)
{
	glmatnew = true;
	glmat[12] += glmat[0]*v[0]+glmat[4]*v[1]+glmat[8]*v[2];
	glmat[13] += glmat[1]*v[0]+glmat[5]*v[1]+glmat[9]*v[2];
	glmat[14] += glmat[2]*v[0]+glmat[6]*v[1]+glmat[10]*v[2];
}


function scale(v)
{
	glmatnew = true;
	glmat[0] *= v[0];
	glmat[1] *= v[0];
	glmat[2] *= v[0];
	
	glmat[4] *= v[1];
	glmat[5] *= v[1];
	glmat[6] *= v[1];
	
	glmat[8] *= v[2];
	glmat[9] *= v[2];
	glmat[10] *= v[2];
}


function useMatrix()
{
	if (glmatnew)
	{
		glmatnew = false;
		gl.uniformMatrix4fv(uModelMatrix,false,glmat);
	}
}


function xRotate(a)
{
	glmatnew = true;
	
	a = radians(a);
	var s = Math.sin(a);
	var c = Math.cos(a);
	
	a = glmat[4]*s+glmat[8]*c;
	glmat[4]=glmat[4]*c-glmat[8]*s;
	glmat[8]=a;
	
	a = glmat[5]*s+glmat[9]*c;
	glmat[5]=glmat[5]*c-glmat[9]*s;
	glmat[9]=a;
	
	a = glmat[6]*s+glmat[10]*c;
	glmat[6]=glmat[6]*c-glmat[10]*s;
	glmat[10]=a;
}


function yRotate(a)
{
	glmatnew = true;

	a = radians(a);
	var s = Math.sin(a);
	var c = Math.cos(a);
	
	a = glmat[0]*s+glmat[8]*c;
	glmat[0]=glmat[0]*c-glmat[8]*s;
	glmat[8]=a;
	
	a = glmat[1]*s+glmat[9]*c;
	glmat[1]=glmat[1]*c-glmat[9]*s;
	glmat[9]=a;
	
	a = glmat[2]*s+glmat[10]*c;
	glmat[2]=glmat[2]*c-glmat[10]*s;
	glmat[10]=a;
}


function zRotate(a)
{
	glmatnew = true;

	a = radians(a);
	var s = Math.sin(a);
	var c = Math.cos(a);
	
	a = glmat[0]*s+glmat[4]*c;
	glmat[0]=glmat[0]*c-glmat[4]*s;
	glmat[4]=a;
	
	a = glmat[1]*s+glmat[5]*c;
	glmat[1]=glmat[1]*c-glmat[5]*s;
	glmat[5]=a;
	
	a = glmat[2]*s+glmat[6]*c;
	glmat[2]=glmat[2]*c-glmat[6]*s;
	glmat[6]=a;
}


function pushMatrix()
{
	var mat = new Float32Array(glmat.length);
	mat.set(glmat);
	glstack.push(mat);
}


function popMatrix()
{
	glmatnew = true;
	if (glstack.length)
		glmat = glstack.pop();
	else
		identity();
}


function cloneMatrix(a)
{
	var b = new Float32Array(a.length);
	b.set(a);
	return b;
}



var TORUS_MAJOR_SIDES = 50;
var TORUS_MINOR_SIDES = 25;

Torus = function(center,size,R,r)
{	
	function vertex(a,b)
	{
		var x = (R+r*Math.cos(b))*Math.cos(a);
		var y = (R+r*Math.cos(b))*Math.sin(a);
		var z = r*Math.sin(b);
		return [x,y,z];
	}

	function normal(a,b)
	{
		var u = [-Math.cos(a)*Math.sin(b),-Math.sin(b)*Math.sin(a),Math.cos(b)];
		var v = [-Math.sin(a),Math.cos(a),0];
		return unitVector(vectorProduct(v,u));
	}
		
	function dataPush(a,b)
	{	
		var p = vertex(a,b);
		var n = normal(a,b);
		data.push(p[0],p[1],p[2],n[0],n[1],n[2]);
	}
	
	var data = [];
	
	var dA = 2*Math.PI/TORUS_MAJOR_SIDES;
	var dB = 2*Math.PI/TORUS_MINOR_SIDES;

	for (var bi=0; bi<TORUS_MINOR_SIDES; bi++)
	{
		var b1 = bi*dB;
		var b2 = (bi+1)*dB;
		
		for (var ai=0; ai<=TORUS_MAJOR_SIDES; ai++)
		{
			var a = ai*dA;
			dataPush(a,b1);
			dataPush(a,b2);
		}
	}

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	
	this.l = TORUS_MINOR_SIDES;
	this.n = TORUS_MAJOR_SIDES*2+2;
	this.buf = buf;
	this.center = center;
	this.size = size;
	this.color = [0.5,0.75,1];
}


Torus.prototype.draw = function()
{	
	pushMatrix();
	gl.vertexAttrib3fv(aColor,this.color);
	translate(this.center);
	scale([this.size,this.size,this.size]);
	useMatrix();

	gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);

	gl.enableVertexAttribArray(aXYZ);
	gl.vertexAttribPointer(aXYZ,3,gl.FLOAT,false,6*FLOATS,0*FLOATS);

	gl.enableVertexAttribArray(aNormal);
	gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,6*FLOATS,3*FLOATS);

	for (var i=0; i<this.l; i++)
	{
		gl.drawArrays(gl.TRIANGLE_STRIP,this.n*i,this.n);
	}

	popMatrix();
}


CanonicalCube = function()
{	
	var v = [ [+0.5,-0.5,-0.5], [+0.5,+0.5,-0.5],
			  [-0.5,+0.5,-0.5], [-0.5,-0.5,-0.5],
			  [+0.5,-0.5,+0.5], [+0.5,+0.5,+0.5],
			  [-0.5,+0.5,+0.5], [-0.5,-0.5,+0.5] ];
	var n = [ [1,0,0], [-1,0,0],
			  [0,1,0], [0,-1,0],
			  [0,0,1], [0,0,-1] ];
	var data = [].concat(
			  v[0],n[0],v[1],n[0],v[4],n[0],
			  v[4],n[0],v[1],n[0],v[5],n[0],
			  v[6],n[1],v[2],n[1],v[7],n[1],
			  v[7],n[1],v[2],n[1],v[3],n[1],
			  v[5],n[2],v[1],n[2],v[6],n[2],
			  v[6],n[2],v[1],n[2],v[2],n[2],
			  v[4],n[3],v[7],n[3],v[0],n[3],
			  v[0],n[3],v[7],n[3],v[3],n[3],
			  v[4],n[4],v[5],n[4],v[7],n[4],
			  v[7],n[4],v[5],n[4],v[6],n[4],
			  v[0],n[5],v[3],n[5],v[1],n[5],
			  v[1],n[5],v[3],n[5],v[2],n[5] );

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

	this.buf = buf;
}

CanonicalCube.prototype.draw = function()
{	
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
	gl.enableVertexAttribArray(aXYZ);
	gl.vertexAttribPointer(aXYZ,3,gl.FLOAT,false,6*FLOATS,0*FLOATS);
	gl.enableVertexAttribArray(aNormal);
	gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,6*FLOATS,3*FLOATS);
	gl.drawArrays(gl.TRIANGLES,0,36);
}

var canonicalCube;


Cuboid = function(center,size)
{
	this.center = center;
	this.size = size;
	this.color = [1,0.75,0];
	this.offset = undefined;
	this.rot = undefined;
	if (!canonicalCube)
		canonicalCube = new CanonicalCube();
}

Cuboid.prototype.draw = function()
{
	pushMatrix();
	gl.vertexAttrib3fv(aColor,this.color);
	translate(this.center);
	if (this.rot)
	{
		if (this.rot[0]) zRotate(this.rot[0]);
		if (this.rot[1]) xRotate(this.rot[1]);
		if (this.rot[2]) zRotate(this.rot[2]);
	}
	scale(this.size);
	if (this.offset) translate(this.offset);
	useMatrix();
	canonicalCube.draw();
	popMatrix();
}



var ROTATIONAL_SIDES = 32;
var ROTATIONAL_LEVELS = 40;

RotationalSolid = function(center,size,f)
{	
	function vertex(a,z)
	{
		var r = f(z);
		return [r*Math.cos(a),r*Math.sin(a),z];
	}

	function normal(a,z)
	{
		var p = vertex(a,z);
		var u = vectorPoints(vertex(a+0.0001,z),p);
		var v = vectorPoints(vertex(a+0.0001,z+0.0001),p);
		return unitVector(vectorProduct(u,v));
	}
		
	function dataPush(a,z)
	{	
		var p = vertex(a,z);
		var n = normal(a,z);
		data.push(p[0],p[1],p[2],n[0],n[1],n[2]);
	}
	
	var data = [];
	
	var dZ = 1/ROTATIONAL_LEVELS;
	for (var zi=0; zi<ROTATIONAL_LEVELS; zi++)
	{
		var a = 0, dA = 2*Math.PI/ROTATIONAL_SIDES;

		var z1 = zi*dZ;
		var z2 = (zi+1)*dZ;
		
		for (var ai=0; ai<=ROTATIONAL_SIDES; ai++)
		{
			dataPush(a,z1);
			dataPush(a,z2);
			a += dA;
		}
	}

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	
	this.l = ROTATIONAL_LEVELS;
	this.n = ROTATIONAL_SIDES*2+2;
	this.buf = buf;
	this.center = center;
	this.size = size;
	this.color = [[1,0.5,1],[0.9,0.4,0.8]];
}

RotationalSolid.prototype.draw = function()
{	
	pushMatrix();
	translate(this.center);
	scale(this.size);
	useMatrix();

	gl.uniform1i(uUseNormalMatrix,true);
	var nmat = calculateNormalMatrix(multiplyMatrix(glvmat,glmat));
	gl.uniformMatrix4fv(uNormalMatrix,false,nmat);

		gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);

		gl.enableVertexAttribArray(aXYZ);
		gl.vertexAttribPointer(aXYZ,3,gl.FLOAT,false,6*FLOATS,0*FLOATS);

		gl.enableVertexAttribArray(aNormal);
		gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,6*FLOATS,3*FLOATS);

		for (var i=0; i<this.l; i++)
		{
			gl.vertexAttrib3fv(aColor,this.color[i%2]);
			gl.drawArrays(gl.TRIANGLE_STRIP,this.n*i,this.n);
		}
		
	gl.uniform1i(uUseNormalMatrix,false);

	popMatrix();
}


function loadTexture(url,post)
{
	var texture = gl.createTexture();
	var image = new Image();
	image.onload = function()
	{
		imageLoaded(texture,image);
		if (post) post(texture);
	};
	image.src = url;
	return texture;
}
	
	
function imageLoaded(texture,image)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
}


CanonicalCylinder = function(n)
{	
	var a = 0, dA = 2*Math.PI/n;

	var data = [0,0,0, 0,0,-1, 0.5,0.5];
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),0,0,0,-1, 0.5+0.5*Math.cos(a),0.5+0.5*Math.sin(a));
		a += dA;
	}

	data.push(0,0,1, 0,0,1, 0.5,0.5);
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),1,0,0,1, 0.5+0.5*Math.cos(a),0.5+0.5*Math.sin(a));
		a += dA;
	}

	a = 0;
	var nZ = Math.cos(Math.PI/n);
	for (var i=0; i<=n; i++)
	{ 
		var N = [Math.cos(a),Math.sin(a)];
		var M = [Math.cos(a+dA),Math.sin(a+dA)];
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0, i/n,1);
		data.push(Math.cos(a),Math.sin(a),0,N[0],N[1],0, i/n,0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,M[0],M[1],0, (i+1)/n,0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),1,M[0],M[1],0, (i+1)/n,1);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,M[0],M[1],0, (i+1)/n,0);
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0, i/n,1);
		a += dA;
	}
	
	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	
	this.n = n;
	this.buf = buf;
}

CanonicalCylinder.prototype.draw = function(hollow, texture, texMatrix, texMatrixBase)
{	
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);

	gl.enableVertexAttribArray(aXYZ);
	gl.vertexAttribPointer(aXYZ,3,gl.FLOAT,false,8*FLOATS,0*FLOATS);

	gl.enableVertexAttribArray(aNormal);
	gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,8*FLOATS,3*FLOATS);

	if (gl.isTexture(texture))
	{
		gl.bindTexture(gl.TEXTURE_2D,texture);
		gl.enableVertexAttribArray(aST);
		gl.vertexAttribPointer(aST,2,gl.FLOAT,false,8*FLOATS,6*FLOATS);
	}
	else
	{
		gl.disableVertexAttribArray(aST);
	}

	if (!hollow)
	{
		gl.uniformMatrix3fv(uTexMatrix,false,texMatrixBase);
		gl.drawArrays(gl.TRIANGLE_FAN,0,this.n+2);
		gl.drawArrays(gl.TRIANGLE_FAN,this.n+2,this.n+2);
	}

	gl.uniformMatrix3fv(uTexMatrix,false,texMatrix);
	gl.drawArrays(gl.TRIANGLES,2*this.n+4,6*this.n);
}

var canonicalCylinder = [];

var CYLINDER_SIDES = 32;
Cylinder = function(center,size,height)
{
	this.center = center;
	this.size = size;
	this.height = height;
	this.n = CYLINDER_SIDES;
	this.color = [1,0.75,0];
	this.offset = undefined;
	this.hollow = false;
	this.rot = undefined;
	this.texture = undefined;
	this.texMatrix = new Float32Array([1,0,0,0,1,0,0,0,1]);
	this.texMatrixBase = new Float32Array([1,0,0,0,1,0,0,0,1]); 
	if (!canonicalCylinder[this.n])
		canonicalCylinder[this.n] = new CanonicalCylinder(this.n);
}

Cylinder.prototype.draw = function()
{
	pushMatrix();
	gl.vertexAttrib3fv(aColor,this.color);
	translate(this.center);
	if (this.rot)
	{
		if (this.rot[0]) zRotate(this.rot[0]);
		if (this.rot[1]) yRotate(this.rot[1]);
		if (this.rot[2]) xRotate(this.rot[2]);
		if (this.rot[3]) zRotate(this.rot[3]);
	}
	scale([this.size,this.size,this.height]);
	if (this.offset) translate(this.offset);
	useMatrix();
	canonicalCylinder[this.n].draw(this.hollow,this.texture,this.texMatrix,this.texMatrixBase);
	popMatrix();
}


function texIdentity()
{
	return new Float32Array([1,0,0,0,1,0,0,0,1]);
}


function texTranslate(m,v)
{
	m[6] += m[0]*v[0]+m[3]*v[1];
	m[7] += m[1]*v[0]+m[4]*v[1];
}

function texScale(m,v)
{
	m[0] *= v[0];
	m[1] *= v[0];
	
	m[3] *= v[1];
	m[4] *= v[1];
}


function texRotate(m,a)
{
	a = radians(a);
	var s = Math.sin(a);
	var c = Math.cos(a);
	
	a = m[0]*s+m[3]*c;
	m[0]=m[0]*c-m[3]*s;
	m[3]=a;
	
	a = m[1]*s+m[4]*c;
	m[1]=m[1]*c-m[4]*s;
	m[4]=a;
}

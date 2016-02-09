
var canvas;
var gl;
var program;
var program2;

var points = [];
var pPoints = [];
var colors = [];
var pColors = [];

var NumTimesToSubdivide = 2;
var vertices;
var lpx = null;
var lpy = null;

var axis = 0; //x=0, y=1, z=2
var theta = [ 0, 0, 0 ];
var thetaLoc;

//perspective/camera stuff
var near = 1.0;
var far = 50.0;
var radius = 4.0;
var epsilon  = 0.0;
var phi    = 0.0;
var fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio
var mvMatrix, pMatrix;
var modelView, projection, modelView2, projection2;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect =  canvas.width/canvas.height;
    gl.clearColor(0.5, 0.5, 1.0, 1.0);
    
    vertices = [
	    vec3(  0.0000,  0.0000,  1.3333 ),
	    vec3(  0.0000,  0.9428,  0.3333 ),
	    vec3( -0.8165, -0.4714,  0.3333 ),
	    vec3(  0.8165, -0.4714,  0.3333 )
	];
    
    // enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);
    
    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    program2 = initShaders( gl, "vertex-shader2", "fragment-shader" );
    
    modelView = gl.getUniformLocation( program, "modelView" );
    projection = gl.getUniformLocation( program, "projection" );
    modelView2 = gl.getUniformLocation( program2, "modelView" );
    projection2 = gl.getUniformLocation( program2, "projection" );
    thetaLoc = gl.getUniformLocation(program, "theta"); 
    plane(-2.0, true);
    
    repaint();
    
    //event handlers
    document.getElementById("subdiv").onchange = function(event) {
        NumTimesToSubdivide = event.target.value;
        repaint();
    };
    
    document.getElementById( "xButton" ).onclick = function () {axis = 0;};
    document.getElementById( "yButton" ).onclick = function () {axis = 1;};
    document.getElementById( "zButton" ).onclick = function () {axis = 2;};
    document.getElementById( "bump" ).onclick = function () {
    	pPoints = []; pColor = [];
    	plane(-2.0, true);
    };
    document.getElementById( "reset" ).onclick = function () {
	    vertices = [
		    vec3(  0.0000,  0.0000,  1.3333 ),
		    vec3(  0.0000,  0.9428,  0.3333 ),
		    vec3( -0.8165, -0.4714,  0.3333 ),
		    vec3(  0.8165, -0.4714,  0.3333 )
		];
		repaint();
		theta = [ 0, 0, 0 ];
	};
    
    canvas.addEventListener("mousedown", function(event){
	    if (event.which == 1) {
	    	lpx = event.pageX;
	    	lpy = event.pageY;
	    }
    });
    
    canvas.addEventListener("mouseup", function(event){
	    if (event.which == 1) {
	    	lpx = null;
	    	lpy = null;
	    }
    });
    
    canvas.addEventListener("mousemove", function(event){
	    if (event.which == 1) {
	        var deltaX = lpx - event.pageX;
	        var deltaY = lpy - event.pageY;
            if(event.shiftKey) theta[axis]-=deltaY/2;
        	else{
        		for(var i = 0; i < vertices.length; i++) vertices[i][0] -= deltaX/100;
        		for(var i = 0; i < vertices.length; i++) vertices[i][2] += deltaY/100;
        	}
			repaint();
		    lpx = event.pageX;
		    lpy = event.pageY;
	    }
	});
    
    render();
};

function repaint(){
    points = []; colors = [];
    divideTetra( vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);
	//plane(-2.0);
};

function plane(ph, isBumpy){
	//lr, ud, fb -1 1 ph = plane height 
	var bump  = [];
	for(var i = -10.0; i <= 10.0; i++){
		bump[i+10] = [];
		for(var j = -30.0; j <= 0.0; j++){
			if(isBumpy) bump[i+10][j+30] = Math.random()/2-0.25;
			else bump[i+10][j+30] = 0;
		}
	}
	for(var i = -10.0; i < 10.0; i++){
		for(var j = -30.0; j < 0.0; j++){
			var c = (i + j) % 2 + 1;
			if(c == 2) c = 0;
			square(
				vec3(i, ph + bump[i+10][j+30+1], j + 1.0),
				vec3(i + 1.0, ph + bump[i+10+1][j+30+1], j + 1.0),
				vec3(i + 1.0, ph + bump[i+10+1][j+30], j),
				vec3(i, ph + bump[i+10][j+30], j),
			c);
		}
	}
}

function triangle( a, b, c, color )
{

    // add colors and vertices for one triangle

    var baseColors = [
        vec3(1.0, 0.0, 0.0), //red
        vec3(0.0, 1.0, 0.0), //green
        vec3(0.0, 0.0, 1.0), //blue
        vec3(0.0, 0.0, 0.0) //black
    ];

    colors.push( baseColors[color] );
    points.push( a );
    colors.push( baseColors[color] );
    points.push( b );
    colors.push( baseColors[color] );
    points.push( c );
}

function pTriangle( a, b, c, color )
{

    // add colors and vertices for one triangle

    var baseColors = [
        vec3(0.0, 0.0, 0.0), //black
        vec3(0.1, 0.5, 0.5)  //aqua
    ];

    pColors.push( baseColors[color] );
    pPoints.push( a );
    pColors.push( baseColors[color] );
    pPoints.push( b );
    pColors.push( baseColors[color] );
    pPoints.push( c );
}

function square( a, b, c, d, color){
	pTriangle (a, b, c, color);
	pTriangle (a, c, d, color);
}

function tetra( a, b, c, d )
{
    // tetrahedron with each side using
    // a different color
    
    triangle( a, c, b, 0 );
    triangle( a, c, d, 1 );
    triangle( a, b, d, 2 );
    triangle( b, c, d, 3 );
}

function divideTetra( a, b, c, d, count )
{
    // check for end of recursion
    
    if ( count === 0 ) {
        tetra( a, b, c, d );
    }
    
    // find midpoints of sides
    // divide four smaller tetrahedra
    
    else {
        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var ad = mix( a, d, 0.5 );
        var bc = mix( b, c, 0.5 );
        var bd = mix( b, d, 0.5 );
        var cd = mix( c, d, 0.5 );

        --count;
        
        divideTetra(  a, ab, ac, ad, count );
        divideTetra( ab,  b, bc, bd, count );
        divideTetra( ac, bc,  c, cd, count );
        divideTetra( ad, bd, cd,  d, count );
    }
}


function render()
{
    gl.useProgram( program );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3( radius * Math.sin(epsilon) * Math.cos(phi),
    			radius * Math.sin(epsilon) * Math.sin(phi),
    			radius * Math.cos(epsilon));
    mvMatrix = lookAt(eye, at , up);
    pMatrix = perspective(fovy, aspect, near, far);
    
	//theta[axis] += 2.0;
    gl.uniform3fv(thetaLoc, theta);
    
    gl.uniformMatrix4fv( modelView, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );
    
    // Create a buffer object, initialize it, and associate it with the
    //  associated attribute variable in our vertex shader
	var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
    
	var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
    
    gl.useProgram( program2 );
    gl.uniformMatrix4fv( modelView2, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection2, false, flatten(pMatrix) );
	
	var cBuffer2 = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer2 );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pColors), gl.STATIC_DRAW );
    
    var vColor2 = gl.getAttribLocation( program2, "pColor" );
    gl.vertexAttribPointer( vColor2, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor2 );
    
	var vBuffer2 = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer2 );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pPoints), gl.STATIC_DRAW );

    var vPosition2 = gl.getAttribLocation( program2, "pPosition" );
    gl.vertexAttribPointer( vPosition2, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition2 );
	
    gl.drawArrays( gl.TRIANGLES, 0, pPoints.length );
    
    requestAnimFrame( render );
}

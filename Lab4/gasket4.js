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

//rotation stuff
var axis = 0; //x=0, y=1, z=2
var theta = [ 0, 0, 0 ];
var thetaLoc;

//perspective/camera stuff
var near = 0.1;
var far = 100.0;
var epsilon  = 0.0;
var phi    = 0.0;
var fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var modelView, projection, modelView2, projection2;
var eye = vec3(0.0, 0.0, -3.0);
var at;
var up = vec3(0.0, 1.0, 0.0);

//move stuff
var upKey = false;
var downKey = false;
var leftKey = false;
var rightKey = false;
var forwardKey = false;
var backwardKey = false;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    setAt();
    gl.clearColor(0.5, 0.5, 1.0, 1.0);
    
    vertices = [
	    vec3(  0.0000,  0.0000, -1.0000 ),
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
    planeData(-2.0, 63, 0.1);
    
    drawGasket();
    render();
    
    //event handlers
    document.getElementById("subdiv").onchange = function(event) {
        NumTimesToSubdivide = event.target.value;
        drawGasket();
    };
    
    document.getElementById( "xButton" ).onclick = function () {axis = 0;};
    document.getElementById( "yButton" ).onclick = function () {axis = 1;};
    document.getElementById( "zButton" ).onclick = function () {axis = 2;};
    document.getElementById( "increaseFOV" ).onclick = function () {if(fovy < 175) fovy+=5;};
    document.getElementById( "decreaseFOV" ).onclick = function () {if(fovy > 5) fovy-=5;};
	
    document.getElementById( "reset" ).onclick = function () {
	    vertices = [
		    vec3(  0.0000,  0.0000, -1.0000 ),
		    vec3(  0.0000,  0.9428,  0.3333 ),
		    vec3( -0.8165, -0.4714,  0.3333 ),
		    vec3(  0.8165, -0.4714,  0.3333 )
		]; //reset gasket position
		drawGasket(); //(and redraw gasket position)
		theta = [ 0, 0, 0 ]; //reset gasket rotation
		fovy = 45.0; //reset FOV
		epsilon = 0; //reset horizontal cam rotation
		phi = 0; //reset vertical cam rotation
		eye = vec3(0.0, 0.0, -3.0); //reset vertical cam position
		setAt(); //and where cam is looking
	};
    
    canvas.addEventListener("mousedown", function(event){
	    if (event.which == 1 || event.which == 3) {
	    	lpx = event.pageX;
	    	lpy = event.pageY;
	    }
    });
    
    canvas.addEventListener("mouseup", function(event){
	    if (event.which == 1 || event.which == 3) {
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
        		for(var i = 0; i < vertices.length; i++) vertices[i][0] += deltaX/100;
        		for(var i = 0; i < vertices.length; i++) vertices[i][2] -= deltaY/100;
        	}
			drawGasket();
		    lpx = event.pageX;
		    lpy = event.pageY;
	    }else if (event.which == 3) {
	    	var deltaX = lpx - event.pageX;
	        var deltaY = lpy - event.pageY;
    		epsilon += deltaX/100;
    		phi += deltaY/100;
    		if(phi > 1.58 || phi < -1.58) phi -= deltaY/100;
			setAt();
		    lpx = event.pageX;
		    lpy = event.pageY;
	    }
	});
	
	window.onkeydown = function( event ) {
        var key = String.fromCharCode(event.keyCode);
        switch(key){
        	case 'D': rightKey = true; break;
	        case 'A': leftKey = true; break;
	        case 'W': forwardKey = true; break;
	        case 'S': backwardKey = true; break;
	        case 'R': upKey = true; break;
	        case 'F': downKey = true; break;
		}
    }
    
    window.onkeyup = function( event ) {
        var key = String.fromCharCode(event.keyCode);
        switch(key){
        	case 'D': rightKey = false; break;
	        case 'A': leftKey = false; break;
	        case 'W': forwardKey = false; break;
	        case 'S': backwardKey = false; break;
	        case 'R': upKey = false; break;
	        case 'F': downKey = false; break;
		}
    }
};

function setAt(){
	at  = vec3( eye[0] + Math.sin(epsilon) * Math.cos(phi),
				eye[1] +                     Math.sin(phi),
				eye[2] + Math.cos(epsilon) * Math.cos(phi));
}

function moveCamera(){
	if(rightKey){
    	eye[0] -= Math.cos(epsilon) * 0.1;
    	eye[2] += Math.sin(epsilon) * 0.1;
	}
	if(leftKey){
    	eye[0] += Math.cos(epsilon) * 0.1;
    	eye[2] -= Math.sin(epsilon) * 0.1;
    }
	if(forwardKey){
    	eye[0] += Math.sin(epsilon) * 0.1;
    	eye[2] += Math.cos(epsilon) * 0.1;
    }
    if(backwardKey){
    	eye[0] -= Math.sin(epsilon) * 0.1;
    	eye[2] -= Math.cos(epsilon) * 0.1;
	}
    if(upKey) eye[1] += 0.1;
    if(downKey) eye[1] -= 0.1;
	setAt();
}

function plane(ph, r, ss, isBumpy){
	//lr, ud, fb -1 1 ph = plane height
	var bump  = [];
	for(var i = -r; i <= r; i++){
		bump[i+r] = [];
		for(var j = -r; j <= r; j++){
			if(isBumpy) bump[i+r][j+r] = Math.random()/2-0.25;
			else bump[i+r][j+r] = 0;
		}
	}
	for(var i = -r; i < r; i++){
		for(var j = -r; j < r; j++){
			var c = (i + j) % 2 + 1;
			if(c == 2) c = 0;
			square(
				vec3(i*ss, ph + bump[i+r][j+r+1], (j+1)*ss),
				vec3((i+1)*ss, ph + bump[i+r+1][j+r+1], (j+1)*ss),
				vec3((i+1)*ss, ph + bump[i+r+1][j+r], j*ss),
				vec3(i*ss, ph + bump[i+r][j+r], j*ss),
			c);
		}
	}
}

function planeData(ph, r, ss){
	//lr, ud, fb -1 1 ph = plane height
	var bump  = [];
	var step = 0;
	for(var i = 0; i < 256; i++){
		bump[i] = [];
		for(var j = 0; j < 256; j++){
			bump[i][j] = data[step*2]/100;
			step++;
		}
	}
	for(var i = -r; i < r; i++){
		for(var j = -r; j < r; j++){
			var c = (i + j) % 2 + 1;
			if(c == 2) c = 0;
			square(
				vec3(i*ss, ph + bump[i+r][j+r+1], (j+1)*ss),
				vec3((i+1)*ss, ph + bump[i+r+1][j+r+1], (j+1)*ss),
				vec3((i+1)*ss, ph + bump[i+r+1][j+r], j*ss),
				vec3(i*ss, ph + bump[i+r][j+r], j*ss),
			c);
		}
	}
}

function drawGasket(){
    points = []; colors = [];
    divideTetra( vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);
};

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

function render(){
	moveCamera();
    gl.useProgram( program );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var mvMatrix = lookAt(eye, at , up);
    var aspect = canvas.width/canvas.height;
    var pMatrix = perspective(fovy, aspect, near, far);
    
    gl.uniform3fv(thetaLoc, theta);
    gl.uniformMatrix4fv( modelView, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );
    
    // Create a buffer object, initialize it, and associate it with the
    //  associated attribute variable in our vertex shader
    // Gasket
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
    
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
    
    //Plane
    gl.useProgram( program2 );
    gl.uniformMatrix4fv( modelView2, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection2, false, flatten(pMatrix) );
	
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pColors), gl.STATIC_DRAW );
    
    var vColor2 = gl.getAttribLocation( program2, "pColor" );
    gl.vertexAttribPointer( vColor2, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor2 );
    
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pPoints), gl.STATIC_DRAW );

    var vPosition2 = gl.getAttribLocation( program2, "pPosition" );
    gl.vertexAttribPointer( vPosition2, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition2 );
	
    gl.drawArrays( gl.TRIANGLES, 0, pPoints.length );
    
    requestAnimFrame( render );
}

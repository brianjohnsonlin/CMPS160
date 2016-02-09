
var canvas;
var gl;
var points = [];
var NumTimesToSubdivide = 5;
var div = 10;
var ra1 = (Math.random()-0.5)/div;;
var ra2 = (Math.random()-0.5)/div;;
var rb1 = (Math.random()-0.5)/div;;
var rb2 = (Math.random()-0.5)/div;;
var rc1 = (Math.random()-0.5)/div;;
var rc2 = (Math.random()-0.5)/div;;
var color = 'R';
var paint = false;
var vertices = [
    vec2(-0.9, -0.9),
    vec2( 0.0,  0.5),
    vec2( 0.9, -0.9)
];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
        
    //Sierpinski Gasket
    divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);

    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //paint gasket
    repaint();
    
    // Initialize event handlers
    document.getElementById("subdiv").onchange = function(event) {
        NumTimesToSubdivide = event.target.value;
        points = [];
	    divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
        repaint();
    };
    
    document.getElementById("Reset").onclick = function () {
		randomizeOffset();
		vertices = [
		    vec2(-0.9, -0.9),
		    vec2( 0.0,  0.5),
		    vec2( 0.9, -0.9)
		];
		color = 'R';
        points = [];
	    divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
        repaint();
    };
    
    document.getElementById("enter").onclick = function () {
		var guess = parseInt(document.getElementById("guess").value);
		if(!isNaN(guess)){
			var area = Math.abs(
				vertices[0][0]*(vertices[1][1]-vertices[2][1])+
				vertices[1][0]*(vertices[2][1]-vertices[0][1])+
				vertices[2][0]*(vertices[0][1]-vertices[1][1])
			)/2*10;
			if(area+0.5 > guess && area-0.5 < guess) color = 'L';
			else if(area > guess) color = 'C';
			else color = 'M';
			repaint();
		}
    };
    
    window.onkeydown = function( event ) {
        var key = String.fromCharCode(event.keyCode);
        if(key == 'R' || key == 'G' || key == 'B'){
	        color = key;
	        points = [];
		    divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
	        repaint();
        }
        if(key == 'P') paint = true;
    }
    
    window.onkeyup = function(event){
    	var key = String.fromCharCode(event.keyCode);
    	if(key == 'P') paint = false;
    }
    
    canvas.addEventListener("mousemove", function(event){
    	canvas_x = (event.pageX-8-256)/256;
    	canvas_y = -(event.pageY-195-256)/256;
    	if(event.which == 1) vertices[1] = vec2( canvas_x, canvas_y);
		else if(event.which == 2) vertices[0] = vec2( canvas_x, canvas_y);
		else if(event.which == 3) vertices[2] = vec2( canvas_x, canvas_y);
        if(!paint && event.which != 0) points = [];
	    divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
        repaint();
    }, false);
};

function repaint(){
	var program;
	
    //  Load shaders and initialize attribute buffers
    if(color == 'R') program = initShaders( gl, "vertex-shader", "fragment-shader-red" );
    else if (color == 'G') program = initShaders( gl, "vertex-shader", "fragment-shader-green" );
    else if (color == 'B') program = initShaders( gl, "vertex-shader", "fragment-shader-blue" );
    else if (color == 'L') program = initShaders( gl, "vertex-shader", "fragment-shader-black" );
    else if (color == 'M') program = initShaders( gl, "vertex-shader", "fragment-shader-mag" );
    else if (color == 'C') program = initShaders( gl, "vertex-shader", "fragment-shader-cyan" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    render();
}

function randomizeOffset(){
	ra1 = (Math.random()-0.5)/div;
	ra2 = (Math.random()-0.5)/div;
	rb1 = (Math.random()-0.5)/div;
	rb2 = (Math.random()-0.5)/div;
	rc1 = (Math.random()-0.5)/div;
	rc2 = (Math.random()-0.5)/div;
}

function triangle( a, b, c ){
    points.push( a, b, c, a );
}

function divideTriangle( a, b, c, count ){
    // check for end of recursion
    if ( count === 0 ) {
        triangle( a, b, c );
    }else{
        //bisect the sides
        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );
        --count;
		
		if(count != 0){
	    	var newab = add(ab,vec2( ra1, ra2 ));
	    	var newac = add(ac,vec2( rb1, rb2 ));
	    	var newbc = add(bc,vec2( rc1, rc2 ));
	
	        // three new triangles
	        
	        divideTriangle( a, newab, newac, count );
	        divideTriangle( c, newac, newbc, count );
	        divideTriangle( b, newbc, newab, count );
        }else{
       		divideTriangle( a, ab, ac, count );
	        divideTriangle( c, ac, bc, count );
	        divideTriangle( b, bc, ab, count );
       }
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.LINES, 0, points.length );
}
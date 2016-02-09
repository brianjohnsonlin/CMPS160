var canvas;
var gl;
var program;

//geometry
var numTimesToSubdivide = 2;
var index = 0;
var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);
var trans = vec4(0.0, 0.0, 0.0, 0.0);
var pointsArray = [];
var normalsArray = [];
var colorsArray = [];
var bumpMap = true;

//lighting
var shading = 0; //phong, gouraud, cartoon, none
var lightPosition = vec4(1.0, 1.0, 1.0, 1.0 );
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 0.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;
var ctm;
var ambientColor, diffuseColor, specularColor;

//camera
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye = vec3(0.0, 0.0, -3.0);
var at;
var up = vec3(0.0, 1.0, 0.0);
var near = 1;
var far = 50;
var fovy = 45.0;
var radius = 1.0;
var theta  = 0.0;
var phi    = 0.0;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5,1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
    setAt();

    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    draw();
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"),materialShininess );
    gl.uniform1f( gl.getUniformLocation(program, "shading"), 0.0 );
    
    //event handlers
	canvas.oncontextmenu = function(event){event.preventDefault();};
   
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
            if(event.shiftKey){
        		trans[1] -= deltaY/100;
            }else{
        		trans[0] += deltaX/100;
        		trans[2] -= deltaY/100;
        	}
			draw();
		    lpx = event.pageX;
		    lpy = event.pageY;
	    }else if (event.which == 3) {
	    	var deltaX = lpx - event.pageX;
	        var deltaY = lpy - event.pageY;
    		theta += deltaX/100;
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
	        
        	case 'H': rightLight = true; break;
	        case 'K': leftLight = true; break;
	        case 'U': forwardLight = true; break;
	        case 'J': backwardLight = true; break;
	        case 'O': upLight = true; break;
	        case 'L': downLight = true; break;
		}
    };
    
    window.onkeyup = function( event ) {
        var key = String.fromCharCode(event.keyCode);
        switch(key){
        	case 'D': rightKey = false; break;
	        case 'A': leftKey = false; break;
	        case 'W': forwardKey = false; break;
	        case 'S': backwardKey = false; break;
	        case 'R': upKey = false; break;
	        case 'F': downKey = false; break;
	        
        	case 'H': rightLight = false; break;
	        case 'K': leftLight = false; break;
	        case 'U': forwardLight = false; break;
	        case 'J': backwardLight = false; break;
	        case 'O': upLight = false; break;
	        case 'L': downLight = false; break;
		}
    };
    
    document.getElementById("subdiv").onchange = function(event) {
        numTimesToSubdivide = event.target.value;
        draw();
    };
	
    document.getElementById( "reset" ).onclick = function () {
		shading = 0;
		theta   = 0.0;
		phi     = 0.0;
		fovy    = 45.0;
		trans   = vec4(0.0, 0.0, 0.0, 0.0);
		lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
		eye = vec3(0.0, 0.0, -3.0);
		setAt();
		draw();
	};
    
    document.getElementById( "increaseFOV" ).onclick = function () {if(fovy < 175) fovy+=5;};
    document.getElementById( "decreaseFOV" ).onclick = function () {if(fovy > 5) fovy-=5;};
    document.getElementById( "planeBump" ).onclick = function () { bumpMap = !bumpMap; draw(); };
	document.getElementById( "phong"   ).onclick = function () { shading = 0; draw(); };
	document.getElementById( "gouraud" ).onclick = function () { shading = 1; draw(); };
	document.getElementById( "cartoon" ).onclick = function () { shading = 2; draw(); };
	document.getElementById( "none"    ).onclick = function () { shading = 3; draw(); };

    render();
}

function setAt(){
	at  = vec3( eye[0] + Math.sin(theta) * Math.cos(phi),
				eye[1] +                   Math.sin(phi),
				eye[2] + Math.cos(theta) * Math.cos(phi));
}
    
function triangle(a, b, c, color) {
	var baseColors = [
        vec3(1.0, 0.0, 0.0), //red
        vec3(0.0, 1.0, 0.0), //green
        vec3(0.0, 0.0, 1.0), //blue
        vec3(0.1, 0.5, 0.5), //aqua
        vec3(0.0, 0.4, 0.4), //aqua2
        vec3(0.0, 0.0, 0.0)  //black
    ];
    
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);
    colorsArray.push(baseColors[color]);
    colorsArray.push(baseColors[color]);
    colorsArray.push(baseColors[color]);
	
	if(bumpMap){
		if (color == 3){
			a = add(a, vec4(2.0, 0.0, -2.0, 0.0));
			b = add(b, vec4(2.0, 0.0, -2.0, 0.0));
			c = add(c, vec4(2.0, 0.0, -2.0, 0.0));
			/*
			a = add(a, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			b = add(b, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			c = add(c, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			*/
		}
		if (color == 4){
			a = add(a, vec4(-2.0, 0.0, 2.0, 0.0));
			b = add(b, vec4(-2.0, 0.0, 2.0, 0.0));
			c = add(c, vec4(-2.0, 0.0, 2.0, 0.0));
			/*
			a = add(a, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			b = add(b, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			c = add(c, vec4((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 0.0));
			*/
		}
	}
	
	switch(shading){
		case 0:
		    normalsArray.push(a);
		    normalsArray.push(b);
		    normalsArray.push(c);
		    gl.uniform1f( gl.getUniformLocation(program, "shading"), 0.0 );
		    break;
		case 1:
			var t1 = subtract(b, a);
		    var t2 = subtract(c, a);
		    var normal = normalize(cross(t1, t2));
		    normal = vec4(normal);
		
		    normalsArray.push(normal);
		    normalsArray.push(normal);
		    normalsArray.push(normal);
		    gl.uniform1f( gl.getUniformLocation(program, "shading"), 1.0 );
		    break;
		case 2: 
		    normalsArray.push(a);
		    normalsArray.push(b);
		    normalsArray.push(c);
			gl.uniform1f( gl.getUniformLocation(program, "shading"), 2.0 );
			break;
		case 3: 
		    normalsArray.push(vec4());
		    normalsArray.push(vec4());
		    normalsArray.push(vec4());
			gl.uniform1f( gl.getUniformLocation(program, "shading"), 3.0 );
			break;
	}

    index += 3;
}

function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {
                
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);
                
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);
                                
        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else { 
		a = add(a, trans);
		b = add(b, trans);
		c = add(c, trans);
        triangle( a, b, c, 1 );
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
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
				vec4(i*ss, ph + bump[i+r][j+r+1], (j+1)*ss, 1.0),
				vec4((i+1)*ss, ph + bump[i+r+1][j+r+1], (j+1)*ss, 1.0),
				vec4((i+1)*ss, ph + bump[i+r+1][j+r], j*ss, 1.0),
				vec4(i*ss, ph + bump[i+r][j+r], j*ss, 1.0),
			c + 3);
		}
	}
}

function square( a, b, c, d, color){
	triangle (a, b, c, color);
	triangle (a, c, d, color);
}

//key presses
var lpx = null;
var lpy = null;
var upKey = false;
var downKey = false;
var leftKey = false;
var rightKey = false;
var forwardKey = false;
var backwardKey = false;
var upLight = false;
var downLight = false;
var leftLight = false;
var rightLight = false;
var forwardLight = false;
var backwardLight = false;
function moveStuff(){
	if(rightKey){
    	eye[0] -= Math.cos(theta) * 0.1;
    	eye[2] += Math.sin(theta) * 0.1;
	}
	if(leftKey){
    	eye[0] += Math.cos(theta) * 0.1;
    	eye[2] -= Math.sin(theta) * 0.1;
    }
	if(forwardKey){
    	eye[0] += Math.sin(theta) * 0.1;
    	eye[2] += Math.cos(theta) * 0.1;
    }
    if(backwardKey){
    	eye[0] -= Math.sin(theta) * 0.1;
    	eye[2] -= Math.cos(theta) * 0.1;
	}
    if(upKey) eye[1] += 0.1;
    if(downKey) eye[1] -= 0.1;
	setAt();
	
	if(rightLight    ) lightPosition[0] += 0.1;
	if(leftLight     ) lightPosition[0] -= 0.1;
	if(forwardLight  ) lightPosition[2] += 0.1;
    if(backwardLight ) lightPosition[2] -= 0.1;
    if(upLight       ) lightPosition[1] += 0.1;
    if(downLight     ) lightPosition[1] -= 0.1;
}

function draw(){
	index = 0;
    pointsArray = []; 
    normalsArray = [];
    colorsArray = [];
    
	tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    plane(-1.0, 10, 1.0, false);
	
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function render() {
	moveStuff();
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt(eye, at , up);
    var aspect = canvas.width/canvas.height;
    projectionMatrix = perspective(fovy, aspect, near, far);
            
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );
        
    for( var i=0; i<index; i+=3) 
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}

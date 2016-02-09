var canvas;
var gl;

var vertices = [];
var indices = [];
var transx = 0.0;
var transy = 0.0;
var transz = 0.0;
var tex;
var ptex;
var mipmap = false;

//lighting
var shading = 0; //phong, none
var lightPosition = vec4(1.0, 1.0, 1.0, 1.0 );
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 0.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

//camera
var eye = vec3(0.0, 0.0, -3.0);
var at;
var up     = vec3(0.0, 1.0, 0.0);
var radius = 1.0;
var theta  = 0.0;
var phi    = 0.0;

function scale( x, y, z )
{
    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}

// A simple data structure for our vertex data
function Vertex(position, texCoord, normal)
{
    var vertex =  [
            //Offset = 0
            position[0], position[1], position[2], 
            // Offset = 3
            normal[0], normal[1], normal[2], 
            //Offset = 6
            texCoord[0], texCoord[1] 
            //Size = Offset = 8 
        ];

    return vertex;
}

//Hard coded offsets and size because javascript doesn't have c style structs and sizeof operator
Vertex.offsetPosition = 0 * Float32Array.BYTES_PER_ELEMENT;
Vertex.offsetNormal = 3 * Float32Array.BYTES_PER_ELEMENT;
Vertex.offsetTexCoord = 6 * Float32Array.BYTES_PER_ELEMENT;
Vertex.size = 8 * Float32Array.BYTES_PER_ELEMENT;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    setAt();

    // Load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
	var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);
    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"),materialShininess );

    // Generate the data for both a plane and a sphere
    GeneratePlane(indices, vertices);
    GenerateSphere(indices, vertices);


    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate our shader variables with the data from our vertices buffer
    // Data packed as {(position, normal, textureCoord),(position, normal, textureCoord)...}
    // Stride = Vertex.size = sizeof(Vertex)
    // Offset of position data = Vertex.offsetPosition = offsetof(Vertex, position)

    // If you don't understand what stride and offset do look at the documentation...
    // https://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml

    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, Vertex.size, Vertex.offsetPosition);
    gl.enableVertexAttribArray( aPosition );

    // We didn't actually use aNormal in the shader so it will warn us. However if lighting was added they would be used.
    // INVALID_VALUE: vertexAttribPointer: index out of range 
    // INVALID_VALUE: enableVertexAttribArray: index out of range 
    var aNormal = gl.getAttribLocation( program, "aNormal" );
    gl.vertexAttribPointer( aNormal, 3, gl.FLOAT, false, Vertex.size, Vertex.offsetNormal );
    gl.enableVertexAttribArray( aNormal );

    var aTextureCoord = gl.getAttribLocation( program, "aTextureCoord" );
    gl.vertexAttribPointer( aTextureCoord, 2, gl.FLOAT, false, Vertex.size, Vertex.offsetTexCoord);
    gl.enableVertexAttribArray( aTextureCoord );
    
    gl.uniform1i( gl.getUniformLocation( program, "textureUnit0" ), 0); //Already 0 but lets be explicit
	
	//textures
	var earth = CreateTexture('earth.jpg',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    }
	);
	
	var metal = CreateTexture('metal.png',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    }
	);
	
	var wood = CreateTexture('wood.jpg',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    }
	);
	
    var whiteTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    var checkerboardData = [];
    for(var i = 0; i < 8; i++){
    	for(var j = 0; j < 16; j++){
	    	if((i+j+1)%2 == 0) checkerboardData.push(255, 0, 0, 255);
	    	else checkerboardData.push(0, 255, 0, 255);
    	}
    }
    var checkerboard = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, checkerboard);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(checkerboardData));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
	var planeChecker = CreateTexture('Checker.png',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	    }
	);
	
	//mipmapped textures
	var earthM = CreateTexture('earth.jpg',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.generateMipmap(gl.TEXTURE_2D);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    }
	);
	
	var metalM = CreateTexture('metal.png',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.generateMipmap(gl.TEXTURE_2D);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    }
	);
	
	var woodM = CreateTexture('wood.jpg',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	        gl.generateMipmap(gl.TEXTURE_2D);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    }
	);
	
    var whiteTextureM = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, whiteTextureM);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    checkerboardData = [];
    for(var i = 0; i < 8; i++){
    	for(var j = 0; j < 16; j++){
	    	if((i+j+1)%2 == 0) checkerboardData.push(255, 0, 0, 255);
	    	else checkerboardData.push(0, 255, 0, 255);
    	}
    }
    var checkerboardM = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, checkerboardM);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(checkerboardData));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
	var planeCheckerM = CreateTexture('Checker.png',
	    function(texture, image)
	    {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.generateMipmap(gl.TEXTURE_2D);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	    }
	);
	
	tex = earth;
	ptex = planeChecker;
	
    //Rendering this scene will warn about not complete textures until they are loaded.
    var myVar = setInterval
    (
        function () 
        {
            Render(tex, ptex);
        }, 16
    );
    
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
        		transy += deltaY/100;
            }else{
        		transx += deltaX/100;
        		transz += deltaY/100;
        	}
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
    
    document.getElementById( "lighting" ).onclick = function () {
		if(shading == 0.0) shading = 1;
		else shading = 0;
	};
	
	document.getElementById( "mipmap" ).onclick = function () {
		mipmap = !mipmap;
		if(ptex == planeChecker) ptex = planeCheckerM;
		else ptex = planeChecker;
		if(tex == metal) tex = metalM;
		else if(tex == wood) tex = woodM;
		else if(tex == earth) tex = earthM;
		else if(tex == whiteTexture) tex = whiteTextureM;
		else if(tex == checkerboard) tex = checkerboardM;
		else if(tex == metalM) tex = metal;
		else if(tex == woodM) tex = wood;
		else if(tex == whiteTextureM) tex = whiteTexture;
		else if(tex == checkerboardM) tex = checkerboard;
		else if(tex == earthM) tex = earth;
	};
	
	document.getElementById( "reset" ).onclick = function () {
		shading = 0;
		tex = earth;
		ptex = planeChecker;
		mipmap = false;
		theta   = 0.0;
		phi     = 0.0;
		transx = 0;
		transy = 0;
		transz = 0;
		lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
		eye = vec3(0.0, 0.0, -3.0);
		setAt();
	};
	
	document.getElementById( "metal" ).onclick = function () {
		if(!mipmap) tex = metal;
		else tex = metalM;
	};
	document.getElementById( "wood" ).onclick = function () {
		if(!mipmap) tex = wood;
		else tex = woodM;
	};
	document.getElementById( "earth" ).onclick = function () {
		if(!mipmap) tex = earth;
		else tex = earthM;
	};
	document.getElementById( "checker" ).onclick = function () {
		if(!mipmap) tex = checkerboard;
		else tex = checkerboardM;
	};
	document.getElementById( "none" ).onclick = function () {
		if(!mipmap) tex = whiteTexture;
		else tex = whiteTextureM;
	};
};

function setAt(){
	at  = vec3( eye[0] + Math.sin(theta) * Math.cos(phi),
				eye[1] +                   Math.sin(phi),
				eye[2] + Math.cos(theta) * Math.cos(phi));
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

function CreateTexture(file, loaded){
    var texture = gl.createTexture();
    var image = new Image();

    image.onload = function() 
    {
        loaded(texture, image);
    }
    image.src = file;

    return texture;
}

function GeneratePlane(indices, vertices)
{
    //The texture is in wrap = repeat so access outside the 0-1 mapped back into range.
    vertices.push(Vertex(vec3(-1, 0, -1), vec2(0, 0), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(-1, 0, 1), vec2(10, 0), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(1, 0, 1), vec2(10, 10), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(1, 0, -1), vec2(0, 10), vec3(0, 1, 0)));
    indices.push(0, 1, 2, 0, 2, 3);
}

function GenerateSphere(indices, vertices)
{

    var SPHERE_DIV = 25;

    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;

    var verticesBegin = vertices.length;

    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) 
    {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);

        for (i = 0; i <= SPHERE_DIV; i++) 
        {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            var x = si * sj;
            var y = cj;      
            var z = ci * sj; 
            vertices.push(Vertex(vec3(x, y, z), vec2(i/SPHERE_DIV, (1 - y)/2), vec3(x, y, z)));

        }
    }

    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) 
    {
        for (i = 0; i < SPHERE_DIV; i++) 
        {
            p1 = j * (SPHERE_DIV+1) + i;
            p2 = p1 + (SPHERE_DIV+1);

            indices.push(p1 + verticesBegin);
            indices.push(p2 + verticesBegin);
            indices.push(p1 + 1 + verticesBegin);

            indices.push(p1 + 1 + verticesBegin);
            indices.push(p2 + verticesBegin);
            indices.push(p2 + 1 + verticesBegin);
        }
    }
}

//Render.time = 0;
function Render(texture0, texture1)
{
    //Render.time += .16;
    moveStuff();
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    //View and projection are the same for both objects
    var projection = perspective(45.0, 1.0, 0.01, 50.0);
    var view = lookAt(eye, at , up);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projection" ), false, flatten(projection));


    //PLANE
    //Bind the texture we want to use
    gl.bindTexture(gl.TEXTURE_2D, texture1); //assuming activeTexture = TEXTURE0

    var model = mult(translate(0, -1, 0), scale(2, 2, 2));
    var modelView = mult(view, model);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "modelView" ), false, flatten(modelView));

    //Draw the 6 indices of the plane
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    //END PLANE

    //SPHERE
    gl.bindTexture(gl.TEXTURE_2D, texture0); //assuming activeTexture = TEXTURE0

    var model = mult(mult(translate(transx, transy, transz), scale(.5, .5, .5)), rotate(/*Render.time*10*/ 0, vec3(0, 1, 0)));
    var modelView = mult(view, model);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "modelView" ), false, flatten(modelView));
    
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shading"), shading );

    //Draw the indices of the sphere offset = 6 indices in the plane * sizeof(UNSIGNED_SHORT)
    gl.drawElements(gl.TRIANGLES, indices.length-6, gl.UNSIGNED_SHORT, 6 * Uint16Array.BYTES_PER_ELEMENT);
    //END SPHERE
}


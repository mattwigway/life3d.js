/**
 * The main game of life: width and height are pixels,
 * x, y, and z are cell sizes for the grid.
 */

function ThreeDGameOfLife (element, width, height, x, y, z) {
    if (typeof element == undefined)
        element = document.getElementsByTagName("body")[0];

    this.width = width || 900;
    this.height = height || 675;
    this.x = x || 15;
    this.y = y || 15;
    this.z = z || 15;

    // per-frame code path vars to avoid gc pause
    this.numNeighbors;

    // we set up two frames: one for the currently displayed grid, and one
    // for the next frame. This way, we don't bring Heisenberg's uncertainty
    // into play by modifying and reading from the same structure, and we
    // also aren't constantly recreating an x * y * z data structure
    this.bufferOne = this.generateBuffer();
    this.bufferTwo = this.generateBuffer();

    this.program = this.bufferOne;
    this.preview = this.bufferTwo;

    this.setup(this.bufferOne);

    // set up three.js
    this.setupRenderer();
    element.appendChild(this.renderer.domElement);

    // generate a buffer for the meshes
    this.renderBuffer = this.generateBuffer();

    // and fill it out
    this.generateGeometries(this.renderBuffer);
    
    this.onMaterial = this.generateCubeMaterial(0x333333, .25);
    this.offMaterial = this.generateCubeMaterial(0x333333, 0.0);

    this.render(this.bufferOne);

    var instance = this;

    // don't use requestAnimationFrame: we want 1 update / sec
    setInterval(function () {
        instance.getFrame();
    }, 1000);
}

/**
 * generate a buffer of x * y * z size
 */
ThreeDGameOfLife.prototype.generateBuffer = function () {
    var ret = [];
    for (var i = 0; i < this.x; i++) {
        ret.push([]);
        for (var j = 0; j < this.y; j++) {
            ret[i].push([]);
            for (var k = 0; k < this.z; k++) {
                ret[i][j].push(false);
            }
        }
    }
    return ret;
};

/**
 * randomly set up the provided buffer
 */
ThreeDGameOfLife.prototype.setup = function (buffer) {
    for (var i = 0; i < this.x; i++) {
        for (var j = 0; j < this.y; j++) {
            for (var k = 0; k < this.z; k++) {
                buffer[i][j][k] = Math.random() > 0.7;
            }
        }
    }
};

/**
 * Put appropriate geometries in the given render buffer
 */
ThreeDGameOfLife.prototype.generateGeometries = function (buffer) {
    // no need to recreate this array on each iteration
    var sides = [true, true, true, true, true, true];
    
    for (var i = 0; i < this.x; i++) {
        for (var j = 0; j < this.y; j++) {
            for (var k = 0; k < this.z; k++) {
                buffer[i][j][k] = new THREE.Mesh(
                    new THREE.CubeGeometry(1, 1, 1),
                    // bright red so we can see if something's not working.
                    new THREE.MeshLambertMaterial({ color: 0xFF0000 })
                )
                buffer[i][j][k].position.x = i;
                buffer[i][j][k].position.y = j;
                buffer[i][j][k].position.z = k;
                this.scene.add(buffer[i][j][k]);
            }
        }
    }
};

/**
 * set up and return a renderer.
 */
ThreeDGameOfLife.prototype.setupRenderer = function () {
    this.renderer = new THREE.CanvasRenderer();
    this.renderer.setSize(this.width, this.height);
    this.camera  = new THREE.PerspectiveCamera(
        45,
        this.width/this.height,
        0.1,
        10000);
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
    this.camera.position.z = 35;
    this.camera.position.x = 25;
    this.camera.position.y = 20;
    this.camera.lookAt(new THREE.Vector3(5, 5, 5));
};

/**
 * Generate a material with the given color and opacity.
 */
ThreeDGameOfLife.prototype.generateCubeMaterial = function (color, opacity) {
    return new THREE.MeshLambertMaterial ({
        color: color,
        opacity: opacity
    });
};

/**
 * Draw the given buffer using the renderer
 */
ThreeDGameOfLife.prototype.render = function (buffer) {
    var mesh;
     for (var i = 0; i < this.x; i++) {
        for (var j = 0; j < this.y; j++) {
            for (var k = 0; k < this.z; k++) {
                mesh = this.renderBuffer[i][j][k];
                mesh.material = (buffer[i][j][k] ? this.onMaterial : this.offMaterial);
            }
        }
    }

    this.renderer.render(this.scene, this.camera);
}

/**
 * Step the game of life one step, rendering from the step in input to output
 */
ThreeDGameOfLife.prototype.step = function (input, output) {
     for (var i = 0; i < this.x; i++) {
        for (var j = 0; j < this.y; j++) {
            for (var k = 0; k < this.z; k++) {
                // get how many neighbors are on
                this.getNumNeighbors(input, i, j, k);

                if (input[i][j][k]) {
                    if (this.numNeighbors >= 6 && this.numNeighbors <= 9) {
                        output[i][j][k] = true;
                    }
                    else {
                        output[i][j][k] = false;
                    }
                }
                else {
                    if (this.numNeighbors >= 7 && this.numNeighbors <= 9) {
                        output[i][j][k] = true;
                    }
                    else {
                        output[i][j][k] = false;
                    }
                }
            }
        }
    }
};

(function () {
    var i, j, k;
    /**
     * Get the number of neighbors on for a given buffer and xyz coord
     */
    ThreeDGameOfLife.prototype.getNumNeighbors = function (buffer, x, y, z) {
        this.numNeighbors = 0;
    
        for (i = x - 1; i <=  x + 1; i++) {
            for (j = y - 1; j <=  y + 1; j++) {
                for (k = z - 1; k <=  z + 1; k++) {
                    if (i < 0 || i >= this.x || j < 0 || j >= this.y || k < 0 || k >= this.z)
                        continue;
                    
                    // don't count self
                    if (i == x && j == y && k == z)
                        continue;
                    
                    if (buffer[i][j][k])
                        this.numNeighbors++;
                }
            }
        }
    }
})();

/**
 * get one frame and render it
 */
ThreeDGameOfLife.prototype.getFrame = function () {
    // first: switch the buffers
    var temp = this.program;
    this.program = this.preview;
    this.preview = temp;

    // step the game of life
    this.step(this.preview, this.program);
    
    // render
    this.render(this.program);
};
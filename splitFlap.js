const vertexShader = () => `
precision mediump float;

uniform float uTime;
uniform float uSpeed;
uniform float uSpriteGridSize;
attribute vec2 aTranslate;
attribute vec2 aScale;
attribute vec4 aVertex;
attribute vec3 aSpriteData;
varying vec2 vTextureCoord;

float cubicBezier(vec2 p1, vec2 p2, float t) {
    vec2 p0 = vec2(0.0, 0.0), p3 = vec2(1.0, 1.0);
    vec2 c = pow(1.0 - t, 3.0) * p0 + 
        3.0 * pow(1.0 - t, 2.0) * t * p1 + 
        3.0 * (1.0 - t) * pow(t, 2.0) * p2 + 
        pow(t, 3.0) * p3;
    return c.x;
}

float normalise(float x) {
    return x / 2.0 + 0.5;
}

float invertNormalise(float x) {
    return x / -2.0 + 0.5;
}

float normalisedSine(float t) {
    return invertNormalise(sin(3.14 * t + 3.14 / 2.0));
}

vec2 spriteTextureCoord(float index) {
    float clamped = mod(index, pow(uSpriteGridSize, 2.0));
    return vec2(
        (normalise(aVertex.x) + mod(clamped, uSpriteGridSize)) / uSpriteGridSize, 
        (invertNormalise(aVertex.y + aVertex.z * aVertex.w) + floor(clamped / uSpriteGridSize)) / uSpriteGridSize
    );
}

float spriteIndex(float current, float previous, float timestamp) {
    // current, previous, timestamp
    if (uTime <= timestamp) {
        return previous;
    }
    
    float cellCount = pow(uSpriteGridSize, 2.0);

    float indexDelta = mod(cellCount + (current - previous), cellCount);
    float complete = timestamp + indexDelta / uSpeed;
    if (uTime >= complete) {
        return current;
    }

    float elapsedTime = uTime - timestamp;
    return mod(previous + elapsedTime * uSpeed, cellCount);
}

void main() {
    float spriteIndex = spriteIndex(aSpriteData[0], aSpriteData[1], aSpriteData[2]);

    float cellCount = pow(uSpriteGridSize, 2.0);
    vec2 p1 = vec2(
        0.0, 
        (mod(spriteIndex * 314159.0, cellCount) / cellCount)
    );
    vec2 p2 = vec2(0.5, 1.0);
    float t = mod(spriteIndex, 1.0);
    float angle = normalisedSine(t) * cubicBezier(p1, p2, t);
    vec2 position = aVertex.xy;
    position.y += aVertex.z * cos(angle * 3.14);
    gl_Position = vec4(position * aScale + aTranslate, 0.0, 1.0);
    vTextureCoord = spriteTextureCoord(aVertex.w > 0.0 ?  floor(spriteIndex) : floor(spriteIndex) + 1.0);
}
`;
const fragmentShader = () => `
precision mediump float;

uniform sampler2D uSpriteSampler;
varying vec2 vTextureCoord;

void main() {
    gl_FragColor = texture2D(uSpriteSampler, vTextureCoord);;
}
`;

export default () => {
    let texture2;
    let spriteGridSize = 10;
    let rows = 24;
    let columns = 48;
    let speed = 1;

    const vertices = [
        // [x, y, y', -1 = next, +1 = current] 
        // Current top
        [-1, 1, 0, -1],
        [-1, 0, 0, -1],
        [1, 1, 0, -1],
        [1, 1, 0, -1],
        [-1, 0, 0, -1],
        [1, 0, 0, -1],
        // Previous bottom
        [-1, 0, 0, 1],
        [-1, -1, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [-1, -1, 0, 1],
        [1, -1, 0, 1],
        // Previous top
        [-1, 0, 1, 1],
        [-1, 0, 0, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [-1, 0, 0, 1],
        [1, 0, 0, 1],
        // Current bottom
        [-1, 0, 1, -1],
        [1, 0, 1, -1],
        [-1, 0, 0, -1],
        [1, 0, 1, -1],
        [1, 0, 0, -1],
        [-1, 0, 0, -1]
    ];

    const vertexAttribute = fc.webglAttribute()
        .divisor(0)
        .size(4)
        .data(vertices);

    const timeUniform = fc.webglUniform(0);

    const speedUniform = fc.webglUniform(speed);

    const spriteDataAttribute = fc.webglAttribute()
        .size(3)
        .divisor(1)
        .data([]);

    const translateAttribute = fc.webglAttribute()
        .size(2)
        .divisor(1)
        .data(
            Array.from({ length: rows * columns })
                .map((d, i) => [
                    (((i % columns) + 0.5) / columns) * 2 - 1,
                    (((Math.floor(i / columns) + 0.5) / rows) * 2 - 1) * -1
                ])
        );

    const scaleAttribute = fc.webglAttribute()
        .size(2)
        .divisor(1)
        .data(Array.from({ length: rows * columns })
            .map((d, i) => [
                1 / columns,
                1 / rows
            ]));

    const program = fc.webglProgramBuilder()
        .subInstanceCount(vertices.length)
        .debug(true);

    const textureUniform = () => {

        let location = null;

        const uniform = program => {
            const gl = program.context();
            gl.uniform1i(location, 0);
        };

        uniform.location = (...args) => {
            location = args[0];
            return uniform;
        };

        uniform.clear = () => {
            location = null;
            return uniform;
        };

        return uniform;
    }

    program
        .buffers()
        .attribute('aTranslate', translateAttribute)
        .attribute('aScale', scaleAttribute)
        .attribute('aVertex', vertexAttribute)
        .attribute('aSpriteData', spriteDataAttribute)
        .uniform('uTime', timeUniform)
        .uniform('uSpriteSampler', textureUniform())
        .uniform('uSpriteGridSize', fc.webglUniform(spriteGridSize))
        .uniform('uSpeed', speedUniform);

    let texture = null;

    const start = Date.now();
    let framesRemaining = 0;

    const draw = () => {
        if (framesRemaining === 0) {
            return;
        }
        framesRemaining--;
        // console.log(framesRemaining);

        program
            .vertexShader(vertexShader)
            .fragmentShader(fragmentShader);

        timeUniform.data(Date.now() - start);
        speedUniform.data(speed);

        {
            const gl = program.context();
            if (texture == null) {
                texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                const size = Math.sqrt(texture2.length / 4);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                    size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    texture2);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }

        program(spriteDataAttribute.data().length);
    };

    draw.texture2 = (...args) => {
        if (args.length > 0) {
            texture2 = args[0];
            return draw;
        }
        return texture2;
    };

    draw.speed = (...args) => {
        if (args.length > 0) {
            speed = args[0];
            return draw;
        }
        return speed;
    };

    draw.data = (...args) => {
        if (args.length > 0) {
            const previousSpriteData = spriteDataAttribute.data();
            const now = Date.now() - start;
            const spriteData = args[0].map((d, i) => [
                d,
                i < previousSpriteData.length ? previousSpriteData[i][0] : d,
                now
            ]);
            spriteDataAttribute.data(spriteData);
            framesRemaining = spriteGridSize * spriteGridSize * 6;
            return draw;
        }
        return spriteDataAttribute.data();
    }

    fc.rebind(draw, program, 'context');

    return draw;
};

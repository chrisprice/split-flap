export default () => `
precision mediump float;

uniform float uCurrentTime;
uniform float uModifiedTime;
uniform float uSpeed;
uniform float uSpriteGridSize;
attribute vec2 aTranslate;
attribute vec2 aScale;
attribute vec4 aVertex;
attribute vec2 aSpriteData;
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

float spriteIndex(float current, float previous) {
    if (uCurrentTime <= uModifiedTime) {
        return previous;
    }
    
    float cellCount = pow(uSpriteGridSize, 2.0);

    float indexDelta = mod(cellCount + (current - previous), cellCount);
    float complete = uModifiedTime + indexDelta / uSpeed;
    if (uCurrentTime >= complete) {
        return current;
    }

    float elapsedTime = uCurrentTime - uModifiedTime;
    return mod(previous + elapsedTime * uSpeed, cellCount);
}

void main() {
    float spriteIndex = spriteIndex(aSpriteData[0], aSpriteData[1]);

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
    gl_Position = vec4(position * aScale + aTranslate, aVertex.z * sin(angle * 3.14) * aScale.x * 1.0, 1.0);
    vTextureCoord = spriteTextureCoord(aVertex.w > 0.0 ?  floor(spriteIndex) : floor(spriteIndex) + 1.0);
}
`;

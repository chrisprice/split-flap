export default () => `
precision mediump float;

uniform sampler2D uSpriteSampler;
varying vec2 vTextureCoord;

void main() {
    gl_FragColor = texture2D(uSpriteSampler, vTextureCoord);;
}
`;

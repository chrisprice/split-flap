// web component
// pre-style content
// user-defined code points for sprites
// sounds
// offscreen canvas
// rows / cols
// alignment

import splitFlap from './splitFlap.js';
import sprites from './sprites.js';

const spriteValues = Array.from({ length: 100 }).map((d, i) => String.fromCharCode(i > 96 ? 32 : 32 + i));
// const spriteValues = ' ?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
const spriteGenerator = sprites()
    .canvas(document.createElement('canvas'));
const spriteTexture = spriteGenerator(spriteValues);
// document.body.append(spriteGenerator.canvas())

const spriteGridSize = 10;
const spriteGridArea = spriteGridSize * spriteGridSize;
const speed = 0.001;
const rows = 24;
const columns = 48;

const instance = splitFlap()
    .texture2(spriteTexture)
    .speed(speed);

instance.data(('Lorem ipsum dolor sit amet, consectetur adipiscing elit. In et condimentum risus. Suspendisse potenti. Donec et aliquet orci, finibus faucibus justo. Cras efficitur nunc vitae ligula fermentum finibus. In at neque eget eros gravida varius. Fusce eget ipsum venenatis, iaculis turpis quis, commodo justo. Mauris eget orci consequat dolor finibus hendrerit at et libero. Suspendisse tristique, nunc at aliquet euismod, sem turpis tristique quam, non placerat tortor justo nec tortor. Morbi neque purus, placerat quis tellus a, ornare iaculis nulla. Sed vel augue scelerisque, faucibus sem nec, condimentum ipsum. Aenean velit lorem, varius quis lacinia sit amet, rhoncus quis metus. In felis justo, volutpat eu lorem ac, varius lobortis erat. Praesent vitae tempus purus. Nulla tempus egestas lacus id efficitur. Curabitur suscipit varius orci, at auctor eros tempus sed. Morbi lobortis justo quam, ac consequat arcu aliquam nec. Quisque elementum volutpat nunc, eget fringilla libero faucibus sed. Donec mattis elementum ante, eget efficitur tellus finibus nec. In hac habitasse platea dictumst. Aliquam quis lorem vel erat tempus accumsan vitae a metus').split('').map(d => spriteValues.indexOf(d)));

let audioCtx = null;
let audioBuffer = null;
let compressor = null;
let frameCount = spriteGridArea;

const d3fcCanvas = document.querySelector('d3fc-canvas');
d3fcCanvas.addEventListener('draw', () => {
    const canvas = d3fcCanvas.querySelector('canvas');
    const ctx = canvas.getContext('webgl');
    ctx.enable(ctx.CULL_FACE);
    instance.context(ctx)();
    // frameCount--;
});

d3fcCanvas.addEventListener('click', async () => {
    const response = await fetch('click.wav');
    const arrayBuffer = await response.arrayBuffer();
    if (audioCtx == null) {
        audioCtx = new AudioContext();
        compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(audioCtx.destination);
    }
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const [head, ...tail] = instance.data();
    const data = [...tail, head];
    instance.data(data.map(d => d[0]));

    const histogram = Array.from({ length: spriteGridArea }).fill(0);
    for (const [current, previous, timestamp] of instance.data()) { //TODO: ignoring timestamp - can we make timestamp global?
        const delta = (spriteGridArea + (current - previous)) % spriteGridArea;
        for (let i = 0; i < delta; i++) {
            histogram[i]++;
        }
    }
    // console.log(histogram);
    const currentTime = audioCtx.currentTime;
    console.log(histogram);
    const mapped = histogram.map(d => Math.ceil(Math.log10(d + 1)));
    console.log(mapped);
    mapped.forEach((d, i) => {
        for (let j = 0; j < d; j++) {
            const trackSource = audioCtx.createBufferSource();
            trackSource.buffer = audioBuffer;
            trackSource.playbackRate.value = speed * 1000; // assumes audio is 1 sec long
            // const gainNode = audioCtx.createGain();
            // trackSource.connect(gainNode);
            // gainNode.gain.value = datum / (rows * columns);
            // gainNode.connect(compressor);
            trackSource.connect(compressor);
            trackSource.start(currentTime + (i) / (speed * 1000));
        }
    });

    frameCount = spriteGridArea;
})

// only need to redraw while dt < spriteValues.length / speed
setInterval(() => {
    if (frameCount > 0) {
        d3fcCanvas.requestRedraw()
    }
}, 10);

document.querySelector('#loading').style.display = 'none';

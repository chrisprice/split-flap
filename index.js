import { css } from './node_modules/@d3fc/d3fc-element/src/css.js';
import vertices from './vertices.js';
import vertexShader from './vertexShader.js';
import fragmentShader from './fragmentShader.js';
import textureUniform from './textureUniform.js';

class SplitFlapElement extends HTMLElement {

    audioTrackSources = new Set();

    spriteSheetUniform = textureUniform();

    spriteData = [];

    epoch = Date.now();

    modifiedTime = 0;

    constructor() {
        super();
        this.d3fcCanvas = document.createElement('d3fc-canvas');
        Object.assign(this.d3fcCanvas, {
            setWebglViewport: true,
            // useDevicePixelRatio: true
        });
        Object.assign(this.d3fcCanvas.style, {
            width: '100%',
            height: '100%'
        });
        this.handleClick = this.handleClick.bind(this);
        this.d3fcCanvas.addEventListener('click', this.handleClick);
        this.handleDraw = this.handleDraw.bind(this);
        this.d3fcCanvas.addEventListener('draw', this.handleDraw);
        const shadowRoot = this.attachShadow({ mode: 'closed' });
        const styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        styleElement.textContent = css;
        shadowRoot.appendChild(styleElement);
        shadowRoot.appendChild(this.d3fcCanvas);
        this.handleMutation = this.handleMutation.bind(this);
        const observer = new MutationObserver(this.handleMutation);
        observer.observe(this, {
            characterData: true,
            childList: true,
            subtree: true
        });
        this.createSpriteSheet();
        this.createSpriteData();
        this.createWebglProgram();
    }

    createWebglProgram() {
        this.program = fc.webglProgramBuilder()
            .subInstanceCount(vertices.length)
            .debug(true);

        const rows = this.rows, cols = this.cols;
        this.program.buffers()
            .attribute('aTranslate',
                fc.webglAttribute()
                    .size(2)
                    .divisor(1)
                    .data(
                        Array.from({ length: rows * cols })
                            .map((_, i) => [
                                (((i % cols) + 0.5) / cols) * 2 - 1,
                                (((Math.floor(i / cols) + 0.5) / rows) * 2 - 1) * -1
                            ])
                    )
            )
            .attribute('aScale',
                fc.webglAttribute()
                    .size(2)
                    .divisor(1)
                    .data(Array.from({ length: rows * cols })
                        .map(() => [
                            1 / cols,
                            1 / rows
                        ]))
            )
            .attribute('aVertex',
                fc.webglAttribute()
                    .divisor(0)
                    .size(4)
                    .data([
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
                    ])
            )
            .uniform('uSpriteSampler', this.spriteSheetUniform);
    }

    static get observedAttributes() {
        return ['characters', 'cols', 'frequency', 'rows'];
    }

    attributeChangedCallback(name) {
        switch (name) {
            case 'characters': {
                this.createSpriteSheet();
                break;
            }
        }
        this.d3fcCanvas.requestRedraw();
        console.log('RESET', this.characters, this.cols, this.frequency, this.rows);
    }

    async handleClick() {
        console.log('CLICK');
        if (this.audioCtx == null) {
            this.audioCtx = new AudioContext();
        }
        this.spriteData = [];
        this.createSpriteData();
        this.d3fcCanvas.requestRedraw();
    }

    connectedCallback() {
        console.log('CONNECTED')
        this.d3fcCanvas.requestRedraw();
    }

    handleDraw() {
        console.log('DRAW')
        const canvas = this.d3fcCanvas.querySelector('canvas');
        const ctx = canvas.getContext('webgl');
        ctx.enable(ctx.CULL_FACE);
        this.program.vertexShader(vertexShader)
            .fragmentShader(fragmentShader)
            .context(ctx);
        const characterCount = [...this.characters].length;
        const currentTime = this.audioCtx == null ? (Date.now() - this.epoch) / 1000 : this.audioCtx.currentTime;
        this.program.buffers()
            .attribute(
                'aSpriteData',
                fc.webglAttribute()
                    .size(2)
                    .divisor(1)
                    .data(this.spriteData)
            )
            .uniform('uCurrentTime', fc.webglUniform(currentTime))
            .uniform('uModifiedTime', fc.webglUniform(this.modifiedTime))
            .uniform('uSpriteGridSize', fc.webglUniform(Math.sqrt(characterCount)))
            .uniform('uSpeed', fc.webglUniform(this.frequency));
        this.program(this.spriteData.length);
        // request further redraws if the transition isn't complete
        const maxDelta = this.spriteData.map(([current, previous]) => (characterCount + (current - previous)) % characterCount)
            .reduce((a, b) => Math.max(a, b));
        if (this.modifiedTime + maxDelta / this.frequency > currentTime) {
            setTimeout(() => this.d3fcCanvas.requestRedraw(), 0);
        }
    }

    handleMutation() {
        console.log('VALUE', this.textContent);
        this.createSpriteData();
    }

    createSpriteSheet() {
        const spriteSize = 128;
        const canvas = document.createElement('canvas');
        // document.body.appendChild(canvas)
        const characters = this.characters;
        const sheetSize = Math.ceil(Math.sqrt([...characters].length));
        canvas.width = canvas.height = sheetSize * spriteSize;
        const context = canvas.getContext('2d');
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '100px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        let i = 0;
        for (const character of characters) {
            const x = i % sheetSize;
            const y = Math.floor(i / sheetSize);
            context.fillText(character, (x + 0.5) * spriteSize, (y + 0.5) * spriteSize);
            i += 1
        }
        context.fillStyle = 'black';
        for (let y = 0; y < sheetSize; y++) {
            context.fillRect(0, y * spriteSize + spriteSize / 2 - spriteSize * 0.025, canvas.width, spriteSize * 0.05);
        }
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
        this.spriteSheetUniform.data(imageData);
        this.d3fcCanvas.requestRedraw();
    }

    createSpriteData() {
        const previousSpriteData = this.spriteData;
        const characters = this.characters;
        const characterCount = [...this.characters].length;
        let textContent = this.textContent;
        textContent = textContent.replace(/(^\n|\n\s*$)/gu, '');
        textContent = textContent.replace(/(.*)\n/gu, (_, line) => {
            const length = [...line].length;
            const spillover = length % this.cols;
            if (length > 0 && spillover === 0) {
                return line;
            }
            const padding = Array.from({ length: this.cols - spillover }).fill(' ').join('');
            return line + padding;
        });
        const textCharacters = [...textContent];
        this.spriteData = Array.from({ length: this.rows * this.cols })
            .map((_, i) => {
                const characterIndex = characters.indexOf(textCharacters[i]);
                return [
                    characterIndex > -1 ? characterIndex : 0,
                    i < previousSpriteData.length ? previousSpriteData[i][0] : 0
                ];
            });

        this.modifiedTime = this.audioCtx == null ? (Date.now() - this.epoch) / 1000 : this.audioCtx.currentTime;

        this.createAudioEffects()

        this.d3fcCanvas.requestRedraw();
    }

    async createAudioEffects() {
        if (this.audioCtx == null) {
            return;
        }
        if (this.audioDestination == null) {
            this.audioDestination = this.audioCtx.createDynamicsCompressor();
            this.audioDestination.connect(this.audioCtx.destination);
        }
        if (this.audioBuffer == null) {
            this.audioBuffer = this.audioCtx.createBuffer(1, 1, 44100);
            const response = await fetch('click.wav'); // TODO
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        }
        for (const trackSource of this.audioTrackSources) {
            trackSource.stop();
        }
        this.audioTrackSources.clear()
        const characterCount = [...this.characters].length;
        const histogram = Array.from({ length: characterCount }).fill(0);
        for (const [current, previous] of this.spriteData) {
            const delta = (characterCount + (current - previous)) % characterCount;
            for (let i = 0; i < delta; i++) {
                histogram[i]++;
            }
        }
        const currentTime = this.audioCtx.currentTime;
        histogram.forEach((d, i) => {
            const trackCount = Math.round(Math.log2(d + 1));
            for (let j = 0; j < trackCount; j++) {
                const trackSource = this.audioCtx.createBufferSource();
                trackSource.buffer = this.audioBuffer;
                trackSource.playbackRate.value = trackSource.buffer.duration * this.frequency;
                trackSource.connect(this.audioDestination);
                trackSource.start(currentTime + (i + 0.5) / (this.frequency));
                this.audioTrackSources.add(trackSource);
            }
        });
    }

    static defaultCharacters = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

    get characters() {
        const attribute = this.getAttribute('characters');
        const value = attribute == null ? SplitFlapElement.defaultCharacters : attribute;
        const length = [...value].length;
        const sqrt = Math.ceil(Math.sqrt(length));
        const padding = Array.from({ length: sqrt * sqrt - length }).fill(' ').join('');
        return value + padding;
    }

    set characters(value) {
        this.setAttribute('characters', value);
    }

    get characters() {
        const attribute = this.getAttribute('characters');
        const value = attribute == null ? SplitFlapElement.defaultCharacters : attribute;
        const length = [...value].length;
        const sqrt = Math.ceil(Math.sqrt(length));
        const padding = Array.from({ length: sqrt * sqrt - length }).fill(' ').join('');
        return value + padding;
    }

    set characters(value) {
        this.setAttribute('characters', value);
    }

    static defaultCols = 24;

    get cols() {
        const attribute = Number.parseInt(this.getAttribute('cols'));
        return Number.isNaN(attribute) ? SplitFlapElement.defaultCols : attribute;
    }

    set cols(value) {
        this.setAttribute('cols', value);
    }

    static defaultFrequency = 0.1;

    get frequency() {
        const attribute = Number.parseFloat(this.getAttribute('frequency'));
        return Number.isNaN(attribute) ? SplitFlapElement.defaultFrequency : attribute;
    }

    set frequency(value) {
        this.setAttribute('frequency', value);
    }

    static defaultRows = 16;

    get rows() {
        const attribute = Number.parseInt(this.getAttribute('rows'));
        return Number.isNaN(attribute) ? SplitFlapElement.defaultRows : attribute;
    }

    set rows(value) {
        this.setAttribute('rows', value);
    }
}

customElements.define('split-flap', SplitFlapElement);
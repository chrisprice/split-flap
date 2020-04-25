export default () => {
    let canvas = null;
    let font = '100px sans-serif';
    let cellSize = 128;
    let backgroundFillStyle = 'black';
    let textFillStyle = 'white';

    // TODO: decorate?
    
    const instance = (characters) => {
        const gridSize = Math.ceil(Math.sqrt(characters.length));
        canvas.width = canvas.height = gridSize * cellSize;
        const context = canvas.getContext('2d');
        context.fillStyle = backgroundFillStyle;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = font;
        context.textAlign = 'center';
        context.textBaseline = 'middle'
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const i = y * gridSize + x;
                if (i >= characters.length) {
                    break;
                }
                // context.fillStyle = i % 2 ? backgroundFillStyle : 'white';
                // context.fillRect(x * cellSize + 0.025 * cellSize, y * cellSize + 0.025 * cellSize, cellSize * 0.95, cellSize * 0.95);
                context.fillStyle = textFillStyle;
                context.fillText(characters[i], (x + 0.5) * cellSize, (y + 0.5) * cellSize);
            }
            context.fillStyle = backgroundFillStyle;
            context.fillRect(0, y * cellSize + cellSize / 2 - cellSize * 0.025, canvas.width, cellSize * 0.05);
        }
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };

    instance.canvas = (...args) => {
        if (args.length > 0) {
            canvas = args[0];
            return instance;
        }
        return canvas;
    };

    instance.font = (...args) => {
        if (args.length > 0) {
            font = args[0];
            return instance;
        }
        return font;
    };

    instance.cellSize = (...args) => {
        if (args.length > 0) {
            cellSize = args[0];
            return instance;
        }
        return cellSize;
    };

    instance.backgroundFillStyle = (...args) => {
        if (args.length > 0) {
            backgroundFillStyle = args[0];
            return instance;
        }
        return backgroundFillStyle;
    };

    instance.textFillStyle = (...args) => {
        if (args.length > 0) {
            textFillStyle = args[0];
            return instance;
        }
        return textFillStyle;
    };

    return instance;
};

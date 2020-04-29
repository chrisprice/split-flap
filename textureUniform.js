export default initialData => {

    let location = -1;
    let data = initialData;
    let texture = null
    let dirty = true;

    const build = program => {
        if (!dirty) {
            return;
        }

        const gl = program.context();

        if (texture == null) {
            texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            const size = Math.sqrt(data.length / 4);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(location, 0);

        dirty = false;
    };

    build.clear = () => {
        dirty = true;
        texture = null;
        return build;
    };

    build.location = (...args) => {
        if (!args.length) {
            return location;
        }
        if (location !== args[0]) {
            location = args[0];
            dirty = true;
        }
        return build;
    };

    build.data = (...args) => {
        if (!args.length) {
            return data;
        }
        data = args[0];
        dirty = true;
        return build;
    };

    return build;
}
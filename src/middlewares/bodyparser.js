'use strict';

const { PassThrough } = require('stream');

module.exports = () => {
    return async (ctx, next) => {
        console.log("1. Entering rawBody middleware");

        const rawBodyChunks = [];
        ctx.req.on('data', chunk => rawBodyChunks.push(chunk));
        
        ctx.req.on('end', () => {
            ctx.request.rawBody = Buffer.concat(rawBodyChunks).toString();
        });

        // Create a new stream to "capture" all data going through it
        const stream = new PassThrough();
        stream.headers = ctx.req.headers;  // Preserve the original headers

        // Substitute the original request with our new stream
        ctx.req.pipe(stream);
        ctx.req = stream;

        await next();

        console.log("1. Exiting rawBody middleware");
    };
};

import app from "./app";

// Vercel's Node runtime accepts an Express app directly as the default export.
// Wrapping it in serverless-http (an AWS Lambda adapter) makes Vercel hang
// because the runtime calls the handler with (req, res), not a Lambda event.
export default app;

export function createPdfJobProcessor({ logger }) {
    return async function process(job) {
        logger.info({ jobId: job.id, proposalId: job.data.proposalId }, 'Rendering PDF (stub)');
        // TODO: Implement real PDF rendering with headless Chromium and upload to S3.
        // For now we return the provided key to keep the pipeline moving during early development.
        const fakeResult = {
            pdfObjectKey: job.data.outputKey,
            generatedAt: new Date().toISOString()
        };
        return fakeResult;
    };
}

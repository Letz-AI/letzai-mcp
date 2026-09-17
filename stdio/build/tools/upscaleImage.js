export const upscaleImageTool = {
    name: "letzai_upscale_image",
    description: "Upscale an image using the LetzAI public api",
    inputSchema: {
        type: "object",
        properties: {
            imageId: {
                type: "string",
                description: "The unique identifier of the image to be upscaled.",
            },
            imageUrl: {
                type: "string",
                description: "The URL of the image to be upscaled. Must be a publicly available URL.",
            },
            strength: {
                type: "number",
                default: 1,
                description: "The strength of the upscaling process. Min. 1, Max. 3.",
            },
        },
        required: ["strength"],
    },
};

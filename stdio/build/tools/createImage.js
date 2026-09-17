export const modes = ["default", "turbo", "sigma"];
export const createImageTool = {
    name: "letzai_create_image",
    description: "Create an image using the LetzAI public api",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "Image prompt to generate a new image. Can also include @tag to generate an image using a model from the LetzAi Platform",
            },
            width: {
                type: "number",
                default: 1600,
                description: "Width of the image should be between 520 and 2160 max pixels. Default is 1600.",
            },
            height: {
                type: "number",
                default: 1600,
                description: "Height of the image should be between 520 and 2160 max pixels. Default is 1600.",
            },
            quality: {
                type: "number",
                default: 2,
                description: "Defines how many steps the generation should take. Higher is slower, but generally better quality. Min: 1, Default: 2, Max: 5",
            },
            creativity: {
                type: "number",
                default: 2,
                description: "Defines how strictly the prompt should be respected. Higher Creativity makes the images more artificial. Lower makes it more photorealistic. Min: 1, Default: 2, Max: 5",
            },
            hasWatermark: {
                type: "boolean",
                default: true,
                description: "Defines whether to set a watermark or not. Default is true",
            },
            systemVersion: {
                type: "number",
                default: 3,
                description: "Allowed values: 2, 3. UseLetzAI V2, or V3 (newest).",
            },
            mode: {
                type: "string",
                default: "turbo",
                enum: modes,
                description: "Select one of the different modes that offer different generation settings. Allowed values: default, sigma, turbo. Default is slow but high quality. Sigma is faster and great for close ups. Turbo is fastest, but lower quality.",
            },
        },
        required: ["prompt"],
    },
};

import axios from "axios";
import { convertImageUrlToBase64 } from "./utils/convertImageToBase64.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import open from "open";
import { createImageTool, modes } from "./tools/createImage.js";
import { upscaleImageTool } from "./tools/upscaleImage.js";

export const setTools = (server: Server) => {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [createImageTool, upscaleImageTool],
    };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request, connection) => {
      if (request.params.name === "letzai_create_image") {
        try {
          let {
            prompt,
            width,
            height,
            quality,
            creativity,
            hasWatermark,
            systemVersion,
            mode,
          } = request.params.arguments as any;

          mode = !mode || !mode.includes(mode || "") ? "turbo" : mode;
          width = parseInt(width) || 1600;
          height = parseInt(height) || 1600;
          quality = parseInt(quality) || 2;
          creativity = parseInt(creativity) || 2;
          systemVersion = parseInt(systemVersion) || 3;
          hasWatermark =
            typeof hasWatermark === "boolean" ? hasWatermark : false;

          // Step 1: Create the image request
          const responseCreate = await axios.post(
            "https://api.letz.ai/images",
            {
              prompt,
              width,
              height,
              quality,
              creativity,
              hasWatermark,
              systemVersion,
              mode,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.LETZAI_API_KEY}`,
              },
            }
          );

          let imageFinished = false;
          let imageVersions: {
            original: string;
            "96x96": string;
            "240x240": string;
            "640x640": string;
            "1920x1920": string;
          } | null = null;
          let imageId = responseCreate.data.id;

          // Step 2: Poll for image creation status
          while (!imageFinished) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before checking again

            const responseImage = await axios.get(
              `https://api.letz.ai/images/${imageId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.LETZAI_API_KEY}`,
                },
              }
            );

            if (responseImage.data.progress < 100) {
              // Send a progress notification (through stdout for Stdio transport)
              console.log(
                JSON.stringify({
                  jsonrpc: "2.0",
                  method: "progress_update",
                  params: {
                    message: `Image is still being processed. Progress: ${responseImage.data.progress}%`,
                  },
                })
              );
            } else {
              imageFinished = true;
              imageVersions = responseImage.data.imageVersions;
            }
          }

          // Convert the image to Base64 after processing is complete
          /*  const imageBase64 = convertImageUrlToBase64(
            imageVersions?.["640x640"] as string
          );
 */
          // Open the image in browser
          open(imageVersions?.original as string);

          // Return the response to the client
          return {
            content: [
              {
                type: "text",
                text: `Image generated successfully!\nThe image has been opened in your default browser.\n\n Image URL: ${imageVersions?.original}\n\nYou can also click the URL above to view the image again.`,
              },
            ],
          };
        } catch (err: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error happened: ${err.toString()}`,
              },
            ],
          };
        }
      } else if (request.params.name === "letzai_upscale_image") {
        try {
          let { imageId, imageUrl, strength } = request.params.arguments as any;

          strength = parseInt(strength) || 1;

          let body = {};
          if (imageId) {
            body = {
              imageId,
              strength,
            };
          } else if (imageUrl) {
            body = {
              imageUrl,
              strength,
            };
          } else {
            throw new Error("Provide image ID or Image URL");
          }

          // Step 1: Create the image request
          const responseCreate = await axios.post(
            "https://api.letz.ai/upscale",

            body,

            {
              headers: {
                Authorization: `Bearer ${process.env.LETZAI_API_KEY}`,
              },
            }
          );

          let imageFinished = false;
          let imageVersions: {
            original: string;
            "96x96": string;
            "240x240": string;
            "640x640": string;
            "1920x1920": string;
          } | null = null;

          let upscaleId = responseCreate.data.id;

          // Step 2: Poll for image creation status
          while (!imageFinished) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before checking again

            const responseImage = await axios.get(
              `https://api.letz.ai/upscale/${upscaleId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.LETZAI_API_KEY}`,
                },
              }
            );

            if (responseImage.data.status != "ready") {
              // Send a progress notification (through stdout for Stdio transport)
              console.log(
                JSON.stringify({
                  jsonrpc: "2.0",
                  method: "progress_update",
                  params: {
                    message: `Image is still being processed. Progress: ${responseImage.data.progress}%`,
                  },
                })
              );
            } else {
              imageFinished = true;
              imageVersions = responseImage.data.imageVersions;
            }
          }

          // Convert the image to Base64 after processing is complete
          /*  const imageBase64 = convertImageUrlToBase64(
            imageVersions?.["640x640"] as string
          );
 */
          // Open the image in browser
          open(imageVersions?.original as string);

          // Return the response to the client
          return {
            content: [
              {
                type: "text",
                text: `Image upscaled successfully!\nThe image has been opened in your default browser.\n\n Image URL: ${imageVersions?.original}\n\nYou can also click the URL above to view the image again.`,
              },
            ],
          };
        } catch (err: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error happened: ${err.toString()}`,
              },
            ],
          };
        }
      }
      throw new Error("Tool not found");
    }
  );
};

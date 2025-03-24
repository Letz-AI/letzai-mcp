import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

export const setResources = async (server: Server) => {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "letzai://subscription",
          name: "LetzAI Subscription",
          description:
            "Detailed informations how you obtain a subscription from LetzAI with an Api Key with access to the public api",
          mimeType: "text/plain",
        },
        {
          uri: "letzai://api/documentation",
          name: "LetzAI API Documentation",
          description: "Documentation about the complete public api",
          mimeType: "text/plain",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "letzai://subscription") {
      return {
        contents: [
          {
            uri: "letzai://subscription",
            text: "To access the LetzAI API, subscribe to a Beginner, Fun, or Pro plan at https://letz.ai/subscription. After subscribing, log in to your LetzAI account, go to the API Key section, and generate a key (up to 10 per account). Use this key in the Authorization header when making API requests. For detailed documentation, visit https://letz.ai/docs/api. ",
          },
        ],
      };
    } else if (uri === "letzai://api/documentation") {
      const response = await axios.get("https://api.letz.ai/doc-yaml");

      return {
        contents: [
          {
            uri: "letzai://api/documentation",
            text: response.data,
          },
        ],
      };
    }

    throw new Error("Resource not found");
  });
};

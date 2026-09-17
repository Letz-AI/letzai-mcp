import axios from "axios";
export const convertImageUrlToBase64 = async (imageUrl) => {
    try {
        // Fetch the image as a binary buffer
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        // Convert the binary data to base64
        const base64Image = Buffer.from(response.data, "binary").toString("base64");
        return base64Image;
    }
    catch (error) {
        throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
};

import axios from 'axios';

// Ensure this matches your docker container's mapped port
const WAHA_URL = 'http://localhost:3000';
const API_KEY = 'secret_key_123'; // Must match docker-compose WAHA_API_KEY

export const WahaService = {
    /**
     * Send a text message to a WhatsApp number
     * @param chatId - Format: "94783204161@c.us"
     * @param text - The message content
     */
    async sendText(chatId: string, text: string) {
        try {
            await axios.post(`${WAHA_URL}/api/sendText`, {
                chatId: chatId,
                text: text,
                session: "default"
            }, {
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`[WAHA] Sent to ${chatId}`);
        } catch (error: any) {
            console.error("[WAHA] Send Error:", error.response?.data || error.message);
        }
    },

    /**
     * Optional: Format phone number to WAHA chatId format
     * "0771234567" -> "94771234567@c.us"
     */
    // formatPhone(phone: string): string {
    //     let clean = phone.replace(/\D/g, ''); // Remove non-digits
    //
    //     // Basic Sri Lanka formatting logic (Adjust as needed)
    //     if (clean.startsWith('0')) clean = '94' + clean.slice(1);
    //     if (!clean.startsWith('94')) clean = '94' + clean;
    //
    //     return `${clean}@c.us`;
    // },

    formatPhone(phone: string): string {
        if (!phone) return "";

        // ✅ THE FIX: If it already has a domain, trust it!
        if (phone.includes('@')) {
            return phone;
        }

        // Clean raw numbers
        let clean = phone.replace(/\D/g, '');

        // Sri Lanka formatting (Optional)
        if (clean.length === 9) clean = '94' + clean;
        if (clean.startsWith('0')) clean = '94' + clean.slice(1);

        // Default to @c.us for raw numbers
        return `${clean}@c.us`;
    },

    async getContact(wahaId: string) {
        try {
            const response = await axios.get(`${WAHA_URL}/api/contacts/${wahaId}`, {
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            // It's okay if it fails, we will fallback to the ID we have
            return null;
        }
    }
};
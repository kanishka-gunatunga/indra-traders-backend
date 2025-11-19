const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

export const TranslateService = {
    /**
     * Detects language and translates text to the target language using native fetch.
     * Returns the original text if the API call fails to ensure the bot doesn't crash.
     */
    translateText: async (text: string, targetLang: string): Promise<string> => {
        // Optimization: Don't translate if text is empty
        if (!text || !text.trim()) return text;

        try {
            const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    target: targetLang,
                    format: 'text'
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Google Translate API Error: ${response.status} ${response.statusText}`, errorBody);
                return text; // Fallback
            }

            const data = await response.json();
            const translations = data.data?.translations;

            if (translations && translations.length > 0) {
                return translations[0].translatedText;
            }

            return text;
        } catch (error) {
            console.error("Translation Service Network Error:", error);
            return text; // Fallback to original text
        }
    }
};
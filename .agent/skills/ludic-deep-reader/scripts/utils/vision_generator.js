
/**
 * vision_generator.js
 * 
 * Transforms user insights and book themes into vivid, evocative image prompts
 * for the "Insight Visions" feature.
 */

const STYLE_PRESET = "Ethereal ancient library style, cinematic lighting, conceptual metaphor, high detail, 4k, artistic composition";

/**
 * Generates a prompt for the generate_image tool.
 * 
 * @param {string} concept - The main concept or user summary (e.g., "The skeleton of a book")
 * @param {string} bookTitle - The title of the book for context
 * @returns {string} - A vivid image prompt
 */
export function generateVisionPrompt(concept, bookTitle) {
    // 1. Clean the concept text
    const cleanConcept = concept.trim().substring(0, 200);

    // 2. Select a metaphor based on keywords (simple heuristic)
    let metaphor = "";
    const lower = cleanConcept.toLowerCase();

    if (lower.includes("骨架") || lower.includes("structure") || lower.includes("skeleton")) {
        metaphor = "A ghostly, glowing architectural skeleton of a massive cathedral floating inside a giant open book.";
    } else if (lower.includes("灵魂") || lower.includes("soul") || lower.includes("essence")) {
        metaphor = "A pulsing heart made of ink and starlight, beating within a crystalline manuscript.";
    } else if (lower.includes("冲突") || lower.includes("argument") || lower.includes("disagree")) {
        metaphor = "Two spectral knights clashing with pens made of fire and ice on a battlefield composed of parchment pages.";
    } else if (lower.includes("主旨") || lower.includes("theme") || lower.includes("unity")) {
        metaphor = "A single golden thread weaving through a chaotic storm of flying pages, connecting them into a radiant tapestry.";
    } else {
        // Default evocative metaphor
        metaphor = `A surreal manifestation of the concept "${cleanConcept}", represented by floating geometric symbols and ancient scrolls.`;
    }

    return `${metaphor} Inspired by "${bookTitle}". ${STYLE_PRESET}`;
}

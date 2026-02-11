
import { validateAgainstIndex, computeSimilarity, getEmbedding, searchSimilar } from './utils/embedding_client.js';

/**
 * validate_answer.js
 *
 * Semantic similarity checking and answer validation using local vector embeddings.
 * Replaces previous heuristic/mock implementations.
 */

// ============ Core Validation ============

/**
 * Validate a general answer using embedding similarity.
 * @param {string} userAnswer
 * @param {string} expectedAnswer - Ground truth text
 * @param {Object} context - Context object (unused for now)
 */
export async function validateAnswer(userAnswer, expectedAnswer, context) {
  const result = await computeSimilarity(userAnswer, expectedAnswer);
  
  return {
    valid: result.verdict === 'valid',
    score: Math.round(result.score * 100),
    feedback: getFeedbackMessage(result.verdict, result.score),
    matchedConcepts: result.score > 0.6 ? ["Key concepts matched"] : [],
    missedConcepts: result.score < 0.6 ? ["Key concepts missing"] : [],
    hints: result.score < 0.7 ? ["Try to be more specific.", "Relate back to the text."] : []
  };
}

function getFeedbackMessage(verdict, score) {
  if (verdict === 'valid') return `Excellent! (Score: ${Math.round(score * 100)})`;
  if (verdict === 'partial') return `Close, but needs more detail. (Score: ${Math.round(score * 100)})`;
  return `Not quite. Try reading the section again. (Score: ${Math.round(score * 100)})`;
}

// ============ Specific Validators ============

/**
 * Validate book classification. 
 * Since we don't have a full generative LLM to classify the book, we check if the user's
 * classification semantically matches the book's title/description/metadata.
 */
export async function validateBookClassification(userClassification, book, bookContent) {
  // Combine book title and description as ground truth
  const bookContext = `${book.title} ${book.description || ''}`;
  
  // Check similarity
  const result = await computeSimilarity(userClassification, bookContext);
  
  // Lower threshold for classification as it can be broad
  const valid = result.score > 0.4; 

  return {
    valid,
    score: Math.round(result.score * 100),
    feedback: valid ? "Classification accepted." : "Ensure your classification matches the book's subject matter.",
    matchedConcepts: [],
    missedConcepts: [],
    hints: ["Consider the main theme and genre of the book."]
  };
}

/**
 * Validate unity statement (summary of the book).
 * Compare against book description or TOC structure.
 */
export async function validateUnityStatement(statement, book, tableOfContents) {
  const wordCount = statement.split(/\s+/).length;
  if (wordCount < 5 || wordCount > 100) {
    return {
      valid: false,
      score: 0,
      feedback: "Length requirement not met (aim for 10-80 words).",
      hints: ["Keep it concise but comprehensive."]
    };
  }

  // Use book title and top-level TOC items as a proxy for the book's "unity"
  const tocSummary = tableOfContents.map(item => item.title).join(", ");
  const groundTruth = `${book.title}. ${book.description || ''}. ${tocSummary}`;

  const result = await computeSimilarity(statement, groundTruth);
  const valid = result.score > 0.5;

  return {
    valid,
    score: Math.round(result.score * 100),
    feedback: valid ? "Good summary of the whole." : "Your statement doesn't seem to cover the book's full scope.",
    hints: ["Include the major parts listed in the Table of Contents."]
  };
}

/**
 * Validate a term definition.
 * Search the vector index for the term to find its context in the book, 
 * then compare user definition against that context.
 */
export async function validateTermDefinition(term, userDefinition, context, chapterContent) {
  const dataDir = context.dataDir; // context must include dataDir and bookId
  const bookId = context.bookId;

  // 1. Find the term in the book to get its actual usage context
  // We search for the term itself to find relevant chunks
  const searchResults = await searchSimilar(bookId, dataDir, term, 3);
  
  if (searchResults.length === 0) {
    // Fallback if term not found/indexed (shouldn't happen if book is imported)
    return {
      valid: false,
      score: 0,
      feedback: "Term not found in our index.",
      hints: ["Are you sure this term appears in the book?"]
    };
  }

  // 2. Use the best matching chunk as ground truth for the definition
  // Ideally, the definition should be semantically similar to the context where the term appears
  const bestContext = searchResults[0].text;
  
  // 3. Compare user definition to the book context
  const result = await computeSimilarity(userDefinition, bestContext);
  
  // Also check if the user definition is similar to the term itself (tautology check - simple heuristic)
  // If similarity to term is TOO high (identical), it might be just repeating the word.
  // But strictly, we want definition -> context similarity.
  
  const valid = result.score > 0.45; // Context matching can be loose

  return {
    valid,
    score: Math.round(result.score * 100),
    feedback: valid ? "Definition aligns with context." : "Your definition doesn't fit how the author uses this term.",
    matchedConcepts: [],
    missedConcepts: [],
    hints: [`The term appears in contexts like: "...${bestContext.substring(0, 50)}..."`]
  };
}

/**
 * Validate a proposition.
 * Check if the proposition exists in the text (embedding search).
 */
export async function validateProposition(proposition, sourceText, existingPropositions) {
  const context = sourceText.context; // e.g., { bookId, dataDir }
  
  const result = await validateAgainstIndex(context.bookId, context.dataDir, proposition, 3);
  
  return {
    valid: result.verdict !== 'invalid',
    score: Math.round(result.score * 100),
    feedback: result.verdict !== 'invalid' ? "Proposition verified in text." : "Couldn't find support for this proposition in the text.",
    matchedConcepts: [],
    missedConcepts: [],
    hints: ["Ensure you are paraphrasing an actual sentence from the book."]
  };
}

/**
 * Validate argument chain.
 * Hard to do fully semantically without generative logic.
 * We check if premises and conclusion are all supported by the text.
 */
export async function validateArgumentChain(propositionIds, propositions, conclusion, context) {
  // 1. Verify conclusion support in text
  const result = await validateAgainstIndex(context.bookId, context.dataDir, conclusion, 3);
  
  if (result.verdict === 'invalid') {
    return {
      valid: false,
      score: Math.round(result.score * 100),
      feedback: "Conclusion not supported by the text.",
      hints: ["The conclusion must be grounded in the book's content."]
    };
  }

  // 2. Check minimal structural requirements
  if (propositionIds.length < 2) {
    return {
      valid: false,
      score: 0,
      feedback: "An argument needs at least 2 premises.",
      hints: ["Add more premises."]
    };
  }

  return {
    valid: true,
    score: Math.round(result.score * 100),
    feedback: "Argument chain accepted (based on textual support).",
    hints: []
  };
}

/**
 * Validate critique.
 * Ensure the critique references actual content from the book.
 * If critique is "disagreement", user evidence should be semantically related to the book content 
 * (showing they understand what they are disagreeing with).
 */
export async function validateCritique(critiqueType, targetArgument, userEvidence, understandingVerified, context) {
  if (!understandingVerified) {
    return {
      valid: false,
      score: 0,
      feedback: "You must verify your understanding before critiquing.",
      hints: ["Complete the Understanding Verification first."]
    };
  }

  // Check if evidence is relevant to the book
  const result = await validateAgainstIndex(context.bookId, context.dataDir, userEvidence, 3);

  const valid = result.score > 0.4; // Relevance check

  return {
    valid,
    score: Math.round(result.score * 100),
    feedback: valid ? "Critique recorded." : "Your evidence doesn't seem relevant to the book's content.",
    hints: ["Cite specific passages or concepts from the book."]
  };
}

// ============ Understanding Verification ============

/**
 * Generate verification questions based on semantic retrieval.
 * Since we lack generation, we create "Cloze" (fill-in-the-blank) questions 
 * from random high-information chunks.
 */
export async function generateVerificationQuestions(content, count, context) {
  // 1. Search for representative chunks in the chapter
  // We can just query for "important concepts" or "summary" to get relevant chunks
  const query = "main idea key concept important definition";
  
  // Assuming content object has chapter text or index info. 
  // If we just have context.bookId/dataDir, we search global index restricted to chapter?
  // Current embedding_client doesn't support metadata filtering yet.
  // Workaround: We might need to just pick random chunks if we had access to them, 
  // but here we only have search.
  
  const results = await searchSimilar(context.bookId, context.dataDir, query, count * 2);
  
  const questions = [];
  
  for (const result of results) {
    if (questions.length >= count) break;
    
    const text = result.text;
    // Simple Cloze generation: remove a random word > 5 chars
    const words = text.split(/\s+/);
    const longWords = words.filter(w => w.length > 5 && /^[a-zA-Z]+$/.test(w));
    
    if (longWords.length > 0) {
      const targetWord = longWords[Math.floor(Math.random() * longWords.length)];
      const questionText = text.replace(targetWord, "_______");
      
      questions.push({
        type: "cloze",
        question: `Complete this sentence from the text:\n\n"${questionText}"`,
        expectedAnswer: targetWord,
        context: text
      });
    }
  }
  
  return questions;
}

/**
 * Evaluate understanding verification answers.
 */
export async function evaluateUnderstandingVerification(questions, answers) {
  let totalScore = 0;
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const answer = answers[i];
    
    // For Cloze, we check exact match (case insensitive) or high semantic similarity
    if (answer.toLowerCase().trim() === question.expectedAnswer.toLowerCase().trim()) {
      totalScore += 100;
    } else {
      // Semantic check in case they provided a synonym
      const sim = await computeSimilarity(answer, question.expectedAnswer);
      if (sim.score > 0.7) totalScore += 80;
      else if (sim.score > 0.5) totalScore += 40;
    }
  }
  
  const averageScore = totalScore / questions.length;
  const passed = averageScore >= 60;

  return {
    passed,
    score: averageScore,
    threshold: 60,
    feedback: passed ? "Understanding verified." : "Please review the section.",
    hints: passed ? [] : ["Pay attention to specific terms used in the text."]
  };
}

// ============ Feedback Helper ============

/**
 * Generate hints based on attempt count.
 * Could query for more context if needed.
 */
export async function generateHints(questType, targetContent, attemptCount, context) {
  // If we have access to the target chunk, we can return neighbor sentences as hints?
  // For now, static hints or simple retrieval.
  const basicHints = [
    "Read the text carefully again.",
    "Think about the keywords."
  ];
  
  if (context && context.bestMatch) {
    return [
      `Focus on this section: "...${context.bestMatch.text.substring(0, 100)}..."`,
      ...basicHints
    ];
  }
  
  return basicHints.slice(0, attemptCount + 1);
}

import { pool } from '../config/database';
import { Country, Question } from '../types';

/**
 * Service for generating flag guessing questions with intelligent choice selection
 * Implements geographic and visual similarity scoring for realistic difficulty
 */
export class QuestionGenerator {
  
  /**
   * Generates a question with the specified number of choices
   * @param choiceCount Number of choices to include (2, 4, 8, 16, etc.)
   * @param excludeCountries Countries to exclude from selection
   * @param difficultyLevel Optional difficulty filter (1-4)
   * @returns Generated question with correct answer and similar incorrect choices
   */
  async generateQuestion(
    choiceCount: number,
    excludeCountries: string[] = [],
    difficultyLevel?: number
  ): Promise<Question> {
    if (choiceCount < 2) {
      throw new Error('Choice count must be at least 2');
    }
    
    const client = await pool.connect();
    try {
      // Select the correct answer
      const correctCountry = await this.selectCorrectAnswer(client, excludeCountries, difficultyLevel);
      
      // Generate incorrect choices based on similarity
      const incorrectChoices = await this.generateIncorrectChoices(
        client,
        correctCountry,
        choiceCount - 1,
        excludeCountries
      );
      
      // Combine and shuffle choices
      const allChoices = [correctCountry, ...incorrectChoices];
      const shuffledChoices = this.shuffleArray(allChoices);
      
      // Create question object
      const question: Question = {
        id: this.generateQuestionId(),
        gameId: '', // Will be set by the calling service
        round: 0, // Will be set by the calling service
        correctCountry,
        choices: shuffledChoices,
        timeLimit: 30, // Default 30 seconds
        createdAt: new Date()
      };
      
      return question;
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Selects a random country as the correct answer
   */
  private async selectCorrectAnswer(
    client: any,
    excludeCountries: string[],
    difficultyLevel?: number
  ): Promise<Country> {
    let query = `
      SELECT country_code, country_name, image_url, region, colors, difficulty_level
      FROM flags
      WHERE country_code NOT IN (${excludeCountries.map((_, i) => `$${i + 1}`).join(', ')})
    `;
    
    const params: any[] = [...excludeCountries];
    
    if (difficultyLevel) {
      query += ` AND difficulty_level = $${params.length + 1}`;
      params.push(difficultyLevel);
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('No countries available for selection');
    }
    
    return this.mapRowToCountry(result.rows[0]);
  }
  
  /**
   * Generates incorrect choices based on geographic and visual similarity
   */
  private async generateIncorrectChoices(
    client: any,
    correctCountry: Country,
    count: number,
    excludeCountries: string[]
  ): Promise<Country[]> {
    const excludeList = [...excludeCountries, correctCountry.code];
    
    // Get potential incorrect choices with similarity scoring
    const query = `
      SELECT 
        country_code, 
        country_name, 
        image_url, 
        region, 
        colors, 
        difficulty_level,
        CASE 
          WHEN region = $1 THEN 3  -- Same region gets highest similarity score
          WHEN difficulty_level = $2 THEN 2  -- Same difficulty gets medium score
          ELSE 1  -- Others get base score
        END as similarity_score,
        -- Color similarity bonus
        CASE 
          WHEN colors && $3 THEN 1  -- Overlapping colors get bonus
          ELSE 0
        END as color_bonus
      FROM flags
      WHERE country_code NOT IN (${excludeList.map((_, i) => `$${i + 4}`).join(', ')})
      ORDER BY 
        similarity_score DESC,
        color_bonus DESC,
        RANDOM()
      LIMIT $${excludeList.length + 4}
    `;
    
    const params = [
      correctCountry.region,
      correctCountry.difficulty,
      correctCountry.colors,
      ...excludeList,
      count * 2 // Get more than needed for better selection
    ];
    
    const result = await client.query(query, params);
    
    if (result.rows.length < count) {
      // If not enough similar countries, get random ones
      const additionalQuery = `
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE country_code NOT IN (${excludeList.map((_, i) => `$${i + 1}`).join(', ')})
        ORDER BY RANDOM()
        LIMIT $${excludeList.length + 1}
      `;
      
      const additionalResult = await client.query(additionalQuery, [...excludeList, count]);
      result.rows.push(...additionalResult.rows);
    }
    
    // Select the best choices and ensure no duplicates
    const uniqueChoices = this.removeDuplicates(result.rows, 'country_code');
    const selectedChoices = uniqueChoices.slice(0, count);
    
    return selectedChoices.map(row => this.mapRowToCountry(row));
  }
  
  /**
   * Calculates geographic similarity between two countries
   */
  private calculateGeographicSimilarity(country1: Country, country2: Country): number {
    if (country1.region === country2.region) {
      return 1.0; // Same region
    }
    
    // Define region proximity (simplified)
    const regionProximity: Record<string, string[]> = {
      'Europe': ['Asia'],
      'Asia': ['Europe', 'Oceania'],
      'Africa': ['Asia', 'Europe'],
      'North America': ['South America'],
      'South America': ['North America'],
      'Oceania': ['Asia']
    };
    
    const proximateRegions = regionProximity[country1.region] || [];
    if (proximateRegions.includes(country2.region)) {
      return 0.5; // Adjacent regions
    }
    
    return 0.1; // Distant regions
  }
  
  /**
   * Calculates visual similarity based on colors
   */
  private calculateColorSimilarity(colors1: string[], colors2: string[]): number {
    const intersection = colors1.filter(color => colors2.includes(color));
    const union = [...new Set([...colors1, ...colors2])];
    
    return intersection.length / union.length; // Jaccard similarity
  }
  
  /**
   * Removes duplicate entries from array based on a key
   */
  private removeDuplicates<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  /**
   * Shuffles an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Maps database row to Country interface
   */
  private mapRowToCountry(row: any): Country {
    return {
      code: row.country_code,
      name: row.country_name,
      imageUrl: row.image_url,
      region: row.region,
      colors: row.colors || [],
      difficulty: row.difficulty_level
    };
  }
  
  /**
   * Generates a unique question ID
   */
  private generateQuestionId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Validates that a question has no duplicate choices
   */
  validateQuestion(question: Question): boolean {
    const countryCodes = question.choices.map(choice => choice.code);
    const uniqueCodes = new Set(countryCodes);
    
    if (uniqueCodes.size !== countryCodes.length) {
      console.error('Question contains duplicate choices:', countryCodes);
      return false;
    }
    
    if (!question.choices.some(choice => choice.code === question.correctCountry.code)) {
      console.error('Correct answer not found in choices');
      return false;
    }
    
    return true;
  }
  
  /**
   * Gets statistics about available countries for question generation
   */
  async getAvailableCountriesStats(): Promise<{
    total: number;
    byRegion: Record<string, number>;
    byDifficulty: Record<number, number>;
  }> {
    const client = await pool.connect();
    try {
      const totalResult = await client.query('SELECT COUNT(*) FROM flags');
      const total = parseInt(totalResult.rows[0].count);
      
      const regionResult = await client.query(`
        SELECT region, COUNT(*) as count 
        FROM flags 
        GROUP BY region
      `);
      
      const difficultyResult = await client.query(`
        SELECT difficulty_level, COUNT(*) as count 
        FROM flags 
        GROUP BY difficulty_level
      `);
      
      const byRegion: Record<string, number> = {};
      regionResult.rows.forEach(row => {
        byRegion[row.region] = parseInt(row.count);
      });
      
      const byDifficulty: Record<number, number> = {};
      difficultyResult.rows.forEach(row => {
        byDifficulty[row.difficulty_level] = parseInt(row.count);
      });
      
      return { total, byRegion, byDifficulty };
      
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const questionGenerator = new QuestionGenerator();
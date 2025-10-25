import { pool } from '../config/database';
import { Country, FlagRow } from '../types';

/**
 * Service for managing flag data operations
 * Handles CRUD operations for country flags and provides filtering capabilities
 */
export class FlagService {
  
  /**
   * Gets all flags from the database
   */
  async getAllFlags(): Promise<Country[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        ORDER BY country_name
      `);
      
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets a specific flag by country code
   */
  async getFlagByCode(countryCode: string): Promise<Country | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE country_code = $1
      `, [countryCode.toUpperCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCountry(result.rows[0]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets flags filtered by region
   */
  async getFlagsByRegion(region: string): Promise<Country[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE region = $1
        ORDER BY country_name
      `, [region]);
      
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets flags filtered by difficulty level
   */
  async getFlagsByDifficulty(difficulty: number): Promise<Country[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE difficulty_level = $1
        ORDER BY country_name
      `, [difficulty]);
      
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets flags that contain specific colors
   */
  async getFlagsByColors(colors: string[]): Promise<Country[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE colors && $1
        ORDER BY country_name
      `, [colors]);
      
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets random flags for practice or testing
   */
  async getRandomFlags(count: number, excludeCodes: string[] = []): Promise<Country[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
      `;
      
      const params: any[] = [];
      
      if (excludeCodes.length > 0) {
        query += ` WHERE country_code NOT IN (${excludeCodes.map((_, i) => `$${i + 1}`).join(', ')})`;
        params.push(...excludeCodes.map(code => code.toUpperCase()));
      }
      
      query += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
      params.push(count);
      
      const result = await client.query(query, params);
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Searches flags by country name (partial match)
   */
  async searchFlagsByName(searchTerm: string): Promise<Country[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url, region, colors, difficulty_level
        FROM flags
        WHERE country_name ILIKE $1
        ORDER BY country_name
      `, [`%${searchTerm}%`]);
      
      return result.rows.map(row => this.mapRowToCountry(row));
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets all unique regions
   */
  async getAllRegions(): Promise<string[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT region
        FROM flags
        ORDER BY region
      `);
      
      return result.rows.map(row => row.region);
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets all unique colors used in flags
   */
  async getAllColors(): Promise<string[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT UNNEST(colors) as color
        FROM flags
        ORDER BY color
      `);
      
      return result.rows.map(row => row.color);
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets statistics about the flag database
   */
  async getFlagStatistics(): Promise<{
    totalFlags: number;
    regionCounts: Record<string, number>;
    difficultyCounts: Record<number, number>;
    colorCounts: Record<string, number>;
  }> {
    const client = await pool.connect();
    try {
      // Total count
      const totalResult = await client.query('SELECT COUNT(*) FROM flags');
      const totalFlags = parseInt(totalResult.rows[0].count);
      
      // Region counts
      const regionResult = await client.query(`
        SELECT region, COUNT(*) as count
        FROM flags
        GROUP BY region
        ORDER BY count DESC
      `);
      
      const regionCounts: Record<string, number> = {};
      regionResult.rows.forEach(row => {
        regionCounts[row.region] = parseInt(row.count);
      });
      
      // Difficulty counts
      const difficultyResult = await client.query(`
        SELECT difficulty_level, COUNT(*) as count
        FROM flags
        GROUP BY difficulty_level
        ORDER BY difficulty_level
      `);
      
      const difficultyCounts: Record<number, number> = {};
      difficultyResult.rows.forEach(row => {
        difficultyCounts[row.difficulty_level] = parseInt(row.count);
      });
      
      // Color counts
      const colorResult = await client.query(`
        SELECT color, COUNT(*) as count
        FROM (
          SELECT UNNEST(colors) as color
          FROM flags
        ) color_list
        GROUP BY color
        ORDER BY count DESC
      `);
      
      const colorCounts: Record<string, number> = {};
      colorResult.rows.forEach(row => {
        colorCounts[row.color] = parseInt(row.count);
      });
      
      return {
        totalFlags,
        regionCounts,
        difficultyCounts,
        colorCounts
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Updates a flag's metadata (for admin purposes)
   */
  async updateFlag(countryCode: string, updates: Partial<Omit<Country, 'code'>>): Promise<boolean> {
    const client = await pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.name) {
        setParts.push(`country_name = $${paramIndex++}`);
        values.push(updates.name);
      }
      
      if (updates.imageUrl) {
        setParts.push(`image_url = $${paramIndex++}`);
        values.push(updates.imageUrl);
      }
      
      if (updates.region) {
        setParts.push(`region = $${paramIndex++}`);
        values.push(updates.region);
      }
      
      if (updates.colors) {
        setParts.push(`colors = $${paramIndex++}`);
        values.push(updates.colors);
      }
      
      if (updates.difficulty !== undefined) {
        setParts.push(`difficulty_level = $${paramIndex++}`);
        values.push(updates.difficulty);
      }
      
      if (setParts.length === 0) {
        return false; // No updates to make
      }
      
      setParts.push(`updated_at = NOW()`);
      values.push(countryCode.toUpperCase());
      
      const query = `
        UPDATE flags
        SET ${setParts.join(', ')}
        WHERE country_code = $${paramIndex}
      `;
      
      const result = await client.query(query, values);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
  
  /**
   * Validates that all flag image URLs are properly formatted
   */
  async validateImageUrls(): Promise<{
    valid: number;
    invalid: { code: string; name: string; url: string }[];
  }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT country_code, country_name, image_url
        FROM flags
      `);
      
      let validCount = 0;
      const invalidUrls: { code: string; name: string; url: string }[] = [];
      
      for (const row of result.rows) {
        try {
          const url = new URL(row.image_url);
          if (url.protocol === 'https:' && url.hostname) {
            validCount++;
          } else {
            invalidUrls.push({
              code: row.country_code,
              name: row.country_name,
              url: row.image_url
            });
          }
        } catch (error) {
          invalidUrls.push({
            code: row.country_code,
            name: row.country_name,
            url: row.image_url
          });
        }
      }
      
      return { valid: validCount, invalid: invalidUrls };
    } finally {
      client.release();
    }
  }
  
  /**
   * Maps database row to Country interface
   */
  private mapRowToCountry(row: FlagRow): Country {
    return {
      code: row.country_code,
      name: row.country_name,
      imageUrl: row.image_url,
      region: row.region,
      colors: row.colors || [],
      difficulty: row.difficulty_level
    };
  }
}

// Export singleton instance
export const flagService = new FlagService();